// e2e/user-management-additional-table-functionality.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('User Management - Additional table functionality', () => {
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
    
    test('should verify user management table functionality with pagination, search and column management', async ({ page }) => {
        console.log('[User Management Test] Starting user management additional table functionality test...');

        // Step 1: Admin Login and Accept T&Cs (using SharedTestSteps)
        console.log('[User Management Test] Step 1: Admin Login and Accept T&Cs.');
        await sharedTestSteps.authenticateAndSetup(/** @type {string} */ (USERNAME), /** @type {string} */ (PASSWORD));

        // Step 2: Select Automation Company (using SharedTestSteps)
        console.log('[User Management Test] Step 2: Select Automation Company.');
        await sharedTestSteps.selectCompany('Automation company');
        // Ensure we are in the correct company context
        const selectedCompany = await page.locator('[data-test-id="selected-company"] .p-dropdown-label').textContent();
        expect((selectedCompany || '').trim()).toBe('Automation company');

        // Step 3: Navigate to User Management (using SharedTestSteps)
        console.log('[User Management Test] Step 3: Navigate to User Management.');
        await sharedTestSteps.navigateToConfigurationSubmenu('User Management');

        // Step 4: Click on Next Page Btn
        console.log('[User Management Test] Step 4: Click on Next Page Btn.');
        await page.locator("[data-test-id='nextPageBtn']").click();

        // Step 5: Verify that the current page displays text "Showing page 2 of 2"
        console.log('[User Management Test] Step 5: Verify that the current page displays text "Showing page 2 of 2".');
        await expect(page.getByText('Showing page 2 of 2')).toBeVisible();

        // Step 6: Click on Previous Page Btn
        console.log('[User Management Test] Step 6: Click on Previous Page Btn.');
        await page.locator("[data-test-id='previousPageBtn']").click();

        // Step 7: Verify that the current page displays text "Showing page 1 of 2"
        console.log('[User Management Test] Step 7: Verify that the current page displays text "Showing page 1 of 2".');
        await expect(page.getByText('Showing page 1 of 2')).toBeVisible();

        // Step 8: Click on Last Page Btn
        console.log('[User Management Test] Step 8: Click on Last Page Btn.');
        await page.locator("[data-test-id='lastPageBtn']").click();

        // Step 9: Verify that the current page displays text "Showing page 2 of 2"
        console.log('[User Management Test] Step 9: Verify that the current page displays text "Showing page 2 of 2".');
        await expect(page.getByText('Showing page 2 of 2')).toBeVisible();

        // Step 10: Click on First Page Btn
        console.log('[User Management Test] Step 10: Click on First Page Btn.');
        await page.locator("[data-test-id='firstPageBtn']").click();

        // Step 11: Verify that the current page displays text "Showing page 1 of 2"
        console.log('[User Management Test] Step 11: Verify that the current page displays text "Showing page 1 of 2".');
        await expect(page.getByText('Showing page 1 of 2')).toBeVisible();

        // Step 12: Click on Row Dropdown
        console.log('[User Management Test] Step 12: Click on Row Dropdown.');
        // Use selectOption for dropdown selection (self-healing fix)
        await page.locator("[data-test-id='rowDropdown']").selectOption('20');

        // Step 13: Row Dropdown value=20 selected (no click needed)
        console.log('[User Management Test] Step 13: Row Dropdown value=20 selected.');

        // Step 14: Verify that the current page displays text "Showing page 1 of 1"
        console.log('[User Management Test] Step 14: Verify that the current page displays text "Showing page 1 of 1".');
        await expect(page.getByText('Showing page 1 of 1')).toBeVisible();

        // Step 15: Click on Edit Column Btn
        console.log('[User Management Test] Step 15: Click on Edit Column Btn.');
        // Use correct locator for Edit Column Btn (self-healing fix)
        await page.locator("[data-test-id='column-btn']").click();

        // Step 16: Click on checkbox_name_stationManagement
        console.log('[User Management Test] Step 16: Click on checkbox_name_stationManagement.');
        await page.locator("//span[text()='NAME']/preceding-sibling::div").click();

        // Step 17: Click on Edit Column Btn
        console.log('[User Management Test] Step 17: Click on Edit Column Btn.');
        // Use correct locator for Edit Column Btn (self-healing fix)
        await page.locator("[data-test-id='column-btn']").click();

        // Step 18: Verify that the current page does not displays text "Jayson"
        console.log('[User Management Test] Step 18: Verify that the current page does not displays text "Jayson".');
        await expect(page.getByText('Jayson')).not.toBeVisible();

        // Step 19: Click on Heading: User Management
        console.log('[User Management Test] Step 19: Click on Heading: User Management.');
        await page.locator("//div[text()[normalize-space() = \"User Management\"]]").click();

        // Step 20: Click on btn_sites_searchIcon
        console.log('[User Management Test] Step 20: Click on btn_sites_searchIcon.');
        await page.locator("[data-test-id='search-toggle']").click();

        // Step 21: Click on Search Text Area
        console.log('[User Management Test] Step 21: Click on Search Text Area.');
        await page.locator("[data-test-id='search-input']").click();

        // Step 22: Enter "New" in the Search Text Area field
        console.log('[User Management Test] Step 22: Enter "New" in the Search Text Area field.');
        await page.locator("[data-test-id='search-input']").fill('New');

        // Step 23: Wait for 5 seconds
        console.log('[User Management Test] Step 23: Wait for 5 seconds.');
        await page.waitForTimeout(5000);

        // Step 24: Verify that the element "New" displays text "New"
        console.log('[User Management Test] Step 24: Verify that the element "New" displays text "New".');
        // Use robust, class-free locator: find a table cell (role=cell) with exact text "New"
        await expect(page.getByRole('cell', { name: /^New$/ })).toBeVisible();

        // Step 25: Verify that the element "Automation" displays text "Automation"
        console.log('[User Management Test] Step 25: Verify that the element "Automation" displays text "Automation".');
        // Use robust, class-free locator: find a table cell (role=cell) with exact text "Automation"
        await expect(page.getByRole('cell', { name: /^Automation$/ })).toBeVisible();

        // Step 26: Verify that the element "automation@test.com" displays text "automation@test.com"
        console.log('[User Management Test] Step 26: Verify that the element "automation@test.com" displays text "automation@test.com".');
        await expect(page.getByText('automation@test.com')).toBeVisible();

        // Step 27: Verify that the element "Automation All permissions" displays text "Automation All permissions"
        console.log('[User Management Test] Step 27: Verify that the element "Automation All permissions" displays text "Automation All permissions".');
        await expect(page.getByText('Automation All permissions')).toBeVisible();

        console.log('[User Management Test] User management additional table functionality test completed successfully.');
    });
    
    test('should create, edit, and verify user management functionality', async ({ page }) => {
        console.log('[User Management CRUD Test] Starting user management create, edit, archive & verify test...');

        // Step 1: Admin Login and Accept T&Cs (using SharedTestSteps)
        console.log('[User Management CRUD Test] Step 1: Admin Login and Accept T&Cs.');
        await sharedTestSteps.authenticateAndSetup(/** @type {string} */ (USERNAME), /** @type {string} */ (PASSWORD));

        // Step 2: Select Automation Company (using SharedTestSteps)
        console.log('[User Management CRUD Test] Step 2: Select Automation Company.');
        await sharedTestSteps.selectCompany('Automation company');
        // Ensure we are in the correct company context
        const selectedCompany = await page.locator('[data-test-id="selected-company"] .p-dropdown-label').textContent();
        expect((selectedCompany || '').trim()).toBe('Automation company');

        // Step 3: Navigate to User Management (using SharedTestSteps)
        console.log('[User Management CRUD Test] Step 3: Navigate to User Management.');
        await sharedTestSteps.navigateToConfigurationSubmenu('User Management');

        // Step 4: Click on Create New btn
        console.log('[User Management CRUD Test] Step 4: Click on Create New btn.');
        await page.locator("//button[.//span[text()='Create New']]").click();

        // Step 5: Click on First Name Field
        console.log('[User Management CRUD Test] Step 5: Click on First Name Field.');
        await page.locator("[data-test-id='firstNameField']").click();

        // Step 6: Store ! Name :: Firstname in name
        console.log('[User Management CRUD Test] Step 6: Store ! Name :: Firstname in name.');
        // This appears to be a variable assignment step - storing the value for later use
        const storedName = 'Firstname';

        // Step 7: Enter $ name in the First Name Field field
        console.log('[User Management CRUD Test] Step 7: Enter $ name in the First Name Field field.');
        await page.locator("[data-test-id='firstNameField']").fill(storedName);

        // Step 8: Click on Last Name Field
        console.log('[User Management CRUD Test] Step 8: Click on Last Name Field.');
        await page.locator("[data-test-id='lastNameField']").click();

        // Step 9: Enter TestUser2 in the Last Name Field field
        console.log('[User Management CRUD Test] Step 9: Enter TestUser2 in the Last Name Field field.');
        await page.locator("[data-test-id='lastNameField']").fill('TestUser2');

        // Step 10: Click on User Management - Email Field
        console.log('[User Management CRUD Test] Step 10: Click on User Management - Email Field.');
        await page.locator("[data-test-id='emailAddressField']").click();

        // Step 11: Enter testuseremail@gmail.com in the User Management - Email Field field
        console.log('[User Management CRUD Test] Step 11: Enter testuseremail@gmail.com in the User Management - Email Field field.');
        await page.locator("[data-test-id='emailAddressField']").fill('testuseremail@gmail.com');

        // Step 12: Click on Contact Number Field
        console.log('[User Management CRUD Test] Step 12: Click on Contact Number Field.');
        await page.locator("[data-test-id='contactNumberField']").click();

        // Step 13: Enter 0781410214 in the Contact Number Field field
        console.log('[User Management CRUD Test] Step 13: Enter 0781410214 in the Contact Number Field field.');
        await page.locator("[data-test-id='contactNumberField']").fill('0781410214');

        // Step 14: Click on Role Dropdown
        console.log('[User Management CRUD Test] Step 14: Click on Role Dropdown.');
        await page.locator("[data-test-id='roleDropdown']").click();

        // Step 15: Click on User management -DO NOT DELETE Role
        console.log('[User Management CRUD Test] Step 15: Click on User management -DO NOT DELETE Role.');
        // Wait for dropdown options to render, then select the option by visible text
        await page.waitForTimeout(500); // allow dropdown to render
        await page.locator('text="DO NOT DELETE"').first().click();

        // Step 16: Click on Create New User button
        console.log('[User Management CRUD Test] Step 16: Click on Create New User button.');
        await page.locator("//span[text()='CREATE NEW USER']").click();

        // Step 17: Wait for 5 seconds
        console.log('[User Management CRUD Test] Step 17: Wait for 5 seconds.');
        await page.waitForTimeout(5000);

        // Step 18: Click on btn_search_toggle
        console.log('[User Management CRUD Test] Step 18: Click on btn_search_toggle.');
        await page.locator("[data-test-id='search-toggle']").click();

        // Step 19: Enter $ name in the text_search_input field
        console.log('[User Management CRUD Test] Step 19: Enter $ name in the text_search_input field.');
        await page.locator("//input[@data-test-id='search-input']").fill(storedName);

        // Step 20: Wait for 2 seconds
        console.log('[User Management CRUD Test] Step 20: Wait for 2 seconds.');
        await page.waitForTimeout(2000);

        // Step 21: Click on Edit Button
        console.log('[User Management CRUD Test] Step 21: Click on Edit Button.');
        await page.locator("[data-test-id='editBtn']").click();

        // Step 22: Clear the text displayed in the First Name Field_Edit field
        console.log('[User Management CRUD Test] Step 22: Clear the text displayed in the First Name Field_Edit field.');
        await page.locator("[data-test-id='firstNameField']").clear();

        // Step 23: Store ! Name :: Firstname in name2
        console.log('[User Management CRUD Test] Step 23: Store ! Name :: Firstname in name2.');
        const storedName2 = 'Firstname';

        // Step 24: Enter $ name2 in the First Name Field_Edit field
        console.log('[User Management CRUD Test] Step 24: Enter $ name2 in the First Name Field_Edit field.');
        await page.locator("[data-test-id='firstNameField']").fill(storedName2);

        // Step 25: Click on SAVE & UPDATE
        console.log('[User Management CRUD Test] Step 25: Click on SAVE & UPDATE.');
        await page.locator("//span[text()='SAVE & UPDATE']").click();

        // Step 26: Wait for 5 seconds
        console.log('[User Management CRUD Test] Step 26: Wait for 5 seconds.');
        await page.waitForTimeout(5000);

        // Step 27: Click on btn_search_toggle
        console.log('[User Management CRUD Test] Step 27: Click on btn_search_toggle.');
        await page.locator("[data-test-id='search-toggle']").click();

        // Step 28: Enter $ name2 in the text_search_input field
        console.log('[User Management CRUD Test] Step 28: Enter $ name2 in the text_search_input field.');
        await page.locator("//input[@data-test-id='search-input']").fill(storedName2);

        // Step 29: Wait for 2 seconds
        console.log('[User Management CRUD Test] Step 29: Wait for 2 seconds.');
        await page.waitForTimeout(2000);

        // Verification: Verify that the user was created and can be found
        console.log('[User Management CRUD Test] Verification: Verify that the created user is visible in the search results.');
        await expect(page.getByText(storedName2)).toBeVisible();
        await expect(page.getByText('TestUser2')).toBeVisible();
        await expect(page.getByText('testuseremail@gmail.com')).toBeVisible();

        // Cleanup: Delete the created user
        console.log('[User Management CRUD Test] Cleanup: Deleting the created user.');
        // Find the row with the user's first name and click the corresponding archive button
        const userRow = page.locator('tr', { has: page.getByText(storedName2) });
        await userRow.locator("[data-test-id='archiveButton']").click();
        // Confirm deletion in dialog (assuming a confirmation button with text 'Yes' or similar)
        await page.locator("button:has-text('Yes')").click();
        // Wait for user to be removed
        // Only check the table for the user's name, to avoid dialog strict mode issues
        await expect(page.locator('table').getByText(storedName2)).not.toBeVisible();
        console.log('[User Management CRUD Test] Cleanup: User deleted successfully.');

        console.log('[User Management CRUD Test] User management create, edit, archive & verify test completed successfully.');
    });
});