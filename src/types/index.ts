// DocuMind Core Data Models & TypeScript Interfaces

export type WorkspaceType = 'personal' | 'household' | 'business';
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface User {
  id: string;
  displayName: string;
  email?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  email?: string;
  role: MemberRole;
  joinedAt: string;
}

export interface Folder {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
}

export type DocumentType =
  | 'Identity document'
  | 'Education certificate'
  | 'Employment document'
  | 'Invoice'
  | 'Receipt'
  | 'Insurance policy'
  | 'Vehicle document'
  | 'Property document'
  | 'Contract'
  | 'Business licence'
  | 'Tax document'
  | 'Medical document'
  | 'Other';

export type ProcessingStatus =
  | 'queued'
  | 'processing'
  | 'ocr_in_progress'
  | 'extracting'
  | 'review_required'
  | 'completed'
  | 'failed';

export type VerificationStatus = 'unverified' | 'partially_verified' | 'verified';

export interface DocumentRecord {
  id: string;
  workspaceId: string;
  folderId: string | null;
  title: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number; // in bytes
  fileHash: string; // SHA-256 hex
  storageKey: string; // Key in OPFS / IndexedDB blob store
  categoryId: string;
  documentType: DocumentType;
  issueDate: string | null; // YYYY-MM-DD
  expiryDate: string | null; // YYYY-MM-DD
  processingStatus: ProcessingStatus;
  verificationStatus: VerificationStatus;
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean; // In trash
  isFlagged?: boolean; // Flagged for follow-up
  flaggedAt?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  storageKey: string;
  fileHash: string;
  fileSize: number;
  notes?: string;
  createdAt: string;
}

export interface DocumentText {
  id: string;
  documentId: string;
  extractedText: string;
  extractionStatus: 'pending' | 'success' | 'failed' | 'empty';
  language?: string;
  pageCount?: number;
}

export interface DocumentField {
  id: string;
  documentId: string;
  fieldName: string;
  fieldValue: string;
  confidence: number; // 0 to 1
  sourcePage?: number;
  verificationStatus: 'unverified' | 'verified' | 'rejected';
  updatedAt: string;
}

export interface Category {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  icon?: string;
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
}

export interface DocumentTag {
  id: string;
  documentId: string;
  tagId: string;
}

export type ReminderStatus = 'pending' | 'snoozed' | 'completed' | 'cancelled';

export interface Reminder {
  id: string;
  documentId: string | null;
  workspaceId: string;
  title: string;
  eventDate: string; // YYYY-MM-DD
  remindBeforeDays: number; // e.g. 30, 14, 7, 1
  status: ReminderStatus;
  notes?: string;
  snoozedUntil?: string | null;
  completedAt: string | null;
  createdAt: string;
}

export type RelationshipType =
  | 'invoice_belongs_to_asset'
  | 'warranty_belongs_to_purchase'
  | 'insurance_covers_asset'
  | 'contract_relates_to_org'
  | 'renewal_replaces_previous'
  | 'certificate_supports_application'
  | 'custom_relation';

export interface Relationship {
  id: string;
  workspaceId: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  relationshipType: RelationshipType;
  customDescription?: string;
  createdAt: string;
}

export interface ProcessingJob {
  id: string;
  documentId: string;
  jobType: 'pdf_text_extraction' | 'ocr' | 'classification' | 'metadata_extraction';
  status: ProcessingStatus;
  progress: number; // 0 - 100
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  targetId: string;
  details?: string;
  timestamp: string;
}

export interface SettingItem {
  id: string;
  workspaceId: string;
  key: string;
  value: string;
}

export interface BackupRecord {
  id: string;
  workspaceId: string;
  createdAt: string;
  fileName: string;
  checksum: string;
  documentCount: number;
  sizeBytes: number;
  isEncrypted: boolean;
  status: 'completed' | 'failed';
}

export interface VaultSecurityConfig {
  isPasswordSet: boolean;
  autoLockMinutes: number; // 0 means never
  saltHex?: string;
  passwordVerifier?: string; // Derived hash used to check password correctness
}

export interface DocumentHealthScore {
  score: number; // 0 - 100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  totalDocuments: number;
  expiredCount: number;
  expiringCount: number; // within 30 days
  unverifiedCount: number;
  missingDatesCount: number;
  unclassifiedCount: number;
  breakdown: {
    label: string;
    weight: number;
    pointsEarned: number;
    description: string;
  }[];
}
