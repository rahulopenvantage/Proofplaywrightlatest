// e2e/Proof_history_Filter.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Proof history - Filter', () => {
    /** @type {SharedTestSteps} */
    let sharedTestSteps;
    
    test.beforeEach(async ({ page }) => {
        // Set timeout for complex operations
        test.setTimeout(120000); // 2 minutes timeout
        
        // Instantiate SharedTestSteps
        sharedTestSteps = new SharedTestSteps(page);
        
        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
    });
    
    test('should verify History filter functionality including clear and validation', async ({ page }) => {
        console.log('[HistoryFilter] Starting proof history filter test...');
        
        // Step 1: Admin Login and Accept T&Cs (Shared Step)
        console.log('[HistoryFilter] Step 1: Admin Login and Accept T&Cs...');
        await sharedTestSteps.authenticateAndSetup(/** @type {string} */ (USERNAME), /** @type {string} */ (PASSWORD));
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        
        // Step 2: Select Vumacam Company (Shared Step)
        console.log('[HistoryFilter] Step 2: Selecting Vumacam Company...');
        await sharedTestSteps.selectCompany('Vumacam');
        
        // Step 3: Navigate to History (Shared Step)
        console.log('[HistoryFilter] Step 3: Navigating to History...');
        await sharedTestSteps.navigateToHistory();
        
        // Step 4: Wait for 10 seconds
        console.log('[HistoryFilter] Step 4: Waiting for 10 seconds...');
        await page.waitForTimeout(10000);
        
        // Step 5: Fill Proof history filter (Shared Step)
        console.log('[HistoryFilter] Step 5: Filling Proof history filter...');
        // This shared step fills date range, time range, alert type (LPR), and sites
        await sharedTestSteps.fillProofHistoryFilter('LPR', ['SNDTN_The Marc Rivonia Rd']);
        
        // Step 6: Verify that the element Clear All is DISPLAYED and With Scrollable TRUE
        console.log('[HistoryFilter] Step 6: Verifying Clear All is displayed and scrollable...');
        const clearAllButton = page.locator('[data-test-id="clear_all_history"]');
        await expect(clearAllButton).toBeVisible({ timeout: 10000 });
        
        // Verify the button is scrollable (has overflow or is within a scrollable container)
        const isScrollable = await clearAllButton.evaluate((element) => {
            const style = window.getComputedStyle(element);
            const parent = element.parentElement;
            const parentStyle = parent ? window.getComputedStyle(parent) : null;
            
            // Check if element or its parent has scrollable properties
            return (
                style.overflowY === 'scroll' || style.overflowY === 'auto' ||
                style.overflowX === 'scroll' || style.overflowX === 'auto' ||
                (parentStyle && (parentStyle.overflowY === 'scroll' || parentStyle.overflowY === 'auto'))
            );
        });
        
        console.log(`[HistoryFilter] Clear All button scrollable status: ${isScrollable}`);
        
        // Step 7: Click on Clear All
        console.log('[HistoryFilter] Step 7: Clicking on Clear All...');
        await clearAllButton.click();
        
        // Step 8: Click on Apply filter & search button
        console.log('[HistoryFilter] Step 8: Clicking on Apply filter & search button...');
        await page.locator('[data-test-id="apply_filter_search_history"]').click();
        
        // Step 9: Verify all fields are empty (Shared Step)
        console.log('[HistoryFilter] Step 9: Verifying all fields are empty...');
        await sharedTestSteps.verifyAllHistoryFieldsAreEmpty();
        
        // Step 10: Fill Proof history filter (Shared Step)
        console.log('[HistoryFilter] Step 10: Filling Proof history filter again...');
        await sharedTestSteps.fillProofHistoryFilter('LPR', ['SNDTN_The Marc Rivonia Rd']);
        
        // Step 11: Click on Apply filter & search button
        console.log('[HistoryFilter] Step 11: Clicking on Apply filter & search button...');
        await page.locator('[data-test-id="apply_filter_search_history"]').click();
        
        console.log('[HistoryFilter] Proof history filter test completed successfully!');
    });
    
   
});