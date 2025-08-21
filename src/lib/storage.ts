/**
 * Storage utilities for persisting MCP data with encryption support
 */

import { encryptData, decryptData, isEncryptionSupported } from './crypto';
import type { 
  MCP, 
  Profile, 
  AppSettings, 
  StorageData, 
  StorageBackup
} from '../types';
import { DEFAULT_SETTINGS } from '../types';

const STORAGE_KEYS = {
  MCPS: 'mcp-manager-mcps',
  PROFILES: 'mcp-manager-profiles',
  SETTINGS: 'mcp-manager-settings',
  BACKUPS: 'mcp-manager-backups',
  ENCRYPTION_KEY: 'mcp-manager-key'
} as const;

class StorageManager {
  private encryptionPassword: string | null = null;

  constructor() {
    // Check if we have a stored encryption key
    const storedKey = localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY);
    if (storedKey) {
      this.encryptionPassword = storedKey;
    }
  }

  /**
   * Set encryption password for securing sensitive data
   */
  setEncryptionPassword(password: string): void {
    this.encryptionPassword = password;
    localStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEY, password);
  }

  /**
   * Clear encryption password
   */
  clearEncryptionPassword(): void {
    this.encryptionPassword = null;
    localStorage.removeItem(STORAGE_KEYS.ENCRYPTION_KEY);
  }

  /**
   * Encrypt sensitive fields in MCP data
   */
  private async encryptMCP(mcp: MCP): Promise<MCP> {
    if (!this.encryptionPassword || !mcp.env || Object.keys(mcp.env).length === 0) {
      return mcp;
    }

    const encryptedEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(mcp.env)) {
      if (this.isSensitiveKey(key)) {
        try {
          encryptedEnv[key] = await encryptData(value, this.encryptionPassword);
        } catch (error) {
          console.error(`Failed to encrypt ${key}:`, error);
          encryptedEnv[key] = value; // Fall back to plain text
        }
      } else {
        encryptedEnv[key] = value;
      }
    }

    return { ...mcp, env: encryptedEnv };
  }

  /**
   * Decrypt sensitive fields in MCP data
   */
  private async decryptMCP(mcp: MCP): Promise<MCP> {
    if (!this.encryptionPassword || !mcp.env || Object.keys(mcp.env).length === 0) {
      return mcp;
    }

    const decryptedEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(mcp.env)) {
      if (this.isSensitiveKey(key)) {
        try {
          decryptedEnv[key] = await decryptData(value, this.encryptionPassword);
        } catch (error) {
          console.warn(`Failed to decrypt ${key}, using as-is:`, error);
          decryptedEnv[key] = value; // Fall back to encrypted value
        }
      } else {
        decryptedEnv[key] = value;
      }
    }

    return { ...mcp, env: decryptedEnv };
  }

  /**
   * Check if an environment variable key contains sensitive data
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /access[_-]?token/i,
      /secret/i,
      /password/i,
      /auth/i,
      /token/i,
      /credential/i
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  /**
   * Get all MCPs from storage
   */
  async getMCPs(): Promise<MCP[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MCPS);
      if (!stored) return [];
      
      const mcps: MCP[] = JSON.parse(stored);
      
      // Decrypt sensitive data if encryption is enabled
      if (this.encryptionPassword && isEncryptionSupported()) {
        const decryptedMCPs = await Promise.all(
          mcps.map(mcp => this.decryptMCP(mcp))
        );
        return decryptedMCPs;
      }
      
      return mcps;
    } catch (error) {
      console.error('Failed to get MCPs from storage:', error);
      return [];
    }
  }

  /**
   * Save MCPs to storage
   */
  async saveMCPs(mcps: MCP[]): Promise<void> {
    try {
      let mcpsToStore = mcps;
      
      // Encrypt sensitive data if encryption is enabled
      if (this.encryptionPassword && isEncryptionSupported()) {
        mcpsToStore = await Promise.all(
          mcps.map(mcp => this.encryptMCP(mcp))
        );
      }
      
      localStorage.setItem(STORAGE_KEYS.MCPS, JSON.stringify(mcpsToStore));
    } catch (error) {
      console.error('Failed to save MCPs to storage:', error);
      throw new Error('Failed to save MCP data');
    }
  }

  /**
   * Get all profiles from storage
   */
  getProfiles(): Profile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (!stored) return [];
      
      const profiles = JSON.parse(stored);
      // Convert date strings back to Date objects
      return profiles.map((profile: any) => ({
        ...profile,
        createdAt: new Date(profile.createdAt),
        updatedAt: new Date(profile.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to get profiles from storage:', error);
      return [];
    }
  }

  /**
   * Save profiles to storage
   */
  saveProfiles(profiles: Profile[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    } catch (error) {
      console.error('Failed to save profiles to storage:', error);
      throw new Error('Failed to save profile data');
    }
  }

  /**
   * Get app settings from storage
   */
  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!stored) return DEFAULT_SETTINGS;
      
      const settings = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      return { ...DEFAULT_SETTINGS, ...settings };
    } catch (error) {
      console.error('Failed to get settings from storage:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save app settings to storage
   */
  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to storage:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Get all backups from storage
   */
  getBackups(): StorageBackup[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BACKUPS);
      if (!stored) return [];
      
      const backups = JSON.parse(stored);
      // Convert date strings back to Date objects
      return backups.map((backup: any) => ({
        ...backup,
        timestamp: new Date(backup.timestamp),
        data: {
          ...backup.data,
          profiles: backup.data.profiles?.map((profile: any) => ({
            ...profile,
            createdAt: new Date(profile.createdAt),
            updatedAt: new Date(profile.updatedAt)
          })) || []
        }
      }));
    } catch (error) {
      console.error('Failed to get backups from storage:', error);
      return [];
    }
  }

  /**
   * Save backups to storage
   */
  saveBackups(backups: StorageBackup[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(backups));
    } catch (error) {
      console.error('Failed to save backups to storage:', error);
      throw new Error('Failed to save backup data');
    }
  }

  /**
   * Create a backup of current data
   */
  async createBackup(description?: string): Promise<StorageBackup> {
    try {
      const mcps = await this.getMCPs();
      const profiles = this.getProfiles();
      const settings = this.getSettings();
      
      const backup: StorageBackup = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        description: description || `Backup ${new Date().toLocaleString()}`,
        data: { mcps, profiles, settings }
      };

      const existingBackups = this.getBackups();
      const allBackups = [backup, ...existingBackups].slice(0, 10); // Keep only 10 backups
      this.saveBackups(allBackups);
      
      return backup;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  /**
   * Restore from a backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    try {
      const backups = this.getBackups();
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup) {
        throw new Error('Backup not found');
      }

      await this.saveMCPs(backup.data.mcps);
      this.saveProfiles(backup.data.profiles);
      this.saveSettings(backup.data.settings);
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw new Error('Failed to restore from backup');
    }
  }

  /**
   * Clear all data from storage
   */
  clearAll(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw new Error('Failed to clear all data');
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; available: number } {
    try {
      let used = 0;
      Object.values(STORAGE_KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          used += new Blob([item]).size;
        }
      });

      // Rough estimate of available space (browsers typically allow 5-10MB)
      const estimated_total = 5 * 1024 * 1024; // 5MB
      return {
        used,
        available: Math.max(0, estimated_total - used)
      };
    } catch (error) {
      return { used: 0, available: 0 };
    }
  }
}

// Export singleton instance
export const storage = new StorageManager();