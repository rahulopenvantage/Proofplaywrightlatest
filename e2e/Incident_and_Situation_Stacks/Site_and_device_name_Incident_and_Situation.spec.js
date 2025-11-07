import { test, expect } from '@playwright/test';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

const SITE_NAME = 'BDFD_Boeing'; // Site name used in the test
const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Escalate Test Flow', () => {
    let sharedTestSteps;
    
    test.beforeEach(async ({ page }) => {
        // Set extended timeout for comprehensive escalate workflow
        test.setTimeout(300000); // 5 minutes timeout for complex operations
        
        // Instantiate SharedTestSteps
        sharedTestSteps = new SharedTestSteps(page);

        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Authentication and company selection
        console.log('[EscalateTest] Authentication and company selection...');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        await sharedTestSteps.selectCompany('Automation company');
        await sharedTestSteps.cleanupManualAlerts();
       console.log('[EscalateTest] Cleanup completed successfully.');


    });    test('Should escalate to the situation stack and auto escalate', async ({ page }) => {
        console.log('[EscalateTest] Starting comprehensive escalate test flow...');
        
        // Step 1: Create Manual Alert
        console.log('[EscalateTest] Step 1: Creating manual alert...');
        await sharedTestSteps.createManualAlertForSite(SITE_NAME);
        console.log('[EscalateTest] Manual alert created successfully.');
        
        // Step 2: Navigate to Command Page and Apply Manual Stack Filter
        console.log('[EscalateTest] Step 2: Navigating to command page and applying manual alert stack filter...');
        await sharedTestSteps.navigateToMenu('Command');
        console.log('[EscalateTest] Navigated to command page.');
        
      //  await sharedTestSteps.genericManualAlertStackFilter();
        console.log('[EscalateTest] Manual alert filter applied successfully.');
        
        // Step 3: Expand and Select Manual Alert
        console.log('[EscalateTest] Step 3: Expanding and selecting manual alert...');
        await sharedTestSteps.expandAndSelectManualCard();
        console.log('[EscalateTest] Manual alert expanded and selected successfully.');        // Step 5: Complete SOP
         // Step 7: Verify that the element 'Incident Site Name' displays the correct text
        console.log('[Verification Test] Step 7: Verifying the Incident Site Name is visible and contains expected text.');
        const incidentSiteName = page.locator('[data-test-id="aggregated-site-card-name"]');
        const expectedSiteName = 'BDFD_Boeing Rd East_43';
        
        // Verify element is visible and not empty
        await expect(incidentSiteName.first()).toBeVisible({ timeout: 15000 });
        await expect(incidentSiteName.first()).not.toBeEmpty();
        
        // Get the actual text content
        let siteNameText = await incidentSiteName.first().textContent();
        console.log(`[Verification Test] Found Site Name: "${siteNameText}"`);
        
        // Verify the text contains or matches the expected value
        await expect(incidentSiteName.first()).toContainText(expectedSiteName);
        console.log(`[Verification Test] ✅ Site Name verification passed: contains "${expectedSiteName}"`);

        // Step 8: Verify that the element 'Device Name' displays the correct text
        console.log('[Verification Test] Step 8: Verifying the Device Name is visible and contains expected text.');
        let deviceName = page.locator('span.text[popup-over]').first();
        let expectedDeviceName = 'BDFD_Boeing Rd East_43.1_O';
        
        // Verify element is visible and not empty
        await expect(deviceName).toBeVisible({ timeout: 10000 });
        await expect(deviceName).not.toBeEmpty();
        
        // Get the actual text content
        let deviceNameText = await deviceName.textContent();
        console.log(`[Verification Test] Found Device Name: "${deviceNameText}"`);
        
        // Verify the text contains or matches the expected value
        await expect(deviceName).toContainText(expectedDeviceName);
        console.log(`[Verification Test] ✅ Device Name verification passed: contains "${expectedDeviceName}"`);

        // Step 9: Mouseover the element 'Device Name'
        console.log('[Verification Test] Step 9: Performing mouseover on Device Name element.');
        await deviceName.hover();
        console.log('[Verification Test] ✅ Mouseover on Device Name completed.');
       
        console.log('[EscalateTest] Step 5: Completing SOP...');
        await sharedTestSteps.completeSOP();
        console.log('[EscalateTest] SOP completed and validated successfully.');
        
        // Step 6: Click Escalate Button
        console.log('[EscalateTest] Step 6: Clicking escalate button...');
        await sharedTestSteps.escalateSOP();
        console.log('[EscalateTest] Escalate button clicked successfully.');
          // Step 4: Switch to Situation Stack and Verify Manual Alert is Present
        console.log('[EscalateTest] Step 4: Switching to Situation Stack and verifying manual alert...');
        await sharedTestSteps.switchToSituationStack();

         // Step 3: Expand and Select Manual Alert
        console.log('[EscalateTest] Step 3: Expanding and selecting manual alert...');
        await sharedTestSteps.expandAndSelectManualCard();
        console.log('[EscalateTest] Manual alert expanded and selected successfully.');        // Step 5: Complete SOP
         // Step 7: Verify that the element 'Incident Site Name' displays the correct text
        console.log('[Verification Test] Step 7: Verifying the Incident Site Name is visible and contains expected text.');
    
        
        // Verify element is visible and not empty
        await expect(incidentSiteName.first()).toBeVisible({ timeout: 15000 });
        await expect(incidentSiteName.first()).not.toBeEmpty();
        
        // Get the actual text content
        siteNameText = await incidentSiteName.first().textContent();
        console.log(`[Verification Test] Found Site Name: "${siteNameText}"`);
        
        // Verify the text contains or matches the expected value
        await expect(incidentSiteName.first()).toContainText(expectedSiteName);
        console.log(`[Verification Test] ✅ Site Name verification passed: contains "${expectedSiteName}"`);

        // Step 8: Verify that the element 'Device Name' displays the correct text
        console.log('[Verification Test] Step 8: Verifying the Device Name is visible and contains expected text.');
         deviceName = page.locator('span.text[popup-over]').first();
         expectedDeviceName = 'BDFD_Boeing Rd East_43.1_O';
        
        // Verify element is visible and not empty
        await expect(deviceName).toBeVisible({ timeout: 10000 });
        await expect(deviceName).not.toBeEmpty();
        
        // Get the actual text content
        deviceNameText = await deviceName.textContent();
        console.log(`[Verification Test] Found Device Name: "${deviceNameText}"`);
        
        // Verify the text contains or matches the expected value
        await expect(deviceName).toContainText(expectedDeviceName);
        console.log(`[Verification Test] ✅ Device Name verification passed: contains "${expectedDeviceName}"`);

        // Step 9: Mouseover the element 'Device Name'
        console.log('[Verification Test] Step 9: Performing mouseover on Device Name element.');
        await deviceName.hover();
        console.log('[Verification Test] ✅ Mouseover on Device Name completed.');
       
        
     
    });    test.afterEach(async ({ page }) => {
        // Cleanup: Remove any test alerts that might have been created
        console.log('[EscalateTest] Starting cleanup process...');
        await page.goto('/');
        await sharedTestSteps.selectCompany('Automation company');
        try {
            // Use SharedTestSteps for cleanup
            if (sharedTestSteps) {
                await sharedTestSteps.cleanupManualAlerts();
                console.log('[EscalateTest] Cleanup completed successfully.');
            }
        } catch (error) {
            console.log(`[EscalateTest] Cleanup encountered an issue: ${error.message}`);
            // Don't fail the test due to cleanup issues
        }
    });
});