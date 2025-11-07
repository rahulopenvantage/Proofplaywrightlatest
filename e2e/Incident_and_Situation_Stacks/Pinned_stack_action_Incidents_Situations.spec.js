// e2e/Pinned_stack_action_Incidents_Situations.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
import { EventPublisher } from '../../backend/EventPublisher.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const SITE_NAME = 'WVRD_9th Ave and JG Strydom Rd_62'; // Site name used for UB and Trex alerts

test.describe('Pinned Stack Action - Incidents and Situations', () => {
    let sharedTestSteps;
    
    test.beforeEach(async ({ page }) => {
        // Set timeout for complex operations
        test.setTimeout(300000); // 5 minutes for complete workflow
        
        // Instantiate SharedTestSteps
        sharedTestSteps = new SharedTestSteps(page);
        
        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
                    // Step 1: Trigger UB via API directly
                console.log('[PinnedStackAction] Step 1: Publishing UB event via API (no Postman)...');
                const publisher = new EventPublisher();
                const res = await publisher.unusualBehaviour();
                if (res?.skipped) {
                    console.log('[PinnedStackAction] Event publishing skipped (API env not configured). Continuing UI-only.');
                } else {
                    console.log(`[PinnedStackAction] Published UB event status=${res?.status}`);
                }
        
        // Step 2: Admin Login and Accept T&Cs
        console.log('[PinnedStackAction] Step 2: Admin Login and Accept T&Cs...');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
        
      
    });    test('should verify expand and collapse functionality for UB and Trex cards', async ({ page }) => {
        console.log('[PinnedStackAction] Starting expand and collapse alert card workflow test...');

          // Step 3: Select Automation Company
        console.log('[PinnedStackAction] Step 3: Select Automation Company...');
        await sharedTestSteps.selectCompany('Automation company');

        // Step 4: Stack Filter UB and Trex + WVRD_9th
        console.log('[PinnedStackAction] Step 4: Stack Filter UB and Trex + WVRD_9th...');
        await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);
        
        // Step 5: Wait until the element card_aggregate_UB_Trex is VISIBLE
        console.log('[PinnedStackAction] Step 5: Wait until card_aggregate_UB_Trex is VISIBLE...');
        const aggregateCard = page.locator('[data-test-id="aggregated-site-card"]').first();
        await expect(aggregateCard).toBeVisible({ timeout: 15000 });
        
        // Step 6: Expand and Select UB and Trex card
        console.log('[PinnedStackAction] Step 6: Expand and Select UB and Trex card...');
        await sharedTestSteps.expandAndSelectUBAndTrexCard(SITE_NAME);
        
        // Step 7: Verify that the element card_UB_Trex is DISPLAYED
        console.log('[PinnedStackAction] Step 7: Verify that card_UB_Trex is DISPLAYED...');
        const ubTrexCard = page.locator('[data-test-id="alert-card"]').first();
        await expect(ubTrexCard).toBeVisible({ timeout: 10000 });
        
        // Step 8: Click on Collapse All button
        console.log('[PinnedStackAction] Step 8: Click on Collapse All button...');
        const collapseAllButton = page.getByRole('button', { name: 'Collapse all' });
        await collapseAllButton.click();
        
        // Step 9: Verify that the element card_UB_Trex is NOT DISPLAYED
        console.log('[PinnedStackAction] Step 9: Verify that card_UB_Trex is NOT DISPLAYED...');
        // Wait a moment for the collapse animation to complete
        await page.waitForTimeout(1000);
        await expect(ubTrexCard).not.toBeVisible({ timeout: 10000 });
        
        console.log('[PinnedStackAction] Expand and collapse workflow completed successfully');
    });

    test('should verify expand and collapse functionality for UB and Trex cards on Situation stack', async ({ page }) => {
        console.log('[PinnedStackAction] Starting Situation stack expand and collapse workflow test...');
        
          // Step 3: Select Automation Company
        console.log('[PinnedStackAction] Step 3: Select Automation Company...');
        await sharedTestSteps.selectCompany('Automation company');

        // Step 4: Stack Filter UB and Trex + WVRD_9th
        console.log('[PinnedStackAction] Step 4: Stack Filter UB and Trex + WVRD_9th...');
        await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);
        
        // Step 5: Expand and Select UB and Trex card
        console.log('[PinnedStackAction] Step 5: Expand and Select UB and Trex card...');
        await sharedTestSteps.expandAndSelectUBAndTrexCard(SITE_NAME);
        
        // Step 6: SOP - Complete and Validate with No for Q1
        console.log('[PinnedStackAction] Step 6: SOP - Complete and Validate with No for Q1...');
        await sharedTestSteps.completeSOP();
        
        // Step 7: Click on btn_activityLog_Escalate
        console.log('[PinnedStackAction] Step 7: Click on btn_activityLog_Escalate...');
        await sharedTestSteps.escalateSOP();
        
        // Step 8: Switch to Situation Stack
        console.log('[PinnedStackAction] Step 8: Switch to Situation Stack...');
        await sharedTestSteps.switchToSituationStack();
        
        // Step 9: Expand and Select UB and Trex card (on Situation stack)
        console.log('[PinnedStackAction] Step 9: Expand and Select UB and Trex card on Situation stack...');
        await sharedTestSteps.expandAndSelectUBAndTrexCard(SITE_NAME);
        
        // Step 10: Verify that the element card_UB_Trex is DISPLAYED
        console.log('[PinnedStackAction] Step 10: Verify that card_UB_Trex is DISPLAYED...');
        const ubTrexCard = page.locator('[data-test-id="alert-card"]').first();
        await expect(ubTrexCard).toBeVisible({ timeout: 10000 });
        
        // Step 11: Click on Collapse All button
        console.log('[PinnedStackAction] Step 11: Click on Collapse All button...');
        const collapseAllButton = page.getByRole('button', { name: 'Collapse all' });
        await collapseAllButton.click();
        
        // Step 12: Verify that the element card_UB_Trex is NOT DISPLAYED
        console.log('[PinnedStackAction] Step 12: Verify that card_UB_Trex is NOT DISPLAYED...');
        // Wait a moment for the collapse animation to complete
        await page.waitForTimeout(1000);
        await expect(ubTrexCard).not.toBeVisible({ timeout: 10000 });
        
        console.log('[PinnedStackAction] Situation stack expand and collapse workflow completed successfully');
    });    test.afterEach(async ({ page }) => {
        console.log('[PinnedStackAction] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedTestSteps.selectCompany('Automation company');
            
            // Step 3: Clean manual alerts
            await sharedTestSteps.cleanupManualAlerts();
            
            // Step 4: Clean UB and Trex alerts
            await sharedTestSteps.cleanupUBAndTrexAlerts(SITE_NAME);
            
            // Step 5: Reset stack filter
            await sharedTestSteps.resetStackFilter();
            
            console.log('[PinnedStackAction] Cleanup completed successfully');
        } catch (error) {
            console.log(`[PinnedStackAction] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });
});


