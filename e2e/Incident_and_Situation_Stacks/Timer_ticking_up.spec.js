// filepath: c:\Users\rahul\Documents\Playwright\e2e\Timer_ticking_up.spec.js

import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Timer Ticking Up - Situation Time Ticker Validation', () => {
    let sharedSteps;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(300000); // 5 minutes for complex workflow
        
        sharedSteps = new SharedTestSteps(page);
        
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }

         await sharedSteps.authenticateAndSetup(USERNAME, PASSWORD);
         await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
         await sharedSteps.selectCompany('Automation company');
        
    });

    test('should verify situation time ticker increases over time after escalation', async ({ page }) => {
        console.log('[Timer Ticking Up] Starting timer validation test...');
 
        // Step 4: Generic Manual alert stack filter
        console.log('[Timer Ticking Up] Applying generic manual alert stack filter...');
        await sharedSteps.genericManualAlertStackFilter();        // Step 5: Create Manual alert for Automation Company
        console.log('[Timer Ticking Up] Creating manual alert...');
        await sharedSteps.createManualAlert();        // Step 6: Navigate to Dashboard
        console.log('[Timer Ticking Up] Navigating to dashboard...');
        await sharedSteps.navigateToMenu('Command');

        // Step 7: Expand and Select Manual card
        console.log('[Timer Ticking Up] Expanding and selecting manual alert card...');
        await sharedSteps.expandAndSelectManualCard();

        // Step 8: SOP - Complete and Validate with No for Q1
        console.log('[Timer Ticking Up] Completing SOP with No for Q1...');
        await sharedSteps.completeSOP();        // Step 9: Click on btn_activityLog_Escalate
        console.log('[Timer Ticking Up] Clicking escalate button...');
        await sharedSteps.escalateSOP();
        console.log('[Timer Ticking Up] Escalate button clicked successfully');

        // Step 10: Switch to Situation Stack
        console.log('[Timer Ticking Up] Switching to Situation stack...');
        await sharedSteps.switchToSituationStack();

        // Step 11: Expand and Select Manual card on Situation stack
        console.log('[Timer Ticking Up] Expanding manual card on Situation stack...');
        await sharedSteps.expandAndSelectManualCard();        // Step 12: Store the value displayed in the text box "Situation Time Ticker" field into a variable "First time check"
        console.log('[Timer Ticking Up] Capturing first time check...');
        
        // Locate the Situation Time Ticker field
        const situationTimeTickerField = page.locator('[data-test-id="tickingTimer"]').first();
        
        // Wait for element to be visible and get the text content (not input value)
        await expect(situationTimeTickerField).toBeVisible({ timeout: 10000 });
        const firstTimeCheck = await situationTimeTickerField.textContent();
        
        console.log(`[Timer Ticking Up] First time check captured: ${firstTimeCheck}`);

        // Step 13: Wait for 5 seconds
        console.log('[Timer Ticking Up] Waiting 5 seconds for timer to tick...');
        await page.waitForTimeout(5000);        // Step 14: Store the value displayed in the text box "Situation Time Ticker" field into a variable "Second time check"
        console.log('[Timer Ticking Up] Capturing second time check...');
        
        // Get the updated text content after waiting
        const secondTimeCheck = await situationTimeTickerField.textContent();
        console.log(`[Timer Ticking Up] Second time check captured: ${secondTimeCheck}`);

        // Step 15: Verify if date Second time check is NEWER THAN than First time check
        console.log('[Timer Ticking Up] Verifying timer progression...');
        
        // Parse the time values - assuming format like "HH:MM:SS" or similar
        const parseTimeValue = (timeStr) => {
            // Handle various time formats that might be returned
            if (timeStr.includes(':')) {
                // Format like "HH:MM:SS" or "MM:SS"
                const parts = timeStr.split(':').map(num => parseInt(num, 10));
                if (parts.length === 3) {
                    return parts[0] * 3600 + parts[1] * 60 + parts[2]; // hours:minutes:seconds
                } else if (parts.length === 2) {
                    return parts[0] * 60 + parts[1]; // minutes:seconds
                }
            }
            // If it's just a number (seconds)
            return parseInt(timeStr, 10) || 0;
        };

        const firstTimeValue = parseTimeValue(firstTimeCheck);
        const secondTimeValue = parseTimeValue(secondTimeCheck);
        
        console.log(`[Timer Ticking Up] First time value (seconds): ${firstTimeValue}`);
        console.log(`[Timer Ticking Up] Second time value (seconds): ${secondTimeValue}`);
        
        // Verify that the second time is greater than the first time (timer is ticking up)
        expect(secondTimeValue).toBeGreaterThan(firstTimeValue);
        
        console.log('[Timer Ticking Up] ✅ Timer validation successful - Timer is ticking up correctly');
          // Cleanup - navigate back and clean up alerts
        console.log('[Timer Ticking Up] Performing cleanup...');
        try {
            await sharedSteps.cleanupManualAlerts();
        } catch (cleanupError) {
            console.log('[Timer Ticking Up] Cleanup warning:', cleanupError.message);
        }
        
        console.log('[Timer Ticking Up] Test completed successfully');
    });

    test.afterEach(async ({ page }) => {
        // Cleanup: Remove any test alerts that might have been created
        console.log('[Timer Ticking Up] Starting cleanup process...');
        await page.goto('/');
        await sharedSteps.selectCompany('Automation company');
        
        try {
            // Use SharedTestSteps for cleanup
            if (sharedSteps) {
                console.log('[Timer Ticking Up] Cleaning up manual alerts...');
                await sharedSteps.cleanupManualAlerts();
            }
        } catch (cleanupError) {
            console.log('[Timer Ticking Up] Cleanup error (non-critical):', cleanupError.message);
        }
        
        console.log('[Timer Ticking Up] Cleanup process completed');
    });
});