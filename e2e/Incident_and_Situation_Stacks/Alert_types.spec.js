// Playwright\e2e\visual.spec.js
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
import { ApiHelper } from '../../backend/ApiHelper.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const SITE_NAME = 'WVRD_9th Ave';

test.describe('Alert Types Verification', () => {
    let sharedTestSteps;
    let apiHelper;
    
    test.beforeEach(async ({ page }) => {
        
        test.setTimeout(300000); // 5 minutes for complete workflow
        
        
        sharedTestSteps = new SharedTestSteps(page);
        apiHelper = new ApiHelper();
          
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }

        // Validate API configuration
        const isValid = apiHelper.validateApiConfig();
        if (isValid) {
            console.log('✅ API configuration is valid');
        } else {
            throw new Error('❌ API configuration is invalid - missing required environment variables');
        }

        // Single authentication and setup
        console.log('[AlertTypes] Authentication and company selection...');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await sharedTestSteps.selectCompany('Automation company');

        // Ensure clean test state
        await page.waitForLoadState('networkidle');
     
    });    test('should verify alert types through complete workflow - Manual Alert to UB/Trex processing', async ({ page }) => {
        console.log('[AlertTypes] Starting test flow...');
        
        // Step 1: Send Unusual Behaviour alerts for test data
        console.log('[AlertTypes] Step 1: Send UB alerts for test data');
        await apiHelper.sendAlert('unusual_behaviour');
        
        // Step 2: Authenticate and setup
        console.log('[AlertTypes] Step 2: Authenticate and setup');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await sharedTestSteps.selectCompany('Automation company');

        
       
        console.log('[AlertTypes] Creating manual alert...');
      //  await sharedTestSteps.navigateToMenu('Sites');
        await sharedTestSteps.createManualAlert();
        
      
        
        console.log('[AlertTypes] Navigate to dashboard...');
        await sharedTestSteps.navigateToMenu('Command');

        
        console.log('[AlertTypes] Apply manual alert filter...');
        await sharedTestSteps.genericManualAlertStackFilter();
        
        
        console.log('[AlertTypes] Expand and select manual alert card...');
        await sharedTestSteps.expandAndSelectManualCard();
        
        
        console.log('[AlertTypes] Complete SOP process...');
        await sharedTestSteps.completeSOP();
        
       
        console.log('[AlertTypes] Escalate manual alert...');
        await sharedTestSteps.escalateSOP();
        
        
        console.log('[AlertTypes] Reset stack filter...');
        await sharedTestSteps.resetStackFilter();
        
        
        console.log('[AlertTypes] Apply UB and Trex filter for WVRD site...');
        await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);
            console.log('[AlertTypes] Expand and select UB/Trex alert card...');
        await sharedTestSteps.expandAndSelectUBAndTrexCard(SITE_NAME);
        
       
        console.log('[AlertTypes] Complete SOP process for UB/Trex...');
        await sharedTestSteps.completeSOP();
        
       
        console.log('[AlertTypes] Escalate UB/Trex alert...');
        await sharedTestSteps.escalateSOP();
           console.log('[AlertTypes] Switch to Situation Stack...');
        // Add debugging to see what options are available
        await page.waitForTimeout(2000); // Brief wait for page to stabilize
        console.log('[AlertTypes] Checking available dropdown options...');
        
        // Try to find the dropdown first
        const dropdownOptions = page.getByText('Situation');
        const isVisible = await dropdownOptions.isVisible();
        console.log(`[AlertTypes] Situation option visible: ${isVisible}`);
        
        if (!isVisible) {
            console.log('[AlertTypes] Situation option not visible, checking current stack...');
            // Debug screenshot functionality removed
        }
        
        await sharedTestSteps.switchToSituationStack();
        
          console.log('[AlertTypes] Expand and select UB/Trex alert card');
        await sharedTestSteps.expandAndSelectUBAndTrexCard(SITE_NAME);
        console.log('[AlertTypes] Verify Alert Type displays "Unusual Behaviour"...');
        await expect(page.locator('[data-test-id="alert-card-alertType"]').first()).toHaveText('Unusual Behaviour');
        
        
        console.log('[AlertTypes] Reset stack filter...');
        await sharedTestSteps.resetStackFilter();
        
        
        console.log('[AlertTypes] Apply generic manual alert stack filter...');
        await sharedTestSteps.genericManualAlertStackFilter();
        
        
        console.log('[AlertTypes] Expand and select manual alert card...');
        await sharedTestSteps.expandAndSelectManualCard();        // Verify Alert Type Row displays "Manual Alert"
        console.log('[AlertTypes] Verify Alert Type displays "Manual Alert"...');
        await expect(page.locator('[data-test-id="alert-card-alertType"]').first()).toHaveText('Manual Alert');
                console.log('[AlertTypes] Alert types verification workflow completed successfully!');
    });

    test.afterEach(async ({ page }) => {
        console.log('[AlertTypes] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
            await sharedTestSteps.selectCompany('Automation company');
            
            // Step 3: Clean manual alerts
            await sharedTestSteps.cleanupManualAlerts(SITE_NAME);
            
            // Step 4: Clean UB/Trex alerts (handles UB alerts from API)
            await sharedTestSteps.cleanupUBAndTrexAlerts(SITE_NAME);
            
            // Step 5: Reset stack filters
            await sharedTestSteps.resetStackFilter();
            
            console.log('[AlertTypes] Cleanup completed successfully');
        } catch (error) {
            console.log(`[AlertTypes] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });
});