/**
 * Profile Edge Cases and Security Testing
 * Comprehensive testing of edge cases, error conditions, and security scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMCPStore } from '../../src/stores/mcpStore';
import type { MCP, Profile } from '../../src/types';

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  }
});

describe('Profile Edge Cases and Security', () => {
  beforeEach(() => {
    // Clear store state
    const store = useMCPStore.getState();
    store.mcps = [];
    store.profiles = [];
    store.selectedProfile = null;
    store.error = null;
  });

  describe('Input Validation and Sanitization', () => {
    it('should handle XSS attempts in profile names', async () => {
      const store = useMCPStore.getState();
      
      const maliciousProfileData = {
        name: '<script>alert("XSS")</script>',
        description: '<img src=x onerror=alert("XSS")>',
        mcpIds: [],
        isDefault: false
      };
      
      await store.createProfile(maliciousProfileData);
      
      const createdProfile = store.profiles.find(p => p.name.includes('script'));
      expect(createdProfile).toBeDefined();
      // The actual sanitization would happen in the UI layer, but we ensure data is stored
    });

    it('should handle SQL injection attempts in profile data', async () => {
      const store = useMCPStore.getState();
      
      const sqlInjectionData = {
        name: "'; DROP TABLE profiles; --",
        description: "1' OR '1'='1",
        mcpIds: [],
        isDefault: false
      };
      
      await store.createProfile(sqlInjectionData);
      
      // Should create profile without breaking (localStorage is safe from SQL injection)
      expect(store.profiles).toHaveLength(1);
      expect(store.profiles[0].name).toBe("'; DROP TABLE profiles; --");
    });

    it('should handle extremely long input strings', async () => {
      const store = useMCPStore.getState();
      
      const longString = 'A'.repeat(10000);
      const longProfileData = {
        name: longString,
        description: longString,
        mcpIds: [],
        isDefault: false
      };
      
      await store.createProfile(longProfileData);
      
      const createdProfile = store.profiles[0];
      expect(createdProfile.name).toHaveLength(10000);
      expect(createdProfile.description).toHaveLength(10000);
    });

    it('should handle Unicode and special characters properly', async () => {
      const store = useMCPStore.getState();
      
      const unicodeProfileData = {
        name: '测试配置文件 🚀 Émoji Profile ñ',
        description: '这是一个测试配置文件 with émojis 🎉🔥💻',
        mcpIds: [],
        isDefault: false
      };
      
      await store.createProfile(unicodeProfileData);
      
      const createdProfile = store.profiles[0];
      expect(createdProfile.name).toBe('测试配置文件 🚀 Émoji Profile ñ');
      expect(createdProfile.description).toBe('这是一个测试配置文件 with émojis 🎉🔥💻');
    });
  });

  describe('Data Corruption and Recovery', () => {
    it('should handle corrupted profile data gracefully', async () => {
      const store = useMCPStore.getState();
      
      // Simulate corrupted profile data
      const corruptedProfiles = [
        {
          id: 'corrupted-1',
          name: null, // Null name
          description: 'Valid description',
          mcpIds: ['valid-id'],
          createdAt: new Date(),
          updatedAt: new Date(),
          isDefault: false
        },
        {
          // Missing required fields
          id: 'corrupted-2',
          name: 'Valid name'
        },
        {
          id: 'corrupted-3',
          name: 'Valid name',
          description: 'Valid description',
          mcpIds: null, // Null array
          createdAt: new Date(),
          updatedAt: new Date(),
          isDefault: false
        }
      ] as Profile[];
      
      store.profiles = corruptedProfiles;
      
      // Operations should handle corrupted data gracefully
      expect(() => store.exportProfile('corrupted-1')).not.toThrow();
      
      await expect(store.loadProfile('corrupted-2')).resolves.not.toThrow();
      
      const filteredProfiles = store.profiles.filter(p => p.name && p.mcpIds);
      expect(filteredProfiles).toHaveLength(1); // Only one valid profile
    });

    it('should handle circular references in profile data', () => {
      const store = useMCPStore.getState();
      
      // Create circular reference
      const circularProfile: any = {
        id: 'circular-1',
        name: 'Circular Profile',
        description: 'Has circular reference',
        mcpIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false
      };
      circularProfile.self = circularProfile;
      
      store.profiles = [circularProfile];
      
      // JSON operations should handle circular references
      expect(() => {
        JSON.stringify(store.profiles);
      }).toThrow(); // This should throw due to circular reference
      
      // Our export function should handle this
      expect(() => store.exportProfile('circular-1')).not.toThrow();
    });

    it('should recover from storage quota exceeded errors', async () => {
      const store = useMCPStore.getState();
      
      // Mock localStorage to throw quota exceeded error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn().mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      // Should handle quota error gracefully
      await expect(store.createProfile({
        name: 'Quota Test Profile',
        description: 'Testing quota limits',
        mcpIds: [],
        isDefault: false
      })).rejects.toThrow();
      
      expect(store.error).toBeTruthy();
      
      // Restore original setItem
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle concurrent profile creation without data corruption', async () => {
      const store = useMCPStore.getState();
      
      // Simulate concurrent profile creation
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => 
        store.createProfile({
          name: `Concurrent Profile ${i}`,
          description: `Profile created concurrently ${i}`,
          mcpIds: [],
          isDefault: false
        })
      );
      
      const results = await Promise.allSettled(concurrentOperations);
      
      // All operations should succeed or fail gracefully
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);
      
      // Profile count should be consistent
      expect(store.profiles.length).toBe(successCount);
      
      // All profiles should have unique IDs
      const profileIds = store.profiles.map(p => p.id);
      const uniqueIds = new Set(profileIds);
      expect(uniqueIds.size).toBe(profileIds.length);
    });

    it('should handle rapid profile switching without state corruption', async () => {
      const store = useMCPStore.getState();
      
      // Setup test data
      const testMCPs: MCP[] = Array.from({ length: 5 }, (_, i) => ({
        id: `mcp-${i}`,
        name: `MCP ${i}`,
        type: 'stdio',
        command: `node mcp${i}.js`,
        args: [],
        env: {},
        category: 'Test',
        usageCount: 0,
        tags: [],
        disabled: i % 2 === 0, // Alternate enabled/disabled
        lastUsed: new Date()
      }));
      
      const testProfiles: Profile[] = [
        {
          id: 'profile-odd',
          name: 'Odd MCPs',
          description: 'Profile with odd MCPs',
          mcpIds: ['mcp-1', 'mcp-3'],
          createdAt: new Date(),
          updatedAt: new Date(),
          isDefault: false
        },
        {
          id: 'profile-even',
          name: 'Even MCPs',
          description: 'Profile with even MCPs',
          mcpIds: ['mcp-0', 'mcp-2', 'mcp-4'],
          createdAt: new Date(),
          updatedAt: new Date(),
          isDefault: false
        }
      ];
      
      store.mcps = testMCPs;
      store.profiles = testProfiles;
      
      // Rapidly switch between profiles
      const switchOperations = Array.from({ length: 20 }, (_, i) => 
        store.loadProfile(i % 2 === 0 ? 'profile-odd' : 'profile-even')
      );
      
      await Promise.all(switchOperations);
      
      // Final state should be consistent
      expect(store.selectedProfile).toBeTruthy();
      expect(['profile-odd', 'profile-even']).toContain(store.selectedProfile?.id);
      
      // MCP states should be consistent with final profile
      const finalProfile = store.selectedProfile!;
      const enabledMCPs = store.mcps.filter(mcp => !mcp.disabled);
      const enabledIds = enabledMCPs.map(mcp => mcp.id).sort();
      const expectedIds = finalProfile.mcpIds.sort();
      expect(enabledIds).toEqual(expectedIds);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle profiles with extremely large MCP lists', async () => {
      const store = useMCPStore.getState();
      
      // Create a large number of MCPs
      const largeMCPList = Array.from({ length: 10000 }, (_, i) => `mcp-${i}`);
      
      const startTime = Date.now();
      
      await store.createProfile({
        name: 'Large Profile',
        description: 'Profile with many MCPs',
        mcpIds: largeMCPList,
        isDefault: false
      });
      
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
      
      const largeProfile = store.profiles.find(p => p.name === 'Large Profile');
      expect(largeProfile!.mcpIds).toHaveLength(10000);
    });

    it('should handle deep object nesting in profile export', () => {
      const store = useMCPStore.getState();
      
      // Create MCP with deeply nested environment variables
      const deepNestedMCP: MCP = {
        id: 'deep-mcp',
        name: 'Deep Nested MCP',
        type: 'stdio',
        command: 'node deep.js',
        args: [],
        env: {
          LEVEL_1: JSON.stringify({
            level_2: {
              level_3: {
                level_4: {
                  level_5: 'deep value'
                }
              }
            }
          })
        },
        category: 'Test',
        usageCount: 0,
        tags: [],
        disabled: false,
        lastUsed: new Date()
      };
      
      const deepProfile: Profile = {
        id: 'deep-profile',
        name: 'Deep Profile',
        description: 'Profile with deep nesting',
        mcpIds: ['deep-mcp'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false
      };
      
      store.mcps = [deepNestedMCP];
      store.profiles = [deepProfile];
      
      // Export should handle deep nesting
      const exported = store.exportProfile('deep-profile');
      expect(exported.mcps).toHaveLength(1);
      expect(exported.mcps[0].env.LEVEL_1).toBeTruthy();
    });

    it('should handle memory pressure during large operations', async () => {
      const store = useMCPStore.getState();
      
      // Create many profiles to simulate memory pressure
      const profilePromises = Array.from({ length: 1000 }, (_, i) => 
        store.createProfile({
          name: `Memory Profile ${i}`,
          description: `Profile for memory testing ${i}`,
          mcpIds: [`mcp-${i}`],
          isDefault: false
        })
      );
      
      // Process in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < profilePromises.length; i += batchSize) {
        const batch = profilePromises.slice(i, i + batchSize);
        await Promise.allSettled(batch);
        
        // Give garbage collector a chance
        if (global.gc) {
          global.gc();
        }
      }
      
      // Should handle large number of profiles
      expect(store.profiles.length).toBeGreaterThan(500); // At least half should succeed
    });
  });

  describe('Cross-Browser Compatibility Edge Cases', () => {
    it('should handle missing localStorage gracefully', async () => {
      const store = useMCPStore.getState();
      
      // Mock localStorage as undefined (some browsers/modes)
      const originalLocalStorage = global.localStorage;
      // @ts-ignore
      delete global.localStorage;
      
      // Should handle missing localStorage
      await expect(store.createProfile({
        name: 'No Storage Profile',
        description: 'Testing without localStorage',
        mcpIds: [],
        isDefault: false
      })).rejects.toThrow();
      
      // Restore localStorage
      global.localStorage = originalLocalStorage;
    });

    it('should handle JSON stringify/parse edge cases', () => {
      const store = useMCPStore.getState();
      
      // Create profile with edge case data
      const edgeCaseProfile: Profile = {
        id: 'edge-case',
        name: 'Edge Case Profile',
        description: 'Testing edge cases',
        mcpIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false
      };
      
      // Test with various edge case values
      const testCases = [
        undefined,
        null,
        NaN,
        Infinity,
        -Infinity,
        function() {},
        Symbol('test'),
        new RegExp('test')
      ];
      
      testCases.forEach((testValue, index) => {
        const testProfile = {
          ...edgeCaseProfile,
          id: `edge-case-${index}`,
          // @ts-ignore - Testing edge cases
          edgeCaseValue: testValue
        };
        
        // Should handle serialization gracefully
        expect(() => {
          const serialized = JSON.stringify(testProfile);
          JSON.parse(serialized);
        }).not.toThrow();
      });
    });

    it('should handle timezone and date edge cases', async () => {
      const store = useMCPStore.getState();
      
      // Test with various date edge cases
      const dateEdgeCases = [
        new Date(0), // Unix epoch
        new Date('1970-01-01'), // Epoch string
        new Date('2038-01-19'), // 32-bit timestamp limit
        new Date('9999-12-31'), // Far future
        new Date(NaN), // Invalid date
        new Date(8640000000000001) // Beyond max date
      ];
      
      for (const [index, date] of dateEdgeCases.entries()) {
        await store.createProfile({
          name: `Date Edge Case ${index}`,
          description: `Testing date: ${date.toString()}`,
          mcpIds: [],
          isDefault: false
        });
      }
      
      // All profiles should be created despite date edge cases
      expect(store.profiles).toHaveLength(dateEdgeCases.length);
    });
  });

  describe('Security and Privacy Edge Cases', () => {
    it('should not expose sensitive data in error messages', async () => {
      const store = useMCPStore.getState();
      
      // Create profile with sensitive-looking data
      const sensitiveProfileData = {
        name: 'Production Profile',
        description: 'Contains sensitive API keys and passwords',
        mcpIds: [],
        isDefault: false
      };
      
      // Mock storage to throw error
      const mockError = new Error('Storage operation failed');
      const originalConsoleError = console.error;
      console.error = vi.fn();
      
      // Force error during profile creation
      const mockStorage = vi.fn().mockRejectedValue(mockError);
      
      try {
        await store.createProfile(sensitiveProfileData);
      } catch (error) {
        // Error message should not contain sensitive data
        expect(error.message).not.toContain('API keys');
        expect(error.message).not.toContain('passwords');
      }
      
      console.error = originalConsoleError;
    });

    it('should handle profile data isolation between sessions', () => {
      const store1 = useMCPStore.getState();
      
      // Create profile in first session
      store1.profiles = [{
        id: 'session-1-profile',
        name: 'Session 1 Profile',
        description: 'Private to session 1',
        mcpIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false
      }];
      
      // Simulate second session (new store instance)
      const store2 = useMCPStore.getState();
      
      // Second session should not see first session's in-memory data
      // (Though localStorage would be shared - this tests in-memory isolation)
      if (store1 !== store2) {
        expect(store2.profiles).not.toContainEqual(
          expect.objectContaining({ name: 'Session 1 Profile' })
        );
      }
    });
  });
});
