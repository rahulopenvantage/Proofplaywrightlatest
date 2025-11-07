// e2e/Receiving alerts on the Situation stack - Dispatch method.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Receiving alerts on the Situation stack - Dispatch method', () => {
    let sharedTestSteps;
    
    test.beforeEach(async ({ page }) => {
        // Set timeout for each test
        test.setTimeout(300000); // 5 minutes timeout for complex operations
        
        // Instantiate SharedTestSteps for each test
        sharedTestSteps = new SharedTestSteps(page);
        
        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
          // Step 1: Authentication and company selection
        console.log('[DispatchMethod] Step 1: Authentication and company selection...');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        
        console.log('[DispatchMethod] Step 2: Selecting Automation company...');
        await sharedTestSteps.selectCompany('Automation company');
           
        console.log('[DispatchMethod] Step 13: Performing cleanup...');
        await sharedTestSteps.cleanupManualAlerts();
              console.log('[DispatchMethod] Cleanup completed successfully');
        // Step 2: Select Automation company

    });    test('Ensure Dispatch is correctly displayed on the Situation Stack', async ({ page }) => {
        console.log('[DispatchMethod] Starting workflow test...');
        
        // Step 3: Create manual alert for automation company
        console.log('[DispatchMethod] Step 3: Creating manual alert...');
        await sharedTestSteps.createManualAlert();
        
        // Step 4: Navigate to command page
        console.log('[DispatchMethod] Step 4: Navigating to command page...');
        await sharedTestSteps.navigateToMenu('Command');
        
        // Step 5: Filter to manual alerts
        console.log('[DispatchMethod] Step 5: Filtering to manual alerts...');
     //   await sharedTestSteps.genericManualAlertStackFilter();
        
        // Step 6: Expand and select manual card
        console.log('[DispatchMethod] Step 6: Expanding and selecting manual alert card...');
        await sharedTestSteps.expandAndSelectManualCard();
        
        // Step 7: Complete SOP
        console.log('[DispatchMethod] Step 7: Completing SOP...');
        await sharedTestSteps.completeSOP();
        
        // Step 8: Click dispatch button
        console.log('[DispatchMethod] Step 8: Clicking dispatch button...');
        await sharedTestSteps.dispatchSOP();
        
        // Step 9: Wait for dispatch to complete
        console.log('[DispatchMethod] Step 9: Waiting for dispatch to complete...');
        await page.waitForTimeout(1000);
        
        // Step 10: Switch to Situation Stack
        console.log('[DispatchMethod] Step 10: Switching to Situation Stack...');
        await sharedTestSteps.switchToSituationStack();
        
        // Step 11: Wait for the situation stack to load properly
        console.log('[DispatchMethod] Step 11: Waiting for situation stack to load...');
        await page.waitForTimeout(2000);
        
        // Step 12: Verify BDFD_Boeing site card is visible
        console.log('[DispatchMethod] Step 12: Verifying BDFD_Boeing site is visible...');
        
        // Simply verify BDFD_Boeing is visible - matching the Cypress test exactly
        await expect(page.locator('[data-test-id="aggregated-site-card-name"]')
            .filter({ hasText: 'BDFD_Boeing' }))
            .toBeVisible({ timeout: 15000 });
        
        console.log('[DispatchMethod] ✅ BDFD_Boeing site card verified as visible in Situation Stack');
        
        // Step 13: Cleanup manual alertsDispatchMethod] Workflow test completed successfully.');
    });

    test.afterEach(async ({ page }) => {
        console.log('[DispatchMethod] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedTestSteps.selectCompany('Automation company');
            
            // Step 3: Clean manual alerts (this test creates manual alerts)
            await sharedTestSteps.cleanupManualAlerts();
            
            // Step 4: Reset stack filters
            await sharedTestSteps.resetStackFilter();
            
            console.log('[DispatchMethod] Cleanup completed successfully');
        } catch (error) {
            console.log(`[DispatchMethod] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });

});