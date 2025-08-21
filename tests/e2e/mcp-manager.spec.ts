import { test, expect } from '@playwright/test';

test.describe('MCP Manager UI', () => {
  test('should load the homepage with empty state', async ({ page }) => {
    await page.goto('/');
    
    // Check if the main title is visible
    await expect(page.getByRole('heading', { name: 'MCP Manager' })).toBeVisible();
    await expect(page.getByText('Centralized MCP Configuration Tool')).toBeVisible();
    
    // Check if stats cards are visible
    await expect(page.getByText('Active MCPs')).toBeVisible();
    await expect(page.getByText('Total Usage')).toBeVisible();
    await expect(page.getByText('Categories').first()).toBeVisible();
    await expect(page.getByText('Issues')).toBeVisible();
    
    // Check empty state
    await expect(page.getByText('No MCPs Yet')).toBeVisible();
    await expect(page.getByText('Get started by adding your first MCP configuration')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add First MCP' })).toBeVisible();
  });

  test('should have functional search input', async ({ page }) => {
    await page.goto('/');
    
    // Check if search input is present and functional
    const searchInput = page.getByPlaceholder('Search MCPs...');
    await expect(searchInput).toBeVisible();
    
    // Test typing in search
    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');
  });

  test('should have export buttons', async ({ page }) => {
    await page.goto('/');
    
    // Check export functionality buttons
    await expect(page.getByRole('button', { name: 'Copy JSON' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add MCP' })).toBeVisible();
  });

  test('should display correct stats with empty data', async ({ page }) => {
    await page.goto('/');
    
    // All stats should show 0 for empty state
    const statCards = page.locator('[data-slot="card"]').filter({ hasText: /Active MCPs|Total Usage|Categories|Issues/ });
    await expect(statCards).toHaveCount(4);
    
    // Check that stats show 0 values for empty state
    await expect(page.getByText('0').first()).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'MCP Manager' })).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 600 });
    await expect(page.getByRole('heading', { name: 'MCP Manager' })).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: 'MCP Manager' })).toBeVisible();
  });

  test('should handle button clicks without errors', async ({ page }) => {
    await page.goto('/');
    
    // Test clicking various buttons - they should not cause console errors
    await page.getByRole('button', { name: 'Refresh' }).click();
    await page.getByRole('button', { name: 'Filter' }).click();
    
    // Copy JSON button should work (even with empty data)
    await page.getByRole('button', { name: 'Copy JSON' }).click();
    
    // Add MCP button should be clickable
    await page.getByRole('button', { name: 'Add MCP' }).click();
  });

  test('should open and close MCP form dialog', async ({ page }) => {
    await page.goto('/');
    
    // Click Add MCP button to open dialog
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Check if dialog is open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add MCP' })).toBeVisible();
    await expect(page.getByText('Add a new MCP configuration')).toBeVisible();
    
    // Check form fields are present
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Command' })).toBeVisible();
    await expect(page.getByText('Arguments')).toBeVisible();
    await expect(page.getByText('Environment Variables')).toBeVisible();
    
    // Close dialog with Cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should allow filling out MCP form', async ({ page }) => {
    await page.goto('/');
    
    // Open form
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Fill out form
    await page.getByRole('textbox', { name: 'Name' }).fill('Test MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('node test-server.js');
    
    // Add an argument
    await page.getByPlaceholder('Argument value').fill('--port=3000');
    await page.getByRole('button', { name: 'Add Arg' }).click();
    
    // Add environment variable
    await page.getByPlaceholder('KEY').first().fill('API_KEY');
    await page.getByPlaceholder('value').first().fill('test-key-123');
    
    // Check that form can be submitted
    await expect(page.getByRole('button', { name: 'Add MCP' })).toBeEnabled();
  });

  test('should test MCP connection with notifications', async ({ page }) => {
    await page.goto('/');
    
    // First add an MCP
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Test GitHub MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('npx @modelcontextprotocol/server-github');
    await page.getByPlaceholder('KEY').first().fill('GITHUB_TOKEN');
    await page.getByPlaceholder('value').first().fill('test-token');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Wait for MCP to be added
    await expect(page.getByText('Test GitHub MCP')).toBeVisible();
    
    // Open dropdown and test connection
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
    await page.getByRole('menuitem', { name: 'Test Connection' }).click();
    
    // Check that testing notification appears
    await expect(page.getByText('Testing connection...')).toBeVisible();
    
    // Wait for test to complete and check success notification (or any result)
    await expect(page.getByText('Connected to GitHub MCP successfully').or(page.getByText('Connection successful')).or(page.getByText('Connection failed'))).toBeVisible({ timeout: 10000 });
  });

  test('should duplicate MCP correctly', async ({ page }) => {
    await page.goto('/');
    
    // Add an MCP first
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Original MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('test-command');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Duplicate it
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    
    // Check that both MCPs exist
    await expect(page.getByRole('heading', { name: 'Original MCP', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Original MCP (Copy)' })).toBeVisible();
    
    // Check stats updated
    await expect(page.getByText('2 MCPs')).toBeVisible();
  });

  test('should delete MCP with confirmation', async ({ page }) => {
    await page.goto('/');
    
    // Add an MCP first
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('To Delete MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('test-command');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Check MCP exists
    await expect(page.getByText('To Delete MCP')).toBeVisible();
    
    // Listen for dialog and accept deletion
    page.on('dialog', dialog => dialog.accept());
    
    // Delete it
    await page.getByRole('button').filter({ hasText: /^$/ }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    
    // Check MCP is gone and stats updated
    await expect(page.getByText('To Delete MCP')).not.toBeVisible();
    await expect(page.getByText('No MCPs Yet')).toBeVisible();
  });
});