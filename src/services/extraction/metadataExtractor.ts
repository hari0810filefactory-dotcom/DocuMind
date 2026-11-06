// Deterministic Metadata Extractor for Dates, Amounts, IDs, and Issuers

import type { DocumentType, DocumentField } from '../../types';

export interface ExtractedCandidateField {
  fieldName: string;
  fieldValue: string;
  confidence: number;
  sourceSnippet?: string;
  sourcePage?: number;
}

export class MetadataExtractor {
  /**
   * Deterministically extract candidate metadata fields from raw document text
   */
  static extract(
    text: string,
    documentType: DocumentType,
    documentId: string
  ): DocumentField[] {
    const candidates: ExtractedCandidateField[] = [];

    // 1. Extract Dates
    const dates = this.extractDates(text);
    if (dates.issueDate) {
      candidates.push({
        fieldName: 'Issue Date',
        fieldValue: dates.issueDate.value,
        confidence: dates.issueDate.confidence,
        sourceSnippet: dates.issueDate.snippet,
      });
    }
    if (dates.expiryDate) {
      candidates.push({
        fieldName: 'Expiry Date',
        fieldValue: dates.expiryDate.value,
        confidence: dates.expiryDate.confidence,
        sourceSnippet: dates.expiryDate.snippet,
      });
    }

    // 2. Extract Reference / ID Numbers
    const ref = this.extractReferenceNumber(text, documentType);
    if (ref) {
      candidates.push({
        fieldName: 'Reference Number',
        fieldValue: ref.value,
        confidence: ref.confidence,
        sourceSnippet: ref.snippet,
      });
    }

    // 3. Extract Amount & Currency (if financial or has currency)
    const amount = this.extractAmount(text);
    if (amount) {
      candidates.push({
        fieldName: 'Total Amount',
        fieldValue: amount.value,
        confidence: amount.confidence,
        sourceSnippet: amount.snippet,
      });
      candidates.push({
        fieldName: 'Currency',
        fieldValue: amount.currency,
        confidence: 0.9,
      });
    }

    // 4. Extract Issuer / Organization
    const issuer = this.extractIssuer(text, documentType);
    if (issuer) {
      candidates.push({
        fieldName: 'Issuer / Organization',
        fieldValue: issuer.value,
        confidence: issuer.confidence,
        sourceSnippet: issuer.snippet,
      });
    }

    // Convert to DocumentField records (all unverified by default)
    return candidates.map((c) => ({
      id: crypto.randomUUID(),
      documentId,
      fieldName: c.fieldName,
      fieldValue: c.fieldValue,
      confidence: c.confidence,
      sourcePage: 1,
      verificationStatus: 'unverified', // Strictly unverified by default
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Extract Issue Date and Expiry Date with regex patterns
   */
  private static extractDates(text: string): {
    issueDate?: { value: string; confidence: number; snippet: string };
    expiryDate?: { value: string; confidence: number; snippet: string };
  } {
    const result: {
      issueDate?: { value: string; confidence: number; snippet: string };
      expiryDate?: { value: string; confidence: number; snippet: string };
    } = {};

    // Standard date patterns: YYYY-MM-DD or DD/MM/YYYY or Month DD, YYYY
    const isoPattern = /\b(20\d\d|19\d\d)[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/;
    const slashPattern = /\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d\d|19\d\d)\b/;
    const monthPattern = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))\s+(\d{1,2}),?\s+(20\d\d|19\d\d)\b/i;

    const lines = text.split('\n');

    for (const line of lines) {
      // Check for Expiry / Due / Valid Until keywords
      if (/expir|valid\s*until|due\s*date|renewal\s*date|end\s*date|matures/i.test(line)) {
        const isoMatch = line.match(isoPattern);
        const slashMatch = line.match(slashPattern);
        const monthMatch = line.match(monthPattern);

        if (isoMatch && !result.expiryDate) {
          result.expiryDate = {
            value: `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`,
            confidence: 0.9,
            snippet: line.trim().slice(0, 80),
          };
        } else if (slashMatch && !result.expiryDate) {
          result.expiryDate = {
            value: `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`,
            confidence: 0.85,
            snippet: line.trim().slice(0, 80),
          };
        } else if (monthMatch && !result.expiryDate) {
          const monthNum = this.parseMonth(monthMatch[1]);
          result.expiryDate = {
            value: `${monthMatch[3]}-${monthNum}-${monthMatch[2].padStart(2, '0')}`,
            confidence: 0.85,
            snippet: line.trim().slice(0, 80),
          };
        }
      }

      // Check for Issue Date / Effective Date / Date of Issue
      if (/issue\s*date|date\s*of\s*issue|effective\s*date|invoice\s*date|created\s*date|bill\s*date/i.test(line)) {
        const isoMatch = line.match(isoPattern);
        const slashMatch = line.match(slashPattern);
        const monthMatch = line.match(monthPattern);

        if (isoMatch && !result.issueDate) {
          result.issueDate = {
            value: `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`,
            confidence: 0.9,
            snippet: line.trim().slice(0, 80),
          };
        } else if (slashMatch && !result.issueDate) {
          result.issueDate = {
            value: `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`,
            confidence: 0.85,
            snippet: line.trim().slice(0, 80),
          };
        } else if (monthMatch && !result.issueDate) {
          const monthNum = this.parseMonth(monthMatch[1]);
          result.issueDate = {
            value: `${monthMatch[3]}-${monthNum}-${monthMatch[2].padStart(2, '0')}`,
            confidence: 0.85,
            snippet: line.trim().slice(0, 80),
          };
        }
      }
    }

    // General fallback: if no dates found near keywords, grab the first detected date as issueDate
    if (!result.issueDate) {
      const match = text.match(isoPattern);
      if (match) {
        result.issueDate = {
          value: `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`,
          confidence: 0.7,
          snippet: 'Detected chronological date in text',
        };
      }
    }

    return result;
  }

  /**
   * Extract Reference / Policy / Invoice / Account numbers
   */
  private static extractReferenceNumber(
    text: string,
    documentType: DocumentType
  ): { value: string; confidence: number; snippet: string } | null {
    const patterns = [
      /(?:invoice|inv)[\s#.:_no\-]+([A-Z0-9\-_]{4,20})\b/i,
      /(?:policy|pol)[\s#.:_no\-]+([A-Z0-9\-_]{4,20})\b/i,
      /(?:account|acct)[\s#.:_no\-]+([A-Z0-9\-_]{4,20})\b/i,
      /(?:passport|doc|reference|ref)[\s#.:_no\-]+([A-Z0-9\-_]{4,20})\b/i,
      /(?:vin)[\s#.:_no\-]+([A-HJ-NPR-Z0-9]{11,17})\b/i,
      /(?:license|permit)[\s#.:_no\-]+([A-Z0-9\-_]{4,20})\b/i,
    ];

    for (const pat of patterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        return {
          value: match[1].trim(),
          confidence: 0.85,
          snippet: match[0].trim(),
        };
      }
    }

    return null;
  }

  /**
   * Extract Amount and Currency
   */
  private static extractAmount(
    text: string
  ): { value: string; currency: string; confidence: number; snippet: string } | null {
    // Looks for: Total: $1,245.00 or Total Due: USD 500.00
    const patterns = [
      /(?:total|total\s*due|amount\s*due|grand\s*total|balance\s*due|net\s*pay)[\s:]*([$€£¥₹])\s*([\d,]+(?:\.\d{2})?)/i,
      /(?:total|total\s*due|amount\s*due|grand\s*total)[\s:]*(USD|EUR|GBP|CAD|AUD)\s*([\d,]+(?:\.\d{2})?)/i,
      /([$€£¥₹])\s*([\d,]+\.\d{2})\s*(?:total|due)?/i,
    ];

    for (const pat of patterns) {
      const match = text.match(pat);
      if (match) {
        const symbolOrCode = match[1];
        const rawAmount = match[2].replace(/,/g, '');
        const currency =
          symbolOrCode === '$'
            ? 'USD'
            : symbolOrCode === '€'
              ? 'EUR'
              : symbolOrCode === '£'
                ? 'GBP'
                : symbolOrCode;

        return {
          value: rawAmount,
          currency,
          confidence: 0.85,
          snippet: match[0].trim(),
        };
      }
    }

    return null;
  }

  /**
   * Extract potential issuer from top header lines
   */
  private static extractIssuer(
    text: string,
    documentType: DocumentType
  ): { value: string; confidence: number; snippet: string } | null {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 3 && l.length < 60);

    // Filter out common generic words
    const topLines = lines.slice(0, 6);
    for (const line of topLines) {
      if (
        !/^(page|invoice|receipt|statement|date|bill to|dear|to whom|summary|confidential)/i.test(
          line
        ) &&
        /[a-zA-Z]{3,}/.test(line)
      ) {
        return {
          value: line,
          confidence: 0.75,
          snippet: line,
        };
      }
    }

    return null;
  }

  private static parseMonth(monthStr: string): string {
    const months: Record<string, string> = {
      jan: '01',
      feb: '02',
      mar: '03',
      apr: '04',
      may: '05',
      jun: '06',
      jul: '07',
      aug: '08',
      sep: '09',
      oct: '10',
      nov: '11',
      dec: '12',
    };
    const prefix = monthStr.toLowerCase().slice(0, 3);
    return months[prefix] || '01';
  }
}
