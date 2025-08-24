/**
 * FOCUSED DEBUGGING TEST: Profile Access & Infinite Loop Root Cause Analysis
 * 
 * This test attempts to identify how to access ProfileDialog and investigate
 * the infinite loop issue by testing different UI entry points.
 */

import { test, expect } from '@playwright/test';

test.describe('Profile Access & Infinite Loop Investigation', () => {
  let consoleLogs: Array<{ type: string, text: string }> = [];
  let consoleErrors: Array<{ type: string, text: string }> = [];
  
  test.beforeEach(async ({ page }) => {
    consoleLogs = [];
    consoleErrors = [];
    
    page.on('console', msg => {
      const logEntry = { type: msg.type(), text: msg.text() };
      consoleLogs.push(logEntry);
      
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(logEntry);
        console.log(`🔴 CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      consoleErrors.push({ type: 'pageerror', text: error.toString() });
      console.log(`🔥 PAGE ERROR: ${error.toString()}`);
    });
    
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'MCP Manager' })).toBeVisible();
    
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'MCP Manager' })).toBeVisible();
  });

  test('ANALYZE: Investigate MCP duplication and UI access patterns', async ({ page }) => {
    console.log('🔍 Starting UI analysis for profile access patterns...');
    
    // Step 1: Analyze the current UI structure
    console.log('📱 Analyzing current page structure...');
    
    // Look for all buttons and their text content
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`Found ${buttonCount} buttons on page`);
    
    // Log all button texts for debugging
    for (let i = 0; i < buttonCount; i++) {
      try {
        const buttonText = await allButtons.nth(i).textContent();
        console.log(`Button ${i}: "${buttonText}"`);
      } catch (error) {
        console.log(`Button ${i}: [could not read text]`);
      }
    }
    
    // Step 2: Test MCP creation and check for duplication issue
    console.log('🧪 Testing MCP creation for duplication issues...');
    
    // Add one MCP
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Debug Test MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('echo debug');
    
    // Check state before submitting
    const beforeSubmit = Date.now();
    await page.getByRole('button', { name: 'Add MCP' }).nth(1).click(); // The submit button
    
    // Wait and check for duplicates
    await page.waitForTimeout(1000);
    
    const debugMcpElements = page.getByText('Debug Test MCP');
    const duplicateCount = await debugMcpElements.count();
    
    console.log(`🔍 Found ${duplicateCount} instances of "Debug Test MCP"`);
    
    if (duplicateCount > 1) {
      console.log('🚨 CRITICAL: MCP duplication detected!');
      
      // Analyze the duplicated elements
      for (let i = 0; i < duplicateCount; i++) {
        const element = debugMcpElements.nth(i);
        const text = await element.textContent();
        const parent = element.locator('..');
        const parentClass = await parent.getAttribute('class');
        console.log(`Duplicate ${i + 1}: "${text}" (parent class: ${parentClass})`);
      }
    }
    
    // Step 3: Look for profile-related UI elements
    console.log('🔍 Searching for profile-related UI elements...');
    
    // Look for profile dropdown patterns
    const profileDropdownSelectors = [
      'button:has-text("Profile:")',
      'button:has-text("Profile")',
      '[data-testid*="profile"]',
      '.profile-dropdown',
      'button[aria-label*="profile"]'
    ];
    
    let profileUIFound = false;
    
    for (const selector of profileDropdownSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`✅ Found ${count} profile UI elements with selector: ${selector}`);
        profileUIFound = true;
        
        // Try to interact with the first one
        try {
          const firstElement = elements.first();
          const text = await firstElement.textContent();
          console.log(`Profile element text: "${text}"`);
          
          // Try clicking it
          await firstElement.click();
          await page.waitForTimeout(500);
          
          // Check if a dropdown or menu appeared
          const menuItems = page.locator('[role="menuitem"]');
          const menuCount = await menuItems.count();
          console.log(`Menu items appeared: ${menuCount}`);
          
          if (menuCount > 0) {
            for (let i = 0; i < menuCount; i++) {
              const menuText = await menuItems.nth(i).textContent();
              console.log(`Menu item ${i + 1}: "${menuText}"`);
            }
          }
          
        } catch (error) {
          console.log(`❌ Could not interact with profile element: ${error}`);
        }
        break;
      }
    }
    
    if (!profileUIFound) {
      console.log('⚠️ No profile UI elements found with standard selectors');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'tests/debug-no-profile-ui.png' });
    }
    
    // Step 4: Look for any dialogs or modals
    console.log('🔍 Checking for any existing dialogs...');
    
    const dialogSelectors = [
      '[role="dialog"]',
      '.dialog',
      '[data-radix-dialog-content]',
      '[data-state="open"]'
    ];
    
    for (const selector of dialogSelectors) {
      const dialogs = page.locator(selector);
      const count = await dialogs.count();
      if (count > 0) {
        console.log(`✅ Found ${count} dialog(s) with selector: ${selector}`);
        
        const dialog = dialogs.first();
        const dialogText = await dialog.textContent();
        console.log(`Dialog content preview: "${dialogText?.substring(0, 200)}..."`);
      }
    }
    
    // Step 5: Test profile form interactions in MCPForm if profiles exist
    console.log('🔍 Testing MCPForm profile selection if available...');
    
    // Check if there are any checkboxes (which might be profile checkboxes in MCPForm)
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`Found ${checkboxCount} checkboxes on page`);
    
    if (checkboxCount > 0) {
      console.log('🧪 Testing checkbox interactions...');
      
      for (let i = 0; i < Math.min(checkboxCount, 3); i++) {
        const errorsBefore = consoleErrors.length;
        
        try {
          console.log(`Testing checkbox ${i + 1}...`);
          await checkboxes.nth(i).click();
          await page.waitForTimeout(100);
          
          const errorsAfter = consoleErrors.length;
          if (errorsAfter > errorsBefore) {
            console.log(`🚨 CRITICAL: Checkbox ${i + 1} caused errors!`);
            consoleErrors.slice(errorsBefore).forEach((error, idx) => {
              console.log(`  Error ${idx + 1}: [${error.type}] ${error.text}`);
            });
          }
        } catch (error) {
          console.log(`❌ Checkbox ${i + 1} interaction failed: ${error}`);
        }
      }
    }
    
    // Step 6: Final diagnostic summary
    console.log('\n🔍 COMPREHENSIVE DIAGNOSTIC SUMMARY:');
    console.log('='.repeat(60));
    
    console.log(`\n📊 UI ANALYSIS:`);
    console.log(`- Total buttons found: ${buttonCount}`);
    console.log(`- Profile UI elements found: ${profileUIFound}`);
    console.log(`- Checkboxes found: ${checkboxCount}`);
    console.log(`- MCP duplication instances: ${duplicateCount}`);
    
    console.log(`\n🚨 ERROR ANALYSIS:`);
    console.log(`- Total console errors: ${consoleErrors.length}`);
    console.log(`- Total console logs: ${consoleLogs.length}`);
    
    if (consoleErrors.length > 0) {
      console.log(`\nERROR DETAILS:`);
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.type}] ${error.text}`);
      });
    }
    
    console.log(`\n🎯 KEY FINDINGS:`);
    if (duplicateCount > 1) {
      console.log(`- CRITICAL: MCP duplication issue confirmed (${duplicateCount} instances)`);
    }
    if (consoleErrors.some(e => e.text.includes('strict mode violation'))) {
      console.log(`- CRITICAL: React strict mode violations detected`);
    }
    if (consoleErrors.some(e => e.text.includes('Maximum update depth'))) {
      console.log(`- CRITICAL: Infinite re-render loop detected`);
    }
    if (!profileUIFound) {
      console.log(`- WARNING: Profile UI not accessible through standard patterns`);
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'tests/debug-final-analysis.png' });
    
    // Final assertions for critical issues
    expect(duplicateCount).toBe(1); // Should only have one instance
    expect(consoleErrors.filter(e => e.text.includes('Maximum update depth'))).toHaveLength(0);
    
    console.log('\n✅ DIAGNOSTIC ANALYSIS COMPLETE');
  });
  
  test('FOCUSED: Test ProfileDialog components in isolation', async ({ page }) => {
    console.log('🎯 Testing ProfileDialog components in isolation...');
    
    // Add a test MCP first
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Isolation Test MCP');
    await page.getByRole('textbox', { name: 'Command' }).fill('echo isolation');
    await page.getByRole('button', { name: 'Add MCP' }).nth(1).click();
    
    // Wait for MCP to be added and check for duplication
    await page.waitForTimeout(1000);
    const mcpCount = await page.getByText('Isolation Test MCP').count();
    console.log(`MCP instances after creation: ${mcpCount}`);
    
    // Look for profile-related buttons specifically in the MCPForm context
    const mcpFormButtons = page.locator('button:has-text("Select All"), button:has-text("Select None")');
    const profileButtonCount = await mcpFormButtons.count();
    
    if (profileButtonCount > 0) {
      console.log(`✅ Found ${profileButtonCount} profile selection buttons`);
      
      // Test these buttons for infinite loop issues
      for (let i = 0; i < profileButtonCount; i++) {
        const button = mcpFormButtons.nth(i);
        const buttonText = await button.textContent();
        console.log(`🧪 Testing button: "${buttonText}"`);
        
        const errorsBefore = consoleErrors.length;
        const startTime = Date.now();
        
        try {
          await button.click();
          await page.waitForTimeout(500);
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          const errorsAfter = consoleErrors.length;
          
          console.log(`  Duration: ${duration}ms`);
          console.log(`  New errors: ${errorsAfter - errorsBefore}`);
          
          if (errorsAfter > errorsBefore) {
            console.log(`🚨 CRITICAL: Button "${buttonText}" caused errors!`);
            consoleErrors.slice(errorsBefore).forEach((error, idx) => {
              console.log(`    Error ${idx + 1}: [${error.type}] ${error.text}`);
            });
          }
          
          if (duration > 2000) {
            console.log(`⚠️ WARNING: Button "${buttonText}" took too long (${duration}ms)`);
          }
          
        } catch (error) {
          console.log(`❌ Button "${buttonText}" failed: ${error}`);
        }
      }
    } else {
      console.log('⚠️ No profile selection buttons found in current context');
    }
    
    // Final check for any infinite loops or excessive re-renders
    const finalErrorCount = consoleErrors.length;
    const infiniteLoopErrors = consoleErrors.filter(e => 
      e.text.includes('Maximum update depth') || 
      e.text.includes('too many re-renders') ||
      e.text.includes('infinite')
    );
    
    console.log(`\n📊 ISOLATION TEST RESULTS:`);
    console.log(`- Total errors: ${finalErrorCount}`);
    console.log(`- Infinite loop errors: ${infiniteLoopErrors.length}`);
    console.log(`- MCP duplication: ${mcpCount > 1 ? 'YES' : 'NO'}`);
    
    if (infiniteLoopErrors.length > 0) {
      console.log(`\n🚨 INFINITE LOOP ERRORS FOUND:`);
      infiniteLoopErrors.forEach((error, idx) => {
        console.log(`${idx + 1}. ${error.text}`);
      });
    }
    
    expect(infiniteLoopErrors).toHaveLength(0);
  });
});