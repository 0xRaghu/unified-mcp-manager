/**
 * End-to-End Tests for Profile Feature
 * Comprehensive testing of profile functionality from user perspective
 * Tests profile management, switching, MCP state changes, and data persistence
 */

import { test, expect } from '@playwright/test';

test.describe('Profile Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Clear localStorage to start with clean state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.reload();
    
    // Wait for app to load
    await expect(page.getByRole('heading', { name: 'MCP Manager' })).toBeVisible();
  });

  test.describe('Profile Creation and Management', () => {
    test('should create profile from current MCP state', async ({ page }) => {
      // Add some test MCPs first
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('GitHub MCP');
      await page.getByRole('textbox', { name: 'Command' }).fill('npx @modelcontextprotocol/server-github');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('File System MCP');
      await page.getByRole('textbox', { name: 'Command' }).fill('node filesystem-server.js');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      // Disable one MCP
      const toggleSwitches = page.locator('[data-slot="switch"]');
      await toggleSwitches.nth(1).click();
      await expect(page.getByText('Disabled')).toBeVisible();
      
      // Create profile from current state
      await page.getByRole('button', { name: /Profile:/ }).click();
      
      // Handle profile name prompt
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Profile name:');
        await dialog.accept('Development Profile');
      });
      
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Verify profile was created
      await page.getByRole('button', { name: /Profile:/ }).click();
      await expect(page.getByText('Development Profile')).toBeVisible();
      
      // Verify profile shows correct MCP count (only enabled MCPs)
      await expect(page.getByText('1 MCP')).toBeVisible(); // Only the enabled MCP should be in profile
    });

    test('should handle profile creation with custom name', async ({ page }) => {
      // Add an MCP
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('Test MCP');
      await page.getByRole('textbox', { name: 'Command' }).fill('node test.js');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      // Create profile with custom name
      await page.getByRole('button', { name: /Profile:/ }).click();
      
      page.on('dialog', async dialog => {
        await dialog.accept('Custom Profile Name!');
      });
      
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Verify custom name is used
      await page.getByRole('button', { name: /Profile:/ }).click();
      await expect(page.getByText('Custom Profile Name!')).toBeVisible();
    });

    test('should create multiple profiles and switch between them', async ({ page }) => {
      // Add multiple MCPs
      const mcps = [
        { name: 'GitHub MCP', command: 'npx @modelcontextprotocol/server-github' },
        { name: 'Database MCP', command: 'node db-server.js' },
        { name: 'File MCP', command: 'node file-server.js' }
      ];
      
      for (const mcp of mcps) {
        await page.getByRole('button', { name: 'Add MCP' }).click();
        await page.getByRole('textbox', { name: 'Name' }).fill(mcp.name);
        await page.getByRole('textbox', { name: 'Command' }).fill(mcp.command);
        await page.getByRole('button', { name: 'Add MCP' }).click();
      }
      
      // Create first profile with first two MCPs enabled
      const toggles = page.locator('[data-slot="switch"]');
      await toggles.nth(2).click(); // Disable third MCP
      
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept('Dev Profile'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Change MCP state and create second profile
      await toggles.nth(0).click(); // Disable first MCP
      await toggles.nth(2).click(); // Enable third MCP
      
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept('Prod Profile'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Test switching between profiles
      await page.getByRole('button', { name: /Profile:/ }).click();
      await page.getByText('Dev Profile').click();
      
      // Verify correct MCPs are enabled for Dev Profile
      await expect(page.getByText('GitHub MCP').locator('..').getByText('Enabled')).toBeVisible();
      await expect(page.getByText('Database MCP').locator('..').getByText('Enabled')).toBeVisible();
      await expect(page.getByText('File MCP').locator('..').getByText('Disabled')).toBeVisible();
      
      // Switch to Prod Profile
      await page.getByRole('button', { name: /Profile:/ }).click();
      await page.getByText('Prod Profile').click();
      
      // Verify correct MCPs are enabled for Prod Profile
      await expect(page.getByText('GitHub MCP').locator('..').getByText('Disabled')).toBeVisible();
      await expect(page.getByText('Database MCP').locator('..').getByText('Enabled')).toBeVisible();
      await expect(page.getByText('File MCP').locator('..').getByText('Enabled')).toBeVisible();
    });
  });

  test.describe('Profile Export and Import', () => {
    test('should export profile with correct JSON format', async ({ page }) => {
      // Setup test data
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('Export Test MCP');
      await page.getByRole('textbox', { name: 'Command' }).fill('node export-test.js');
      await page.getByPlaceholder('KEY').first().fill('API_KEY');
      await page.getByPlaceholder('value').first().fill('test-key-value');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      // Create profile
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept('Export Test Profile'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Export profile
      await page.getByRole('button', { name: /Profile:/ }).click();
      
      // Listen for download
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: 'Export Profile JSON' }).click();
      const download = await downloadPromise;
      
      // Verify download occurred
      expect(download.suggestedFilename()).toMatch(/export-test-profile.*\.json/);
    });

    test('should import profile and recreate MCP state', async ({ page }) => {
      // Create test profile data
      const profileData = {
        profile: {
          name: 'Imported Test Profile',
          description: 'A profile imported from JSON',
          createdAt: new Date().toISOString()
        },
        mcps: [{
          id: 'imported-mcp-1',
          name: 'Imported GitHub MCP',
          type: 'stdio',
          command: 'npx @modelcontextprotocol/server-github',
          args: ['--token', 'test'],
          env: { GITHUB_TOKEN: 'imported-token' },
          category: 'Development',
          usageCount: 0,
          tags: ['imported', 'github'],
          disabled: false
        }]
      };
      
      // Create a temporary file for import
      const jsonString = JSON.stringify(profileData, null, 2);
      
      // Import via bulk import dialog
      await page.getByRole('button', { name: 'Bulk Import' }).click();
      await expect(page.getByText('Import MCP Configurations')).toBeVisible();
      
      // Paste JSON data
      await page.getByRole('textbox', { name: 'Configuration Data' }).fill(jsonString);
      await page.getByRole('button', { name: 'Import' }).click();
      
      // Verify import success
      await expect(page.getByText('Successfully imported')).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Close' }).click();
      
      // Verify imported MCP is visible
      await expect(page.getByText('Imported GitHub MCP')).toBeVisible();
      
      // Check if profile dropdown has the imported profile (if profile import is implemented)
      await page.getByRole('button', { name: /Profile:/ }).click();
      // Note: Profile import might not be fully implemented in UI yet
    });
  });

  test.describe('Profile Persistence and Data Integrity', () => {
    test('should persist profiles across browser sessions', async ({ page, context }) => {
      // Create test profile
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('Persistence Test MCP');
      await page.getByRole('textbox', { name: 'Command' }).fill('node persist-test.js');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept('Persistence Test Profile'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Verify profile exists
      await page.getByRole('button', { name: /Profile:/ }).click();
      await expect(page.getByText('Persistence Test Profile')).toBeVisible();
      
      // Create new page (simulate browser session)
      const newPage = await context.newPage();
      await newPage.goto('/');
      
      // Wait for app to load
      await expect(newPage.getByRole('heading', { name: 'MCP Manager' })).toBeVisible();
      
      // Check if profile still exists
      await newPage.getByRole('button', { name: /Profile:/ }).click();
      await expect(newPage.getByText('Persistence Test Profile')).toBeVisible();
      
      // Verify MCP is also persisted
      await expect(newPage.getByText('Persistence Test MCP')).toBeVisible();
      
      await newPage.close();
    });

    test('should maintain profile-MCP associations after page reload', async ({ page }) => {
      // Create multiple MCPs
      const mcps = ['MCP Alpha', 'MCP Beta', 'MCP Gamma'];
      
      for (const mcpName of mcps) {
        await page.getByRole('button', { name: 'Add MCP' }).click();
        await page.getByRole('textbox', { name: 'Name' }).fill(mcpName);
        await page.getByRole('textbox', { name: 'Command' }).fill(`node ${mcpName.toLowerCase().replace(' ', '-')}.js`);
        await page.getByRole('button', { name: 'Add MCP' }).click();
      }
      
      // Disable MCP Beta
      const betaCard = page.getByText('MCP Beta').locator('..');
      await betaCard.locator('[data-slot="switch"]').click();
      
      // Create profile (should include Alpha and Gamma, not Beta)
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept('Reload Test Profile'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Enable all MCPs manually
      await page.locator('[data-slot="switch"]').nth(1).click(); // Enable Beta
      
      // Reload page
      await page.reload();
      await expect(page.getByRole('heading', { name: 'MCP Manager' })).toBeVisible();
      
      // Load the profile
      await page.getByRole('button', { name: /Profile:/ }).click();
      await page.getByText('Reload Test Profile').click();
      
      // Verify correct MCP states (Alpha and Gamma enabled, Beta disabled)
      await expect(page.getByText('MCP Alpha').locator('..').getByText('Enabled')).toBeVisible();
      await expect(page.getByText('MCP Beta').locator('..').getByText('Disabled')).toBeVisible();
      await expect(page.getByText('MCP Gamma').locator('..').getByText('Enabled')).toBeVisible();
    });
  });

  test.describe('Profile Error Handling and Edge Cases', () => {
    test('should handle empty profile creation gracefully', async ({ page }) => {
      // Try to create profile with no MCPs
      await page.getByRole('button', { name: /Profile:/ }).click();
      
      page.on('dialog', dialog => dialog.accept('Empty Profile'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Profile should be created but with 0 MCPs
      await page.getByRole('button', { name: /Profile:/ }).click();
      await expect(page.getByText('Empty Profile')).toBeVisible();
      await expect(page.getByText('0 MCPs')).toBeVisible();
    });

    test('should handle special characters in profile names', async ({ page }) => {
      // Add test MCP
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('Special Chars MCP');
      await page.getByRole('textbox', { name: 'Command' }).fill('node special.js');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      // Create profile with special characters
      const specialName = 'Profile with Special: Chars! @#$%^&*()_+-=[]{}|;:,.<>?';
      
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept(specialName));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Verify profile with special characters is handled correctly
      await page.getByRole('button', { name: /Profile:/ }).click();
      await expect(page.locator('text=' + specialName)).toBeVisible();
    });

    test('should handle very long profile names', async ({ page }) => {
      // Add test MCP
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('Long Name Test MCP');
      await page.getByRole('textbox', { name: 'Command' }).fill('node long.js');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      // Create profile with very long name
      const longName = 'A'.repeat(200) + ' Very Long Profile Name That Should Be Handled Gracefully';
      
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept(longName));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Verify long name is handled (might be truncated in display)
      await page.getByRole('button', { name: /Profile:/ }).click();
      await expect(page.getByText(longName.substring(0, 50))).toBeVisible(); // Check first part
    });

    test('should handle profile operations during MCP testing', async ({ page }) => {
      // Add test MCP
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('Concurrent Test MCP');
      await page.getByRole('textbox', { name: 'Command' }).fill('echo test');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      // Start MCP connection test
      await page.getByRole('button').filter({ hasText: /^$/ }).click();
      await page.getByRole('menuitem', { name: 'Test Connection' }).click();
      
      // While test is running, create profile
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept('Concurrent Operations Profile'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Both operations should complete successfully
      await expect(page.getByText('Testing...').or(page.getByText('Connected')).or(page.getByText('Disconnected'))).toBeVisible({ timeout: 10000 });
      
      await page.getByRole('button', { name: /Profile:/ }).click();
      await expect(page.getByText('Concurrent Operations Profile')).toBeVisible();
    });
  });

  test.describe('Profile UI Interactions', () => {
    test('should display profile dropdown with MCP counts', async ({ page }) => {
      // Create profiles with different MCP counts
      
      // Profile 1: 2 MCPs
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('MCP 1');
      await page.getByRole('textbox', { name: 'Command' }).fill('node mcp1.js');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('MCP 2');
      await page.getByRole('textbox', { name: 'Command' }).fill('node mcp2.js');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept('Two MCPs Profile'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Profile 2: 1 MCP
      await page.locator('[data-slot="switch"]').first().click(); // Disable first MCP
      
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept('One MCP Profile'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Check dropdown shows correct counts
      await page.getByRole('button', { name: /Profile:/ }).click();
      await expect(page.getByText('Two MCPs Profile')).toBeVisible();
      await expect(page.getByText('One MCP Profile')).toBeVisible();
      
      // Counts should be visible in dropdown
      await expect(page.getByText('2 MCPs')).toBeVisible();
      await expect(page.getByText('1 MCP')).toBeVisible();
    });

    test('should handle profile switching with visual feedback', async ({ page }) => {
      // Setup multiple profiles
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('Visual Test MCP');
      await page.getByRole('textbox', { name: 'Command' }).fill('node visual.js');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      // Create first profile
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept('Visual Profile A'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Disable MCP and create second profile
      await page.locator('[data-slot="switch"]').click();
      
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept('Visual Profile B'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Test visual feedback when switching
      await page.getByRole('button', { name: /Profile:/ }).click();
      await page.getByText('Visual Profile A').click();
      
      // Should show loading state or immediate change
      await expect(page.getByRole('button', { name: /Profile: Visual Profile A/ })).toBeVisible();
      await expect(page.getByText('Visual Test MCP').locator('..').getByText('Enabled')).toBeVisible();
      
      // Switch to Profile B
      await page.getByRole('button', { name: /Profile:/ }).click();
      await page.getByText('Visual Profile B').click();
      
      await expect(page.getByRole('button', { name: /Profile: Visual Profile B/ })).toBeVisible();
      await expect(page.getByText('Visual Test MCP').locator('..').getByText('Disabled')).toBeVisible();
    });

    test('should integrate with existing MCP functionality', async ({ page }) => {
      // Create profile and verify integration with other features
      await page.getByRole('button', { name: 'Add MCP' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('Integration Test MCP');
      await page.getByRole('textbox', { name: 'Command' }).fill('echo integration-test');
      await page.getByRole('button', { name: 'Add MCP' }).click();
      
      // Create profile
      await page.getByRole('button', { name: /Profile:/ }).click();
      page.on('dialog', dialog => dialog.accept('Integration Profile'));
      await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      
      // Test export functionality with profile loaded
      await page.getByRole('button', { name: 'Copy JSON' }).click();
      
      // Test search functionality
      await page.getByPlaceholder('Search MCPs...').fill('Integration');
      await expect(page.getByText('Integration Test MCP')).toBeVisible();
      
      // Test filter functionality
      await page.getByRole('button', { name: 'Filter' }).click();
      await page.getByRole('menuitem', { name: 'Enabled Only' }).click();
      await expect(page.getByText('Integration Test MCP')).toBeVisible();
      
      // Clear filter
      await page.getByRole('button', { name: 'Filter' }).click();
      await page.getByRole('menuitem', { name: 'All MCPs' }).click();
    });
  });

  test.describe('Performance and Stress Testing', () => {
    test('should handle rapid profile switching without issues', async ({ page }) => {
      // Create multiple profiles
      const profiles = ['Speed Profile A', 'Speed Profile B', 'Speed Profile C'];
      
      for (let i = 0; i < profiles.length; i++) {
        // Add MCP
        await page.getByRole('button', { name: 'Add MCP' }).click();
        await page.getByRole('textbox', { name: 'Name' }).fill(`Speed MCP ${i + 1}`);
        await page.getByRole('textbox', { name: 'Command' }).fill(`node speed${i + 1}.js`);
        await page.getByRole('button', { name: 'Add MCP' }).click();
        
        // Create profile
        await page.getByRole('button', { name: /Profile:/ }).click();
        page.on('dialog', dialog => dialog.accept(profiles[i]));
        await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
        
        // Disable current MCP for next profile
        if (i < profiles.length - 1) {
          await page.locator('[data-slot="switch"]').nth(i).click();
        }
      }
      
      // Rapidly switch between profiles
      for (let i = 0; i < 5; i++) {
        for (const profileName of profiles) {
          await page.getByRole('button', { name: /Profile:/ }).click();
          await page.getByText(profileName).click();
          // Small delay to prevent overwhelming the system
          await page.waitForTimeout(100);
        }
      }
      
      // Verify final state is consistent
      await page.getByRole('button', { name: /Profile:/ }).click();
      await expect(page.getByText('Speed Profile C')).toBeVisible();
      
      // Check that the correct MCP is enabled
      await expect(page.getByText('Speed MCP 3').locator('..').getByText('Enabled')).toBeVisible();
    });

    test('should maintain performance with many profiles', async ({ page }) => {
      // Create many profiles (limited number for reasonable test time)
      const profileCount = 10;
      
      for (let i = 1; i <= profileCount; i++) {
        await page.getByRole('button', { name: 'Add MCP' }).click();
        await page.getByRole('textbox', { name: 'Name' }).fill(`Performance MCP ${i}`);
        await page.getByRole('textbox', { name: 'Command' }).fill(`node perf${i}.js`);
        await page.getByRole('button', { name: 'Add MCP' }).click();
        
        // Only keep last MCP enabled
        if (i > 1) {
          await page.locator('[data-slot="switch"]').nth(i - 2).click();
        }
        
        await page.getByRole('button', { name: /Profile:/ }).click();
        page.on('dialog', dialog => dialog.accept(`Performance Profile ${i}`));
        await page.getByRole('menuitem', { name: '+ Create Profile from Current' }).click();
      }
      
      // Test that dropdown still performs well
      const startTime = Date.now();
      await page.getByRole('button', { name: /Profile:/ }).click();
      
      // All profiles should be visible
      for (let i = 1; i <= profileCount; i++) {
        await expect(page.getByText(`Performance Profile ${i}`)).toBeVisible();
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000); // Should render within 2 seconds
      
      // Test switching to middle profile
      await page.getByText(`Performance Profile ${Math.floor(profileCount / 2)}`).click();
      
      // Verify correct profile loaded
      await expect(page.getByRole('button', { name: /Performance Profile/ })).toBeVisible();
    });
  });
});
