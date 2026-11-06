// Web Crypto AES-GCM & PBKDF2 Encryption Service

export class CryptoService {
  /**
   * Calculate SHA-256 checksum of an ArrayBuffer or Blob
   */
  static async calculateHash(data: ArrayBuffer | Blob): Promise<string> {
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate cryptographically secure random salt in hex
   */
  static generateSalt(): string {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    return Array.from(salt)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Derive an AES-GCM CryptoKey from a password and salt using PBKDF2
   */
  static async deriveKey(password: string, saltHex: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Create a verification hash from a password to confirm correctness without storing plaintext
   */
  static async createPasswordVerifier(password: string, saltHex: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await this.deriveKey(password, saltHex);
    const testData = enc.encode('DOCUMIND_VAULT_VERIFIER_STRING');
    const iv = new Uint8Array(12); // fixed iv for verifier
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, testData);
    return Array.from(new Uint8Array(encrypted))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Verify password against stored salt and verifier
   */
  static async verifyPassword(
    password: string,
    saltHex: string,
    expectedVerifier: string
  ): Promise<boolean> {
    try {
      const generated = await this.createPasswordVerifier(password, saltHex);
      return generated === expectedVerifier;
    } catch {
      return false;
    }
  }

  /**
   * Encrypt ArrayBuffer with AES-GCM
   */
  static async encryptBuffer(
    buffer: ArrayBuffer,
    key: CryptoKey
  ): Promise<{ encryptedBuffer: ArrayBuffer; ivHex: string }> {
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      buffer
    );

    const ivHex = Array.from(iv)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return { encryptedBuffer: encrypted, ivHex };
  }

  /**
   * Decrypt ArrayBuffer with AES-GCM
   */
  static async decryptBuffer(
    encryptedBuffer: ArrayBuffer,
    key: CryptoKey,
    ivHex: string
  ): Promise<ArrayBuffer> {
    const iv = new Uint8Array(
      ivHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encryptedBuffer
    );
  }

  /**
   * Encrypt text string with AES-GCM
   */
  static async encryptString(
    plainText: string,
    key: CryptoKey
  ): Promise<{ cipherHex: string; ivHex: string }> {
    const enc = new TextEncoder();
    const data = enc.encode(plainText);
    const { encryptedBuffer, ivHex } = await this.encryptBuffer(data.buffer as ArrayBuffer, key);
    const cipherHex = Array.from(new Uint8Array(encryptedBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return { cipherHex, ivHex };
  }

  /**
   * Decrypt text string with AES-GCM
   */
  static async decryptString(
    cipherHex: string,
    key: CryptoKey,
    ivHex: string
  ): Promise<string> {
    const rawCipher = new Uint8Array(
      cipherHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
    const decryptedBuffer = await this.decryptBuffer(rawCipher.buffer as ArrayBuffer, key, ivHex);
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  }
}
