import React, { useState, useEffect } from 'react';
import {
  FileText,
  Star,
  Archive,
  Trash2,
  Upload,
  Search,
  Grid,
  List,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Download,
  Tag,
  CheckSquare,
  Square,
  X,
  Loader2,
  ChevronRight,
  FolderInput,
} from 'lucide-react';
import { db, logActivity } from '../../services/database/db';
import { FileStorageService } from '../../services/storage/fileStorage';
import { BackupService } from '../../services/backup/backupService';
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

  // Selection & Batch Processing State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchActionType, setBatchActionType] = useState<string | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [showBatchCategorizeModal, setShowBatchCategorizeModal] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
    // Clear selection on section switch
    setSelectedDocIds(new Set());
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

  // Toggle selection for an individual document
  const toggleSelectDoc = (docId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Select all or deselect all filtered documents
  const toggleSelectAll = () => {
    if (selectedDocIds.size === filteredDocs.length && filteredDocs.length > 0) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  const clearSelection = () => {
    setSelectedDocIds(new Set());
    setIsSelectionMode(false);
  };

  // Batch Operation 1: Bulk Delete (Move to trash or permanently remove)
  const executeBatchDelete = async () => {
    if (selectedDocIds.size === 0) return;
    setIsBatchProcessing(true);
    setBatchActionType('delete');
    const idsToDelete = Array.from(selectedDocIds);

    try {
      if (subSection === 'trash') {
        // Permanently delete files and database records
        for (const docId of idsToDelete) {
          const doc = await db.documents.get(docId);
          if (doc) {
            await FileStorageService.deleteFile(doc.storageKey);
            await db.documents.delete(docId);
            await db.documentText.where('documentId').equals(docId).delete();
            await db.documentFields.where('documentId').equals(docId).delete();
            await db.documentVersions.where('documentId').equals(docId).delete();
            await db.documentTags.where('documentId').equals(docId).delete();
          }
        }
        await logActivity(
          workspaceId,
          'user',
          'Permanently deleted batch documents',
          workspaceId,
          `Permanently deleted ${idsToDelete.length} document(s)`
        );
        setNotification({
          type: 'success',
          message: `Permanently deleted ${idsToDelete.length} document(s).`,
        });
      } else {
        // Move to trash
        const now = new Date().toISOString();
        for (const docId of idsToDelete) {
          await db.documents.update(docId, {
            isDeleted: true,
            deletedAt: now,
            updatedAt: now,
          });
        }
        await logActivity(
          workspaceId,
          'user',
          'Moved batch documents to trash',
          workspaceId,
          `Moved ${idsToDelete.length} document(s) to trash`
        );
        setNotification({
          type: 'success',
          message: `Moved ${idsToDelete.length} document(s) to trash.`,
        });
      }

      setShowBatchDeleteModal(false);
      clearSelection();
      await loadDocuments();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Batch delete failed: ${err.message || 'unknown error'}`,
      });
    } finally {
      setIsBatchProcessing(false);
      setBatchActionType(null);
    }
  };

  // Batch Operation 2: Bulk Categorize
  const executeBatchCategorize = async () => {
    if (selectedDocIds.size === 0 || !targetCategoryId) return;
    setIsBatchProcessing(true);
    setBatchActionType('categorize');
    const idsToUpdate = Array.from(selectedDocIds);

    try {
      const now = new Date().toISOString();
      for (const docId of idsToUpdate) {
        await db.documents.update(docId, {
          categoryId: targetCategoryId,
          updatedAt: now,
        });
      }

      const catName = catMap.get(targetCategoryId) || 'Target Category';
      await logActivity(
        workspaceId,
        'user',
        'Updated category for batch documents',
        workspaceId,
        `Recategorized ${idsToUpdate.length} document(s) to ${catName}`
      );

      setNotification({
        type: 'success',
        message: `Updated category to "${catName}" for ${idsToUpdate.length} document(s).`,
      });

      setShowBatchCategorizeModal(false);
      clearSelection();
      await loadDocuments();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Batch recategorization failed: ${err.message}`,
      });
    } finally {
      setIsBatchProcessing(false);
      setBatchActionType(null);
    }
  };

  // Batch Operation 3: Bulk Export
  const executeBatchExport = async () => {
    if (selectedDocIds.size === 0) return;
    setIsBatchProcessing(true);
    setBatchActionType('export');
    const idsToExport = Array.from(selectedDocIds);

    try {
      const res = await BackupService.exportSelectedDocumentsZip(workspaceId, idsToExport);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName;
      a.click();
      URL.revokeObjectURL(url);

      setNotification({
        type: 'success',
        message: `Exported ${res.count} document(s) and metadata into ${res.fileName}.`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Batch export failed: ${err.message}`,
      });
    } finally {
      setIsBatchProcessing(false);
      setBatchActionType(null);
    }
  };

  // Batch Operation 4: Bulk Archive / Unarchive
  const executeBatchArchive = async (archiveState: boolean) => {
    if (selectedDocIds.size === 0) return;
    setIsBatchProcessing(true);
    setBatchActionType('archive');
    const idsToUpdate = Array.from(selectedDocIds);

    try {
      const now = new Date().toISOString();
      for (const docId of idsToUpdate) {
        await db.documents.update(docId, {
          isArchived: archiveState,
          updatedAt: now,
        });
      }

      await logActivity(
        workspaceId,
        'user',
        archiveState ? 'Archived batch documents' : 'Unarchived batch documents',
        workspaceId,
        `${archiveState ? 'Archived' : 'Unarchived'} ${idsToUpdate.length} document(s)`
      );

      setNotification({
        type: 'success',
        message: `${archiveState ? 'Archived' : 'Unarchived'} ${idsToUpdate.length} document(s).`,
      });

      clearSelection();
      await loadDocuments();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Batch archive failed: ${err.message}`,
      });
    } finally {
      setIsBatchProcessing(false);
      setBatchActionType(null);
    }
  };

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
    await db.documentTags.where('documentId').equals(doc.id).delete();
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

  const allFilteredSelected =
    filteredDocs.length > 0 && selectedDocIds.size === filteredDocs.length;
  const isPartiallySelected =
    selectedDocIds.size > 0 && selectedDocIds.size < filteredDocs.length;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {getSubTitle()}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filteredDocs.length} document(s) matching criteria ·{' '}
            {selectedDocIds.size > 0 ? (
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                {selectedDocIds.size} selected
              </span>
            ) : (
              'Selection mode available'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Toggle Selection Mode Button */}
          <button
            onClick={() => {
              if (isSelectionMode && selectedDocIds.size > 0) {
                clearSelection();
              } else {
                setIsSelectionMode((prev) => !prev);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isSelectionMode || selectedDocIds.size > 0
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>
              {isSelectionMode || selectedDocIds.size > 0 ? 'Exit Selection' : 'Select'}
            </span>
          </button>

          {subSection !== 'trash' && (
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and View Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
          {/* Quick Select All in Selection Mode */}
          {(isSelectionMode || selectedDocIds.size > 0) && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
            >
              {allFilteredSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
              ) : isPartiallySelected ? (
                <div className="w-3.5 h-3.5 bg-blue-500/20 border border-blue-500 rounded-xs flex items-center justify-center text-[9px] font-bold text-blue-500">
                  -
                </div>
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{allFilteredSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}

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
                {/* Selection Checkbox Column */}
                <th className="py-2.5 px-3 w-8 text-center">
                  <button
                    onClick={toggleSelectAll}
                    title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                    ) : isPartiallySelected ? (
                      <div className="w-3.5 h-3.5 bg-blue-500/20 border border-blue-500 rounded-xs flex items-center justify-center text-[9px] font-bold text-blue-500">
                        -
                      </div>
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-2 w-7"></th>
                <th className="py-2.5 px-3">Title &amp; File</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 font-mono">Expiry</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredDocs.map((doc) => {
                const isSelected = selectedDocIds.has(doc.id);
                return (
                  <tr
                    key={doc.id}
                    onClick={() => {
                      if (isSelectionMode || selectedDocIds.size > 0) {
                        toggleSelectDoc(doc.id);
                      } else {
                        onSelectDocument(doc);
                      }
                    }}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={(e) => toggleSelectDoc(doc.id, e)}
                        className="text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>

                    {/* Favorite Star */}
                    <td className="py-2.5 px-2">
                      <button
                        onClick={(e) => toggleFavorite(doc, e)}
                        className={`text-slate-300 hover:text-amber-400 transition-colors ${
                          doc.isFavorite ? 'text-amber-400' : ''
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </td>

                    {/* Title & Metadata */}
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                      <div className="truncate font-semibold">{doc.title}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {doc.originalFileName} · {(doc.fileSize / 1024).toFixed(0)} KB
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {doc.documentType}
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {catMap.get(doc.categoryId) || 'Other'}
                    </td>

                    {/* Expiry */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 tabular-nums">
                      {doc.expiryDate || '—'}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3">
                      {doc.verificationStatus === 'verified' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                          Verified
                        </span>
                      ) : (
                        <span className="text-amber-500 text-[11px] font-medium">Unverified</span>
                      )}
                    </td>

                    {/* Actions */}
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
                              Confirm
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDocument(doc);
                          }}
                          className="text-[11px] text-slate-400 hover:text-blue-500"
                        >
                          View &rarr;
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => {
            const isSelected = selectedDocIds.has(doc.id);
            return (
              <div
                key={doc.id}
                onClick={() => {
                  if (isSelectionMode || selectedDocIds.size > 0) {
                    toggleSelectDoc(doc.id);
                  } else {
                    onSelectDocument(doc);
                  }
                }}
                className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-xs cursor-pointer transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-blue-500 ring-1 ring-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => toggleSelectDoc(doc.id, e)}
                        className="text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
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
                    <div className="text-[10px] text-slate-500">
                      {catMap.get(doc.categoryId) || 'Other'}
                    </div>
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
            );
          })}
        </div>
      )}

      {/* FLOATING BATCH PROCESSING TOOLBAR (Triggered on Selection) */}
      {selectedDocIds.size > 0 && (
        <aside
          aria-label="Bulk actions toolbar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-3 sm:gap-4 max-w-2xl w-[92%] transition-all animate-in fade-in slide-in-from-bottom-4"
        >
          {/* Selected Count Badge */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700/80 shrink-0">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {selectedDocIds.size}
            </span>
            <span className="text-xs font-medium hidden sm:inline text-slate-200">
              Selected
            </span>
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto py-0.5">
            {/* Batch Categorize */}
            <button
              onClick={() => {
                setTargetCategoryId(categories[0]?.id || '');
                setShowBatchCategorizeModal(true);
              }}
              disabled={isBatchProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap disabled:opacity-50"
              title="Change category for selected documents"
            >
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>Categorize</span>
            </button>

            {/* Batch Export */}
            <button
              onClick={executeBatchExport}
              disabled={isBatchProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap disabled:opacity-50"
              title="Download selected documents as ZIP"
            >
              {isBatchProcessing && batchActionType === 'export' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Export ZIP</span>
            </button>

            {/* Batch Archive (toggle) */}
            {subSection !== 'trash' && (
              <button
                onClick={() => executeBatchArchive(subSection !== 'archived')}
                disabled={isBatchProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap disabled:opacity-50"
                title="Archive or unarchive selected documents"
              >
                <Archive className="w-3.5 h-3.5 text-amber-400" />
                <span>{subSection === 'archived' ? 'Unarchive' : 'Archive'}</span>
              </button>
            )}

            {/* Batch Delete */}
            <button
              onClick={() => setShowBatchDeleteModal(true)}
              disabled={isBatchProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-xs font-medium text-white transition-colors whitespace-nowrap disabled:opacity-50 ml-auto sm:ml-0"
              title="Delete selected documents"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{subSection === 'trash' ? 'Purge' : 'Delete'}</span>
            </button>
          </div>

          {/* Dismiss / Clear Selection */}
          <button
            onClick={clearSelection}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 ml-1"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* MODAL 1: Batch Categorize Modal */}
      {showBatchCategorizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Batch Categorize
                </h3>
              </div>
              <button
                onClick={() => setShowBatchCategorizeModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Assign a new category to all <strong>{selectedDocIds.size}</strong> selected
              document(s).
            </p>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Select Destination Category
              </label>
              <select
                value={targetCategoryId}
                onChange={(e) => setTargetCategoryId(e.target.value)}
                className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBatchCategorizeModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={executeBatchCategorize}
                disabled={isBatchProcessing || !targetCategoryId}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-xs disabled:opacity-50"
              >
                {isBatchProcessing && batchActionType === 'categorize' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                <span>Apply Category</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Batch Delete Confirmation Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  {subSection === 'trash' ? 'Permanent Batch Delete' : 'Move to Trash'}
                </h3>
              </div>
              <button
                onClick={() => setShowBatchDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              {subSection === 'trash' ? (
                <>
                  Are you sure you want to permanently delete all{' '}
                  <strong className="text-rose-500">{selectedDocIds.size}</strong> selected
                  document(s)? This will purge their binary files, text extracts, and metadata
                  from local storage. <strong>This cannot be undone.</strong>
                </>
              ) : (
                <>
                  Are you sure you want to move{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {selectedDocIds.size}
                  </strong>{' '}
                  selected document(s) to the trash? You can restore them anytime from the Trash
                  view.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={executeBatchDelete}
                disabled={isBatchProcessing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-xs disabled:opacity-50"
              >
                {isBatchProcessing && batchActionType === 'delete' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                <span>
                  {subSection === 'trash' ? 'Confirm Permanent Delete' : 'Move to Trash'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
