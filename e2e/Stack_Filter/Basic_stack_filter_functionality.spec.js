import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Basic Stack Filter Functionality', () => {
    let sharedTestSteps;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000); // 2 minutes timeout
        
        sharedTestSteps = new SharedTestSteps(page);

        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
          
        // Steps 1-2: Login and select company
        console.log('[Stack Filter Test] Steps 1-2: Authenticating and selecting company.');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        await sharedTestSteps.selectCompany('Automation company');
        
    });

    test('should allow basic interaction with stack filter options', async ({ page }) => {
        console.log('[Stack Filter Test] Starting basic stack filter interaction test.');        // Step 3: Open the stack filter
        console.log('[Stack Filter Test] Step 3: Opening the stack filter.');
        const stackFilterButton = page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
        await stackFilterButton.click();

        // Step 4: Click on Device Types - Public
        console.log('[Stack Filter Test] Step 4: Selecting Device Types - Public.');
        await page.locator('label:has([data-test-id="device-public-checkbox"])').click();
        
        // Step 5: Click on Alert Types - LPR with improved robustness
        console.log('[Stack Filter Test] Step 5: Selecting Alert Types - LPR.');
        const lprCheckbox = page.locator('label:has([data-test-id="stack-filter-alert-type-LPR"])');
        await lprCheckbox.waitFor({ state: 'visible', timeout: 15000 });
        
        // Clear any potential overlays blocking the element
        await page.evaluate(() => {
            const overlays = document.querySelectorAll('[class*="modal"], [class*="overlay"], [class*="backdrop"]');
            overlays.forEach(overlay => {
                if (overlay.style) overlay.style.display = 'none';
            });
        });
        
        await lprCheckbox.scrollIntoViewIfNeeded();
        await lprCheckbox.click({ force: true });
        
        // Step 6: Click on LPR VOI Source - Private (now enabled after LPR selection)
        console.log('[Stack Filter Test] Step 6: Selecting LPR VOI Source - Private.');
        await page.locator('label:has([data-test-id="alert-level-private-checkbox"])').click();
        
        // Step 7: Click on Alert Types - Deselect All
        console.log('[Stack Filter Test] Step 7: Clicking Deselect All for Alert Types.');
        const alertTypesDeselectButton = page.locator('button:has-text("Deselect All")');
        await expect(alertTypesDeselectButton).toBeVisible({ timeout: 5000 });        await alertTypesDeselectButton.click();

        // Step 8: Click on Reset stack filter button
        console.log('[Stack Filter Test] Step 8: Resetting the stack filter.');
        await page.locator('[data-test-id="alert-filter-reset-button"]').click();

        // Step 9: Click on btn_stackFilter_Apply
        console.log('[Stack Filter Test] Step 9: Applying the filter changes.');
        await page.locator('[data-test-id="alert-filter-apply-button"]').click();
        
        // Step 10: Click on btn_stackFilter_close
        console.log('[Stack Filter Test] Step 10: Closing the stack filter modal.');
        await page.locator('[data-test-id="modalClose"]').click();

        // Step 11: Click on btn_dashboard_stackFilter (re-open)
        console.log('[Stack Filter Test] Step 11: Re-opening the stack filter.');
        await stackFilterButton.click();        // Step 12: Verify the suppression text is visible
        console.log('[Stack Filter Test] Step 12: Verifying the suppression text is visible.');
        const suppressionText = "Device and alert Suppressions applied will affect which alerts populate in the stack.";
        await expect(page.getByText(suppressionText)).toBeVisible({ timeout: 10000 });

        // Step 13: Click the Suppressions link
        console.log('[Stack Filter Test] Step 13: Clicking the Suppressions link.');
        const suppressionsLink = page.locator('a:has-text("Suppressions")');
        await suppressionsLink.click();
        // Optional: Verify navigation to the suppression management page
        await expect(page).toHaveURL(/.*suppression-management/, { timeout: 15000 });
        console.log('[Stack Filter Test] Successfully navigated to the suppression management page.');

        console.log('[Stack Filter Test] Workflow completed successfully.');
    });

    test.afterEach(async ({ page }) => {
        console.log('[Stack Filter Test] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedSteps.selectCompany('Automation company');
            
            // Step 3: Reset stack filter to clean state
            console.log('[Stack Filter Test] Resetting stack filter...');
            await sharedSteps.resetStackFilter();
            
            console.log('[Stack Filter Test] Cleanup completed successfully');
        } catch (error) {
            console.log(`[Stack Filter Test] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });
});
