// e2e/Proof_history_Public_and_Private_sites.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Proof history - Public and Private sites', () => {
    /** @type {SharedTestSteps} */
    let sharedTestSteps;
    
    test.beforeEach(async ({ page }) => {
        // Set timeout for complex operations
        test.setTimeout(240000); // 4 minutes timeout (same as successful functionality test)
        
        // Instantiate SharedTestSteps
        sharedTestSteps = new SharedTestSteps(page);
        
        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Setup test isolation
        await sharedTestSteps.setupTestIsolation();
    });
    
    test.afterEach(async ({ page }) => {
        // Cleanup test isolation
        await sharedTestSteps.cleanupTestIsolation();
    });
    
    test('should verify public and private device filtering in History', async ({ page }) => {
        console.log('[ProofHistory] Starting proof history public and private sites test...');
        
        // Step 1: Admin Login and Accept T&Cs (Shared Step)
        console.log('[ProofHistory] Step 1: Admin Login and Accept T&Cs...');
        await sharedTestSteps.authenticateAndSetup(/** @type {string} */ (USERNAME), /** @type {string} */ (PASSWORD));
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        
        // Step 2: Select Vumacam Company (Shared Step)
        console.log('[ProofHistory] Step 2: Selecting Vumacam Company...');
        await sharedTestSteps.selectCompany('Vumacam');
        
        // Step 3: Navigate to History (Shared Step)
        console.log('[ProofHistory] Step 3: Navigating to History...');
        await sharedTestSteps.navigateToHistory();
        
        // Step 4: Set date range using SharedTestSteps
        console.log('[ProofHistory] Step 4: Setting date range using SharedTestSteps...');
        await sharedTestSteps.setHistoryDateRange();
        
        // Step 5: Add sites to the History filter (Shared Step)
        console.log('[ProofHistory] Step 5: Adding sites to the History filter...');
        await sharedTestSteps.addSitesToHistoryFilter(['Bry_37 Pont_82', 'SNDTN_The Marc']);
        
        // Step 6: Click on Public devices radio button
        console.log('[ProofHistory] Step 6: Clicking on Public devices radio button...');
        await page.locator('[data-test-id="public_devices_radio_button"]').click();
        
        // Step 7: Wait for 3 seconds
        console.log('[ProofHistory] Step 7: Waiting for 3 seconds...');
        await page.waitForTimeout(3000);
        
        // Step 8: Click on Apply filter & search button
        console.log('[ProofHistory] Step 8: Clicking on Apply filter & search button...');
        await page.locator('[data-test-id="apply_filter_search_history"]').click();
        
        // Step 9: Wait for 5 seconds
        console.log('[ProofHistory] Step 9: Waiting for 5 seconds...');
        await page.waitForTimeout(5000);
        
        // Step 10: Verify that the current page displays text Bry_37 Pont_82.2_O
        console.log('[ProofHistory] Step 10: Verifying Bry_37 Pont_82.2_O is displayed...');
        await expect(page.getByText('Bry_37 Pont_82.2_O').first()).toBeVisible({ timeout: 15000 });
        
        // Step 11: Verify that the current page does not display text SNDTN_The Marc
        console.log('[ProofHistory] Step 11: Verifying SNDTN_The Marc is not displayed...');
        await expect(page.getByText('SNDTN_The Marc').first()).not.toBeVisible();
        
        // Step 12: Click on Update filters button (from results table back to filter panel)
        console.log('[ProofHistory] Step 12: Clicking on Update filters button...');
        await page.locator('a:has-text("Update filters")').click();
        
        // Step 13: Click on Private devices radio button
        console.log('[ProofHistory] Step 13: Clicking on Private devices radio button...');
        await page.locator('[data-test-id="private_devices_radio_button"]').click();
        
        // Step 14: Wait for 3 seconds
        console.log('[ProofHistory] Step 14: Waiting for 3 seconds...');
        await page.waitForTimeout(3000);
        
        // Step 15: Click on Apply filter & search button
        console.log('[ProofHistory] Step 15: Clicking on Apply filter & search button...');
        await page.locator('[data-test-id="apply_filter_search_history"]').click();
        
        // Step 16: Wait for 5 seconds
        console.log('[ProofHistory] Step 16: Waiting for 5 seconds...');
        await page.waitForTimeout(5000);
        
        // Step 17: Verify that the current page displays text SNDTN_The Marc
        console.log('[ProofHistory] Step 17: Verifying SNDTN_The Marc is displayed...');
        await expect(page.getByText('SNDTN_The Marc').first()).toBeVisible({ timeout: 15000 });
        
        // Step 18: Verify that the current page does not display text Bry_37 Pont_82.2_O
        console.log('[ProofHistory] Step 18: Verifying Bry_37 Pont_82.2_O is not displayed...');
        await expect(page.getByText('Bry_37 Pont_82.2_O').first()).not.toBeVisible();
        
        // Step 19: Click on Apply filters (using filter icon)
        console.log('[ProofHistory] Step 19: Clicking on Apply filters...');
         await page.locator('a:has-text("Update filters")').click(); // Click on the filter icon to open filters
        
        // Step 20: Click on All devices radio button
        console.log('[ProofHistory] Step 20: Clicking on All devices radio button...');
        await page.locator('[data-test-id="all_devices_radio_button"]').click();
        
        // Step 21: Wait for 3 seconds
        console.log('[ProofHistory] Step 21: Waiting for 3 seconds...');
        await page.waitForTimeout(3000);
        
        // Step 22: Click on Apply filter & search button
        console.log('[ProofHistory] Step 22: Clicking on Apply filter & search button...');
        await page.locator('[data-test-id="apply_filter_search_history"]').click();
        
        // Step 23: Wait for 5 seconds
        console.log('[ProofHistory] Step 23: Waiting for 5 seconds...');
        await page.waitForTimeout(5000);
        
        // Step 24: Click on Device name header to sort
        console.log('[ProofHistory] Step 24: Clicking on Device name header to sort...');
        await page.locator('th:has-text("Device name")').click();
        
        // Step 25: Verify that the current page displays text SNDTN_The Marc
        console.log('[ProofHistory] Step 25: Verifying SNDTN_The Marc is displayed...');
        await expect(page.getByText('SNDTN_The Marc').first()).toBeVisible({ timeout: 15000 });
        
        // Step 26: Click on Device name header to sort again
        console.log('[ProofHistory] Step 26: Clicking on Device name header to sort again...');
        await page.locator('th:has-text("Device name")').click();
        
        // Step 27: Verify that the current page displays text Bry_37 Pont_82.1_O
        console.log('[ProofHistory] Step 27: Verifying Bry_37 Pont_82.1_O is displayed...');
        await expect(page.getByText('Bry_37 Pont_82.1_O').first()).toBeVisible({ timeout: 15000 });
        
        console.log('[ProofHistory] Proof history public and private sites test completed successfully!');
    });
   
});