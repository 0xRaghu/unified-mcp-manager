/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMCPStore } from '../../../src/stores/mcpStore'
import type { MCP, Profile } from '../../../src/types'

// Mock the storage module
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

describe('MCPStore Profile Operations', () => {
  beforeEach(() => {
    // Reset the store state before each test
    const { result } = renderHook(() => useMCPStore())
    act(() => {
      result.current.clearAllData()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Profile Creation', () => {
    it('should create a new profile successfully', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      const profileData = {
        name: 'Test Profile',
        description: 'Test Description',
        mcpIds: ['mcp-1', 'mcp-2'],
        isDefault: false
      }

      await act(async () => {
        await result.current.createProfile(profileData)
      })

      expect(result.current.profiles).toHaveLength(1)
      expect(result.current.profiles[0]).toMatchObject({
        name: 'Test Profile',
        description: 'Test Description',
        mcpIds: ['mcp-1', 'mcp-2'],
        isDefault: false
      })
      expect(result.current.profiles[0].id).toBeDefined()
      expect(result.current.profiles[0].createdAt).toBeInstanceOf(Date)
      expect(result.current.profiles[0].updatedAt).toBeInstanceOf(Date)
    })

    it('should handle profile creation errors gracefully', async () => {
      const { result } = renderHook(() => useMCPStore())
      const storage = await import('../../../src/lib/storage')
      vi.mocked(storage.storage.saveProfiles).mockImplementation(() => {
        throw new Error('Storage error')
      })

      const profileData = {
        name: 'Test Profile',
        description: 'Test Description',  
        mcpIds: [],
        isDefault: false
      }

      await act(async () => {
        try {
          await result.current.createProfile(profileData)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      })

      expect(result.current.error).toBe('Storage error')
    })
  })

  describe('Profile Updates', () => {
    it('should update profile successfully', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Create initial profile
      const profileData = {
        name: 'Test Profile',
        description: 'Test Description',
        mcpIds: ['mcp-1'],
        isDefault: false
      }

      await act(async () => {
        await result.current.createProfile(profileData)
      })

      const profileId = result.current.profiles[0].id
      const originalUpdatedAt = result.current.profiles[0].updatedAt

      // Update profile
      await act(async () => {
        await result.current.updateProfile(profileId, {
          name: 'Updated Profile',
          mcpIds: ['mcp-1', 'mcp-2']
        })
      })

      const updatedProfile = result.current.profiles[0]
      expect(updatedProfile.name).toBe('Updated Profile')
      expect(updatedProfile.mcpIds).toEqual(['mcp-1', 'mcp-2'])
      expect(updatedProfile.updatedAt).not.toEqual(originalUpdatedAt)
    })
  })

  describe('Profile Deletion', () => {
    it('should delete profile and clear active profile if deleted', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Create and set active profile
      const profileData = {
        name: 'Test Profile',
        description: 'Test Description',
        mcpIds: ['mcp-1'],
        isDefault: false
      }

      await act(async () => {
        await result.current.createProfile(profileData)
      })

      const profileId = result.current.profiles[0].id
      
      act(() => {
        result.current.setActiveProfile(profileId)
      })

      expect(result.current.selectedProfile?.id).toBe(profileId)

      // Delete profile
      await act(async () => {
        await result.current.deleteProfile(profileId)
      })

      expect(result.current.profiles).toHaveLength(0)
      expect(result.current.selectedProfile).toBeNull()
    })
  })

  describe('Profile Loading and State Management', () => {
    it('should load profile and update MCP states correctly', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add some MCPs first
      const mcp1: Omit<MCP, 'id' | 'usageCount' | 'lastUsed'> = {
        name: 'MCP 1',
        type: 'stdio',
        command: 'test1',
        args: [],
        category: 'Test',
        description: 'Test MCP 1',
        tags: [],
        source: 'manual',
        disabled: false,
        env: {},
        alwaysAllow: []
      }

      const mcp2: Omit<MCP, 'id' | 'usageCount' | 'lastUsed'> = {
        name: 'MCP 2', 
        type: 'stdio',
        command: 'test2',
        args: [],
        category: 'Test',
        description: 'Test MCP 2',
        tags: [],
        source: 'manual',
        disabled: false,
        env: {},
        alwaysAllow: []
      }

      await act(async () => {
        await result.current.addMCP(mcp1)
        await result.current.addMCP(mcp2)
      })

      const mcpIds = result.current.mcps.map(m => m.id)

      // Create profile with only first MCP
      const profileData = {
        name: 'Selective Profile',
        description: 'Only MCP 1',
        mcpIds: [mcpIds[0]],
        isDefault: false
      }

      await act(async () => {
        await result.current.createProfile(profileData)
      })

      const profileId = result.current.profiles[0].id

      // Load profile - should disable MCPs not in profile
      await act(async () => {
        await result.current.loadProfile(profileId)
      })

      const mcpsAfterLoad = result.current.mcps
      expect(mcpsAfterLoad.find(m => m.id === mcpIds[0])?.disabled).toBe(false)
      expect(mcpsAfterLoad.find(m => m.id === mcpIds[1])?.disabled).toBe(true)
      expect(result.current.selectedProfile?.id).toBe(profileId)
    })

    it('should handle setting active profile without loading', () => {
      const { result } = renderHook(() => useMCPStore())
      
      act(() => {
        result.current.setActiveProfile('non-existent-id')
      })

      expect(result.current.selectedProfile).toBeNull()
    })

    it('should clear active profile when set to null', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Create profile
      const profileData = {
        name: 'Test Profile',
        description: 'Test',
        mcpIds: [],
        isDefault: false
      }

      await act(async () => {
        await result.current.createProfile(profileData)
      })

      const profileId = result.current.profiles[0].id
      
      act(() => {
        result.current.setActiveProfile(profileId)
      })

      expect(result.current.selectedProfile).not.toBeNull()

      act(() => {
        result.current.setActiveProfile(null)
      })

      expect(result.current.selectedProfile).toBeNull()
    })
  })

  describe('Change Detection and Consistency', () => {
    it('should maintain profile consistency after bulk MCP operations', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add MCPs
      const mcpData1: Omit<MCP, 'id' | 'usageCount' | 'lastUsed'> = {
        name: 'MCP 1',
        type: 'stdio', 
        command: 'test1',
        args: [],
        category: 'Test',
        description: 'Test MCP 1',
        tags: [],
        source: 'manual',
        disabled: false,
        env: {},
        alwaysAllow: []
      }

      const mcpData2: Omit<MCP, 'id' | 'usageCount' | 'lastUsed'> = {
        name: 'MCP 2',
        type: 'stdio',
        command: 'test2', 
        args: [],
        category: 'Test',
        description: 'Test MCP 2',
        tags: [],
        source: 'manual',
        disabled: false,
        env: {},
        alwaysAllow: []
      }

      await act(async () => {
        await result.current.addMCP(mcpData1)
        await result.current.addMCP(mcpData2)
      })

      const mcpIds = result.current.mcps.map(m => m.id)

      // Create profile
      const profileData = {
        name: 'Test Profile',
        description: 'Test',
        mcpIds: mcpIds,
        isDefault: false
      }

      await act(async () => {
        await result.current.createProfile(profileData)
      })

      // Bulk toggle MCPs
      await act(async () => {
        await result.current.bulkToggleMCPs(mcpIds, false)
      })

      // Profile should still exist and be valid
      expect(result.current.profiles).toHaveLength(1)
      expect(result.current.profiles[0].mcpIds).toEqual(mcpIds)
    })

    it('should handle rapid state changes without conflicts', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Create multiple profiles rapidly
      const profiles = [
        { name: 'Profile 1', description: 'Test 1', mcpIds: [], isDefault: false },
        { name: 'Profile 2', description: 'Test 2', mcpIds: [], isDefault: false },
        { name: 'Profile 3', description: 'Test 3', mcpIds: [], isDefault: false }
      ]

      await act(async () => {
        await Promise.all(profiles.map(p => result.current.createProfile(p)))
      })

      expect(result.current.profiles).toHaveLength(3)
      expect(result.current.profiles.map(p => p.name)).toEqual(['Profile 1', 'Profile 2', 'Profile 3'])
    })
  })
})