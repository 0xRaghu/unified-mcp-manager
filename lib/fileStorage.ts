/**
 * File-based storage implementation for MCP Manager
 * Stores data in ~/.unified-mcp-manager/ directory
 */

import { join } from 'path';
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, readdirSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import type { 
  MCP, 
  Profile, 
  AppSettings, 
  StorageBackup
} from '../src/types';
import { DEFAULT_SETTINGS } from '../src/types';

const STORAGE_DIR = join(homedir(), '.unified-mcp-manager');
const FILES = {
  MCPS: join(STORAGE_DIR, 'mcps.json'),
  PROFILES: join(STORAGE_DIR, 'profiles.json'),
  SETTINGS: join(STORAGE_DIR, 'settings.json'),
  BACKUPS: join(STORAGE_DIR, 'backups.json')
} as const;

class FileStorageManager {
  constructor() {
    this.ensureStorageDir();
  }

  /**
   * Get the storage directory path
   */
  getStorageDir(): string {
    return STORAGE_DIR;
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDir(): void {
    if (!existsSync(STORAGE_DIR)) {
      try {
        mkdirSync(STORAGE_DIR, { recursive: true });
        console.log(`📁 Created storage directory: ${STORAGE_DIR}`);
      } catch (error) {
        throw new Error(`Failed to create storage directory: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Safely read JSON file with fallback
   */
  private readJsonFile<T>(filePath: string, defaultValue: T): T {
    try {
      if (!existsSync(filePath)) {
        return defaultValue;
      }
      
      const content = readFileSync(filePath, 'utf-8');
      if (!content.trim()) {
        return defaultValue;
      }
      
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Failed to read ${filePath}, using default value:`, error);
      return defaultValue;
    }
  }

  /**
   * Safely write JSON file
   */
  private writeJsonFile<T>(filePath: string, data: T): void {
    try {
      this.ensureStorageDir();
      const content = JSON.stringify(data, null, 2);
      writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Get all MCPs from storage
   */
  async getMCPs(): Promise<MCP[]> {
    const mcps = this.readJsonFile<MCP[]>(FILES.MCPS, []);
    
    // Convert date strings back to Date objects if needed
    return mcps.map(mcp => ({
      ...mcp,
      lastUsed: mcp.lastUsed ? new Date(mcp.lastUsed) : new Date(),
    }));
  }

  /**
   * Save MCPs to storage
   */
  async saveMCPs(mcps: MCP[]): Promise<void> {
    this.writeJsonFile(FILES.MCPS, mcps);
  }

  /**
   * Get all profiles from storage
   */
  getProfiles(): Profile[] {
    const profiles = this.readJsonFile<Profile[]>(FILES.PROFILES, []);
    
    // Convert date strings back to Date objects
    return profiles.map(profile => ({
      ...profile,
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt)
    }));
  }

  /**
   * Save profiles to storage
   */
  saveProfiles(profiles: Profile[]): void {
    this.writeJsonFile(FILES.PROFILES, profiles);
  }

  /**
   * Get app settings from storage
   */
  getSettings(): AppSettings {
    const settings = this.readJsonFile<AppSettings>(FILES.SETTINGS, DEFAULT_SETTINGS);
    // Merge with defaults to ensure all properties exist
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  /**
   * Save app settings to storage
   */
  saveSettings(settings: AppSettings): void {
    this.writeJsonFile(FILES.SETTINGS, settings);
  }

  /**
   * Get all backups from storage
   */
  getBackups(): StorageBackup[] {
    const backups = this.readJsonFile<StorageBackup[]>(FILES.BACKUPS, []);
    
    // Convert date strings back to Date objects
    return backups.map(backup => ({
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
  }

  /**
   * Save backups to storage
   */
  saveBackups(backups: StorageBackup[]): void {
    this.writeJsonFile(FILES.BACKUPS, backups);
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
      throw new Error(`Failed to create backup: ${(error as Error).message}`);
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
      throw new Error(`Failed to restore from backup: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all data from storage
   */
  clearAll(): void {
    try {
      Object.values(FILES).forEach(filePath => {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      });
    } catch (error) {
      throw new Error(`Failed to clear storage: ${(error as Error).message}`);
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; available: number; files: Record<string, number> } {
    try {
      let totalUsed = 0;
      const files: Record<string, number> = {};

      Object.entries(FILES).forEach(([key, filePath]) => {
        if (existsSync(filePath)) {
          const stats = statSync(filePath);
          const size = stats.size;
          files[key.toLowerCase()] = size;
          totalUsed += size;
        } else {
          files[key.toLowerCase()] = 0;
        }
      });

      // For file system, we don't have a practical limit like localStorage
      // Return a large "available" value
      return {
        used: totalUsed,
        available: 1024 * 1024 * 1024, // 1GB as a reasonable "unlimited" value
        files
      };
    } catch (error) {
      return { 
        used: 0, 
        available: 1024 * 1024 * 1024,
        files: {}
      };
    }
  }

  /**
   * Check if storage directory is writable
   */
  isWritable(): boolean {
    try {
      this.ensureStorageDir();
      const testFile = join(STORAGE_DIR, '.write-test');
      writeFileSync(testFile, 'test');
      unlinkSync(testFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage directory statistics
   */
  getStorageStats(): { 
    exists: boolean; 
    writable: boolean; 
    fileCount: number; 
    totalSize: number;
    path: string;
  } {
    const exists = existsSync(STORAGE_DIR);
    const writable = this.isWritable();
    
    let fileCount = 0;
    let totalSize = 0;

    if (exists) {
      try {
        const files = readdirSync(STORAGE_DIR);
        fileCount = files.length;
        
        files.forEach(file => {
          try {
            const filePath = join(STORAGE_DIR, file);
            const stats = statSync(filePath);
            if (stats.isFile()) {
              totalSize += stats.size;
            }
          } catch {
            // Ignore files we can't stat
          }
        });
      } catch {
        // Ignore if we can't read directory
      }
    }

    return {
      exists,
      writable,
      fileCount,
      totalSize,
      path: STORAGE_DIR
    };
  }
}

// Export singleton instance with lazy initialization
let _fileStorage: FileStorageManager | null = null;

function getInstance(): FileStorageManager {
  if (!_fileStorage) {
    _fileStorage = new FileStorageManager();
  }
  return _fileStorage;
}

export const fileStorage = {
  // Proxy all methods to the lazy-initialized instance
  getMCPs: () => getInstance().getMCPs(),
  saveMCPs: (mcps: any) => getInstance().saveMCPs(mcps),
  getProfiles: () => getInstance().getProfiles(),
  saveProfiles: (profiles: any) => getInstance().saveProfiles(profiles),
  getSettings: () => getInstance().getSettings(),
  saveSettings: (settings: any) => getInstance().saveSettings(settings),
  getBackups: () => getInstance().getBackups(),
  saveBackups: (backups: any) => getInstance().saveBackups(backups),
  createBackup: (description?: string) => getInstance().createBackup(description),
  restoreFromBackup: (backupId: string) => getInstance().restoreFromBackup(backupId),
  clearAll: () => getInstance().clearAll(),
  getStorageInfo: () => getInstance().getStorageInfo(),
  getStorageDir: () => getInstance().getStorageDir(),
};