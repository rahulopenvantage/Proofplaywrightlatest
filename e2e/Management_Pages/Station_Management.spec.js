// e2e/station-management-additional-table-functionality.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Station Management - Additional table functionality', () => {
    /** @type {SharedTestSteps} */
    let sharedTestSteps;
    
    test.beforeEach(async ({ page }) => {
        // Set timeout for complex operations
        test.setTimeout(300000); // 5 minutes timeout for robustness
        
        // Instantiate helpers
        sharedTestSteps = new SharedTestSteps(page);
        
        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
    });
    
    test('should verify station management table functionality with pagination, search and column management', async ({ page }) => {
        console.log('[Station Management Test] Starting station management additional table functionality test...');
        
        // Step 1: Admin Login and Accept T&Cs (using SharedTestSteps)
        console.log('[Station Management Test] Step 1: Admin Login and Accept T&Cs.');
        await sharedTestSteps.authenticateAndSetup(/** @type {string} */ (USERNAME), /** @type {string} */ (PASSWORD));
        
        // Step 2: Select Automation Company (using SharedTestSteps)
        console.log('[Station Management Test] Step 2: Select Automation Company.');
        await sharedTestSteps.selectCompany('Automation company');
        
        // Step 3: Navigate to Station Management (using SharedTestSteps)
        console.log('[Station Management Test] Step 3: Navigate to Station Management.');
        await sharedTestSteps.navigateToConfigurationSubmenu('Station Management');
        
        // Step 4: Check if pagination is available, if not skip pagination tests
        console.log('[Station Management Test] Step 4: Check pagination availability.');
        const nextPageBtn = page.locator("[data-test-id='nextPageBtn']");
        const isNextPageEnabled = await nextPageBtn.isEnabled();
        
        if (!isNextPageEnabled) {
            console.log('[Station Management Test] Pagination not needed - only one page of results. Skipping pagination tests.');
            // Jump directly to column management since pagination is not available
            
            // Step 12: Click on Edit Column Btn
            console.log('[Station Management Test] Step 12: Click on Edit Column Btn.');
            await page.locator("[data-test-id='column-btn']").click();
            
            // Step 13: Click on Station name checkbox  
            console.log('[Station Management Test] Step 13: Click on Station name checkbox.');
            await page.locator('input#name').click();
            
            // Step 14: Click on Edit Column Btn
            console.log('[Station Management Test] Step 14: Click on Edit Column Btn.');
            await page.locator("[data-test-id='column-btn']").click();
            
            // Step 15: Verify that columns can be hidden (verify a station name is not visible)
            console.log('[Station Management Test] Step 15: Verify that the current page does not display a station name after hiding NAME column.');
            await expect(page.getByText('Cape town')).not.toBeVisible();
            
            // Step 16: Enter "test" in the search input field
            console.log('[Station Management Test] Step 16: Enter "test" in the text_search_input field.');
            await page.locator('[data-test-id="search-input"]').fill('test');
            
            // Step 17: Press Enter/Return Key
            console.log('[Station Management Test] Step 17: Press Enter/Return Key.');
            await page.keyboard.press('Enter');
            
            // Step 18: Wait for search results
            console.log('[Station Management Test] Step 18: Wait for search results.');
            await page.waitForTimeout(3000);
            
            // Step 19: Click on Edit Column Btn to restore NAME column
            console.log('[Station Management Test] Step 19: Click on Edit Column Btn to restore NAME column.');
            await page.locator("[data-test-id='column-btn']").click();
            
            // Step 20: Click on Station name checkbox to show it again
            console.log('[Station Management Test] Step 20: Click on Station name checkbox to show column again.');
            await page.locator('input#name').click();
            
            // Step 21: Click on Edit Column Btn
            console.log('[Station Management Test] Step 21: Click on Edit Column Btn.');
            await page.locator('[data-test-id="column-btn"]').click();
            
            // Step 22: Verify that search shows filtered results
            console.log('[Station Management Test] Step 22: Verify that the current page displays filtered results.');
            await expect(page.locator('[data-test-id="LinkedItemsTable"] table').getByText('test').first()).toBeVisible();
            
        } else {
            // Original pagination test flow when pagination is available
            await nextPageBtn.click();        // Step 5: Verify that the current page displays text "Page 1 of 1"
        console.log('[Station Management Test] Step 5: Verify that the current page displays text "Page 1 of 1".');
        await expect(page.getByText('Page 1 of 1')).toBeVisible();
            
            // Step 6: Click on Previous Page Btn
            console.log('[Station Management Test] Step 6: Click on Previous Page Btn.');
            await page.locator("[data-test-id='previousPageBtn']").click();
            
            // Step 7: Verify that the current page displays text "Page 1 of 2"
            console.log('[Station Management Test] Step 7: Verify that the current page displays text "Page 1 of 2".');
            await expect(page.getByText('Page 1 of 2')).toBeVisible();
            
            // Step 8: Click on Last Page Btn
            console.log('[Station Management Test] Step 8: Click on Last Page Btn.');
            await page.locator("[data-test-id='lastPageBtn']").click();
            
            // Step 9: Verify that the current page displays text "Page 2 of 2"
            console.log('[Station Management Test] Step 9: Verify that the current page displays text "Page 2 of 2".');
            await expect(page.getByText('Page 2 of 2')).toBeVisible();
            
            // Step 10: Click on First Page Btn
            console.log('[Station Management Test] Step 10: Click on First Page Btn.');
            await page.locator("[data-test-id='firstPageBtn']").click();
            
            // Step 11: Verify that the current page displays text "Page 1 of 2"
            console.log('[Station Management Test] Step 11: Verify that the current page displays text "Page 1 of 2".');
            await expect(page.getByText('Page 1 of 2')).toBeVisible();
            
            // Step 12: Click on Row Dropdown
            console.log('[Station Management Test] Step 12: Click on Row Dropdown.');
            await page.locator("[data-test-id='rowDropdown']").selectOption("20");
            
            // Step 13: Select Row Dropdown value=20 (completed in previous step)
            console.log('[Station Management Test] Step 13: Row Dropdown value=20 selected.');
            
            // Step 14: Verify that the current page displays text "Page 1 of 1"
            console.log('[Station Management Test] Step 14: Verify that the current page displays text "Page 1 of 1".');
            await expect(page.getByText('Page 1 of 1')).toBeVisible();
            
            // Continue with column management tests
            // Step 15: Click on Edit Column Btn
            console.log('[Station Management Test] Step 15: Click on Edit Column Btn.');
            await page.locator("[data-test-id='column-btn']").click();
            
            // Step 16: Click on Station name checkbox
            console.log('[Station Management Test] Step 16: Click on Station name checkbox.');
            await page.locator('input#name').click();
            
            // Step 17: Click on Edit Column Btn
            console.log('[Station Management Test] Step 17: Click on Edit Column Btn.');
            await page.locator("[data-test-id='column-btn']").click();
            
            // Step 18: Verify that the current page does not displays text "Cresta 1 Device Station"
            console.log('[Station Management Test] Step 18: Verify that the current page does not displays text "Cresta 1 Device Station".');
            await expect(page.getByText('Cape town')).not.toBeVisible();
            
            // Step 19: Enter "test" in the text_search_input field
            console.log('[Station Management Test] Step 19: Enter "test" in the text_search_input field.');
            await page.locator('[data-test-id="search-input"]').fill('test');
            
            // Step 20: Press Enter/Return Key
            console.log('[Station Management Test] Step 20: Press Enter/Return Key.');
            await page.keyboard.press('Enter');
            
            // Step 21: Wait for 3 seconds
            console.log('[Station Management Test] Step 21: Wait for 3 seconds.');
            await page.waitForTimeout(3000);
            
            // Step 22: Click on Edit Column Btn
            console.log('[Station Management Test] Step 22: Click on Edit Column Btn.');
            await page.locator("[data-test-id='column-btn']").click();
            
            // Step 23: Click on Station name checkbox
            console.log('[Station Management Test] Step 23: Click on Station name checkbox.');
            await page.locator('input#name').click();
            
            // Step 24: Click on Edit Column Btn
            console.log('[Station Management Test] Step 24: Click on Edit Column Btn.');
            await page.locator("[data-test-id='column-btn']").click();
            
            // Step 25: Verify that the current page displays text "test"
            console.log('[Station Management Test] Step 25: Verify that the current page displays text "test".');
            await expect(page.locator('[data-test-id="LinkedItemsTable"] table').getByText('test').first()).toBeVisible();
        }
        
        console.log('[Station Management Test] Station management additional table functionality test completed successfully.');
    });

     test('should create, verify, edit and archive station management functionality', async ({ page }) => {
        console.log('[Station Management CRUD Test] Starting station management create, verify, edit & archive test...');
        
        // Step 1: Admin Login and Accept T&Cs (using SharedTestSteps)
        console.log('[Station Management CRUD Test] Step 1: Admin Login and Accept T&Cs.');
        await sharedTestSteps.authenticateAndSetup(/** @type {string} */ (USERNAME), /** @type {string} */ (PASSWORD));
        
        // Step 2: Select Automation Company (using SharedTestSteps)
        console.log('[Station Management CRUD Test] Step 2: Select Automation Company.');
        await sharedTestSteps.selectCompany('Automation company');
        
        // Step 3: Navigate to Station Management (using SharedTestSteps)
        console.log('[Station Management CRUD Test] Step 3: Navigate to Station Management.');
        await sharedTestSteps.navigateToConfigurationSubmenu('Station Management');
        
        // Wait for Station Management page to load (wait for specific table container)
        await expect(page.locator('[data-test-id="LinkedItemsTable"]')).toBeVisible();
        // Wait for the page heading (use nth(1) to get the main heading, not the navigation link)
        await expect(page.getByText('Station Management', { exact: true }).nth(1)).toBeVisible();

        // Step 4: Verify that the current page URL contains /station-management
        console.log('[Station Management CRUD Test] Step 4: Verify that the current page URL contains /station-management.');
        await expect(page).toHaveURL(/.*\/station-management/);
        
        // Step 5: Click on Add new station field
        console.log('[Station Management CRUD Test] Step 5: Click on Add new station field.');
        const createNewBtn = page.getByText('Create new', { exact: true });
        await expect(createNewBtn).toBeVisible();
        await expect(createNewBtn).toBeEnabled();
        await createNewBtn.click();
        
        // Step 6: Enter 123TestStation in the Station Name field field
        console.log('[Station Management CRUD Test] Step 6: Enter 123TestStation in the Station Name field field.');
        await page.locator('[data-test-id="TextField"]').fill('123TestStation');
        
        // Step 7: Click on Station Management Link Users input field
        console.log('[Station Management CRUD Test] Step 7: Click on Station Management Link Users input field.');
        await page.locator("//label[text()='Link Users']/following-sibling::div//input[@type='search']").click();
        
        // Step 8: Enter Test@ in the Station Management Link Users input field field
        console.log('[Station Management CRUD Test] Step 8: Enter Test@ in the Station Management Link Users input field field.');
        await page.locator("//label[text()='Link Users']/following-sibling::div//input[@type='search']").fill('Test@');
        
        // Step 9: Click on test test
        console.log('[Station Management CRUD Test] Step 9: Click on test test.');
        await page.getByText('test test').click();
        
        // Step 10: Click on title_stationManagement_createPage
        console.log('[Station Management CRUD Test] Step 10: Click on title_stationManagement_createPage.');
        await page.locator("//div[text()='Station Details']").click();
        
        // Step 11: Click on Station Management Link Areas input field
        console.log('[Station Management CRUD Test] Step 11: Click on Station Management Link Areas input field.');
        await page.locator("//label[text()='Link Areas']/following-sibling::div//input[@type='search']").click();
        
        // Step 12: Enter DO in the Station Management Link Areas input field field
        console.log('[Station Management CRUD Test] Step 12: Enter DO in the Station Management Link Areas input field field.');
        await page.locator("//label[text()='Link Areas']/following-sibling::div//input[@type='search']").fill('DO');
        
        // Step 13: Click on DO NOT DELETE
        console.log('[Station Management CRUD Test] Step 13: Click on DO NOT DELETE.');
        await page.getByText('DO NOT DELETE').first().click();
        
        // Step 14: Click on title_stationManagement_createPage
        console.log('[Station Management CRUD Test] Step 14: Click on title_stationManagement_createPage.');
        await page.locator("//div[text()='Station Details']").click();
        
        // Step 15: IF All filter (using SharedTestSteps)
        console.log('[Station Management CRUD Test] Step 15: IF All filter.');
        await sharedTestSteps.ifAllFilter();
        
        // Step 16: Stack filter UB/Trex checked (using SharedTestSteps)
        console.log('[Station Management CRUD Test] Step 16: Stack filter UB/Trex checked.');
        await sharedTestSteps.verifyUBAndTrexFiltersCheckedStationManagement();
        
        // Step 17: IF None filter (using SharedTestSteps)
        console.log('[Station Management CRUD Test] Step 17: IF None filter.');
        await sharedTestSteps.ifNoneFilter();
        
        // Step 18: Stack filter UB/Trex unchecked (using SharedTestSteps)
        console.log('[Station Management CRUD Test] Step 18: Stack filter UB/Trex unchecked.');
        await sharedTestSteps.verifyUBAndTrexFiltersUncheckedStationManagement();
        
        // Step 19: Click on None selected Input
        console.log('[Station Management CRUD Test] Step 19: Click on None selected Input.');
        await page.getByPlaceholder('None selected').click();
        
        // Step 20: Click on Save and Update Station btn
        console.log('[Station Management CRUD Test] Step 20: Click on Save and Update Station btn.');
        await page.locator("//button[span[text()='Save and Update']]").click();
        
        // Step 21: Verify that the elements with locator Column1 / Row1 displays text 123TestStation
        console.log('[Station Management CRUD Test] Step 21: Verify that the elements with locator Column1 / Row1 displays text 123TestStation.');
        await expect(page.getByText('123TestStation').first()).toBeVisible();
        
        // Step 22: Click on Row1 See Linked Users
        console.log('[Station Management CRUD Test] Step 22: Click on Row1 See Linked Users.');
        const createdStationRow = page.locator('tr', { has: page.getByText('123TestStation') });
        await createdStationRow.locator("a:has-text('Linked User')").first().click();
        
        // Step 23: Verify that the current page displays text test test
        console.log('[Station Management CRUD Test] Step 23: Verify that the current page displays text test test.');
        await expect(page.getByText('test test')).toBeVisible();
        
        // Step 24: Click on close_modal_stationManagementTable
        console.log('[Station Management CRUD Test] Step 24: Click on close_modal_stationManagementTable.');
        await page.locator("//button[@data-test-id='modalClose']").click();
        
        // Step 25: Click on Row1 See Linked Areas
        console.log('[Station Management CRUD Test] Step 25: Click on Row1 See Linked Areas.');
        const stationRowForAreas = page.locator('tr', { has: page.getByText('123TestStation') });
        await stationRowForAreas.locator("a:has-text('Linked Area')").click();
        
        // Step 26: Verify that the current page displays text DO NOT DELETE
        console.log('[Station Management CRUD Test] Step 26: Verify that the current page displays text DO NOT DELETE.');
        await expect(page.getByText('DO NOT DELETE')).toBeVisible();
        
        // Step 27: Click on close_modal_stationManagementTable
        console.log('[Station Management CRUD Test] Step 27: Click on close_modal_stationManagementTable.');
        await page.locator("//button[@data-test-id='modalClose']").click();
        
        // Step 28: Click on edit_row1_stationManagement
        console.log('[Station Management CRUD Test] Step 28: Click on edit_row1_stationManagement.');
        await page.locator("(//button[.//span[text()='Edit']])[1]").click();
        
        // Step 29: Double click on Station Name field
        console.log('[Station Management CRUD Test] Step 29: Double click on Station Name field.');
        await page.locator('[data-test-id="TextField"]').dblclick();
        
        // Step 30: Enter 123TestingEdit in the Station Name field field
        console.log('[Station Management CRUD Test] Step 30: Enter 123TestingEdit in the Station Name field field.');
        await page.locator('[data-test-id="TextField"]').fill('123TestingEdit');
        
        // Step 31: Click on Save and Update Station btn
        console.log('[Station Management CRUD Test] Step 31: Click on Save and Update Station btn.');
        await page.locator("//button[span[text()='Save and Update']]").click();

        // Step 31.5: Navigate back to Station Management main page for cleanup
        console.log('[Station Management CRUD Test] Step 31.5: Navigate back to Station Management main page.');
        await sharedTestSteps.navigateToConfigurationSubmenu('Station Management');
        await expect(page.locator('[data-test-id="LinkedItemsTable"]')).toBeVisible();

        // Step 32: Cleanup - Archive ALL created/edited stations 
        console.log('[Station Management CRUD Test] Cleanup: Archiving all test stations.');
        
        // Try to find and archive ALL stations by either original or edited name
        const possibleNames = ['123TestStation', '123TestingEdit'];
        let totalArchived = 0;
        
        for (const stationName of possibleNames) {
            console.log(`[Station Management CRUD Test] Checking for stations named: ${stationName}`);
            
            // Keep archiving until no more stations with this name exist
            while (true) {
                const stationElements = page.getByText(stationName);
                const stationCount = await stationElements.count();
                
                if (stationCount === 0) {
                    console.log(`[Station Management CRUD Test] No more stations found with name: ${stationName}`);
                    break;
                }
                
                console.log(`[Station Management CRUD Test] Found ${stationCount} station(s) with name: ${stationName}, archiving first one...`);
                
                try {
                    // Find the first row with the station name and click the archive button
                    const stationRow = page.locator('tr', { has: page.getByText(stationName) }).first();
                    const archiveButton = stationRow.locator("button:has-text('Archive')");
                    
                    if (await archiveButton.count() > 0) {
                        await archiveButton.click();
                        // Confirm archive in dialog  
                        await page.locator('[data-test-id="dialog-button-2"]').click();
                        // Wait a moment for the station to be removed
                        await page.waitForTimeout(2000);
                        totalArchived++;
                        console.log(`[Station Management CRUD Test] Archived station "${stationName}" (${totalArchived} total)`);
                    } else {
                        console.log(`[Station Management CRUD Test] Archive button not found for station: ${stationName}`);
                        break;
                    }
                } catch (error) {
                    console.log(`[Station Management CRUD Test] Error archiving station "${stationName}": ${/** @type {Error} */ (error).message}`);
                    break;
                }
            }
        }
        
        console.log(`[Station Management CRUD Test] Cleanup completed: ${totalArchived} stations archived in total.`);

        console.log('[Station Management CRUD Test] Station management create, verify, edit & archive test completed successfully.');
    });
});