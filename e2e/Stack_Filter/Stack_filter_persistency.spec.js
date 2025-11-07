import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Stack filter persistency', () => {
    let sharedTestSteps;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000);
        
        sharedTestSteps = new SharedTestSteps(page);

        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Authentication and company selection
        console.log('[Stack Filter Persistency Test] Authentication and company selection...');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        await sharedTestSteps.selectCompany('Automation company');
    });

    test('should maintain stack filter settings when navigating away and back', async ({ page }) => {
        console.log('[Filter Persistency Test] Starting stack filter persistency test');
        
        // Apply initial filter using shared steps
        console.log('[Filter Persistency Test] Applying initial filter.');
        await sharedTestSteps.genericManualAlertStackFilter(); // This applies the Manual Alert filter        // Steps 4-6: Navigate to Alert Reports page using shared step
        console.log('[Filter Persistency Test] Steps 4-6: Navigating away to Alert Reports.');
        await sharedTestSteps.menuPage.navigateToAlertReports();

        // Step 7: Navigate back to the Dashboard using shared step
        console.log('[Filter Persistency Test] Step 7: Navigating back to the Dashboard.');
        await sharedTestSteps.navigateToMenu('Command'); // 'Command' is the Dashboard        // Step 8: Click on the dashboard stack filter to open it
        console.log('[Filter Persistency Test] Step 8: Opening the stack filter to check its state.');
        const stackFilterButton = page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
        await stackFilterButton.click();

        // Step 9: Verify that the Manual Alert checkbox is still checked
        console.log('[Filter Persistency Test] Step 9: Verifying the Manual Alert filter is still checked.');
        // This locator targets the checkbox associated with the "Manual Alert" text.
        const manualAlertCheckbox = page.locator('[data-test-id="stack-filter-alert-type-Manual Alert"]');
        await expect(manualAlertCheckbox).toBeChecked({ timeout: 10000 });

        console.log('[Filter Persistency Test] Workflow completed successfully.');
    });

    test.afterEach(async ({ page }) => {
        console.log('[Filter Persistency Test] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedTestSteps.selectCompany('Automation company');
            
            // Step 3: Clean manual alerts
            await sharedTestSteps.cleanupManualAlerts();
            
            // Step 4: Reset stack filters
            await sharedTestSteps.resetStackFilter();
            
            console.log('[Filter Persistency Test] Cleanup completed successfully');
        } catch (error) {
            console.log(`[Filter Persistency Test] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });
});
