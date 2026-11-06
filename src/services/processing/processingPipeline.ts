// Comprehensive Local Document Processing Pipeline

import { db, logActivity } from '../database/db';
import { FileStorageService } from '../storage/fileStorage';
import { CryptoService } from '../encryption/crypto';
import { PdfExtractor } from '../pdf/pdfExtractor';
import { OcrService } from '../ocr/ocrService';
import { DocumentClassifier } from '../classification/classifier';
import { MetadataExtractor } from '../extraction/metadataExtractor';
import type {
  DocumentRecord,
  DocumentText,
  ProcessingJob,
  ProcessingStatus,
} from '../../types';

export interface FileValidationResult {
  valid: boolean;
  mimeType: string;
  detectedFormat: string;
  error?: string;
}

export class ProcessingPipeline {
  /**
   * Validate file signature (magic bytes)
   */
  static async validateFileSignature(file: File | Blob): Promise<FileValidationResult> {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PDF Magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return { valid: true, mimeType: 'application/pdf', detectedFormat: 'PDF' };
    }

    // PNG: 0x89 0x50 0x4E 0x47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { valid: true, mimeType: 'image/png', detectedFormat: 'PNG Image' };
    }

    // JPEG: 0xFF 0xD8 0xFF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { valid: true, mimeType: 'image/jpeg', detectedFormat: 'JPEG Image' };
    }

    const fileName = 'name' in file ? (file as File).name : '';

    // TXT check: file.type text/plain or valid ascii/utf-8 text
    if (file.type === 'text/plain' || fileName.endsWith('.txt')) {
      const hasNullBytes = bytes.some((b) => b === 0);
      if (!hasNullBytes) {
        return { valid: true, mimeType: 'text/plain', detectedFormat: 'Plain Text' };
      }
    }

    // DOCX (ZIP signature PK..: 0x50 0x4B 0x03 0x04)
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && (fileName.endsWith('.docx') || file.type.includes('word'))) {
      return {
        valid: true,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        detectedFormat: 'DOCX Document',
      };
    }

    // If filename has known extension and file has safe bytes
    if (fileName && fileName.match(/\.(pdf|png|jpe?g|txt)$/i)) {
      return {
        valid: true,
        mimeType: file.type || 'application/octet-stream',
        detectedFormat: fileName.split('.').pop()?.toUpperCase() || 'Binary',
      };
    }

    return {
      valid: false,
      mimeType: file.type || 'application/octet-stream',
      detectedFormat: 'Unknown / Unsupported',
      error: 'File signature does not match supported safe formats (PDF, PNG, JPG, TXT, DOCX).',
    };
  }

  /**
   * Upload and process a new document
   */
  static async processNewUpload(
    file: File,
    workspaceId: string,
    folderId: string | null = null,
    categoryId?: string,
    onProgress?: (stage: string, percent: number) => void
  ): Promise<{
    document: DocumentRecord;
    isDuplicate: boolean;
    existingDocumentTitle?: string;
  }> {
    onProgress?.('Validating file integrity...', 10);

    // 1. Signature validation
    const validation = await this.validateFileSignature(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file format.');
    }

    // 2. Hash calculation
    onProgress?.('Calculating cryptographic hash (SHA-256)...', 20);
    const fileBuffer = await file.arrayBuffer();
    const fileHash = await CryptoService.calculateHash(fileBuffer);

    // 3. Duplicate check within workspace
    const existing = await db.documents
      .where('workspaceId')
      .equals(workspaceId)
      .and((d) => d.fileHash === fileHash && !d.isDeleted)
      .first();

    const docId = crypto.randomUUID();
    const storageKey = `doc_${docId}_${Date.now()}`;

    // 4. Save file locally
    onProgress?.('Saving file to local encrypted vault...', 35);
    await FileStorageService.saveFile(storageKey, fileBuffer, validation.mimeType);

    // Initial category: either passed in or default category
    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId) {
      const firstCat = await db.categories.where('workspaceId').equals(workspaceId).first();
      resolvedCategoryId = firstCat?.id || 'default';
    }

    const newDoc: DocumentRecord = {
      id: docId,
      workspaceId,
      folderId,
      title: file.name.replace(/\.[^/.]+$/, ''),
      originalFileName: file.name,
      mimeType: validation.mimeType,
      fileSize: file.size,
      fileHash,
      storageKey,
      categoryId: resolvedCategoryId,
      documentType: 'Other',
      issueDate: null,
      expiryDate: null,
      processingStatus: 'processing',
      verificationStatus: 'unverified',
      isFavorite: false,
      isArchived: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      deletedAt: null,
    };

    // Save initial record to Dexie
    await db.documents.add(newDoc);
    await db.documentVersions.add({
      id: crypto.randomUUID(),
      documentId: docId,
      versionNumber: 1,
      storageKey,
      fileHash,
      fileSize: file.size,
      notes: 'Initial upload',
      createdAt: new Date().toISOString(),
    });

    await logActivity(workspaceId, 'user', 'Uploaded document', docId, file.name);

    // 5. Create processing job record
    const jobId = crypto.randomUUID();
    await db.processingJobs.add({
      id: jobId,
      documentId: docId,
      jobType: validation.mimeType === 'application/pdf' ? 'pdf_text_extraction' : 'ocr',
      status: 'processing',
      progress: 35,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 6. Asynchronous extraction pipeline
    this.runExtractionPipeline(newDoc, fileBuffer, jobId).catch((err) => {
      console.error('Async extraction error:', err);
    });

    return {
      document: newDoc,
      isDuplicate: Boolean(existing),
      existingDocumentTitle: existing?.title,
    };
  }

  /**
   * Run extraction pipeline (PDF text, OCR fallback, Classification, Candidate metadata)
   */
  private static async runExtractionPipeline(
    doc: DocumentRecord,
    fileBuffer: ArrayBuffer,
    jobId: string
  ): Promise<void> {
    try {
      let extractedText = '';
      let pageCount = 1;

      if (doc.mimeType === 'application/pdf') {
        await this.updateJobStatus(jobId, 'processing', 45, doc.id);
        const pdfResult = await PdfExtractor.extract(fileBuffer);
        extractedText = pdfResult.text;
        pageCount = pdfResult.pageCount;

        // Generate and save thumbnail for PDF
        try {
          const thumb = await PdfExtractor.generateThumbnail(fileBuffer, 240);
          if (thumb) {
            const thumbKey = `thumb_${doc.id}_${Date.now()}`;
            await FileStorageService.saveFile(thumbKey, thumb.blob, thumb.mimeType);
            await db.documents.update(doc.id, {
              thumbnailStorageKey: thumbKey,
              thumbnailMimeType: thumb.mimeType,
            });
          }
        } catch (thumbErr) {
          console.warn('Background thumbnail generation warning:', thumbErr);
        }

        // If PDF has no selectable text, attempt OCR on first page
        if (!pdfResult.hasSelectableText) {
          await this.updateJobStatus(jobId, 'ocr_in_progress', 60, doc.id);
          const canvas = await PdfExtractor.renderPageToCanvas(fileBuffer, 1);
          if (canvas) {
            try {
              const ocrResult = await OcrService.recognizeImage(canvas);
              extractedText = ocrResult.text;
            } catch (ocrErr) {
              console.warn('PDF page OCR fallback skipped:', ocrErr);
            }
          }
        }
      } else if (doc.mimeType.startsWith('image/')) {
        await this.updateJobStatus(jobId, 'ocr_in_progress', 55, doc.id);
        const blob = new Blob([fileBuffer], { type: doc.mimeType });
        const ocrResult = await OcrService.recognizeImage(blob);
        extractedText = ocrResult.text;
      } else if (doc.mimeType === 'text/plain') {
        const decoder = new TextDecoder();
        extractedText = decoder.decode(fileBuffer);
      }

      await this.updateJobStatus(jobId, 'extracting', 75, doc.id);

      // Save extracted text
      await db.documentText.put({
        id: crypto.randomUUID(),
        documentId: doc.id,
        extractedText,
        extractionStatus: extractedText.trim() ? 'success' : 'empty',
        pageCount,
      });

      // 7. Deterministic Classification
      const classification = DocumentClassifier.classify(doc.originalFileName, extractedText);

      // Find matching category by name if available
      const matchingCategory = await db.categories
        .where('workspaceId')
        .equals(doc.workspaceId)
        .filter((c) => c.name.toLowerCase() === classification.documentType.toLowerCase())
        .first();

      // 8. Deterministic Metadata Extraction
      const candidateFields = MetadataExtractor.extract(
        extractedText,
        classification.documentType,
        doc.id
      );

      // Save candidate fields (unverified by default)
      if (candidateFields.length > 0) {
        await db.documentFields.bulkAdd(candidateFields);
      }

      // Check for dates in fields to populate document issue/expiry dates
      const issueDateField = candidateFields.find((f) => f.fieldName === 'Issue Date');
      const expiryDateField = candidateFields.find((f) => f.fieldName === 'Expiry Date');

      // 9. Update document record with classification and review requirement
      await db.documents.update(doc.id, {
        documentType: classification.documentType,
        categoryId: matchingCategory?.id || doc.categoryId,
        issueDate: issueDateField?.fieldValue || null,
        expiryDate: expiryDateField?.fieldValue || null,
        processingStatus: 'review_required',
        updatedAt: new Date().toISOString(),
      });

      // 10. If an expiry date was detected, automatically create an upcoming reminder!
      if (expiryDateField?.fieldValue) {
        await db.reminders.add({
          id: crypto.randomUUID(),
          workspaceId: doc.workspaceId,
          documentId: doc.id,
          title: `Document Expiry: ${doc.title}`,
          eventDate: expiryDateField.fieldValue,
          remindBeforeDays: 30,
          status: 'pending',
          notes: 'Auto-scheduled from extracted expiry date.',
          completedAt: null,
          createdAt: new Date().toISOString(),
        });
      }

      await this.updateJobStatus(jobId, 'review_required', 100, doc.id);
    } catch (err: any) {
      console.error('Document processing failed:', err);
      await db.processingJobs.update(jobId, {
        status: 'failed',
        errorMessage: err.message || 'Processing failed',
        updatedAt: new Date().toISOString(),
      });
      await db.documents.update(doc.id, {
        processingStatus: 'failed',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  private static async updateJobStatus(
    jobId: string,
    status: ProcessingStatus,
    progress: number,
    documentId: string
  ): Promise<void> {
    await db.processingJobs.update(jobId, {
      status,
      progress,
      updatedAt: new Date().toISOString(),
    });
    await db.documents.update(documentId, {
      processingStatus: status,
      updatedAt: new Date().toISOString(),
    });
  }
}
