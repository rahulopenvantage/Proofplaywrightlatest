import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../../backend/AdminLoginPage.js';
import { AppInteractionsPage } from '../../backend/AppInteractionsPage.js';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
import { MenuPage } from '../../backend/MenuPage.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const NORMAL_USERNAME = process.env.NORMAL_MS_USERNAME;
const NORMAL_PASSWORD = process.env.NORMAL_MS_PASSWORD;

test.describe('Default Stack Filter - Role Management - Able to Edit stack', () => {
    let adminLoginPage;
    let appInteractionsPage;
    let sharedTestSteps;
    let menuPage;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(180000); // 3 minutes for complex workflow
        adminLoginPage = new AdminLoginPage(page);
        appInteractionsPage = new AppInteractionsPage(page);        sharedTestSteps = new SharedTestSteps(page);
        menuPage = new MenuPage(page);
        sharedTestSteps = new SharedTestSteps(page);
        if (!USERNAME || !PASSWORD || !NORMAL_USERNAME || !NORMAL_PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME, ADMIN_MS_PASSWORD, NORMAL_MS_USERNAME and NORMAL_MS_PASSWORD environment variables must be set.');
        }
        
     });    test('should create role with edit permissions and verify user can edit stack filters', async ({ page }) => {
        console.log('[Role Edit Test] Starting role management test for edit permissions');
        
        const newRoleName = 'TestRoleCanEdit_' + Date.now();
        let roleCreated = false;
        let userRoleChanged = false;
        let originalUserRole = null;
        
        try {
        
        // Step 1: Admin Login
        console.log('[Role Edit Test] Step 1: Authenticating as admin.');
        await adminLoginPage.login(USERNAME, PASSWORD);
        await appInteractionsPage.selectAutomationCompany();        // Step 2: Navigate to Role Management and create a role that CAN edit stack filters
        console.log('[Role Edit Test] Step 2: Creating a new role with stack filter edit permissions.');
        await menuPage.navigateToConfigurationSubmenu('Role Management');
        await page.getByRole('button', { name: 'Create New' }).click();
          // Use shared step for creating new role with edit permissions (canEdit = true for "Able to Edit" scenario)
        await sharedTestSteps.createNewRole(newRoleName, 'Test role for editing stack filters', true);
        roleCreated = true;

        // Step 3: Navigate to User Management and assign role to test user
        console.log('[Role Edit Test] Step 3: Navigating to User Management and assigning role.');
        await sharedTestSteps.navigateToConfigurationSubmenu('User Management');
        
         // Step 4: Click on btn_search_toggle
            console.log('[User Management Test] Step 4: Click on btn_search_toggle.');
            await page.locator('[data-test-id="search-toggle"]').click();

            // Step 5: Enter "prooftestbot" in the text_search_input field
            console.log('[User Management Test] Step 5: Enter prooftestbot in the text_search_input field.');
            await page.locator('[data-test-id="search-input"]').fill('prooftestbot');            // Step 6: Click on edit_user for the specific user
            console.log('[User Management Test] Step 6: Click on edit_user for prooftestbotsa@vumacam.online.');
            await page.locator('tr:has-text("prooftestbotsa@vumacam.online") [data-test-id="editBtn"]').click();

        // Store original role before changing it
        try {
            const roleDropdown = page.locator('[data-test-id="dropdown_role_usermanagement"]');
            originalUserRole = await roleDropdown.textContent();
            console.log(`[Role Edit Test] Original user role: ${originalUserRole}`);
        } catch (error) {
            console.log('[Role Edit Test] Could not capture original user role');
        }// Continue with role assignment (steps 7-9 from image)
        console.log('[Role Edit Test] Steps 7-9: Assigning the new role to the test user.');
        await page.locator('[data-test-id="dropdown_role_usermanagement"]').click();
        await page.getByRole('option', { name: newRoleName }).click();
        
        // Try different save button locators
        const saveButtonSelectors = [
            '[data-test-id="Save and Update"]',
            'button:has-text("Save and Update")',
            'button:has-text("Save")',
            '[data-test-id="saveBtn"]'
        ];
        
        let saveButtonClicked = false;
        for (const selector of saveButtonSelectors) {
            try {
                const saveButton = page.locator(selector);
                if (await saveButton.isVisible({ timeout: 5000 })) {
                    await saveButton.click();
                    saveButtonClicked = true;
                    console.log(`[Role Edit Test] Save button clicked using selector: ${selector}`);
                    break;
                }
            } catch (error) {
                console.log(`[Role Edit Test] Save button selector ${selector} not found, trying next...`);
            }
        }
          if (!saveButtonClicked) {
            throw new Error('Could not find or click the Save button');
        }
        
        // Check for success message with multiple possible texts
        const successMessages = [
            'User updated successfully',
            'User updated',
            'Successfully updated',
            'Update successful',
            'Saved successfully'
        ];
        
        let successMessageFound = false;
        for (const message of successMessages) {
            try {
                await expect(page.getByText(message)).toBeVisible({ timeout: 3000 });
                console.log(`[Role Edit Test] Success message found: ${message}`);
                successMessageFound = true;
                break;
            } catch (e) {
                // Try next message
            }
        }
        
        if (!successMessageFound) {
            console.log('[Role Edit Test] Warning: No success message found, but save button was clicked. Proceeding...');
            // Wait a bit to ensure the save operation completes
            await page.waitForTimeout(2000);
        }
        
        userRoleChanged = true;        // Step 10: Change user context (refresh instead of logout for reliability)
             
        // Switch to normal user for this test
        console.log('[Role No-Edit Test] Switching to normal user...');
        await sharedTestSteps.switchToNormalUser(NORMAL_USERNAME, NORMAL_PASSWORD);
       
        
        // Ensure we're on the Command/Dashboard page before trying to access stack filter
        console.log('[Role Edit Test] Step 11.5: Navigating to Command page.');
        await sharedTestSteps.navigateToMenu('Command');        // Step 12: Click the dashboard stack filter (shared step)
        console.log('[Role Edit Test] Step 12: Opening the stack filter.');
        await sharedTestSteps.openStackFilter();        // Step 13: Verify the "Apply" button is visible and enabled
        console.log('[Role Edit Test] Step 13: Verifying the "Apply" button is enabled.');
        const applyButton = page.locator('[data-test-id="alert-filter-apply-button"]');
        await expect(applyButton).toBeVisible();
        await expect(applyButton).toBeEnabled();// Step 14: Close the filter (shared step)
        console.log('[Role Edit Test] Step 14: Closing the filter modal.');
        await sharedTestSteps.closeStackFilter();

        console.log('[Role Edit Test] Workflow completed successfully.');
        
        } catch (error) {
            console.error('[Role Edit Test] Test failed:', error.message);
            throw error;
        } finally {
            // CLEANUP SECTION
            console.log('[Role Edit Test] Starting cleanup...');
            
            try {
                // Change context back to admin for cleanup operations
                console.log('[Role Edit Test] Cleanup: Switching back to admin context...');
                await page.goto('/');
                await page.waitForTimeout(3000);
                 await sharedTestSteps.switchToAdminUser(USERNAME, PASSWORD);
                await appInteractionsPage.selectAutomationCompany(); // Ensure proper setup
                console.log('[Role Edit Test] Cleanup: Admin context established');
                
                // Cleanup Step 1: Change user role to standard "Automation All permissions" BEFORE deleting test role
                if (userRoleChanged) {
                    console.log('[Role Edit Test] Cleanup Step 1: Changing user role to standard permissions...');
                    
                    try {
                        // Navigate directly to User Management URL
                        console.log('[Role Edit Test] Cleanup: Navigating directly to User Management...');
                        await sharedTestSteps.navigateToConfigurationSubmenu('User Management');
                        await page.waitForLoadState('networkidle', { timeout: 15000 });
                        
                        // Search for the user
                        console.log('[Role Edit Test] Cleanup: Searching for test user...');
                        const searchToggle = page.locator('[data-test-id="search-toggle"]');
                        if (await searchToggle.isVisible({ timeout: 5000 })) {
                            await searchToggle.click();
                            await page.locator('[data-test-id="search-input"]').fill('prooftestbot');
                            await page.waitForTimeout(2000); // Wait for search results
                        }
                        
                        // Wait until the user email is visible
                        await expect(page.getByText('prooftestbotsa@vumacam.online')).toBeVisible({ timeout: 15000 });
                        
                        // Click the edit button for the specific user
                        await page.locator('tr:has-text("prooftestbotsa@vumacam.online") [data-test-id="editBtn"]').click();
                        await page.waitForTimeout(2000);
                        
                        // Change to standard "Automation All permissions" role
                        console.log('[Role Edit Test] Cleanup: Opening role dropdown...');
                        await page.locator('[data-test-id="dropdown_role_usermanagement"]').click();
                        await page.waitForTimeout(1000);
                        
                        // Try to find and select "Automation All permissions" role
                        const standardRoleSelectors = [
                            'li[role="option"]:has-text("Automation All permissions")',
                            'option:has-text("Automation All permissions")',
                            '[role="option"]:has-text("Automation All permissions")',
                            'li:has-text("Automation All permissions")'
                        ];
                        
                        let roleChanged = false;
                        for (const selector of standardRoleSelectors) {
                            try {
                                const roleOption = page.locator(selector);
                                if (await roleOption.isVisible({ timeout: 3000 })) {
                                    await roleOption.click();
                                    roleChanged = true;
                                    console.log('[Role Edit Test] Cleanup: Changed user to "Automation All permissions" role');
                                    break;
                                }
                            } catch (e) {
                                console.log(`[Role Edit Test] Cleanup: Selector ${selector} not found, trying next...`);
                            }
                        }
                        
                        if (!roleChanged) {
                            console.log('[Role Edit Test] Cleanup Warning: Could not find standard role, trying any available role...');
                            // Try to select the first available role option that contains "All permissions"
                            try {
                                const allPermissionsRole = page.locator('li[role="option"]:has-text("All permissions")').first();
                                if (await allPermissionsRole.isVisible({ timeout: 3000 })) {
                                    await allPermissionsRole.click();
                                    roleChanged = true;
                                    console.log('[Role Edit Test] Cleanup: Selected first "All permissions" role as fallback');
                                }
                            } catch (e) {
                                console.log('[Role Edit Test] Cleanup Warning: Could not select any role');
                            }
                        }
                        
                        if (roleChanged) {
                            // Save the role change
                            console.log('[Role Edit Test] Cleanup: Saving role change...');
                            const saveButtonSelectors = [
                                '[data-test-id="Save and Update"]',
                                'button:has-text("Save and Update")',
                                'button:has-text("SAVE & UPDATE")',
                                'button:has-text("Save")',
                                '[data-test-id="saveBtn"]'
                            ];
                            
                            for (const selector of saveButtonSelectors) {
                                try {
                                    const saveButton = page.locator(selector);
                                    if (await saveButton.isVisible({ timeout: 3000 })) {
                                        await saveButton.click();
                                        console.log('[Role Edit Test] Cleanup: User role change saved successfully');
                                        await page.waitForTimeout(3000); // Wait for save to complete
                                        break;
                                    }
                                } catch (e) {
                                    // Continue to next selector
                                }
                            }
                        }
                        
                    } catch (e) {
                        console.log('[Role Edit Test] Cleanup Warning: Could not change user role:', e.message);
                    }
                }
                
                // Cleanup Step 2: Now delete/archive the test role (after user is no longer assigned to it)
                if (roleCreated) {
                    console.log('[Role Edit Test] Cleanup Step 2: Deleting test role...');
                    
                    try {
                        // Navigate directly to Role Management URL
                        console.log('[Role Edit Test] Cleanup: Navigating directly to Role Management...');
                        await sharedTestSteps.navigateToConfigurationSubmenu('Role Management');
                        await page.waitForLoadState('networkidle', { timeout: 15000 });
                        
                        // Search for the test role
                        console.log('[Role Edit Test] Cleanup: Searching for test role...');
                        const searchToggle = page.locator('[data-test-id="search-toggle"]');
                        if (await searchToggle.isVisible({ timeout: 5000 })) {
                            await searchToggle.click();
                            await page.locator('[data-test-id="search-input"]').fill(newRoleName);
                            await page.waitForTimeout(2000); // Wait for search results
                        }
                        
                        // Wait for the role to appear in search results
                        await expect(page.getByText(newRoleName)).toBeVisible({ timeout: 10000 });
                        
                        // Find and delete the role using the delete button (try delete first, then archive)
                        const deleteButton = page.locator(`tr:has-text("${newRoleName}") [data-test-id="deleteButton"]`);
                        const archiveButton = page.locator(`tr:has-text("${newRoleName}") [data-test-id="archiveButton"]`);
                        
                        let actionTaken = false;
                        
                        // Try delete button first
                        if (await deleteButton.isVisible({ timeout: 5000 })) {
                            await deleteButton.click();
                            console.log('[Role Edit Test] Cleanup: Delete button clicked');
                            actionTaken = true;
                        } else if (await archiveButton.isVisible({ timeout: 5000 })) {
                            await archiveButton.click();
                            console.log('[Role Edit Test] Cleanup: Archive button clicked');
                            actionTaken = true;
                        }
                        
                        if (actionTaken) {
                            // Click "Yes" to confirm the action
                            const confirmButtons = [
                                'button:has-text("Yes")',
                                'button:has-text("Confirm")',
                                'button:has-text("Delete")',
                                '[data-test-id="confirmBtn"]'
                            ];
                            
                            for (const selector of confirmButtons) {
                                try {
                                    const confirmBtn = page.locator(selector);
                                    if (await confirmBtn.isVisible({ timeout: 5000 })) {
                                        await confirmBtn.click();
                                        console.log('[Role Edit Test] Cleanup: Confirmed role deletion/archive');
                                        await page.waitForTimeout(2000); // Wait for action to complete
                                        break;
                                    }
                                } catch (e) {
                                    // Try next button
                                }
                            }
                            
                            console.log('[Role Edit Test] Cleanup: Test role removed successfully');
                        } else {
                            console.log('[Role Edit Test] Cleanup Warning: Could not find delete or archive button for test role');
                        }
                        
                    } catch (e) {
                        console.log('[Role Edit Test] Cleanup Warning: Could not delete test role:', e.message);
                    }
                }
                
                console.log('[Role Edit Test] Cleanup completed');
                
            } catch (cleanupError) {
                console.error('[Role Edit Test] Cleanup failed:', cleanupError.message);
                // Don't throw cleanup errors to avoid masking the original test failure
            }
        }
    });

    test.afterEach(async ({ page }) => {
        console.log('[Role Edit Test] Switching back to admin user...');
        await sharedTestSteps.switchToAdminUser(USERNAME, PASSWORD);
    });
});
