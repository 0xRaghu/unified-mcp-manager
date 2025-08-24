/**
 * VERIFICATION TEST: Confirm Infinite Loop Fix
 * 
 * This test verifies that the infinite loop in generateUniqueName has been fixed
 * and MCP creation now works correctly.
 */

import { test, expect } from '@playwright/test';

test.describe('Infinite Loop Fix Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'MCP Manager' })).toBeVisible();
    
    // Clear storage to start fresh
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'MCP Manager' })).toBeVisible();
  });

  test('VERIFY: MCP creation now works without infinite loop', async ({ page }) => {
    console.log('🧪 Testing MCP creation with potential duplicate names...');
    
    // Step 1: Create first MCP
    console.log('📝 Creating first MCP...');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Test MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('echo test1');
    await page.getByRole('button', { name: 'Add MCP' }).nth(1).click();
    
    // Wait for first MCP to be created
    await expect(page.getByText('Test MCP').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ First MCP created successfully');
    
    // Step 2: Create second MCP with same name (should trigger duplicate detection)
    console.log('📝 Creating duplicate MCP (should get unique name)...');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Test MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('echo test2');
    await page.getByRole('button', { name: 'Add MCP' }).nth(1).click();
    
    // Wait for second MCP with unique name
    await expect(page.getByText('Test MCP (1)').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Duplicate MCP created with unique name: Test MCP (1)');
    
    // Step 3: Verify both MCPs exist and are distinct
    const originalMcpCount = await page.getByText('Test MCP').count();
    const duplicateMcpCount = await page.getByText('Test MCP (1)').count();
    
    console.log(`📊 Found ${originalMcpCount} instance(s) of 'Test MCP'`);
    console.log(`📊 Found ${duplicateMcpCount} instance(s) of 'Test MCP (1)'`);
    
    // Verify exactly one of each
    expect(originalMcpCount).toBe(1);
    expect(duplicateMcpCount).toBe(1);
    
    // Step 4: Test rapid creation to ensure no more infinite loops
    console.log('🚀 Testing rapid MCP creation...');
    
    const startTime = Date.now();
    
    // Create third MCP with same base name
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Test MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('echo test3');
    await page.getByRole('button', { name: 'Add MCP' }).nth(1).click();
    
    // Should get "Test MCP (2)"
    await expect(page.getByText('Test MCP (2)').first()).toBeVisible({ timeout: 5000 });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ Third MCP creation took ${duration}ms`);
    console.log('✅ Third MCP created with unique name: Test MCP (2)');
    
    // Performance check - should be fast now
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    
    // Final verification - check all three MCPs exist
    const finalCounts = {
      original: await page.getByText('Test MCP').count(),
      first_duplicate: await page.getByText('Test MCP (1)').count(),
      second_duplicate: await page.getByText('Test MCP (2)').count()
    };
    
    console.log('📊 Final MCP counts:');
    console.log(`  - "Test MCP": ${finalCounts.original}`);
    console.log(`  - "Test MCP (1)": ${finalCounts.first_duplicate}`);  
    console.log(`  - "Test MCP (2)": ${finalCounts.second_duplicate}`);
    
    expect(finalCounts.original).toBe(1);
    expect(finalCounts.first_duplicate).toBe(1);
    expect(finalCounts.second_duplicate).toBe(1);
    
    console.log('🎉 SUCCESS: Infinite loop has been fixed! MCP creation works normally.');
  });
  
  test('PERFORMANCE: Verify no more timeouts or hangs', async ({ page }) => {
    console.log('⚡ Performance verification test...');
    
    const testStart = Date.now();
    
    // Create 5 MCPs rapidly
    for (let i = 1; i <= 5; i++) {
      const iterationStart = Date.now();
      
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill(`Performance Test MCP`);
      await page.getByRole('textbox', { name: 'Command' }).fill(`echo perf${i}`);
      await page.getByRole('button', { name: 'Add MCP' }).nth(1).click();
      
      // Wait for MCP to appear (will have unique name if duplicate)
      const expectedName = i === 1 ? 'Performance Test MCP' : `Performance Test MCP (${i - 1})`;
      await expect(page.locator(`text="${expectedName}"`).first()).toBeVisible({ timeout: 5000 });
      
      const iterationEnd = Date.now();
      const iterationTime = iterationEnd - iterationStart;
      
      console.log(`🔄 Iteration ${i}: ${iterationTime}ms (${expectedName})`);
      
      // Each iteration should be reasonably fast
      expect(iterationTime).toBeLessThan(8000);
    }
    
    const testEnd = Date.now();
    const totalTime = testEnd - testStart;
    
    console.log(`⏱️ Total time for 5 MCPs: ${totalTime}ms (avg: ${Math.round(totalTime/5)}ms per MCP)`);
    
    // Overall test should complete within reasonable time
    expect(totalTime).toBeLessThan(30000); // 30 seconds max for 5 MCPs
    
    console.log('✅ Performance test passed - no more infinite loops!');
  });
});