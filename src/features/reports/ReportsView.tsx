import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Calendar,
  Download,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { DocumentHealthService } from '../../services/reports/healthScore';
import { BackupService } from '../../services/backup/backupService';
import type { DocumentHealthScore } from '../../types';

interface ReportsViewProps {
  workspaceId: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ workspaceId }) => {
  const [healthScore, setHealthScore] = useState<DocumentHealthScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const score = await DocumentHealthService.calculateHealthScore(workspaceId);
      setHealthScore(score);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [workspaceId]);

  const handleExportCsv = async () => {
    const csv = await BackupService.exportMetadataCsv(workspaceId);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documind-health-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !healthScore) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
        <div className="h-64 bg-slate-100 dark:bg-slate-850 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            <span>Document Health &amp; Compliance Audit</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Transparent scoring engine analyzing expiration risks, metadata completeness, and verification coverage.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Main Score Hero Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Overall Vault Health Score
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight tabular-nums">
              {healthScore.score}
            </span>
            <span className="text-slate-400 text-lg font-medium">/ 100</span>
            <span
              className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                healthScore.score >= 85
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : healthScore.score >= 70
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}
            >
              Grade {healthScore.grade}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            {healthScore.score >= 85
              ? 'Excellent document posture. Expirations are tracked, files are classified, and metadata has been verified.'
              : 'Attention recommended: Verify candidate extracted fields and resolve expired or near-expiry policies.'}
          </p>
        </div>

        {/* Quick stat counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
            <div className="text-[11px] text-slate-400">Total Docs</div>
            <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200 tabular-nums">
              {healthScore.totalDocuments}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
            <div className="text-[11px] text-slate-400">Expired</div>
            <div className="text-lg font-bold font-mono text-rose-500 tabular-nums">
              {healthScore.expiredCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
            <div className="text-[11px] text-slate-400">Near Expiry (30d)</div>
            <div className="text-lg font-bold font-mono text-amber-500 tabular-nums">
              {healthScore.expiringCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
            <div className="text-[11px] text-slate-400">Unverified</div>
            <div className="text-lg font-bold font-mono text-blue-500 tabular-nums">
              {healthScore.unverifiedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Transparent Calculation Breakdown */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-900 dark:text-white">
            Transparent Audit Breakdown
          </span>
          <span className="text-slate-400">Deterministic scoring weights</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2 text-xs">
          {healthScore.breakdown.map((item, idx) => (
            <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 max-w-lg">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.label}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {item.description}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{
                      width: `${item.weight > 0 ? (item.pointsEarned / item.weight) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums text-right w-12">
                  {item.pointsEarned} / {item.weight}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
