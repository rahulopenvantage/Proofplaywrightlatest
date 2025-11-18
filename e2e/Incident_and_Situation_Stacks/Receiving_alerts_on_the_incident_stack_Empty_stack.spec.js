// e2e/Receiving alerts on the incident stack – Empty stack.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Receiving alerts on the incident stack – Empty stack', () => {
    /** @type {SharedTestSteps} */
    let sharedSteps;

    test.beforeEach(async ({ page }) => {
        // Set timeout
        test.setTimeout(120000); // 2 minutes timeout
        
        // Instantiate SharedTestSteps and other Page Objects
        sharedSteps = new SharedTestSteps(page);        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Step 1: Perform login and initial setup
        console.log('[EmptyStack] Step 1: Performing login and setup via beforeEach...');
        await sharedSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 }); // Verify navigation after login
        
        // Step 2: Switch to the appropriate company (1 SIte (Pty) Ltd for empty stack)
        console.log('[EmptyStack] Step 2: Selecting 1 SIte (Pty) Ltd company...');
        await sharedSteps.selectCompany('1 SIte (Pty) Ltd');
        console.log('[EmptyStack] Ready for testing after beforeEach login and setup');
    });    test('Ensure no Results Found is displayed for an empty Incident Stack', async ({ page }) => {
        console.log('[EmptyStack] Starting empty Incident Stack test...');
        
        // Step 3: Verify empty stack messages are displayed
        console.log('[EmptyStack] Step 3: Verifying empty stack messages are displayed...');
        await expect(page.getByText('No Results Found'))
            .toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Please adjust your search to see results'))
            .toBeVisible({ timeout: 10000 });
            
        console.log('[EmptyStack] Empty Incident Stack validation completed successfully.');
    });

    test('Ensure no Results Found is displayed for an empty Situation Stack', async ({ page }) => {
        console.log('[EmptyStack] Starting empty Situation Stack test...');
        
        // Step 3: Switch to Situation Stack
        console.log('[EmptyStack] Step 3: Switching to Situation Stack...');
        await sharedSteps.switchToSituationStack();
        
        // Step 4: Verify empty stack messages are displayed
        console.log('[EmptyStack] Step 4: Verifying empty stack messages are displayed...');
        await expect(page.getByText('No Results Found'))
            .toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Please adjust your search to see results'))
            .toBeVisible({ timeout: 10000 });
            
        console.log('[EmptyStack] Empty Situation Stack validation completed successfully.');
    });

    test.afterEach(async ({ page }) => {
        console.log('[EmptyStack] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedSteps.selectCompany('Automation company');
            
            // Step 3: Clean manual alerts
            await sharedSteps.cleanupManualAlerts();
            
            // Step 4: Clean UB/Trex alerts
            await sharedSteps.cleanupUBAndTrexAlerts('WVRD_9th Ave and JG Strydom Rd_62');
            
            // Step 5: Reset stack filters
            await sharedSteps.resetStackFilter();
            
            console.log('[EmptyStack] Cleanup completed successfully');
        } catch (error) {
            console.log(`[EmptyStack] Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
            // Don't fail test due to cleanup issues
        }
    });
});
