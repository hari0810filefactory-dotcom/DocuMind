// Local OCR Service with Tesseract.js and Web Worker Support

export interface OcrProgress {
  status: string;
  progress: number; // 0 to 1
}

export class OcrService {
  private static workerPromise: Promise<any> | null = null;
  private static activeWorker: any = null;

  /**
   * Run local OCR on image Blob or Canvas
   */
  static async recognizeImage(
    imageSource: Blob | HTMLCanvasElement | string,
    onProgress?: (progress: OcrProgress) => void,
    signal?: AbortSignal
  ): Promise<{ text: string; confidence: number }> {
    try {
      onProgress?.({ status: 'Initializing OCR engine...', progress: 0.1 });

      const Tesseract = await import('tesseract.js');
      if (signal?.aborted) throw new Error('OCR aborted by user');

      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m: any) => {
          if (m && typeof m.progress === 'number') {
            const normalized = Math.min(1, Math.max(0, m.progress));
            onProgress?.({
              status: m.status || 'Recognizing text...',
              progress: 0.1 + normalized * 0.85,
            });
          }
        },
      });

      this.activeWorker = worker;

      if (signal?.aborted) {
        await worker.terminate();
        throw new Error('OCR aborted by user');
      }

      onProgress?.({ status: 'Processing image text...', progress: 0.4 });
      const ret = await worker.recognize(imageSource);

      if (signal?.aborted) {
        await worker.terminate();
        throw new Error('OCR aborted by user');
      }

      onProgress?.({ status: 'Completing extraction...', progress: 1.0 });
      await worker.terminate();
      this.activeWorker = null;

      const text = ret.data.text.trim();
      const confidence = ret.data.confidence ? ret.data.confidence / 100 : 0.8;

      return {
        text,
        confidence,
      };
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        throw new Error('OCR processing was cancelled.');
      }
      console.warn('Tesseract OCR error:', err);
      throw new Error(`Local OCR processing failed: ${err.message || 'unknown error'}`);
    } finally {
      this.activeWorker = null;
    }
  }

  /**
   * Abort currently running OCR worker if any
   */
  static async cancelActive(): Promise<void> {
    if (this.activeWorker) {
      try {
        await this.activeWorker.terminate();
      } catch {
        // ignore
      }
      this.activeWorker = null;
    }
  }
}
