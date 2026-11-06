// Hybrid OPFS (Origin Private File System) and IndexedDB Blob File Storage

export class FileStorageService {
  private static opfsSupported: boolean | null = null;
  private static idbFallbackDb: IDBDatabase | null = null;

  /**
   * Check if Origin Private File System is available
   */
  static async isOpfsSupported(): Promise<boolean> {
    if (this.opfsSupported !== null) return this.opfsSupported;
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.getDirectory === 'function') {
        const root = await navigator.storage.getDirectory();
        this.opfsSupported = Boolean(root);
      } else {
        this.opfsSupported = false;
      }
    } catch {
      this.opfsSupported = false;
    }
    return this.opfsSupported;
  }

  /**
   * Initialize fallback IndexedDB blob database
   */
  private static async getIdb(): Promise<IDBDatabase> {
    if (this.idbFallbackDb) return this.idbFallbackDb;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('documind_files_vault', 1);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files');
        }
      };
      request.onsuccess = () => {
        this.idbFallbackDb = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save file to OPFS or IndexedDB fallback
   */
  static async saveFile(key: string, data: Blob | ArrayBuffer, mimeType?: string): Promise<void> {
    const isOpfs = await this.isOpfsSupported();
    const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;

    if (isOpfs) {
      try {
        const root = await navigator.storage.getDirectory();
        const docDir = await root.getDirectoryHandle('documind_files', { create: true });
        const fileHandle = await docDir.getFileHandle(key, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(arrayBuffer);
        await writable.close();
        return;
      } catch (err) {
        console.warn('OPFS save failed, falling back to IndexedDB:', err);
      }
    }

    // Fallback to IndexedDB
    const db = await this.getIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const blob = new Blob([arrayBuffer], { type: mimeType || 'application/octet-stream' });
      const req = store.put(blob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Read file from OPFS or IndexedDB
   */
  static async getFile(key: string, mimeType?: string): Promise<Blob | null> {
    const isOpfs = await this.isOpfsSupported();

    if (isOpfs) {
      try {
        const root = await navigator.storage.getDirectory();
        const docDir = await root.getDirectoryHandle('documind_files', { create: true });
        const fileHandle = await docDir.getFileHandle(key);
        const file = await fileHandle.getFile();
        if (mimeType && file.type !== mimeType) {
          return new Blob([await file.arrayBuffer()], { type: mimeType });
        }
        return file;
      } catch (err: any) {
        // If file not in OPFS, check fallback
      }
    }

    // Fallback to IndexedDB
    try {
      const db = await this.getIdb();
      return new Promise((resolve) => {
        const tx = db.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const req = store.get(key);
        req.onsuccess = () => {
          const result = req.result;
          if (result instanceof Blob) {
            if (mimeType && result.type !== mimeType) {
              resolve(new Blob([result], { type: mimeType }));
            } else {
              resolve(result);
            }
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Delete file from local storage
   */
  static async deleteFile(key: string): Promise<boolean> {
    let deleted = false;
    const isOpfs = await this.isOpfsSupported();

    if (isOpfs) {
      try {
        const root = await navigator.storage.getDirectory();
        const docDir = await root.getDirectoryHandle('documind_files', { create: false });
        await docDir.removeEntry(key);
        deleted = true;
      } catch {
        // file might not exist in OPFS
      }
    }

    try {
      const db = await this.getIdb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const req = store.delete(key);
        req.onsuccess = () => {
          deleted = true;
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }

    return deleted;
  }

  /**
   * Storage Quota and usage metrics
   */
  static async getStorageEstimate(): Promise<{
    usedBytes: number;
    quotaBytes: number;
    opfsActive: boolean;
  }> {
    const isOpfs = await this.isOpfsSupported();
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usedBytes: estimate.usage || 0,
        quotaBytes: estimate.quota || 0,
        opfsActive: isOpfs,
      };
    }
    return {
      usedBytes: 0,
      quotaBytes: 0,
      opfsActive: isOpfs,
    };
  }
}
