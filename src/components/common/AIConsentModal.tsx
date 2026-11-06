import React from 'react';
import { ShieldCheck, AlertCircle, X, ExternalLink } from 'lucide-react';

interface AIConsentModalProps {
  isOpen: boolean;
  actionTitle: string;
  documentTitle: string;
  previewSnippet: string;
  characterCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AIConsentModal: React.FC<AIConsentModalProps> = ({
  isOpen,
  actionTitle,
  documentTitle,
  previewSnippet,
  characterCount,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold">Online AI Transmission Consent</h3>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            You requested: <strong className="text-white">{actionTitle}</strong> for document{' '}
            <strong className="text-white">&ldquo;{documentTitle}&rdquo;</strong>.
          </p>
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
            <div className="text-[11px] font-medium text-slate-400 mb-1">
              Data to be transmitted ({characterCount.toLocaleString()} characters):
            </div>
            <div className="max-h-28 overflow-y-auto font-mono text-[11px] text-slate-400 whitespace-pre-wrap leading-tight">
              {previewSnippet || '(No text content)'}
            </div>
          </div>
          <div className="flex items-start gap-2 text-amber-300/90 text-[11px] bg-amber-500/10 border border-amber-500/20 rounded-md p-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              DocuMind operates completely offline by default. This action sends only the excerpt above
              to Google Gemini for processing via your private server. No other files or database records are shared.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-sm"
          >
            Approve &amp; Send to Gemini
          </button>
        </div>
      </div>
    </div>
  );
};
