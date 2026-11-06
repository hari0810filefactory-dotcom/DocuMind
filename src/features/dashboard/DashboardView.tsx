import React, { useEffect, useState } from 'react';
import {
  Files,
  HardDrive,
  AlertCircle,
  Clock,
  CheckCircle2,
  Upload,
  Search,
  Bell,
  ArrowRight,
  ShieldCheck,
  FileText,
  FileQuestion,
  Activity,
  FolderPlus,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { db } from '../../services/database/db';
import { FileStorageService } from '../../services/storage/fileStorage';
import { DocumentHealthService } from '../../services/reports/healthScore';
import { ReminderEngine, type EvaluatedReminder } from '../../services/reminders/reminderEngine';
import type {
  DocumentRecord,
  Category,
  ActivityLog,
  DocumentHealthScore,
} from '../../types';

interface DashboardViewProps {
  workspaceId: string;
  onOpenUpload: () => void;
  onNavigate: (section: any, subSection?: string) => void;
  onSelectDocument: (doc: DocumentRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspaceId,
  onOpenUpload,
  onNavigate,
  onSelectDocument,
}) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [healthScore, setHealthScore] = useState<DocumentHealthScore | null>(null);
  const [storageUsage, setStorageUsage] = useState<{ usedBytes: number; quotaBytes: number; opfsActive: boolean }>({
    usedBytes: 0,
    quotaBytes: 0,
    opfsActive: false,
  });
  const [reminders, setReminders] = useState<{
    upcoming: EvaluatedReminder[];
    overdue: EvaluatedReminder[];
  }>({ upcoming: [], overdue: [] });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docs, cats, logs, health, storage, rems] = await Promise.all([
        db.documents.where('workspaceId').equals(workspaceId).and((d) => !d.isDeleted).toArray(),
        db.categories.where('workspaceId').equals(workspaceId).toArray(),
        db.activityLogs.where('workspaceId').equals(workspaceId).reverse().limit(6).toArray(),
        DocumentHealthService.calculateHealthScore(workspaceId),
        FileStorageService.getStorageEstimate(),
        ReminderEngine.getEvaluatedReminders(workspaceId),
      ]);

      // Sort docs by createdAt desc
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setDocuments(docs);
      setCategories(cats);
      setActivities(logs);
      setHealthScore(health);
      setStorageUsage(storage);
      setReminders({ upcoming: rems.upcoming.slice(0, 5), overdue: rems.overdue.slice(0, 5) });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  // Calculate real total document file bytes
  const totalDocBytes = documents.reduce((acc, d) => acc + (d.fileSize || 0), 0);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Group by category counts
  const categoryCounts = categories.map((c) => {
    const count = documents.filter((d) => d.categoryId === c.id).length;
    return { ...c, count };
  });

  const reviewRequiredDocs = documents.filter((d) => d.processingStatus === 'review_required');
  const recentDocs = documents.slice(0, 6);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 dark:bg-slate-850 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Workspace Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time status of stored documents, offline security, and pending reviews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('search', 'query')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
          <button
            onClick={() => onNavigate('reminders', 'all')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Add Reminder</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Documents */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium">Total Documents</span>
            <Files className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {documents.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {documents.filter((d) => d.verificationStatus === 'verified').length} verified by user
          </div>
        </div>

        {/* Local Storage Used */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium">Local Vault Size</span>
            <HardDrive className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
            {formatBytes(totalDocBytes)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {storageUsage.opfsActive ? 'OPFS High-Speed Engine' : 'IndexedDB Blob Store'}
          </div>
        </div>

        {/* Verification Queue */}
        <div
          onClick={() => onNavigate('ai', 'extraction')}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs cursor-pointer hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium">Needs Verification</span>
            <FileQuestion className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            {reviewRequiredDocs.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Candidate fields awaiting approval
          </div>
        </div>

        {/* Document Health Score */}
        <div
          onClick={() => onNavigate('reports', 'health')}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs cursor-pointer hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium">Document Health</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
              {healthScore?.score ?? 100}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ 100</span>
            <span
              className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                (healthScore?.score || 100) >= 80
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              Grade {healthScore?.grade ?? 'A'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {healthScore?.expiredCount || 0} expired · {healthScore?.expiringCount || 0} near expiry
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Documents + Reminders & Health breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Documents Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="font-semibold text-xs text-slate-900 dark:text-white">
                Recent Documents
              </div>
              <button
                onClick={() => onNavigate('documents', 'all')}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>View All ({documents.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentDocs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  Your vault is empty
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Upload your first document (PDF, PNG, JPG, TXT) to begin local indexing and OCR.
                </div>
                <button
                  onClick={onOpenUpload}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDocument(doc)}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {doc.title}
                        </div>
                        {/* Zero-Pill Unboxed Metadata with separators */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <span>{doc.documentType}</span>
                          <span aria-hidden="true">·</span>
                          <span>{catMap.get(doc.categoryId) || 'Other'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{formatBytes(doc.fileSize)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div className="text-[11px]">
                        {doc.verificationStatus === 'verified' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Verified
                          </span>
                        ) : (
                          <span className="text-amber-500 font-medium">Unverified</span>
                        )}
                        <div className="font-mono text-[10px] text-slate-400 tabular-nums">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categories Bar Distribution */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-900 dark:text-white">
                Category Distribution
              </span>
              <button
                onClick={() => onNavigate('categories', 'all')}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Manage Categories
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {categoryCounts.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => onNavigate('categories', cat.name.toLowerCase())}
                  className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span className="truncate">{cat.name}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      {cat.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Upcoming Reminders & Health Audit Breakdown */}
        <div className="space-y-4">
          {/* Reminders Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-blue-500" />
                <span>Expiries &amp; Reminders</span>
              </div>
              <button
                onClick={() => onNavigate('reminders', 'all')}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                All
              </button>
            </div>

            <div className="p-3 space-y-2 text-xs">
              {reminders.overdue.length > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300">
                  <div className="font-semibold text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{reminders.overdue.length} Overdue Reminder(s)</span>
                  </div>
                  <div className="text-[10px] mt-1 space-y-1">
                    {reminders.overdue.slice(0, 2).map((r) => (
                      <div key={r.id} className="truncate">
                        · {r.title} ({r.eventDate})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reminders.upcoming.length === 0 && reminders.overdue.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-[11px]">
                  No upcoming expiration reminders.
                </div>
              ) : (
                reminders.upcoming.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-2 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate text-[11px]">
                        {rem.title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Due in {rem.daysRemaining} days · {rem.eventDate}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-blue-500 shrink-0">
                      -{rem.remindBeforeDays}d
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit Logs / Activity */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="font-semibold text-xs text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Audit Trail</span>
            </div>
            {activities.length === 0 ? (
              <div className="text-center py-4 text-[11px] text-slate-400">
                No recent activity recorded.
              </div>
            ) : (
              <div className="space-y-2 text-[11px]">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {act.action}
                      </div>
                      {act.details && (
                        <div className="text-[10px] text-slate-400 truncate">{act.details}</div>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 shrink-0">
                      {new Date(act.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
