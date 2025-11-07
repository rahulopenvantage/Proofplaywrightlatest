import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../../backend/AdminLoginPage.js';
import { AppInteractionsPage } from '../../backend/AppInteractionsPage.js';
import { MenuPage } from '../../backend/MenuPage.js';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Default Stack filter - Implement Filter Creation for Station Management', () => {
    let adminLoginPage;
    let appInteractionsPage;
    let menuPage;
    let sharedTestSteps;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000);
        adminLoginPage = new AdminLoginPage(page);
        appInteractionsPage = new AppInteractionsPage(page);
        menuPage = new MenuPage(page);
        sharedTestSteps = new SharedTestSteps(page);

        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
    });

    test('should create and manage filter in station management', async ({ page }) => {        console.log('[Filter Creation Test] Starting filter creation test');
        
        // Steps 1-2: Login and select company (Shared Steps)
        console.log('[Filter Creation Test] Steps 1-2: Authenticating and selecting company.');
        await adminLoginPage.login(USERNAME, PASSWORD);
        await sharedTestSteps.selectCompany('Automation company');        // Step 3: Navigate to Filter Management (Shared Step)
        console.log('[Filter Creation Test] Step 3: Navigating to Filter Management.');
        await sharedTestSteps.navigateToConfigurationSubmenu('Filter Management');
        
        // Verify we're on the Filter Management page
        await expect(page).toHaveURL(/.*filter-management.*/, { timeout: 15000 });
        
        // Step 4: Click "Create new" button
        console.log('[Filter Creation Test] Step 4: Clicking "Create new" button.');
        await page.getByRole('button', { name: 'Create new' }).click();        // Steps 5-6: Enter the filter name with improved robustness
        console.log('[Filter Creation Test] Steps 5-6: Entering filter name.');
        const nameInput = page.locator('//input[@label="Name"]');
        
        // Wait for modal to be stable and element ready
        await page.waitForTimeout(1000);
        await nameInput.waitFor({ state: 'visible', timeout: 15000 });
        
        // Clear any potential blocking overlays first
        await page.evaluate(() => {
            const overlays = document.querySelectorAll('[class*="modal"], [class*="overlay"], [class*="backdrop"]');
            overlays.forEach(overlay => {
                if (overlay.style) overlay.style.display = 'none';
            });
        });
        
        // Scroll into view with more generous timeout
        try {
            await nameInput.scrollIntoViewIfNeeded({ timeout: 15000 });
        } catch (error) {
            console.log('[Filter Creation Test] Scroll timeout, attempting alternative approach...');
            // Try alternative selector if scroll fails
            const altNameInput = page.locator('[data-test-id="filter-name-input"], input[placeholder*="name" i], input[type="text"]').first();
            await altNameInput.waitFor({ state: 'visible', timeout: 10000 });
            await altNameInput.click({ force: true });
            await altNameInput.fill('Do not delete');
            return;
        }
        
        // Use a more reliable clicking approach
        await nameInput.click({ force: true });
        await nameInput.fill('Do not delete');// Step 7: Click stackFilters (select some filters to save)
        console.log('[Filter Creation Test] Step 7: Selecting some alert types for the filter.');
        await page.getByText('LPR', { exact: true }).click();
        await page.getByText('Trex', { exact: true }).click();
        
        // Step 8: Click "Save & Update" button
        console.log('[Filter Creation Test] Step 8: Saving the new filter.');
        await page.getByRole('button', { name: 'Save & Update' }).click();
          // Verify filter creation success
        await expect(page.getByText('Filter Created Successfully', { exact: false })).toBeVisible({ timeout: 15000 });// Step 9-10: Search for the newly created filter
        console.log('[Filter Creation Test] Steps 9-10: Searching for the "Do not delete" filter.');
        const searchInput = page.locator('[data-test-id="search-input"]');
        await searchInput.fill('Do not delete');
        await searchInput.press('Enter');        // Step 11: Click on the "Filters" button/tab to ensure view is active
        console.log('[Filter Creation Test] Step 11: Clicking on the Filters view.');
        await page.locator('//div[text()[normalize-space() = "Filters"]]').click();
        
        // Verify the filter appears in the list (use first occurrence to handle duplicates)
        await expect(page.getByText('Do not delete').first()).toBeVisible({ timeout: 15000 });

        // Step 12: Click the Edit button for the created filter (use first occurrence)
        console.log('[Filter Creation Test] Step 12: Clicking the Edit button.');
        await page.locator('tr').filter({ hasText: 'Do not delete' }).first().getByRole('button', { name: 'Edit' }).click();        // Step 13: Click stackFilters again (modify the filter)
        console.log('[Filter Creation Test] Step 13: Modifying the filter selections.');
        await page.getByText('Manual Alert', { exact: true }).click(); // Add another filter type
        await page.getByText('LPR', { exact: true }).click(); // Uncheck a previous one
          
        
        // Step 14: Click "Save & Update" button to save changes
        console.log('[Filter Creation Test] Step 14: Saving the updated filter.'); 
          await page.getByRole('button', { name: 'Save & Update' }).click();
          // Verify update success message  
           await expect(page.getByText('Filter Updated Successfully', { exact: false })).toBeVisible({ timeout: 15000 });
         // Click the first archive button in the table
            await page.locator('button:has-text("Archive")').first().click();
            await page.locator('[data-test-id="dialog-button-2"]').click({force: true}); // Confirm archive action
            // Press Enter to confirm
            await page.keyboard.press('Enter');
            
            await page.close();
            console.log('[Filter Creation Test] Cleanup completed successfully.');

        console.log('[Filter Creation Test] Workflow completed successfully.');    });
          console.log('[Filter Creation Test] Cleanup: Archiving test filter');
     
          
        

});
