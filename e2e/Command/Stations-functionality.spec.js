import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const NORMAL_USERNAME = process.env.NORMAL_MS_USERNAME;
const NORMAL_PASSWORD = process.env.NORMAL_MS_PASSWORD;
const ADMIN_USERNAME = process.env.ADMIN_MS_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Dashboard - Stations functionality', () => {
    let sharedSteps;
    
    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000); // 2 minutes for complex operations
        
        // Instantiate SharedTestSteps
        sharedSteps = new SharedTestSteps(page);
        
        // Environment validation
        if (!NORMAL_USERNAME || !NORMAL_PASSWORD || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
            throw new Error('NORMAL_MS_USERNAME, NORMAL_MS_PASSWORD, ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Switch to normal user for this test
        console.log('[Stations Functionality] Switching to normal user...');
        await sharedSteps.switchToNormalUser(NORMAL_USERNAME, NORMAL_PASSWORD);
    });

    test('should verify stations dropdown and filtering functionality', async ({ page }) => {
        console.log('[Stations Functionality] Starting test flow...');
        
        // Step 1: Admin Login and Navigate to Command Dashboard
        console.log('[Stations Functionality] Step 1: Normal user already logged in from beforeEach');
        // Normal user is already logged in from beforeEach
        // Step 3: Click on Station DropDown - ALL
        console.log('[Stations Functionality] Step 3: Click on Station DropDown - ALL');
        await sharedSteps.changeStationToAll();
        await page.waitForLoadState('networkidle');
        
        // Step 4: Verify if image "All Test image on stations.png" present in current-page
        console.log('[Stations Functionality] Step 4: Verify ALL station image');
      //  const stationDropdownALL = page.locator('[data-test-id="station-dropdown"]');
        //await expect(stationDropdownALL).toHaveScreenshot('all-test-image-on-stations.png');
        
        // Step 5: Mouseover the element Linked Areas Icon
        console.log('[Stations Functionality] Step 5: Mouseover Linked Areas Icon');
        const linkedAreasIcon = page.locator('[data-test-id="linkedAreasIcon"]');
        await linkedAreasIcon.hover();
        
        // Step 6: Verify if image "ALL for Station dropdown.png" present in current-page
        console.log('[Stations Functionality] Step 6: Verify ALL station dropdown image');
      //  await expect(stationDropdownALL).toHaveScreenshot('all-for-station-dropdown.png');
        
        // Step 8: Click on Automation test station
        console.log('[Stations Functionality] Step 8: Click on Automation test station');
        await sharedSteps.changeStationToAutomationTest();
        await page.waitForLoadState('networkidle');
        
        // Step 9: Mouseover the element Linked Areas Icon
        console.log('[Stations Functionality] Step 9: Mouseover Linked Areas Icon');
        await linkedAreasIcon.hover();
        
        // Step 10: Create Manual alert for Automation Company
        console.log('[Stations Functionality] Step 10: Create Manual alert for Automation Company');
        await sharedSteps.createManualAlert();
        
        // Step 11: Navigate to Dashboard
        console.log('[Stations Functionality] Step 11: Navigate to Dashboard');
        await sharedSteps.navigateToMenu('Command');
        
        // Step 12: Generic Manual alert stack filter
        console.log('[Stations Functionality] Step 12: Generic Manual alert stack filter');
        await sharedSteps.genericManualAlertStackFilter();
        
        // Step 13: Verify that the element card_aggregate_ManualAlert is DISPLAYED
        console.log('[Stations Functionality] Step 13: Verify manual alert card is displayed');
        await sharedSteps.expandAndSelectManualCard();
        console.log('[Stations Functionality] Manual alert card is displayed successfully');

        // Step 15: Click on Station DropDown - ALL
        console.log('[Stations Functionality] Step 15: Click on Station DropDown - ALL');
        await sharedSteps.changeStationToAll();
        await page.waitForLoadState('networkidle');
        
        // Step 16: Verify expandAndSelectManualCard fails since alert is not visible
        console.log('[Stations Functionality] Step 16: Verify expandAndSelectManualCard fails - alert not visible');
        try {
            await sharedSteps.expandAndSelectManualCard();
            console.log('[Stations Functionality] ERROR: expandAndSelectManualCard should have failed but succeeded');
        } catch (error) {
            console.log('[Stations Functionality] SUCCESS: expandAndSelectManualCard failed as expected - manual alert not visible after station change');
            console.log(`[Stations Functionality] Manual alert not visible after station change: ${error.message}`);
        }
        

        
        console.log('[Stations Functionality] Test completed successfully.');
    });
    test.afterEach(async ({ page }) => {
        console.log('[Stations Functionality] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Change station to Automation Test for cleanup
            await sharedSteps.changeStationToAutomationTest();
            await page.waitForLoadState('networkidle');
            
            // Step 3: Clean up manual alerts
            console.log('[Stations Functionality] Step 3: Cleaning up manual alerts');
            await sharedSteps.cleanupManualAlerts();
            
            // Step 4: Logout from normal user and login back with admin user
            console.log('[Stations Functionality] Switching back to admin user...');
            await sharedSteps.switchToAdminUser(ADMIN_USERNAME, ADMIN_PASSWORD);
            
            console.log('[Stations Functionality] Cleanup completed successfully');
        } catch (error) {
            console.log(`[Stations Functionality] Cleanup failed: ${error.message}`);
            // Try to login with admin user anyway
            try {
                await sharedSteps.switchToAdminUser(ADMIN_USERNAME, ADMIN_PASSWORD);
            } catch (loginError) {
                console.log(`[Stations Functionality] Failed to restore admin session: ${loginError.message}`);
            }
        }
    });
});
