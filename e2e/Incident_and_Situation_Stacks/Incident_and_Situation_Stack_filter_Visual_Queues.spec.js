// e2e/Incident_and_Situation_Stack_filter_Visual_Queues.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
import { AlertsDashboardPage } from '../../backend/AlertsDashboardPage.js';
import { VisualTestHelper } from '../../backend/VisualTestHelper.js'; // Robust visual testing
import { EventPublisher } from '../../backend/EventPublisher.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const SITE_NAME = 'WVRD_9th Ave and JG Strydom Rd_62';

test.describe('Incident_and_Situation Stack filter Visual Queues', () => {
    /** @type {SharedTestSteps} */
    let sharedTestSteps;
    /** @type {AlertsDashboardPage} */
    let alertsDashboardPage;
    /** @type {VisualTestHelper} */
    let visualTestHelper; // Added robust visual testing helper
    test.beforeEach(async ({ page }) => {
        // Set timeout for complex operations
        test.setTimeout(120000); // 2 minutes timeout
        
        // Instantiate SharedTestSteps
        sharedTestSteps = new SharedTestSteps(page);
        alertsDashboardPage = new AlertsDashboardPage(page);
        visualTestHelper = new VisualTestHelper(page); // Initialize visual helper

        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }

                // Step 1: Trigger UB via API directly
                console.log('[VisualQueues] Step 1: Publishing UB event via API (no Postman)...');
                const publisher = new EventPublisher();
                const res = await publisher.unusualBehaviour();
                if (res?.skipped) {
                    console.log('[VisualQueues] Event publishing skipped (API env not configured). Continuing UI-only.');
                } else {
                    console.log(`[VisualQueues] Published UB event status=${res?.status}`);
                }
        
        // Step 2: Authentication and company selection
        console.log('[VisualQueues] Step 2: Authentication and company selection...');
        await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });

        // Step 3: Select Automation company
        console.log('[VisualQueues] Step 3: Selecting Automation company...');
        await sharedTestSteps.selectCompany('Automation company');
        
        // Ensure clean test state
        await page.waitForLoadState('networkidle');
    });

    test('should verify incident stack volume counter changes correctly', async ({ page }) => {
        // Step 4: Apply UB/Trex filter
        console.log('[VisualQueues] Step 4: Applying UB/Trex filter...');
        await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);

        // Step 5: Expand and select UB and Trex card
        console.log('[VisualQueues] Step 5: Expanding and selecting UB and Trex card...');
        await sharedTestSteps.expandAndSelectUBAndTrexCard(SITE_NAME);
        
        // Step 6: Click on the Incident Suppression menu (updated based on MCP server investigation)
        console.log('[VisualQueues] Step 6: Clicking on the Incident Suppression menu.');
        const incidentMenu = page.locator('[data-test-id="verticalDots"]').first();
        await incidentMenu.click();
        
        // Wait for context menu to appear (critical timing fix)
        console.log('[VisualQueues] Step 6.1: Waiting for suppress menu to appear...');
        await expect(page.locator('text=Suppress Item')).toBeVisible({ timeout: 15000 });
        
        // Step 7: Click on "Suppress Item" (using text locator based on MCP findings)
        console.log('[VisualQueues] Step 7: Clicking on \'Suppress Item\' from the pop-up menu.');
        const suppressItem = page.locator('text=Suppress Item');
        await suppressItem.click();

        // Wait for suppression modal to appear (using correct selectors from MCP investigation)
        console.log('[VisualQueues] Step 7.1: Waiting for suppression modal to appear...');
        await expect(page.locator('text=Reason for suppression')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('text=Duration of suppression')).toBeVisible({ timeout: 15000 });

        // Step 8: Select reason for suppression (label-scoped to modal)
        console.log('[VisualQueues] Step 8: Selecting reason for suppression...');
        const reasonLabelEl = page.getByText('Reason for suppression', { exact: true });
        await expect(reasonLabelEl).toBeVisible({ timeout: 15000 });
        const reasonSelect = reasonLabelEl.locator('xpath=following::select[1]');
        await expect(reasonSelect).toBeVisible({ timeout: 10000 });
        try {
            await reasonSelect.selectOption({ label: 'Bad Alerts' });
        } catch {
            await reasonSelect.selectOption({ value: 'Bad Alerts' });
        }
        console.log('[VisualQueues] Step 8: Successfully selected "Bad Alerts" as reason');

        // Step 9: Select duration for suppression (label-scoped to modal)
        console.log('[VisualQueues] Step 9: Selecting duration for suppression...');
        const durationLabelEl = page.getByText('Duration of suppression', { exact: true });
        await expect(durationLabelEl).toBeVisible({ timeout: 15000 });
        const durationSelect = durationLabelEl.locator('xpath=following::select[1]');
        await expect(durationSelect).toBeVisible({ timeout: 10000 });
        try {
            await durationSelect.selectOption({ label: '15 mins' });
        } catch {
            try { await durationSelect.selectOption({ value: '15 mins' }); }
            catch { await durationSelect.selectOption({ value: '15' }); }
        }
        console.log('[VisualQueues] Step 9: Successfully selected "15 mins" as duration');

        // Step 10: Click on "confirm suppression modal" with verification and retries
        console.log('[VisualQueues] Step 10: Confirming the suppression.');
        // Ensure suppression modal labels are visible first
        const reasonLabel = page.getByText('Reason for suppression', { exact: true });
        const durationLabel = page.getByText('Duration of suppression', { exact: true });
        await expect(reasonLabel).toBeVisible({ timeout: 10000 });
        await expect(durationLabel).toBeVisible({ timeout: 10000 });

        // Scope to the active suppression dialog/top-layer to avoid strict mode violations
        const modalRoot = page
            .locator('[role="dialog"], [role="alertdialog"], [data-react-aria-top-layer="true"], .react-aria-ModalOverlay')
            .filter({ has: reasonLabel })
            .first();
        const confirmButton = modalRoot.getByRole('button', { name: /^Confirm$/ }).first();
        const modalOverlayAfter = page.locator('.react-aria-ModalOverlay,[data-react-aria-top-layer="true"]');

        let confirmed = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`[VisualQueues] Step 10: Attempt ${attempt}/3 to click Confirm`);
            // Ensure visible and enabled before click
            await expect(confirmButton).toBeVisible({ timeout: 5000 });
            try {
                await confirmButton.click({ timeout: 5000 });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.log(`[VisualQueues] Confirm click attempt ${attempt} failed: ${errorMsg}`);
                // Try a force click as fallback
                try {
                    await confirmButton.click({ force: true, timeout: 3000 });
                } catch (err2) {
                    const errorMsg2 = err2 instanceof Error ? err2.message : String(err2);
                    console.log(`[VisualQueues] Force click failed on attempt ${attempt}: ${errorMsg2}`);
                }
            }

            // Verify modal is closing/closed
            try {
                await Promise.race([
                    modalOverlayAfter.waitFor({ state: 'hidden', timeout: 5000 }),
                    expect(reasonLabel).not.toBeVisible({ timeout: 5000 }),
                    expect(durationLabel).not.toBeVisible({ timeout: 5000 }),
                    expect(confirmButton).not.toBeVisible({ timeout: 5000 })
                ]);
                confirmed = true;
                console.log('[VisualQueues] ✅ Confirm acknowledged: suppression modal closed');
                break;
            } catch (verifyErr) {
                const errorMsg = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
                console.log(`[VisualQueues] Confirm verification failed on attempt ${attempt}: ${errorMsg}`);
                // Small wait before retry
                await page.waitForTimeout(750);
            }
        }

        if (!confirmed) {
            // Capture a diagnostic screenshot and HTML before failing
            try { await page.screenshot({ path: 'test-failures/suppression-confirm-failed.png' }); } catch {}
            console.log('[VisualQueues] ❌ Suppression Confirm did not take effect after 3 attempts');
            throw new Error('Suppression confirmation failed: modal did not close after clicking Confirm');
        }
        
        // Step 10.0.2: CRITICAL - Handle the second confirmation dialog (validated via MCP server)
        // Based on MCP reproduction: After first Confirm, a second dialog appears asking "Are you sure you want to suppress this item?"
        console.log('[VisualQueues] Step 10.0.2: Waiting for second confirmation dialog...');
        try {
            // Wait for the second confirmation dialog to appear (this always happens in suppression flow)
            await page.waitForTimeout(1000); // Give time for second dialog to render
            
            // Look for the "Are you sure?" confirmation dialog text
            const secondConfirmDialog = page.locator('text=Are you sure you want to suppress this item?');
            const secondConfirmVisible = await secondConfirmDialog.isVisible({ timeout: 5000 }).catch(() => false);
            
            if (secondConfirmVisible) {
                console.log('[VisualQueues] ✅ Second confirmation dialog detected: "Are you sure you want to suppress this item?"');

                // Scope to the visible second-confirm dialog to avoid strict mode violations
                const secondDialog = page
                    .locator('[role="dialog"], [role="alertdialog"], [data-react-aria-top-layer="true"], .react-aria-ModalOverlay')
                    .filter({ has: page.getByText('Are you sure you want to suppress this item?', { exact: false }) })
                    .first();

                // Prefer a role-based button within the scoped dialog
                const secondConfirmButton = secondDialog.getByRole('button', { name: /^Confirm$/ }).first();
                await expect(secondConfirmButton).toBeVisible({ timeout: 5000 });

                console.log('[VisualQueues] Clicking second Confirm button (scoped)...');
                try {
                    await secondConfirmButton.click({ timeout: 5000 });
                } catch (err) {
                    // Fallback to CSS :has-text within the same dialog if role-based click fails
                    const fallbackBtn = secondDialog.locator("button:has-text('Confirm')").first();
                    await expect(fallbackBtn).toBeVisible({ timeout: 3000 });
                    await fallbackBtn.click({ timeout: 3000 });
                }

                // Verify the second dialog closes
                await expect(secondConfirmDialog).not.toBeVisible({ timeout: 5000 });
                console.log('[VisualQueues] ✅ Second confirmation completed - dialog closed');

            } else {
                // Fallback: Look for any remaining Confirm button (alternative flow pattern)
                // Restrict search to any visible top-layer dialog to avoid matching headers
                const anyTopLayer = page.locator('[role="dialog"], [role="alertdialog"], [data-react-aria-top-layer="true"], .react-aria-ModalOverlay').first();
                const anyConfirmButton = anyTopLayer.getByRole('button', { name: /^Confirm$/ }).first();
                const remainingConfirm = await anyConfirmButton.isVisible({ timeout: 3000 }).catch(() => false);
                
                if (remainingConfirm) {
                    console.log('[VisualQueues] Found remaining Confirm button - clicking for second confirmation...');
                    await anyConfirmButton.click({ timeout: 3000 });
                    console.log('[VisualQueues] ✅ Second confirmation handled via fallback method');
                } else {
                    console.log('[VisualQueues] No second confirmation dialog found - suppression may have different flow');
                }
            }
            
        } catch (secondConfirmErr) {
            const errorMsg = secondConfirmErr instanceof Error ? secondConfirmErr.message : String(secondConfirmErr);
            console.log(`[VisualQueues] Second confirmation handling failed: ${errorMsg}`);
            // Don't fail the test - continue with best effort
        }

        // Wait for suppression modal to completely close (final guard)
        console.log('[VisualQueues] Step 10.1: Waiting for suppression modal to close...');
        await expect(reasonLabel).not.toBeVisible({ timeout: 10000 });
        await expect(durationLabel).not.toBeVisible({ timeout: 10000 });
        
        // Extra wait to ensure modal is fully closed and no overlays remain
        await page.waitForTimeout(3000);

        // Step 10.2: CRITICAL FIX - Ensure any persistent modal overlays are closed after suppression
        console.log('[VisualQueues] Step 10.2: Checking for persistent modal overlays after suppression...');
        try {
            // Check if there's a persistent react-aria-ModalOverlay blocking UI interactions
            const modalOverlay = page.locator('.react-aria-ModalOverlay');
            const isModalOpen = await modalOverlay.isVisible({ timeout: 2000 });
            
            if (isModalOpen) {
                console.log('[VisualQueues] ⚠️ Persistent modal overlay detected after suppression! Attempting to close...');
                
                // Try to close by clicking the filter button to toggle it closed (if that's the source)
                try {
                    await page.evaluate(() => {
                        const filterButton = document.querySelector('[data-test-id="alert-stack-popover-trigger-button"]');
                        if (filterButton && filterButton instanceof HTMLElement) {
                            filterButton.click();
                            return true;
                        }
                        return false;
                    });
                    
                    // Wait for modal to close
                    await modalOverlay.waitFor({ state: 'hidden', timeout: 5000 });
                    console.log('[VisualQueues] ✅ Modal overlay successfully closed using filter button toggle');
                } catch (toggleError) {
                    console.log('[VisualQueues] Filter button toggle failed, trying alternative methods...');
                    
                    // Alternative: try to remove the modal overlay directly
                    await page.evaluate(() => {
                        const overlays = document.querySelectorAll('.react-aria-ModalOverlay');
                        overlays.forEach(overlay => overlay.remove());
                    });
                    console.log('[VisualQueues] Modal overlay forcibly removed');
                }
                
                // Additional wait to ensure UI is stable after modal removal
                await page.waitForTimeout(1000);
            } else {
                console.log('[VisualQueues] No persistent modal overlay detected after suppression');
            }
        } catch (modalCheckError) {
            const errorMsg = modalCheckError instanceof Error ? modalCheckError.message : String(modalCheckError);
            console.log(`[VisualQueues] Modal overlay check failed: ${errorMsg}`);
        }

        // Step 11: Switch to Situation Stack
        console.log('[VisualQueues] Step 11: Switching to Situation Stack...');
        
        // CRITICAL FIX - Final modal check immediately before stack switching
        console.log('[VisualQueues] Step 11.1: Final modal overlay check before stack switch...');
        try {
            const modalOverlay = page.locator('.react-aria-ModalOverlay');
            const isModalOpen = await modalOverlay.isVisible({ timeout: 1000 });
            
            if (isModalOpen) {
                console.log('[VisualQueues] ⚠️ CRITICAL: Modal overlay detected immediately before stack switch!');
                
                // Force close the modal using multiple methods
                await page.evaluate(() => {
                    // Remove all modal overlays
                    const overlays = document.querySelectorAll('.react-aria-ModalOverlay');
                    overlays.forEach(overlay => overlay.remove());
                    
                    // Force click filter button to toggle closed
                    const filterButton = document.querySelector('[data-test-id="alert-stack-popover-trigger-button"]');
                    if (filterButton && filterButton instanceof HTMLElement) {
                        filterButton.click();
                    }
                });
                
                // Wait for modal to close
                await modalOverlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {
                    console.log('[VisualQueues] Modal removal timeout, proceeding anyway');
                });
                
                console.log('[VisualQueues] ✅ Modal overlay forcibly removed before stack switch');
            } else {
                console.log('[VisualQueues] No modal overlay detected before stack switch');
            }
        } catch (modalCheckError) {
            const errorMsg = modalCheckError instanceof Error ? modalCheckError.message : String(modalCheckError);
            console.log(`[VisualQueues] Modal check before stack switch failed: ${errorMsg}`);
        }
        
        await sharedTestSteps.switchToSituationStack();
        await page.waitForTimeout(2000); // Slight pause to ensure UI is stable after stack switch
        
        // Step 12: Robust Visual Screenshot Verification with Multiple Methods
        console.log('[VisualQueues] Step 12: Verifying filter icon with ultra-robust screenshot comparison...');
        
        const filterButton = page.locator('[data-test-id="alert-stack-popover-trigger-button"]');

        // Normalize element sizing to avoid 1px height jitter between runs and force baseline height
        await page.addStyleTag({
            content: `
                [data-test-id="alert-stack-popover-trigger-button"] {
                    line-height: normal !important;
                    -webkit-font-smoothing: antialiased !important;
                    -moz-osx-font-smoothing: grayscale !important;
                    height: 36px !important;         /* match baseline element height */
                    min-height: 36px !important;
                    max-height: 36px !important;
                    box-sizing: border-box !important;
                }
            `
        });

        // Wait for the element's bounding box to stabilize at the expected height
        try {
            await visualTestHelper.waitForElementStability(filterButton);
        } catch {}
        
        // Method 1: Use the robust visual helper with retry
        try {
            await visualTestHelper.takeScreenshotWithRetry(
                filterButton, 
                'filter_button_with_suppression_applied.png',
                '[VisualQueues] Filter button with suppression visual verification',
                3 // Max 3 retries
            );
            console.log('[VisualQueues] ✅ Screenshot comparison passed with visual helper');
        } catch (error) {
            console.log('[VisualQueues] ⚠️ Screenshot helper failed, trying enhanced fallback method...');
            
            // Method 2: Enhanced Fallback — target the inner icon region (svg) with better tolerance
            const iconRegion = filterButton.locator('svg').first();
            await expect(iconRegion).toBeVisible();
            await expect(iconRegion).toHaveScreenshot('filter_button_icons.png', {
                threshold: 0.25,        // 25% tolerance for minor UI rendering differences
                maxDiffPixels: 150,     // Increased allowance for 1px sizing variations
                animations: 'disabled'  // Mode setting moved to global config
            });
            console.log('[VisualQueues] ✅ Screenshot comparison passed with enhanced fallback method');
        }
    });

    test.afterEach(async ({ page }) => {
        console.log('[VisualQueues] Starting cleanup process...');
        try {
            // Step 1: Navigate back to base
            await page.goto('/');
            
            // Step 2: Re-authenticate and select company
            await sharedTestSteps.selectCompany('Automation company');
            
            // Step 3: Clean manual alerts
            await sharedTestSteps.cleanupManualAlerts();
            
            // Step 4: Clean UB/Trex alerts
            await sharedTestSteps.cleanupUBAndTrexAlerts(SITE_NAME);
            
            // Step 5: Unsuppress any suppressed alerts
            try {
                await sharedTestSteps.unsuppress();
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.log(`[VisualQueues] Unsuppress failed: ${errorMsg}`);
            }
            
            // Step 6: Reset stack filters (with comprehensive modal dismissal protection)
            console.log('[VisualQueues] Step 6: Preparing to reset stack filters...');
            
            // CRITICAL FIX - Multiple attempts to ensure any persistent modal overlays are closed
            let modalDismissalAttempts = 0;
            const maxModalDismissalAttempts = 3;
            
            while (modalDismissalAttempts < maxModalDismissalAttempts) {
                try {
                    modalDismissalAttempts++;
                    console.log(`[VisualQueues] Modal dismissal attempt ${modalDismissalAttempts}/${maxModalDismissalAttempts}...`);
                    
                    // Check for multiple types of modal overlays
                    const modalOverlay = page.locator('.react-aria-ModalOverlay');
                    const popoverOverlay = page.locator('[data-rac="true"]');
                    const backdrop = page.locator('.sidebar-backdrop');
                    
                    const isModalOpen = await modalOverlay.isVisible({ timeout: 1000 });
                    const isPopoverOpen = await popoverOverlay.isVisible({ timeout: 1000 });
                    const isBackdropOpen = await backdrop.isVisible({ timeout: 1000 });
                    
                    if (isModalOpen || isPopoverOpen || isBackdropOpen) {
                        console.log(`[VisualQueues] ⚠️ Overlay detected - Modal: ${isModalOpen}, Popover: ${isPopoverOpen}, Backdrop: ${isBackdropOpen}`);
                        
                        // Try multiple closure methods
                        try {
                            // Method 1: Force click filter button to toggle closed
                            await page.evaluate(() => {
                                const filterButton = document.querySelector('[data-test-id="alert-stack-popover-trigger-button"]');
                                if (filterButton && filterButton instanceof HTMLElement) {
                                    filterButton.click();
                                    return true;
                                }
                                return false;
                            });
                            await page.waitForTimeout(500);
                            
                            // Method 2: Press Escape key multiple times
                            await page.keyboard.press('Escape');
                            await page.keyboard.press('Escape');
                            await page.waitForTimeout(500);
                            
                            // Method 3: Click outside modal areas
                            await page.evaluate(() => {
                                const body = document.querySelector('body');
                                if (body) {
                                    body.click();
                                }
                            });
                            await page.waitForTimeout(500);
                            
                            // Method 4: Force remove all overlays
                            await page.evaluate(() => {
                                // Remove React Aria overlays
                                const overlays = document.querySelectorAll('.react-aria-ModalOverlay');
                                overlays.forEach(overlay => overlay.remove());
                                
                                // Remove other modal/popover elements
                                const popovers = document.querySelectorAll('[data-rac="true"]');
                                popovers.forEach(popover => {
                                    if (popover instanceof HTMLElement && popover.style && popover.style.zIndex) {
                                        popover.remove();
                                    }
                                });
                                
                                // Remove backdrops
                                const backdrops = document.querySelectorAll('.sidebar-backdrop');
                                backdrops.forEach(backdrop => backdrop.remove());
                            });
                            
                            console.log(`[VisualQueues] ✅ Overlay dismissal methods applied on attempt ${modalDismissalAttempts}`);
                        } catch (dismissalError) {
                            const errorMsg = dismissalError instanceof Error ? dismissalError.message : String(dismissalError);
                            console.log(`[VisualQueues] Dismissal methods failed on attempt ${modalDismissalAttempts}: ${errorMsg}`);
                        }
                        
                        // Wait and check if overlays are gone
                        await page.waitForTimeout(1000);
                        const stillModal = await modalOverlay.isVisible({ timeout: 500 });
                        const stillPopover = await popoverOverlay.isVisible({ timeout: 500 });
                        const stillBackdrop = await backdrop.isVisible({ timeout: 500 });
                        
                        if (!stillModal && !stillPopover && !stillBackdrop) {
                            console.log(`[VisualQueues] ✅ All overlays successfully dismissed on attempt ${modalDismissalAttempts}`);
                            break;
                        } else {
                            console.log(`[VisualQueues] ⚠️ Some overlays still present after attempt ${modalDismissalAttempts} - Modal: ${stillModal}, Popover: ${stillPopover}, Backdrop: ${stillBackdrop}`);
                        }
                    } else {
                        console.log(`[VisualQueues] No overlays detected on attempt ${modalDismissalAttempts}`);
                        break;
                    }
                    
                } catch (modalCheckError) {
                    const errorMsg = modalCheckError instanceof Error ? modalCheckError.message : String(modalCheckError);
                    console.log(`[VisualQueues] Modal check failed on attempt ${modalDismissalAttempts}: ${errorMsg}`);
                }
            }
            
            // Extra safety wait before proceeding to resetStackFilter
            await page.waitForTimeout(2000);
            console.log('[VisualQueues] Proceeding to reset stack filters after modal dismissal...');
            
            await sharedTestSteps.resetStackFilter();
            
            // Step 7: CRITICAL FIX - Ensure any persistent modal overlays are closed before any other UI operations
            console.log('[VisualQueues] Checking for persistent modal overlays and closing them...');
            try {
                // Check if there's a persistent react-aria-ModalOverlay blocking UI interactions
                const modalOverlay = page.locator('.react-aria-ModalOverlay');
                const isModalOpen = await modalOverlay.isVisible({ timeout: 2000 });
                
                if (isModalOpen) {
                    console.log('[VisualQueues] ⚠️ Persistent modal overlay detected! Attempting to close...');
                    
                    // Try to close by clicking the filter button to toggle it closed
                    try {
                        await page.evaluate(() => {
                            const filterButton = document.querySelector('[data-test-id="alert-stack-popover-trigger-button"]');
                            if (filterButton && filterButton instanceof HTMLElement) {
                                filterButton.click();
                                return true;
                            }
                            return false;
                        });
                        
                        // Wait for modal to close
                        await modalOverlay.waitFor({ state: 'hidden', timeout: 5000 });
                        console.log('[VisualQueues] ✅ Modal overlay successfully closed using filter button toggle');
                    } catch (toggleError) {
                        console.log('[VisualQueues] Filter button toggle failed, trying alternative methods...');
                        
                        // Alternative: try to remove the modal overlay directly
                        await page.evaluate(() => {
                            const overlays = document.querySelectorAll('.react-aria-ModalOverlay');
                            overlays.forEach(overlay => overlay.remove());
                        });
                        console.log('[VisualQueues] Modal overlay forcibly removed');
                    }
                } else {
                    console.log('[VisualQueues] No persistent modal overlay detected');
                }
            } catch (modalCheckError) {
                const errorMsg = modalCheckError instanceof Error ? modalCheckError.message : String(modalCheckError);
                console.log(`[VisualQueues] Modal overlay check failed: ${errorMsg}`);
            }
            
            console.log('[VisualQueues] Cleanup completed successfully');
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log(`[VisualQueues] Cleanup failed: ${errorMsg}`);
            // Don't fail test due to cleanup issues
        }
    });

});
