/**
 * AES-256-GCM encryption utilities for sensitive data at rest
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, pbkdf2Sync } from 'crypto';

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
  saltLength?: number;
  tagLength?: number;
  iterations?: number;
}

/**
 * Default encryption configuration using AES-256-GCM
 */
const DEFAULT_CONFIG: Required<EncryptionConfig> = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits
  saltLength: 32, // 256 bits
  tagLength: 16, // 128 bits
  iterations: 100000, // PBKDF2 iterations
};

/**
 * Encryption service for sensitive data
 */
export class EncryptionService {
  private config: Required<EncryptionConfig>;

  /**
   * Create a new encryption service
   * @param config - Encryption configuration
   */
  constructor(config?: EncryptionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Derive encryption key from password using PBKDF2
   * @param password - Password or secret
   * @param salt - Salt for key derivation
   * @returns Derived key
   */
  deriveKey(password: string, salt: Buffer): Buffer {
    return pbkdf2Sync(
      password,
      salt,
      this.config.iterations,
      this.config.keyLength,
      'sha256'
    );
  }

  /**
   * Derive encryption key from password using scrypt (faster but memory-intensive)
   * @param password - Password or secret
   * @param salt - Salt for key derivation
   * @returns Derived key
   */
  deriveKeyScrypt(password: string, salt: Buffer | string): Buffer {
    return scryptSync(password, salt, this.config.keyLength);
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param plaintext - Data to encrypt (string or object)
   * @param key - Encryption key (32 bytes for AES-256)
   * @returns Encrypted data with IV and auth tag
   */
  encrypt(plaintext: string | object, key: Buffer): string {
    try {
      // Convert object to JSON if needed
      const data = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);

      // Generate random IV
      const iv = randomBytes(this.config.ivLength);

      // Create cipher
      const cipher = createCipheriv(this.config.algorithm, key, iv);

      // Encrypt
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = (cipher as any).getAuthTag();

      // Combine IV + auth tag + encrypted data
      // Format: [IV (32 hex chars)][Auth Tag (32 hex chars)][Encrypted Data]
      return iv.toString('hex') + authTag.toString('hex') + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Decrypt data encrypted with AES-256-GCM
   * @param ciphertext - Encrypted data with IV and auth tag
   * @param key - Decryption key (32 bytes for AES-256)
   * @returns Decrypted data
   */
  decrypt(ciphertext: string, key: Buffer): string {
    try {
      // Extract IV (first 32 hex chars = 16 bytes)
      const ivHex = ciphertext.slice(0, this.config.ivLength * 2);
      const iv = Buffer.from(ivHex, 'hex');

      // Extract auth tag (next 32 hex chars = 16 bytes)
      const authTagHex = ciphertext.slice(
        this.config.ivLength * 2,
        (this.config.ivLength + this.config.tagLength) * 2
      );
      const authTag = Buffer.from(authTagHex, 'hex');

      // Extract encrypted data
      const encrypted = ciphertext.slice((this.config.ivLength + this.config.tagLength) * 2);

      // Create decipher
      const decipher = createDecipheriv(this.config.algorithm, key, iv);
      (decipher as any).setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Encrypt and encode data with password-based encryption
   * @param plaintext - Data to encrypt
   * @param password - Password for encryption
   * @returns Base64-encoded encrypted data with salt
   */
  encryptWithPassword(plaintext: string | object, password: string): string {
    // Generate random salt
    const salt = randomBytes(this.config.saltLength);

    // Derive key from password
    const key = this.deriveKey(password, salt);

    // Encrypt data
    const encrypted = this.encrypt(plaintext, key);

    // Combine salt + encrypted data and encode as base64
    const combined = salt.toString('hex') + encrypted;
    return Buffer.from(combined, 'hex').toString('base64');
  }

  /**
   * Decrypt password-encrypted data
   * @param ciphertext - Base64-encoded encrypted data with salt
   * @param password - Password for decryption
   * @returns Decrypted data
   */
  decryptWithPassword(ciphertext: string, password: string): string {
    // Decode from base64
    const combined = Buffer.from(ciphertext, 'base64').toString('hex');

    // Extract salt (first 64 hex chars = 32 bytes)
    const saltHex = combined.slice(0, this.config.saltLength * 2);
    const salt = Buffer.from(saltHex, 'hex');

    // Extract encrypted data
    const encrypted = combined.slice(this.config.saltLength * 2);

    // Derive key from password
    const key = this.deriveKey(password, salt);

    // Decrypt data
    return this.decrypt(encrypted, key);
  }

  /**
   * Generate a random encryption key
   * @returns Random key buffer
   */
  generateKey(): Buffer {
    return randomBytes(this.config.keyLength);
  }

  /**
   * Generate a random salt
   * @returns Random salt buffer
   */
  generateSalt(): Buffer {
    return randomBytes(this.config.saltLength);
  }

  /**
   * Hash sensitive data (one-way)
   * @param data - Data to hash
   * @param salt - Optional salt
   * @returns Hashed data
   */
  hash(data: string, salt?: Buffer): string {
    const actualSalt = salt || randomBytes(this.config.saltLength);
    const hash = pbkdf2Sync(data, actualSalt, this.config.iterations, 64, 'sha512');
    return actualSalt.toString('hex') + hash.toString('hex');
  }

  /**
   * Verify hashed data
   * @param data - Original data
   * @param hashedData - Hashed data to verify against
   * @returns True if data matches hash
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      // Extract salt (first 64 hex chars = 32 bytes)
      const saltHex = hashedData.slice(0, this.config.saltLength * 2);
      const salt = Buffer.from(saltHex, 'hex');

      // Hash the input data with the same salt
      const newHash = this.hash(data, salt);

      // Constant-time comparison to prevent timing attacks
      return this.constantTimeEqual(hashedData, newHash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a - First string
   * @param b - Second string
   * @returns True if strings are equal
   */
  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

/**
 * Create a new encryption service instance
 * @param config - Optional encryption configuration
 * @returns Encryption service instance
 */
export function createEncryptionService(config?: EncryptionConfig): EncryptionService {
  return new EncryptionService(config);
}

/**
 * Singleton encryption service instance
 */
let defaultEncryptionService: EncryptionService | null = null;

/**
 * Get the default encryption service instance
 * @returns Default encryption service
 */
export function getEncryptionService(): EncryptionService {
  if (!defaultEncryptionService) {
    defaultEncryptionService = new EncryptionService();
  }
  return defaultEncryptionService;
}

/**
 * Quick encryption helper using default service
 * @param data - Data to encrypt
 * @param key - Encryption key
 * @returns Encrypted data
 */
export function encrypt(data: string | object, key: Buffer): string {
  return getEncryptionService().encrypt(data, key);
}

/**
 * Quick decryption helper using default service
 * @param ciphertext - Encrypted data
 * @param key - Decryption key
 * @returns Decrypted data
 */
export function decrypt(ciphertext: string, key: Buffer): string {
  return getEncryptionService().decrypt(ciphertext, key);
}

/**
 * Quick password-based encryption helper
 * @param data - Data to encrypt
 * @param password - Password
 * @returns Encrypted data
 */
export function encryptWithPassword(data: string | object, password: string): string {
  return getEncryptionService().encryptWithPassword(data, password);
}

/**
 * Quick password-based decryption helper
 * @param ciphertext - Encrypted data
 * @param password - Password
 * @returns Decrypted data
 */
export function decryptWithPassword(ciphertext: string, password: string): string {
  return getEncryptionService().decryptWithPassword(ciphertext, password);
}
