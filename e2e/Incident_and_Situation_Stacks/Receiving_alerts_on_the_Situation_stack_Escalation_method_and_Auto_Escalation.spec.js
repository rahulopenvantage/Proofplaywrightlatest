// e2e/Receiving alerts on the Situation stack - Escalation method & Auto Escalation.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for enhanced debugging
import '../../backend/GlobalFailureHandler.js';

const SITE_NAME = 'BDFD_Boeing'; // Site name used in the test
const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Receiving alerts on the Situation stack - Escalation method & Auto Escalation', () => {
    let sharedTestSteps;
    
    test.beforeEach(async ({ page }) => {
        // Set extended timeout for comprehensive escalate workflow
        test.setTimeout(300000); // 5 minutes timeout for complex operations
        
        // Instantiate SharedTestSteps
        sharedTestSteps = new SharedTestSteps(page);        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Step 1: Authentication and company selection
        console.log('[EscalateTest] Step 1: Authentication and company selection...');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        
        // Step 2: Select Automation company
        console.log('[EscalateTest] Step 2: Selecting Automation company...');
        await sharedTestSteps.selectCompany('Automation company');

    });    test('Should escalate to the situation stack and auto escalate', async ({ page }) => {
        console.log('[EscalateTest] Starting comprehensive escalate test flow...');
        
        // Step 3: Create Manual Alert
        console.log('[EscalateTest] Step 3: Creating manual alert...');
        await sharedTestSteps.createManualAlertForSite(SITE_NAME);
        console.log('[EscalateTest] Manual alert created successfully.');
        
        // Step 4: Navigate to Command Page and Apply Manual Stack Filter
        console.log('[EscalateTest] Step 4: Navigating to command page and applying manual alert stack filter...');
        await sharedTestSteps.navigateToMenu('Command');
        console.log('[EscalateTest] Navigated to command page.');
        
        // Step 5: Apply manual alert stack filter
        console.log('[EscalateTest] Step 5: Applying manual alert stack filter...');
        await sharedTestSteps.genericManualAlertStackFilter();
        console.log('[EscalateTest] Manual alert filter applied successfully.');
        
        // Step 6: Verify filter is applied by checking the filter button state
        console.log('[EscalateTest] Step 6: Verifying filter application...');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        const filterButton = page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
        await expect(filterButton).toBeVisible();
        console.log('[EscalateTest] Filter application verified.');
        
        // Step 7: Expand and Select Manual Alert
        console.log('[EscalateTest] Step 7: Expanding and selecting manual alert...');
        await sharedTestSteps.expandAndSelectManualCard();
        console.log('[EscalateTest] Manual alert expanded and selected successfully.');
        
        // Step 8: Complete SOP
        console.log('[EscalateTest] Step 8: Completing SOP...');
        await sharedTestSteps.completeSOP();
        console.log('[EscalateTest] SOP completed and validated successfully.');
        
        // Step 9: Click Escalate Button
        console.log('[EscalateTest] Step 9: Clicking escalate button...');
        await sharedTestSteps.escalateSOP();
        console.log('[EscalateTest] Escalate button clicked successfully.');
        
        // Step 10: Switch to Situation Stack and Verify Manual Alert is Present
        console.log('[EscalateTest] Step 10: Switching to Situation Stack and verifying manual alert...');
        await sharedTestSteps.switchToSituationStack();
        
        // Step 11: Wait for the situation stack to load
        console.log('[EscalateTest] Step 11: Waiting for situation stack to load...');
        await page.waitForTimeout(2000);
        
        // Step 12: Verify BDFD_Boeing site card is visible in Situation Stack
        console.log('[EscalateTest] Step 12: Verifying BDFD_Boeing site is visible in Situation Stack...');
        await expect(page.locator('[data-test-id="aggregated-site-card-name"]')
            .filter({ hasText: 'BDFD_Boeing' }))
            .toBeVisible({ timeout: 15000 });

        // Step 13: Create another manual alert
        console.log('[EscalateTest] Step 13: Creating second manual alert...');
        await sharedTestSteps.createManualAlertForSite(SITE_NAME);
        console.log('[EscalateTest] Second manual alert created successfully.');

        // Step 14: Navigate back to Command
        console.log('[EscalateTest] Step 14: Navigating back to Command...');
        await sharedTestSteps.navigateToMenu('Command');
        
        // Step 15: Switch back to Situation Stack        
        console.log('[EscalateTest] Step 15: Switching back to Situation Stack...');
        await sharedTestSteps.switchToSituationStack();
        
        // Step 16: Test to check if incident-group-alert-count shows the number 2
        console.log('[EscalateTest] Step 16: Verifying incident-group-alert-count shows "2"...');
        await expect(page.locator('[data-test-id="incident-group-alert-count"]')).toHaveText('2');
        console.log('[EscalateTest] ✅ Verified incident-group-alert-count displays "2"');
        
        console.log('[EscalateTest] Comprehensive escalate test flow completed successfully.');
    });    test.afterEach(async ({ page }) => {
        // Cleanup: Remove any test alerts that might have been created
        console.log('[EscalateTest] Starting cleanup process...');
        await page.goto('/');
        await sharedTestSteps.selectCompany('Automation company');
        try {
            // Step 1: Use SharedTestSteps for cleanup
            console.log('[EscalateTest] Step 1: Running manual alerts cleanup...');
            if (sharedTestSteps) {
                await sharedTestSteps.cleanupManualAlerts();
                console.log('[EscalateTest] Cleanup completed successfully.');
            }
        } catch (error) {
            console.log(`[EscalateTest] Cleanup encountered an issue: ${error.message}`);
            // Don't fail the test due to cleanup issues
        }
    });
});