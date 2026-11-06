import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  FilePlus,
  RefreshCw,
  History,
} from 'lucide-react';
import { db } from '../../services/database/db';
import type { DocumentRecord } from '../../types';

interface TimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'issue' | 'expiry' | 'upload' | 'version';
  title: string;
  documentTitle: string;
  documentId: string;
  documentType: string;
  details?: string;
}

interface DocumentTimelineViewProps {
  workspaceId: string;
  onSelectDocument: (doc: DocumentRecord) => void;
}

export const DocumentTimelineView: React.FC<DocumentTimelineViewProps> = ({
  workspaceId,
  onSelectDocument,
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function buildTimeline() {
      setIsLoading(true);
      try {
        const docs = await db.documents
          .where('workspaceId')
          .equals(workspaceId)
          .and((d) => !d.isDeleted)
          .toArray();

        const timelineList: TimelineEvent[] = [];

        for (const doc of docs) {
          // 1. Upload event
          timelineList.push({
            id: `upload_${doc.id}`,
            date: doc.createdAt.split('T')[0],
            type: 'upload',
            title: 'Uploaded to Vault',
            documentTitle: doc.title,
            documentId: doc.id,
            documentType: doc.documentType,
            details: `Format: ${doc.mimeType} (${(doc.fileSize / 1024).toFixed(0)} KB)`,
          });

          // 2. Issue date event
          if (doc.issueDate) {
            timelineList.push({
              id: `issue_${doc.id}`,
              date: doc.issueDate,
              type: 'issue',
              title: 'Document Issue Date',
              documentTitle: doc.title,
              documentId: doc.id,
              documentType: doc.documentType,
            });
          }

          // 3. Expiry date event
          if (doc.expiryDate) {
            timelineList.push({
              id: `expiry_${doc.id}`,
              date: doc.expiryDate,
              type: 'expiry',
              title: 'Expiration / Renewal Date',
              documentTitle: doc.title,
              documentId: doc.id,
              documentType: doc.documentType,
            });
          }
        }

        // Sort chronological (descending)
        timelineList.sort((a, b) => b.date.localeCompare(a.date));
        setEvents(timelineList);
      } finally {
        setIsLoading(false);
      }
    }

    buildTimeline();
  }, [workspaceId]);

  const filteredEvents =
    filterType === 'all' ? events : events.filter((e) => e.type === filterType);

  const getEventBadge = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'expiry':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      case 'issue':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
        );
      case 'version':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20 shrink-0">
            <History className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 shrink-0">
            <FilePlus className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span>Document Chronology &amp; Timeline</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Historical and forward-looking chronological events for all records in this vault.
          </p>
        </div>

        {/* Filter Segmented Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-850 p-1 rounded-lg text-xs self-start sm:self-auto">
          {['all', 'expiry', 'issue', 'upload'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                filterType === t
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 text-xs">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
            No events on timeline
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Upload documents with issue and expiry dates to see them ordered chronologically.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 md:pl-8 border-l border-slate-200 dark:border-slate-800 space-y-6">
          {filteredEvents.map((ev) => (
            <div key={ev.id} className="relative group">
              {/* Event node pin on the vertical line */}
              <div className="absolute -left-[35px] md:-left-[43px] top-1">
                {getEventBadge(ev.type)}
              </div>

              {/* Event Card */}
              <div
                onClick={async () => {
                  const doc = await db.documents.get(ev.documentId);
                  if (doc) onSelectDocument(doc);
                }}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-blue-500/50 cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {ev.title}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      {ev.date}
                    </span>
                  </div>
                  {/* Zero-Pill Unboxed Metadata */}
                  <span className="text-[11px] text-slate-400">
                    {ev.documentType}
                  </span>
                </div>

                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                  {ev.documentTitle}
                </div>

                {ev.details && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {ev.details}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
