import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
import { ApiHelper } from '../../backend/ApiHelper.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Device types filter functionality', () => {
    let sharedTestSteps;
    let apiHelper;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000);
        
        sharedTestSteps = new SharedTestSteps(page);
        apiHelper = new ApiHelper();

        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Validate API configuration
        if (!apiHelper.validateApiConfig()) {
            throw new Error('API configuration is invalid. Check environment variables.');
        }
        
        // Send Unusual Behaviour alerts to create test data
        console.log('[Device Filter Test] Sending Unusual Behaviour alerts for test data...');
        const ubResult = await apiHelper.sendAlert('unusual_behaviour');
        expect(ubResult.status).toBe(200);
        
        // Allow time for alerts to be processed
        await page.waitForTimeout(3000);
        
        // Authentication and company selection
        console.log('[Device Filter Test] Authentication and company selection...');
        await page.goto('https://uat.proof360.io/');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        await sharedTestSteps.selectCompany('Automation company');
    });    test('should filter by device types and verify results', async ({ page }) => {
        console.log('[Device Filter Test] Starting device types filter test');
        
        // Steps 1-3: Login and select company (Shared Steps) completed in beforeEach
        const siteToSearch = 'WVRD_9th Ave and JG Strydom Rd_62';
        
        // --- Start of Test: Filter to Private and expect no results ---

        // Step 4: Open the stack filter
        console.log('[Device Filter Test] Step 4: Opening the stack filter.');
        const stackFilterButton = page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
        await stackFilterButton.click();

        // Step 5: Click on "Device Types - Private" using validated locator
        console.log('[Device Filter Test] Step 5: Selecting "Private" device type.');
        await page.locator('label:has([data-test-id="device-private-checkbox"])').click();
        
        // Step 6: Enter site name in the search field
        console.log(`[Device Filter Test] Step 6: Searching for site: "${siteToSearch}".`);
        const searchInput = page.locator('input[placeholder*="Search by site name"]');
        await searchInput.fill(siteToSearch);
        
        // Step 7: Apply filter
        console.log('[Device Filter Test] Step 7: Applying filter.');
        await page.locator('[data-test-id="alert-filter-apply-button"]').click();

        // Step 8: Close filter
        console.log('[Device Filter Test] Step 8: Closing filter.');
        await page.locator('[data-test-id="modalClose"]').click();

        // Step 9: Verify that the "no results" element is displayed
        console.log('[Device Filter Test] Step 9: Verifying "No Results Found" is displayed.');
        const noResults = page.locator('//b[text()="No Results Found"]');
        await expect(noResults).toBeVisible({ timeout: 15000 });
        
        // --- Second Part: Switch filter to Public and verify results ---

        // Step 10: Re-open filter
        console.log('[Device Filter Test] Step 10: Re-opening filter.');
        await stackFilterButton.click();

        // Step 11: Switch from Private to Public
        console.log('[Device Filter Test] Step 11: Deselecting Private device type.');
        await page.locator('label:has([data-test-id="device-private-checkbox"])').click(); // Deselect

        // Step 12: Select Public
        console.log('[Device Filter Test] Step 12: Selecting Public device type.');
        await page.locator('label:has([data-test-id="device-public-checkbox"])').click();  // Select

        // Step 13: Apply filter
        console.log('[Device Filter Test] Step 13: Applying filter.');
        await page.locator('[data-test-id="alert-filter-apply-button"]').click();

        // Step 14: Close filter
        console.log('[Device Filter Test] Step 14: Closing filter.');
        await page.locator('[data-test-id="modalClose"]').click();        // Step 15: Verify that the aggregated card is now displayed
        console.log('[Device Filter Test] Step 15: Verifying the aggregated alert card is now visible.');
        
        // Wait for filter application to complete and page to stabilize
        await page.waitForTimeout(3000);
        
        // Wait for any loading states to complete
        await page.waitForFunction(() => {
            const cards = document.querySelectorAll('[data-test-id="aggregated-site-card"]');
            return cards.length > 0;
        }, { timeout: 20000 });
        
        // More robust locator that matches the site name pattern
        const aggregateCard = page.locator('[data-test-id="aggregated-site-card"]').filter({ hasText: 'WVRD_9th Ave' }).first();
        
        // Wait for the specific card to be present and visible
        await aggregateCard.waitFor({ state: 'visible', timeout: 20000 });
        await expect(aggregateCard).toBeVisible({ timeout: 5000 });

        // --- Third Part: Filter back to Private only and verify card is still there ---

        // Step 16: Re-open filter
        console.log('[Device Filter Test] Step 16: Re-opening filter.');
        await stackFilterButton.click();

        // Step 17: Select Private
        console.log('[Device Filter Test] Step 17: Selecting Private device type.');
        await page.locator('label:has([data-test-id="device-private-checkbox"])').click();

        // Step 18: Apply filter
        console.log('[Device Filter Test] Step 18: Applying filter.');
        await page.locator('[data-test-id="alert-filter-apply-button"]').click();

        // Step 19: Close filter
        console.log('[Device Filter Test] Step 19: Closing filter.');
        await page.locator('[data-test-id="modalClose"]').click();

        // Step 20: Verify that the aggregated card is still displayed
        console.log('[Device Filter Test] Step 20: Verifying the aggregated alert card is still visible.');
        await expect(aggregateCard).toBeVisible({ timeout: 15000 });

        console.log('[Device Filter Test] Workflow completed successfully.');
    });
    test.afterEach(async ({ page }) => {
        console.log('[Device Filter Test] Starting UB cleanup...');
        const siteToSearch = 'WVRD_9th Ave and JG Strydom Rd_62';
        
        try {
            await sharedTestSteps.cleanupUBAndTrexAlerts(siteToSearch);
            console.log('[Device Filter Test] UB cleanup completed successfully');
        } catch (error) {
            console.log(`[Device Filter Test] UB cleanup failed: ${error.message}`);
            // Don't fail the test if cleanup fails
        }
    });
});
