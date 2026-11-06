import React, { useState, useEffect } from 'react';
import {
  FileText,
  Star,
  Archive,
  Trash2,
  Upload,
  Search,
  Filter,
  Grid,
  List,
  ChevronDown,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import { db, logActivity } from '../../services/database/db';
import { FileStorageService } from '../../services/storage/fileStorage';
import type { DocumentRecord, Category } from '../../types';

interface DocumentsViewProps {
  workspaceId: string;
  subSection: string; // 'all' | 'recent' | 'favorites' | 'shared' | 'archived' | 'trash'
  categories: Category[];
  onOpenUpload: () => void;
  onSelectDocument: (doc: DocumentRecord) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  workspaceId,
  subSection,
  categories,
  onOpenUpload,
  onSelectDocument,
}) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      let query = db.documents.where('workspaceId').equals(workspaceId);

      let docs = await query.toArray();

      // Apply subSection filter
      if (subSection === 'trash') {
        docs = docs.filter((d) => d.isDeleted);
      } else {
        // Exclude trash for all other views
        docs = docs.filter((d) => !d.isDeleted);

        if (subSection === 'favorites') {
          docs = docs.filter((d) => d.isFavorite);
        } else if (subSection === 'archived') {
          docs = docs.filter((d) => d.isArchived);
        } else if (subSection === 'recent') {
          // Exclude archived from recent
          docs = docs.filter((d) => !d.isArchived);
          docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          docs = docs.slice(0, 20);
        } else {
          // 'all': exclude archived
          docs = docs.filter((d) => !d.isArchived);
        }
      }

      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [workspaceId, subSection]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  // Client search and category filtering
  const filteredDocs = documents.filter((doc) => {
    if (selectedCategoryFilter !== 'all' && doc.categoryId !== selectedCategoryFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchesTitle = doc.title.toLowerCase().includes(term);
      const matchesType = doc.documentType.toLowerCase().includes(term);
      const matchesFile = doc.originalFileName.toLowerCase().includes(term);
      return matchesTitle || matchesType || matchesFile;
    }
    return true;
  });

  const toggleFavorite = async (doc: DocumentRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.documents.update(doc.id, {
      isFavorite: !doc.isFavorite,
      updatedAt: new Date().toISOString(),
    });
    loadDocuments();
  };

  const restoreFromTrash = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.documents.update(docId, {
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    });
    loadDocuments();
  };

  const permanentlyDelete = async (doc: DocumentRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    await FileStorageService.deleteFile(doc.storageKey);
    await db.documents.delete(doc.id);
    await db.documentText.where('documentId').equals(doc.id).delete();
    await db.documentFields.where('documentId').equals(doc.id).delete();
    await db.documentVersions.where('documentId').equals(doc.id).delete();
    await logActivity(doc.workspaceId, 'user', 'Permanently deleted document', doc.id, doc.title);
    setConfirmDeleteId(null);
    loadDocuments();
  };

  const getSubTitle = () => {
    switch (subSection) {
      case 'favorites':
        return 'Favorite Documents';
      case 'archived':
        return 'Archived Documents';
      case 'trash':
        return 'Trash (Deleted Documents)';
      case 'recent':
        return 'Recently Added Documents';
      case 'shared':
        return 'Shared with Me (Local Workspace)';
      default:
        return 'All Vault Documents';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {getSubTitle()}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filteredDocs.length} document(s) matching current criteria.
          </p>
        </div>

        {subSection !== 'trash' && (
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs self-start sm:self-auto"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Filter and View Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by title, type..."
              className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Switcher: Table vs Grid */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-end sm:self-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Table View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Grid View"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 text-xs">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
          <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
            No documents found
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {searchTerm
              ? 'Try modifying your search or category filter.'
              : 'Upload files to populate this section.'}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium select-none">
              <tr>
                <th className="py-2.5 px-3 w-8"></th>
                <th className="py-2.5 px-3">Title &amp; File</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 font-mono">Expiry</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredDocs.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3">
                    <button
                      onClick={(e) => toggleFavorite(doc, e)}
                      className={`text-slate-300 hover:text-amber-400 transition-colors ${
                        doc.isFavorite ? 'text-amber-400' : ''
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                    <div className="truncate font-semibold">{doc.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {doc.originalFileName} · {(doc.fileSize / 1024).toFixed(0)} KB
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                    {doc.documentType}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {catMap.get(doc.categoryId) || 'Other'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 tabular-nums">
                    {doc.expiryDate || '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    {doc.verificationStatus === 'verified' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                        Verified
                      </span>
                    ) : (
                      <span className="text-amber-500 text-[11px] font-medium">Unverified</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {subSection === 'trash' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => restoreFromTrash(doc.id, e)}
                          className="text-xs text-blue-500 hover:underline font-medium"
                        >
                          Restore
                        </button>
                        {confirmDeleteId === doc.id ? (
                          <button
                            onClick={(e) => permanentlyDelete(doc, e)}
                            className="text-xs text-rose-500 font-bold hover:underline"
                          >
                            Confirm Delete
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(doc.id);
                            }}
                            className="text-xs text-slate-400 hover:text-rose-500"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">View Details &rarr;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onSelectDocument(doc)}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-blue-500/50 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <button
                    onClick={(e) => toggleFavorite(doc, e)}
                    className={`text-slate-300 hover:text-amber-400 transition-colors ${
                      doc.isFavorite ? 'text-amber-400' : ''
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
                <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                  {doc.title}
                </h3>
                {/* Zero-Pill Unboxed Metadata */}
                <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                  <div className="truncate">{doc.documentType}</div>
                  <div className="text-[10px] text-slate-500">{catMap.get(doc.categoryId) || 'Other'}</div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-400 tabular-nums">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
                <span
                  className={
                    doc.verificationStatus === 'verified'
                      ? 'text-emerald-500 font-medium'
                      : 'text-amber-500 font-medium'
                  }
                >
                  {doc.verificationStatus === 'verified' ? 'Verified' : 'Unverified'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
