// e2e/sites-page-additional-table-functionality.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Sites Page - Additional table functionality', () => {
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
    
    test('should verify sites page table functionality with pagination and search', async ({ page }) => {
        console.log('[Sites Page Test] Starting sites page additional table functionality test...');
        
        // Step 1: Admin Login and Accept T&Cs (using SharedTestSteps)
        console.log('[Sites Page Test] Step 1: Admin Login and Accept T&Cs.');
        await sharedTestSteps.authenticateAndSetup(/** @type {string} */ (USERNAME), /** @type {string} */ (PASSWORD));
        
        // Step 2: Select Automation Company (using SharedTestSteps)
        console.log('[Sites Page Test] Step 2: Select Automation Company.');
        await sharedTestSteps.selectCompany('Automation company');
        
        // Step 3: Navigate to Sites (using SharedTestSteps)
        console.log('[Sites Page Test] Step 3: Navigate to Sites.');
        await sharedTestSteps.navigateToMenu('Sites');
        
        // Step 4: Click on Next Page Btn
        console.log('[Sites Page Test] Step 4: Click on Next Page Btn.');
        await page.locator("[data-test-id='nextPageBtn']").click();
        
        // Step 5: Click on Previous Page Btn
        console.log('[Sites Page Test] Step 5: Click on Previous Page Btn.');
        await page.locator("[data-test-id='previousPageBtn']").click();
        
        // Step 6: Click on Last Page Btn
        console.log('[Sites Page Test] Step 6: Click on Last Page Btn.');
        await page.locator("[data-test-id='lastPageBtn']").click();
        
        // Step 7: Click on First Page Btn
        console.log('[Sites Page Test] Step 7: Click on First Page Btn.');
        await page.locator("[data-test-id='firstPageBtn']").click();
        
        // Step 8: Click on Row Dropdown
        console.log('[Sites Page Test] Step 8: Click on Row Dropdown.');
        await page.locator("[data-test-id='rowDropdown']").selectOption("20");
        
        // Step 9: Select Row Dropdown value=20 (completed in previous step)
        console.log('[Sites Page Test] Step 9: Row Dropdown value=20 selected.');
        
        // Step 10: Click on Edit Column Btn
        console.log('[Sites Page Test] Step 10: Click on Edit Column Btn.');
        await page.locator("[data-test-id='column-btn']").click();
        
        // Step 11: Click on checkbox_name_stationManagement
        console.log('[Sites Page Test] Step 11: Click on checkbox_name_stationManagement.');
        await page.locator("//span[text()='NAME']/preceding-sibling::div").click();
        
        // Step 12: Close the column selection modal by clicking the column button again
        console.log('[Sites Page Test] Step 12: Close the column selection modal by clicking the column button again.');
        
        // Click the column button again to close the modal
        await page.locator("[data-test-id='column-btn']").click();
        await page.waitForTimeout(1000);
        
        // Click on the "Sites" heading to ensure the modal is fully closed and not blocking other elements
        await page.locator('text=Sites').nth(1).click();
        await page.waitForTimeout(1000);
        
        // Step 13: Verify that the current page does not displays text BDFD_Boeing Rd East_43
        console.log('[Sites Page Test] Step 13: Verify that the current page does not displays text BDFD_Boeing Rd East_43.');
        await expect(page.getByText('BDFD_Boeing Rd East_43')).not.toBeVisible();
        
        // Step 14: Click on btn_sites_searchIcon
        console.log('[Sites Page Test] Step 14: Click on btn_sites_searchIcon.');
        await page.locator("[data-test-id='search-toggle']").click({ force: true });
        
        // Step 15: Click on Search Text Area
        console.log('[Sites Page Test] Step 15: Click on Search Text Area.');
        await page.locator("[data-test-id='search-input']").waitFor({ state: 'visible', timeout: 10000 });
        await page.locator("[data-test-id='search-input']").click();        // Step 16: Enter BDFD_Boeing Rd East_43 in the Search Text Area field
        console.log('[Sites Page Test] Step 16: Enter BDFD_Boeing Rd East_43 in the Search Text Area field.');
        await page.locator("[data-test-id='search-input']").fill("BDFD_Boeing Rd East_43");
        
        // Step 17: Wait for search results to load
        console.log('[Sites Page Test] Step 17: Wait for search results to load.');
        // Wait for the search to complete and results to update
        await page.waitForFunction(() => {
            const text = document.body.textContent || '';
            return text.includes('BDFD_Boeing Rd East_43') || text.includes('Showing page 1 of 1');
        }, { timeout: 15000 });

        // Step 18: Verify that the current page displays text Bedfordview
        console.log('[Sites Page Test] Step 18: Verify that the current page displays text Bedfordview.');
        await expect(page.getByText('Bedfordview')).toBeVisible({ timeout: 10000 });
        
        console.log('[Sites Page Test] Sites page additional table functionality test completed successfully.');
    });
    
   
});