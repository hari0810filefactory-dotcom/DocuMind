import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  Star,
  Archive,
  Trash2,
  CheckCircle,
  AlertTriangle,
  History,
  FolderTree,
  Tag as TagIcon,
  Sparkles,
  Bot,
  ExternalLink,
  Edit2,
  Save,
  Flag,
} from 'lucide-react';
import { db, logActivity } from '../../services/database/db';
import { FileStorageService } from '../../services/storage/fileStorage';
import type {
  DocumentRecord,
  Category,
  DocumentField,
  DocumentText,
  DocumentVersion,
} from '../../types';

interface DocumentPreviewDrawerProps {
  document: DocumentRecord | null;
  onClose: () => void;
  categories: Category[];
  onDocumentUpdated: () => void;
  onRequestAIAnalysis?: (doc: DocumentRecord) => void;
}

export const DocumentPreviewDrawer: React.FC<DocumentPreviewDrawerProps> = ({
  document: doc,
  onClose,
  categories,
  onDocumentUpdated,
  onRequestAIAnalysis,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'text' | 'metadata' | 'versions'>('preview');
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState<DocumentText | null>(null);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  useEffect(() => {
    if (!doc) {
      setFileBlob(null);
      setPreviewUrl(null);
      return;
    }

    setTitleInput(doc.title);
    setNotesInput(doc.notes || '');

    // 1. Load file blob from storage
    FileStorageService.getFile(doc.storageKey, doc.mimeType).then((blob) => {
      setFileBlob(blob);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    });

    // 2. Load extracted text
    db.documentText.where('documentId').equals(doc.id).first().then((text) => {
      setDocumentText(text || null);
    });

    // 3. Load fields
    db.documentFields.where('documentId').equals(doc.id).toArray().then((f) => {
      setFields(f);
    });

    // 4. Load version history
    db.documentVersions.where('documentId').equals(doc.id).toArray().then((v) => {
      setVersions(v);
    });

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [doc?.id, doc?.storageKey]);

  if (!doc) return null;

  const handleDownload = () => {
    if (!fileBlob) return;
    const url = URL.createObjectURL(fileBlob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = doc.originalFileName || `${doc.title}.${doc.mimeType.split('/')[1] || 'bin'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFavorite = async () => {
    const next = !doc.isFavorite;
    await db.documents.update(doc.id, { isFavorite: next, updatedAt: new Date().toISOString() });
    onDocumentUpdated();
  };

  const toggleFlagForFollowUp = async () => {
    const next = !doc.isFlagged;
    const now = new Date().toISOString();
    await db.documents.update(doc.id, {
      isFlagged: next,
      flaggedAt: next ? now : null,
      updatedAt: now,
    });
    await logActivity(
      doc.workspaceId,
      'user',
      next ? 'Flagged document for follow-up' : 'Removed follow-up flag',
      doc.id,
      doc.title
    );
    onDocumentUpdated();
  };

  const toggleArchive = async () => {
    const next = !doc.isArchived;
    await db.documents.update(doc.id, {
      isArchived: next,
      archivedAt: next ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    });
    onDocumentUpdated();
  };

  const moveToTrash = async () => {
    await db.documents.update(doc.id, {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await logActivity(doc.workspaceId, 'user', 'Moved document to trash', doc.id, doc.title);
    onDocumentUpdated();
    onClose();
  };

  const saveDetails = async () => {
    await db.documents.update(doc.id, {
      title: titleInput.trim() || doc.title,
      notes: notesInput.trim(),
      updatedAt: new Date().toISOString(),
    });
    setIsEditingTitle(false);
    onDocumentUpdated();
  };

  const verifyField = async (fieldId: string) => {
    await db.documentFields.update(fieldId, {
      verificationStatus: 'verified',
      updatedAt: new Date().toISOString(),
    });
    const updated = await db.documentFields.where('documentId').equals(doc.id).toArray();
    setFields(updated);

    // If all verified, update doc verification status
    const allVerified = updated.every((f) => f.verificationStatus === 'verified');
    if (allVerified) {
      await db.documents.update(doc.id, {
        verificationStatus: 'verified',
        processingStatus: 'completed',
        updatedAt: new Date().toISOString(),
      });
      onDocumentUpdated();
    }
  };

  const currentCategory = categories.find((c) => c.id === doc.categoryId);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col select-none transition-colors">
      {/* Top action header */}
      <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs text-slate-900 dark:text-white"
                autoFocus
              />
              <button onClick={saveDetails} className="p-1 text-emerald-500 hover:text-emerald-400">
                <Save className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="min-w-0 flex items-center gap-1.5">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {doc.title}
              </h2>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleFlagForFollowUp}
            className={`p-1.5 rounded-md transition-colors ${
              doc.isFlagged
                ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={doc.isFlagged ? 'Remove follow-up flag' : 'Flag for follow-up'}
            aria-label="Flag for follow-up"
          >
            <Flag className={`w-4 h-4 ${doc.isFlagged ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={toggleFavorite}
            className={`p-1.5 rounded-md transition-colors ${
              doc.isFavorite
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title={doc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Download original file"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={toggleArchive}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title={doc.isArchived ? 'Unarchive document' : 'Archive document'}
          >
            <Archive className="w-4 h-4" />
          </button>

          <button
            onClick={moveToTrash}
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 transition-colors"
            title="Move to trash"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 px-4 border-b border-slate-200 dark:border-slate-800 text-xs bg-slate-50/50 dark:bg-slate-950/40">
        <button
          onClick={() => setActiveTab('preview')}
          className={`py-2.5 px-2 border-b-2 font-medium transition-colors ${
            activeTab === 'preview'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          File Preview
        </button>
        <button
          onClick={() => setActiveTab('metadata')}
          className={`py-2.5 px-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'metadata'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Extracted Fields</span>
          {fields.some((f) => f.verificationStatus === 'unverified') && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`py-2.5 px-2 border-b-2 font-medium transition-colors ${
            activeTab === 'text'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Extracted Text
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`py-2.5 px-2 border-b-2 font-medium transition-colors ${
            activeTab === 'versions'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Versions ({versions.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Flag for Follow-up Status & Toggle Switch */}
        <div className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-colors ${
          doc.isFlagged
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
            : 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              doc.isFlagged
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
            }`}>
              <Flag className={`w-4 h-4 ${doc.isFlagged ? 'fill-current' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {doc.isFlagged ? 'Flagged for Follow-up' : 'Flag for Follow-up'}
                </span>
                {doc.isFlagged && (
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-sm">
                    Action Required
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {doc.isFlagged
                  ? `Marked for attention${doc.flaggedAt ? ` · ${new Date(doc.flaggedAt).toLocaleDateString()}` : ''}`
                  : 'Track pending reviews, signatures, or renewals'}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={Boolean(doc.isFlagged)}
            onClick={toggleFlagForFollowUp}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              doc.isFlagged ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            title={doc.isFlagged ? 'Unflag document' : 'Flag document for follow-up'}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                doc.isFlagged ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* TAB 1: File Preview */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            {/* Safe visual preview */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center min-h-[340px]">
              {previewUrl && doc.mimeType.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={doc.title}
                  className="max-h-[500px] object-contain rounded-lg p-2"
                />
              ) : previewUrl && doc.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  title={doc.title}
                  className="w-full h-[520px] rounded-lg border-0"
                />
              ) : previewUrl && doc.mimeType === 'text/plain' ? (
                <div className="p-4 w-full h-[360px] overflow-y-auto font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {documentText?.extractedText || 'Plain text file'}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <div>Safe binary storage maintained</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Direct browser preview unavailable for {doc.mimeType}. You can download the original file.
                  </div>
                  <button
                    onClick={handleDownload}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Original</span>
                  </button>
                </div>
              )}
            </div>

            {/* Document Attributes List */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
                <span className="text-[11px] text-slate-400">Document Type</span>
                <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {doc.documentType}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
                <span className="text-[11px] text-slate-400">Category</span>
                <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {currentCategory?.name || 'Uncategorized'}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
                <span className="text-[11px] text-slate-400">Issue Date</span>
                <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 tabular-nums">
                  {doc.issueDate || 'Not specified'}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
                <span className="text-[11px] text-slate-400">Expiry Date</span>
                <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 tabular-nums">
                  {doc.expiryDate || 'No expiry recorded'}
                </div>
              </div>

              <div className="col-span-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
                <span className="text-[11px] text-slate-400">Cryptographic Hash (SHA-256)</span>
                <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 break-all select-all">
                  {doc.fileHash}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Extracted Fields (Verification Review) */}
        {activeTab === 'metadata' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Candidate Extracted Fields
              </span>
              <span className="text-[11px] text-slate-400">
                Rule-based &amp; OCR deterministic extraction
              </span>
            </div>

            {fields.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No specific fields could be deterministically extracted from this document.
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-400 font-medium">
                        {field.fieldName}
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                        {field.fieldValue}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Confidence: {(field.confidence * 100).toFixed(0)}% · Page {field.sourcePage || 1}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {field.verificationStatus === 'verified' ? (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                          <CheckCircle className="w-4 h-4" />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => verifyField(field.id)}
                          className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors shadow-xs"
                        >
                          Verify Field
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Extracted Text */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">
              <span>Full Indexed Content</span>
              <span className="font-mono tabular-nums">
                {documentText?.extractedText.length || 0} characters
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 max-h-[460px] overflow-y-auto font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
              {documentText?.extractedText || 'No text extracted for this document.'}
            </div>
          </div>
        )}

        {/* TAB 4: Version History */}
        {activeTab === 'versions' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-slate-800">
              Document Versions
            </div>
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      Version {v.versionNumber}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Hash: {v.fileHash.slice(0, 16)}...
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 tabular-nums">
                    {new Date(v.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
