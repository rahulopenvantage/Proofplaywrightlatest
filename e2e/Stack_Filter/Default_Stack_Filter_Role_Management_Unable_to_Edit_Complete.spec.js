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

test.describe('Default Stack Filter - Role Management - Unable to Edit stack', () => {
    let adminLoginPage;
    let appInteractionsPage;
    let sharedTestSteps;
    let menuPage;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(180000); // 3 minutes for complex workflow
        adminLoginPage = new AdminLoginPage(page);
        appInteractionsPage = new AppInteractionsPage(page);
        sharedTestSteps = new SharedTestSteps(page);
        menuPage = new MenuPage(page);

        if (!USERNAME || !PASSWORD || !NORMAL_USERNAME || !NORMAL_PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME, ADMIN_MS_PASSWORD, NORMAL_MS_USERNAME and NORMAL_MS_PASSWORD environment variables must be set.');
        }
 
    });

    test('should create role without edit permissions and verify user cannot edit stack filters', async ({ page }) => {
        console.log('[Role No-Edit Test] Starting role management test for no edit permissions');
        
        const newRoleName = 'TestRoleCannotEdit_' + Date.now();
        let roleCreated = false;
        let userRoleChanged = false;
        let originalUserRole = null;
        
        try {
        
        // Step 1: Admin Login
        console.log('[Role No-Edit Test] Step 1: Authenticating as admin.');
        await adminLoginPage.login(USERNAME, PASSWORD);
        await appInteractionsPage.selectAutomationCompany();

        // Step 2: Navigate to Role Management and create a role that CANNOT edit stack filters
        console.log('[Role No-Edit Test] Step 2: Creating a new role with stack filter edit permissions disabled.');
        await menuPage.navigateToConfigurationSubmenu('Role Management');
        await page.getByRole('button', { name: 'Create New' }).click();
        
        // Use shared step for creating new role with NO edit permissions (canEdit = false for "Unable to Edit" scenario)
        await sharedTestSteps.createNewRole(newRoleName, 'Test role for disabling stack filter edits', false);
        roleCreated = true;

        // Step 3: Navigate to User Management and assign new role to test user  
        console.log('[Role No-Edit Test] Step 3: Assigning role to test user.');
        await sharedTestSteps.navigateToConfigurationSubmenu('User Management');

        // Edit the test user role
        await page.locator('[data-test-id="search-toggle"]').click();
        await page.locator('[data-test-id="search-input"]').fill('prooftestbot');
        await page.waitForTimeout(1000); // Wait for search results to load        // Wait for the target user to be visible and click edit
        const targetUserEmail = 'prooftestbotsa@vumacam.online';
        await expect(page.getByText(targetUserEmail)).toBeVisible({ timeout: 10000 });
        const editUserButton = page.locator(`tr:has-text("${targetUserEmail}") [data-test-id="editBtn"]`);
        await editUserButton.click();        // Store original role for cleanup
        const roleDropdown = page.locator('[data-test-id="dropdown_role_usermanagement"]');
        originalUserRole = await roleDropdown.textContent();
        console.log('[Role No-Edit Test] Original user role:', originalUserRole);

        // Assign the new role
        console.log('[Role No-Edit Test] Steps 7-9: Assigning the new role to the test user.');
        await roleDropdown.click();
        const newRoleOption = page.getByRole('option', { name: newRoleName });
        await newRoleOption.click();        // Save the user changes
        const saveButtonSelectors = [
            '[data-test-id="Save and Update"]',
            'button:has-text("SAVE & UPDATE")',
            'button:has-text("Save and Update")',
            'button:has-text("Save")',
            '[data-test-id="saveBtn"]'
        ];
        
        let saveClicked = false;
        for (const selector of saveButtonSelectors) {
            try {
                const saveButton = page.locator(selector);
                if (await saveButton.isVisible({ timeout: 3000 })) {
                    await saveButton.click();
                    console.log('[Role No-Edit Test] Save button clicked using selector:', selector);
                    saveClicked = true;
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }
        
        if (saveClicked) {
            userRoleChanged = true;
            // Look for success message (optional)
            try {
                await expect(page.getByText('User updated successfully')).toBeVisible({ timeout: 5000 });
                console.log('[Role No-Edit Test] User role assignment successful.');
            } catch (e) {
                console.log('[Role No-Edit Test] Warning: No success message found, but save button was clicked. Proceeding...');
            }
        } else {
            throw new Error('Could not find or click save button');
        }

        // Step 10: Logout and login as test user
        console.log('[Role No-Edit Test] Step 10: Logging out admin and logging in as test user.');
               
        // Switch to normal user for this test
        console.log('[Role No-Edit Test] Switching to normal user...');
        await sharedTestSteps.switchToNormalUser(NORMAL_USERNAME, NORMAL_PASSWORD);     // Step 11: Navigate to Command page
        console.log('[Role No-Edit Test] Step 11: Navigating to Command page.');
        await sharedTestSteps.navigateToMenu('Command');

        // Step 12: Try to open stack filter
        console.log('[Role No-Edit Test] Step 12: Attempting to open stack filter.');
        await sharedTestSteps.openStackFilter();        // Step 13: Verify the "Apply" button is NOT VISIBLE (user cannot edit)
        console.log('[Role No-Edit Test] Step 13: Verifying the "Apply" button is not visible.');
        const applyButton = page.locator('[data-test-id="alert-filter-apply-button"]');
        await expect(applyButton).not.toBeVisible({ timeout: 10000 });
        console.log('[Role No-Edit Test] ✅ Apply button is correctly not visible - user cannot edit stack filters.');

        // Step 14: Close the filter modal
        console.log('[Role No-Edit Test] Step 14: Closing the filter modal.');
        await sharedTestSteps.closeStackFilter();

        console.log('[Role No-Edit Test] Workflow completed successfully.');

        } catch (error) {
            console.error('[Role No-Edit Test] Test failed:', error.message);
            throw error;
        } finally {
            // CLEANUP SECTION
            console.log('[Role No-Edit Test] Starting cleanup...');
            
            try {
                // Change context back to admin for cleanup operations
                console.log('[Role No-Edit Test] Cleanup: Switching back to admin context...');
                await page.goto('/');
                await page.waitForTimeout(3000);
                await sharedTestSteps.switchToAdminUser(USERNAME, PASSWORD);
                await appInteractionsPage.selectAutomationCompany(); // Ensure proper setup
                console.log('[Role No-Edit Test] Cleanup: Admin context established');
                
                // Cleanup Step 1: Change user role to standard "Automation All permissions" BEFORE deleting test role
                if (userRoleChanged) {
                    console.log('[Role No-Edit Test] Cleanup Step 1: Changing user role to standard permissions...');
                    
                    try {
                        // Navigate directly to User Management URL
                        console.log('[Role No-Edit Test] Cleanup: Navigating directly to User Management...');
                        await sharedTestSteps.navigateToConfigurationSubmenu('User Management');
                        await page.waitForLoadState('networkidle', { timeout: 15000 });
                        
                        // Search for the user
                        console.log('[Role No-Edit Test] Cleanup: Searching for test user...');
                        const searchToggle = page.locator('[data-test-id="search-toggle"]');
                        if (await searchToggle.isVisible({ timeout: 5000 })) {
                            await searchToggle.click();
                            await page.locator('[data-test-id="search-input"]').fill('prooftestbot');
                            await page.waitForTimeout(2000); // Wait for search results
                        }
                        
                        // Wait until the user email is visible
                        const targetUserEmail = 'prooftestbotsa@vumacam.online';
                        await expect(page.getByText(targetUserEmail)).toBeVisible({ timeout: 15000 });
                        
                        // Click the edit button for the specific user
                        await page.locator(`tr:has-text("${targetUserEmail}") [data-test-id="editBtn"]`).click();
                        await page.waitForTimeout(2000);
                        
                        // Change to standard "Automation All permissions" role
                        console.log('[Role No-Edit Test] Cleanup: Opening role dropdown...');
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
                                    console.log('[Role No-Edit Test] Cleanup: Changed user to "Automation All permissions" role');
                                    break;
                                }
                            } catch (e) {
                                console.log(`[Role No-Edit Test] Cleanup: Selector ${selector} not found, trying next...`);
                            }
                        }
                        
                        if (!roleChanged) {
                            console.log('[Role No-Edit Test] Cleanup Warning: Could not find standard role, trying any available role...');
                            // Try to select the first available role option that contains "All permissions"
                            try {
                                const allPermissionsRole = page.locator('li[role="option"]:has-text("All permissions")').first();
                                if (await allPermissionsRole.isVisible({ timeout: 3000 })) {
                                    await allPermissionsRole.click();
                                    roleChanged = true;
                                    console.log('[Role No-Edit Test] Cleanup: Selected first "All permissions" role as fallback');
                                }
                            } catch (e) {
                                console.log('[Role No-Edit Test] Cleanup Warning: Could not select any role');
                            }
                        }
                        
                        if (roleChanged) {
                            // Save the role change
                            console.log('[Role No-Edit Test] Cleanup: Saving role change...');
                            const saveButtonSelectors = [
                                '[data-test-id="Save and Update"]',
                                'button:has-text("SAVE & UPDATE")',
                                'button:has-text("Save and Update")',
                                'button:has-text("Save")',
                                '[data-test-id="saveBtn"]'
                            ];
                            
                            for (const selector of saveButtonSelectors) {
                                try {
                                    const saveButton = page.locator(selector);
                                    if (await saveButton.isVisible({ timeout: 3000 })) {
                                        await saveButton.click();
                                        console.log('[Role No-Edit Test] Cleanup: User role change saved successfully');
                                        await page.waitForTimeout(3000); // Wait for save to complete
                                        break;
                                    }
                                } catch (e) {
                                    // Continue to next selector
                                }
                            }
                        }
                        
                    } catch (e) {
                        console.log('[Role No-Edit Test] Cleanup Warning: Could not change user role:', e.message);
                    }
                }
                
                // Cleanup Step 2: Now delete/archive the test role (after user is no longer assigned to it)
                if (roleCreated) {
                    console.log('[Role No-Edit Test] Cleanup Step 2: Deleting test role...');
                    
                    try {
                        // Navigate directly to Role Management URL
                        console.log('[Role No-Edit Test] Cleanup: Navigating directly to Role Management...');
                        await sharedTestSteps.navigateToConfigurationSubmenu('Role Management');
                        await page.waitForLoadState('networkidle', { timeout: 15000 });
                        
                        // Search for the test role
                        console.log('[Role No-Edit Test] Cleanup: Searching for test role...');
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
                            console.log('[Role No-Edit Test] Cleanup: Delete button clicked');
                            actionTaken = true;
                        } else if (await archiveButton.isVisible({ timeout: 5000 })) {
                            await archiveButton.click();
                            console.log('[Role No-Edit Test] Cleanup: Archive button clicked');
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
                                        console.log('[Role No-Edit Test] Cleanup: Confirmed role deletion/archive');
                                        await page.waitForTimeout(2000); // Wait for action to complete
                                        break;
                                    }
                                } catch (e) {
                                    // Try next button
                                }
                            }
                            
                            console.log('[Role No-Edit Test] Cleanup: Test role removed successfully');
                        } else {
                            console.log('[Role No-Edit Test] Cleanup Warning: Could not find delete or archive button for test role');
                        }
                        
                    } catch (e) {
                        console.log('[Role No-Edit Test] Cleanup Warning: Could not delete test role:', e.message);
                    }
                }
                
                console.log('[Role No-Edit Test] Cleanup completed');
                
            } catch (cleanupError) {
                console.error('[Role No-Edit Test] Cleanup failed:', cleanupError.message);
                // Don't throw cleanup errors to avoid masking the original test failure
            }
        }
    });

    test.afterEach(async ({ page }) => {
        console.log('[Role No-Edit Test] Switching back to admin user...');
        await sharedTestSteps.switchToAdminUser(USERNAME, PASSWORD);
    });
});
