// Local Inverted Full-Text Search Engine with Snippets & Highlighting

import { db } from '../database/db';
import type { DocumentRecord, DocumentType, VerificationStatus } from '../../types';

export interface SearchFilters {
  categoryId?: string;
  documentType?: DocumentType | 'all';
  verificationStatus?: VerificationStatus | 'all';
  expiryStatus?: 'all' | 'expired' | 'expiring_soon' | 'active' | 'no_expiry';
  startDate?: string;
  endDate?: string;
  sortBy?: 'relevance' | 'date_desc' | 'date_asc' | 'expiry_asc' | 'title';
}

export interface SearchResultItem {
  document: DocumentRecord;
  categoryName: string;
  score: number;
  snippet: string;
  matchedFields: string[];
  matchedKeywords: string[];
}

export class LocalSearchEngine {
  /**
   * Search local documents with full text matching and filters
   */
  static async search(
    query: string,
    workspaceId: string,
    filters: SearchFilters = {}
  ): Promise<SearchResultItem[]> {
    const rawTokens = this.tokenize(query);
    const isNaturalQuery = this.detectNaturalQuery(query);

    // 1. Fetch active workspace documents
    let docs = await db.documents
      .where('workspaceId')
      .equals(workspaceId)
      .filter((d) => !d.isDeleted && !d.isArchived)
      .toArray();

    // 2. Fetch categories map for display and filtering
    const categories = await db.categories.where('workspaceId').equals(workspaceId).toArray();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    // 3. Fetch tags and documentTags
    const docTags = await db.documentTags.toArray();
    const allTags = await db.tags.where('workspaceId').equals(workspaceId).toArray();
    const tagMap = new Map(allTags.map((t) => [t.id, t.name]));
    const docToTags = new Map<string, string[]>();
    for (const dt of docTags) {
      const list = docToTags.get(dt.documentId) || [];
      const tagName = tagMap.get(dt.tagId);
      if (tagName) list.push(tagName);
      docToTags.set(dt.documentId, list);
    }

    // 4. Fetch extracted text map
    const textRecords = await db.documentText.toArray();
    const textMap = new Map(textRecords.map((t) => [t.documentId, t.extractedText]));

    // 5. Fetch documentFields map
    const fields = await db.documentFields.toArray();
    const fieldsMap = new Map<string, { name: string; value: string }[]>();
    for (const f of fields) {
      const list = fieldsMap.get(f.documentId) || [];
      list.push({ name: f.fieldName, value: f.fieldValue });
      fieldsMap.set(f.documentId, list);
    }

    // 6. Apply hard filters
    if (filters.categoryId && filters.categoryId !== 'all') {
      docs = docs.filter((d) => d.categoryId === filters.categoryId);
    }

    if (filters.documentType && filters.documentType !== 'all') {
      docs = docs.filter((d) => d.documentType === filters.documentType);
    }

    if (filters.verificationStatus && filters.verificationStatus !== 'all') {
      docs = docs.filter((d) => d.verificationStatus === filters.verificationStatus);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    if (filters.expiryStatus && filters.expiryStatus !== 'all') {
      docs = docs.filter((d) => {
        if (!d.expiryDate) return filters.expiryStatus === 'no_expiry';
        if (filters.expiryStatus === 'expired') return d.expiryDate < todayStr;
        if (filters.expiryStatus === 'expiring_soon')
          return d.expiryDate >= todayStr && d.expiryDate <= thirtyDaysFromNow;
        if (filters.expiryStatus === 'active') return d.expiryDate > todayStr;
        return true;
      });
    }

    if (filters.startDate) {
      docs = docs.filter((d) => (d.issueDate || d.createdAt) >= filters.startDate!);
    }
    if (filters.endDate) {
      docs = docs.filter((d) => (d.issueDate || d.createdAt) <= filters.endDate!);
    }

    // Handle Natural query modifiers (e.g. "expired", "verified", "invoice")
    let targetTokens = rawTokens;
    if (isNaturalQuery) {
      if (isNaturalQuery.forcedType) {
        docs = docs.filter((d) => d.documentType === isNaturalQuery.forcedType);
      }
      if (isNaturalQuery.forcedExpired) {
        docs = docs.filter((d) => Boolean(d.expiryDate && d.expiryDate < todayStr));
      }
      if (isNaturalQuery.forcedExpiringSoon) {
        docs = docs.filter(
          (d) => Boolean(d.expiryDate && d.expiryDate >= todayStr && d.expiryDate <= thirtyDaysFromNow)
        );
      }
      targetTokens = isNaturalQuery.remainingTokens;
    }

    // 7. Score each document
    const results: SearchResultItem[] = [];

    for (const doc of docs) {
      const catName = catMap.get(doc.categoryId) || 'Uncategorized';
      const docTagNames = docToTags.get(doc.id) || [];
      const extractedText = textMap.get(doc.id) || '';
      const docFieldList = fieldsMap.get(doc.id) || [];

      // If no query tokens, all matching filter docs have base score
      if (targetTokens.length === 0) {
        results.push({
          document: doc,
          categoryName: catName,
          score: 1.0,
          snippet: doc.notes || extractedText.slice(0, 160) || 'No text snippet available',
          matchedFields: ['All documents'],
          matchedKeywords: [],
        });
        continue;
      }

      let score = 0;
      const matchedFields: string[] = [];
      const matchedKeywords: string[] = [];

      for (const token of targetTokens) {
        const lowerToken = token.toLowerCase();

        // Title match (weight 10)
        if (doc.title.toLowerCase().includes(lowerToken)) {
          score += 10;
          if (!matchedFields.includes('Title')) matchedFields.push('Title');
          if (!matchedKeywords.includes(token)) matchedKeywords.push(token);
        }

        // Filename match (weight 7)
        if (doc.originalFileName.toLowerCase().includes(lowerToken)) {
          score += 7;
          if (!matchedFields.includes('Filename')) matchedFields.push('Filename');
          if (!matchedKeywords.includes(token)) matchedKeywords.push(token);
        }

        // Document Type match (weight 8)
        if (doc.documentType.toLowerCase().includes(lowerToken)) {
          score += 8;
          if (!matchedFields.includes('Document Type')) matchedFields.push('Document Type');
        }

        // Category match (weight 6)
        if (catName.toLowerCase().includes(lowerToken)) {
          score += 6;
          if (!matchedFields.includes('Category')) matchedFields.push('Category');
        }

        // Tags match (weight 7)
        for (const tag of docTagNames) {
          if (tag.toLowerCase().includes(lowerToken)) {
            score += 7;
            if (!matchedFields.includes('Tag')) matchedFields.push('Tag');
            if (!matchedKeywords.includes(token)) matchedKeywords.push(token);
          }
        }

        // Metadata Fields match (weight 8)
        for (const f of docFieldList) {
          if (
            f.value.toLowerCase().includes(lowerToken) ||
            f.name.toLowerCase().includes(lowerToken)
          ) {
            score += 8;
            const fieldLabel = `Field: ${f.name}`;
            if (!matchedFields.includes(fieldLabel)) matchedFields.push(fieldLabel);
            if (!matchedKeywords.includes(token)) matchedKeywords.push(token);
          }
        }

        // Extracted full text match (weight 3 per match up to 15)
        if (extractedText.toLowerCase().includes(lowerToken)) {
          score += 4;
          if (!matchedFields.includes('Document Content')) matchedFields.push('Document Content');
          if (!matchedKeywords.includes(token)) matchedKeywords.push(token);
        }
      }

      if (score > 0) {
        const snippet = this.generateSnippet(extractedText || doc.notes || doc.title, targetTokens);
        results.push({
          document: doc,
          categoryName: catName,
          score,
          snippet,
          matchedFields,
          matchedKeywords,
        });
      }
    }

    // 8. Sorting
    const sortBy = filters.sortBy || (targetTokens.length > 0 ? 'relevance' : 'date_desc');

    results.sort((a, b) => {
      if (sortBy === 'relevance') {
        return b.score - a.score;
      }
      if (sortBy === 'date_desc') {
        return new Date(b.document.createdAt).getTime() - new Date(a.document.createdAt).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.document.createdAt).getTime() - new Date(b.document.createdAt).getTime();
      }
      if (sortBy === 'expiry_asc') {
        const expA = a.document.expiryDate || '9999-12-31';
        const expB = b.document.expiryDate || '9999-12-31';
        return expA.localeCompare(expB);
      }
      if (sortBy === 'title') {
        return a.document.title.localeCompare(b.document.title);
      }
      return 0;
    });

    return results;
  }

  /**
   * Tokenize query string into search terms
   */
  private static tokenize(text: string): string[] {
    return text
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/[^\w\d\-]/g, ''))
      .filter((t) => t.length > 1);
  }

  /**
   * Detect offline natural language intents like "expired invoices", "contracts expiring"
   */
  private static detectNaturalQuery(query: string): {
    forcedType?: DocumentType;
    forcedExpired?: boolean;
    forcedExpiringSoon?: boolean;
    remainingTokens: string[];
  } | null {
    const lower = query.toLowerCase();
    let forcedType: DocumentType | undefined;
    let forcedExpired = false;
    let forcedExpiringSoon = false;

    if (lower.includes('invoice')) forcedType = 'Invoice';
    else if (lower.includes('passport') || lower.includes('identity')) forcedType = 'Identity document';
    else if (lower.includes('contract')) forcedType = 'Contract';
    else if (lower.includes('insurance')) forcedType = 'Insurance policy';
    else if (lower.includes('tax')) forcedType = 'Tax document';
    else if (lower.includes('receipt')) forcedType = 'Receipt';

    if (lower.includes('expired')) forcedExpired = true;
    if (lower.includes('expiring') || lower.includes('renewal')) forcedExpiringSoon = true;

    if (!forcedType && !forcedExpired && !forcedExpiringSoon) {
      return null;
    }

    const cleaned = lower
      .replace(/\b(show|find|all|my|get|expired|expiring|documents?|files?)\b/g, '')
      .trim();

    return {
      forcedType,
      forcedExpired,
      forcedExpiringSoon,
      remainingTokens: this.tokenize(cleaned),
    };
  }

  /**
   * Generate contextual text snippet around first match
   */
  private static generateSnippet(text: string, tokens: string[]): string {
    if (!text) return 'No text content';
    if (tokens.length === 0) return text.slice(0, 140) + (text.length > 140 ? '...' : '');

    const lowerText = text.toLowerCase();
    let bestIndex = -1;

    for (const token of tokens) {
      const idx = lowerText.indexOf(token.toLowerCase());
      if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
        bestIndex = idx;
      }
    }

    if (bestIndex === -1) {
      return text.slice(0, 140) + (text.length > 140 ? '...' : '');
    }

    const start = Math.max(0, bestIndex - 40);
    const end = Math.min(text.length, bestIndex + 100);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';

    return prefix + text.slice(start, end).replace(/\s+/g, ' ') + suffix;
  }
}
