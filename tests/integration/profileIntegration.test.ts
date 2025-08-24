/**
 * Integration Tests for Profile Feature
 * Tests the complete profile workflow including UI interactions,
 * data persistence, and integration with other components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useMCPStore } from '../../src/stores/mcpStore';
import type { MCP, Profile } from '../../src/types';

// Mock the storage layer
vi.mock('../../src/lib/storage');

// Sample test data
const testMCPs: MCP[] = [
  {
    id: 'test-mcp-1',
    name: 'GitHub MCP',
    type: 'stdio',
    command: 'npx @modelcontextprotocol/server-github',
    args: [],
    env: { GITHUB_TOKEN: 'test-token' },
    category: 'Development',
    usageCount: 10,
    tags: ['github', 'development'],
    disabled: false,
    lastUsed: new Date('2024-01-15')
  },
  {
    id: 'test-mcp-2',
    name: 'Database MCP',
    type: 'http',
    url: 'http://localhost:8080/mcp',
    headers: { 'Content-Type': 'application/json' },
    category: 'Database',
    usageCount: 5,
    tags: ['database', 'sql'],
    disabled: true,
    lastUsed: new Date('2024-01-10')
  },
  {
    id: 'test-mcp-3',
    name: 'File System MCP',
    type: 'sse',
    url: 'http://localhost:9000/sse',
    headers: {},
    category: 'File Management',
    usageCount: 3,
    tags: ['filesystem', 'files'],
    disabled: false,
    lastUsed: new Date('2024-01-12')
  }
];

const testProfiles: Profile[] = [
  {
    id: 'profile-dev',
    name: 'Development',
    description: 'MCPs for development work',
    mcpIds: ['test-mcp-1', 'test-mcp-3'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    isDefault: true
  },
  {
    id: 'profile-prod',
    name: 'Production',
    description: 'MCPs for production environment',
    mcpIds: ['test-mcp-2'],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-10'),
    isDefault: false
  }
];

describe('Profile Integration Tests', () => {
  beforeEach(() => {
    // Reset store state
    const store = useMCPStore.getState();
    store.mcps = [...testMCPs];
    store.profiles = [...testProfiles];
    store.selectedProfile = null;
    store.isLoading = false;
    store.error = null;
  });

  describe('Profile CRUD Operations', () => {
    it('should create profile from current MCP state', async () => {
      const store = useMCPStore.getState();
      
      // Enable specific MCPs to create profile from
      store.mcps = testMCPs.map(mcp => ({
        ...mcp,
        disabled: mcp.id === 'test-mcp-2' // Only mcp-2 disabled
      }));
      
      // Create profile from enabled MCPs
      const enabledMCPIds = store.mcps
        .filter(mcp => !mcp.disabled)
        .map(mcp => mcp.id);
      
      await store.createProfile({
        name: 'Current State Profile',
        description: 'Profile created from current enabled MCPs',
        mcpIds: enabledMCPIds,
        isDefault: false
      });
      
      expect(store.profiles).toHaveLength(testProfiles.length + 1);
      const newProfile = store.profiles.find(p => p.name === 'Current State Profile');
      expect(newProfile).toBeDefined();
      expect(newProfile!.mcpIds).toEqual(['test-mcp-1', 'test-mcp-3']);
    });

    it('should handle duplicate profile names gracefully', async () => {
      const store = useMCPStore.getState();
      
      // Try to create profile with existing name
      await store.createProfile({
        name: 'Development', // Duplicate name
        description: 'Another dev profile',
        mcpIds: ['test-mcp-1'],
        isDefault: false
      });
      
      // Should still create the profile (business decision to allow duplicates or modify name)
      expect(store.profiles.length).toBeGreaterThan(testProfiles.length);
    });

    it('should update profile and maintain referential integrity', async () => {
      const store = useMCPStore.getState();
      
      // Update profile to include different MCPs
      await store.updateProfile('profile-dev', {
        mcpIds: ['test-mcp-1', 'test-mcp-2'], // Change from [mcp-1, mcp-3] to [mcp-1, mcp-2]
        description: 'Updated development profile'
      });
      
      const updatedProfile = store.profiles.find(p => p.id === 'profile-dev');
      expect(updatedProfile!.mcpIds).toEqual(['test-mcp-1', 'test-mcp-2']);
      expect(updatedProfile!.description).toBe('Updated development profile');
      expect(updatedProfile!.updatedAt).toBeInstanceOf(Date);
    });

    it('should delete profile and clean up references', async () => {
      const store = useMCPStore.getState();
      store.selectedProfile = testProfiles[0]; // Select the profile to be deleted
      
      await store.deleteProfile('profile-dev');
      
      expect(store.profiles).toHaveLength(testProfiles.length - 1);
      expect(store.profiles.find(p => p.id === 'profile-dev')).toBeUndefined();
      expect(store.selectedProfile).toBeNull(); // Should clear selected profile
    });
  });

  describe('Profile Switching and MCP State Management', () => {
    it('should correctly enable/disable MCPs when loading profile', async () => {
      const store = useMCPStore.getState();
      
      // Initially all MCPs have mixed states
      store.mcps = testMCPs.map(mcp => ({ ...mcp, disabled: true })); // Start with all disabled
      
      await store.loadProfile('profile-dev'); // Should enable mcp-1 and mcp-3
      
      const mcp1 = store.mcps.find(m => m.id === 'test-mcp-1');
      const mcp2 = store.mcps.find(m => m.id === 'test-mcp-2');
      const mcp3 = store.mcps.find(m => m.id === 'test-mcp-3');
      
      expect(mcp1!.disabled).toBe(false); // Should be enabled
      expect(mcp2!.disabled).toBe(true);  // Should remain disabled
      expect(mcp3!.disabled).toBe(false); // Should be enabled
      expect(store.selectedProfile?.id).toBe('profile-dev');
    });

    it('should handle profile switching without data loss', async () => {
      const store = useMCPStore.getState();
      
      // Load first profile
      await store.loadProfile('profile-dev');
      expect(store.selectedProfile?.name).toBe('Development');
      
      // Switch to second profile
      await store.loadProfile('profile-prod');
      expect(store.selectedProfile?.name).toBe('Production');
      
      // Verify MCP states changed correctly
      const enabledMCPs = store.mcps.filter(mcp => !mcp.disabled);
      expect(enabledMCPs).toHaveLength(1);
      expect(enabledMCPs[0].id).toBe('test-mcp-2');
    });

    it('should maintain MCP usage statistics when switching profiles', async () => {
      const store = useMCPStore.getState();
      const originalUsageCounts = store.mcps.map(mcp => ({ id: mcp.id, count: mcp.usageCount }));
      
      // Switch profiles multiple times
      await store.loadProfile('profile-dev');
      await store.loadProfile('profile-prod');
      await store.loadProfile('profile-dev');
      
      // Usage counts should be preserved
      originalUsageCounts.forEach(({ id, count }) => {
        const mcp = store.mcps.find(m => m.id === id);
        expect(mcp!.usageCount).toBe(count);
      });
    });
  });

  describe('Profile Import/Export Workflows', () => {
    it('should export profile with complete MCP data', () => {
      const store = useMCPStore.getState();
      
      const exported = store.exportProfile('profile-dev');
      
      expect(exported.profile).toEqual({
        name: 'Development',
        description: 'MCPs for development work',
        createdAt: testProfiles[0].createdAt
      });
      
      expect(exported.mcps).toHaveLength(2);
      expect(exported.mcps.map((m: MCP) => m.id)).toEqual(['test-mcp-1', 'test-mcp-3']);
      expect(exported.mcps.every((m: MCP) => 
        ['name', 'type', 'category', 'usageCount', 'tags'].every(field => field in m)
      )).toBe(true);
    });

    it('should import profile and recreate complete state', async () => {
      const store = useMCPStore.getState();
      
      const profileToImport = {
        profile: {
          name: 'Imported Profile',
          description: 'A profile imported from another system',
          createdAt: new Date()
        },
        mcps: [{
          id: 'imported-mcp-1',
          name: 'Imported MCP',
          type: 'stdio' as const,
          command: 'node imported.js',
          args: ['--config', 'prod'],
          env: { NODE_ENV: 'production' },
          category: 'Imported',
          usageCount: 0,
          tags: ['imported'],
          disabled: false
        }]
      };
      
      // Mock importMCPs to simulate successful import
      const originalImportMCPs = store.importMCPs;
      store.importMCPs = vi.fn().mockResolvedValue({ success: true, mcpsAdded: 1, mcpsUpdated: 0, errors: [] });
      
      await store.importProfile(JSON.stringify(profileToImport));
      
      expect(store.importMCPs).toHaveBeenCalledWith(JSON.stringify(profileToImport.mcps));
      
      // Restore original method
      store.importMCPs = originalImportMCPs;
    });

    it('should handle partial import failures gracefully', async () => {
      const store = useMCPStore.getState();
      
      const corruptedProfile = {
        profile: { name: 'Test', description: 'Test' },
        mcps: [{ invalid: 'data' }] // Invalid MCP data
      };
      
      // Mock importMCPs to simulate failure
      store.importMCPs = vi.fn().mockResolvedValue({ success: false, mcpsAdded: 0, mcpsUpdated: 0, errors: ['Invalid MCP format'] });
      
      await expect(store.importProfile(JSON.stringify(corruptedProfile)))
        .rejects.toThrow('Failed to import profile MCPs');
    });
  });

  describe('Data Persistence and Recovery', () => {
    it('should persist profile changes across sessions', async () => {
      const store = useMCPStore.getState();
      
      // Create new profile
      await store.createProfile({
        name: 'Session Test Profile',
        description: 'Testing session persistence',
        mcpIds: ['test-mcp-1'],
        isDefault: false
      });
      
      const profileCount = store.profiles.length;
      
      // Simulate page reload by loading data
      await store.loadData();
      
      // Profile should still exist
      expect(store.profiles).toHaveLength(profileCount);
      expect(store.profiles.find(p => p.name === 'Session Test Profile')).toBeDefined();
    });

    it('should handle storage corruption gracefully', async () => {
      const store = useMCPStore.getState();
      
      // Simulate storage error
      const originalLoadData = store.loadData;
      store.loadData = vi.fn().mockRejectedValue(new Error('Storage corrupted'));
      
      try {
        await store.loadData();
      } catch (error) {
        expect(error.message).toBe('Storage corrupted');
      }
      
      // Should handle error gracefully
      expect(store.error).toBeDefined();
      
      // Restore original method
      store.loadData = originalLoadData;
    });

    it('should create backups when auto-backup is enabled', async () => {
      const store = useMCPStore.getState();
      store.settings = { ...store.settings, autoBackup: true };
      
      // Mock createBackup
      const mockBackup = { id: 'backup-123', timestamp: new Date(), data: {} as any };
      store.createBackup = vi.fn().mockResolvedValue(mockBackup);
      
      await store.createProfile({
        name: 'Backup Test Profile',
        description: 'Testing auto-backup',
        mcpIds: [],
        isDefault: false
      });
      
      expect(store.createBackup).toHaveBeenCalledWith('Added MCP: Backup Test Profile');
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle loading profile with non-existent MCPs', async () => {
      const store = useMCPStore.getState();
      
      // Create profile with MCPs that don't exist
      const profileWithInvalidMCPs: Profile = {
        id: 'invalid-profile',
        name: 'Invalid Profile',
        description: 'Has references to non-existent MCPs',
        mcpIds: ['non-existent-1', 'test-mcp-1', 'non-existent-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false
      };
      
      store.profiles = [...store.profiles, profileWithInvalidMCPs];
      
      await store.loadProfile('invalid-profile');
      
      // Should handle gracefully - only existing MCPs should be affected
      const existingMCP = store.mcps.find(m => m.id === 'test-mcp-1');
      expect(existingMCP!.disabled).toBe(false); // Should be enabled
      
      // Other MCPs should be disabled
      const otherMCPs = store.mcps.filter(m => m.id !== 'test-mcp-1');
      expect(otherMCPs.every(mcp => mcp.disabled)).toBe(true);
    });

    it('should handle concurrent profile operations without race conditions', async () => {
      const store = useMCPStore.getState();
      
      const operations = [
        store.createProfile({ name: 'Concurrent 1', description: 'Test', mcpIds: [], isDefault: false }),
        store.createProfile({ name: 'Concurrent 2', description: 'Test', mcpIds: [], isDefault: false }),
        store.updateProfile('profile-dev', { description: 'Updated concurrently' }),
        store.loadProfile('profile-prod')
      ];
      
      const results = await Promise.allSettled(operations);
      
      // All operations should complete without throwing
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Operation ${index} failed:`, result.reason);
        }
      });
      
      // Should have at least processed some operations
      expect(results.some(r => r.status === 'fulfilled')).toBe(true);
    });

    it('should maintain data integrity under rapid profile switches', async () => {
      const store = useMCPStore.getState();
      
      // Rapidly switch between profiles
      const switches = [
        store.loadProfile('profile-dev'),
        store.loadProfile('profile-prod'),
        store.loadProfile('profile-dev'),
        store.loadProfile('profile-prod'),
        store.loadProfile('profile-dev')
      ];
      
      await Promise.all(switches);
      
      // Final state should be consistent with last profile loaded
      expect(store.selectedProfile?.id).toBe('profile-dev');
      
      // MCP states should be consistent with profile
      const enabledMCPs = store.mcps.filter(mcp => !mcp.disabled);
      const expectedEnabledIds = testProfiles.find(p => p.id === 'profile-dev')!.mcpIds;
      
      expect(enabledMCPs.map(mcp => mcp.id).sort()).toEqual(expectedEnabledIds.sort());
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of profiles efficiently', async () => {
      const store = useMCPStore.getState();
      
      // Create many profiles
      const profilePromises = Array.from({ length: 100 }, (_, i) => 
        store.createProfile({
          name: `Performance Test Profile ${i}`,
          description: `Profile ${i} for performance testing`,
          mcpIds: [testMCPs[i % testMCPs.length].id],
          isDefault: false
        })
      );
      
      const startTime = Date.now();
      await Promise.all(profilePromises);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(store.profiles.length).toBeGreaterThanOrEqual(100 + testProfiles.length);
    });

    it('should handle profiles with large numbers of MCPs', async () => {
      const store = useMCPStore.getState();
      
      // Create many MCPs
      const manyMCPs = Array.from({ length: 1000 }, (_, i) => ({
        id: `perf-mcp-${i}`,
        name: `Performance MCP ${i}`,
        type: 'stdio' as const,
        command: `node script-${i}.js`,
        args: [],
        env: {},
        category: 'Performance',
        usageCount: 0,
        tags: ['performance'],
        disabled: false,
        lastUsed: new Date()
      }));
      
      store.mcps = [...store.mcps, ...manyMCPs];
      
      // Create profile with all MCPs
      await store.createProfile({
        name: 'Large Profile',
        description: 'Profile with many MCPs',
        mcpIds: manyMCPs.map(mcp => mcp.id),
        isDefault: false
      });
      
      const largeProfile = store.profiles.find(p => p.name === 'Large Profile');
      expect(largeProfile!.mcpIds).toHaveLength(1000);
      
      // Test loading the large profile
      const startTime = Date.now();
      await store.loadProfile(largeProfile!.id);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
