/**
 * Performance tests for profile change detection and save button behavior
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { performance } from 'perf_hooks'
import { useMCPStore } from '../../src/stores/mcpStore'
import type { MCP } from '../../src/types'

// Mock storage for performance testing
vi.mock('../../src/lib/storage', () => ({
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

describe('Profile Change Detection Performance Tests', () => {
  const createTestMCP = (id: number): Omit<MCP, 'id' | 'usageCount' | 'lastUsed'> => ({
    name: `Performance MCP ${id}`,
    type: 'stdio',
    command: `test-${id}`,
    args: [],
    category: 'Performance',
    description: `Performance test MCP ${id}`,
    tags: [`tag-${id}`],
    source: 'manual',
    disabled: false,
    env: {},
    alwaysAllow: []
  })

  beforeEach(() => {
    vi.clearAllMocks()
    // Ensure performance timing is available
    if (typeof global.performance === 'undefined') {
      global.performance = performance as any
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Large Profile Set Performance', () => {
    it('should handle 100+ MCPs with acceptable performance', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      const startTime = performance.now()
      
      // Add 150 MCPs
      await act(async () => {
        const addPromises = Array.from({ length: 150 }, (_, i) => 
          result.current.addMCP(createTestMCP(i + 1))
        )
        await Promise.all(addPromises)
      })
      
      const addTime = performance.now() - startTime
      expect(addTime).toBeLessThan(5000) // Should complete within 5 seconds
      
      expect(result.current.mcps).toHaveLength(150)
      
      // Test profile creation with all MCPs
      const profileCreateStart = performance.now()
      
      const mcpIds = result.current.mcps.map(m => m.id)
      await act(async () => {
        await result.current.createProfile({
          name: 'Large Profile',
          description: 'Profile with 150 MCPs',
          mcpIds: mcpIds,
          isDefault: false
        })
      })
      
      const profileCreateTime = performance.now() - profileCreateStart
      expect(profileCreateTime).toBeLessThan(1000) // Should create within 1 second
      
      // Test profile loading performance
      const profileLoadStart = performance.now()
      
      const profileId = result.current.profiles[0].id
      await act(async () => {
        await result.current.loadProfile(profileId)
      })
      
      const profileLoadTime = performance.now() - profileLoadStart
      expect(profileLoadTime).toBeLessThan(2000) // Should load within 2 seconds
      
      // Verify all MCPs are enabled
      expect(result.current.mcps.every(mcp => !mcp.disabled)).toBe(true)
    })

    it('should handle rapid profile switching efficiently', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add 50 MCPs
      await act(async () => {
        const addPromises = Array.from({ length: 50 }, (_, i) => 
          result.current.addMCP(createTestMCP(i + 1))
        )
        await Promise.all(addPromises)
      })
      
      const mcpIds = result.current.mcps.map(m => m.id)
      
      // Create 5 profiles with different MCP combinations
      const profiles = []
      for (let i = 0; i < 5; i++) {
        const profileMcps = mcpIds.slice(i * 10, (i + 1) * 10)
        await act(async () => {
          await result.current.createProfile({
            name: `Profile ${i + 1}`,
            description: `Profile with MCPs ${i * 10 + 1}-${(i + 1) * 10}`,
            mcpIds: profileMcps,
            isDefault: false
          })
        })
        profiles.push(result.current.profiles[result.current.profiles.length - 1])
      }
      
      // Test rapid switching between profiles
      const switches = 20
      const switchTimes: number[] = []
      
      for (let i = 0; i < switches; i++) {
        const profile = profiles[i % profiles.length]
        
        const switchStart = performance.now()
        
        await act(async () => {
          await result.current.loadProfile(profile.id)
        })
        
        const switchTime = performance.now() - switchStart
        switchTimes.push(switchTime)
        
        // Verify correct profile is loaded
        expect(result.current.selectedProfile?.id).toBe(profile.id)
      }
      
      // Calculate average switch time
      const avgSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length
      expect(avgSwitchTime).toBeLessThan(100) // Average should be under 100ms
      
      // No switch should take longer than 500ms
      expect(Math.max(...switchTimes)).toBeLessThan(500)
    })
  })

  describe('Change Detection Performance', () => {
    it('should detect changes efficiently with large MCP sets', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add 100 MCPs
      await act(async () => {
        const addPromises = Array.from({ length: 100 }, (_, i) => 
          result.current.addMCP(createTestMCP(i + 1))
        )
        await Promise.all(addPromises)
      })
      
      // Create profile
      const mcpIds = result.current.mcps.map(m => m.id)
      await act(async () => {
        await result.current.createProfile({
          name: 'Change Detection Profile',
          description: 'Testing change detection',
          mcpIds: mcpIds.slice(0, 50), // First 50 MCPs
          isDefault: false
        })
      })
      
      const profileId = result.current.profiles[0].id
      await act(async () => {
        await result.current.loadProfile(profileId)
      })
      
      // Test bulk MCP toggle performance
      const toggleStart = performance.now()
      
      await act(async () => {
        await result.current.bulkToggleMCPs(mcpIds.slice(0, 25), false)
      })
      
      const toggleTime = performance.now() - toggleStart
      expect(toggleTime).toBeLessThan(200) // Should complete within 200ms
      
      // Test individual MCP toggle performance
      const individualToggles: number[] = []
      
      for (let i = 0; i < 10; i++) {
        const toggleStart = performance.now()
        
        await act(async () => {
          await result.current.toggleMCP(mcpIds[i])
        })
        
        const toggleTime = performance.now() - toggleStart
        individualToggles.push(toggleTime)
      }
      
      const avgToggleTime = individualToggles.reduce((a, b) => a + b, 0) / individualToggles.length
      expect(avgToggleTime).toBeLessThan(50) // Average should be under 50ms
    })

    it('should maintain performance during concurrent operations', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add MCPs
      await act(async () => {
        const addPromises = Array.from({ length: 30 }, (_, i) => 
          result.current.addMCP(createTestMCP(i + 1))
        )
        await Promise.all(addPromises)
      })
      
      const mcpIds = result.current.mcps.map(m => m.id)
      
      // Create profile
      await act(async () => {
        await result.current.createProfile({
          name: 'Concurrent Test Profile',
          description: 'Testing concurrent operations',
          mcpIds: mcpIds.slice(0, 15),
          isDefault: false
        })
      })
      
      const profileId = result.current.profiles[0].id
      
      // Perform concurrent operations
      const concurrentStart = performance.now()
      
      await act(async () => {
        const operations = [
          result.current.loadProfile(profileId),
          result.current.toggleMCP(mcpIds[0]),
          result.current.toggleMCP(mcpIds[1]),
          result.current.updateProfile(profileId, { description: 'Updated during concurrent test' }),
          result.current.bulkToggleMCPs([mcpIds[2], mcpIds[3]], false)
        ]
        
        await Promise.allSettled(operations)
      })
      
      const concurrentTime = performance.now() - concurrentStart
      expect(concurrentTime).toBeLessThan(1000) // Should complete within 1 second
      
      // Verify final state is consistent
      expect(result.current.selectedProfile?.id).toBe(profileId)
      expect(result.current.profiles[0].description).toBe('Updated during concurrent test')
    })
  })

  describe('Memory Performance', () => {
    it('should not create memory leaks during profile operations', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Track initial memory if available (not available in all test environments)
      const getMemoryUsage = () => {
        if (global.gc && (performance as any).measureUserAgentSpecificMemory) {
          global.gc()
          return (performance as any).measureUserAgentSpecificMemory()
        }
        return null
      }
      
      const initialMemory = getMemoryUsage()
      
      // Perform many operations
      for (let iteration = 0; iteration < 10; iteration++) {
        // Add MCPs
        await act(async () => {
          const addPromises = Array.from({ length: 10 }, (_, i) => 
            result.current.addMCP(createTestMCP(iteration * 10 + i + 1))
          )
          await Promise.all(addPromises)
        })
        
        // Create profile
        const mcpIds = result.current.mcps.map(m => m.id)
        await act(async () => {
          await result.current.createProfile({
            name: `Iteration Profile ${iteration}`,
            description: `Profile for iteration ${iteration}`,
            mcpIds: mcpIds.slice(-5), // Last 5 MCPs
            isDefault: false
          })
        })
        
        // Load and switch profiles
        const profiles = result.current.profiles
        for (const profile of profiles.slice(-3)) { // Last 3 profiles
          await act(async () => {
            await result.current.loadProfile(profile.id)
          })
        }
        
        // Clean up some profiles to prevent excessive memory usage
        if (profiles.length > 5) {
          const oldestProfile = profiles[0]
          await act(async () => {
            await result.current.deleteProfile(oldestProfile.id)
          })
        }
      }
      
      const finalMemory = getMemoryUsage()
      
      // If memory measurement is available, verify no major leaks
      if (initialMemory && finalMemory) {
        const memoryIncrease = await finalMemory - await initialMemory
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // Less than 50MB increase
      }
      
      // Verify operations completed successfully
      expect(result.current.mcps.length).toBe(100)
      expect(result.current.profiles.length).toBeLessThanOrEqual(10)
    })

    it('should handle large filter operations efficiently', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      // Add MCPs with various categories and tags
      await act(async () => {
        const addPromises = Array.from({ length: 200 }, (_, i) => 
          result.current.addMCP({
            ...createTestMCP(i + 1),
            category: `Category ${i % 10}`,
            tags: [`tag-${i % 5}`, `type-${i % 3}`],
            disabled: i % 7 === 0 // Every 7th MCP is disabled
          })
        )
        await Promise.all(addPromises)
      })
      
      // Test various filter operations
      const filterTests = [
        { search: 'Performance MCP 1', expectedMin: 10 }, // Should match MCPs 1, 10, 11, etc.
        { category: 'Category 5', expectedCount: 20 },
        { status: 'enabled', expectedMin: 170 },
        { status: 'disabled', expectedMax: 30 },
        { tags: ['tag-2'], expectedMin: 35 }
      ]
      
      for (const filterTest of filterTests) {
        const filterStart = performance.now()
        
        act(() => {
          if (filterTest.search) {
            result.current.setFilters({ search: filterTest.search })
          } else if (filterTest.category) {
            result.current.setFilters({ category: filterTest.category })
          } else if (filterTest.status) {
            result.current.setFilters({ status: filterTest.status as 'all' | 'enabled' | 'disabled' })
          } else if (filterTest.tags) {
            result.current.setFilters({ tags: filterTest.tags })
          }
        })
        
        const filtered = result.current.getFilteredMCPs()
        const filterTime = performance.now() - filterStart
        
        expect(filterTime).toBeLessThan(100) // Should filter within 100ms
        
        if (filterTest.expectedCount) {
          expect(filtered.length).toBe(filterTest.expectedCount)
        } else if (filterTest.expectedMin) {
          expect(filtered.length).toBeGreaterThanOrEqual(filterTest.expectedMin)
        } else if (filterTest.expectedMax) {
          expect(filtered.length).toBeLessThanOrEqual(filterTest.expectedMax)
        }
        
        // Clear filters for next test
        act(() => {
          result.current.clearFilters()
        })
      }
    })
  })

  describe('Real-world Performance Scenarios', () => {
    it('should handle typical user workflow efficiently', async () => {
      const { result } = renderHook(() => useMCPStore())
      
      const workflowStart = performance.now()
      
      // Simulate typical user workflow:
      // 1. Add 20 MCPs (realistic number for most users)
      await act(async () => {
        const addPromises = Array.from({ length: 20 }, (_, i) => 
          result.current.addMCP(createTestMCP(i + 1))
        )
        await Promise.all(addPromises)
      })
      
      const mcpIds = result.current.mcps.map(m => m.id)
      
      // 2. Create 3 profiles for different use cases
      const profiles = [
        { name: 'Development', mcps: mcpIds.slice(0, 8) },
        { name: 'Testing', mcps: mcpIds.slice(8, 15) },
        { name: 'Production', mcps: mcpIds.slice(15, 20) }
      ]
      
      for (const profile of profiles) {
        await act(async () => {
          await result.current.createProfile({
            name: profile.name,
            description: `${profile.name} environment`,
            mcpIds: profile.mcps,
            isDefault: false
          })
        })
      }
      
      // 3. Switch between profiles multiple times (typical usage)
      for (let i = 0; i < 6; i++) {
        const profileIndex = i % 3
        const profile = result.current.profiles[profileIndex]
        
        await act(async () => {
          await result.current.loadProfile(profile.id)
        })
      }
      
      // 4. Make some configuration changes
      await act(async () => {
        await result.current.toggleMCP(mcpIds[0])
        await result.current.toggleMCP(mcpIds[5])
      })
      
      // 5. Update a profile
      await act(async () => {
        await result.current.updateProfile(result.current.profiles[0].id, {
          description: 'Updated development environment'
        })
      })
      
      // 6. Search and filter MCPs
      act(() => {
        result.current.setFilters({ search: 'MCP 1' })
      })
      
      const filtered = result.current.getFilteredMCPs()
      expect(filtered.length).toBeGreaterThan(0)
      
      act(() => {
        result.current.clearFilters()
      })
      
      const workflowTime = performance.now() - workflowStart
      
      // Entire workflow should complete within 5 seconds
      expect(workflowTime).toBeLessThan(5000)
      
      // Verify final state
      expect(result.current.mcps).toHaveLength(20)
      expect(result.current.profiles).toHaveLength(3)
      expect(result.current.selectedProfile).not.toBeNull()
    })
  })
})