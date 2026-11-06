// Local Rule-Based Document Reminder Engine

import { db } from '../database/db';
import type { Reminder, ReminderStatus } from '../../types';

export interface EvaluatedReminder extends Reminder {
  documentTitle?: string;
  isOverdue: boolean;
  daysRemaining: number;
  triggerDate: string; // The date the reminder triggers (eventDate minus remindBeforeDays)
}

export class ReminderEngine {
  /**
   * Request browser notification permission safely
   */
  static async requestNotificationPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      }
    }
    return false;
  }

  /**
   * Send local browser notification if permitted
   */
  static triggerBrowserNotification(title: string, body: string): void {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
        });
      } catch (err) {
        console.warn('Failed to fire Notification:', err);
      }
    }
  }

  /**
   * Evaluate all active reminders for a workspace
   */
  static async getEvaluatedReminders(workspaceId: string): Promise<{
    upcoming: EvaluatedReminder[];
    overdue: EvaluatedReminder[];
    completed: EvaluatedReminder[];
    snoozed: EvaluatedReminder[];
  }> {
    const rawReminders = await db.reminders.where('workspaceId').equals(workspaceId).toArray();
    const documents = await db.documents.where('workspaceId').equals(workspaceId).toArray();
    const docMap = new Map(documents.map((d) => [d.id, d.title]));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const upcoming: EvaluatedReminder[] = [];
    const overdue: EvaluatedReminder[] = [];
    const completed: EvaluatedReminder[] = [];
    const snoozed: EvaluatedReminder[] = [];

    for (const r of rawReminders) {
      const eventDate = new Date(r.eventDate);
      eventDate.setHours(0, 0, 0, 0);

      // Trigger date = eventDate - remindBeforeDays
      const triggerTime = eventDate.getTime() - r.remindBeforeDays * 24 * 60 * 60 * 1000;
      const triggerDateStr = new Date(triggerTime).toISOString().split('T')[0];

      const diffTime = eventDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isOverdue = daysRemaining < 0;

      const evaluated: EvaluatedReminder = {
        ...r,
        documentTitle: r.documentId ? docMap.get(r.documentId) || 'Document' : undefined,
        isOverdue,
        daysRemaining,
        triggerDate: triggerDateStr,
      };

      if (r.status === 'completed') {
        completed.push(evaluated);
      } else if (r.status === 'snoozed' && r.snoozedUntil && r.snoozedUntil > todayStr) {
        snoozed.push(evaluated);
      } else if (isOverdue) {
        overdue.push(evaluated);
      } else {
        upcoming.push(evaluated);
      }
    }

    // Sort upcoming by eventDate ascending
    upcoming.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    overdue.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    completed.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

    return { upcoming, overdue, completed, snoozed };
  }

  /**
   * Mark reminder as completed
   */
  static async completeReminder(reminderId: string): Promise<void> {
    await db.reminders.update(reminderId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Snooze reminder by X days
   */
  static async snoozeReminder(reminderId: string, days: number = 7): Promise<void> {
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + days);
    const snoozedUntil = snoozeDate.toISOString().split('T')[0];

    await db.reminders.update(reminderId, {
      status: 'snoozed',
      snoozedUntil,
    });
  }

  /**
   * Reactivate or undo completed reminder
   */
  static async reactivateReminder(reminderId: string): Promise<void> {
    await db.reminders.update(reminderId, {
      status: 'pending',
      completedAt: null,
      snoozedUntil: null,
    });
  }
}
