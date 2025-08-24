import { test, expect } from '@playwright/test';

test.describe('Verify NPM Package Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging to debug
    page.on('console', (msg) => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
      console.error('[BROWSER ERROR]:', error.message);
    });

    // Test the fixed npm package running on port 3001
    await page.goto('http://localhost:3001');
  });

  test('should display MCP table correctly in fixed npm package', async ({ page }) => {
    console.log('=== TESTING FIXED NPM PACKAGE ===');
    
    // Wait for the app to load
    await expect(page.locator('h1')).toContainText('MCP Manager');
    console.log('✓ App loaded');
    
    // Wait for data to load
    await page.waitForTimeout(5000);
    
    // Check the MCP count
    const totalMCPsElement = page.locator('text=/Total MCPs: \\d+/');
    await expect(totalMCPsElement).toBeVisible();
    const countText = await totalMCPsElement.textContent();
    console.log('Count text:', countText);
    
    // Extract the number (fix regex escaping)
    const countMatch = countText?.match(/Total MCPs: (\d+)/);
    const mcpCount = countMatch ? parseInt(countMatch[1]) : 0;
    console.log('Parsed MCP count:', mcpCount);
    
    if (mcpCount > 0) {
      console.log(`Found ${mcpCount} MCPs, verifying table display...`);
      
      // The table should be visible
      const table = page.locator('table');
      await expect(table).toBeVisible();
      console.log('✓ Table element is visible');
      
      // Check table headers
      await expect(page.locator('th:has-text("Name")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible(); 
      await expect(page.locator('th:has-text("Type")')).toBeVisible();
      console.log('✓ Table headers are visible');
      
      // Check for table rows with actual data
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();
      console.log('Table rows found:', rowCount);
      expect(rowCount).toBeGreaterThan(0);
      
      // Verify first row has actual MCP data
      const firstRow = tableRows.first();
      const mcpName = await firstRow.locator('td').first().textContent();
      console.log('First MCP name:', mcpName);
      expect(mcpName).toBeTruthy();
      expect(mcpName?.trim()).not.toBe('');
      
      // Verify styling is working (check for Tailwind classes)
      const tableContainer = page.locator('div.bg-white.rounded-lg.border.border-gray-200');
      await expect(tableContainer).toBeVisible();
      console.log('✓ Table styling (Tailwind classes) is working');
      
      console.log('🎉 SUCCESS: Table is displaying correctly in the npm package!');
    } else {
      console.log('No MCPs found, checking empty state...');
      await expect(page.locator('text=No MCPs Yet')).toBeVisible();
      console.log('✓ Empty state is working correctly');
    }
  });

  test('should allow JSON copy functionality in fixed version', async ({ page }) => {
    // Wait for the app to load
    await expect(page.locator('h1')).toContainText('MCP Manager');
    await page.waitForTimeout(3000);
    
    // Check if we have MCPs
    const totalMCPsElement = page.locator('text=/Total MCPs: \\d+/');
    const countText = await totalMCPsElement.textContent();
    const countMatch = countText?.match(/Total MCPs: (\\d+)/);
    const mcpCount = countMatch ? parseInt(countMatch[1]) : 0;
    
    if (mcpCount > 0) {
      console.log(`Testing JSON copy with ${mcpCount} MCPs...`);
      
      // Click export dropdown
      const exportButton = page.locator('button:has-text("Export")');
      await expect(exportButton).toBeVisible();
      await exportButton.click();
      
      // Click Copy as JSON
      const copyJsonOption = page.locator('[role="menuitem"]:has-text("Copy as JSON")');
      await expect(copyJsonOption).toBeVisible();
      await copyJsonOption.click();
      
      // Wait for success toast
      await expect(page.locator('text=/Copied to clipboard/i')).toBeVisible();
      console.log('✓ JSON copy functionality works');
    }
  });
});