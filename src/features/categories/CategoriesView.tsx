import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  FileText,
  User,
  GraduationCap,
  Briefcase,
  DollarSign,
  Shield,
  Home,
  Car,
  Building2,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { db } from '../../services/database/db';
import type { Category, DocumentRecord } from '../../types';

interface CategoriesViewProps {
  workspaceId: string;
  selectedCategoryName: string; // 'all' or specific category name
  onSelectDocument: (doc: DocumentRecord) => void;
  onOpenUpload: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Identity: <User className="w-5 h-5 text-blue-500" />,
  Education: <GraduationCap className="w-5 h-5 text-purple-500" />,
  Employment: <Briefcase className="w-5 h-5 text-cyan-500" />,
  Finance: <DollarSign className="w-5 h-5 text-emerald-500" />,
  Insurance: <Shield className="w-5 h-5 text-amber-500" />,
  Property: <Home className="w-5 h-5 text-pink-500" />,
  Vehicle: <Car className="w-5 h-5 text-indigo-500" />,
  Business: <Building2 className="w-5 h-5 text-teal-500" />,
  Other: <FileText className="w-5 h-5 text-slate-400" />,
};

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  workspaceId,
  selectedCategoryName,
  onSelectDocument,
  onOpenUpload,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(selectedCategoryName || 'all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [cats, docs] = await Promise.all([
          db.categories.where('workspaceId').equals(workspaceId).toArray(),
          db.documents.where('workspaceId').equals(workspaceId).and((d) => !d.isDeleted).toArray(),
        ]);
        setCategories(cats);
        setDocuments(docs);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [workspaceId]);

  useEffect(() => {
    if (selectedCategoryName) {
      setActiveCategory(selectedCategoryName);
    }
  }, [selectedCategoryName]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  // Documents filtered by active category
  const filteredDocs =
    activeCategory === 'all'
      ? documents
      : documents.filter((d) => {
          const name = catMap.get(d.categoryId)?.toLowerCase() || '';
          return name === activeCategory.toLowerCase();
        });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Document Categories
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize documents into deterministic life and business functional areas.
          </p>
        </div>
      </div>

      {/* Category Selection Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveCategory('all')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeCategory === 'all'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              All Categories
            </span>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {documents.length}
            </span>
          </div>
        </button>

        {categories.map((cat) => {
          const count = documents.filter((d) => d.categoryId === cat.id).length;
          const isSelected = activeCategory.toLowerCase() === cat.name.toLowerCase();
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name.toLowerCase())}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {CATEGORY_ICONS[cat.name] || <FileText className="w-4 h-4 text-slate-400" />}
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {cat.name}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                {count} document{count !== 1 ? 's' : ''}
              </div>
            </button>
          );
        })}
      </div>

      {/* Documents under selected category */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
            {activeCategory === 'all' ? 'All Documents' : `${activeCategory} Documents`} ({filteredDocs.length})
          </span>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <div>No documents in this category yet.</div>
            <button
              onClick={onOpenUpload}
              className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500"
            >
              Upload into this Category
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition-colors"
              >
                <div className="min-w-0 pr-4">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {doc.title}
                  </div>
                  {/* Zero-Pill Unboxed Metadata */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                    <span>{doc.documentType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {(doc.fileSize / 1024).toFixed(0)} KB
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{doc.issueDate ? `Issued ${doc.issueDate}` : 'No issue date'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[11px] font-medium ${
                      doc.verificationStatus === 'verified'
                        ? 'text-emerald-500'
                        : 'text-amber-500'
                    }`}
                  >
                    {doc.verificationStatus === 'verified' ? 'Verified' : 'Unverified'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
