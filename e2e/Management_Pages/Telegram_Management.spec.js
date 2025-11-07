// e2e/telegram-management-standard-message.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Telegram Management - Standard Message', () => {
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
    
    test('should create and verify telegram management standard message functionality', async ({ page }) => {
        console.log('[Telegram Management Standard Message Test] Starting telegram management standard message test...');
        
        // Step 1: Admin Login and Accept T&Cs (using SharedTestSteps)
        console.log('[Telegram Management Standard Message Test] Step 1: Admin Login and Accept T&Cs.');
        await sharedTestSteps.authenticateAndSetup(/** @type {string} */ (USERNAME), /** @type {string} */ (PASSWORD));
        
        // Step 2: Select Automation Company (using SharedTestSteps)
        console.log('[Telegram Management Standard Message Test] Step 2: Select Automation Company.');
        await sharedTestSteps.selectCompany('Automation company');
        
        // Step 3: Navigate to Telegram Management (using SharedTestSteps)
        console.log('[Telegram Management Standard Message Test] Step 3: Navigate to Telegram Management.');
        await sharedTestSteps.navigateToConfigurationSubmenu('Telegram Management');
        
        // Step 4: Verify that the current page URL contains telegram-management/standard-messages
        console.log('[Telegram Management Standard Message Test] Step 4: Verify that the current page URL contains telegram-management/standard-messages.');
        await expect(page).toHaveURL(/.*telegram-management\/standard-messages/);
        
        // Step 5: Click on Create New btn
        console.log('[Telegram Management Standard Message Test] Step 5: Click on Create New btn.');
        await page.locator("button:has-text('Create New')").click();
        
        // Step 6: Click on Standard message - Message Name Input
        console.log('[Telegram Management Standard Message Test] Step 6: Click on Standard message - Message Name Input.');
        await page.waitForSelector("[data-test-id='messageNameInputField']", { timeout: 15000 });
        await page.locator("[data-test-id='messageNameInputField']").click();
        
        // Step 7: Enter TESTING STANDARD MESSAGE in the Standard message - Message Name Input field
        console.log('[Telegram Management Standard Message Test] Step 7: Enter TESTING STANDARD MESSAGE in the Standard message - Message Name Input field.');
        await page.locator("[data-test-id='messageNameInputField']").fill('TESTING STANDARD MESSAGE');
        
        // Step 8: Click on Standard message - Message Input Field
        console.log('[Telegram Management Standard Message Test] Step 8: Click on Standard message - Message Input Field.');
        await page.locator("[data-test-id='messageInputField']").click();
        
        // Step 9: Enter THIS IS THE TEST MESSAGE EXAMPLE in the Standard message - Message Input Field field
        console.log('[Telegram Management Standard Message Test] Step 9: Enter THIS IS THE TEST MESSAGE EXAMPLE in the Standard message - Message Input Field field.');
        await page.locator("[data-test-id='messageInputField']").fill('THIS IS THE TEST MESSAGE EXAMPLE');
        
        // Step 10: Click on Standard message - Link Alert Types
        console.log('[Telegram Management Standard Message Test] Step 10: Click on Standard message - Link Alert Types.');
        await page.locator("#search_input").click();
        
        // Step 11: Click on Standard message - Link Alert Types - Trex
        console.log('[Telegram Management Standard Message Test] Step 11: Click on Standard message - Link Alert Types - Trex.');
        await page.locator("li.option:has-text('Trex')").click({ timeout: 10000 });
        
        // Step 12: Click on Telegram Management - Save btn
        console.log('[Telegram Management Standard Message Test] Step 12: Click on Telegram Management - Save btn.');
        await page.locator("button:has-text('Save')").click({ timeout: 10000 });
        
        // Step 13: Wait until the text Create New is present on the current page
        console.log('[Telegram Management Standard Message Test] Step 13: Wait until the text Create New is present on the current page.');
        await expect(page.getByRole('button', { name: 'Create New' }).first()).toBeVisible({ timeout: 15000 });
        
        // Step 14: Click on btn_search_toggle
        console.log('[Telegram Management Standard Message Test] Step 14: Click on btn_search_toggle.');
        await page.locator("[data-test-id='search-toggle']").click();
        
        // Step 15: Enter TESTING STANDARD MESSAGE in the text_search_input field
        console.log('[Telegram Management Standard Message Test] Step 15: Enter TESTING STANDARD MESSAGE in the text_search_input field.');
        await page.locator("[data-test-id='search-input']").fill('TESTING STANDARD MESSAGE');
        
        // Step 16: Press Enter/Return Key
        console.log('[Telegram Management Standard Message Test] Step 16: Press Enter/Return Key.');
        await page.keyboard.press('Enter'); await page.waitForTimeout(2000);
        
        // Step 17: Verify that the elements with locator Column1 / Row1 displays text TESTING STANDARD MESSAGE
        console.log('[Telegram Management Standard Message Test] Step 17: Verify that the elements with locator Column1 / Row1 displays text TESTING STANDARD MESSAGE.');
        await expect(page.locator("table tbody tr").first().locator("td").first()).toContainText('TESTING STANDARD MESSAGE');
        
        // Step 18: Verify that the elements with locator Column2 / Row1 displays text THIS IS THE TEST MESSAGE EXAMPLE
        console.log('[Telegram Management Standard Message Test] Step 18: Verify that the elements with locator Column2 / Row1 displays text THIS IS THE TEST MESSAGE EXAMPLE.');
        await expect(page.locator("table tbody tr").first().locator("td").nth(1)).toContainText('THIS IS THE TEST MESSAGE EXAMPLE');
        
        // Step 19: Click on Telegram Management - Linked Alert Types
        console.log('[Telegram Management Standard Message Test] Step 19: Click on Telegram Management - Linked Alert Types.');
        await page.locator('[data-test-id="linkedAlertTypes"]').first().click();
        
        // Step 20: Verify that the current page displays text Total: 1
        console.log('[Telegram Management Standard Message Test] Step 20: Verify that the current page displays text Total: 1.');
        await expect(page.getByText('Total: 1')).toBeVisible();
        
        // Step 21: Verify that the current page displays text Trex
        console.log('[Telegram Management Standard Message Test] Step 21: Verify that the current page displays text Trex.');
        await expect(page.getByText('Trex')).toBeVisible();
        
        // Close the popup by pressing Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        
        // Cleanup: Archive the created standard message
        console.log('[Telegram Management Standard Message Test] Cleanup: Archiving created standard message...');
        await page.locator('[data-test-id="archiveBtn"]').first().click();
        await page.locator('button:has-text("Yes")').click();
        await page.waitForTimeout(2000);
        
        console.log('[Telegram Management Standard Message Test] Telegram management standard message test completed successfully.');
    });

     test('should create and verify telegram management telegram group functionality', async ({ page }) => {
        console.log('[Telegram Management Telegram Group Test] Starting telegram management telegram group test...');
        
        // Step 1: Admin Login and Accept T&Cs (using SharedTestSteps)
        console.log('[Telegram Management Telegram Group Test] Step 1: Admin Login and Accept T&Cs.');
        await sharedTestSteps.authenticateAndSetup(/** @type {string} */ (USERNAME), /** @type {string} */ (PASSWORD));
        
        // Step 2: Select Automation Company (using SharedTestSteps)
        console.log('[Telegram Management Telegram Group Test] Step 2: Select Automation Company.');
        await sharedTestSteps.selectCompany('Automation company');
        
        // Step 3: Navigate to Telegram Management (using SharedTestSteps)
        console.log('[Telegram Management Telegram Group Test] Step 3: Navigate to Telegram Management.');
        await sharedTestSteps.navigateToConfigurationSubmenu('Telegram Management');
        
        // Step 4: Click on Telegram Groups - tab
        console.log('[Telegram Management Telegram Group Test] Step 4: Click on Telegram Groups - tab.');
        await page.getByText('Telegram Groups').click();
        
        // Step 5: Verify that the current page URL contains telegram-management/telegram-groups
        console.log('[Telegram Management Telegram Group Test] Step 5: Verify that the current page URL contains telegram-management/telegram-groups.');
        await expect(page).toHaveURL(/.*telegram-management\/telegram-groups/);
        
        // Step 6: Click on Create New btn
        console.log('[Telegram Management Telegram Group Test] Step 6: Click on Create New btn.');
        await page.locator("button:has-text('Create New')").click({ timeout: 10000 });
        
        // Step 7: Click on Telegram Management - Group Name input field
        console.log('[Telegram Management Telegram Group Test] Step 7: Click on Telegram Management - Group Name input field.');
        await page.waitForSelector("[data-test-id='groupNameInputField'], input[placeholder*='name'], input[name*='name']", { timeout: 15000 });
        await page.locator("[data-test-id='groupNameInputField'], input[placeholder*='name'], input[name*='name']").first().click({ timeout: 10000 });
        
        // Step 8: Enter TESTING NEW GROUP NAME in the Telegram Management - Group Name field
        console.log('[Telegram Management Telegram Group Test] Step 8: Enter TESTING NEW GROUP NAME in the Telegram Management - Group Name field.');
        await page.locator("[data-test-id='groupNameInputField'], input[placeholder*='name'], input[name*='name']").first().fill('TESTING NEW GROUP NAME');
        
        // Step 9: Click on Telegram Management - Description field
        console.log('[Telegram Management Telegram Group Test] Step 9: Click on Telegram Management - Description field.');
        await page.locator("[data-test-id='descriptionInputField'], textarea[placeholder*='description'], textarea[name*='description']").first().click();
        
        // Step 10: Enter DESCRIPTION TEXT EXAMPLE in the Telegram Management - Description field
        console.log('[Telegram Management Telegram Group Test] Step 10: Enter DESCRIPTION TEXT EXAMPLE in the Telegram Management - Description field.');
        await page.locator("[data-test-id='descriptionInputField'], textarea[placeholder*='description'], textarea[name*='description']").first().fill('DESCRIPTION TEXT EXAMPLE');
        
        // Step 11: Click on Telegram Management - Link Areas - search box
        console.log('[Telegram Management Telegram Group Test] Step 11: Click on Telegram Management - Link Areas - search box.');
        await page.locator("#search_input").click();
        
        // Step 12: Click on Telegram management - group All
        console.log('[Telegram Management Telegram Group Test] Step 12: Click on Telegram management - group All.');
        await page.locator("ul.optionContainer li:has-text('ALL')").click();
        
        // Step 13: Click on Telegram Management - Save btn
        console.log('[Telegram Management Telegram Group Test] Step 13: Click on Telegram Management - Save btn.');
        await page.locator("button:has-text('Save')").click({ timeout: 10000 });
        
        // Step 14: Wait for 5 seconds
        console.log('[Telegram Management Telegram Group Test] Step 14: Wait for 5 seconds.');
        await page.waitForTimeout(5000);
        
        // Step 15: Verify that the elements with locator Column1 / Row1 displays text TESTING NEW GROUP NAME
        console.log('[Telegram Management Telegram Group Test] Step 15: Verify that the elements with locator Column1 / Row1 displays text TESTING NEW GROUP NAME.');
        await expect(page.locator("table tbody tr").first().locator("td").first()).toContainText('TESTING NEW GROUP NAME');
        
        // Step 16: Verify that the elements with locator Column2 / Row1 displays text DESCRIPTION TEXT EXAMPLE
        console.log('[Telegram Management Telegram Group Test] Step 16: Verify that the elements with locator Column2 / Row1 displays text DESCRIPTION TEXT EXAMPLE.');
        await expect(page.locator("table tbody tr").first().locator("td").nth(1)).toContainText('DESCRIPTION TEXT EXAMPLE');
        
        // Step 17: Click on Telegram Management - Linked Alert Types
        console.log('[Telegram Management Telegram Group Test] Step 17: Click on Telegram Management - Linked Alert Types.');
        await page.locator("table tbody tr").first().getByText('See Linked Areas').click();
        
        // Step 18: Verify that the current page displays text Total: 1
        console.log('[Telegram Management Telegram Group Test] Step 18: Verify that the current page displays text Total: 1.');
        await expect(page.getByText('Total: 1')).toBeVisible();
        
        // Step 19: Verify that the current page displays text ALL
        console.log('[Telegram Management Telegram Group Test] Step 19: Verify that the current page displays text ALL.');
        await expect(page.getByText('ALL', { exact: true }).last()).toBeVisible();
        
        // Close the popup by pressing Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        
        // Cleanup: Archive the created telegram group
        console.log('[Telegram Management Telegram Group Test] Cleanup: Archiving created telegram group...');
        await page.locator('[data-test-id="archiveBtn"]').first().click();
        await page.locator('button:has-text("Yes")').click();
        await page.waitForTimeout(2000);
        
        console.log('[Telegram Management Telegram Group Test] Telegram management telegram group test completed successfully.');
    });

    test('should verify telegram management table functionality with pagination, search and column management', async ({ page }) => {
        console.log('[Telegram Management Table Test] Starting telegram management additional table functionality test...');
        
        // Step 1: Admin Login and Accept T&Cs (using SharedTestSteps)
        console.log('[Telegram Management Table Test] Step 1: Admin Login and Accept T&Cs.');
        await sharedTestSteps.authenticateAndSetup(/** @type {string} */ (USERNAME), /** @type {string} */ (PASSWORD));
        
        // Step 2: Select Automation Company (using SharedTestSteps)
        console.log('[Telegram Management Table Test] Step 2: Select Automation Company.');
        await sharedTestSteps.selectCompany('Automation company');
        
        // Step 3: Navigate to Telegram Management (using SharedTestSteps)
        console.log('[Telegram Management Table Test] Step 3: Navigate to Telegram Management.');
        await sharedTestSteps.navigateToConfigurationSubmenu('Telegram Management');
        
        // Step 4: Click on Next Page Btn
        console.log('[Telegram Management Table Test] Step 4: Click on Next Page Btn.');
        await page.locator("[data-test-id='nextPageBtn']").click();
        
        // Step 5: Wait until the text "Showing page 2 of 2" is present on the current page
        console.log('[Telegram Management Table Test] Step 5: Wait until the text "Showing page 2 of 2" is present on the current page.');
        await expect(page.getByText('Showing page 2 of 2')).toBeVisible({ timeout: 15000 });
        
        // Step 6: Verify that the current page displays text "Showing page 2 of 2"
        console.log('[Telegram Management Table Test] Step 6: Verify that the current page displays text "Showing page 2 of 2".');
        await expect(page.getByText('Showing page 2 of 2')).toBeVisible();
        
        // Step 7: Click on Last Page Btn
        console.log('[Telegram Management Table Test] Step 7: Click on Last Page Btn.');
        await page.locator("[data-test-id='lastPageBtn']").click();
        
        // Step 8: Wait until the text "Showing page 2 of 2" is present on the current page
        console.log('[Telegram Management Table Test] Step 8: Wait until the text "Showing page 2 of 2" is present on the current page.');
        await expect(page.getByText('Showing page 2 of 2')).toBeVisible({ timeout: 15000 });
        
        // Step 9: Verify that the current page displays text "Showing page 2 of 2"
        console.log('[Telegram Management Table Test] Step 9: Verify that the current page displays text "Showing page 2 of 2".');
        await expect(page.getByText('Showing page 2 of 2')).toBeVisible();
        
        // Step 10: Click on Previous Page Btn
        console.log('[Telegram Management Table Test] Step 10: Click on Previous Page Btn.');
        await page.locator("[data-test-id='previousPageBtn']").click();
        
        // Step 11: Wait until the text "Showing page 1 of 2" is present on the current page
        console.log('[Telegram Management Table Test] Step 11: Wait until the text "Showing page 1 of 2" is present on the current page.');
        await expect(page.getByText('Showing page 1 of 2')).toBeVisible({ timeout: 15000 });
        
        // Step 12: Verify that the current page displays text "Showing page 1 of 2"
        console.log('[Telegram Management Table Test] Step 12: Verify that the current page displays text "Showing page 1 of 2".');
        await expect(page.getByText('Showing page 1 of 2')).toBeVisible();
        
        // Step 13: Click on First Page Btn
        console.log('[Telegram Management Table Test] Step 13: Click on First Page Btn.');
        await page.locator("[data-test-id='firstPageBtn']").click();
        
        // Step 14: Wait until the text "Showing page 1 of 2" is present on the current page
        console.log('[Telegram Management Table Test] Step 14: Wait until the text "Showing page 1 of 2" is present on the current page.');
        await expect(page.getByText('Showing page 1 of 2')).toBeVisible({ timeout: 15000 });
        
        // Step 15: Verify that the current page displays text "Showing page 1 of 2"
        console.log('[Telegram Management Table Test] Step 15: Verify that the current page displays text "Showing page 1 of 2".');
        await expect(page.getByText('Showing page 1 of 2')).toBeVisible();
        
        // Step 16: Click on Row Dropdown
        console.log('[Telegram Management Table Test] Step 16: Click on Row Dropdown.');
        await page.locator("[data-test-id='rowDropdown']").selectOption("20");
        
        // Step 17: Select Row Dropdown value=20 (completed in previous step)
        console.log('[Telegram Management Table Test] Step 17: Row Dropdown value=20 selected.');
        
        // Step 18: Wait until the text "Showing page 1 of 1" is present on the current page
        console.log('[Telegram Management Table Test] Step 18: Wait until the text "Showing page 1 of 1" is present on the current page.');
        await expect(page.getByText('Showing page 1 of 1')).toBeVisible({ timeout: 15000 });
        
        // Step 19: Verify that the current page displays text "Showing page 1 of 1"
        console.log('[Telegram Management Table Test] Step 19: Verify that the current page displays text "Showing page 1 of 1".');
        await expect(page.getByText('Showing page 1 of 1')).toBeVisible();
        
        // Step 20: Click on Edit Column Btn
        console.log('[Telegram Management Table Test] Step 20: Click on Edit Column Btn.');
        await page.locator("[data-test-id='column-btn']").click();
        
        // Step 21: Click on Telegram Management - Message name checkbox
        console.log('[Telegram Management Table Test] Step 21: Click on Telegram Management - Message name checkbox.');
        await page.locator("input[type='checkbox']").first().click();
        
        // Step 22: Click on Edit Column Btn
        console.log('[Telegram Management Table Test] Step 22: Click on Edit Column Btn.');
        await page.locator("[data-test-id='column-btn']").click();
        
        // Step 23: Verify that the current page does not displays text "Message Name"
        console.log('[Telegram Management Table Test] Step 23: Verify that the current page does not displays text "Message Name".');
        await expect(page.getByText('Message Name')).not.toBeVisible();
        
        // Close the column filter popup by clicking elsewhere on the screen
        console.log('[Telegram Management Table Test] Step 23a: Close column filter popup by clicking elsewhere.');
        await page.click('body', { position: { x: 100, y: 100 } });
        await page.waitForTimeout(1000);
        
        // Step 24: Click on btn_search_toggle
        console.log('[Telegram Management Table Test] Step 24: Click on btn_search_toggle.');
        await page.locator("[data-test-id='search-toggle']").click();
        
        // Step 25: Enter "DO NOT DELETE THIS" in the text_search_input field
        console.log('[Telegram Management Table Test] Step 25: Enter "DO NOT DELETE THIS" in the text_search_input field.');
        await page.locator("[data-test-id='search-input']").fill('DO NOT DELETE THIS');
        
        // Step 26: Press Enter/Return Key
        console.log('[Telegram Management Table Test] Step 26: Press Enter/Return Key.');
        await page.keyboard.press('Enter');
        
        // Step 27: Wait for 5 seconds
        console.log('[Telegram Management Table Test] Step 27: Wait for 5 seconds.');
        await page.waitForTimeout(5000);
        
        // Step 28: Verify that the current page displays text "DO NOT DELETE THIS"
        console.log('[Telegram Management Table Test] Step 28: Verify that the current page displays text "DO NOT DELETE THIS".');
        await expect(page.getByText('DO NOT DELETE THIS')).toBeVisible();
        
        console.log('[Telegram Management Table Test] Telegram management additional table functionality test completed successfully.');
    });
});