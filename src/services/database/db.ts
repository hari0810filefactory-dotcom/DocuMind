import Dexie, { type Table } from 'dexie';
import type {
  User,
  Workspace,
  WorkspaceMember,
  Folder,
  DocumentRecord,
  DocumentVersion,
  DocumentText,
  DocumentField,
  Category,
  Tag,
  DocumentTag,
  Reminder,
  Relationship,
  ProcessingJob,
  ActivityLog,
  SettingItem,
  BackupRecord,
} from '../../types';

export class DocuMindDatabase extends Dexie {
  users!: Table<User, string>;
  workspaces!: Table<Workspace, string>;
  workspaceMembers!: Table<WorkspaceMember, string>;
  folders!: Table<Folder, string>;
  documents!: Table<DocumentRecord, string>;
  documentVersions!: Table<DocumentVersion, string>;
  documentText!: Table<DocumentText, string>;
  documentFields!: Table<DocumentField, string>;
  categories!: Table<Category, string>;
  tags!: Table<Tag, string>;
  documentTags!: Table<DocumentTag, string>;
  reminders!: Table<Reminder, string>;
  relationships!: Table<Relationship, string>;
  processingJobs!: Table<ProcessingJob, string>;
  activityLogs!: Table<ActivityLog, string>;
  settings!: Table<SettingItem, string>;
  backups!: Table<BackupRecord, string>;

  constructor() {
    super('DocuMindDB');

    // Schema version 1 with indexed query fields
    this.version(1).stores({
      users: 'id, displayName, createdAt',
      workspaces: 'id, name, type, createdAt, updatedAt',
      workspaceMembers: 'id, workspaceId, userId, role, [workspaceId+userId]',
      folders: 'id, workspaceId, parentId, name, createdAt, [workspaceId+parentId]',
      documents:
        'id, workspaceId, folderId, categoryId, documentType, fileHash, processingStatus, verificationStatus, isFavorite, isArchived, isDeleted, issueDate, expiryDate, createdAt, updatedAt, [workspaceId+isDeleted], [workspaceId+categoryId]',
      documentVersions: 'id, documentId, versionNumber, fileHash, createdAt',
      documentText: 'id, documentId, extractionStatus',
      documentFields: 'id, documentId, fieldName, verificationStatus, [documentId+fieldName]',
      categories: 'id, workspaceId, name, [workspaceId+name]',
      tags: 'id, workspaceId, name, [workspaceId+name]',
      documentTags: 'id, documentId, tagId, [documentId+tagId]',
      reminders: 'id, workspaceId, documentId, eventDate, status, [workspaceId+status]',
      relationships:
        'id, workspaceId, sourceDocumentId, targetDocumentId, relationshipType, [workspaceId+sourceDocumentId], [workspaceId+targetDocumentId]',
      processingJobs: 'id, documentId, jobType, status, createdAt',
      activityLogs: 'id, workspaceId, userId, action, targetId, timestamp',
      settings: 'id, workspaceId, key, [workspaceId+key]',
      backups: 'id, workspaceId, createdAt, status',
    });
  }
}

export const db = new DocuMindDatabase();

// Default Categories list
export const DEFAULT_CATEGORIES = [
  { name: 'Identity', color: '#3b82f6', icon: 'User' },
  { name: 'Education', color: '#8b5cf6', icon: 'GraduationCap' },
  { name: 'Employment', color: '#06b6d4', icon: 'Briefcase' },
  { name: 'Finance', color: '#10b981', icon: 'DollarSign' },
  { name: 'Insurance', color: '#f59e0b', icon: 'Shield' },
  { name: 'Property', color: '#ec4899', icon: 'Home' },
  { name: 'Vehicle', color: '#6366f1', icon: 'Car' },
  { name: 'Business', color: '#14b8a6', icon: 'Building2' },
  { name: 'Other', color: '#64748b', icon: 'FileText' },
];

/**
 * Initialize workspace defaults (Categories, Admin user, Default Workspace)
 */
export async function initializeWorkspaceDefaults(workspaceId: string, userId: string): Promise<void> {
  const existingCategories = await db.categories.where('workspaceId').equals(workspaceId).count();
  if (existingCategories === 0) {
    const categoryEntries: Category[] = DEFAULT_CATEGORIES.map((cat) => ({
      id: crypto.randomUUID(),
      workspaceId,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
    }));
    await db.categories.bulkAdd(categoryEntries);
  }
}

/**
 * Log activity in local audit trail
 */
export async function logActivity(
  workspaceId: string,
  userId: string,
  action: string,
  targetId: string,
  details?: string
): Promise<void> {
  try {
    await db.activityLogs.add({
      id: crypto.randomUUID(),
      workspaceId,
      userId,
      action,
      targetId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
