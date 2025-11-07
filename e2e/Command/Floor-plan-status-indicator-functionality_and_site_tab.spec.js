import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Dashboard - Floor plan & Status Indicator functionality', () => {
    let sharedSteps;
    
    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000); // 2 minutes for complex operations
        
        // Instantiate SharedTestSteps
        sharedSteps = new SharedTestSteps(page);
        
        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME, ADMIN_MS_PASSWORD environment variables must be set.');
        }
    });

    test('should verify floor plan and status indicator functionality', async ({ page }) => {

        test.setTimeout(300000); // 5 minutes
        await page.setDefaultTimeout(30000);
        console.log('[Floor Plan Status] Starting test flow...');
        
        // Step 1: Navigate to url_Trex_Private
        console.log('[Floor Plan Status] Step 1: Navigate to url_Trex_Private');
       // await page.goto(URL_TREX_PRIVATE);
        
        // Step 2: Admin Login and Accept T&Cs
        console.log('[Floor Plan Status] Step 2: Admin Login and Accept T&Cs');
        await sharedSteps.login(USERNAME, PASSWORD);
        
        // Step 3: Select Vodacom Company
        console.log('[Floor Plan Status] Step 3: Select Vodacom Company');
        await sharedSteps.selectCompany('Vumacam');

        await sharedSteps.createManualAlertTheMarc();

        console.log('[Stations Functionality] Step: Navigate to Dashboard');
        await sharedSteps.navigateToMenu('Command');
        
        await sharedSteps.genericManualAlertStackFilter();
        await sharedSteps.expandAndSelectUBAndTrexCard('Entrance');

        
        // Step 6: Click on Floor Plan Tab
        console.log('[Floor Plan Status] Step 6: Click on Floor Plan Tab');
        await page.locator('[data-test-id="floorPlanTab"]').click({ timeout: 30000 });
        
        // Step 7: Wait for 3 seconds
        console.log('[Floor Plan Status] Step 7: Wait for 3 seconds');
        await page.waitForTimeout(3000);
        
        // Step 8: Click on Enlarge floorplan btn (Optional - only if available)
        console.log('[Floor Plan Status] Step 8: Try to click on Enlarge floorplan btn (if available)');
        try {
            const enlargeButton = page.locator('[popup-left="Zoom in"]');
            const smallerButton = page.locator('[popup-left="Zoom Out"]');
            
            await enlargeButton.waitFor({ state: 'visible', timeout: 5000 });
            await enlargeButton.click({ timeout: 30000 });
            
            await smallerButton.waitFor({ state: 'visible', timeout: 5000 });
            await smallerButton.click({ timeout: 30000 });
            
            console.log('[Floor Plan Status] Floor plan zoom buttons clicked successfully');
        } catch (error) {
            console.log('[Floor Plan Status] Floor plan zoom buttons not found - continuing with test');
        }

        // === SITE TAB FUNCTIONALITY TESTING ===
        // Step 10: Click on Site tab
        console.log('[Floor Plan Status] Step 10: Click on Site tab');
        await page.locator('[data-test-id="site-tab"]').click({ timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Step 11: Click on Copy details btn
        console.log('[Floor Plan Status] Step 11: Click on Copy details btn');
        await page.getByText('Copy').first().click();
     //   const copyDetailsButton = page.locator('button:has-text("Copy details"), [data-test-id*="copy"], .copy-button').first();
    //    await copyDetailsButton.scrollIntoViewIfNeeded();
      //  await copyDetailsButton.waitFor({ state: 'visible', timeout: 30000 });
       // await copyDetailsButton.click({ timeout: 30000 });
        await page.waitForTimeout(1000);
        
        // Step 12: Click on Chat Input (comment field)
        console.log('[Floor Plan Status] Step 12: Click on Chat Input (comment field)');
        const chatInput = page.locator('[data-test-id="chatInput"]');
        await chatInput.scrollIntoViewIfNeeded();
        await chatInput.waitFor({ state: 'visible', timeout: 30000 });
        await chatInput.click({ timeout: 30000 });
        await page.waitForTimeout(500);
        
        // Step 13: Press CONTROL(COMMAND) + V Keys
        console.log('[Floor Plan Status] Step 13: Press CONTROL + V Keys');
        await page.keyboard.press('Control+v');
        await page.waitForTimeout(1000);
        
        // Step 14: Press Enter/Return Key
        console.log('[Floor Plan Status] Step 14: Press Enter/Return Key');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
    
    });

    test.afterEach(async ({ page }) => {
        console.log('[Floor Plan Status] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedSteps.selectCompany('Vodacom');
            
            // Step 3: Clean UB/Trex alerts
            await sharedSteps.cleanupManualAlerts();
    
            console.log('[Floor Plan Status] Cleanup completed successfully');
        } catch (error) {
            console.log(`[Floor Plan Status] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });
});
