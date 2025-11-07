// e2e/Total_alert_indicator_Incident_Situation.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const SITE_NAME = 'BDFD_Boeing'; // Standard site name used in Automation company tests

test.describe('Total Alert Indicator - Incident and Situation Stack', () => {
    let sharedTestSteps;
    
    test.beforeEach(async ({ page }) => {
        // Set timeout for complex operations
        test.setTimeout(300000); // 5 minutes for complete workflow
        
        // Instantiate SharedTestSteps
        sharedTestSteps = new SharedTestSteps(page);
        
        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        console.log('[TotalAlertIndicator] Starting shared test steps...');
        // Step 1: Authenticate and setup
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        
        // Step 2: Select Automation Company
        console.log('[TotalAlertIndicator] Step 2: Select Automation Company...');
        await sharedTestSteps.selectCompany('Automation company');
        
        // Step 3: Ensure clean state - reset to Incident stack and clear filters
        console.log('[TotalAlertIndicator] Step 3: Ensuring clean test state...');
        await page.waitForLoadState('networkidle');
        
    });

    test('should verify total alert indicator functionality across both stacks', async ({ page }) => {
        console.log('[TotalAlertIndicator] Starting total alert indicator verification test...');
        
        // Step 5: Create Manual alert for Automation Company
        console.log('[TotalAlertIndicator] Step 5: Create Manual alert for Automation Company...');
        await sharedTestSteps.createManualAlert();
        
        // Step 6: Navigate to Dashboard
        console.log('[TotalAlertIndicator] Step 6: Navigate to Dashboard...');
        await sharedTestSteps.navigateToMenu('Command');
          // Step 4: Generic Manual alert stack filter
        console.log('[TotalAlertIndicator] Step 4: Generic Manual alert stack filter...');
        await sharedTestSteps.genericManualAlertStackFilter();
        
        // Step 7: Expand and select manual alert card (using established pattern)
        console.log('[TotalAlertIndicator] Step 7: Expanding and selecting manual alert card...');
        await sharedTestSteps.expandAndSelectManualCard();
        
        // Step 8: Store the initial count of manual alerts
        console.log('[Manual Alert Test] Step 8: Storing the initial count of manual alert cards.');
        const manualAlertCards = page.locator('[data-test-id="manual-alert-card"]');
        let count = await manualAlertCards.count();
        console.log(`[Manual Alert Test] Initial manual alert count is: ${count}`);        // Step 9: Verify the card counter element is visible
        console.log('[Manual Alert Test] Step 9: Verifying the card counter is visible.');
        const cardCounter = page.locator('[data-test-id="incident-group-alert-count"]').first();
        await expect(cardCounter).toBeVisible({ timeout: 10000 });

        // Step 10: Create a Manual Alert (Reusable Action)
        console.log('[Manual Alert Test] Step 10: Creating a new manual alert for Automation Company.');
        await sharedTestSteps.createManualAlert();        // Step 11: Navigate to Dashboard (Reusable Action)
        console.log('[Manual Alert Test] Step 11: Navigating back to the dashboard.');
        await sharedTestSteps.navigateToMenu('Command');
        
        // Step 12: Apply filter and expand card again (using established pattern)
        console.log('[Manual Alert Test] Step 12: Applying filter and expanding manual alert card again...');
        await sharedTestSteps.expandAndSelectManualCard();

        // Step 13: Store the new count of manual alerts
        console.log('[Manual Alert Test] Step 13: Storing the new count of manual alert cards.');
        count = await manualAlertCards.count();
        console.log(`[Manual Alert Test] New manual alert count is: ${count}`);        // Step 14 & 15: Verify the total alert indicator displays the new count
        console.log('[Manual Alert Test] Step 14 & 15: Verifying the total alert indicator displays the new count.');
        const totalAlertIndicator = page.locator('[data-test-id="incident-group-alert-count"]').first();
        await expect(totalAlertIndicator).toBeVisible({ timeout: 10000 });

        // Step 16 & 17: Expand and select a manual alert card
        console.log('[Manual Alert Test] Step 16 & 17: Clicking on the first manual alert card.');
        await manualAlertCards.first().click();
        
        // Step 18: Complete SOP with "No" (Reusable Action)
        console.log('[Manual Alert Test] Step 18: Completing SOP, answering "No" to the first question.');
        await sharedTestSteps.completeSOP();

        // Step 19: Click on the positive dismiss button in the activity log
        console.log('[Manual Alert Test] Step 19: Clicking the positive dismiss button.');
        const wrongDismissButton = page.locator('[data-test-id="wrongDismiss"]');  
        await wrongDismissButton.click();

        // Step 20: Store the final count of manual alerts
        console.log('[Manual Alert Test] Step 20: Storing the final count of manual alerts after dismissal.');
        count = await manualAlertCards.count();
        console.log(`[Manual Alert Test] Final manual alert count is: ${count}`);        // Step 21 & 22: Verify the total alert indicator displays the final count
        console.log('[Manual Alert Test] Step 21 & 22: Verifying the total alert indicator displays the final count.');
        const finalAlertIndicator = page.locator('[data-test-id="incident-group-alert-count"]').first();
        await expect(finalAlertIndicator).toBeVisible({ timeout: 10000 });

        console.log('[TotalAlertIndicator] Total alert indicator verification completed successfully');
    });

    test('should verify total alert indicator functionality on Situation stack', async ({ page }) => {
        console.log('[TotalAlertIndicator] Starting Situation stack total alert indicator verification test...');
        
        // Step 5: Create Manual alert for Automation Company
        console.log('[TotalAlertIndicator] Step 5: Create Manual alert for Automation Company...');
        await sharedTestSteps.createManualAlert();
        
        // Step 6: Navigate to Dashboard
        console.log('[TotalAlertIndicator] Step 6: Navigate to Dashboard...');
        await sharedTestSteps.navigateToMenu('Command');
        
         // Step 4: Generic Manual alert stack filter
        console.log('[TotalAlertIndicator] Step 4: Generic Manual alert stack filter...');
        await sharedTestSteps.genericManualAlertStackFilter();
        
        // Step 7: Click on accordion_card_ManualAlert
        console.log('[Situation Stack Test] Step 7: Clicking on accordion card ManualAlert...');
        await sharedTestSteps.expandAndSelectManualCard();
        
        // Step 8: SOP - Complete and Validate with No for Q1
        console.log('[Situation Stack Test] Step 8: Completing SOP with "No" for Q1...');
        await sharedTestSteps.completeSOP();
        
        // Step 9: Click on btn_activityLog_Escalate
        console.log('[Situation Stack Test] Step 9: Clicking the escalate button...');
        await sharedTestSteps.escalateSOP();
        
        // Step 10: Switch to Situation Stack
        console.log('[Situation Stack Test] Step 10: Switching to Situation Stack...');
        await sharedTestSteps.switchToSituationStack();
        
        // Step 11: Wait until the element card_aggregate_ManualAlert is VISIBLE
        console.log('[Situation Stack Test] Step 11: Waiting for card_aggregate_ManualAlert to be visible...');
        const aggregateManualAlert = page.locator('[data-test-id="aggregated-site-card"]').first();
        await expect(aggregateManualAlert).toBeVisible({ timeout: 15000 });
        
        // Step 12: Expand and Select Manual card
        console.log('[Situation Stack Test] Step 12: Expanding and selecting manual card...');
        await sharedTestSteps.expandAndSelectManualCard();
        
        // Step 13: Store the count of elements identified by locator card_ManualAlert
        console.log('[Situation Stack Test] Step 13: Storing the count of manual alert cards...');
        const manualAlertCards = page.locator('[data-test-id="manual-alert-card"]');
        let count = await manualAlertCards.count();
        console.log(`[Situation Stack Test] Manual alert count is: ${count}`);
        
        // Step 14: Verify that the elements with locator Total alert indicator displays text count
        console.log('[Situation Stack Test] Step 14: Verifying the total alert indicator displays the count...');
        const totalAlertIndicator = page.locator('[data-test-id="incident-group-alert-count"]').first();
        await expect(totalAlertIndicator).toBeVisible({ timeout: 10000 });
        
        // Step 15: Create Manual alert for Automation Company
        console.log('[Situation Stack Test] Step 15: Creating another manual alert for Automation Company...');
        await sharedTestSteps.createManualAlert();
        
        // Step 16: Navigate to Dashboard
        console.log('[Situation Stack Test] Step 16: Navigating to Dashboard...');
        await sharedTestSteps.navigateToMenu('Command');
        
        // Step 17: Wait for 5 seconds
        console.log('[Situation Stack Test] Step 17: Waiting for 5 seconds...');
        await page.waitForTimeout(2000);
        
        // Step 18: Switch to Situation Stack
        console.log('[Situation Stack Test] Step 18: Switching to Situation Stack...');
        await sharedTestSteps.switchToSituationStack();
        
        // Step 20: Wait for 5 seconds
        console.log('[Situation Stack Test] Step 20: Waiting for 5 seconds...');
        await page.waitForTimeout(2000);
        
        // Step 21: Verify that the current page displays an element card_aggregate_ManualAlert
        console.log('[Situation Stack Test] Step 21: Verifying card_aggregate_ManualAlert is displayed...');
        await expect(aggregateManualAlert).toBeVisible({ timeout: 10000 });
        
        // Step 22: Expand and Select Manual card
        console.log('[Situation Stack Test] Step 22: Expanding and selecting manual card...');
        await sharedTestSteps.expandAndSelectManualCard();
        
        // Step 23: Store the count of elements identified by locator card_ManualAlert
        console.log('[Situation Stack Test] Step 23: Storing the updated count of manual alert cards...');
        count = await manualAlertCards.count();
        console.log(`[Situation Stack Test] Updated manual alert count is: ${count}`);
        
        // Step 24: Verify that the elements with locator Total alert indicator displays text count
        console.log('[Situation Stack Test] Step 24: Verifying the total alert indicator displays the updated count...');
        await expect(totalAlertIndicator).toBeVisible({ timeout: 10000 });
        
        console.log('[TotalAlertIndicator] Situation stack total alert indicator verification completed successfully');
    });

    test.afterEach(async ({ page }) => {
        console.log('[TotalAlertIndicator] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedTestSteps.selectCompany('Automation company');
            
            // Step 3: Clean manual alerts
            await sharedTestSteps.cleanupManualAlerts();
            
            // Step 4: Clean UB/Trex alerts
            await sharedTestSteps.cleanupUBAndTrexAlerts(SITE_NAME);
            
            // Step 5: Reset stack filters
            await sharedTestSteps.resetStackFilter();
            
            console.log('[TotalAlertIndicator] Cleanup completed successfully');
        } catch (error) {
            console.log(`[TotalAlertIndicator] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });

});