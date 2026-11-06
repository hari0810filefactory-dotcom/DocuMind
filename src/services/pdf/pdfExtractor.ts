// PDF Text & Metadata Extraction Service

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
    creationDate?: string;
  };
  hasSelectableText: boolean;
}

export class PdfExtractor {
  private static pdfjs: any = null;

  private static async getPdfJs(): Promise<any> {
    if (this.pdfjs) return this.pdfjs;

    try {
      const pdfjsLib = await import('pdfjs-dist');
      // Configure worker
      if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        // Point to unpkg or bundled worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
      }
      this.pdfjs = pdfjsLib;
      return pdfjsLib;
    } catch (err) {
      console.warn('PDF.js dynamic import error, using fallback reader:', err);
      return null;
    }
  }

  /**
   * Extract text from PDF buffer
   */
  static async extract(fileBuffer: ArrayBuffer): Promise<PdfExtractionResult> {
    try {
      const pdfjs = await this.getPdfJs();
      if (!pdfjs) {
        return this.fallbackBinaryTextScan(fileBuffer);
      }

      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(fileBuffer) });
      const doc = await loadingTask.promise;
      const pageCount = doc.numPages;
      const pageTexts: string[] = [];

      for (let i = 1; i <= Math.min(pageCount, 25); i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageString = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (pageString) {
          pageTexts.push(`--- Page ${i} ---\n${pageString}`);
        }
      }

      let metaDataObj: any = {};
      try {
        const meta = await doc.getMetadata();
        if (meta?.info) {
          metaDataObj = {
            title: meta.info.Title,
            author: meta.info.Author,
            creationDate: meta.info.CreationDate,
          };
        }
      } catch {
        // metadata read optional
      }

      const fullText = pageTexts.join('\n\n');
      const hasSelectableText = fullText.trim().length > 30;

      return {
        text: fullText,
        pageCount,
        metadata: metaDataObj,
        hasSelectableText,
      };
    } catch (err) {
      console.warn('PDF extraction failed with PDF.js, trying text decoder fallback:', err);
      return this.fallbackBinaryTextScan(fileBuffer);
    }
  }

  /**
   * Safe fallback text scan for PDF stream objects
   */
  private static fallbackBinaryTextScan(fileBuffer: ArrayBuffer): PdfExtractionResult {
    try {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const raw = decoder.decode(new Uint8Array(fileBuffer));
      // Extract plaintext segments inside parentheses (BT ... ET)
      const textMatches = raw.match(/\(([^()]{3,})\)\s*T[jJ]/g) || [];
      const extracted = textMatches
        .map((m) => m.replace(/^\(/, '').replace(/\)\s*T[jJ]$/, ''))
        .filter((t) => t.length > 2)
        .join(' ')
        .replace(/\\([()\\])/g, '$1');

      return {
        text: extracted.slice(0, 10000),
        pageCount: 1,
        hasSelectableText: extracted.trim().length > 20,
      };
    } catch {
      return {
        text: '',
        pageCount: 1,
        hasSelectableText: false,
      };
    }
  }

  /**
   * Render first page to Canvas for preview or OCR
   */
  static async renderPageToCanvas(
    fileBuffer: ArrayBuffer,
    pageNumber: number = 1
  ): Promise<HTMLCanvasElement | null> {
    try {
      const pdfjs = await this.getPdfJs();
      if (!pdfjs) return null;

      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(fileBuffer) });
      const doc = await loadingTask.promise;
      const page = await doc.getPage(pageNumber);

      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      return canvas;
    } catch (err) {
      console.warn('Failed to render PDF page to canvas:', err);
      return null;
    }
  }
}
