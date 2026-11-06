import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FolderTree,
  Plus,
} from 'lucide-react';
import { ProcessingPipeline } from '../../services/processing/processingPipeline';
import type { Category, DocumentRecord } from '../../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  categories: Category[];
  onUploadComplete: () => void;
}

interface UploadQueueItem {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'duplicate' | 'error';
  progressText: string;
  progressPercent: number;
  duplicateTitle?: string;
  errorMessage?: string;
  createdDoc?: DocumentRecord;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  categories,
  onUploadComplete,
}) => {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: UploadQueueItem[] = Array.from(files).map((f) => ({
      file: f,
      status: 'pending',
      progressText: 'Queued',
      progressPercent: 0,
    }));
    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const processQueue = async () => {
    const updated = [...queue];

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      if (item.status === 'completed' || item.status === 'duplicate') continue;

      item.status = 'uploading';
      item.progressText = 'Validating and hashing...';
      item.progressPercent = 15;
      setQueue([...updated]);

      try {
        const result = await ProcessingPipeline.processNewUpload(
          item.file,
          workspaceId,
          null,
          selectedCategoryId || undefined,
          (stage, percent) => {
            item.progressText = stage;
            item.progressPercent = percent;
            setQueue([...updated]);
          }
        );

        if (result.isDuplicate) {
          item.status = 'duplicate';
          item.duplicateTitle = result.existingDocumentTitle;
          item.progressText = 'Duplicate detected (Identical SHA-256)';
          item.createdDoc = result.document;
        } else {
          item.status = 'completed';
          item.progressText = 'Saved & Processing Started';
          item.progressPercent = 100;
          item.createdDoc = result.document;
        }
      } catch (err: any) {
        item.status = 'error';
        item.errorMessage = err.message || 'Upload failed.';
        item.progressText = 'Failed';
      }
      setQueue([...updated]);
    }

    onUploadComplete();
  };

  const isAnyUploading = queue.some((i) => i.status === 'uploading');
  const allFinished = queue.length > 0 && queue.every((i) => i.status !== 'pending' && i.status !== 'uploading');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Upload Important Documents
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Files are stored locally in your private device vault.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isAnyUploading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category selector */}
        <div className="my-3 flex items-center gap-2 text-xs">
          <FolderTree className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-700 dark:text-slate-300">Default Category:</span>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="flex-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="">Automatic Rule-Based Detection</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-400 dark:hover:border-slate-700'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Click to browse or drop files here
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Supported formats: PDF, PNG, JPG, JPEG, TXT, DOCX
          </div>
        </div>

        {/* Selected / Queued items list */}
        {queue.length > 0 && (
          <div className="mt-4 flex-1 overflow-y-auto space-y-2 max-h-48 pr-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Files ({queue.length})
            </div>
            {queue.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.file.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {(item.file.size / 1024).toFixed(0)} KB · {item.progressText}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {item.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  {item.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {item.status === 'duplicate' && (
                    <div
                      className="flex items-center gap-1 text-[10px] text-amber-500"
                      title={`Identical to "${item.duplicateTitle || 'Existing doc'}"`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Duplicate File</span>
                    </div>
                  )}
                  {item.status === 'error' && (
                    <span className="text-[10px] text-rose-500">{item.errorMessage}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions Footer */}
        <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setQueue([])}
            disabled={isAnyUploading || queue.length === 0}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-40"
          >
            Clear List
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isAnyUploading}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {allFinished ? 'Done' : 'Cancel'}
            </button>

            {!allFinished && (
              <button
                onClick={processQueue}
                disabled={isAnyUploading || queue.length === 0}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isAnyUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isAnyUploading ? 'Processing...' : 'Upload & Process'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
