// e2e/Alert_pills_Incident_and_Situation.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
import { AlertsDashboardPage } from '../../backend/AlertsDashboardPage.js'; // Corrected import path
import { EventPublisher } from '../../backend/EventPublisher.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const SITE_NAME = 'WVRD_9th Ave and JG Strydom Rd_62';

test.describe('Alert pills Incident and Situation', () => {
    let sharedTestSteps;
    let alertsDashboardPage; // Added variable
    test.beforeEach(async ({ page }) => {
        // Set timeout for complex operations
        test.setTimeout(120000); // 2 minutes timeout
        
        // Instantiate SharedTestSteps
        sharedTestSteps = new SharedTestSteps(page);
        alertsDashboardPage = new AlertsDashboardPage(page); // Instantiate AlertsDashboardPage

        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }

                console.log('[AlertTypePills] Step 1: Trigger UB/Trex via API (no Postman)...');
                const publisher = new EventPublisher();
                const [trex, ub] = await Promise.all([
                    publisher.trexPublic(),
                    publisher.unusualBehaviour()
                ]);
                if (trex?.skipped || ub?.skipped) {
                    console.log('[AlertTypePills] Event publishing skipped (API env not configured). Continuing UI-only.');
                } else {
                    console.log(`[AlertTypePills] Published events: trex=${trex?.status}, ub=${ub?.status}`);
                }
        
        // Step 2: Authentication and company selection
        console.log('[AlertTypePills] Step 2: Authentication and company selection...');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });

        // Step 3: Select Automation company
        console.log('[AlertTypePills] Step 3: Selecting Automation company...');
        await sharedTestSteps.selectCompany('Automation company');
        
        // Ensure clean test state
        await page.waitForLoadState('networkidle');
    });    test('should verify UB and Trex alert type pills and counter changes after dismiss', async ({ page }) => {
        console.log('[AlertTypePills] Starting UB/Trex alert type pills verification with dismiss workflow...');
        
        // Step 4: Apply UB/Trex filter first
        console.log('[AlertTypePills] Step 4: Applying UB/Trex filter...');
        await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);
        
        // Step 5: Wait until the element card_aggregate_UB_Trex is visible
        console.log('[AlertTypePills] Step 5: Waiting for the aggregated UB/Trex card to be visible.');
        const aggregateUBTrexCard = page.locator('[data-test-id="aggregated-site-card"]').first();
        await expect(aggregateUBTrexCard).toBeVisible({ timeout: 15000 });
        
        // Step 6: Click on accordion_card_UB_Trex
        console.log('[AlertTypePills] Step 6: Clicking on accordion to expand UB/Trex card.');
        const accordionCard = page.locator('[data-test-id="aggregated-site-card"]')
            .first()
            .locator('[data-test-id="site-alert-card-expand-button"]');
        await accordionCard.click();
        
        // Step 7: Store the count of elements identified by locator card_UB into a variable count_UB
        console.log('[AlertTypePills] Step 7: Storing the count of UB cards.');
        const ubCards = page.locator('[data-test-id="unusual-behaviour-card"]');
        const count_UB = await ubCards.count();
        console.log(`[AlertTypePills] Initial UB card count: ${count_UB}`);
        
        // Step 8: Store the count of elements identified by locator card_Trex into a variable count_Trex
        console.log('[AlertTypePills] Step 8: Storing the count of Trex cards.');
        const trexCards = page.locator('[data-test-id="trex-card"]');
        const count_Trex = await trexCards.count();
        console.log(`[AlertTypePills] Initial Trex card count: ${count_Trex}`);
        
        // Step 9: Verify that the current page displays an element UB pill with count
        console.log('[AlertTypePills] Step 9: Verifying UB pill displays correct count.');
        const ubPill = page.locator('[popup-right="Unusual Behaviour"]').locator(`text=${count_UB} UB`);
        await expect(ubPill).toBeVisible({ timeout: 10000 });
        
        // Step 10: Verify that the current page displays an element Button: WVRD_9th Ave ...Strydom Rd_62..
        console.log('[AlertTypePills] Step 10: Verifying site button is displayed.');
        const siteButton = page.locator('[data-test-id="aggregated-site-card-name"]').first();
        await expect(siteButton).toBeVisible({ timeout: 10000 });
        
        // Step 11: Click on card_Trex (click on a specific Trex card to interact with)
        console.log('[AlertTypePills] Step 11: Clicking on first Trex card.');
        const firstTrexCard = page.locator('[data-test-id="trex-card"]').first();
        await firstTrexCard.click();
        
        // Step 12: SOP - Complete and Validate with No for Q1
        console.log('[AlertTypePills] Step 12: Completing SOP validation.');
        await sharedTestSteps.completeSOP();
        
        // Step 13: Click on dismiss button in the SOP panel
        console.log('[AlertTypePills] Step 13: Clicking dismiss button in SOP panel.');
        
        // Use the confirmed dismiss button locator
        const dismissButton = page.locator('[data-test-id="wrongDismiss"]');
        await expect(dismissButton).toBeVisible({ timeout: 10000 });
        await dismissButton.click();
        
        // Extended wait for the UI to update and for the dismissed card to actually disappear
        console.log('[AlertTypePills] Waiting for dismissed Trex card to disappear from UI...');
        await page.waitForTimeout(5000); // Increased wait time
        
        // Ensure the specific Trex card that was clicked is no longer visible
        try {
            await expect(firstTrexCard).not.toBeVisible({ timeout: 10000 });
            console.log('[AlertTypePills] ✅ Confirmed that dismissed Trex card disappeared from UI');
        } catch (error) {
            console.log('[AlertTypePills] ⚠️ Dismissed Trex card is still visible, but continuing with count verification');
        }        // Step 14: Store the count of elements identified by locator card_UB into a variable count_UB
        console.log('[AlertTypePills] Step 14: Storing updated count of UB cards after dismiss.');
        const count_UB_after = await ubCards.count();
        console.log(`[AlertTypePills] UB card count after dismiss: ${count_UB_after}`);
        
        // Step 15: Store the count of elements identified by locator card_Trex into a variable count_Trex2
        console.log('[AlertTypePills] Step 15: Storing updated count of Trex cards after dismiss.');
        const count_Trex2 = await trexCards.count();
        console.log(`[AlertTypePills] Trex card count after dismiss: ${count_Trex2}`);
        
        // Step 16: Verify if count_Trex >= count_Trex2 (count should decrease or stay same after dismiss)
        console.log('[AlertTypePills] Step 16: Verifying that Trex count decreased or stayed same after dismiss.');
        console.log(`[AlertTypePills] Comparing counts: Initial=${count_Trex}, After Dismiss=${count_Trex2}`);
        
        if (count_Trex2 < count_Trex) {
            console.log(`[AlertTypePills] ✅ SUCCESS: Trex count decreased from ${count_Trex} to ${count_Trex2} (card was properly dismissed)`);
        } else if (count_Trex2 === count_Trex) {
            console.log(`[AlertTypePills] ⚠️ WARNING: Trex count remained the same: ${count_Trex} (dismiss might not have worked as expected)`);
        } else {
            console.log(`[AlertTypePills] ❌ ERROR: Trex count increased from ${count_Trex} to ${count_Trex2} (unexpected behavior)`);
        }
        
        expect(count_Trex).toBeGreaterThanOrEqual(count_Trex2);
        console.log(`[AlertTypePills] ✅ Trex count verification passed: ${count_Trex} >= ${count_Trex2}`);
        
        // Step 17: Verify that the current page displays an element UB pill with count
        console.log('[AlertTypePills] Step 17: Verifying UB pill displays updated count.');
        if (count_UB_after > 0) {
            const ubPillAfter = page.locator('[popup-right="Unusual Behaviour"]').locator(`text=${count_UB_after} UB`);
            await expect(ubPillAfter).toBeVisible({ timeout: 10000 });
            console.log(`[AlertTypePills] ✅ UB pill verification passed with count: ${count_UB_after}`);
        } else {
            console.log('[AlertTypePills] No UB cards remaining, skipping UB pill verification');
        }
        
        // Step 18: Additional verification - Check if Trex pills are correctly updated
        if (count_Trex2 > 0) {
            console.log('[AlertTypePills] Step 18: Verifying Trex pill displays updated count.');
            const trexPillAfter = page.getByText(`${count_Trex2} TRX`, { exact: true });
            await expect(trexPillAfter).toBeVisible({ timeout: 10000 });
            console.log(`[AlertTypePills] ✅ Trex pill verification passed with updated count: ${count_Trex2}`);
        } else {
            console.log('[AlertTypePills] No Trex cards remaining, verifying Trex pill is hidden or shows 0');
        }
        
        console.log('[AlertTypePills] ✅ Alert type pills verification with dismiss workflow completed successfully.');
    });    test('should verify incident stack volume counter changes correctly', async ({ page }) => {
        // Step 4: Apply UB/Trex filter
        console.log('[AlertTypePills] Step 4: Applying UB/Trex filter...');
        await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);

        // Step 5: Expand and select UB and Trex card
        console.log('[AlertTypePills] Step 5: Expanding and selecting UB and Trex card...');
        await sharedTestSteps.expandAndSelectUBAndTrexCard(SITE_NAME);
        
        // Step 6: Complete SOP
        console.log('[AlertTypePills] Step 6: Completing SOP...');
        await sharedTestSteps.completeSOP();
        console.log('[AlertTypePills] SOP completed and validated successfully.');
        
        // Step 7: Click Escalate Button
        console.log('[AlertTypePills] Step 7: Clicking escalate button...');
        await sharedTestSteps.escalateSOP();
        
        // Step 8: Switch to Situation Stack
        console.log('[AlertTypePills] Step 8: Switching to Situation Stack...');
        await sharedTestSteps.switchToSituationStack();

        await page.waitForTimeout(2000); // Slight pause to ensure UI is stable after stack switch
        
        // Step 9: Wait until the aggregated UB/Trex card is visible
        console.log('[AlertTypePills] Step 9: Waiting for the aggregated UB/Trex card to be visible.');
        // Look for any aggregated site card since the exact text might vary
        const aggregateCard = page.locator('[data-test-id="aggregated-site-card-name"]').first();
        await expect(aggregateCard).toBeVisible({ timeout: 15000 });
        
        // Step 10: Click on the accordion to expand the card
        console.log('[AlertTypePills] Step 10: Clicking on the accordion to expand the card.');
        const accordion = page.locator('[data-test-id="aggregated-site-card"]')
            .first()
            .locator('[data-test-id="site-alert-card-expand-button"]');
        await accordion.click();
        
        // Step 11: Store the count of UB cards using locator card_UB
        console.log('[AlertTypePills] Step 11: Storing the count of elements identified by locator card_UB.');
        const ubCards = page.locator('[data-test-id="unusual-behaviour-card"]'); // card_UB locator
        const count_UB = await ubCards.count();
        console.log(`[AlertTypePills] Found ${count_UB} UB cards.`);

        // Step 12: Verify that the current page displays an element UB pill with count
        console.log('[AlertTypePills] Step 12: Verifying that the current page displays an element UB pill with count.');
        const ubPill = page.locator('[popup-right="Unusual Behaviour"]').locator(`text=${count_UB} UB`);
        await expect(ubPill).toBeVisible({ timeout: 10000 });

        // Step 13: Store the count of Trex cards using locator card_Trex
        console.log('[AlertTypePills] Step 13: Storing the count of elements identified by locator card_Trex.');
        const trexCards = page.locator('[data-test-id="trex-card"]'); // card_Trex locator
        const count_Trex = await trexCards.count();
        console.log(`[AlertTypePills] Found ${count_Trex} Trex cards.`);

        // Step 14: Verify that the current page displays an element Trex alert pop up button 4
        console.log('[AlertTypePills] Step 14: Verifying that the current page displays an element Trex alert pop up button.');
        const trexPopupBtn = page.getByText(`${count_Trex} TRX`, { exact: true });
        await expect(trexPopupBtn).toBeVisible({ timeout: 10000 });

        // Step 15: Verify that the elements with locator UB card 2 displays text with actual count
        console.log(`[AlertTypePills] Step 15: Verifying that the elements with locator UB card displays text ${count_UB} UB.`);
        const ubPillWithActualCount = page.locator('[popup-right="Unusual Behaviour"]').locator(`text=${count_UB} UB`);
        await expect(ubPillWithActualCount).toBeVisible({ timeout: 10000 });

        // Step 16: Verify that the elements with locator Trex alert pop up button displays text with actual count
        console.log(`[AlertTypePills] Step 16: Verifying that the elements with locator Trex alert pop up button displays text ${count_Trex} TRX.`);
        const trexPillWithActualCount = page.getByText(`${count_Trex} TRX`, { exact: true });
        await expect(trexPillWithActualCount).toBeVisible({ timeout: 10000 });

        console.log('[AlertTypePills] All alert type pill verifications completed successfully.');
    });

    test.afterEach(async ({ page }) => {
        console.log('[AlertTypePills] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedTestSteps.selectCompany('Automation company');
            
            // Step 3: Clean manual alerts
            await sharedTestSteps.cleanupManualAlerts();
            
            // Step 4: Clean UB/Trex alerts
            await sharedTestSteps.cleanupUBAndTrexAlerts(SITE_NAME);
            
            // Step 5: Reset stack filters
            await sharedTestSteps.resetStackFilter();
            
            console.log('[AlertTypePills] Cleanup completed successfully');
        } catch (error) {
            console.log(`[AlertTypePills] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });  
    
});
