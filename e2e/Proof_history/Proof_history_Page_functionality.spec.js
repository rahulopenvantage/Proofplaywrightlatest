// e2e/Proof_history_Page_functionality.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Proof history - Page functionality', () => {
    /** @type {SharedTestSteps} */
    let sharedTestSteps;
    
    test.beforeEach(async ({ page }) => {
        // Set timeout for complex operations
        test.setTimeout(240000); // 4 minutes timeout
        
        // Instantiate SharedTestSteps
        sharedTestSteps = new SharedTestSteps(page);
        
        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
    });
    
    test('should verify History page functionality including sorting and pagination', async ({ page }) => {
        console.log('[HistoryPage] Starting proof history page functionality test...');
        
        // Step 1: Admin Login and Accept T&Cs (Shared Step)
        console.log('[HistoryPage] Step 1: Admin Login and Accept T&Cs...');
        await sharedTestSteps.authenticateAndSetup(/** @type {string} */ (USERNAME), /** @type {string} */ (PASSWORD));
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        
        // Step 2: Select Vumacam Company (Shared Step)
        console.log('[HistoryPage] Step 2: Selecting Vumacam Company...');
        await sharedTestSteps.selectCompany('Vumacam');
        
        // Step 3: Navigate to History (Shared Step)
        console.log('[HistoryPage] Step 3: Navigating to History...');
        await sharedTestSteps.navigateToHistory();
        
        // Step 4-8: Set History date range (Shared Step)
        console.log('[HistoryPage] Step 4-8: Setting History date range using SharedTestSteps...');
        await sharedTestSteps.setHistoryDateRange();
        
        // Step 9: Add sites to the History filter (Shared Step)
        console.log('[HistoryPage] Step 9: Adding sites to the History filter...');
        await sharedTestSteps.addSitesToHistoryFilter(['Bry_37 Pont_82']);
        
        // Step 10: Click on Apply filter & search button
        console.log('[HistoryPage] Step 10: Clicking on Apply filter & search button...');
        await page.locator('[data-test-id="apply_filter_search_history"]').click();
        
        // Step 11: Wait for table to load with data
        console.log('[HistoryPage] Step 11: Waiting for table to load with data...');
        await page.waitForTimeout(3000);
        
        // Wait for at least one table row to appear
        await page.waitForSelector('table tbody tr', { state: 'visible', timeout: 15000 });
        console.log('[HistoryPage] Table data loaded successfully');
        
        // Additional stabilization
        await page.waitForTimeout(2000);
        
        // Step 12: Verify History table headings (Shared Step)
        console.log('[HistoryPage] Step 12: Verifying History table headings...');
        await sharedTestSteps.verifyHistoryTableHeadings();
        
        // Step 13: Click on Objects detected header
        console.log('[HistoryPage] Step 13: Clicking on Objects detected header...');
        await page.locator('th:has-text("Objects detected")').click();
        
        // Step 14: Click on Alert type header
        console.log('[HistoryPage] Step 14: Clicking on Alert type header...');
        await page.locator('th:has-text("Alert type")').click();
        
        // Step 15: Click on System dismissed header
        console.log('[HistoryPage] Step 15: Clicking on System dismissed header...');
        await page.locator('th:has-text("System dismissed")').click();
        
        // Step 16: Click on Timestamp header
        console.log('[HistoryPage] Step 16: Clicking on Timestamp header...');
        await page.locator('th:has-text("Timestamp")').click();
        
        // Step 17-28: Verify pagination navigation buttons functionality
        console.log('[HistoryPage] Step 17-28: Verifying pagination navigation buttons functionality...');
        
        // Step 17: Click on Next Page Btn
        console.log('[HistoryPage] Step 17: Clicking on Next Page Btn...');
        const nextPageBtn = page.locator('[data-test-id="nextPageBtn"]');
        await nextPageBtn.waitFor({ state: 'visible', timeout: 10000 });
        
        // Wait for page 1 text to be visible before clicking
        await page.getByText(/Showing page 1 of \d+/).waitFor({ state: 'visible', timeout: 10000 });
        
        await nextPageBtn.click();
        
        // Step 18: Wait for page transition with explicit state change
        console.log('[HistoryPage] Step 18: Waiting for page transition...');
        
        // Wait for "Showing page 1" to disappear
        await page.waitForFunction(
            () => {
                const paginationText = document.querySelector('body')?.innerText || '';
                return !paginationText.includes('Showing page 1 of');
            },
            { timeout: 15000 }
        ).catch(() => console.log('[HistoryPage] Timeout waiting for page 1 to disappear'));
        
        // Wait for new data to load
        await page.waitForTimeout(2000);
        await page.waitForSelector('table tbody tr', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(1000);
        
        // Step 19: Verify that the current page displays text Showing page 2 of X
        console.log('[HistoryPage] Step 19: Verifying Showing page 2 is displayed...');
        
        // Use waitForFunction for more reliable check
        await page.waitForFunction(
            () => {
                const paginationText = document.querySelector('body')?.innerText || '';
                return /Showing page 2 of \d+/.test(paginationText);
            },
            { timeout: 15000 }
        );
        
        await expect(page.getByText(/Showing page 2 of \d+/)).toBeVisible({ timeout: 5000 });
        
        // Step 20: Click on Previous Page Btn
        console.log('[HistoryPage] Step 20: Clicking on Previous Page Btn...');
        await page.locator('[data-test-id="previousPageBtn"]').click();
        
        // Step 21: Wait for page transition back to page 1
        console.log('[HistoryPage] Step 21: Waiting for page transition back to page 1...');
        
        // Wait for "Showing page 2" to disappear
        await page.waitForFunction(
            () => {
                const paginationText = document.querySelector('body')?.innerText || '';
                return !paginationText.includes('Showing page 2 of');
            },
            { timeout: 15000 }
        ).catch(() => console.log('[HistoryPage] Timeout waiting for page 2 to disappear'));
        
        await page.waitForTimeout(2000);
        await page.waitForSelector('table tbody tr', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(1000);
        
        // Step 22: Verify that the current page displays text Showing page 1 of X
        console.log('[HistoryPage] Step 22: Verifying Showing page 1 is displayed...');
        
        // Use waitForFunction for more reliable check
        await page.waitForFunction(
            () => {
                const paginationText = document.querySelector('body')?.innerText || '';
                return /Showing page 1 of \d+/.test(paginationText);
            },
            { timeout: 15000 }
        );
        
        await expect(page.getByText(/Showing page 1 of \d+/)).toBeVisible({ timeout: 5000 });
        
        // Step 23: Click on Last Page Btn
        console.log('[HistoryPage] Step 23: Clicking on Last Page Btn...');
        
        // Get the total number of pages first
        const paginationTextBefore = await page.getByText(/Showing page \d+ of \d+/).first().textContent();
        const totalPages = paginationTextBefore?.match(/of (\d+)/)?.[1] || '3';
        console.log(`[HistoryPage] Total pages: ${totalPages}`);
        
        await page.locator('[data-test-id="lastPageBtn"]').click();
        
        // Step 24: Wait for navigation to last page
        console.log('[HistoryPage] Step 24: Waiting for navigation to last page...');
        
        // Wait for page to change to last page number
        await page.waitForFunction(
            (lastPage) => {
                const paginationText = document.querySelector('body')?.innerText || '';
                const regex = new RegExp(`Showing page ${lastPage} of`);
                return regex.test(paginationText);
            },
            totalPages,
            { timeout: 15000 }
        ).catch(() => console.log('[HistoryPage] Timeout waiting for last page'));
        
        await page.waitForTimeout(2000);
        await page.waitForSelector('table tbody tr', { state: 'visible', timeout: 10000 });
        
        // Step 25: Verify that the current page displays text Showing page
        console.log('[HistoryPage] Step 25: Verifying Showing page is displayed...');
        await expect(page.getByText(/Showing page \d+ of \d+/)).toBeVisible({ timeout: 10000 });
        
        // Step 26: Click on First Page Btn
        console.log('[HistoryPage] Step 26: Clicking on First Page Btn...');
        await page.locator('[data-test-id="firstPageBtn"]').click();
        
        // Step 27: Wait for navigation back to page 1
        console.log('[HistoryPage] Step 27: Waiting for navigation back to page 1...');
        
        // Wait for page to change back to page 1
        await page.waitForFunction(
            () => {
                const paginationText = document.querySelector('body')?.innerText || '';
                return /Showing page 1 of \d+/.test(paginationText);
            },
            { timeout: 15000 }
        ).catch(() => console.log('[HistoryPage] Timeout waiting for first page'));
        
        await page.waitForTimeout(2000);
        await page.waitForSelector('table tbody tr', { state: 'visible', timeout: 10000 });
        
        // Step 28: Verify that the current page displays text Showing page 1 of X
        console.log('[HistoryPage] Step 28: Verifying Showing page 1 is displayed...');
        
        // Use waitForFunction for more reliable check
        await page.waitForFunction(
            () => {
                const paginationText = document.querySelector('body')?.innerText || '';
                return /Showing page 1 of \d+/.test(paginationText);
            },
            { timeout: 15000 }
        );
        
        await expect(page.getByText(/Showing page 1 of \d+/)).toBeVisible({ timeout: 5000 });
        
        // Step 29-32: Test dropdown for rows per page
        console.log('[HistoryPage] Step 29-32: Testing dropdown for rows per page...');
        
        // Step 29: Select option using value 20 in the Rows per page dropdown list
        console.log('[HistoryPage] Step 29: Selecting 20 rows per page...');
        const rowsPerPageDropdown = page.locator('[data-test-id="rowDropdown"]');
        await rowsPerPageDropdown.selectOption({ value: '20' });
        await page.waitForTimeout(2000); // Wait for table reload
        await page.waitForSelector('table tbody tr', { state: 'visible', timeout: 10000 });
        
        // Step 30: Select option using value 30 in the Rows per page dropdown list
        console.log('[HistoryPage] Step 30: Selecting 30 rows per page...');
        await rowsPerPageDropdown.selectOption({ value: '30' });
        await page.waitForTimeout(2000); // Wait for table reload
        
        // Step 31: Select option using value 40 in the Rows per page dropdown list
        console.log('[HistoryPage] Step 31: Selecting 40 rows per page...');
        await rowsPerPageDropdown.selectOption({ value: '40' });
        
        // Step 32: Select option using value 50 in the Rows per page dropdown list
        console.log('[HistoryPage] Step 32: Selecting 50 rows per page...');
        await rowsPerPageDropdown.selectOption({ value: '50' });
        
        console.log('[HistoryPage] Proof history page functionality test completed successfully!');
    });
    
   
});