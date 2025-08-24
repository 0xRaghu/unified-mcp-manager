/**
 * Comprehensive Unit Tests for Profile Store Operations
 * Testing all profile-related functionality including CRUD operations,
 * profile loading, MCP associations, and edge cases
 */

import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { useMCPStore } from '../../src/stores/mcpStore';
import { storage } from '../../src/lib/storage';
import type { MCP, Profile } from '../../src/types';

// Mock the storage module
vi.mock('../../src/lib/storage', () => ({
  storage: {
    getMCPs: vi.fn(),
    saveMCPs: vi.fn(),
    getProfiles: vi.fn(),
    saveProfiles: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    createBackup: vi.fn(),
    restoreFromBackup: vi.fn(),
    getBackups: vi.fn(),
    clearAll: vi.fn()
  }
}));

const mockStorage = storage as {
  getMCPs: MockedFunction<any>;
  saveMCPs: MockedFunction<any>;
  getProfiles: MockedFunction<any>;
  saveProfiles: MockedFunction<any>;
  getSettings: MockedFunction<any>;
  saveSettings: MockedFunction<any>;
  createBackup: MockedFunction<any>;
  restoreFromBackup: MockedFunction<any>;
  getBackups: MockedFunction<any>;
  clearAll: MockedFunction<any>;
};

// Sample test data
const mockMCPs: MCP[] = [
  {
    id: 'mcp-1',
    name: 'Test MCP 1',
    type: 'stdio',
    command: 'node test1.js',
    args: [],
    env: {},
    category: 'Testing',
    usageCount: 0,
    tags: ['test'],
    disabled: false,
    lastUsed: new Date()
  },
  {
    id: 'mcp-2',
    name: 'Test MCP 2',
    type: 'http',
    url: 'http://localhost:3000',
    headers: {},
    category: 'Testing',
    usageCount: 5,
    tags: ['test', 'http'],
    disabled: true,
    lastUsed: new Date()
  },
  {
    id: 'mcp-3',
    name: 'Test MCP 3',
    type: 'sse',
    url: 'http://localhost:4000/sse',
    headers: { 'Authorization': 'Bearer test' },
    category: 'Development',
    usageCount: 2,
    tags: ['sse', 'streaming'],
    disabled: false,
    lastUsed: new Date()
  }
];

const mockProfiles: Profile[] = [
  {
    id: 'profile-1',
    name: 'Development Profile',
    description: 'MCPs for development work',
    mcpIds: ['mcp-1', 'mcp-3'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    isDefault: true
  },
  {
    id: 'profile-2',
    name: 'Testing Profile',
    description: 'MCPs for testing purposes',
    mcpIds: ['mcp-1', 'mcp-2'],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-04'),
    isDefault: false
  }
];

describe('Profile Store Operations', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockStorage.getMCPs.mockResolvedValue(mockMCPs);
    mockStorage.getProfiles.mockReturnValue(mockProfiles);
    mockStorage.getSettings.mockReturnValue({
      theme: 'system',
      autoBackup: true,
      encryptionEnabled: true,
      syncEnabled: false,
      exportFormat: 'universal',
      categories: []
    });
    mockStorage.saveMCPs.mockResolvedValue(undefined);
    mockStorage.saveProfiles.mockReturnValue(undefined);
    mockStorage.createBackup.mockResolvedValue({ id: 'backup-1', timestamp: new Date(), data: {} as any });
  });

  describe('Profile Creation', () => {
    it('should create a new profile successfully', async () => {
      const store = useMCPStore.getState();
      
      const newProfileData = {
        name: 'New Test Profile',
        description: 'A new profile for testing',
        mcpIds: ['mcp-1', 'mcp-2'],
        isDefault: false
      };

      await store.createProfile(newProfileData);

      expect(mockStorage.saveProfiles).toHaveBeenCalled();
      const savedProfiles = mockStorage.saveProfiles.mock.calls[0][0];
      expect(savedProfiles).toHaveLength(mockProfiles.length + 1);
      
      const newProfile = savedProfiles.find((p: Profile) => p.name === 'New Test Profile');
      expect(newProfile).toBeDefined();
      expect(newProfile.id).toBeDefined();
      expect(newProfile.createdAt).toBeInstanceOf(Date);
      expect(newProfile.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique ID for new profile', async () => {
      const store = useMCPStore.getState();
      
      const profileData1 = {
        name: 'Profile 1',
        description: 'First profile',
        mcpIds: ['mcp-1'],
        isDefault: false
      };
      
      const profileData2 = {
        name: 'Profile 2',
        description: 'Second profile',
        mcpIds: ['mcp-2'],
        isDefault: false
      };

      await store.createProfile(profileData1);
      await store.createProfile(profileData2);

      const allCalls = mockStorage.saveProfiles.mock.calls;
      const profile1 = allCalls[0][0].find((p: Profile) => p.name === 'Profile 1');
      const profile2 = allCalls[1][0].find((p: Profile) => p.name === 'Profile 2');
      
      expect(profile1.id).not.toBe(profile2.id);
    });

    it('should handle profile creation with empty MCP list', async () => {
      const store = useMCPStore.getState();
      
      const emptyProfileData = {
        name: 'Empty Profile',
        description: 'Profile with no MCPs',
        mcpIds: [],
        isDefault: false
      };

      await store.createProfile(emptyProfileData);
      
      expect(mockStorage.saveProfiles).toHaveBeenCalled();
      const savedProfiles = mockStorage.saveProfiles.mock.calls[0][0];
      const emptyProfile = savedProfiles.find((p: Profile) => p.name === 'Empty Profile');
      expect(emptyProfile.mcpIds).toHaveLength(0);
    });
  });

  describe('Profile Updates', () => {
    it('should update profile successfully', async () => {
      const store = useMCPStore.getState();
      store.profiles = [...mockProfiles]; // Initialize store state
      
      const updates = {
        name: 'Updated Development Profile',
        description: 'Updated description',
        mcpIds: ['mcp-1']
      };

      await store.updateProfile('profile-1', updates);

      expect(mockStorage.saveProfiles).toHaveBeenCalled();
      const savedProfiles = mockStorage.saveProfiles.mock.calls[0][0];
      const updatedProfile = savedProfiles.find((p: Profile) => p.id === 'profile-1');
      
      expect(updatedProfile.name).toBe('Updated Development Profile');
      expect(updatedProfile.description).toBe('Updated description');
      expect(updatedProfile.mcpIds).toEqual(['mcp-1']);
      expect(updatedProfile.updatedAt).toBeInstanceOf(Date);
    });

    it('should preserve other profiles when updating one', async () => {
      const store = useMCPStore.getState();
      store.profiles = [...mockProfiles];
      
      await store.updateProfile('profile-1', { name: 'Updated Name' });

      const savedProfiles = mockStorage.saveProfiles.mock.calls[0][0];
      expect(savedProfiles).toHaveLength(mockProfiles.length);
      
      const unchangedProfile = savedProfiles.find((p: Profile) => p.id === 'profile-2');
      expect(unchangedProfile.name).toBe('Testing Profile');
    });

    it('should handle updating non-existent profile gracefully', async () => {
      const store = useMCPStore.getState();
      store.profiles = [...mockProfiles];
      
      await store.updateProfile('non-existent', { name: 'New Name' });

      const savedProfiles = mockStorage.saveProfiles.mock.calls[0][0];
      expect(savedProfiles).toHaveLength(mockProfiles.length);
      // No profile should be changed
      expect(savedProfiles).toEqual(expect.arrayContaining(mockProfiles.map(p => expect.objectContaining(p))));
    });
  });

  describe('Profile Deletion', () => {
    it('should delete profile successfully', async () => {
      const store = useMCPStore.getState();
      store.profiles = [...mockProfiles];
      
      await store.deleteProfile('profile-1');

      expect(mockStorage.saveProfiles).toHaveBeenCalled();
      const savedProfiles = mockStorage.saveProfiles.mock.calls[0][0];
      expect(savedProfiles).toHaveLength(mockProfiles.length - 1);
      expect(savedProfiles.find((p: Profile) => p.id === 'profile-1')).toBeUndefined();
    });

    it('should clear selectedProfile if deleted profile was selected', async () => {
      const store = useMCPStore.getState();
      store.profiles = [...mockProfiles];
      store.selectedProfile = mockProfiles[0]; // Set selected profile
      
      await store.deleteProfile('profile-1');
      
      expect(store.selectedProfile).toBeNull();
    });

    it('should not affect selectedProfile if different profile was deleted', async () => {
      const store = useMCPStore.getState();
      store.profiles = [...mockProfiles];
      store.selectedProfile = mockProfiles[0]; // Select profile-1
      
      await store.deleteProfile('profile-2'); // Delete profile-2
      
      expect(store.selectedProfile).toBe(mockProfiles[0]);
    });
  });

  describe('Profile Loading and Selection', () => {
    it('should load profile and enable associated MCPs', async () => {
      const store = useMCPStore.getState();
      store.mcps = [...mockMCPs];
      store.profiles = [...mockProfiles];
      
      await store.loadProfile('profile-1'); // MCPs: mcp-1, mcp-3

      expect(mockStorage.saveMCPs).toHaveBeenCalled();
      const savedMCPs = mockStorage.saveMCPs.mock.calls[0][0];
      
      // mcp-1 and mcp-3 should be enabled, mcp-2 should be disabled
      const mcp1 = savedMCPs.find((m: MCP) => m.id === 'mcp-1');
      const mcp2 = savedMCPs.find((m: MCP) => m.id === 'mcp-2');
      const mcp3 = savedMCPs.find((m: MCP) => m.id === 'mcp-3');
      
      expect(mcp1.disabled).toBe(false);
      expect(mcp2.disabled).toBe(true);
      expect(mcp3.disabled).toBe(false);
      
      expect(store.selectedProfile?.id).toBe('profile-1');
    });

    it('should set active profile without loading', () => {
      const store = useMCPStore.getState();
      store.profiles = [...mockProfiles];
      
      store.setActiveProfile('profile-2');
      
      expect(store.selectedProfile?.id).toBe('profile-2');
    });

    it('should clear active profile when setting null', () => {
      const store = useMCPStore.getState();
      store.profiles = [...mockProfiles];
      store.selectedProfile = mockProfiles[0];
      
      store.setActiveProfile(null);
      
      expect(store.selectedProfile).toBeNull();
    });

    it('should handle loading non-existent profile', async () => {
      const store = useMCPStore.getState();
      store.mcps = [...mockMCPs];
      store.profiles = [...mockProfiles];
      
      await store.loadProfile('non-existent');
      
      // Should not call saveMCPs since profile doesn't exist
      expect(mockStorage.saveMCPs).not.toHaveBeenCalled();
    });
  });

  describe('Profile Import/Export', () => {
    it('should export profile with associated MCPs', () => {
      const store = useMCPStore.getState();
      store.mcps = [...mockMCPs];
      store.profiles = [...mockProfiles];
      
      const exported = store.exportProfile('profile-1');
      
      expect(exported.profile).toBeDefined();
      expect(exported.profile.name).toBe('Development Profile');
      expect(exported.mcps).toHaveLength(2); // mcp-1 and mcp-3
      expect(exported.mcps.map((m: MCP) => m.id)).toEqual(expect.arrayContaining(['mcp-1', 'mcp-3']));
    });

    it('should throw error when exporting non-existent profile', () => {
      const store = useMCPStore.getState();
      store.profiles = [...mockProfiles];
      
      expect(() => store.exportProfile('non-existent')).toThrow('Profile not found');
    });

    it('should import profile successfully', async () => {
      const store = useMCPStore.getState();
      // Mock the importMCPs method to return success
      store.importMCPs = vi.fn().mockResolvedValue({ success: true });
      store.createProfile = vi.fn().mockResolvedValue(undefined);
      
      const profileData = {
        profile: {
          name: 'Imported Profile',
          description: 'An imported profile'
        },
        mcps: [mockMCPs[0], mockMCPs[1]]
      };
      
      await store.importProfile(JSON.stringify(profileData));
      
      expect(store.importMCPs).toHaveBeenCalledWith(JSON.stringify(profileData.mcps));
      expect(store.createProfile).toHaveBeenCalledWith({
        name: 'Imported Profile',
        description: 'An imported profile',
        mcpIds: ['mcp-1', 'mcp-2'],
        isDefault: false
      });
    });

    it('should handle invalid profile import format', async () => {
      const store = useMCPStore.getState();
      
      const invalidData = { invalid: 'format' };
      
      await expect(store.importProfile(JSON.stringify(invalidData)))
        .rejects.toThrow('Invalid profile format');
    });

    it('should handle failed MCP import during profile import', async () => {
      const store = useMCPStore.getState();
      store.importMCPs = vi.fn().mockResolvedValue({ success: false });
      
      const profileData = {
        profile: { name: 'Test', description: 'Test' },
        mcps: [mockMCPs[0]]
      };
      
      await expect(store.importProfile(JSON.stringify(profileData)))
        .rejects.toThrow('Failed to import profile MCPs');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle storage errors during profile creation', async () => {
      const store = useMCPStore.getState();
      mockStorage.saveProfiles.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const profileData = {
        name: 'Test Profile',
        description: 'Test',
        mcpIds: [],
        isDefault: false
      };
      
      await expect(store.createProfile(profileData)).rejects.toThrow('Storage error');
      expect(store.error).toBe('Storage error');
    });

    it('should handle very long profile names', async () => {
      const store = useMCPStore.getState();
      
      const longNameProfile = {
        name: 'A'.repeat(1000), // Very long name
        description: 'Test profile with very long name',
        mcpIds: ['mcp-1'],
        isDefault: false
      };
      
      await store.createProfile(longNameProfile);
      
      expect(mockStorage.saveProfiles).toHaveBeenCalled();
      const savedProfiles = mockStorage.saveProfiles.mock.calls[0][0];
      const longNameSaved = savedProfiles.find((p: Profile) => p.name.startsWith('A'));
      expect(longNameSaved.name).toHaveLength(1000);
    });

    it('should handle profile with invalid MCP references', async () => {
      const store = useMCPStore.getState();
      store.mcps = [...mockMCPs];
      store.profiles = [...mockProfiles];
      
      // Create profile with non-existent MCP ID
      const profileWithInvalidMCPs = {
        name: 'Invalid Profile',
        description: 'Profile with invalid MCP references',
        mcpIds: ['mcp-1', 'non-existent-mcp', 'mcp-3'],
        isDefault: false
      };
      
      await store.createProfile(profileWithInvalidMCPs);
      
      // Should still save the profile
      expect(mockStorage.saveProfiles).toHaveBeenCalled();
    });

    it('should handle concurrent profile operations', async () => {
      const store = useMCPStore.getState();
      store.profiles = [...mockProfiles];
      
      // Simulate concurrent operations
      const promises = [
        store.createProfile({ name: 'Profile A', description: 'A', mcpIds: [], isDefault: false }),
        store.createProfile({ name: 'Profile B', description: 'B', mcpIds: [], isDefault: false }),
        store.updateProfile('profile-1', { name: 'Updated Profile 1' }),
        store.deleteProfile('profile-2')
      ];
      
      await Promise.allSettled(promises);
      
      // Should have handled all operations
      expect(mockStorage.saveProfiles).toHaveBeenCalled();
    });
  });

  describe('Profile-MCP Integration', () => {
    it('should correctly identify MCPs in profile', () => {
      const store = useMCPStore.getState();
      store.mcps = [...mockMCPs];
      store.profiles = [...mockProfiles];
      
      const exported = store.exportProfile('profile-1');
      
      expect(exported.mcps).toHaveLength(2);
      expect(exported.mcps.every((mcp: MCP) => ['mcp-1', 'mcp-3'].includes(mcp.id))).toBe(true);
    });

    it('should handle profile with all disabled MCPs', async () => {
      const store = useMCPStore.getState();
      // All MCPs disabled
      const disabledMCPs = mockMCPs.map(mcp => ({ ...mcp, disabled: true }));
      store.mcps = disabledMCPs;
      store.profiles = [...mockProfiles];
      
      await store.loadProfile('profile-1');
      
      // Should still process the profile load
      expect(mockStorage.saveMCPs).toHaveBeenCalled();
    });

    it('should maintain MCP state consistency when switching profiles', async () => {
      const store = useMCPStore.getState();
      store.mcps = [...mockMCPs];
      store.profiles = [...mockProfiles];
      
      // Load first profile
      await store.loadProfile('profile-1'); // Enables mcp-1, mcp-3
      let savedMCPs = mockStorage.saveMCPs.mock.calls[0][0];
      expect(savedMCPs.find((m: MCP) => m.id === 'mcp-1').disabled).toBe(false);
      expect(savedMCPs.find((m: MCP) => m.id === 'mcp-2').disabled).toBe(true);
      
      // Update store state to reflect the change
      store.mcps = savedMCPs;
      
      // Load second profile
      await store.loadProfile('profile-2'); // Enables mcp-1, mcp-2
      savedMCPs = mockStorage.saveMCPs.mock.calls[1][0];
      expect(savedMCPs.find((m: MCP) => m.id === 'mcp-1').disabled).toBe(false);
      expect(savedMCPs.find((m: MCP) => m.id === 'mcp-2').disabled).toBe(false);
      expect(savedMCPs.find((m: MCP) => m.id === 'mcp-3').disabled).toBe(true);
    });
  });
});
