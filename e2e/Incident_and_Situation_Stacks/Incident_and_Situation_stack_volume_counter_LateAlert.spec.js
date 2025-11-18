// e2e/Incident_and_Situation_stack_volume_counter_LateAlert.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Incident and Situation stack volume counter LateAlert', () => {
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
        
     
    });    test('should verify incident stack volume counter changes correctly', async ({ page }) => {
        console.log('[IncidentStackCounter] Starting incident stack volume counter test...');
        
        // Step 1: Authenticate and setup
        console.log('[IncidentStackCounter] Step 1: Performing authentication and setup...');
        await sharedTestSteps.authenticateAndSetup(USERNAME ?? '', PASSWORD ?? '');
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        console.log('[IncidentStackCounter] Authentication completed successfully.');

        // Step 2: Select 1 SIte (Pty) Ltd company first to verify 0 Groups
        console.log('[IncidentStackCounter] Step 2: Selecting 1 SIte (Pty) Ltd company...');
        await sharedTestSteps.selectCompany('1 SIte (Pty) Ltd');
        await expect(page.getByText('0 Groups')).toBeVisible({ timeout: 15000 });
        console.log('[IncidentStackCounter] ✅ Verified 1 SIte (Pty) Ltd shows "0 Groups"');

        // Step 3: Select Automation company
        console.log('[IncidentStackCounter] Step 3: Selecting Automation company...');
        await sharedTestSteps.selectCompany('Automation company');
        console.log('[IncidentStackCounter] Automation company selected successfully.');
        
        // Step 4: Apply generic manual alert stack filter
        console.log('[IncidentStackCounter] Step 4: Applying manual alert stack filter...');
        await sharedTestSteps.genericManualAlertStackFilter();
        console.log('[IncidentStackCounter] Manual alert stack filter applied successfully.');
        
        // Step 5: Verify initial state shows "0 Groups"
        console.log('[IncidentStackCounter] Step 5: Verifying initial "0 Groups" counter...');
        await expect(page.getByText('0 Groups')).toBeVisible({ timeout: 15000 });
        console.log('[IncidentStackCounter] ✅ Verified initial state shows "0 Groups"');
        
        // Step 6: Create manual alert
        console.log('[IncidentStackCounter] Step 6: Creating manual alert...');
        await sharedTestSteps.createManualAlert();
        console.log('[IncidentStackCounter] Manual alert created successfully.');
        
        // Step 7: Navigate back to Command
        console.log('[IncidentStackCounter] Step 7: Navigating back to Command...');
        await sharedTestSteps.navigateToMenu('Command');
        console.log('[IncidentStackCounter] Navigation back to Command completed.');
        
        // Step 8: Verify counter now shows "1 Groups"
        console.log('[IncidentStackCounter] Step 8: Verifying "1 Groups" counter after alert creation...');
        await expect(page.getByText('1 Groups')).toBeVisible({ timeout: 15000 });
        console.log('[IncidentStackCounter] ✅ Verified counter shows "1 Groups" after alert creation');
        
        // Step 9: Expand and select manual card
        console.log('[IncidentStackCounter] Step 9: Expanding and selecting manual card...');
        await sharedTestSteps.expandAndSelectManualCard();
        
        // Step 10: Complete SOP
        console.log('[IncidentStackCounter] Step 10: Completing SOP...');
        await sharedTestSteps.completeSOP();
        
        // Step 11: Click Escalate Button
        console.log('[IncidentStackCounter] Step 11: Clicking escalate button...');
        await sharedTestSteps.escalateSOP();
        console.log('[IncidentStackCounter] Escalate button clicked successfully.');
        
        // Step 12: Switch to Situation Stack and Verify Manual Alert is Present
        console.log('[IncidentStackCounter] Step 12: Switching to Situation Stack and verifying manual alert...');
        await sharedTestSteps.switchToSituationStack();
        await expect(page.getByText('1 Groups')).toBeVisible({ timeout: 15000 });

        // Step 13: Ensure Late Alert suppression indicator is present in Situation Stack
        console.log('[IncidentStackCounter] Step 13: Verifying Late Alert suppression indicator is present in Situation Stack...');
        await expect(page.locator('span[popup-top="Late alert suppression active"]')).toBeVisible({ timeout: 15000 });
        console.log('[IncidentStackCounter] ✅ Verified Late Alert suppression indicator is present in Situation Stack');
        
        // Step 14: Select different company (1 SIte (Pty) Ltd)
        console.log('[IncidentStackCounter] Step 14: Selecting 1 SIte (Pty) Ltd company...');
        await sharedTestSteps.selectCompany('1 SIte (Pty) Ltd');
        console.log('[IncidentStackCounter] 1 SIte (Pty) Ltd company selected successfully.');
        
        // Step 15: Verify counter returns to "0 Groups" after company switch
        console.log('[IncidentStackCounter] Step 15: Verifying "0 Groups" counter after company switch...');
        await expect(page.getByText('0 Groups')).toBeVisible({ timeout: 15000 });
        console.log('[IncidentStackCounter] ✅ Verified counter shows "0 Groups" after company switch');

        // Step 16: Switch to Situation Stack for 1 SIte (Pty) Ltd
        console.log('[IncidentStackCounter] Step 16: Switching to Situation Stack for 1 SIte (Pty) Ltd...');
        await sharedTestSteps.switchToSituationStack();
        await expect(page.getByText('0 Groups')).toBeVisible({ timeout: 15000 });

        // Step 17: Ensure Late Alert suppression indicator is not present in Situation Stack
        console.log('[IncidentStackCounter] Step 17: Verifying Late Alert suppression indicator is not present in Situation Stack...');
        await expect(page.locator('span[popup-top="Late alert suppression active"]')).toBeHidden({ timeout: 15000 });
        console.log('[IncidentStackCounter] ✅ Verified Late Alert suppression indicator is not present in Situation Stack');
    

        console.log('[IncidentStackCounter] Incident stack volume counter test completed successfully!');
    });

    test.afterEach(async ({ page }) => {
        console.log('[IncidentStackCounter] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedTestSteps.selectCompany('Automation company');
            
            // Step 3: Clean manual alerts (this test creates manual alerts)
            await sharedTestSteps.cleanupManualAlerts();
            
            // Step 4: Reset stack filters
            await sharedTestSteps.resetStackFilter();
            
            console.log('[IncidentStackCounter] Cleanup completed successfully');
        } catch (error) {
            console.log(`[IncidentStackCounter] Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
            // Don't fail test due to cleanup issues
        }
    });

});
