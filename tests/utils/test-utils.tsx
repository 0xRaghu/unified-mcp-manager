/**
 * Test utilities for profile save functionality validation
 */
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'
import type { MCP, Profile } from '../../src/types'

// Mock data generators
export const createMockMCP = (overrides: Partial<MCP> = {}): MCP => ({
  id: crypto.randomUUID(),
  name: 'Test MCP',
  type: 'stdio',
  command: 'test-command',
  args: [],
  category: 'Test',
  description: 'Test MCP for validation',
  tags: ['test'],
  source: 'manual',
  disabled: false,
  usageCount: 0,
  lastUsed: new Date(),
  env: {},
  alwaysAllow: [],
  ...overrides
})

export const createMockProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: crypto.randomUUID(),
  name: 'Test Profile',
  description: 'Test profile for validation',
  mcpIds: [],
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

// Store mock factory
export const createMockStore = (initialState: any = {}) => ({
  // State
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
  filters: { search: '', category: '', status: 'all', tags: [] },
  bulkActions: { selectedIds: [], action: 'enable' },
  selectedProfile: null,
  isLoading: false,
  error: null,

  // Operations
  addMCP: vi.fn(),
  updateMCP: vi.fn(),
  deleteMCP: vi.fn(),
  toggleMCP: vi.fn(),
  bulkToggleMCPs: vi.fn(),
  bulkDeleteMCPs: vi.fn(),
  duplicateMCP: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
  setActiveProfile: vi.fn(),
  loadProfile: vi.fn(),
  updateSettings: vi.fn(),
  setFilters: vi.fn(),
  clearFilters: vi.fn(),
  setBulkSelection: vi.fn(),
  clearBulkSelection: vi.fn(),
  toggleBulkSelection: vi.fn(),
  importMCPs: vi.fn(),
  exportMCPs: vi.fn(),
  exportProfile: vi.fn(),
  importProfile: vi.fn(),
  createBackup: vi.fn(),
  restoreBackup: vi.fn(),
  getBackups: vi.fn(),
  searchMCPs: vi.fn(),
  getFilteredMCPs: vi.fn(),
  getMCPsByCategory: vi.fn(),
  incrementUsage: vi.fn(),
  loadData: vi.fn(),
  saveData: vi.fn(),
  clearAllData: vi.fn(),

  ...initialState
})

// Performance measurement utilities
export class PerformanceMeasurer {
  private measurements: Map<string, number[]> = new Map()

  start(label: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (!this.measurements.has(label)) {
        this.measurements.set(label, [])
      }
      this.measurements.get(label)!.push(duration)
    }
  }

  getStats(label: string) {
    const times = this.measurements.get(label) || []
    if (times.length === 0) return null

    const sorted = [...times].sort((a, b) => a - b)
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    
    return {
      count: times.length,
      avg,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  clear() {
    this.measurements.clear()
  }

  expectPerformance(label: string, expectations: {
    maxAvg?: number
    maxP95?: number
    maxP99?: number
    maxTime?: number
  }) {
    const stats = this.getStats(label)
    expect(stats, `No measurements found for ${label}`).not.toBeNull()
    
    if (expectations.maxAvg !== undefined) {
      expect(stats!.avg, `${label} average time`).toBeLessThan(expectations.maxAvg)
    }
    
    if (expectations.maxP95 !== undefined) {
      expect(stats!.p95, `${label} P95 time`).toBeLessThan(expectations.maxP95)
    }
    
    if (expectations.maxP99 !== undefined) {
      expect(stats!.p99, `${label} P99 time`).toBeLessThan(expectations.maxP99)
    }
    
    if (expectations.maxTime !== undefined) {
      expect(stats!.max, `${label} maximum time`).toBeLessThan(expectations.maxTime)
    }
  }
}

// Change detection simulator
export class ChangeDetectionSimulator {
  private originalState: any
  private currentState: any

  constructor(initialState: any) {
    this.originalState = JSON.parse(JSON.stringify(initialState))
    this.currentState = JSON.parse(JSON.stringify(initialState))
  }

  makeChange(path: string, value: any) {
    const pathParts = path.split('.')
    let target = this.currentState
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      target = target[pathParts[i]]
    }
    
    target[pathParts[pathParts.length - 1]] = value
  }

  hasChanges(): boolean {
    return JSON.stringify(this.originalState) !== JSON.stringify(this.currentState)
  }

  getChanges(): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {}
    
    const findChanges = (original: any, current: any, path: string = '') => {
      if (typeof original !== 'object' || typeof current !== 'object') {
        if (original !== current) {
          changes[path] = { from: original, to: current }
        }
        return
      }
      
      const allKeys = new Set([...Object.keys(original), ...Object.keys(current)])
      
      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key
        
        if (!(key in original)) {
          changes[newPath] = { from: undefined, to: current[key] }
        } else if (!(key in current)) {
          changes[newPath] = { from: original[key], to: undefined }
        } else {
          findChanges(original[key], current[key], newPath)
        }
      }
    }
    
    findChanges(this.originalState, this.currentState)
    return changes
  }

  reset() {
    this.currentState = JSON.parse(JSON.stringify(this.originalState))
  }

  commit() {
    this.originalState = JSON.parse(JSON.stringify(this.currentState))
  }
}

// Profile validation utilities
export const validateProfile = (profile: Profile): string[] => {
  const errors: string[] = []
  
  if (!profile.name?.trim()) {
    errors.push('Profile name is required')
  }
  
  if (profile.name && profile.name.length > 100) {
    errors.push('Profile name must be less than 100 characters')
  }
  
  if (profile.description && profile.description.length > 500) {
    errors.push('Profile description must be less than 500 characters')
  }
  
  if (!Array.isArray(profile.mcpIds)) {
    errors.push('Profile mcpIds must be an array')
  }
  
  if (!profile.id) {
    errors.push('Profile must have an ID')
  }
  
  if (!(profile.createdAt instanceof Date)) {
    errors.push('Profile must have a valid creation date')
  }
  
  if (!(profile.updatedAt instanceof Date)) {
    errors.push('Profile must have a valid update date')
  }
  
  return errors
}

export const validateMCP = (mcp: MCP): string[] => {
  const errors: string[] = []
  
  if (!mcp.name?.trim()) {
    errors.push('MCP name is required')
  }
  
  if (!mcp.type) {
    errors.push('MCP type is required')
  }
  
  if (mcp.type === 'stdio' && !mcp.command) {
    errors.push('Stdio MCP must have a command')
  }
  
  if ((mcp.type === 'http' || mcp.type === 'sse') && !mcp.url) {
    errors.push('HTTP/SSE MCP must have a URL')
  }
  
  if (!mcp.category?.trim()) {
    errors.push('MCP category is required')
  }
  
  if (!Array.isArray(mcp.tags)) {
    errors.push('MCP tags must be an array')
  }
  
  return errors
}

// Test data generators
export const generateTestMCPs = (count: number, options: Partial<MCP> = {}): MCP[] => {
  return Array.from({ length: count }, (_, i) => createMockMCP({
    name: `Test MCP ${i + 1}`,
    command: `test-command-${i + 1}`,
    category: `Category ${(i % 5) + 1}`,
    tags: [`tag-${i % 3}`, `type-${i % 2}`],
    disabled: i % 7 === 0, // Every 7th MCP is disabled
    ...options
  }))
}

export const generateTestProfiles = (count: number, mcps: MCP[]): Profile[] => {
  return Array.from({ length: count }, (_, i) => {
    const mcpCount = Math.min(mcps.length, Math.floor(Math.random() * 10) + 1)
    const selectedMCPs = mcps.slice(0, mcpCount)
    
    return createMockProfile({
      name: `Test Profile ${i + 1}`,
      description: `Profile ${i + 1} with ${mcpCount} MCPs`,
      mcpIds: selectedMCPs.map(mcp => mcp.id),
      isDefault: i === 0 // First profile is default
    })
  })
}

// Async test helpers
export const waitFor = (condition: () => boolean, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const check = () => {
      if (condition()) {
        resolve()
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Condition not met within ${timeout}ms`))
      } else {
        setTimeout(check, 10)
      }
    }
    
    check()
  })
}

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Custom render with providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
export { vi as mockImplementation }
export { expect }

// Performance expectations
export const PERFORMANCE_EXPECTATIONS = {
  PROFILE_CREATION: 500, // ms
  PROFILE_LOAD: 200, // ms
  PROFILE_SWITCH: 100, // ms
  MCP_TOGGLE: 50, // ms
  BULK_OPERATION: 300, // ms
  SEARCH_FILTER: 100, // ms
  UI_RESPONSE: 16, // ms (60fps)
  SAVE_OPERATION: 1000, // ms
} as const