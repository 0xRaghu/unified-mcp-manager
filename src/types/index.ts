// Core MCP configuration types
export interface MCP {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  alwaysAllow?: string[];
  type?: 'stdio' | 'http' | 'sse';
  category: string;
  description?: string;
  version?: string;
  lastUsed?: Date;
  usageCount: number;
  tags: string[];
  source?: string;
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
  command: string;
  args: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  alwaysAllow?: string[];
  type?: 'stdio' | 'http' | 'sse';
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
  command: string;
  args: string[];
  env: Array<{ key: string; value: string }>;
  category: string;
  description: string;
  tags: string[];
  type: 'stdio' | 'http' | 'sse';
}

// Import/Export types
export interface ImportResult {
  success: boolean;
  mcpsAdded: number;
  mcpsUpdated: number;
  errors: string[];
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