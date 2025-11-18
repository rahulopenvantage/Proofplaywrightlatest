import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
import { ApiHelper } from '../../backend/ApiHelper.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Dashboard - Company alerts not bleeding over', () => {
    let sharedSteps;
    let apiHelper;
    
    test.beforeEach(async ({ page }) => {
        test.setTimeout(300000); // 5 minutes for complex operations with multiple cleanups
        
        // Instantiate helpers
        sharedSteps = new SharedTestSteps(page);
        apiHelper = new ApiHelper();
        
        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Validate API configuration
        if (!apiHelper.validateApiConfig()) {
            throw new Error('API configuration is invalid. Check UAT_URL and UAT_SASKEY environment variables.');
        }
    });

    test('should not show alerts from one company after switching to another', async ({ page }) => {
        console.log('[Company Alert Isolation] Starting test flow...');
        
        // Step 1: Send TREX Private alerts to create test data
        console.log('[Company Alert Isolation] Step 1: Send TREX Private alerts for test data');
        const trexPrivateResult = await apiHelper.sendAlert('trex_private');
        expect(trexPrivateResult.status).toBe(200);
        
        // Step 2: Send TREX Public alerts to create test data
        console.log('[Company Alert Isolation] Step 2: Send TREX Public alerts for test data');
        const trexPublicResult = await apiHelper.sendAlert('trex_public');
        expect(trexPublicResult.status).toBe(200);
        
        // Allow time for alerts to be processed
        await page.waitForTimeout(5000);
        
        // Step 3: Navigate to application and login
        console.log('[Company Alert Isolation] Step 3: Navigate to application and admin login');
        await page.goto('https://uat.proof360.io/');
        await sharedSteps.login(USERNAME, PASSWORD);
        
        // Step 4: Select Vodacom Company
        console.log('[Company Alert Isolation] Step 4: Select Vodacom Company');
        await sharedSteps.selectCompany('Vodacom');
        
        // Wait for company switch to complete
        await page.waitForTimeout(3000);
        await page.waitForLoadState('domcontentloaded');
        
        // Step 5: Apply target site stacks filter
        console.log(`[Company Alert Isolation] Step 5: Apply ${process.env.trex_private} stack filter`);
        await sharedSteps.stackFilterUBAndTrex(process.env.trex_private);
        
        // Step 6: Verify that current page displays target site aggregated alert card
        console.log(`[Company Alert Isolation] Step 6: Verify ${process.env.trex_private} alert card is displayed`);
        await sharedSteps.expandAndSelectUBAndTrexCard(process.env.trex_private);
        
        // Step 7: Select Automation Company
        console.log('[Company Alert Isolation] Step 7: Select Automation Company');
        await sharedSteps.selectCompany('Automation company');
        
        // Wait for company switch to complete and page to stabilize
        await page.waitForTimeout(3000);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000); // Additional wait for stack to refresh
        
        // Step 8: Verify that target site aggregated alert card is NOT DISPLAYED
        console.log(`[Company Alert Isolation] Step 8: Verify ${process.env.trex_private} alert card is NOT displayed`);
        const targetSiteCard = page.locator(`//span[@data-test-id="aggregated-site-card-name" and contains(text(), "${process.env.trex_private}")]`);
        await expect(targetSiteCard).not.toBeVisible({ timeout: 15000 });
        
        // Step 9: Reset stack filter
        console.log('[Company Alert Isolation] Step 9: Reset stack filter');
        await sharedSteps.resetStackFilter();
        
        // Step 10: Apply WVRD_9th Ave alert stack filter (using trex site)
        console.log('[Company Alert Isolation] Step 10: Apply WVRD_9th Ave stack filter');
        await sharedSteps.stackFilterUBAndTrex(process.env.trex || 'WVRD_9th Ave');

        // Step 11: Click on 1st Aggregated card on stack
        console.log('[Company Alert Isolation] Step 11: Click on first aggregated card');
        await page.waitForTimeout(3000); // Wait for cards to load
        await sharedSteps.expandAndSelectUBAndTrexCard(process.env.trex || 'WVRD_9th Ave');
        
        // Step 12: Click on Map tab (use first() to avoid strict mode violation with multiple map tabs)
        console.log('[Company Alert Isolation] Step 12: Click on Map tab');
        await page.locator('[data-test-id="map-tab"]').first().click();
        
        console.log('[Company Alert Isolation] Test completed successfully.');
    });

    test.afterEach(async ({ page }) => {
        console.log('[Company Alert Isolation] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('https://uat.proof360.io/');
            
            // Step 2: Re-authenticate and select company
            await sharedSteps.login(USERNAME, PASSWORD);
            await sharedSteps.selectCompany('Automation company');
            
            // Step 3: Clean UB/Trex alerts for both sites used in test
            console.log(`[Company Alert Isolation] Cleaning up UB/Trex alerts for ${process.env.trex}...`);
            await sharedSteps.cleanupUBAndTrexAlerts(process.env.trex || 'WVRD_9th Ave');
            
            // Switch to Vodacom and clean up
            await sharedSteps.selectCompany('Vodacom');
            console.log(`[Company Alert Isolation] Cleaning up UB/Trex alerts for ${process.env.trex_private}...`);
            await sharedSteps.cleanupUBAndTrexAlerts(process.env.trex_private);
            
            console.log('[Company Alert Isolation] Cleanup completed successfully');
        } catch (error) {
            console.log(`[Company Alert Isolation] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });
});
