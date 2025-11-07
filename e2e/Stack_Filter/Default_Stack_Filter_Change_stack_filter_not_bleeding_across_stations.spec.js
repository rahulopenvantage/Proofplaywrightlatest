import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../../backend/AdminLoginPage.js';
import { AppInteractionsPage } from '../../backend/AppInteractionsPage.js';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
import { MenuPage } from '../../backend/MenuPage.js';
import { ApiHelper } from '../../backend/ApiHelper.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const NORMAL_USERNAME = process.env.NORMAL_MS_USERNAME;
const NORMAL_PASSWORD = process.env.NORMAL_MS_PASSWORD;
const ADMIN_USERNAME = process.env.ADMIN_MS_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Default Stack Filter - Change stack filter / Filter persistence between stations validation', () => {
    let adminLoginPage;
    let appInteractionsPage;
    let sharedTestSteps;
    let menuPage;
    let apiHelper;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(180000); // 3 minutes for complex workflow
        adminLoginPage = new AdminLoginPage(page);
        appInteractionsPage = new AppInteractionsPage(page);
        sharedTestSteps = new SharedTestSteps(page);
        menuPage = new MenuPage(page);
        apiHelper = new ApiHelper();

        if (!NORMAL_USERNAME || !NORMAL_PASSWORD || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
            throw new Error('NORMAL_MS_USERNAME, NORMAL_MS_PASSWORD, ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Validate API configuration
        if (!apiHelper.validateApiConfig()) {
            throw new Error('API configuration is invalid. Check environment variables.');
        }
        
        // Send TREX alerts to create test data
        console.log('[E2E Filter Isolation Test] Sending TREX alerts for test data...');
        const trexResult = await apiHelper.sendAlert('trex_public');
        expect(trexResult.status).toBe(200);
        
        // Allow time for alerts to be processed
        await page.waitForTimeout(3000);
        
        await page.goto('https://uat.proof360.io/');
        
        // Steps 1-2: Login using enhanced switchToNormalUser with built-in retry logic
        console.log('[E2E Filter Isolation Test] Step 1-2: Switching to normal user...');
        await sharedTestSteps.switchToNormalUser();
        
        // Navigate to command if not already there
        console.log(`[E2E Filter Isolation Test] Current URL after login: ${page.url()}`);
        if (!page.url().includes('command')) {
            console.log('[E2E Filter Isolation Test] Not on command page, navigating...');
            await sharedTestSteps.navigateToMenu('Command');
        }
        
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        console.log('[E2E Filter Isolation Test] ✅ Login completed successfully');
    });

    test('should verify filter persistence between stations (filters remain active)', async ({ page }) => {
        console.log('[E2E Filter Isolation Test] Starting filter isolation test'); 

        // Step 3: Change Station to Automation test
        console.log('[E2E Filter Isolation Test] Step 3: Change Station to Automation test.');
        await sharedTestSteps.changeStationToAutomationTest();
        
        // Step 4: Navigate to Dashboard (skipping station management filter configuration)
        console.log('[E2E Filter Isolation Test] Step 4: Navigating to Dashboard.');
        await sharedTestSteps.navigateToMenu('Command');

        // Step 5: Apply specific alert stack filter (Shared Step)
        console.log('[E2E Filter Isolation Test] Step 5: Applying WVRD stack filter.');
        await sharedTestSteps.applyTrexFilter(); // Using available shared step

        // Step 6: Verify that accordion cards are displayed (any UB/Trex cards)
        console.log('[E2E Filter Isolation Test] Step 6: Verifying accordion cards are visible.');
        const accordionCards = page.locator('[data-test-id="aggregated-site-card"]');
        await expect(accordionCards.first()).toBeVisible({ timeout: 15000 });

        // Step 7: Change Station to ALL
        console.log('[E2E Filter Isolation Test] Step 7: Changing Station to ALL.');
        await sharedTestSteps.changeStationToAll();

        // Step 8: Verify Trex filter IS checked for "ALL" station (filters persist across stations) with retry
        console.log('[E2E Filter Isolation Test] Step 8: Verifying Trex filter state for "ALL" station with retry logic...');
        
        let verificationAttempts = 0;
        const maxVerificationAttempts = 3;
        let verificationSuccessful = false;
        
        while (verificationAttempts < maxVerificationAttempts && !verificationSuccessful) {
            try {
                verificationAttempts++;
                console.log(`[E2E Filter Isolation Test] Step 8: Verification attempt ${verificationAttempts}/${maxVerificationAttempts}`);
                
                await sharedTestSteps.openStackFilter();
                console.log('[E2E Filter Isolation Test] Step 8: Verify Trex filter IS checked for "ALL" station (filters persist correctly).');
                await sharedTestSteps.verifyTrexFilterChecked();
                console.log('[E2E Filter Isolation Test] Step 8: Filter verification completed.');
                verificationSuccessful = true;
                
            } catch (error) {
                console.log(`[E2E Filter Isolation Test] Step 8: Verification attempt ${verificationAttempts} failed: ${error.message}`);
                
                // Try to close any open modals before retry
                try {
                    await sharedTestSteps.closeStackFilter();
                } catch (closeError) {
                    console.log('[E2E Filter Isolation Test] Modal already closed or not found');
                }
                
                if (verificationAttempts >= maxVerificationAttempts) {
                    console.log(`[E2E Filter Isolation Test] ❌ All ${maxVerificationAttempts} verification attempts failed`);
                    throw new Error(`Step 8 verification failed after ${maxVerificationAttempts} attempts. Last error: ${error.message}`);
                }
                
                // Wait before retry
                console.log(`[E2E Filter Isolation Test] Waiting 3 seconds before retry...`);
                await page.waitForTimeout(3000);
            }
        }

        // Step 9: Change Station back to Automation test
        console.log('[E2E Filter Isolation Test] Step 9: Change Station back to Automation test.');
        await sharedTestSteps.changeStationToAutomationTest();

        // Step 10: Verify Trex filter IS still checked when returning to Automation test (filters persist)
        console.log('[E2E Filter Isolation Test] Step 10: Opening filter modal to verify Trex filter state for "Automation test" station.');
        await sharedTestSteps.openStackFilter();
        console.log('[E2E Filter Isolation Test] Step 10: Verify Trex filter IS still checked when returning to Automation test (filters persist).');
        await sharedTestSteps.verifyTrexFilterChecked();
        console.log('[E2E Filter Isolation Test] Step 10: Filter verification completed.');        console.log('[E2E Filter Isolation Test] ✅ Filter persistence test completed successfully - Filters persist between stations.');
    });
    
    test.afterEach(async ({ page }) => {
        console.log('[E2E Filter Isolation Test] Starting cleanup...');
        
        try {
            // Reset to default state
            await sharedTestSteps.cleanupUBAndTrexAlerts("WVRD_9th");
           
            console.log('[E2E Filter Isolation Test] Cleanup completed successfully');
        } catch (error) {
            console.log(`[E2E Filter Isolation Test] Cleanup failed: ${error.message}`);
            // Don't fail the test if cleanup fails
        }
        
        // Switch back to admin user
        console.log('[E2E Filter Isolation Test] Switching back to admin user...');
        await sharedTestSteps.switchToAdminUser(ADMIN_USERNAME, ADMIN_PASSWORD);
    });
});
