/**
 * CRITICAL DEBUGGING TEST: ProfileDialog Infinite Loop Investigation
 * 
 * This test is designed to identify the root cause of infinite loop/crash issues
 * when interacting with profile selection dialog components.
 */

import { test, expect, Page } from '@playwright/test';

test.describe('ProfileDialog Infinite Loop Investigation', () => {
  let consoleLogs: Array<{ type: string, text: string }> = [];
  let consoleErrors: Array<{ type: string, text: string }> = [];
  
  test.beforeEach(async ({ page }) => {
    // Reset logs before each test
    consoleLogs = [];
    consoleErrors = [];
    
    // Capture all console output
    page.on('console', msg => {
      const logEntry = { type: msg.type(), text: msg.text() };
      consoleLogs.push(logEntry);
      
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(logEntry);
        console.log(`🔴 CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });
    
    // Capture unhandled errors
    page.on('pageerror', error => {
      consoleErrors.push({ type: 'pageerror', text: error.toString() });
      console.log(`🔥 PAGE ERROR: ${error.toString()}`);
    });
    
    // Navigate and wait for app to load
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

  test('CRITICAL: Diagnose profile dialog infinite loop on button clicks', async ({ page }) => {
    console.log('🚀 Starting profile dialog infinite loop diagnosis...');
    
    // Step 1: Add test MCP to work with
    console.log('📝 Adding test MCP...');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Test MCP for Profile Debug');
    await page.getByRole('textbox', { name: 'Command' }).fill('echo test-debug');
    await page.getByRole('button', { name: 'Add MCP' }).click();
    
    // Wait for MCP to be added
    await expect(page.getByText('Test MCP for Profile Debug')).toBeVisible();
    console.log('✅ Test MCP added successfully');
    
    // Check for any console errors after adding MCP
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors after adding MCP:', consoleErrors);
    }
    
    // Step 2: Open Profile Management (via dropdown or dedicated button)
    console.log('🔧 Attempting to open Profile Management...');
    
    // Try different ways to access profile functionality
    try {
      // First try: Look for profile dropdown button
      const profileButton = page.getByRole('button').filter({ hasText: /Profile:/ });
      if (await profileButton.count() > 0) {
        console.log('📱 Found profile dropdown button');
        await profileButton.first().click();
        
        // Look for "Create Profile" or similar options
        const createProfileOption = page.getByRole('menuitem').filter({ hasText: /Create.*Profile/ });
        if (await createProfileOption.count() > 0) {
          console.log('➕ Found Create Profile option');
          await createProfileOption.first().click();
        }
      } else {
        console.log('🔍 Profile dropdown not found, trying alternative methods...');
        
        // Look for any profile-related buttons
        const profileButtons = await page.locator('button').filter({ hasText: /profile/i }).all();
        console.log(`Found ${profileButtons.length} potential profile buttons`);
        
        if (profileButtons.length > 0) {
          await profileButtons[0].click();
        }
      }
      
      // Wait a moment to see if dialog opens
      await page.waitForTimeout(1000);
      
    } catch (error) {
      console.log('❌ Error opening profile management:', error);
    }
    
    // Step 3: Look for ProfileDialog or any dialog with MCP selection
    console.log('🔍 Looking for ProfileDialog or MCP selection interface...');
    
    const dialogSelectors = [
      '[role="dialog"]',
      '.profile-dialog',
      '[data-testid="profile-dialog"]',
      '[data-testid="profile-selection"]'
    ];
    
    let dialogFound = false;
    let profileDialog = null;
    
    for (const selector of dialogSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        console.log(`✅ Found dialog with selector: ${selector}`);
        profileDialog = element.first();
        dialogFound = true;
        break;
      }
    }
    
    if (!dialogFound) {
      console.log('⚠️ Profile dialog not found with standard selectors. Searching more broadly...');
      
      // Look for any dialog containing MCP-related text
      const mcpDialogs = page.locator('div').filter({ hasText: /Select.*MCP|MCP.*Select|Profile.*MCP/i });
      if (await mcpDialogs.count() > 0) {
        console.log('📦 Found potential MCP selection dialog');
        profileDialog = mcpDialogs.first();
        dialogFound = true;
      }
    }
    
    if (!dialogFound) {
      console.log('❌ Could not locate ProfileDialog. Available elements:');
      const allDialogs = await page.locator('[role="dialog"], dialog, .dialog').all();
      console.log(`Found ${allDialogs.length} dialog elements`);
      
      // Log page content for debugging
      const pageContent = await page.content();
      console.log('Page contains "Profile":', pageContent.includes('Profile'));
      console.log('Page contains "MCP":', pageContent.includes('MCP'));
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'tests/debug-no-dialog.png' });
      return;
    }
    
    // Step 4: Test dangerous profile selection interactions
    console.log('⚠️ Testing potentially problematic profile selection interactions...');
    
    // Monitor performance before interactions
    const startTime = Date.now();
    let renderCount = 0;
    
    // Track React re-renders if possible
    await page.evaluate(() => {
      // Monkey patch React to track renders
      if (window.React) {
        const originalRender = window.React.Component.prototype.render;
        window.React.Component.prototype.render = function() {
          window.renderCount = (window.renderCount || 0) + 1;
          return originalRender.call(this);
        };
      }
    });
    
    // Test 1: Select All button interaction
    console.log('🔘 Testing Select All button...');
    const selectAllButtons = profileDialog.getByRole('button').filter({ hasText: /Select.*All|All/i });
    
    if (await selectAllButtons.count() > 0) {
      console.log('✅ Found Select All button');
      
      // Monitor for console errors during click
      const errorsBefore = consoleErrors.length;
      
      try {
        await selectAllButtons.first().click({ timeout: 2000 });
        await page.waitForTimeout(500); // Wait for any side effects
        
        const errorsAfter = consoleErrors.length;
        if (errorsAfter > errorsBefore) {
          console.log('🚨 CRITICAL: Select All button caused console errors!');
          console.log('New errors:', consoleErrors.slice(errorsBefore));
        } else {
          console.log('✅ Select All button clicked without console errors');
        }
      } catch (error) {
        console.log('❌ CRITICAL: Select All button click failed:', error);
      }
    } else {
      console.log('⚠️ Select All button not found');
    }
    
    // Test 2: Select None button interaction
    console.log('🔘 Testing Select None button...');
    const selectNoneButtons = profileDialog.getByRole('button').filter({ hasText: /Select.*None|None|Clear/i });
    
    if (await selectNoneButtons.count() > 0) {
      console.log('✅ Found Select None button');
      
      const errorsBefore = consoleErrors.length;
      
      try {
        await selectNoneButtons.first().click({ timeout: 2000 });
        await page.waitForTimeout(500);
        
        const errorsAfter = consoleErrors.length;
        if (errorsAfter > errorsBefore) {
          console.log('🚨 CRITICAL: Select None button caused console errors!');
          console.log('New errors:', consoleErrors.slice(errorsBefore));
        } else {
          console.log('✅ Select None button clicked without console errors');
        }
      } catch (error) {
        console.log('❌ CRITICAL: Select None button click failed:', error);
      }
    } else {
      console.log('⚠️ Select None button not found');
    }
    
    // Test 3: Individual MCP checkbox interactions
    console.log('☑️ Testing individual MCP checkboxes...');
    const mcpCheckboxes = profileDialog.locator('input[type="checkbox"], [role="switch"]');
    const checkboxCount = await mcpCheckboxes.count();
    
    console.log(`Found ${checkboxCount} potential MCP selection controls`);
    
    if (checkboxCount > 0) {
      for (let i = 0; i < Math.min(checkboxCount, 3); i++) {
        console.log(`🔲 Testing checkbox/switch ${i + 1}...`);
        
        const errorsBefore = consoleErrors.length;
        
        try {
          await mcpCheckboxes.nth(i).click({ timeout: 2000 });
          await page.waitForTimeout(200);
          
          const errorsAfter = consoleErrors.length;
          if (errorsAfter > errorsBefore) {
            console.log(`🚨 CRITICAL: Checkbox ${i + 1} caused console errors!`);
            console.log('New errors:', consoleErrors.slice(errorsBefore));
          } else {
            console.log(`✅ Checkbox ${i + 1} clicked without console errors`);
          }
        } catch (error) {
          console.log(`❌ CRITICAL: Checkbox ${i + 1} click failed:`, error);
        }
      }
    } else {
      console.log('⚠️ No MCP checkboxes found');
    }
    
    // Test 4: Profile form interactions
    console.log('📝 Testing profile form fields...');
    const nameInput = profileDialog.locator('input[name="name"], input[id="name"], input').filter({ hasText: /name/i }).first();
    
    if (await nameInput.count() > 0) {
      console.log('✅ Found profile name input');
      
      const errorsBefore = consoleErrors.length;
      
      try {
        await nameInput.fill('Debug Test Profile');
        await page.waitForTimeout(200);
        
        const errorsAfter = consoleErrors.length;
        if (errorsAfter > errorsBefore) {
          console.log('🚨 CRITICAL: Profile name input caused console errors!');
          console.log('New errors:', consoleErrors.slice(errorsBefore));
        } else {
          console.log('✅ Profile name input updated without console errors');
        }
      } catch (error) {
        console.log('❌ CRITICAL: Profile name input failed:', error);
      }
    }
    
    // Step 5: Performance analysis
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`⏱️ Total interaction time: ${totalTime}ms`);
    
    // Check for excessive renders
    const finalRenderCount = await page.evaluate(() => window.renderCount || 0);
    if (finalRenderCount > 100) {
      console.log(`🚨 CRITICAL: Excessive re-renders detected: ${finalRenderCount}`);
    } else {
      console.log(`✅ Render count acceptable: ${finalRenderCount}`);
    }
    
    // Step 6: Generate comprehensive diagnostic report
    console.log('\n🔍 DIAGNOSTIC REPORT:');
    console.log('='.repeat(50));
    
    console.log(`\n📊 PERFORMANCE METRICS:`);
    console.log(`- Total test duration: ${totalTime}ms`);
    console.log(`- React re-renders: ${finalRenderCount}`);
    console.log(`- Console logs captured: ${consoleLogs.length}`);
    console.log(`- Console errors: ${consoleErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log(`\n🚨 CONSOLE ERRORS DETECTED:`);
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.type}] ${error.text}`);
      });
    }
    
    console.log(`\n🧩 COMPONENT AVAILABILITY:`);
    console.log(`- Profile dialog found: ${dialogFound}`);
    console.log(`- Select All button: ${await selectAllButtons.count() > 0}`);
    console.log(`- Select None button: ${await selectNoneButtons.count() > 0}`);
    console.log(`- MCP checkboxes: ${checkboxCount}`);
    
    // Take final screenshot for analysis
    await page.screenshot({ path: 'tests/debug-final-state.png' });
    
    // Final assertion - no critical errors should occur
    expect(consoleErrors.filter(e => e.type === 'error' && e.text.includes('Maximum update depth'))).toHaveLength(0);
    expect(totalTime).toBeLessThan(10000); // Should not take more than 10 seconds
    
    console.log('\n✅ DIAGNOSIS COMPLETE - Check logs above for issues');
  });
  
  test('Stress test: Rapid profile selection interactions', async ({ page }) => {
    console.log('🔥 Starting rapid interaction stress test...');
    
    // Add multiple MCPs for testing
    const mcpNames = ['Stress MCP 1', 'Stress MCP 2', 'Stress MCP 3'];
    
    for (const name of mcpNames) {
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill(name);
      await page.getByRole('textbox', { name: 'Command' }).fill(`echo ${name.replace(/\s/g, '-')}`);
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await expect(page.getByText(name)).toBeVisible();
    }
    
    // Try to open profile dialog (implementation may vary)
    try {
      const profileButton = page.getByRole('button').filter({ hasText: /Profile:/ });
      if (await profileButton.count() > 0) {
        await profileButton.first().click();
        const createOption = page.getByRole('menuitem').filter({ hasText: /Create.*Profile/ });
        if (await createOption.count() > 0) {
          await createOption.first().click();
        }
      }
    } catch (error) {
      console.log('Could not open profile dialog for stress test');
    }
    
    // Look for dialog
    const dialog = page.locator('[role="dialog"]').first();
    
    if (await dialog.count() > 0) {
      console.log('🎯 Found dialog, starting rapid interactions...');
      
      // Rapid button clicking
      const selectAll = dialog.getByRole('button').filter({ hasText: /Select.*All/i });
      const selectNone = dialog.getByRole('button').filter({ hasText: /Select.*None/i });
      
      const startTime = Date.now();
      let errorCount = 0;
      
      for (let i = 0; i < 20; i++) {
        try {
          if (await selectAll.count() > 0) {
            await selectAll.first().click();
            await page.waitForTimeout(10);
          }
          
          if (await selectNone.count() > 0) {
            await selectNone.first().click();
            await page.waitForTimeout(10);
          }
        } catch (error) {
          errorCount++;
          console.log(`Interaction ${i} failed:`, error.message);
        }
      }
      
      const endTime = Date.now();
      console.log(`Completed ${40} interactions in ${endTime - startTime}ms`);
      console.log(`Errors encountered: ${errorCount}`);
      
      // Should not have excessive errors
      expect(errorCount).toBeLessThan(5);
      expect(consoleErrors.filter(e => e.text.includes('Maximum update depth'))).toHaveLength(0);
    } else {
      console.log('⚠️ No dialog found for stress testing');
    }
  });
});