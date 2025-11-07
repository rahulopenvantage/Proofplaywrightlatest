// e2e/Receiving alerts on the Situation stack - Dispatch method.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Switch between the Incident stack and the Situation stack.cy', () => {
    let sharedSteps;
    
    test.beforeEach(async ({ page }) => {
        // Set timeout for each test
        test.setTimeout(300000); // 5 minutes timeout for complex operations
        
        // Instantiate SharedTestSteps for each test
        sharedSteps = new SharedTestSteps(page);
        
        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Authentication and company selection
        console.log('[SwitchStack] Authentication and company selection...');
        await sharedSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        await sharedSteps.selectCompany('Automation company');
    });
     test('Ensure you are able to switch to Incident and situation stack ', async ({ page }) => {
        console.log('Starting workflow test...');
          // Switch to Situation Stack (equivalent to cy.switchToSituationStack())
        console.log('Switching to Situation Stack...');
        await sharedSteps.switchToSituationStack();
        
        // Switch to Incident Stack (equivalent to cy.switchToIncidentStack())
        console.log('Switching to Incident Stack...');
        await sharedSteps.switchToIncidentStack();
       
            
        console.log('Workflow test completed successfully.');
    });

    test.afterEach(async ({ page }) => {
        console.log('[SwitchStack] Starting cleanup process...');
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
            
            console.log('[SwitchStack] Cleanup completed successfully');
        } catch (error) {
            console.log(`[SwitchStack] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });
});
