import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Tag,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Clock,
  Sparkles,
} from 'lucide-react';
import { LocalSearchEngine, type SearchFilters, type SearchResultItem } from '../../services/search/searchIndex';
import { db } from '../../services/database/db';
import type { Category, DocumentRecord, DocumentType } from '../../types';

interface SmartSearchViewProps {
  workspaceId: string;
  onSelectDocument: (doc: DocumentRecord) => void;
}

export const SmartSearchView: React.FC<SmartSearchViewProps> = ({
  workspaceId,
  onSelectDocument,
}) => {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    categoryId: 'all',
    documentType: 'all',
    verificationStatus: 'all',
    expiryStatus: 'all',
    sortBy: 'relevance',
  });
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    db.categories.where('workspaceId').equals(workspaceId).toArray().then(setCategories);
  }, [workspaceId]);

  const executeSearch = async () => {
    setIsSearching(true);
    try {
      const searchRes = await LocalSearchEngine.search(query, workspaceId, filters);
      setResults(searchRes);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    executeSearch();
  }, [workspaceId, query, filters]);

  // Helper to highlight matching keywords in text
  const renderHighlighted = (text: string, keywords: string[]) => {
    if (!keywords || keywords.length === 0 || !text) return text;
    const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (!escaped) return text;
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-amber-300 dark:bg-amber-500/30 text-slate-900 dark:text-amber-200 px-0.5 rounded-xs"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Search Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-500" />
          <span>Local Smart Search</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Fast offline full-text search across document titles, OCR text, candidate metadata, and reference numbers.
        </p>
      </div>

      {/* Main Search Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, reference numbers, text (e.g. 'expired invoices', 'passport', 'insurance')..."
            className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-10 pr-24 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
            autoFocus
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="absolute right-2.5 top-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        {showFilters && (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {/* Category */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Category</label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Document Type</label>
              <select
                value={filters.documentType}
                onChange={(e) => setFilters({ ...filters, documentType: e.target.value as any })}
                className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">All Types</option>
                {[
                  'Identity document',
                  'Invoice',
                  'Receipt',
                  'Insurance policy',
                  'Contract',
                  'Employment document',
                  'Education certificate',
                  'Vehicle document',
                  'Property document',
                  'Tax document',
                  'Business licence',
                  'Medical document',
                  'Other',
                ].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Expiry Status */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Expiry Status</label>
              <select
                value={filters.expiryStatus}
                onChange={(e) => setFilters({ ...filters, expiryStatus: e.target.value as any })}
                className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">Any Status</option>
                <option value="expired">Expired</option>
                <option value="expiring_soon">Expiring Soon (30d)</option>
                <option value="active">Active &amp; Current</option>
                <option value="no_expiry">No Expiry Date</option>
              </select>
            </div>

            {/* Verification Status */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Verification</label>
              <select
                value={filters.verificationStatus}
                onChange={(e) => setFilters({ ...filters, verificationStatus: e.target.value as any })}
                className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified Only</option>
                <option value="unverified">Unverified Only</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Sort Order</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value="relevance">Relevance</option>
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="expiry_asc">Expiry Date</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="space-y-3">
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Found {results.length} result(s)</span>
          {query.trim() && (
            <span className="text-[11px]">Ranked by local full-text inverted index</span>
          )}
        </div>

        {results.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 text-xs">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              No matching documents
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Try adjusting your query or resetting filter constraints.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((item) => (
              <div
                key={item.document.id}
                onClick={() => onSelectDocument(item.document)}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-blue-500/50 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
                      {renderHighlighted(item.document.title, item.matchedKeywords)}
                    </h3>
                  </div>

                  {/* Zero-Pill Unboxed Metadata with separators */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{item.categoryName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.document.documentType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {item.document.expiryDate ? `Expires ${item.document.expiryDate}` : 'No expiry'}
                    </span>
                  </div>
                </div>

                {/* Context Snippet with Highlight */}
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-2.5 font-mono text-xs text-slate-600 dark:text-slate-300 leading-relaxed border border-slate-100 dark:border-slate-850">
                  &ldquo;{renderHighlighted(item.snippet, item.matchedKeywords)}&rdquo;
                </div>

                {/* Match Location indicators */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                  <span>Matched in:</span>
                  {item.matchedFields.map((f, idx) => (
                    <span key={idx} className="text-slate-600 dark:text-slate-300 font-medium">
                      {f}
                      {idx < item.matchedFields.length - 1 ? ' · ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
