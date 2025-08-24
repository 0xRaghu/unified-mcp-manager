/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileDialog } from '../../../src/components/ProfileDialog'
import { useMCPStore } from '../../../src/stores/mcpStore'
import type { MCP, Profile } from '../../../src/types'

// Mock the store
vi.mock('../../../src/stores/mcpStore', () => ({
  useMCPStore: vi.fn()
}))

const mockMCPs: MCP[] = [
  {
    id: 'mcp-1',
    name: 'Test MCP 1',
    type: 'stdio',
    command: 'test1',
    args: [],
    category: 'Test',
    description: 'Test MCP 1',
    tags: [],
    source: 'manual',
    disabled: false,
    usageCount: 0,
    lastUsed: new Date(),
    env: {},
    alwaysAllow: []
  },
  {
    id: 'mcp-2', 
    name: 'Test MCP 2',
    type: 'http',
    url: 'http://test.com',
    category: 'Test',
    description: 'Test MCP 2',
    tags: [],
    source: 'manual',
    disabled: true,
    usageCount: 5,
    lastUsed: new Date(),
    env: {},
    alwaysAllow: [],
    headers: {}
  }
]

const mockProfile: Profile = {
  id: 'profile-1',
  name: 'Test Profile',
  description: 'Test Description',
  mcpIds: ['mcp-1'],
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('ProfileDialog Component', () => {
  const mockCreateProfile = vi.fn()
  const mockUpdateProfile = vi.fn()
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.mocked(useMCPStore).mockReturnValue({
      mcps: mockMCPs,
      createProfile: mockCreateProfile,
      updateProfile: mockUpdateProfile,
      // Add other required store properties with default values
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
      addMCP: vi.fn(),
      updateMCP: vi.fn(),
      deleteMCP: vi.fn(),
      toggleMCP: vi.fn(),
      bulkToggleMCPs: vi.fn(),
      bulkDeleteMCPs: vi.fn(),
      duplicateMCP: vi.fn(),
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
      clearAllData: vi.fn()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Mode', () => {
    it('should render create mode correctly', () => {
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
        />
      )

      expect(screen.getByText('Create New Profile')).toBeInTheDocument()
      expect(screen.getByText('Create a new profile to save a specific combination of MCPs')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Profile' })).toBeInTheDocument()
    })

    it('should auto-generate profile name based on MCP count', () => {
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
        />
      )

      const nameInput = screen.getByLabelText('Profile Name') as HTMLInputElement
      expect(nameInput.value).toMatch(/Profile \d+/)
    })

    it('should create profile with selected MCPs', async () => {
      const user = userEvent.setup()
      
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
        />
      )

      // Fill in profile details
      const nameInput = screen.getByLabelText('Profile Name')
      const descriptionInput = screen.getByLabelText('Description')
      
      await user.clear(nameInput)
      await user.type(nameInput, 'My Test Profile')
      await user.type(descriptionInput, 'Test description')

      // Select an MCP
      const mcpSwitch = screen.getByRole('switch', { name: /test mcp 1/i })
      await user.click(mcpSwitch)

      // Submit form
      const createButton = screen.getByRole('button', { name: 'Create Profile' })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockCreateProfile).toHaveBeenCalledWith({
          name: 'My Test Profile',
          description: 'Test description', 
          mcpIds: ['mcp-1'],
          isDefault: false
        })
      })

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should handle form validation errors', async () => {
      const user = userEvent.setup()
      
      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
        />
      )

      // Clear the name field
      const nameInput = screen.getByLabelText('Profile Name')
      await user.clear(nameInput)

      // Try to submit
      const createButton = screen.getByRole('button', { name: 'Create Profile' })
      await user.click(createButton)

      expect(alertSpy).toHaveBeenCalledWith('Profile name is required')
      expect(mockCreateProfile).not.toHaveBeenCalled()
      
      alertSpy.mockRestore()
    })
  })

  describe('Edit Mode', () => {
    it('should render edit mode with existing profile data', () => {
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          profile={mockProfile}
          mode="edit"
        />
      )

      expect(screen.getByText('Edit Profile')).toBeInTheDocument()
      expect(screen.getByText('Update your profile configuration and MCP selection')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Update Profile' })).toBeInTheDocument()

      const nameInput = screen.getByLabelText('Profile Name') as HTMLInputElement
      const descriptionInput = screen.getByLabelText('Description') as HTMLTextAreaElement
      
      expect(nameInput.value).toBe('Test Profile')
      expect(descriptionInput.value).toBe('Test Description')
    })

    it('should update profile with modified data', async () => {
      const user = userEvent.setup()
      
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          profile={mockProfile}
          mode="edit"
        />
      )

      // Modify profile name
      const nameInput = screen.getByLabelText('Profile Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Profile')

      // Add another MCP
      const mcpSwitch = screen.getByRole('switch', { name: /test mcp 2/i })
      await user.click(mcpSwitch)

      // Submit form  
      const updateButton = screen.getByRole('button', { name: 'Update Profile' })
      await user.click(updateButton)

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith('profile-1', {
          name: 'Updated Profile',
          description: 'Test Description',
          mcpIds: ['mcp-1', 'mcp-2'],
          isDefault: false
        })
      })

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('MCP Selection', () => {
    it('should display MCP count badge', () => {
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          profile={mockProfile}
          mode="edit"
        />
      )

      expect(screen.getByText('1 selected')).toBeInTheDocument()
    })

    it('should handle Select All functionality', async () => {
      const user = userEvent.setup()
      
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
        />
      )

      const selectAllButton = screen.getByRole('button', { name: 'Select All' })
      await user.click(selectAllButton)

      expect(screen.getByText('2 selected')).toBeInTheDocument()
    })

    it('should handle Select Enabled functionality', async () => {
      const user = userEvent.setup()
      
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
        />
      )

      const selectEnabledButton = screen.getByRole('button', { name: 'Select Enabled' })
      await user.click(selectEnabledButton)

      // Only MCP 1 is enabled, so should select 1
      expect(screen.getByText('1 selected')).toBeInTheDocument()
    })

    it('should handle Select None functionality', async () => {
      const user = userEvent.setup()
      
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          profile={mockProfile}
          mode="edit"
        />
      )

      // Initially has 1 selected
      expect(screen.getByText('1 selected')).toBeInTheDocument()

      const selectNoneButton = screen.getByRole('button', { name: 'Select None' })
      await user.click(selectNoneButton)

      expect(screen.getByText('0 selected')).toBeInTheDocument()
    })

    it('should show disabled badge for disabled MCPs', () => {
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
        />
      )

      // Test MCP 2 is disabled
      const disabledBadges = screen.getAllByText('Disabled')
      expect(disabledBadges.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle profile creation errors', async () => {
      const user = userEvent.setup()
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      
      mockCreateProfile.mockRejectedValueOnce(new Error('Creation failed'))
      
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
        />
      )

      const nameInput = screen.getByLabelText('Profile Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Test Profile')

      const createButton = screen.getByRole('button', { name: 'Create Profile' })
      await user.click(createButton)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to save profile: Creation failed')
      })

      alertSpy.mockRestore()
    })

    it('should handle profile update errors', async () => {
      const user = userEvent.setup()
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      
      mockUpdateProfile.mockRejectedValueOnce(new Error('Update failed'))
      
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          profile={mockProfile}
          mode="edit"
        />
      )

      const updateButton = screen.getByRole('button', { name: 'Update Profile' })
      await user.click(updateButton)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to save profile: Update failed')
      })

      alertSpy.mockRestore()
    })
  })

  describe('Accessibility and UX', () => {
    it('should have proper form labels and structure', () => {
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
        />
      )

      expect(screen.getByLabelText('Profile Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Set as default profile')).toBeInTheDocument()
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
        />
      )

      const nameInput = screen.getByLabelText('Profile Name')
      nameInput.focus()
      
      // Tab navigation should work
      await user.tab()
      expect(screen.getByLabelText('Set as default profile')).toHaveFocus()
    })

    it('should show selected MCPs summary', () => {
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          profile={mockProfile}
          mode="edit"
        />
      )

      expect(screen.getByText('Selected MCPs (1)')).toBeInTheDocument()
      expect(screen.getByText('Test MCP 1 ✕')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should handle large MCP lists efficiently', () => {
      const largeMCPList = Array.from({ length: 100 }, (_, i) => ({
        id: `mcp-${i}`,
        name: `Test MCP ${i}`,
        type: 'stdio' as const,
        command: `test${i}`,
        args: [],
        category: 'Test',
        description: `Test MCP ${i}`,
        tags: [],
        source: 'manual' as const,
        disabled: i % 10 === 0, // Every 10th MCP is disabled
        usageCount: i,
        lastUsed: new Date(),
        env: {},
        alwaysAllow: []
      }))

      vi.mocked(useMCPStore).mockReturnValue({
        ...vi.mocked(useMCPStore)(),
        mcps: largeMCPList
      })

      const startTime = performance.now()
      
      render(
        <ProfileDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          mode="create"
        />
      )

      const endTime = performance.now()
      
      // Should render within reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100)
      
      // All MCPs should be rendered
      expect(screen.getAllByRole('switch')).toHaveLength(100)
    })
  })
})