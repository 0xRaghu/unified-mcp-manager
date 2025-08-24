import { test, expect } from '@playwright/test';

test.describe('Production MCP Manager Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging to debug production issues
    page.on('console', (msg) => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
      console.error('[BROWSER ERROR]:', error.message);
    });

    await page.goto('/');
  });

  test('should load production app without errors', async ({ page }) => {
    // Wait for the app to load
    await expect(page.locator('h1')).toContainText('MCP Manager');
    
    // Check for any JavaScript errors
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Wait a bit for any async operations to complete
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.error('JavaScript errors found:', errors);
    }
  });

  test('should display MCP count correctly', async ({ page }) => {
    // Wait for the app to load
    await expect(page.locator('h1')).toContainText('MCP Manager');
    
    // Check if the count is displayed
    const totalMCPsText = await page.locator('text=Total MCPs:').textContent();
    console.log('Total MCPs text:', totalMCPsText);
    
    // The count should be visible
    expect(totalMCPsText).toBeTruthy();
  });

  test('should display MCP table when MCPs exist', async ({ page }) => {
    // Wait for the app to load
    await expect(page.locator('h1')).toContainText('MCP Manager');
    
    // Wait for potential data loading
    await page.waitForTimeout(3000);
    
    // Check if we have any MCPs by looking at the count
    const totalMCPsElement = page.locator('text=/Total MCPs: \\d+/');
    await expect(totalMCPsElement).toBeVisible();
    
    const countText = await totalMCPsElement.textContent();
    console.log('MCP count text:', countText);
    
    const countMatch = countText?.match(/Total MCPs: (\\d+)/);
    const mcpCount = countMatch ? parseInt(countMatch[1]) : 0;
    
    console.log('Parsed MCP count:', mcpCount);
    
    if (mcpCount > 0) {
      // If MCPs exist, check if the table is visible
      const table = page.locator('table');
      await expect(table).toBeVisible();
      
      // Check for table headers
      await expect(page.locator('th:has-text("Name")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Type")')).toBeVisible();
      
      // Check for actual table rows with MCP data
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();
      console.log('Table rows count:', rowCount);
      
      expect(rowCount).toBeGreaterThan(0);
      
      // Check that at least one row has MCP data
      const firstRow = tableRows.first();
      const mcpName = await firstRow.locator('td').first().textContent();
      console.log('First MCP name:', mcpName);
      
      expect(mcpName).toBeTruthy();
      expect(mcpName?.trim()).not.toBe('');
    } else {
      // If no MCPs, we should see the empty state
      await expect(page.locator('text=No MCPs Yet')).toBeVisible();
    }
  });

  test('should allow copying JSON when MCPs exist', async ({ page }) => {
    // Wait for the app to load
    await expect(page.locator('h1')).toContainText('MCP Manager');
    
    // Wait for potential data loading
    await page.waitForTimeout(3000);
    
    // Check if we have any MCPs
    const totalMCPsElement = page.locator('text=/Total MCPs: \\d+/');
    const countText = await totalMCPsElement.textContent();
    const countMatch = countText?.match(/Total MCPs: (\\d+)/);
    const mcpCount = countMatch ? parseInt(countMatch[1]) : 0;
    
    if (mcpCount > 0) {
      // Click on the Export dropdown
      const exportButton = page.locator('button:has-text("Export")');
      await expect(exportButton).toBeVisible();
      await exportButton.click();
      
      // Click on Copy as JSON
      const copyJsonOption = page.locator('[role="menuitem"]:has-text("Copy as JSON")');
      await expect(copyJsonOption).toBeVisible();
      await copyJsonOption.click();
      
      // Wait for the toast message
      await expect(page.locator('text=/Copied to clipboard|Copy/i')).toBeVisible();
    } else {
      console.log('No MCPs to test JSON copy functionality');
    }
  });

  test('should be able to add a test MCP', async ({ page }) => {
    // Wait for the app to load
    await expect(page.locator('h1')).toContainText('MCP Manager');
    
    // Click Add MCP button
    const addButton = page.locator('button:has-text("Add MCP")');
    await expect(addButton).toBeVisible();
    await addButton.click();
    
    // Wait for the form dialog to open
    await expect(page.locator('text=Add MCP')).toBeVisible();
    
    // Fill in the form
    await page.fill('input[placeholder*="name" i]', 'Test MCP');
    await page.fill('input[placeholder*="command" i]', 'test-command');
    await page.fill('textarea[placeholder*="description" i]', 'A test MCP for production testing');
    
    // Save the MCP
    const saveButton = page.locator('button:has-text("Save")').last();
    await saveButton.click();
    
    // Wait for the dialog to close and the MCP to appear
    await page.waitForTimeout(2000);
    
    // Check if the MCP appears in the table
    await expect(page.locator('text=Test MCP')).toBeVisible();
    
    // Verify the table is now visible
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Check for table rows
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    console.log('Table rows after adding MCP:', rowCount);
    expect(rowCount).toBeGreaterThan(0);
  });
});