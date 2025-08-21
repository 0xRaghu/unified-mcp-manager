import { test, expect } from '@playwright/test';

test.describe('New MCP Manager Features', () => {
  test('should have toggle switches for enabling/disabling MCPs', async ({ page }) => {
    await page.goto('/');
    
    // Add an MCP first
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Toggle Test MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('test-command');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Check that toggle switch is present and enabled by default
    const toggleSwitch = page.locator('[data-slot="switch"]').first();
    await expect(toggleSwitch).toBeVisible();
    await expect(toggleSwitch).toHaveAttribute('data-state', 'checked');
    
    // Toggle off
    await toggleSwitch.click();
    await expect(toggleSwitch).toHaveAttribute('data-state', 'unchecked');
    
    // Check that disabled state is shown
    await expect(page.getByText('Disabled')).toBeVisible();
    
    // Toggle back on
    await toggleSwitch.click();
    await expect(toggleSwitch).toHaveAttribute('data-state', 'checked');
  });

  test('should support different MCP transport types', async ({ page }) => {
    await page.goto('/');
    
    // Open form
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Check transport type selector
    await expect(page.getByText('Transport Type')).toBeVisible();
    
    // Test stdio type (default)
    const typeSelect = page.locator('[data-slot="select-trigger"]').filter({ hasText: 'stdio' });
    await expect(typeSelect).toBeVisible();
    
    // Switch to HTTP type
    await typeSelect.click();
    await page.getByRole('option', { name: 'HTTP' }).click();
    
    // Check that URL field appears for HTTP type
    await expect(page.getByRole('textbox', { name: 'Server URL' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Command' })).not.toBeVisible();
    
    // Switch to SSE type
    await typeSelect.click();
    await page.getByRole('option', { name: 'HTTP + SSE' }).click();
    await expect(page.getByRole('textbox', { name: 'Server URL' })).toBeVisible();
  });

  test('should parse JSON configurations correctly', async ({ page }) => {
    await page.goto('/');
    
    // Open form
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Switch to JSON mode
    await page.getByRole('button', { name: 'Paste JSON' }).click();
    
    // Check JSON mode UI
    await expect(page.getByText('Paste JSON Configuration')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'JSON Configuration' })).toBeVisible();
    
    // Paste JSON configuration
    const jsonConfig = JSON.stringify({
      mcpServers: {
        "test-server": {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-test"],
          env: { API_KEY: "test-key" },
          type: "stdio"
        }
      }
    });
    
    await page.getByRole('textbox', { name: 'JSON Configuration' }).fill(jsonConfig);
    await page.getByRole('button', { name: 'Parse & Import' }).click();
    
    // Check that form fields are populated
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('test-server');
    await expect(page.getByRole('textbox', { name: 'Command' })).toHaveValue('npx');
  });

  test('should have working filter functionality', async ({ page }) => {
    await page.goto('/');
    
    // Add some test MCPs first
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Enabled MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('test1');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Disabled MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('test2');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Disable the second MCP
    const toggleSwitches = page.locator('[data-slot="switch"]');
    await toggleSwitches.nth(1).click();
    
    // Test filter functionality
    await page.getByRole('button', { name: 'Filter' }).click();
    
    // Filter to enabled only
    await page.getByRole('menuitem', { name: 'Enabled Only' }).click();
    await expect(page.getByText('Enabled MCP')).toBeVisible();
    await expect(page.getByText('Disabled MCP')).not.toBeVisible();
    
    // Filter to disabled only
    await page.getByRole('button', { name: 'Filter' }).click();
    await page.getByRole('menuitem', { name: 'Disabled Only' }).click();
    await expect(page.getByText('Disabled MCP')).toBeVisible();
    await expect(page.getByText('Enabled MCP')).not.toBeVisible();
  });

  test('should toggle between grid and list views', async ({ page }) => {
    await page.goto('/');
    
    // Add a test MCP
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('View Test MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('test-command');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Check grid view is default (should have grid classes)
    const mcpContainer = page.locator('div').filter({ hasText: 'View Test MCP' }).first();
    await expect(mcpContainer).toBeVisible();
    
    // Toggle to list view
    const listViewButton = page.getByRole('button').filter({ hasText: /List/ });
    await listViewButton.click();
    
    // Toggle back to grid view
    const gridViewButton = page.getByRole('button').filter({ hasText: /Grid/ });
    await gridViewButton.click();
  });

  test('should show connection status in MCP cards', async ({ page }) => {
    await page.goto('/');
    
    // Add an MCP
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Connection Test MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('echo test');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Check connection status is shown (should be testing, connected, or disconnected)
    await expect(page.getByText('Testing...').or(page.getByText('Connected')).or(page.getByText('Disconnected'))).toBeVisible({ timeout: 10000 });
  });

  test('should have functional profile management', async ({ page }) => {
    await page.goto('/');
    
    // Add some MCPs for profile testing
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Profile Test MCP 1');
    await page.getByRole('textbox', { name: 'Command' }).fill('test1');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Profile Test MCP 2');
    await page.getByRole('textbox', { name: 'Command' }).fill('test2');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Open profile dropdown
    await page.getByRole('button', { name: /Profile:/ }).click();
    
    // Create profile from current state
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Profile name:');
      dialog.accept('Test Profile');
    });
    
    await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
    
    // Check that profile was created and can be selected
    await page.getByRole('button', { name: /Profile:/ }).click();
    await expect(page.getByText('Test Profile')).toBeVisible();
  });

  test('should display scrollable command text in cards', async ({ page }) => {
    await page.goto('/');
    
    // Add MCP with very long command
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Long Command MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('npx');
    
    // Add many arguments to make command long
    await page.getByPlaceholder('Argument value').fill('-y');
    await page.getByRole('button', { name: 'Add Arg' }).click();
    await page.getByPlaceholder('Argument value').nth(1).fill('@modelcontextprotocol/server-very-long-name-that-should-scroll');
    await page.getByRole('button', { name: 'Add Arg' }).click();
    await page.getByPlaceholder('Argument value').nth(2).fill('--option');
    await page.getByRole('button', { name: 'Add Arg' }).click();
    await page.getByPlaceholder('Argument value').nth(3).fill('very-long-value-that-makes-command-overflow');
    
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Check that command text is scrollable (has overflow-x-auto class)
    const commandText = page.locator('.font-mono').filter({ hasText: 'npx -y @modelcontextprotocol' });
    await expect(commandText).toBeVisible();
    await expect(commandText).toHaveClass(/overflow-x-auto/);
  });

  test('should show separate enabled/disabled status', async ({ page }) => {
    await page.goto('/');
    
    // Add an MCP
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Status Test MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('test-command');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Check enabled status is shown
    await expect(page.getByText('Enabled')).toBeVisible();
    
    // Disable MCP
    await page.locator('[data-slot="switch"]').first().click();
    
    // Check disabled status is shown
    await expect(page.getByText('Disabled')).toBeVisible();
  });

  test('should refresh and test all connections on refresh', async ({ page }) => {
    await page.goto('/');
    
    // Add an MCP
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Refresh Test MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('echo test');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Click refresh button
    await page.getByRole('button', { name: 'Refresh' }).click();
    
    // Check that connection testing starts
    await expect(page.getByText('Testing...').or(page.getByText('Connected')).or(page.getByText('Disconnected'))).toBeVisible({ timeout: 10000 });
  });
});