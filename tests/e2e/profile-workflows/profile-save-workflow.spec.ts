/**
 * End-to-End tests for Profile Save Workflow
 * Tests the complete user journey for profile management and saving
 */
import { test, expect, Page } from '@playwright/test'

const MOCK_MCPS = [
  {
    name: 'Test MCP 1',
    type: 'stdio',
    command: 'test1',
    args: [],
    description: 'First test MCP',
    category: 'Testing'
  },
  {
    name: 'Test MCP 2', 
    type: 'http',
    url: 'http://localhost:3000',
    description: 'Second test MCP',
    category: 'Testing'
  },
  {
    name: 'Test MCP 3',
    type: 'stdio',
    command: 'test3',
    args: [],
    description: 'Third test MCP',
    category: 'Testing'
  }
]

// Helper function to add test MCPs
async function addTestMCPs(page: Page) {
  for (const mcp of MOCK_MCPS) {
    await page.getByRole('button', { name: 'Add MCP' }).click()
    await page.getByLabel('Name').fill(mcp.name)
    await page.getByLabel('Description').fill(mcp.description)
    await page.getByLabel('Category').fill(mcp.category)
    
    if (mcp.type === 'http') {
      await page.getByLabel('Type').selectOption('http')
      await page.getByLabel('URL').fill(mcp.url)
    } else {
      await page.getByLabel('Command').fill(mcp.command)
    }
    
    await page.getByRole('button', { name: 'Save MCP' }).click()
    await expect(page.getByText(`${mcp.name} has been added`)).toBeVisible()
  }
}

// Helper to wait for profile operations
async function waitForProfileOperation(page: Page, operation: string) {
  await expect(page.getByText(new RegExp(operation, 'i'))).toBeVisible({ timeout: 5000 })
}

test.describe('Profile Save Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Wait for app to load
    await expect(page.getByText('MCP Manager')).toBeVisible()
    
    // Clear any existing data
    await page.evaluate(() => {
      localStorage.clear()
    })
    
    await page.reload()
  })

  test.describe('Complete Profile Creation Workflow', () => {
    test('should create profile with selected MCPs and verify save behavior', async ({ page }) => {
      // Add test MCPs first
      await addTestMCPs(page)
      
      // Verify MCPs are added
      await expect(page.getByText('Total MCPs: 3')).toBeVisible()
      
      // Open profile creation dialog
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Create New Profile').click()
      
      // Fill profile details
      await page.getByLabel('Profile Name').fill('Development Profile')
      await page.getByLabel('Description').fill('Profile for development work')
      
      // Select MCPs 1 and 3
      await page.getByRole('switch', { name: /test mcp 1/i }).click()
      await page.getByRole('switch', { name: /test mcp 3/i }).click()
      
      // Verify selection count
      await expect(page.getByText('2 selected')).toBeVisible()
      
      // Save profile
      await page.getByRole('button', { name: 'Create Profile' }).click()
      
      // Verify profile creation success
      await waitForProfileOperation(page, 'profile.*created')
      
      // Verify profile appears in dropdown
      await page.getByRole('button', { name: /profile/i }).click()
      await expect(page.getByText('Development Profile')).toBeVisible()
    })

    test('should handle profile switching and MCP state changes', async ({ page }) => {
      // Add test MCPs
      await addTestMCPs(page)
      
      // Create first profile
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Create New Profile').click()
      await page.getByLabel('Profile Name').clear()
      await page.getByLabel('Profile Name').fill('Profile A')
      await page.getByRole('switch', { name: /test mcp 1/i }).click()
      await page.getByRole('switch', { name: /test mcp 2/i }).click()
      await page.getByRole('button', { name: 'Create Profile' }).click()
      await waitForProfileOperation(page, 'profile.*created')
      
      // Create second profile
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Create New Profile').click()
      await page.getByLabel('Profile Name').clear()
      await page.getByLabel('Profile Name').fill('Profile B')
      await page.getByRole('switch', { name: /test mcp 3/i }).click()
      await page.getByRole('button', { name: 'Create Profile' }).click()
      await waitForProfileOperation(page, 'profile.*created')
      
      // Switch to Profile A
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Profile A').click()
      
      // Verify MCPs 1 and 2 are enabled, 3 is disabled
      await expect(page.getByText('Enabled: 2')).toBeVisible()
      
      // Switch to Profile B
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Profile B').click()
      
      // Verify only MCP 3 is enabled
      await expect(page.getByText('Enabled: 1')).toBeVisible()
      
      // Switch to "All MCPs" mode
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('All MCPs').click()
      
      // MCP states should remain from last profile load
      await expect(page.getByText('Enabled: 1')).toBeVisible()
    })
  })

  test.describe('Profile Editing and Updates', () => {
    test('should edit existing profile and save changes', async ({ page }) => {
      // Add test MCPs
      await addTestMCPs(page)
      
      // Create initial profile
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Create New Profile').click()
      await page.getByLabel('Profile Name').clear()
      await page.getByLabel('Profile Name').fill('Original Profile')
      await page.getByRole('switch', { name: /test mcp 1/i }).click()
      await page.getByRole('button', { name: 'Create Profile' }).click()
      await waitForProfileOperation(page, 'profile.*created')
      
      // Edit profile
      await page.getByRole('button', { name: /profile/i }).click()
      
      // Find and click edit button (gear icon)
      await page.locator('[data-testid="profile-edit"], .group button[data-testid="edit"]').first().click()
      
      // Update profile details
      await page.getByLabel('Profile Name').clear()
      await page.getByLabel('Profile Name').fill('Updated Profile')
      await page.getByLabel('Description').fill('Updated description')
      
      // Add another MCP
      await page.getByRole('switch', { name: /test mcp 2/i }).click()
      
      // Verify 2 MCPs selected
      await expect(page.getByText('2 selected')).toBeVisible()
      
      // Save changes
      await page.getByRole('button', { name: 'Update Profile' }).click()
      
      // Verify update success
      await waitForProfileOperation(page, 'profile.*updated')
      
      // Verify updated name appears in dropdown
      await page.getByRole('button', { name: /profile/i }).click()
      await expect(page.getByText('Updated Profile')).toBeVisible()
    })
  })

  test.describe('Profile Management Interface', () => {
    test('should manage multiple profiles through profile manager', async ({ page }) => {
      // Add test MCPs
      await addTestMCPs(page)
      
      // Create multiple profiles
      const profiles = [
        { name: 'Dev Profile', mcps: ['Test MCP 1', 'Test MCP 2'] },
        { name: 'Test Profile', mcps: ['Test MCP 3'] },
        { name: 'Full Profile', mcps: ['Test MCP 1', 'Test MCP 2', 'Test MCP 3'] }
      ]
      
      for (const profile of profiles) {
        await page.getByRole('button', { name: /profile/i }).click()
        await page.getByText('Create New Profile').click()
        await page.getByLabel('Profile Name').clear()
        await page.getByLabel('Profile Name').fill(profile.name)
        
        // Select specified MCPs
        for (const mcpName of profile.mcps) {
          await page.getByRole('switch', { name: new RegExp(mcpName, 'i') }).click()
        }
        
        await page.getByRole('button', { name: 'Create Profile' }).click()
        await waitForProfileOperation(page, 'profile.*created')
      }
      
      // Open Profile Manager
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Manage Profiles').click()
      
      // Verify all profiles are listed
      await expect(page.getByText('Dev Profile')).toBeVisible()
      await expect(page.getByText('Test Profile')).toBeVisible()
      await expect(page.getByText('Full Profile')).toBeVisible()
      
      // Verify MCP counts
      await expect(page.getByText('2 MCPs').first()).toBeVisible()
      await expect(page.getByText('1 MCPs')).toBeVisible()
      await expect(page.getByText('3 MCPs')).toBeVisible()
      
      // Test profile export
      await page.locator('[data-testid="profile-menu"]').first().click()
      await page.getByText('Export').click()
      
      // Should show success message
      await expect(page.getByText(/copied.*clipboard/i)).toBeVisible()
    })
  })

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle empty profile creation gracefully', async ({ page }) => {
      // Try to create profile with no name
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Create New Profile').click()
      
      // Clear default name and try to save
      await page.getByLabel('Profile Name').clear()
      await page.getByRole('button', { name: 'Create Profile' }).click()
      
      // Should show validation error
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('Profile name is required')
        dialog.accept()
      })
    })

    test('should handle profile deletion with confirmation', async ({ page }) => {
      // Add MCPs and create profile first
      await addTestMCPs(page)
      
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Create New Profile').click()
      await page.getByLabel('Profile Name').clear()
      await page.getByLabel('Profile Name').fill('Profile to Delete')
      await page.getByRole('button', { name: 'Create Profile' }).click()
      await waitForProfileOperation(page, 'profile.*created')
      
      // Delete profile
      await page.getByRole('button', { name: /profile/i }).click()
      await page.locator('[data-testid="profile-delete"], .group button[data-testid="delete"]').first().click()
      
      // Handle confirmation dialog
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('Are you sure')
        dialog.accept()
      })
      
      // Verify profile is removed
      await waitForProfileOperation(page, 'profile.*deleted')
    })

    test('should handle no MCPs scenario', async ({ page }) => {
      // Try to create profile with no MCPs available
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Create New Profile').click()
      
      // Should show "No MCPs available" message
      await expect(page.getByText('No MCPs available. Add some MCPs first.')).toBeVisible()
      
      // Should still allow profile creation
      await page.getByLabel('Profile Name').clear()
      await page.getByLabel('Profile Name').fill('Empty Profile')
      await page.getByRole('button', { name: 'Create Profile' }).click()
      
      await waitForProfileOperation(page, 'profile.*created')
    })
  })

  test.describe('Performance and Responsiveness', () => {
    test('should handle large number of MCPs efficiently', async ({ page }) => {
      // Add many MCPs quickly
      const manyMCPs = Array.from({ length: 50 }, (_, i) => ({
        name: `Performance MCP ${i + 1}`,
        type: 'stdio',
        command: `test-${i + 1}`,
        description: `Performance test MCP ${i + 1}`,
        category: 'Performance'
      }))
      
      // Add MCPs in batches to avoid timeout
      for (let i = 0; i < manyMCPs.length; i += 10) {
        const batch = manyMCPs.slice(i, i + 10)
        for (const mcp of batch) {
          await page.getByRole('button', { name: 'Add MCP' }).click()
          await page.getByLabel('Name').fill(mcp.name)
          await page.getByLabel('Command').fill(mcp.command)
          await page.getByRole('button', { name: 'Save MCP' }).click()
        }
      }
      
      // Verify count
      await expect(page.getByText(`Total MCPs: ${manyMCPs.length}`)).toBeVisible()
      
      // Create profile with many MCPs
      const startTime = Date.now()
      
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Create New Profile').click()
      
      // Profile dialog should open quickly
      await expect(page.getByText('Create New Profile')).toBeVisible()
      
      const dialogOpenTime = Date.now() - startTime
      expect(dialogOpenTime).toBeLessThan(2000) // Should open within 2 seconds
      
      // Select all MCPs should work efficiently
      const selectAllStart = Date.now()
      await page.getByRole('button', { name: 'Select All' }).click()
      
      // All MCPs should be selected
      await expect(page.getByText(`${manyMCPs.length} selected`)).toBeVisible()
      
      const selectAllTime = Date.now() - selectAllStart
      expect(selectAllTime).toBeLessThan(1000) // Should complete within 1 second
      
      // Save profile
      await page.getByLabel('Profile Name').clear()
      await page.getByLabel('Profile Name').fill('Large Profile')
      
      const saveStart = Date.now()
      await page.getByRole('button', { name: 'Create Profile' }).click()
      
      await waitForProfileOperation(page, 'profile.*created')
      
      const saveTime = Date.now() - saveStart
      expect(saveTime).toBeLessThan(3000) // Should save within 3 seconds
    })

    test('should maintain responsive UI during profile operations', async ({ page }) => {
      // Add test MCPs
      await addTestMCPs(page)
      
      // Test rapid profile switching
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Create New Profile').click()
      await page.getByLabel('Profile Name').clear()
      await page.getByLabel('Profile Name').fill('Rapid Profile 1')
      await page.getByRole('switch', { name: /test mcp 1/i }).click()
      await page.getByRole('button', { name: 'Create Profile' }).click()
      await waitForProfileOperation(page, 'profile.*created')
      
      await page.getByRole('button', { name: /profile/i }).click()
      await page.getByText('Create New Profile').click()
      await page.getByLabel('Profile Name').clear()
      await page.getByLabel('Profile Name').fill('Rapid Profile 2')
      await page.getByRole('switch', { name: /test mcp 2/i }).click()
      await page.getByRole('button', { name: 'Create Profile' }).click()
      await waitForProfileOperation(page, 'profile.*created')
      
      // Rapidly switch between profiles
      const switches = 5
      for (let i = 0; i < switches; i++) {
        const profile = i % 2 === 0 ? 'Rapid Profile 1' : 'Rapid Profile 2'
        
        await page.getByRole('button', { name: /profile/i }).click()
        await page.getByText(profile).click()
        
        // Should update MCP counts quickly
        const expectedCount = i % 2 === 0 ? 1 : 1
        await expect(page.getByText(`Enabled: ${expectedCount}`)).toBeVisible({ timeout: 1000 })
      }
      
      // UI should remain responsive
      await expect(page.getByText('MCP Manager')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Add MCP' })).toBeVisible()
    })
  })
})