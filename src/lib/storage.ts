/**
 * Storage utilities for persisting MCP data with encryption support
 * Now uses storage adapters to support both browser and server environments
 */

import { encryptData, decryptData, isEncryptionSupported } from './crypto';
import type { 
  MCP, 
  Profile, 
  AppSettings, 
  StorageData, 
  StorageBackup,
  StorageAdapter
} from '../types';
import { DEFAULT_SETTINGS } from '../types';


// Browser-compatible storage adapters
class ApiStorageAdapter implements StorageAdapter {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        ...options
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  async getMCPs(): Promise<MCP[]> {
    console.log('ApiStorageAdapter.getMCPs() called');
    const mcps = await this.apiCall<MCP[]>('/mcps');
    console.log('API returned:', mcps);
    const result = mcps.map(mcp => ({
      ...mcp,
      lastUsed: mcp.lastUsed ? new Date(mcp.lastUsed) : new Date(),
    }));
    console.log('Processed result:', result);
    return result;
  }

  async saveMCPs(mcps: MCP[]): Promise<void> {
    await this.apiCall('/mcps', {
      method: 'POST',
      body: JSON.stringify(mcps)
    });
  }

  getProfiles(): Profile[] {
    return [];
  }

  saveProfiles(profiles: Profile[]): void {
    // Fire and forget
    this.apiCall('/profiles', {
      method: 'POST',
      body: JSON.stringify(profiles)
    }).catch(console.error);
  }

  getSettings(): AppSettings {
    return DEFAULT_SETTINGS;
  }

  saveSettings(settings: AppSettings): void {
    // Fire and forget
    this.apiCall('/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    }).catch(console.error);
  }

  getBackups(): StorageBackup[] {
    return [];
  }

  saveBackups(backups: StorageBackup[]): void {
    // Fire and forget
    this.apiCall('/backups', {
      method: 'POST',
      body: JSON.stringify(backups)
    }).catch(console.error);
  }

  async createBackup(description?: string): Promise<StorageBackup> {
    const backup = await this.apiCall<StorageBackup>('/backups', {
      method: 'POST',
      body: JSON.stringify({ description })
    });
    
    return {
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
    };
  }

  async restoreFromBackup(backupId: string): Promise<void> {
    await this.apiCall(`/backups/${backupId}/restore`, {
      method: 'POST'
    });
  }

  clearAll(): void {
    this.apiCall('/storage/clear', {
      method: 'POST'
    }).catch(console.error);
  }

  getStorageInfo(): { used: number; available: number } {
    return { used: 0, available: 0 };
  }
}


class StorageManager {
  private encryptionPassword: string | null = null;
  private adapter: StorageAdapter;

  constructor() {
    // Always use API adapter since we're always running with a server
    this.adapter = new ApiStorageAdapter();
  }

  /**
   * Set encryption password for securing sensitive data
   */
  setEncryptionPassword(password: string): void {
    this.encryptionPassword = password;
  }

  /**
   * Clear encryption password
   */
  clearEncryptionPassword(): void {
    this.encryptionPassword = null;
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
      const mcps = await this.adapter.getMCPs();
      
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
      
      await this.adapter.saveMCPs(mcpsToStore);
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
      return this.adapter.getProfiles();
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
      this.adapter.saveProfiles(profiles);
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
      return this.adapter.getSettings();
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
      this.adapter.saveSettings(settings);
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
      return this.adapter.getBackups();
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
      this.adapter.saveBackups(backups);
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
      return await this.adapter.createBackup(description);
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
      await this.adapter.restoreFromBackup(backupId);
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
      this.adapter.clearAll();
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
      return this.adapter.getStorageInfo();
    } catch (error) {
      return { used: 0, available: 0 };
    }
  }
}

// Export singleton instance
export const storage = new StorageManager();