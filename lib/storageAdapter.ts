/**
 * Storage adapter interface for MCP Manager
 * Abstracts storage implementation (localStorage vs file system)
 */

import type { 
  MCP, 
  Profile, 
  AppSettings, 
  StorageBackup
} from '../src/types';

export interface StorageAdapter {
  // MCP operations
  getMCPs(): Promise<MCP[]>;
  saveMCPs(mcps: MCP[]): Promise<void>;
  
  // Profile operations
  getProfiles(): Profile[];
  saveProfiles(profiles: Profile[]): void;
  getProfilesAsync?(): Promise<Profile[]>; // Optional async version
  saveProfilesAsync?(profiles: Profile[]): Promise<void>; // Optional async version
  
  // Settings operations
  getSettings(): AppSettings;
  saveSettings(settings: AppSettings): void;
  
  // Backup operations
  getBackups(): StorageBackup[];
  saveBackups(backups: StorageBackup[]): void;
  createBackup(description?: string): Promise<StorageBackup>;
  restoreFromBackup(backupId: string): Promise<void>;
  
  // Utility operations
  clearAll(): void;
  getStorageInfo(): { used: number; available: number };
  getStorageDir?(): string; // Optional for file-based storage
}

// API-based storage adapter for frontend
export class ApiStorageAdapter implements StorageAdapter {
  private baseUrl: string;
  private profilesCache: Profile[] | null = null;
  private profilesCacheTime = 0;
  private readonly CACHE_TTL = 5000; // 5 second cache TTL

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
    const mcps = await this.apiCall<MCP[]>('/mcps');
    // Convert date strings back to Date objects
    return mcps.map(mcp => ({
      ...mcp,
      lastUsed: mcp.lastUsed ? new Date(mcp.lastUsed) : new Date(),
    }));
  }

  async saveMCPs(mcps: MCP[]): Promise<void> {
    await this.apiCall('/mcps', {
      method: 'POST',
      body: JSON.stringify(mcps)
    });
  }

  getProfiles(): Profile[] {
    // Return cached profiles if available and fresh
    const now = Date.now();
    if (this.profilesCache && (now - this.profilesCacheTime) < this.CACHE_TTL) {
      return this.profilesCache;
    }
    
    // Otherwise return empty array and trigger async load
    this.getProfilesAsync().then(profiles => {
      this.profilesCache = profiles;
      this.profilesCacheTime = Date.now();
    }).catch(console.error);
    
    return this.profilesCache || [];
  }

  async getProfilesAsync(): Promise<Profile[]> {
    try {
      const profiles = await this.apiCall<Profile[]>('/profiles');
      // Convert date strings back to Date objects
      const result = profiles.map(profile => ({
        ...profile,
        createdAt: new Date(profile.createdAt),
        updatedAt: new Date(profile.updatedAt)
      }));
      
      // Update cache
      this.profilesCache = result;
      this.profilesCacheTime = Date.now();
      
      return result;
    } catch (error) {
      console.error('Failed to load profiles:', error);
      return [];
    }
  }

  saveProfiles(profiles: Profile[]): void {
    // Fire and forget for sync interface
    this.apiCall('/profiles', {
      method: 'POST',
      body: JSON.stringify(profiles)
    }).catch(console.error);
  }

  async saveProfilesAsync(profiles: Profile[]): Promise<void> {
    await this.apiCall('/profiles', {
      method: 'POST',
      body: JSON.stringify(profiles)
    });
    
    // Update cache immediately
    this.profilesCache = profiles;
    this.profilesCacheTime = Date.now();
  }

  getSettings(): AppSettings {
    // For API adapter, we need to make this async or cache
    // For now, return default and let the store handle async loading
    return {
      theme: 'system',
      autoBackup: true,
      encryptionEnabled: true,
      syncEnabled: false,
      exportFormat: 'universal',
      categories: []
    };
  }

  async getSettingsAsync(): Promise<AppSettings> {
    return await this.apiCall<AppSettings>('/settings');
  }

  saveSettings(settings: AppSettings): void {
    // Fire and forget for sync interface
    this.apiCall('/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    }).catch(console.error);
  }

  async saveSettingsAsync(settings: AppSettings): Promise<void> {
    await this.apiCall('/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  getBackups(): StorageBackup[] {
    // For API adapter, return empty array and let the store handle async loading
    return [];
  }

  async getBackupsAsync(): Promise<StorageBackup[]> {
    const backups = await this.apiCall<StorageBackup[]>('/backups');
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

  saveBackups(backups: StorageBackup[]): void {
    // Fire and forget for sync interface
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
    
    // Convert date strings back to Date objects
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
    // Fire and forget for sync interface
    this.clearAllAsync().catch(console.error);
  }

  async clearAllAsync(): Promise<void> {
    await this.apiCall('/storage/clear', {
      method: 'POST'
    });
  }

  getStorageInfo(): { used: number; available: number } {
    // For API adapter, return default values and let the store handle async loading
    return { used: 0, available: 0 };
  }

  async getStorageInfoAsync(): Promise<{ used: number; available: number }> {
    return await this.apiCall<{ used: number; available: number }>('/storage/info');
  }
}

// Browser localStorage adapter for backward compatibility
export class LocalStorageAdapter implements StorageAdapter {
  private storageKeys = {
    MCPS: 'mcp-manager-mcps',
    PROFILES: 'mcp-manager-profiles',
    SETTINGS: 'mcp-manager-settings',
    BACKUPS: 'mcp-manager-backups'
  };

  async getMCPs(): Promise<MCP[]> {
    try {
      const stored = localStorage.getItem(this.storageKeys.MCPS);
      if (!stored) return [];
      
      const mcps: MCP[] = JSON.parse(stored);
      return mcps.map(mcp => ({
        ...mcp,
        lastUsed: mcp.lastUsed ? new Date(mcp.lastUsed) : new Date(),
      }));
    } catch (error) {
      console.error('Failed to get MCPs from localStorage:', error);
      return [];
    }
  }

  async saveMCPs(mcps: MCP[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKeys.MCPS, JSON.stringify(mcps));
    } catch (error) {
      throw new Error(`Failed to save MCPs: ${(error as Error).message}`);
    }
  }

  getProfiles(): Profile[] {
    try {
      const stored = localStorage.getItem(this.storageKeys.PROFILES);
      if (!stored) return [];
      
      const profiles = JSON.parse(stored);
      return profiles.map((profile: any) => ({
        ...profile,
        createdAt: new Date(profile.createdAt),
        updatedAt: new Date(profile.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to get profiles from localStorage:', error);
      return [];
    }
  }

  saveProfiles(profiles: Profile[]): void {
    try {
      localStorage.setItem(this.storageKeys.PROFILES, JSON.stringify(profiles));
    } catch (error) {
      throw new Error(`Failed to save profiles: ${(error as Error).message}`);
    }
  }

  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(this.storageKeys.SETTINGS);
      if (!stored) {
        return {
          theme: 'system',
          autoBackup: true,
          encryptionEnabled: true,
          syncEnabled: false,
          exportFormat: 'universal',
          categories: []
        };
      }
      
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to get settings from localStorage:', error);
      return {
        theme: 'system',
        autoBackup: true,
        encryptionEnabled: true,
        syncEnabled: false,
        exportFormat: 'universal',
        categories: []
      };
    }
  }

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(this.storageKeys.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      throw new Error(`Failed to save settings: ${(error as Error).message}`);
    }
  }

  getBackups(): StorageBackup[] {
    try {
      const stored = localStorage.getItem(this.storageKeys.BACKUPS);
      if (!stored) return [];
      
      const backups = JSON.parse(stored);
      return backups.map((backup: any) => ({
        ...backup,
        timestamp: new Date(backup.timestamp)
      }));
    } catch (error) {
      console.error('Failed to get backups from localStorage:', error);
      return [];
    }
  }

  saveBackups(backups: StorageBackup[]): void {
    try {
      localStorage.setItem(this.storageKeys.BACKUPS, JSON.stringify(backups));
    } catch (error) {
      throw new Error(`Failed to save backups: ${(error as Error).message}`);
    }
  }

  async createBackup(description?: string): Promise<StorageBackup> {
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
    const allBackups = [backup, ...existingBackups].slice(0, 10);
    this.saveBackups(allBackups);
    
    return backup;
  }

  async restoreFromBackup(backupId: string): Promise<void> {
    const backups = this.getBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error('Backup not found');
    }

    await this.saveMCPs(backup.data.mcps);
    this.saveProfiles(backup.data.profiles);
    this.saveSettings(backup.data.settings);
  }

  clearAll(): void {
    Object.values(this.storageKeys).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  getStorageInfo(): { used: number; available: number } {
    try {
      let used = 0;
      Object.values(this.storageKeys).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          used += new Blob([item]).size;
        }
      });

      const estimatedTotal = 5 * 1024 * 1024; // 5MB
      return {
        used,
        available: Math.max(0, estimatedTotal - used)
      };
    } catch (error) {
      return { used: 0, available: 0 };
    }
  }
}