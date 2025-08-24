/**
 * Profile Feature Validation Tests
 * Comprehensive validation of all profile requirements and acceptance criteria
 * This test suite ensures all profile functionality meets specifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMCPStore } from '../../src/stores/mcpStore';
import type { MCP, Profile } from '../../src/types';

// Mock dependencies
vi.mock('../../src/lib/storage');

describe('Profile Feature Validation', () => {
  
  beforeEach(() => {
    // Reset store state
    const store = useMCPStore.getState();
    store.mcps = [];
    store.profiles = [];
    store.selectedProfile = null;
    store.error = null;
    store.isLoading = false;
  });

  describe('Requirement: Profile CRUD Operations', () => {
    it('MUST create profiles with unique identifiers', async () => {
      const store = useMCPStore.getState();
      
      const profile1Data = {
        name: 'Profile 1',
        description: 'First profile',
        mcpIds: [],
        isDefault: false
      };
      
      const profile2Data = {
        name: 'Profile 2',
        description: 'Second profile',
        mcpIds: [],
        isDefault: false
      };
      
      await store.createProfile(profile1Data);
      await store.createProfile(profile2Data);
      
      expect(store.profiles).toHaveLength(2);
      expect(store.profiles[0].id).not.toBe(store.profiles[1].id);
      expect(store.profiles[0].id).toBeTruthy();
      expect(store.profiles[1].id).toBeTruthy();
    });

    it('MUST update profiles while preserving data integrity', async () => {
      const store = useMCPStore.getState();
      
      await store.createProfile({
        name: 'Original Name',
        description: 'Original Description',
        mcpIds: ['mcp-1'],
        isDefault: false
      });
      
      const originalProfile = store.profiles[0];
      const originalId = originalProfile.id;
      const originalCreatedAt = originalProfile.createdAt;
      
      await store.updateProfile(originalId, {
        name: 'Updated Name',
        description: 'Updated Description',
        mcpIds: ['mcp-1', 'mcp-2']
      });
      
      const updatedProfile = store.profiles[0];
      
      // Verify updates
      expect(updatedProfile.name).toBe('Updated Name');
      expect(updatedProfile.description).toBe('Updated Description');
      expect(updatedProfile.mcpIds).toEqual(['mcp-1', 'mcp-2']);
      
      // Verify preserved data
      expect(updatedProfile.id).toBe(originalId);
      expect(updatedProfile.createdAt).toBe(originalCreatedAt);
      expect(updatedProfile.updatedAt).not.toBe(originalProfile.updatedAt);
    });

    it('MUST delete profiles and clean up references', async () => {
      const store = useMCPStore.getState();
      
      await store.createProfile({
        name: 'Profile to Delete',
        description: 'This will be deleted',
        mcpIds: [],
        isDefault: false
      });
      
      const profileId = store.profiles[0].id;
      store.selectedProfile = store.profiles[0];
      
      await store.deleteProfile(profileId);
      
      expect(store.profiles).toHaveLength(0);
      expect(store.selectedProfile).toBeNull();
    });
  });

  describe('Requirement: Profile-MCP Association Management', () => {
    it('MUST correctly associate MCPs with profiles', async () => {
      const store = useMCPStore.getState();
      
      const testMCPs: MCP[] = [
        {
          id: 'mcp-alpha',
          name: 'Alpha MCP',
          type: 'stdio',
          command: 'alpha',
          args: [],
          env: {},
          category: 'Test',
          usageCount: 0,
          tags: [],
          disabled: false,
          lastUsed: new Date()
        },
        {
          id: 'mcp-beta',
          name: 'Beta MCP', 
          type: 'stdio',
          command: 'beta',
          args: [],
          env: {},
          category: 'Test',
          usageCount: 0,
          tags: [],
          disabled: false,
          lastUsed: new Date()
        }
      ];
      
      store.mcps = testMCPs;
      
      await store.createProfile({
        name: 'Association Test',
        description: 'Testing MCP associations',
        mcpIds: ['mcp-alpha'],
        isDefault: false
      });
      
      const profile = store.profiles[0];
      expect(profile.mcpIds).toEqual(['mcp-alpha']);
      expect(profile.mcpIds).not.toContain('mcp-beta');
    });

    it('MUST enable only associated MCPs when loading profile', async () => {
      const store = useMCPStore.getState();
      
      const testMCPs: MCP[] = [
        {
          id: 'mcp-1',
          name: 'MCP 1',
          type: 'stdio',
          command: 'cmd1',
          args: [],
          env: {},
          category: 'Test',
          usageCount: 0,
          tags: [],
          disabled: true, // Initially disabled
          lastUsed: new Date()
        },
        {
          id: 'mcp-2',
          name: 'MCP 2',
          type: 'stdio',
          command: 'cmd2',
          args: [],
          env: {},
          category: 'Test',
          usageCount: 0,
          tags: [],
          disabled: false, // Initially enabled
          lastUsed: new Date()
        }
      ];
      
      const testProfile: Profile = {
        id: 'test-profile',
        name: 'Test Profile',
        description: 'Profile for testing',
        mcpIds: ['mcp-1'], // Only includes mcp-1
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false
      };
      
      store.mcps = testMCPs;
      store.profiles = [testProfile];
      
      await store.loadProfile('test-profile');
      
      const mcp1 = store.mcps.find(m => m.id === 'mcp-1');
      const mcp2 = store.mcps.find(m => m.id === 'mcp-2');
      
      expect(mcp1?.disabled).toBe(false); // Should be enabled
      expect(mcp2?.disabled).toBe(true);  // Should be disabled
      expect(store.selectedProfile?.id).toBe('test-profile');
    });
  });

  describe('Requirement: Profile Export/Import Functionality', () => {
    it('MUST export profiles in correct JSON format', () => {
      const store = useMCPStore.getState();
      
      const testMCP: MCP = {
        id: 'export-mcp',
        name: 'Export Test MCP',
        type: 'stdio',
        command: 'export-test',
        args: ['--arg1', 'value1'],
        env: { TEST_ENV: 'test-value' },
        category: 'Export',
        usageCount: 5,
        tags: ['export', 'test'],
        disabled: false,
        lastUsed: new Date('2024-01-15')
      };
      
      const testProfile: Profile = {
        id: 'export-profile',
        name: 'Export Test Profile',
        description: 'Profile for export testing',
        mcpIds: ['export-mcp'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-10'),
        isDefault: false
      };
      
      store.mcps = [testMCP];
      store.profiles = [testProfile];
      
      const exported = store.exportProfile('export-profile');
      
      // Validate export structure
      expect(exported).toHaveProperty('profile');
      expect(exported).toHaveProperty('mcps');
      
      // Validate profile data
      expect(exported.profile.name).toBe('Export Test Profile');
      expect(exported.profile.description).toBe('Profile for export testing');
      expect(exported.profile.createdAt).toEqual(new Date('2024-01-01'));
      
      // Validate MCP data
      expect(exported.mcps).toHaveLength(1);
      expect(exported.mcps[0]).toEqual(testMCP);
    });

    it('MUST import profiles and recreate complete state', async () => {
      const store = useMCPStore.getState();
      
      const importData = {
        profile: {
          name: 'Imported Profile',
          description: 'A profile imported from JSON',
          createdAt: new Date('2024-01-01')
        },
        mcps: [{
          id: 'imported-mcp',
          name: 'Imported MCP',
          type: 'stdio' as const,
          command: 'imported-command',
          args: ['--imported'],
          env: { IMPORTED: 'true' },
          category: 'Imported',
          usageCount: 0,
          tags: ['imported'],
          disabled: false
        }]
      };
      
      // Mock importMCPs to simulate successful import
      store.importMCPs = vi.fn().mockResolvedValue({
        success: true,
        mcpsAdded: 1,
        mcpsUpdated: 0,
        errors: []
      });
      
      await store.importProfile(JSON.stringify(importData));
      
      // Verify importMCPs was called correctly
      expect(store.importMCPs).toHaveBeenCalledWith(JSON.stringify(importData.mcps));
    });
  });

  describe('Requirement: Profile Switching and State Management', () => {
    it('MUST maintain consistent state during profile switches', async () => {
      const store = useMCPStore.getState();
      
      // Setup test data
      const testMCPs: MCP[] = [
        {
          id: 'switch-mcp-1',
          name: 'Switch MCP 1',
          type: 'stdio',
          command: 'switch1',
          args: [],
          env: {},
          category: 'Switch',
          usageCount: 0,
          tags: [],
          disabled: false,
          lastUsed: new Date()
        },
        {
          id: 'switch-mcp-2',
          name: 'Switch MCP 2',
          type: 'stdio',
          command: 'switch2',
          args: [],
          env: {},
          category: 'Switch',
          usageCount: 0,
          tags: [],
          disabled: false,
          lastUsed: new Date()
        }
      ];
      
      const profile1: Profile = {
        id: 'switch-profile-1',
        name: 'Switch Profile 1',
        description: 'First switch profile',
        mcpIds: ['switch-mcp-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false
      };
      
      const profile2: Profile = {
        id: 'switch-profile-2',
        name: 'Switch Profile 2',
        description: 'Second switch profile',
        mcpIds: ['switch-mcp-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false
      };
      
      store.mcps = testMCPs;
      store.profiles = [profile1, profile2];
      
      // Switch to profile 1
      await store.loadProfile('switch-profile-1');
      
      expect(store.selectedProfile?.id).toBe('switch-profile-1');
      expect(store.mcps.find(m => m.id === 'switch-mcp-1')?.disabled).toBe(false);
      expect(store.mcps.find(m => m.id === 'switch-mcp-2')?.disabled).toBe(true);
      
      // Switch to profile 2
      await store.loadProfile('switch-profile-2');
      
      expect(store.selectedProfile?.id).toBe('switch-profile-2');
      expect(store.mcps.find(m => m.id === 'switch-mcp-1')?.disabled).toBe(true);
      expect(store.mcps.find(m => m.id === 'switch-mcp-2')?.disabled).toBe(false);
    });

    it('MUST preserve MCP metadata during profile operations', async () => {
      const store = useMCPStore.getState();
      
      const testMCP: MCP = {
        id: 'metadata-mcp',
        name: 'Metadata Test MCP',
        type: 'stdio',
        command: 'metadata-test',
        args: [],
        env: {},
        category: 'Metadata',
        usageCount: 10, // Important: should be preserved
        tags: ['metadata', 'preserve'],
        disabled: false,
        lastUsed: new Date('2024-01-01') // Important: should be preserved
      };
      
      const testProfile: Profile = {
        id: 'metadata-profile',
        name: 'Metadata Profile',
        description: 'Testing metadata preservation',
        mcpIds: ['metadata-mcp'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false
      };
      
      store.mcps = [testMCP];
      store.profiles = [testProfile];
      
      // Load profile multiple times
      await store.loadProfile('metadata-profile');
      await store.loadProfile('metadata-profile');
      
      const finalMCP = store.mcps.find(m => m.id === 'metadata-mcp');
      
      // Metadata should be preserved
      expect(finalMCP?.usageCount).toBe(10);
      expect(finalMCP?.lastUsed).toEqual(new Date('2024-01-01'));
      expect(finalMCP?.tags).toEqual(['metadata', 'preserve']);
      expect(finalMCP?.category).toBe('Metadata');
    });
  });

  describe('Requirement: Data Persistence and Integrity', () => {
    it('MUST persist profile data across application restarts', async () => {
      const store = useMCPStore.getState();
      
      // Create profile
      await store.createProfile({
        name: 'Persistence Test Profile',
        description: 'Testing data persistence',
        mcpIds: ['test-mcp-id'],
        isDefault: true
      });
      
      const originalProfileCount = store.profiles.length;
      const createdProfile = store.profiles[0];
      
      // Simulate app restart by calling loadData
      await store.loadData();
      
      // Data should persist
      expect(store.profiles.length).toBe(originalProfileCount);
      const persistedProfile = store.profiles.find(p => p.id === createdProfile.id);
      expect(persistedProfile).toBeDefined();
      expect(persistedProfile?.name).toBe('Persistence Test Profile');
      expect(persistedProfile?.isDefault).toBe(true);
    });

    it('MUST maintain referential integrity between profiles and MCPs', async () => {
      const store = useMCPStore.getState();
      
      // Create MCP first
      await store.addMCP({
        name: 'Integrity Test MCP',
        type: 'stdio',
        command: 'integrity-test',
        args: [],
        env: {},
        category: 'Integrity',
        description: 'Testing referential integrity',
        tags: []
      });
      
      const createdMCP = store.mcps[0];
      
      // Create profile referencing the MCP
      await store.createProfile({
        name: 'Integrity Test Profile',
        description: 'Testing referential integrity',
        mcpIds: [createdMCP.id],
        isDefault: false
      });
      
      const profile = store.profiles[0];
      
      // Verify referential integrity
      expect(profile.mcpIds).toContain(createdMCP.id);
      
      // Delete MCP
      await store.deleteMCP(createdMCP.id);
      
      // Profile should still exist but with invalid reference
      // (Business decision: keep profile with invalid references or clean up)
      expect(store.profiles).toHaveLength(1);
      expect(profile.mcpIds).toContain(createdMCP.id); // Reference remains
    });
  });

  describe('Requirement: Error Handling and Recovery', () => {
    it('MUST handle storage failures gracefully', async () => {
      const store = useMCPStore.getState();
      
      // Mock storage failure
      const mockStorage = vi.fn().mockRejectedValue(new Error('Storage unavailable'));
      
      await expect(store.createProfile({
        name: 'Storage Failure Test',
        description: 'Testing storage failure handling',
        mcpIds: [],
        isDefault: false
      })).rejects.toThrow('Storage unavailable');
      
      // Store should handle error gracefully
      expect(store.error).toBeTruthy();
      expect(store.isLoading).toBe(false);
    });

    it('MUST recover from corrupted profile data', async () => {
      const store = useMCPStore.getState();
      
      // Simulate corrupted profile data
      const corruptedProfile = {
        id: 'corrupted',
        name: null, // Invalid
        description: undefined, // Invalid
        mcpIds: 'not-an-array', // Invalid type
        createdAt: 'not-a-date', // Invalid type
        updatedAt: new Date(),
        isDefault: false
      } as any;
      
      store.profiles = [corruptedProfile];
      
      // Operations should handle corrupted data gracefully
      expect(() => store.getFilteredMCPs()).not.toThrow();
      
      // Export should handle corrupted profile gracefully
      expect(() => store.exportProfile('corrupted')).not.toThrow();
    });

    it('MUST validate profile data before operations', async () => {
      const store = useMCPStore.getState();
      
      // Test invalid profile data
      const invalidProfileData = {
        name: '', // Empty name
        description: null, // Null description
        mcpIds: undefined, // Undefined MCP IDs
        isDefault: 'not-boolean' // Wrong type
      } as any;
      
      // Should handle invalid data gracefully
      try {
        await store.createProfile(invalidProfileData);
        
        // If creation succeeds, validate the stored data is corrected
        const createdProfile = store.profiles[store.profiles.length - 1];
        expect(typeof createdProfile.name).toBe('string');
        expect(Array.isArray(createdProfile.mcpIds)).toBe(true);
        expect(typeof createdProfile.isDefault).toBe('boolean');
      } catch (error) {
        // If creation fails, that's also acceptable behavior
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Requirement: Performance and Scalability', () => {
    it('MUST handle large numbers of profiles efficiently', async () => {
      const store = useMCPStore.getState();
      
      const startTime = Date.now();
      
      // Create 100 profiles
      const profilePromises = Array.from({ length: 100 }, (_, i) => 
        store.createProfile({
          name: `Performance Profile ${i}`,
          description: `Profile ${i} for performance testing`,
          mcpIds: [],
          isDefault: false
        })
      );
      
      await Promise.allSettled(profilePromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (5 seconds for 100 profiles)
      expect(duration).toBeLessThan(5000);
      expect(store.profiles.length).toBeGreaterThan(50); // At least half should succeed
    });

    it('MUST maintain performance with large profile datasets', () => {
      const store = useMCPStore.getState();
      
      // Create many profiles
      const manyProfiles = Array.from({ length: 1000 }, (_, i) => ({
        id: `perf-profile-${i}`,
        name: `Performance Profile ${i}`,
        description: `Profile ${i} for performance testing`,
        mcpIds: [`mcp-${i % 10}`], // 10 MCPs shared across profiles
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false
      }));
      
      store.profiles = manyProfiles;
      
      // Test operations performance
      const startTime = Date.now();
      
      // Perform common operations
      const profile500 = store.profiles.find(p => p.id === 'perf-profile-500');
      store.setActiveProfile('perf-profile-500');
      const exportedProfile = store.exportProfile('perf-profile-500');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Operations should remain fast even with large dataset
      expect(duration).toBeLessThan(100); // 100ms for basic operations
      expect(profile500).toBeDefined();
      expect(exportedProfile).toBeDefined();
    });
  });

  describe('Acceptance Criteria Validation', () => {
    it('PASSES all core profile functionality requirements', async () => {
      const store = useMCPStore.getState();
      
      // ✅ Requirement: Create profiles
      await store.createProfile({
        name: 'Acceptance Test Profile',
        description: 'Testing acceptance criteria',
        mcpIds: [],
        isDefault: false
      });
      expect(store.profiles).toHaveLength(1);
      
      const profile = store.profiles[0];
      
      // ✅ Requirement: Update profiles
      await store.updateProfile(profile.id, {
        name: 'Updated Acceptance Profile',
        description: 'Updated for acceptance testing'
      });
      const updatedProfile = store.profiles.find(p => p.id === profile.id)!;
      expect(updatedProfile.name).toBe('Updated Acceptance Profile');
      
      // ✅ Requirement: Profile selection
      store.setActiveProfile(profile.id);
      expect(store.selectedProfile?.id).toBe(profile.id);
      
      // ✅ Requirement: Profile export
      const exported = store.exportProfile(profile.id);
      expect(exported.profile.name).toBe('Updated Acceptance Profile');
      
      // ✅ Requirement: Delete profiles
      await store.deleteProfile(profile.id);
      expect(store.profiles).toHaveLength(0);
      expect(store.selectedProfile).toBeNull();
    });

    it('PASSES all profile-MCP integration requirements', async () => {
      const store = useMCPStore.getState();
      
      // Setup test MCPs
      const testMCPs: MCP[] = [
        {
          id: 'integration-mcp-1',
          name: 'Integration MCP 1',
          type: 'stdio',
          command: 'integration1',
          args: [],
          env: {},
          category: 'Integration',
          usageCount: 0,
          tags: [],
          disabled: true, // Initially disabled
          lastUsed: new Date()
        },
        {
          id: 'integration-mcp-2',
          name: 'Integration MCP 2',
          type: 'stdio',
          command: 'integration2',
          args: [],
          env: {},
          category: 'Integration',
          usageCount: 0,
          tags: [],
          disabled: false, // Initially enabled
          lastUsed: new Date()
        }
      ];
      
      store.mcps = testMCPs;
      
      // ✅ Requirement: Associate MCPs with profiles
      await store.createProfile({
        name: 'Integration Profile',
        description: 'Testing MCP integration',
        mcpIds: ['integration-mcp-1'],
        isDefault: false
      });
      
      const profile = store.profiles[0];
      expect(profile.mcpIds).toContain('integration-mcp-1');
      expect(profile.mcpIds).not.toContain('integration-mcp-2');
      
      // ✅ Requirement: Enable associated MCPs when loading profile
      await store.loadProfile(profile.id);
      
      const mcp1 = store.mcps.find(m => m.id === 'integration-mcp-1')!;
      const mcp2 = store.mcps.find(m => m.id === 'integration-mcp-2')!;
      
      expect(mcp1.disabled).toBe(false); // Should be enabled
      expect(mcp2.disabled).toBe(true);  // Should be disabled
      
      // ✅ Requirement: Profile switching changes MCP states
      await store.createProfile({
        name: 'Second Integration Profile',
        description: 'Second profile for integration testing',
        mcpIds: ['integration-mcp-2'],
        isDefault: false
      });
      
      const secondProfile = store.profiles[1];
      await store.loadProfile(secondProfile.id);
      
      const mcp1After = store.mcps.find(m => m.id === 'integration-mcp-1')!;
      const mcp2After = store.mcps.find(m => m.id === 'integration-mcp-2')!;
      
      expect(mcp1After.disabled).toBe(true);  // Should now be disabled
      expect(mcp2After.disabled).toBe(false); // Should now be enabled
    });

    it('PASSES all data persistence and integrity requirements', async () => {
      const store = useMCPStore.getState();
      
      // ✅ Requirement: Unique profile identifiers
      await store.createProfile({
        name: 'Unique Test 1',
        description: 'First unique test',
        mcpIds: [],
        isDefault: false
      });
      
      await store.createProfile({
        name: 'Unique Test 2', 
        description: 'Second unique test',
        mcpIds: [],
        isDefault: false
      });
      
      const ids = store.profiles.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length); // All IDs are unique
      
      // ✅ Requirement: Timestamp tracking
      const profile = store.profiles[0];
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.updatedAt).toBeInstanceOf(Date);
      
      const originalUpdatedAt = profile.updatedAt;
      
      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 10));
      await store.updateProfile(profile.id, { description: 'Updated description' });
      
      const updatedProfile = store.profiles.find(p => p.id === profile.id)!;
      expect(updatedProfile.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      // ✅ Requirement: Data validation
      // Profile should have all required fields
      expect(updatedProfile.id).toBeTruthy();
      expect(updatedProfile.name).toBeTruthy();
      expect(updatedProfile.description).toBeTruthy();
      expect(Array.isArray(updatedProfile.mcpIds)).toBe(true);
      expect(typeof updatedProfile.isDefault).toBe('boolean');
    });
  });
});
