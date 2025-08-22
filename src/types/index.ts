// Core MCP configuration types
export interface MCP {
  id: string;
  name: string;
  command?: string; // Optional for HTTP/SSE types
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  alwaysAllow?: string[];
  type: 'stdio' | 'http' | 'sse'; // Required field
  category: string;
  description?: string;
  version?: string;
  lastUsed?: Date;
  usageCount: number;
  tags: string[];
  source?: string;
  // HTTP/SSE specific fields
  url?: string; // Required for HTTP/SSE types
  headers?: Record<string, string>; // Optional headers for HTTP/SSE
}

// Profile for saving MCP combinations
export interface Profile {
  id: string;
  name: string;
  description: string;
  mcpIds: string[];
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
}

// Application settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultProfile?: string;
  autoBackup: boolean;
  encryptionEnabled: boolean;
  syncEnabled: boolean;
  exportFormat: 'claude' | 'gemini' | 'universal';
  categories: string[];
}

// Storage interface for data persistence
export interface StorageData {
  mcps: MCP[];
  profiles: Profile[];
  settings: AppSettings;
  backups: StorageBackup[];
}

// Backup interface
export interface StorageBackup {
  id: string;
  timestamp: Date;
  data: Omit<StorageData, 'backups'>;
  description?: string;
}

// MCP export formats for different AI agents
export interface MCPExportFormat {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface MCPServerConfig {
  command?: string; // Optional for HTTP/SSE types
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  alwaysAllow?: string[];
  type?: 'stdio' | 'http' | 'sse';
  // HTTP/SSE specific fields
  url?: string; // Used for HTTP/SSE servers
  headers?: Record<string, string>; // Optional headers for HTTP/SSE
}

// UI state types
export interface MCPFilters {
  search: string;
  category: string;
  status: 'all' | 'enabled' | 'disabled';
  tags: string[];
}

export interface BulkActions {
  selectedIds: string[];
  action: 'enable' | 'disable' | 'delete' | 'export';
}

// Form types
export interface MCPFormData {
  name: string;
  command?: string; // Optional for HTTP/SSE types
  args: string[];
  env: Array<{ key: string; value: string }>;
  category: string;
  description: string;
  tags: string[];
  type: 'stdio' | 'http' | 'sse';
  url?: string; // For HTTP/SSE types
  headers: Array<{ key: string; value: string }>; // For HTTP/SSE headers
}

// Import/Export types
export interface ImportResult {
  success: boolean;
  mcpsAdded: number;
  mcpsUpdated: number;
  errors: string[];
}

// Storage adapter interface
export interface StorageAdapter {
  // MCP operations
  getMCPs(): Promise<MCP[]>;
  saveMCPs(mcps: MCP[]): Promise<void>;
  
  // Profile operations
  getProfiles(): Profile[];
  saveProfiles(profiles: Profile[]): void;
  
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

// Default categories
export const DEFAULT_CATEGORIES = [
  'AI & Language',
  'Database',
  'Web Scraping',
  'Development Tools',
  'Testing',
  'File Management',
  'API Integration',
  'Analytics',
  'Security',
  'Other'
] as const;

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  autoBackup: true,
  encryptionEnabled: true,
  syncEnabled: false,
  exportFormat: 'universal',
  categories: [...DEFAULT_CATEGORIES]
};