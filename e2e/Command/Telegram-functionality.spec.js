import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
import { ApiHelper } from '../../backend/ApiHelper.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const UNIQUE_TEXT_MESSAGE = process.env.UNIQUE_TEXT_MESSAGE || 'UNIQUE TEXT MESSAGE';

test.describe('Dashboard - Telegram functionality', () => {
    let sharedSteps;
    let apiHelper;
    
    test.beforeEach(async ({ page }) => {
        test.setTimeout(300000); // 5 minutes for complex telegram operations
        
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

    test('should complete SOP and send telegram message with validation', async ({ page }) => {
        console.log('[Telegram Functionality] Starting test flow...');
        
        // Step 1: Send TREX alerts to create test data
        console.log('[Telegram Functionality] Step 1: Send TREX alerts for test data');
        const trexResult = await apiHelper.sendAlert('trex_public');
        expect(trexResult.status).toBe(200);
        
        // Allow time for alerts to be processed
        await page.waitForTimeout(5000);
        
        // Step 2: Navigate to application and login
        console.log('[Telegram Functionality] Step 2: Navigate to application and login');
        await page.goto('https://uat.proof360.io/');
        await sharedSteps.login(USERNAME, PASSWORD);
        await sharedSteps.selectCompany('Automation company');

        // Step 3: Apply stack filter
        console.log('[Telegram Functionality] Step 3: Apply WVRD_9th Ave stack filter');
        await sharedSteps.stackFilterUBAndTrex('WVRD_9th Ave');

        // Step 4: Click on 1st Aggregated card on stack
        console.log('[Telegram Functionality] Step 4: Click on first aggregated card');
        await page.waitForTimeout(3000); // Wait for cards to load
        await sharedSteps.expandAndSelectUBAndTrexCard('WVRD_9th Ave');
        
        // Step 5: Complete SOP first before escalating
        console.log('[Telegram Functionality] Step 5: Complete SOP');
        await sharedSteps.completeSOP();
        
        // Step 6: Escalate using shared steps
        console.log('[Telegram Functionality] Step 6: Escalate SOP');
        await sharedSteps.escalateSOP();
        
        // Step 7: Switch to Situation Stack
        console.log('[Telegram Functionality] Step 7: Switch to Situation Stack');
        await sharedSteps.switchToSituationStack();
        await page.waitForTimeout(5000); // Wait for situation stack to fully load
        
        // Step 8: Expand and Select UB and Trex card
        console.log('[Telegram Functionality] Step 8: Expand and Select UB and Trex card');
        await sharedSteps.expandAndSelectUBAndTrexCard('WVRD_9th Ave');
        
        // Step 9: Click on Telegram Message Btn
        console.log('[Telegram Functionality] Step 9: Click on Telegram Message Btn');
        const telegramMessageButton = page.locator('[data-test-id="telegramMessage"]');
        await telegramMessageButton.click();
        await page.waitForTimeout(2000);
        
        // Step 10: Click on Select All to select all groups
        console.log('[Telegram Functionality] Step 10: Click on Select All to select all groups');
        const selectAllButton = page.getByText('Select all').first();
        await selectAllButton.click();
        await page.waitForTimeout(1000);
        
        // Step 11: Enter UNIQUE TEXT MESSAGE in the Telegram Text Area field
        console.log('[Telegram Functionality] Step 11: Enter UNIQUE TEXT MESSAGE in the Telegram Text Area field');
        const telegramTextArea = page.locator('[data-test-id="telegramTextArea"]');
        await telegramTextArea.fill(UNIQUE_TEXT_MESSAGE);
        await page.waitForTimeout(1000);
        
        // Step 12: Click on btn_telegram_next
        console.log('[Telegram Functionality] Step 12: Click on btn_telegram_next');
        const next = page.getByText('Next');
                await next.click();
        await page.waitForTimeout(2000);
        
        // Step 13: Click on Telegram Send Btn
        console.log('[Telegram Functionality] Step 13: Click on Telegram Send Btn');
         const send = page.getByRole('button', { name: 'Send' });
                await send.click();
        
        // Wait for telegram send to complete and UI to stabilize
        console.log('[Telegram Functionality] Waiting for telegram send to complete...');
        await page.waitForTimeout(5000);


        // Step 18: Verify that the current page displays text UNIQUE TEXT MESSAGE
        console.log('[Telegram Functionality] Step 18: Verify that the current page displays text UNIQUE TEXT MESSAGE');
        const pageContent = page.locator('body');
        await expect(pageContent).toContainText(UNIQUE_TEXT_MESSAGE);
     
        
        console.log('[Telegram Functionality] Test completed successfully.');
    });

    test.afterEach(async ({ page }) => {
        console.log('[Telegram Functionality] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('https://uat.proof360.io/');
            
            // Step 2: Re-authenticate and select company
            await sharedSteps.login(USERNAME, PASSWORD);
            await sharedSteps.selectCompany('Automation company');
            
            // Step 3: Clean UB/Trex alerts for WVRD_9th Ave site used in test
            console.log('[Telegram Functionality] Cleaning up UB/Trex alerts for WVRD_9th Ave...');
            await sharedSteps.cleanupUBAndTrexAlerts('WVRD_9th Ave');
            
            console.log('[Telegram Functionality] Cleanup completed successfully');
        } catch (error) {
            console.log(`[Telegram Functionality] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });
});
