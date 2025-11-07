import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const SITE_SEARCH_TERM = 'BDFD_Boeing';

test.describe('Search by site name', () => {
    let sharedTestSteps;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000);
        
        sharedTestSteps = new SharedTestSteps(page);

        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Authentication and company selection
        console.log('[Site Search Test] Authentication and company selection...');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        await sharedTestSteps.selectCompany('Automation company');
    });    test('should filter by site name and verify the alert count', async ({ page }) => {
        console.log('[Site Search Test] Starting test: Search by site name');
        
        // Step 3: Create Manual alert for Automation Company
        console.log('[Site Search Test] Step 3: Creating manual alert for Automation Company...');
        await sharedTestSteps.createManualAlert();
        
        // Step 4: Navigate to Dashboard
        console.log('[Site Search Test] Step 4: Navigate to Dashboard...');
        await sharedTestSteps.navigateToMenu('Command');

        await page.waitForTimeout(2000);
        // Step 5: Click on btn_dashboard_stackFilter
        console.log('[Site Search Test] Step 5: Opening stack filter (btn_dashboard_stackFilter)...');
        const stackFilterButton = page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
        await stackFilterButton.click();

        // Step 6: Enter BDFD_Boeing in input_stackFilter_search field
        console.log(`[Site Search Test] Step 6: Entering '${SITE_SEARCH_TERM}' in input_stackFilter_search field...`);
        const searchInput = page.locator('input[placeholder*="Search by site name"]');
        await searchInput.fill(SITE_SEARCH_TERM);
        
        // Step 7: Click on btn_stackFilter_Apply
        console.log('[Site Search Test] Step 7: Clicking btn_stackFilter_Apply...');
        const applyButton = page.locator('[data-test-id="alert-filter-apply-button"]');
        await page.waitForTimeout(1000);
        await applyButton.click();
       
        
        // Step 8: Click on btn_stackFilter_close
        console.log('[Site Search Test] Step 8: Clicking btn_stackFilter_close...');
        const closeButton = page.locator('[data-test-id="modalClose"]');
        await closeButton.click();        // Step 9: Click on accordion_card_ManualAlert
        console.log('[Site Search Test] Step 9: Clicking accordion_card_ManualAlert...');
        const accordion = page.locator('[data-test-id="aggregated-site-card"]').filter({ hasText: SITE_SEARCH_TERM });
        await accordion.click();

        // Step 9b: Click expand button to expand the accordion
        console.log('[Site Search Test] Step 9b: Clicking expand button...');
        const expandButton = accordion.locator('[data-test-id="site-alert-card-expand-button"]');
        await expandButton.click();

        // Step 10: Store count of card_ManualAlert into variable count
        console.log('[Site Search Test] Step 10: Storing count of card_ManualAlert elements...');
        const manualAlertCards = page.locator('[data-test-id="manual-alert-card"]');
        const count = await manualAlertCards.count();
        console.log(`[Site Search Test] Found ${count} manual alert cards.`);

        // Step 11: Verify that MA pill displays the correct count
        console.log('[Site Search Test] Step 11: Verifying MA pill displays correct count...');
        const maPill = page.locator('[data-test-id="incident-group-alert-pill-MA"]');
        await expect(maPill).toContainText(`${count} MA`);

        console.log('[Site Search Test] Test completed successfully: Search by site name');
    });

    test.afterEach(async ({ page }) => {
        console.log('[Site Search Test] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedTestSteps.selectCompany('Automation company');
            
            // Step 3: Clean manual alerts
            await sharedTestSteps.cleanupManualAlerts();
            
            // Step 4: Reset stack filters
            await sharedTestSteps.resetStackFilter();
            
            console.log('[Site Search Test] Cleanup completed successfully');
        } catch (error) {
            console.log(`[Site Search Test] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });
});
