/**
 * Enhanced Profile Types for MCP-JSON-UI
 * Extends the basic Profile interface with comprehensive profile management capabilities
 */

// Re-export basic Profile interface from main types
export type { Profile } from './index';

// Enhanced profile interfaces
export interface ProfileMetadata {
  author?: string;
  version?: string;
  compatibility?: string;
  lastExported?: Date;
  exportFormat?: string;
}

export interface ProfileStats {
  totalMCPs: number;
  enabledMCPs: number;
  disabledMCPs: number;
  mostUsedMCP?: string;
  avgUsageCount: number;
}

export interface ProfileSettings {
  autoEnable: boolean;    // Auto-enable MCPs when loading profile
  autoDisable: boolean;   // Auto-disable others when loading profile
  strictMode: boolean;    // Only allow MCPs in this profile
}

// Extended profile interface with enhanced capabilities
export interface EnhancedProfile {
  // Core fields (matching existing Profile interface)
  id: string;
  name: string;
  description: string;
  mcpIds: string[];
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  
  // Enhanced fields
  metadata: ProfileMetadata;
  stats: ProfileStats;
  tags: string[];
  color?: string; // For visual identification (hex color)
  icon?: string;  // For visual identification (icon name)
  category: string; // Development, Production, Testing, etc.
  settings: ProfileSettings;
}

// Profile switching types
export type SwitchMode = 'soft' | 'hard' | 'additive' | 'preview';

export interface SwitchResult {
  success: boolean;
  previousState?: ProfileState;
  errors?: string[];
  switchedMCPs?: {
    enabled: string[];
    disabled: string[];
  };
}

export interface SwitchEvent {
  timestamp: Date;
  fromProfile?: string;
  toProfile: string;
  mode: SwitchMode;
  success: boolean;
  duration?: number;
}

export interface ProfileState {
  profileId?: string;
  mcpStates: Record<string, boolean>; // mcpId -> enabled state
}

// Profile validation types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: ProfileConflict[];
}

export interface ProfileConflict {
  type: 'name' | 'mcp' | 'dependency';
  message: string;
  affectedItems: string[];
  severity: 'error' | 'warning' | 'info';
}

// Profile export/import types
export interface ProfileExportOptions {
  includeSensitiveData: boolean;
  encryptionKey?: string;
  exportType: 'full' | 'template' | 'manifest';
  compression: 'none' | 'gzip' | 'brotli';
  format: 'json' | 'yaml';
}

export interface ProfileExportInfo {
  version: string;
  exportedAt: string;
  exportedBy: string;
  exporterVersion: string;
  format: string;
  checksum?: string;
  compression: string;
}

export interface ProfileExportSecurity {
  encryptionUsed: boolean;
  encryptionAlgorithm?: string;
  sensitiveFields: string[];
  exportedWithSecrets: boolean;
}

export interface ProfileExportDependencies {
  requiredMCPs: string[];
  conflictingProfiles: string[];
  systemRequirements: Record<string, string>;
  environmentVariables: string[];
}

export interface ProfileExportBundle {
  exportInfo: ProfileExportInfo;
  profile: EnhancedProfile;
  mcps: any[]; // MCP configurations
  dependencies: ProfileExportDependencies;
  security: ProfileExportSecurity;
}

export interface ImportResult {
  success: boolean;
  format: 'native-profile' | 'claude-desktop' | 'generic-mcp' | 'yaml';
  version?: string;
  profilesImported: number;
  mcpsImported: number;
  warnings: string[];
  errors: string[];
}

// Profile form types
export interface ProfileFormData {
  name: string;
  description: string;
  category: string;
  selectedMCPIds: string[];
  settings: ProfileSettings;
  color?: string;
  icon?: string;
  tags: string[];
}

// Profile UI component prop types
export interface ProfileSelectorProps {
  currentProfile: EnhancedProfile | null;
  profiles: EnhancedProfile[];
  onProfileSwitch: (profileId: string) => void;
  onManageProfiles: () => void;
  disabled?: boolean;
  className?: string;
}

export interface ProfileCardProps {
  profile: EnhancedProfile;
  isActive?: boolean;
  isDefault?: boolean;
  onSwitch?: (profileId: string) => void;
  onEdit?: (profile: EnhancedProfile) => void;
  onDelete?: (profileId: string) => void;
  onDuplicate?: (profileId: string) => void;
  className?: string;
}

export interface ProfileFormProps {
  profile?: EnhancedProfile;
  mcps: any[]; // MCP array from main types
  onSave: (profile: ProfileFormData) => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface ProfileManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: EnhancedProfile[];
  currentProfile: EnhancedProfile | null;
  onProfileSwitch: (profileId: string) => void;
  onProfileCreate: (data: ProfileFormData) => void;
  onProfileUpdate: (id: string, data: Partial<EnhancedProfile>) => void;
  onProfileDelete: (id: string) => void;
}

export interface ProfileMCPAssignmentProps {
  profileId: string;
  availableMCPs: any[];
  selectedMCPIds: string[];
  onSelectionChange: (mcpIds: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
}

// Profile name generation types
export interface NameGenerationOptions {
  prefix?: string;
  basedOnMCPs?: boolean;
  category?: string;
  existingNames?: string[];
}

export interface GeneratedNameSuggestion {
  name: string;
  score: number; // 0-1, higher is better
  reason: string;
}

// Profile categories
export const PROFILE_CATEGORIES = [
  'Development',
  'Production', 
  'Testing',
  'Staging',
  'Personal',
  'Work',
  'AI & Language',
  'Database',
  'Web Services',
  'Tools',
  'Other'
] as const;

export type ProfileCategory = typeof PROFILE_CATEGORIES[number];

// Profile icons (icon names that correspond to available icons in UI)
export const PROFILE_ICONS = [
  'code',
  'server',
  'database',
  'globe',
  'cpu',
  'settings',
  'tool',
  'briefcase',
  'home',
  'star',
  'heart',
  'bookmark',
  'folder',
  'file',
  'layer',
  'package',
  'puzzle'
] as const;

export type ProfileIcon = typeof PROFILE_ICONS[number];

// Profile colors (predefined color palette)
export const PROFILE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green  
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
] as const;

export type ProfileColor = typeof PROFILE_COLORS[number];