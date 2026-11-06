import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  RotateCcw,
  Calendar,
  X,
  FileText,
} from 'lucide-react';
import { ReminderEngine, type EvaluatedReminder } from '../../services/reminders/reminderEngine';
import { db } from '../../services/database/db';
import type { DocumentRecord } from '../../types';

interface RemindersViewProps {
  workspaceId: string;
  onSelectDocument: (doc: DocumentRecord) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  workspaceId,
  onSelectDocument,
}) => {
  const [reminders, setReminders] = useState<{
    upcoming: EvaluatedReminder[];
    overdue: EvaluatedReminder[];
    completed: EvaluatedReminder[];
    snoozed: EvaluatedReminder[];
  }>({ upcoming: [], overdue: [], completed: [], snoozed: [] });

  const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue' | 'completed' | 'snoozed'>('upcoming');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  // Add reminder form state
  const [newTitle, setNewTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newRemindBefore, setNewRemindBefore] = useState<number>(30);
  const [newDocId, setNewDocId] = useState<string>('');
  const [newNotes, setNewNotes] = useState('');

  const loadData = async () => {
    try {
      const [evaluated, docs] = await Promise.all([
        ReminderEngine.getEvaluatedReminders(workspaceId),
        db.documents.where('workspaceId').equals(workspaceId).and((d) => !d.isDeleted).toArray(),
      ]);
      setReminders(evaluated);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load reminders:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newEventDate) return;

    await db.reminders.add({
      id: crypto.randomUUID(),
      workspaceId,
      documentId: newDocId || null,
      title: newTitle.trim(),
      eventDate: newEventDate,
      remindBeforeDays: newRemindBefore,
      status: 'pending',
      notes: newNotes.trim() || undefined,
      completedAt: null,
      createdAt: new Date().toISOString(),
    });

    setIsAddModalOpen(false);
    setNewTitle('');
    setNewEventDate('');
    setNewNotes('');
    setNewDocId('');
    loadData();
  };

  const handleComplete = async (id: string) => {
    await ReminderEngine.completeReminder(id);
    loadData();
  };

  const handleSnooze = async (id: string) => {
    await ReminderEngine.snoozeReminder(id, 7);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await db.reminders.delete(id);
    loadData();
  };

  const handleReactivate = async (id: string) => {
    await ReminderEngine.reactivateReminder(id);
    loadData();
  };

  const requestBrowserPermission = async () => {
    const granted = await ReminderEngine.requestNotificationPermission();
    if (granted) {
      ReminderEngine.triggerBrowserNotification(
        'DocuMind Notifications Active',
        'Local document reminder notifications are now enabled in this browser.'
      );
    }
  };

  const currentList = reminders[activeTab];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            <span>Document Expiry &amp; Reminders</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Local rules tracking upcoming renewals, expiration dates, milestones, and warranties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={requestBrowserPermission}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            Enable Browser Alerts
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Reminder</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`py-2 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'upcoming'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Upcoming</span>
          <span className="font-mono tabular-nums text-[11px] text-slate-400">
            ({reminders.upcoming.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`py-2 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'overdue'
              ? 'border-rose-500 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Overdue</span>
          {reminders.overdue.length > 0 && (
            <span className="font-mono tabular-nums text-[11px] font-bold text-rose-500">
              ({reminders.overdue.length})
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('snoozed')}
          className={`py-2 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'snoozed'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Snoozed</span>
          <span className="font-mono tabular-nums text-[11px] text-slate-400">
            ({reminders.snoozed.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`py-2 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'completed'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Completed</span>
          <span className="font-mono tabular-nums text-[11px] text-slate-400">
            ({reminders.completed.length})
          </span>
        </button>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              No {activeTab} reminders
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {activeTab === 'upcoming'
                ? 'All documents with expiration dates will show up here.'
                : 'No items in this filter.'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {currentList.map((rem) => (
              <div
                key={rem.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                    {rem.title}
                  </div>
                  {/* Zero-Pill Unboxed Metadata with separators */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-mono tabular-nums">Event Date: {rem.eventDate}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        rem.isOverdue
                          ? 'text-rose-500 font-bold'
                          : rem.daysRemaining <= 30
                            ? 'text-amber-500 font-medium'
                            : 'text-slate-400'
                      }
                    >
                      {rem.isOverdue
                        ? `${Math.abs(rem.daysRemaining)} days overdue`
                        : `${rem.daysRemaining} days remaining`}
                    </span>
                    {rem.documentTitle && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-xs">{rem.documentTitle}</span>
                      </>
                    )}
                  </div>
                  {rem.notes && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      {rem.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {rem.status !== 'completed' ? (
                    <>
                      <button
                        onClick={() => handleSnooze(rem.id)}
                        className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        title="Snooze for 7 days"
                      >
                        Snooze 7d
                      </button>
                      <button
                        onClick={() => handleComplete(rem.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleReactivate(rem.id)}
                      className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                    >
                      Re-open
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(rem.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Delete reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Reminder Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Document Reminder
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Reminder Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Passport Expiration, Car Insurance Renewal"
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Event / Expiration Date
                </label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Remind Me Before
                </label>
                <select
                  value={newRemindBefore}
                  onChange={(e) => setNewRemindBefore(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value={90}>90 days before</option>
                  <option value={60}>60 days before</option>
                  <option value={30}>30 days before</option>
                  <option value={14}>14 days before</option>
                  <option value={7}>7 days before</option>
                  <option value={1}>1 day before</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Link to Document (Optional)
                </label>
                <select
                  value={newDocId}
                  onChange={(e) => setNewDocId(e.target.value)}
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value="">None (Independent Reminder)</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Notes / Next Steps
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Schedule appointment with consulate, check renewal discounts..."
                  rows={2}
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-xs"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
