import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('LPR VOI Source filter functionality', () => {
    let sharedTestSteps;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000);
        
        sharedTestSteps = new SharedTestSteps(page);

        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Authentication and company selection
        console.log('[LPR VOI Source Test] Authentication and company selection...');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        await sharedTestSteps.selectCompany('Automation company');
    });

    test('should filter by LPR VOI Source and verify results', async ({ page }) => {
        console.log('[LPR VOI Source Test] Starting LPR VOI Source filter test');
        
        // Steps 1-3: Login and select company (completed in beforeEach)
        const stackFilterButton = page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
        
        // Step 4: Open the stack filter
        console.log('[LPR VOI Source Test] Step 4: Opening the stack filter.');
        await stackFilterButton.click();
        
        // Step 5: Verify VOI - Disable/Enable - Public checkbox is unchecked
        console.log('[LPR VOI Source Test] Step 5: Verifying VOI Public checkbox is unchecked.');
        const voiPublicCheckbox = page.locator('[data-test-id="alert-level-public-checkbox"]');
        await expect(voiPublicCheckbox).not.toBeChecked();
        
        // Step 6: Verify VOI - Disable/Enable - Private checkbox is unchecked  
        console.log('[LPR VOI Source Test] Step 6: Verifying VOI Private checkbox is unchecked.');
        const voiPrivateCheckbox = page.locator('[data-test-id="alert-level-private-checkbox"]');
        await expect(voiPrivateCheckbox).not.toBeChecked();
          // Step 7: Click on Alert Types - LPR
        console.log('[LPR VOI Source Test] Step 7: Selecting Alert Types - LPR.');
        await page.locator('label:has-text("LPR")').click();
        
        // Step 8: Verify VOI - Disable/Enable - Public checkbox is now enabled
        console.log('[LPR VOI Source Test] Step 8: Verifying VOI Public checkbox is now enabled.');
        await expect(voiPublicCheckbox).toBeEnabled();
        
        // Step 9: Verify VOI - Disable/Enable - Private checkbox is now enabled
        console.log('[LPR VOI Source Test] Step 9: Verifying VOI Private checkbox is now enabled.');
        await expect(voiPrivateCheckbox).toBeEnabled();
        
        // Step 10: Click on LPR VOI Source - Private
        console.log('[LPR VOI Source Test] Step 10: Selecting LPR VOI Source - Private.');
        await page.locator('(//span[text()="Private"])[2]').click();
        
        // Step 11: Apply filter
        console.log('[LPR VOI Source Test] Step 11: Applying filter.');
        await page.locator('[data-test-id="alert-filter-apply-button"]').click();
        
        // Step 12: Close filter
        console.log('[LPR VOI Source Test] Step 12: Closing filter.');
        await page.locator('[data-test-id="modalClose"]').click();
        
        // Step 13: Check if aggregated card appears (conditional logic)
        console.log('[LPR VOI Source Test] Step 13: Checking for aggregated cards.');
        const aggregatedCard = page.locator('[data-test-id="aggregated-site-card"]').first();
        
        try {
            await aggregatedCard.waitFor({ state: 'visible', timeout: 10000 });
            console.log('[LPR VOI Source Test] Aggregated card found and visible.');
            
            // Step 13.1: Expand/Collapse aggregated button (if card is visible)
            console.log('[LPR VOI Source Test] Step 13.1: Clicking expand/collapse button.');
            const expandButton = page.locator('[data-test-id="site-alert-card-expand-button"]').first();
            await expandButton.click();
            
            // Step 13.2: Store Private in LPR_Type
            console.log('[LPR VOI Source Test] Step 13.2: Storing LPR Type as Private.');
            const lprType = 'Private';
            
            // Step 13.3: Verify VOI Level Alert Pill is displayed
            console.log('[LPR VOI Source Test] Step 13.3: Verifying VOI Level Alert Pill.');
            const voiAlertPill = page.locator('[data-test-id*="alert-pill"]').first();
            await expect(voiAlertPill).toBeVisible({ timeout: 10000 });
            
        } catch (error) {
            console.log('[LPR VOI Source Test] No aggregated card found - checking for "No Results Found".');
            const noResults = page.locator('//b[text()="No Results Found"]');
            await expect(noResults).toBeVisible({ timeout: 15000 });
        }
        
        // Step 14: Re-open filter
        console.log('[LPR VOI Source Test] Step 14: Re-opening filter.');
        await stackFilterButton.click();        // Step 15: Click on "Deselect All btn" - appears only after alert type is selected
        console.log('[LPR VOI Source Test] Step 15: Clicking Deselect All button.');
        await page.locator(':text("Deselect All")').click();
          // Step 16: Click on Alert Types - LPR (re-select after deselect all)
        console.log('[LPR VOI Source Test] Step 16: Re-selecting Alert Types - LPR.');
        await page.locator('label:has-text("LPR")').click();
        
        // Step 17: Click on LPR VOI Source - Public
        console.log('[LPR VOI Source Test] Step 17: Selecting LPR VOI Source - Public.');
        await page.locator('(//span[text()="Public"])[2]').click();
        
        // Step 18: Apply filter
        console.log('[LPR VOI Source Test] Step 18: Applying Public filter.');
        await page.locator('[data-test-id="alert-filter-apply-button"]').click();
        
        // Step 19: Close filter
        console.log('[LPR VOI Source Test] Step 19: Closing filter.');
        await page.locator('[data-test-id="modalClose"]').click();
        
        // Step 20-25: Verify results for Public filter
        console.log('[LPR VOI Source Test] Step 20-25: Verifying Public filter results.');
        try {
            await aggregatedCard.waitFor({ state: 'visible', timeout: 10000 });
            console.log('[LPR VOI Source Test] Aggregated card found for Public filter.');
            
            // If card is visible, expand and verify
            const expandButton = page.locator('[data-test-id="site-alert-card-expand-button"]').first();
            await expandButton.click();
            
            // Store Public in LPR_Type
            const lprTypePublic = 'Public';
            console.log(`[LPR VOI Source Test] Storing LPR Type as: ${lprTypePublic}`);
            
            // Verify VOI Level Alert Pill
            const voiAlertPill = page.locator('[data-test-id*="alert-pill"]').first();
            await expect(voiAlertPill).toBeVisible({ timeout: 10000 });
            
        } catch (error) {
            console.log('[LPR VOI Source Test] No aggregated card found for Public filter.');
            const noResults = page.locator('//b[text()="No Results Found"]');
            await expect(noResults).toBeVisible({ timeout: 15000 });
        }
        
        console.log('[LPR VOI Source Test] LPR VOI Source filter test completed successfully.');
    });

    test.afterEach(async ({ page }) => {
        console.log('[LPR VOI Source Test] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedTestSteps.selectCompany('Automation company');
            
            // Step 3: Reset stack filter to clean state
            console.log('[LPR VOI Source Test] Resetting stack filter...');
            await sharedTestSteps.resetStackFilter();
            
            console.log('[LPR VOI Source Test] Cleanup completed successfully');
        } catch (error) {
            console.log(`[LPR VOI Source Test] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });
});
