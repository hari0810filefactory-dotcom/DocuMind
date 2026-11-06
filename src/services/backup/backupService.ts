// Workspace Backup & Restore Service with JSZip & AES-GCM Encryption

import JSZip from 'jszip';
import { db, logActivity } from '../database/db';
import { FileStorageService } from '../storage/fileStorage';
import { CryptoService } from '../encryption/crypto';
import type { BackupRecord } from '../../types';

export interface BackupManifest {
  version: number;
  appName: string;
  createdAt: string;
  workspaceId: string;
  workspaceName: string;
  documentCount: number;
  files: {
    storageKey: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    fileHash: string;
  }[];
}

export class BackupService {
  /**
   * Export complete workspace archive (ZIP or encrypted package)
   */
  static async exportWorkspace(
    workspaceId: string,
    password?: string
  ): Promise<{ blob: Blob; fileName: string; checksum: string }> {
    const zip = new JSZip();

    // 1. Gather all workspace database records
    const workspace = await db.workspaces.get(workspaceId);
    const documents = await db.documents.where('workspaceId').equals(workspaceId).toArray();
    const categories = await db.categories.where('workspaceId').equals(workspaceId).toArray();
    const tags = await db.tags.where('workspaceId').equals(workspaceId).toArray();
    const reminders = await db.reminders.where('workspaceId').equals(workspaceId).toArray();
    const relationships = await db.relationships.where('workspaceId').equals(workspaceId).toArray();
    const members = await db.workspaceMembers.where('workspaceId').equals(workspaceId).toArray();

    const docIds = documents.map((d) => d.id);
    const textRecords = await db.documentText.where('documentId').anyOf(docIds).toArray();
    const fieldRecords = await db.documentFields.where('documentId').anyOf(docIds).toArray();
    const versionRecords = await db.documentVersions.where('documentId').anyOf(docIds).toArray();
    const docTags = await db.documentTags.where('documentId').anyOf(docIds).toArray();

    // 2. Package actual file binaries from storage
    const filesFolder = zip.folder('files');
    const manifestFiles: BackupManifest['files'] = [];

    for (const doc of documents) {
      const fileBlob = await FileStorageService.getFile(doc.storageKey, doc.mimeType);
      if (fileBlob && filesFolder) {
        const buffer = await fileBlob.arrayBuffer();
        filesFolder.file(doc.storageKey, buffer);
        manifestFiles.push({
          storageKey: doc.storageKey,
          originalFileName: doc.originalFileName,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          fileHash: doc.fileHash,
        });
      }
    }

    const manifest: BackupManifest = {
      version: 1,
      appName: 'DocuMind',
      createdAt: new Date().toISOString(),
      workspaceId,
      workspaceName: workspace?.name || 'DocuMind Workspace',
      documentCount: documents.length,
      files: manifestFiles,
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file(
      'database.json',
      JSON.stringify(
        {
          workspace,
          documents,
          categories,
          tags,
          docTags,
          textRecords,
          fieldRecords,
          versionRecords,
          reminders,
          relationships,
          members,
        },
        null,
        2
      )
    );

    const rawZipBuffer = await zip.generateAsync({
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    let finalBlob: Blob;
    let fileName: string;
    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (password && password.trim().length > 0) {
      // Encrypt package with AES-GCM
      const saltHex = CryptoService.generateSalt();
      const cryptoKey = await CryptoService.deriveKey(password, saltHex);
      const { encryptedBuffer, ivHex } = await CryptoService.encryptBuffer(rawZipBuffer, cryptoKey);

      // Package into encrypted envelope
      const envelope = {
        documindEncryptedBackup: true,
        version: 1,
        saltHex,
        ivHex,
        payloadBase64: this.arrayBufferToBase64(encryptedBuffer),
      };

      const envelopeStr = JSON.stringify(envelope);
      finalBlob = new Blob([envelopeStr], { type: 'application/json' });
      fileName = `documind-backup-${dateStamp}.dmbackup`;
    } else {
      finalBlob = new Blob([rawZipBuffer], { type: 'application/zip' });
      fileName = `documind-backup-${dateStamp}.zip`;
    }

    const checksum = await CryptoService.calculateHash(finalBlob);

    // Save backup history record
    const backupRecord: BackupRecord = {
      id: crypto.randomUUID(),
      workspaceId,
      createdAt: new Date().toISOString(),
      fileName,
      checksum,
      documentCount: documents.length,
      sizeBytes: finalBlob.size,
      isEncrypted: Boolean(password && password.trim().length > 0),
      status: 'completed',
    };
    await db.backups.add(backupRecord);

    await logActivity(workspaceId, 'user', 'Exported workspace backup', backupRecord.id, fileName);

    return { blob: finalBlob, fileName, checksum };
  }

  /**
   * Inspect and preview backup file before restoring
   */
  static async previewBackup(
    file: File,
    password?: string
  ): Promise<{
    isEncrypted: boolean;
    manifest?: BackupManifest;
    database?: any;
    zipInstance?: JSZip;
    error?: string;
  }> {
    try {
      const textSample = await file.slice(0, 2048).text();
      let zipBuffer: ArrayBuffer;

      if (textSample.includes('documindEncryptedBackup')) {
        // Encrypted envelope
        if (!password) {
          return {
            isEncrypted: true,
            error: 'This backup is encrypted. Please provide the backup password.',
          };
        }

        const fullJsonText = await file.text();
        const envelope = JSON.parse(fullJsonText);
        if (!envelope.saltHex || !envelope.ivHex || !envelope.payloadBase64) {
          return { isEncrypted: true, error: 'Malformed encrypted backup envelope.' };
        }

        try {
          const cryptoKey = await CryptoService.deriveKey(password, envelope.saltHex);
          const encryptedBytes = this.base64ToArrayBuffer(envelope.payloadBase64);
          zipBuffer = await CryptoService.decryptBuffer(encryptedBytes, cryptoKey, envelope.ivHex);
        } catch {
          return { isEncrypted: true, error: 'Incorrect password or corrupted backup file.' };
        }
      } else {
        zipBuffer = await file.arrayBuffer();
      }

      const zip = await JSZip.loadAsync(zipBuffer);
      const manifestFile = zip.file('manifest.json');
      const dbFile = zip.file('database.json');

      if (!manifestFile || !dbFile) {
        return { isEncrypted: false, error: 'Invalid backup: missing manifest or database files.' };
      }

      const manifest: BackupManifest = JSON.parse(await manifestFile.async('text'));
      const database = JSON.parse(await dbFile.async('text'));

      return {
        isEncrypted: false,
        manifest,
        database,
        zipInstance: zip,
      };
    } catch (err: any) {
      return { isEncrypted: false, error: `Failed to inspect backup: ${err.message || 'Corrupted file'}` };
    }
  }

  /**
   * Restore workspace data and files safely
   */
  static async restore(
    previewData: { manifest: BackupManifest; database: any; zipInstance: JSZip },
    targetWorkspaceId: string,
    mode: 'merge' | 'clean'
  ): Promise<{ restoredDocs: number; skippedDuplicates: number }> {
    const { manifest, database, zipInstance } = previewData;
    let restoredDocs = 0;
    let skippedDuplicates = 0;

    const filesFolder = zipInstance.folder('files');

    for (const doc of database.documents || []) {
      // Check for duplicate in target workspace
      const existing = await db.documents
        .where('workspaceId')
        .equals(targetWorkspaceId)
        .and((d) => d.fileHash === doc.fileHash && !d.isDeleted)
        .first();

      if (existing && mode === 'merge') {
        skippedDuplicates++;
        continue;
      }

      // Restore file binary
      if (filesFolder) {
        const fileInZip = filesFolder.file(doc.storageKey);
        if (fileInZip) {
          const fileBytes = await fileInZip.async('arraybuffer');
          await FileStorageService.saveFile(doc.storageKey, fileBytes, doc.mimeType);
        }
      }

      // Restore document record mapped to targetWorkspaceId
      const restoredDoc = {
        ...doc,
        workspaceId: targetWorkspaceId,
      };
      await db.documents.put(restoredDoc);
      restoredDocs++;
    }

    // Restore text and fields
    for (const t of database.textRecords || []) {
      await db.documentText.put(t);
    }
    for (const f of database.fieldRecords || []) {
      await db.documentFields.put(f);
    }
    for (const v of database.versionRecords || []) {
      await db.documentVersions.put(v);
    }
    for (const dt of database.docTags || []) {
      await db.documentTags.put(dt);
    }

    // Restore categories (if not already existing)
    for (const cat of database.categories || []) {
      const exists = await db.categories
        .where('workspaceId')
        .equals(targetWorkspaceId)
        .filter((c) => c.name.toLowerCase() === cat.name.toLowerCase())
        .first();
      if (!exists) {
        await db.categories.put({ ...cat, workspaceId: targetWorkspaceId });
      }
    }

    // Restore reminders
    for (const r of database.reminders || []) {
      await db.reminders.put({ ...r, workspaceId: targetWorkspaceId });
    }

    // Restore relationships
    for (const rel of database.relationships || []) {
      await db.relationships.put({ ...rel, workspaceId: targetWorkspaceId });
    }

    await logActivity(
      targetWorkspaceId,
      'user',
      'Restored workspace backup',
      targetWorkspaceId,
      `Restored ${restoredDocs} documents (${skippedDuplicates} duplicates skipped)`
    );

    return { restoredDocs, skippedDuplicates };
  }

  /**
   * Export only selected documents and their metadata to a ZIP file
   */
  static async exportSelectedDocumentsZip(
    workspaceId: string,
    docIds: string[]
  ): Promise<{ blob: Blob; fileName: string; count: number }> {
    const zip = new JSZip();
    const documents = await db.documents
      .where('id')
      .anyOf(docIds)
      .and((d) => d.workspaceId === workspaceId)
      .toArray();

    if (documents.length === 0) {
      throw new Error('No documents found for selected IDs.');
    }

    const categories = await db.categories.where('workspaceId').equals(workspaceId).toArray();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const textRecords = await db.documentText.where('documentId').anyOf(docIds).toArray();
    const fieldRecords = await db.documentFields.where('documentId').anyOf(docIds).toArray();
    const versionRecords = await db.documentVersions.where('documentId').anyOf(docIds).toArray();
    const docTags = await db.documentTags.where('documentId').anyOf(docIds).toArray();

    const filesFolder = zip.folder('files');
    const exportedFiles: any[] = [];

    for (const doc of documents) {
      const fileBlob = await FileStorageService.getFile(doc.storageKey, doc.mimeType);
      if (fileBlob && filesFolder) {
        const buffer = await fileBlob.arrayBuffer();
        // Use sanitized original filename or storage key to avoid collisions
        const safeName = `${doc.id.slice(0, 8)}_${doc.originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        filesFolder.file(safeName, buffer);
        exportedFiles.push({
          id: doc.id,
          title: doc.title,
          originalFileName: doc.originalFileName,
          archivePath: `files/${safeName}`,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          fileHash: doc.fileHash,
          category: catMap.get(doc.categoryId) || 'Other',
          documentType: doc.documentType,
          issueDate: doc.issueDate,
          expiryDate: doc.expiryDate,
        });
      }
    }

    const manifest = {
      version: 1,
      appName: 'DocuMind',
      exportType: 'batch_selection',
      exportedAt: new Date().toISOString(),
      workspaceId,
      documentCount: documents.length,
      documents: exportedFiles,
      textRecords,
      fieldRecords,
      versionRecords,
      docTags,
    };

    zip.file('metadata.json', JSON.stringify(manifest, null, 2));

    const zipBuffer = await zip.generateAsync({
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `documind-selection-${documents.length}-docs-${dateStamp}.zip`;
    const blob = new Blob([zipBuffer], { type: 'application/zip' });

    await logActivity(
      workspaceId,
      'user',
      'Exported batch selected documents',
      workspaceId,
      `Exported ${documents.length} document(s)`
    );

    return { blob, fileName, count: documents.length };
  }

  /**
   * Export all raw document files in original names into a ZIP
   */
  static async exportRawFilesZip(
    workspaceId: string
  ): Promise<{ blob: Blob; fileName: string; count: number }> {
    const zip = new JSZip();
    const documents = await db.documents
      .where('workspaceId')
      .equals(workspaceId)
      .and((d) => !d.isDeleted)
      .toArray();

    let packedCount = 0;
    for (const doc of documents) {
      const fileBlob = await FileStorageService.getFile(doc.storageKey, doc.mimeType);
      if (fileBlob) {
        const buffer = await fileBlob.arrayBuffer();
        const safeName = `${doc.id.slice(0, 6)}_${doc.originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        zip.file(safeName, buffer);
        packedCount++;
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `documind-raw-files-${dateStamp}.zip`;
    const blob = new Blob([zipBuffer], { type: 'application/zip' });

    return { blob, fileName, count: packedCount };
  }

  /**
   * Export metadata as CSV
   */
  static async exportMetadataCsv(workspaceId: string): Promise<string> {
    const docs = await db.documents.where('workspaceId').equals(workspaceId).toArray();
    const categories = await db.categories.where('workspaceId').equals(workspaceId).toArray();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const headers = [
      'ID',
      'Title',
      'Original FileName',
      'Document Type',
      'Category',
      'Issue Date',
      'Expiry Date',
      'File Size (Bytes)',
      'SHA256 Hash',
      'Verification Status',
      'Created At',
    ];

    const rows = docs.map((d) => [
      `"${d.id}"`,
      `"${d.title.replace(/"/g, '""')}"`,
      `"${d.originalFileName.replace(/"/g, '""')}"`,
      `"${d.documentType}"`,
      `"${catMap.get(d.categoryId) || 'Other'}"`,
      `"${d.issueDate || ''}"`,
      `"${d.expiryDate || ''}"`,
      d.fileSize,
      `"${d.fileHash}"`,
      `"${d.verificationStatus}"`,
      `"${d.createdAt}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Export metadata as JSON
   */
  static async exportMetadataJson(workspaceId: string): Promise<string> {
    const docs = await db.documents.where('workspaceId').equals(workspaceId).toArray();
    const docIds = docs.map((d) => d.id);
    const fields = await db.documentFields.where('documentId').anyOf(docIds).toArray();
    const textRecords = await db.documentText.where('documentId').anyOf(docIds).toArray();
    const categories = await db.categories.where('workspaceId').equals(workspaceId).toArray();
    const reminders = await db.reminders.where('workspaceId').equals(workspaceId).toArray();
    const relationships = await db.relationships.where('workspaceId').equals(workspaceId).toArray();

    return JSON.stringify(
      {
        appName: 'DocuMind',
        version: 1,
        exportedAt: new Date().toISOString(),
        workspaceId,
        summary: {
          totalDocuments: docs.length,
          categoriesCount: categories.length,
          remindersCount: reminders.length,
        },
        documents: docs,
        categories,
        fields,
        textRecords,
        reminders,
        relationships,
      },
      null,
      2
    );
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
