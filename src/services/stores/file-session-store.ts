/**
 * File-based session storage with AES-256-GCM encryption
 * Suitable for single-instance production deployments
 */

import type { ISessionStore, SessionData } from '../../types/session.js';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * File session store configuration
 */
export interface FileSessionStoreConfig {
  storageDir: string;
  encryptionKey: string;
}

/**
 * Encrypted file-based session store
 */
export class FileSessionStore implements ISessionStore {
  private storageDir: string;
  private encryptionKey: Buffer;
  private userSessionIndex: Map<string, Set<string>> = new Map();
  private sessionIndex: Set<string> = new Set();

  /**
   * Create a new FileSessionStore
   * @param config - Configuration object
   */
  constructor(config: FileSessionStoreConfig) {
    if (config.encryptionKey.length < 32) {
      throw new Error('Encryption secret must be at least 32 characters');
    }

    this.storageDir = config.storageDir;

    // Derive encryption key using scrypt
    this.encryptionKey = scryptSync(config.encryptionKey, 'salt', 32);

    // Initialize storage
    this.initialize();
  }

  /**
   * Initialize storage directory
   */
  private async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });

      // Load existing sessions into index
      await this.rebuildIndex();
    } catch (error) {
      console.error('[FileSessionStore] Initialization failed:', error);
      throw new Error(`Failed to initialize file session store: ${error}`);
    }
  }

  /**
   * Rebuild session index from disk
   */
  private async rebuildIndex(): Promise<void> {
    try {
      const files = await fs.readdir(this.storageDir);

      for (const file of files) {
        if (file.endsWith('.session')) {
          const sessionId = file.replace('.session', '');
          const session = await this.get(sessionId);

          if (session) {
            this.sessionIndex.add(sessionId);

            const userId = session.userContext.userId;
            if (!this.userSessionIndex.has(userId)) {
              this.userSessionIndex.set(userId, new Set());
            }
            this.userSessionIndex.get(userId)!.add(sessionId);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist yet, ignore
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Create a new session
   * @param sessionData - Session data to store
   * @returns Session ID
   */
  async create(sessionData: SessionData): Promise<string> {
    try {
      const sessionId = sessionData.sessionId;
      await this.writeSession(sessionId, sessionData);

      // Update indexes
      this.sessionIndex.add(sessionId);
      const userId = sessionData.userContext.userId;
      if (!this.userSessionIndex.has(userId)) {
        this.userSessionIndex.set(userId, new Set());
      }
      this.userSessionIndex.get(userId)!.add(sessionId);

      return sessionId;
    } catch (error) {
      console.error('[FileSessionStore] Session creation failed:', error);
      throw new Error(`Failed to create session: ${error}`);
    }
  }

  /**
   * Get session by ID
   * @param sessionId - Session ID
   * @returns Session data or null if not found
   */
  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const session = await this.readSession(sessionId);

      if (!session) {
        return null;
      }

      // Check if expired
      if (Date.now() >= session.expiresAt) {
        await this.delete(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      // File not found
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.error('[FileSessionStore] Session read failed:', error);
      throw new Error(`Failed to get session: ${error}`);
    }
  }

  /**
   * Update existing session
   * @param sessionId - Session ID
   * @param updates - Partial session data to update
   */
  async update(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    try {
      const existing = await this.readSession(sessionId);

      if (!existing) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Merge updates
      const updated: SessionData = {
        ...existing,
        ...updates,
        userContext: updates.userContext
          ? { ...existing.userContext, ...updates.userContext }
          : existing.userContext,
        tokenMetadata: updates.tokenMetadata
          ? { ...existing.tokenMetadata, ...updates.tokenMetadata }
          : existing.tokenMetadata,
        security: updates.security
          ? { ...existing.security, ...updates.security }
          : existing.security,
      };

      await this.writeSession(sessionId, updated);

      // Update user index if userId changed
      if (updates.userContext?.userId && updates.userContext.userId !== existing.userContext.userId) {
        const oldUserId = existing.userContext.userId;
        const oldUserSessions = this.userSessionIndex.get(oldUserId);
        if (oldUserSessions) {
          oldUserSessions.delete(sessionId);
          if (oldUserSessions.size === 0) {
            this.userSessionIndex.delete(oldUserId);
          }
        }

        const newUserId = updates.userContext.userId;
        if (!this.userSessionIndex.has(newUserId)) {
          this.userSessionIndex.set(newUserId, new Set());
        }
        this.userSessionIndex.get(newUserId)!.add(sessionId);
      }
    } catch (error) {
      console.error('[FileSessionStore] Session update failed:', error);
      throw new Error(`Failed to update session: ${error}`);
    }
  }

  /**
   * Delete session by ID
   * @param sessionId - Session ID
   */
  async delete(sessionId: string): Promise<void> {
    try {
      const session = await this.readSession(sessionId);

      if (session) {
        // Remove from user index
        const userId = session.userContext.userId;
        const userSessions = this.userSessionIndex.get(userId);
        if (userSessions) {
          userSessions.delete(sessionId);
          if (userSessions.size === 0) {
            this.userSessionIndex.delete(userId);
          }
        }
      }

      // Remove from session index
      this.sessionIndex.delete(sessionId);

      // Delete file
      const filePath = this.getFilePath(sessionId);
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[FileSessionStore] Session deletion failed:', error);
        throw new Error(`Failed to delete session: ${error}`);
      }
    }
  }

  /**
   * Clean up expired sessions
   * @returns Number of sessions cleaned up
   */
  async cleanup(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    for (const sessionId of Array.from(this.sessionIndex)) {
      try {
        const session = await this.readSession(sessionId);

        if (session && now >= session.expiresAt) {
          await this.delete(sessionId);
          cleanedCount++;
        }
      } catch (error) {
        console.error(`[FileSessionStore] Cleanup error for session ${sessionId}:`, error);
      }
    }

    return cleanedCount;
  }

  /**
   * Get all active sessions for a user
   * @param userId - User ID
   * @returns Array of session data
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessionIds = this.userSessionIndex.get(userId);

    if (!sessionIds || sessionIds.size === 0) {
      return [];
    }

    const sessions: SessionData[] = [];
    const now = Date.now();

    for (const sessionId of sessionIds) {
      try {
        const session = await this.readSession(sessionId);
        if (session && now < session.expiresAt) {
          sessions.push(session);
        }
      } catch (error) {
        console.error(`[FileSessionStore] Error reading session ${sessionId}:`, error);
      }
    }

    return sessions;
  }

  /**
   * Get session count
   * @returns Total number of active sessions
   */
  async getSessionCount(): Promise<number> {
    return this.sessionIndex.size;
  }

  /**
   * Encrypt session data
   * @param data - Session data to encrypt
   * @returns Encrypted data
   */
  private encrypt(data: SessionData): string {
    try {
      // Generate IV
      const iv = randomBytes(16);

      // Create cipher
      const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

      // Encrypt
      const jsonData = JSON.stringify(data);
      let encrypted = cipher.update(jsonData, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Combine IV + authTag + encrypted data
      return iv.toString('hex') + authTag.toString('hex') + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt session data
   * @param encryptedData - Encrypted data
   * @returns Decrypted session data
   */
  private decrypt(encryptedData: string): SessionData {
    try {
      // Extract IV (first 32 hex chars = 16 bytes)
      const iv = Buffer.from(encryptedData.slice(0, 32), 'hex');

      // Extract auth tag (next 32 hex chars = 16 bytes)
      const authTag = Buffer.from(encryptedData.slice(32, 64), 'hex');

      // Extract encrypted data
      const encrypted = encryptedData.slice(64);

      // Create decipher
      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Write session to file (atomic operation)
   * @param sessionId - Session ID
   * @param sessionData - Session data
   */
  private async writeSession(sessionId: string, sessionData: SessionData): Promise<void> {
    const filePath = this.getFilePath(sessionId);
    const tempFilePath = `${filePath}.tmp`;

    try {
      // Encrypt data
      const encrypted = this.encrypt(sessionData);

      // Write to temp file
      await fs.writeFile(tempFilePath, encrypted, 'utf8');

      // Atomic rename
      await fs.rename(tempFilePath, filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Read session from file
   * @param sessionId - Session ID
   * @returns Session data or null
   */
  private async readSession(sessionId: string): Promise<SessionData | null> {
    const filePath = this.getFilePath(sessionId);

    try {
      const encrypted = await fs.readFile(filePath, 'utf8');
      return this.decrypt(encrypted);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get file path for session
   * @param sessionId - Session ID
   * @returns File path
   */
  private getFilePath(sessionId: string): string {
    return join(this.storageDir, `${sessionId}.session`);
  }

  /**
   * Clear all sessions (for testing)
   */
  async clearAll(): Promise<void> {
    for (const sessionId of Array.from(this.sessionIndex)) {
      await this.delete(sessionId);
    }
  }
}
