/**
 * Zustand store for managing MCP state and operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { storage } from '../lib/storage';
import { checkForDuplicates, generateUniqueName } from '../lib/duplicateDetection';
import type { 
  MCP, 
  Profile, 
  AppSettings, 
  MCPFilters, 
  BulkActions,
  ImportResult,
  MCPExportFormat,
  StorageBackup
} from '../types';

interface MCPStore {
  // State
  mcps: MCP[];
  profiles: Profile[];
  settings: AppSettings;
  filters: MCPFilters;
  bulkActions: BulkActions;
  selectedProfile: Profile | null;
  isLoading: boolean;
  error: string | null;

  // Profile change tracking
  hasUnsavedProfileChanges: () => boolean;
  saveCurrentStateToProfile: () => Promise<void>;

  // MCP Operations
  addMCP: (mcp: Omit<MCP, 'id' | 'usageCount' | 'lastUsed'>) => Promise<MCP>;
  addMCPToProfiles: (mcp: Omit<MCP, 'id' | 'usageCount' | 'lastUsed'>, profileIds?: string[]) => Promise<MCP>;
  updateMCP: (id: string, updates: Partial<MCP>) => Promise<void>;
  deleteMCP: (id: string) => Promise<void>;
  toggleMCP: (id: string) => Promise<void>;
  bulkToggleMCPs: (ids: string[], enabled: boolean) => Promise<void>;
  bulkDeleteMCPs: (ids: string[]) => Promise<void>;
  duplicateMCP: (id: string) => Promise<void>;
  enableAllMCPs: () => Promise<void>;

  // Profile Operations
  createProfile: (profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setActiveProfile: (id: string | null) => void;
  loadProfile: (id: string) => Promise<void>;

  // Settings Operations
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;

  // Filter Operations
  setFilters: (filters: Partial<MCPFilters>) => void;
  clearFilters: () => void;

  // Bulk Operations
  setBulkSelection: (ids: string[]) => void;
  clearBulkSelection: () => void;
  toggleBulkSelection: (id: string) => void;

  // Import/Export Operations
  importMCPs: (data: string, format?: 'json' | 'yaml') => Promise<ImportResult>;
  exportMCPs: (ids?: string[], format?: 'claude' | 'gemini' | 'universal') => MCPExportFormat;
  exportProfile: (profileId: string) => object;
  importProfile: (data: string) => Promise<void>;

  // Backup Operations
  createBackup: (description?: string) => Promise<StorageBackup>;
  restoreBackup: (backupId: string) => Promise<void>;
  getBackups: () => StorageBackup[];

  // Utility Operations
  searchMCPs: (query: string) => MCP[];
  getFilteredMCPs: () => MCP[];
  getMCPsByCategory: (category: string) => MCP[];
  incrementUsage: (id: string) => Promise<void>;

  // Data Operations
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const initialFilters: MCPFilters = {
  search: '',
  category: '',
  status: 'all',
  tags: []
};

const initialBulkActions: BulkActions = {
  selectedIds: [],
  action: 'enable'
};

export const useMCPStore = create<MCPStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      mcps: [],
      profiles: [],
      settings: {
        theme: 'system',
        autoBackup: true,
        encryptionEnabled: true,
        syncEnabled: false,
        exportFormat: 'universal',
        categories: []
      },
      filters: initialFilters,
      bulkActions: initialBulkActions,
      selectedProfile: null,
      isLoading: false,
      error: null,

      // Profile change tracking computed methods
      hasUnsavedProfileChanges: () => {
        const { selectedProfile, mcps } = get();
        if (!selectedProfile) return false;
        
        // Get currently enabled MCP IDs
        const currentlyEnabledMCPIds = mcps.filter(mcp => !mcp.disabled).map(mcp => mcp.id).sort();
        
        // Get profile's MCP IDs sorted for comparison
        const profileMCPIds = [...selectedProfile.mcpIds].sort();
        
        // Compare arrays to detect changes
        if (currentlyEnabledMCPIds.length !== profileMCPIds.length) {
          return true;
        }
        
        return currentlyEnabledMCPIds.some((id, index) => id !== profileMCPIds[index]);
      },

      saveCurrentStateToProfile: async () => {
        const { selectedProfile, mcps, updateProfile } = get();
        if (!selectedProfile) {
          throw new Error('No active profile to save to');
        }
        
        // Get currently enabled MCP IDs
        const currentlyEnabledMCPIds = mcps.filter(mcp => !mcp.disabled).map(mcp => mcp.id);
        
        // Update the profile with current state
        await updateProfile(selectedProfile.id, {
          mcpIds: currentlyEnabledMCPIds,
          updatedAt: new Date()
        });
        
        // Update selectedProfile state to reflect the changes
        set({ 
          selectedProfile: {
            ...selectedProfile,
            mcpIds: currentlyEnabledMCPIds,
            updatedAt: new Date()
          }
        });
      },

      // MCP Operations
      addMCP: async (mcpData) => {
        set({ isLoading: true, error: null });
        try {
          // Check for duplicates and potentially generate unique name
          const duplicateCheck = checkForDuplicates(mcpData, get().mcps);
          let finalMcpData = { ...mcpData };
          
          if (duplicateCheck.isDuplicate && duplicateCheck.suggestedName) {
            finalMcpData.name = duplicateCheck.suggestedName;
          }

          const newMCP: MCP = {
            ...finalMcpData,
            id: crypto.randomUUID(),
            usageCount: 0,
            lastUsed: new Date(),
            disabled: finalMcpData.disabled || false
          };

          const updatedMCPs = [...get().mcps, newMCP];
          set({ mcps: updatedMCPs });
          await storage.saveMCPs(updatedMCPs);

          // Auto-backup if enabled
          if (get().settings.autoBackup) {
            await get().createBackup(`Added MCP: ${newMCP.name}`);
          }

          return newMCP;
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Combined operation to add MCP and update profiles atomically
      addMCPToProfiles: async (mcpData, profileIds?: string[]) => {
        set({ isLoading: true, error: null });
        try {
          // Create the MCP first
          const newMCP = await get().addMCP(mcpData);
          
          // Update profiles if provided
          if (profileIds && profileIds.length > 0) {
            const { profiles, updateProfile } = get();
            
            const updatePromises = profileIds.map(async (profileId) => {
              const profile = profiles.find(p => p.id === profileId);
              if (profile && !profile.mcpIds.includes(newMCP.id)) {
                await updateProfile(profileId, {
                  mcpIds: [...profile.mcpIds, newMCP.id],
                  updatedAt: new Date()
                });
              }
            });
            
            await Promise.all(updatePromises);
          }

          return newMCP;
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateMCP: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updatedMCPs = get().mcps.map(mcp =>
            mcp.id === id ? { ...mcp, ...updates } : mcp
          );
          set({ mcps: updatedMCPs });
          await storage.saveMCPs(updatedMCPs);
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteMCP: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const mcpToDelete = get().mcps.find(mcp => mcp.id === id);
          if (!mcpToDelete) throw new Error('MCP not found');

          // Remove MCP from all profiles that contain it
          const { profiles, updateProfile } = get();
          const profilesToUpdate = profiles.filter(profile => profile.mcpIds.includes(id));
          
          const profileUpdatePromises = profilesToUpdate.map(async (profile) => {
            const updatedMcpIds = profile.mcpIds.filter(mcpId => mcpId !== id);
            await updateProfile(profile.id, {
              mcpIds: updatedMcpIds,
              updatedAt: new Date()
            });
          });

          // Wait for all profile updates to complete
          await Promise.all(profileUpdatePromises);

          // Remove the MCP from the MCPs array
          const updatedMCPs = get().mcps.filter(mcp => mcp.id !== id);
          set({ mcps: updatedMCPs });
          await storage.saveMCPs(updatedMCPs);

          // Update selectedProfile if it was affected
          const currentSelectedProfile = get().selectedProfile;
          if (currentSelectedProfile && currentSelectedProfile.mcpIds.includes(id)) {
            const updatedSelectedProfile = {
              ...currentSelectedProfile,
              mcpIds: currentSelectedProfile.mcpIds.filter(mcpId => mcpId !== id),
              updatedAt: new Date()
            };
            set({ selectedProfile: updatedSelectedProfile });
          }

          // Remove from bulk selection if selected
          const currentSelection = get().bulkActions.selectedIds;
          if (currentSelection.includes(id)) {
            get().setBulkSelection(currentSelection.filter(selectedId => selectedId !== id));
          }

          // Auto-backup if enabled
          if (get().settings.autoBackup) {
            await get().createBackup(`Deleted MCP: ${mcpToDelete.name}`);
          }
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      toggleMCP: async (id) => {
        const mcp = get().mcps.find(m => m.id === id);
        if (mcp) {
          await get().updateMCP(id, { disabled: !mcp.disabled });
        }
      },

      bulkToggleMCPs: async (ids, enabled) => {
        set({ isLoading: true, error: null });
        try {
          const updatedMCPs = get().mcps.map(mcp =>
            ids.includes(mcp.id) ? { ...mcp, disabled: !enabled } : mcp
          );
          set({ mcps: updatedMCPs });
          await storage.saveMCPs(updatedMCPs);
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      bulkDeleteMCPs: async (ids) => {
        set({ isLoading: true, error: null });
        try {
          // Remove MCPs from all profiles that contain them
          const { profiles, updateProfile } = get();
          const profilesToUpdate = profiles.filter(profile => 
            profile.mcpIds.some(mcpId => ids.includes(mcpId))
          );
          
          const profileUpdatePromises = profilesToUpdate.map(async (profile) => {
            const updatedMcpIds = profile.mcpIds.filter(mcpId => !ids.includes(mcpId));
            await updateProfile(profile.id, {
              mcpIds: updatedMcpIds,
              updatedAt: new Date()
            });
          });

          // Wait for all profile updates to complete
          await Promise.all(profileUpdatePromises);

          // Remove the MCPs from the MCPs array
          const updatedMCPs = get().mcps.filter(mcp => !ids.includes(mcp.id));
          set({ mcps: updatedMCPs });
          await storage.saveMCPs(updatedMCPs);

          // Update selectedProfile if it was affected
          const currentSelectedProfile = get().selectedProfile;
          if (currentSelectedProfile && currentSelectedProfile.mcpIds.some(mcpId => ids.includes(mcpId))) {
            const updatedSelectedProfile = {
              ...currentSelectedProfile,
              mcpIds: currentSelectedProfile.mcpIds.filter(mcpId => !ids.includes(mcpId)),
              updatedAt: new Date()
            };
            set({ selectedProfile: updatedSelectedProfile });
          }

          get().clearBulkSelection();

          // Auto-backup if enabled
          if (get().settings.autoBackup) {
            await get().createBackup(`Bulk deleted ${ids.length} MCPs`);
          }
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      duplicateMCP: async (id) => {
        const mcp = get().mcps.find(m => m.id === id);
        if (mcp) {
          // Generate unique name for duplicate
          const uniqueName = generateUniqueName(mcp.name, get().mcps);
          
          await get().addMCP({
            ...mcp,
            name: uniqueName,
            tags: [...mcp.tags, 'duplicate']
          });
        }
      },

      enableAllMCPs: async () => {
        set({ isLoading: true, error: null });
        try {
          const updatedMCPs = get().mcps.map(mcp => ({
            ...mcp,
            disabled: false
          }));
          set({ mcps: updatedMCPs });
          await storage.saveMCPs(updatedMCPs);
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Profile Operations
      createProfile: async (profileData) => {
        set({ isLoading: true, error: null });
        try {
          const newProfile: Profile = {
            ...profileData,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const updatedProfiles = [...get().profiles, newProfile];
          set({ profiles: updatedProfiles });
          if (storage.saveProfilesAsync) {
            await storage.saveProfilesAsync(updatedProfiles);
          } else {
            storage.saveProfiles(updatedProfiles);
          }
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      updateProfile: async (id, updates) => {
        const updatedProfiles = get().profiles.map(profile =>
          profile.id === id ? { ...profile, ...updates, updatedAt: new Date() } : profile
        );
        set({ profiles: updatedProfiles });
        if (storage.saveProfilesAsync) {
          await storage.saveProfilesAsync(updatedProfiles);
        } else {
          storage.saveProfiles(updatedProfiles);
        }
      },

      deleteProfile: async (id) => {
        const updatedProfiles = get().profiles.filter(profile => profile.id !== id);
        set({ profiles: updatedProfiles });
        if (storage.saveProfilesAsync) {
          await storage.saveProfilesAsync(updatedProfiles);
        } else {
          storage.saveProfiles(updatedProfiles);
        }

        // Clear selected profile if it was deleted
        if (get().selectedProfile?.id === id) {
          set({ selectedProfile: null });
        }
      },

      setActiveProfile: (id) => {
        const profile = id ? get().profiles.find(p => p.id === id) : null;
        set({ selectedProfile: profile });
      },

      loadProfile: async (id) => {
        const profile = get().profiles.find(p => p.id === id);
        if (profile) {
          // Enable only MCPs in this profile
          const updatedMCPs = get().mcps.map(mcp => ({
            ...mcp,
            disabled: !profile.mcpIds.includes(mcp.id)
          }));
          set({ mcps: updatedMCPs, selectedProfile: profile });
          await storage.saveMCPs(updatedMCPs);
        }
      },

      // Settings Operations
      updateSettings: async (settingsUpdates) => {
        const updatedSettings = { ...get().settings, ...settingsUpdates };
        set({ settings: updatedSettings });
        storage.saveSettings(updatedSettings);
      },

      // Filter Operations
      setFilters: (filterUpdates) => {
        set({ filters: { ...get().filters, ...filterUpdates } });
      },

      clearFilters: () => {
        set({ filters: initialFilters });
      },

      // Bulk Operations
      setBulkSelection: (ids) => {
        set({ bulkActions: { ...get().bulkActions, selectedIds: ids } });
      },

      clearBulkSelection: () => {
        set({ bulkActions: { ...get().bulkActions, selectedIds: [] } });
      },

      toggleBulkSelection: (id) => {
        const current = get().bulkActions.selectedIds;
        const newSelection = current.includes(id)
          ? current.filter(selectedId => selectedId !== id)
          : [...current, id];
        get().setBulkSelection(newSelection);
      },

      // Import/Export Operations
      importMCPs: async (data, format = 'json') => {
        try {
          let parsedData: any;
          if (format === 'json') {
            parsedData = JSON.parse(data);
          } else {
            throw new Error('YAML import not yet implemented');
          }

          let mcpsToImport: MCP[] = [];
          let mcpsAdded = 0;
          let mcpsUpdated = 0;
          const errors: string[] = [];

          // Handle different import formats
          if (parsedData.mcpServers) {
            // Claude/Gemini format
            Object.entries(parsedData.mcpServers).forEach(([name, config]: [string, any]) => {
              try {
                // Determine type based on config properties
                let type: 'stdio' | 'http' | 'sse' = 'stdio'
                if (config.url) {
                  type = config.type === 'sse' ? 'sse' : 'http'
                } else if (config.command) {
                  type = 'stdio'
                }

                const mcp: MCP = {
                  id: crypto.randomUUID(),
                  name,
                  type: config.type || type,
                  category: 'Imported',
                  description: `Imported from ${format.toUpperCase()}`,
                  usageCount: 0,
                  tags: ['imported'],
                  source: 'import',
                  disabled: config.disabled || false,
                  // Conditional fields based on type
                  ...(type === 'stdio' 
                    ? {
                        command: config.command || '',
                        args: config.args || [],
                      }
                    : {
                        url: config.url || '',
                        headers: config.headers || {},
                      }
                  ),
                  env: config.env || {},
                  alwaysAllow: config.alwaysAllow || [],
                };
                mcpsToImport.push(mcp);
              } catch (error) {
                errors.push(`Failed to import ${name}: ${(error as Error).message}`);
              }
            });
          } else if (Array.isArray(parsedData)) {
            // Direct MCP array format
            mcpsToImport = parsedData;
          }

          // Add imported MCPs to store
          const existingMCPs = get().mcps;
          const existingNames = new Set(existingMCPs.map(mcp => mcp.name));

          mcpsToImport.forEach(mcp => {
            if (existingNames.has(mcp.name)) {
              // Update existing
              get().updateMCP(
                existingMCPs.find(existing => existing.name === mcp.name)!.id,
                mcp
              );
              mcpsUpdated++;
            } else {
              // Add new
              get().addMCP(mcp);
              mcpsAdded++;
            }
          });

          return { success: true, mcpsAdded, mcpsUpdated, errors };
        } catch (error) {
          return { 
            success: false, 
            mcpsAdded: 0, 
            mcpsUpdated: 0, 
            errors: [(error as Error).message] 
          };
        }
      },

      exportMCPs: (ids, format = 'universal') => {
        const mcpsToExport = ids 
          ? get().mcps.filter(mcp => ids.includes(mcp.id))
          : get().mcps.filter(mcp => !mcp.disabled);

        const mcpServers: Record<string, any> = {};

        mcpsToExport.forEach(mcp => {
          const config: any = {};

          // Handle different transport types
          if (mcp.type === 'http' || mcp.type === 'sse') {
            // HTTP/SSE server configuration
            if (mcp.url) {
              config.url = mcp.url;
            }
            if (mcp.headers && Object.keys(mcp.headers).length > 0) {
              config.headers = mcp.headers;
            }
            if (mcp.type !== 'http') {
              config.type = mcp.type;
            }
          } else {
            // Stdio server configuration (default)
            if (mcp.command) {
              config.command = mcp.command;
            }
            if (mcp.args && mcp.args.length > 0) {
              config.args = mcp.args;
            }
          }

          // Common fields for all types
          if (mcp.env && Object.keys(mcp.env).length > 0) {
            config.env = mcp.env;
          }
          if (mcp.alwaysAllow && mcp.alwaysAllow.length > 0) {
            config.alwaysAllow = mcp.alwaysAllow;
          }

          // Format-specific adjustments
          if (format === 'claude') {
            if (mcp.disabled) config.disabled = true;
          } else if (format === 'gemini') {
            // Gemini format specifics
          }

          // Only add type field if it's not the default for the configuration
          if ((mcp.type === 'http' || mcp.type === 'sse') && mcp.url) {
            // For HTTP/SSE with URL, only add type if it's SSE (HTTP is default)
            if (mcp.type === 'sse') {
              config.type = mcp.type;
            }
          } else if (mcp.type && mcp.type !== 'stdio') {
            // For other types, include if not default stdio
            config.type = mcp.type;
          }

          mcpServers[mcp.name] = config;
        });

        return { mcpServers };
      },

      exportProfile: (profileId) => {
        const profile = get().profiles.find(p => p.id === profileId);
        if (!profile) throw new Error('Profile not found');

        const mcpsInProfile = get().mcps.filter(mcp => profile.mcpIds.includes(mcp.id));
        return {
          profile: {
            name: profile.name,
            description: profile.description,
            createdAt: profile.createdAt,
          },
          mcps: mcpsInProfile
        };
      },

      importProfile: async (data) => {
        const parsedData = JSON.parse(data);
        if (!parsedData.profile || !parsedData.mcps) {
          throw new Error('Invalid profile format');
        }

        // Import MCPs first
        const importResult = await get().importMCPs(JSON.stringify(parsedData.mcps));
        if (!importResult.success) {
          throw new Error('Failed to import profile MCPs');
        }

        // Create profile
        const mcpIds = parsedData.mcps.map((mcp: MCP) => mcp.id);
        await get().createProfile({
          name: parsedData.profile.name,
          description: parsedData.profile.description,
          mcpIds,
          isDefault: false
        });
      },

      // Backup Operations
      createBackup: async (description) => {
        return await storage.createBackup(description);
      },

      restoreBackup: async (backupId) => {
        await storage.restoreFromBackup(backupId);
        await get().loadData();
      },

      getBackups: () => {
        return storage.getBackups();
      },

      // Utility Operations
      searchMCPs: (query) => {
        const lowercaseQuery = query.toLowerCase();
        return get().mcps.filter(mcp =>
          mcp.name.toLowerCase().includes(lowercaseQuery) ||
          mcp.description?.toLowerCase().includes(lowercaseQuery) ||
          mcp.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
          mcp.category.toLowerCase().includes(lowercaseQuery)
        );
      },

      getFilteredMCPs: () => {
        let filtered = [...get().mcps];
        const { search, category, status, tags } = get().filters;

        if (search) {
          filtered = get().searchMCPs(search);
        }

        if (category) {
          filtered = filtered.filter(mcp => mcp.category === category);
        }

        if (status !== 'all') {
          filtered = filtered.filter(mcp => 
            status === 'enabled' ? !mcp.disabled : mcp.disabled
          );
        }

        if (tags.length > 0) {
          filtered = filtered.filter(mcp =>
            tags.some(tag => mcp.tags.includes(tag))
          );
        }

        return filtered;
      },

      getMCPsByCategory: (category) => {
        return get().mcps.filter(mcp => mcp.category === category);
      },

      incrementUsage: async (id) => {
        const mcp = get().mcps.find(m => m.id === id);
        if (mcp) {
          await get().updateMCP(id, {
            usageCount: mcp.usageCount + 1,
            lastUsed: new Date()
          });
        }
      },

      // Data Operations
      loadData: async () => {
        set({ isLoading: true, error: null });
        try {
          const [mcps, profiles, settings] = await Promise.all([
            storage.getMCPs(),
            storage.getProfilesAsync ? storage.getProfilesAsync() : Promise.resolve(storage.getProfiles()),
            Promise.resolve(storage.getSettings())
          ]);
          
          set({ mcps, profiles, settings });
          
          // Initialize default profile if needed and there are MCPs
          if (profiles.length === 0 && mcps.length > 0) {
            await get().createProfile({
              name: 'Default Profile',
              description: 'Automatically created default profile with all your MCPs',
              mcpIds: mcps.map(mcp => mcp.id),
              isDefault: true
            });
          }
          
          // Set default profile if specified in settings
          if (settings.defaultProfile && profiles.length > 0) {
            const defaultProfile = profiles.find(p => p.id === settings.defaultProfile);
            if (defaultProfile) {
              set({ selectedProfile: defaultProfile });
            }
          }
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      saveData: async () => {
        set({ isLoading: true, error: null });
        try {
          const { mcps, profiles, settings } = get();
          await Promise.all([
            storage.saveMCPs(mcps),
            storage.saveProfilesAsync ? storage.saveProfilesAsync(profiles) : Promise.resolve(storage.saveProfiles(profiles)),
            Promise.resolve(storage.saveSettings(settings))
          ]);
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      clearAllData: async () => {
        set({ isLoading: true, error: null });
        try {
          storage.clearAll();
          set({
            mcps: [],
            profiles: [],
            settings: {
              theme: 'system',
              autoBackup: true,
              encryptionEnabled: true,
              syncEnabled: false,
              exportFormat: 'universal',
              categories: []
            },
            filters: initialFilters,
            bulkActions: initialBulkActions,
            selectedProfile: null
          });
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    { name: 'mcp-store' }
  )
);