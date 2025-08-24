/**
 * Integration tests for profile state consistency across components
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMCPStore } from '../../../src/stores/mcpStore'
import type { MCP, Profile } from '../../../src/types'

// Mock storage
vi.mock('../../../src/lib/storage', () => ({
  storage: {
    getMCPs: vi.fn().mockResolvedValue([]),
    saveMCPs: vi.fn().mockResolvedValue(undefined),
    getProfiles: vi.fn().mockReturnValue([]),
    saveProfiles: vi.fn(),
    getSettings: vi.fn().mockReturnValue({
      theme: 'system',
      autoBackup: true,
      encryptionEnabled: true,
      syncEnabled: false,
      exportFormat: 'universal',
      categories: []
    }),
    saveSettings: vi.fn(),
    createBackup: vi.fn().mockResolvedValue({ id: 'backup-1', timestamp: new Date(), description: 'test' }),
    clearAll: vi.fn()
  }
}))

describe('Profile State Consistency Integration Tests', () => {
  const createTestMCP = (id: string, name: string, disabled = false): Omit<MCP, 'id' | 'usageCount' | 'lastUsed'> => ({
    name,
    type: 'stdio',
    command: `test-${id}`,
    args: [],
    category: 'Test',
    description: `Test MCP ${name}`,
    tags: [],
    source: 'manual',
    disabled,
    env: {},
    alwaysAllow: []
  })

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('Profile and MCP State Synchronization', () => {
    it('should maintain profile consistency when MCPs are toggled', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add test MCPs
      await act(async () => {
        await result.current.addMCP(createTestMCP('1', 'MCP 1'))
        await result.current.addMCP(createTestMCP('2', 'MCP 2'))
        await result.current.addMCP(createTestMCP('3', 'MCP 3'))
      })

      const mcpIds = result.current.mcps.map(m => m.id)

      // Create profile with all MCPs
      await act(async () => {
        await result.current.createProfile({
          name: 'Test Profile',
          description: 'All MCPs',
          mcpIds: mcpIds,
          isDefault: false
        })
      })

      const profileId = result.current.profiles[0].id

      // Load profile
      await act(async () => {
        await result.current.loadProfile(profileId)
      })

      // Verify all MCPs are enabled
      expect(result.current.mcps.every(mcp => !mcp.disabled)).toBe(true)
      expect(result.current.selectedProfile?.id).toBe(profileId)

      // Toggle one MCP
      await act(async () => {
        await result.current.toggleMCP(mcpIds[0])
      })

      // Profile should still be selected, but MCP state should be updated
      expect(result.current.selectedProfile?.id).toBe(profileId)
      expect(result.current.mcps.find(m => m.id === mcpIds[0])?.disabled).toBe(true)
      expect(result.current.mcps.filter(m => m.id !== mcpIds[0]).every(mcp => !mcp.disabled)).toBe(true)
    })

    it('should handle profile switching with state preservation', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add test MCPs
      await act(async () => {
        await result.current.addMCP(createTestMCP('1', 'MCP 1'))
        await result.current.addMCP(createTestMCP('2', 'MCP 2'))
        await result.current.addMCP(createTestMCP('3', 'MCP 3'))
      })

      const mcpIds = result.current.mcps.map(m => m.id)

      // Create two different profiles
      await act(async () => {
        await result.current.createProfile({
          name: 'Profile A',
          description: 'MCPs 1 and 2',
          mcpIds: [mcpIds[0], mcpIds[1]],
          isDefault: false
        })
        
        await result.current.createProfile({
          name: 'Profile B', 
          description: 'Only MCP 3',
          mcpIds: [mcpIds[2]],
          isDefault: false
        })
      })

      const [profileA, profileB] = result.current.profiles

      // Load Profile A
      await act(async () => {
        await result.current.loadProfile(profileA.id)
      })

      // Verify Profile A state
      expect(result.current.selectedProfile?.id).toBe(profileA.id)
      expect(result.current.mcps.find(m => m.id === mcpIds[0])?.disabled).toBe(false)
      expect(result.current.mcps.find(m => m.id === mcpIds[1])?.disabled).toBe(false)
      expect(result.current.mcps.find(m => m.id === mcpIds[2])?.disabled).toBe(true)

      // Switch to Profile B
      await act(async () => {
        await result.current.loadProfile(profileB.id)
      })

      // Verify Profile B state
      expect(result.current.selectedProfile?.id).toBe(profileB.id)
      expect(result.current.mcps.find(m => m.id === mcpIds[0])?.disabled).toBe(true)
      expect(result.current.mcps.find(m => m.id === mcpIds[1])?.disabled).toBe(true)
      expect(result.current.mcps.find(m => m.id === mcpIds[2])?.disabled).toBe(false)

      // Switch back to Profile A
      await act(async () => {
        await result.current.loadProfile(profileA.id)
      })

      // Verify Profile A state is restored
      expect(result.current.selectedProfile?.id).toBe(profileA.id)
      expect(result.current.mcps.find(m => m.id === mcpIds[0])?.disabled).toBe(false)
      expect(result.current.mcps.find(m => m.id === mcpIds[1])?.disabled).toBe(false)
      expect(result.current.mcps.find(m => m.id === mcpIds[2])?.disabled).toBe(true)
    })

    it('should handle "All MCPs" mode correctly', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add test MCPs with mixed states
      await act(async () => {
        await result.current.addMCP(createTestMCP('1', 'MCP 1', false))
        await result.current.addMCP(createTestMCP('2', 'MCP 2', true))
        await result.current.addMCP(createTestMCP('3', 'MCP 3', false))
      })

      // Create and load a profile
      const mcpIds = result.current.mcps.map(m => m.id)
      await act(async () => {
        await result.current.createProfile({
          name: 'Test Profile',
          description: 'Test',
          mcpIds: [mcpIds[0]],
          isDefault: false
        })
      })

      const profileId = result.current.profiles[0].id
      await act(async () => {
        await result.current.loadProfile(profileId)
      })

      // Verify profile is active
      expect(result.current.selectedProfile?.id).toBe(profileId)

      // Switch to "All MCPs" mode (no active profile)
      act(() => {
        result.current.setActiveProfile(null)
      })

      // Verify no active profile
      expect(result.current.selectedProfile).toBeNull()

      // MCP states should remain as they were
      const mcpsAfterClear = result.current.mcps
      expect(mcpsAfterClear.find(m => m.id === mcpIds[0])?.disabled).toBe(false) // Was enabled by profile
      expect(mcpsAfterClear.find(m => m.id === mcpIds[1])?.disabled).toBe(true)  // Was disabled by profile  
      expect(mcpsAfterClear.find(m => m.id === mcpIds[2])?.disabled).toBe(true)  // Was disabled by profile
    })
  })

  describe('Bulk Operations and Profile Consistency', () => {
    it('should maintain profile integrity during bulk operations', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add multiple MCPs
      await act(async () => {
        for (let i = 1; i <= 5; i++) {
          await result.current.addMCP(createTestMCP(i.toString(), `MCP ${i}`))
        }
      })

      const mcpIds = result.current.mcps.map(m => m.id)

      // Create profile with subset of MCPs
      await act(async () => {
        await result.current.createProfile({
          name: 'Selective Profile',
          description: 'MCPs 1, 3, 5',
          mcpIds: [mcpIds[0], mcpIds[2], mcpIds[4]],
          isDefault: false
        })
      })

      // Load profile
      const profileId = result.current.profiles[0].id
      await act(async () => {
        await result.current.loadProfile(profileId)
      })

      // Perform bulk toggle (disable all)
      await act(async () => {
        await result.current.bulkToggleMCPs(mcpIds, false)
      })

      // Profile should still exist and be valid
      expect(result.current.profiles).toHaveLength(1)
      expect(result.current.profiles[0].mcpIds).toEqual([mcpIds[0], mcpIds[2], mcpIds[4]])
      
      // All MCPs should be disabled
      expect(result.current.mcps.every(mcp => mcp.disabled)).toBe(true)

      // Re-enable MCPs in profile
      await act(async () => {
        await result.current.bulkToggleMCPs([mcpIds[0], mcpIds[2], mcpIds[4]], true)
      })

      // Profile MCPs should be enabled, others disabled
      expect(result.current.mcps.find(m => m.id === mcpIds[0])?.disabled).toBe(false)
      expect(result.current.mcps.find(m => m.id === mcpIds[1])?.disabled).toBe(true)
      expect(result.current.mcps.find(m => m.id === mcpIds[2])?.disabled).toBe(false)
      expect(result.current.mcps.find(m => m.id === mcpIds[3])?.disabled).toBe(true)
      expect(result.current.mcps.find(m => m.id === mcpIds[4])?.disabled).toBe(false)
    })

    it('should handle bulk deletion with profile cleanup', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add test MCPs
      await act(async () => {
        await result.current.addMCP(createTestMCP('1', 'MCP 1'))
        await result.current.addMCP(createTestMCP('2', 'MCP 2'))
        await result.current.addMCP(createTestMCP('3', 'MCP 3'))
      })

      const mcpIds = result.current.mcps.map(m => m.id)

      // Create profile
      await act(async () => {
        await result.current.createProfile({
          name: 'Test Profile',
          description: 'All MCPs',
          mcpIds: mcpIds,
          isDefault: false
        })
      })

      // Delete some MCPs
      await act(async () => {
        await result.current.bulkDeleteMCPs([mcpIds[0], mcpIds[1]])
      })

      // Profile should still exist but with updated MCP references
      expect(result.current.profiles).toHaveLength(1)
      expect(result.current.mcps).toHaveLength(1)
      expect(result.current.mcps[0].id).toBe(mcpIds[2])
      
      // Profile still contains all original IDs (stale references are expected)
      expect(result.current.profiles[0].mcpIds).toEqual(mcpIds)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent profile operations without conflicts', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add MCPs first
      await act(async () => {
        await result.current.addMCP(createTestMCP('1', 'MCP 1'))
        await result.current.addMCP(createTestMCP('2', 'MCP 2'))
      })

      const mcpIds = result.current.mcps.map(m => m.id)

      // Perform concurrent profile operations
      await act(async () => {
        const operations = [
          result.current.createProfile({
            name: 'Profile A',
            description: 'First profile',
            mcpIds: [mcpIds[0]],
            isDefault: false
          }),
          result.current.createProfile({
            name: 'Profile B',
            description: 'Second profile',
            mcpIds: [mcpIds[1]],
            isDefault: false
          }),
          result.current.toggleMCP(mcpIds[0])
        ]

        await Promise.all(operations)
      })

      // All operations should complete successfully
      expect(result.current.profiles).toHaveLength(2)
      expect(result.current.profiles[0].name).toBe('Profile A')
      expect(result.current.profiles[1].name).toBe('Profile B')
      
      // MCP state should be updated
      expect(result.current.mcps.find(m => m.id === mcpIds[0])?.disabled).toBe(true)
    })

    it('should maintain consistency during rapid state changes', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add MCPs
      await act(async () => {
        await result.current.addMCP(createTestMCP('1', 'MCP 1'))
        await result.current.addMCP(createTestMCP('2', 'MCP 2'))
      })

      const mcpIds = result.current.mcps.map(m => m.id)

      // Create profile
      await act(async () => {
        await result.current.createProfile({
          name: 'Test Profile',
          description: 'Test',
          mcpIds: mcpIds,
          isDefault: false
        })
      })

      const profileId = result.current.profiles[0].id

      // Perform rapid operations
      await act(async () => {
        // Load profile
        await result.current.loadProfile(profileId)
        
        // Clear profile
        result.current.setActiveProfile(null)
        
        // Load again
        await result.current.loadProfile(profileId)
        
        // Toggle MCPs rapidly
        await result.current.toggleMCP(mcpIds[0])
        await result.current.toggleMCP(mcpIds[1])
        await result.current.toggleMCP(mcpIds[0])
      })

      // Final state should be consistent
      expect(result.current.selectedProfile?.id).toBe(profileId)
      expect(result.current.mcps.find(m => m.id === mcpIds[0])?.disabled).toBe(false)
      expect(result.current.mcps.find(m => m.id === mcpIds[1])?.disabled).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty profile list gracefully', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Try to set active profile when no profiles exist
      act(() => {
        result.current.setActiveProfile('non-existent-id')
      })

      expect(result.current.selectedProfile).toBeNull()
      expect(result.current.profiles).toHaveLength(0)
    })

    it('should handle profile with non-existent MCP references', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add one MCP
      await act(async () => {
        await result.current.addMCP(createTestMCP('1', 'MCP 1'))
      })

      // Create profile with references to non-existent MCPs
      await act(async () => {
        await result.current.createProfile({
          name: 'Mixed Profile',
          description: 'Has invalid references',
          mcpIds: [result.current.mcps[0].id, 'non-existent-1', 'non-existent-2'],
          isDefault: false
        })
      })

      const profileId = result.current.profiles[0].id

      // Load profile - should handle gracefully
      await act(async () => {
        await result.current.loadProfile(profileId)
      })

      // Should still work with valid MCP
      expect(result.current.selectedProfile?.id).toBe(profileId)
      expect(result.current.mcps[0].disabled).toBe(false)
    })

    it('should handle default profile scenarios', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add MCPs
      await act(async () => {
        await result.current.addMCP(createTestMCP('1', 'MCP 1'))
        await result.current.addMCP(createTestMCP('2', 'MCP 2'))
      })

      const mcpIds = result.current.mcps.map(m => m.id)

      // Create default profile
      await act(async () => {
        await result.current.createProfile({
          name: 'Default Profile',
          description: 'Default',
          mcpIds: [mcpIds[0]],
          isDefault: true
        })
      })

      // Create another profile
      await act(async () => {
        await result.current.createProfile({
          name: 'Regular Profile',
          description: 'Not default',
          mcpIds: [mcpIds[1]],
          isDefault: false
        })
      })

      // Update default profile to non-default
      const defaultProfileId = result.current.profiles[0].id
      await act(async () => {
        await result.current.updateProfile(defaultProfileId, {
          isDefault: false
        })
      })

      expect(result.current.profiles[0].isDefault).toBe(false)
      expect(result.current.profiles.every(p => !p.isDefault)).toBe(true)
    })
  })
})