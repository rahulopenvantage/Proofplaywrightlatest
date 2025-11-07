// e2e/WorkflowHelper.js
// @ts-check
import { expect } from '@playwright/test';
import { SopPage } from './SopPage.js';
import { TestReliabilityHelper } from './TestReliabilityHelper.js';

export class WorkflowHelper {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.sopPage = new SopPage(page);
        this.reliabilityHelper = new TestReliabilityHelper(page);

        // Locators for manualAlertCleanUp - using [testid] as in Cypress command
        this.eventsSituationsDropdown = page.locator('[testid="events-situations-dropdown"]');
        this.boeingSiteCardNameText = 'BDFD_Boeing Rd East_43'; // Site name text for filtering
        
        // Locator for the specific site card by its name
        this.boeingSiteCardByName = page.locator('[data-test-id="aggregated-site-card-name"]')
                                       .filter({ hasText: this.boeingSiteCardNameText });
        
        // Locator for the aggregated card that contains BOTH the site name and 'MA'
        this.boeingSiteCardWithMA = page.locator('[data-test-id="aggregated-site-card"]')
                                       .filter({ hasText: this.boeingSiteCardNameText })
                                       .filter({ hasText: 'MA' });

        this.wrongDismissButton = page.locator('[data-test-id="wrongDismiss"]');
        // Using getByText with XPath equivalent for RESOLVE ALL and POSITIVE buttons
        this.resolveAllButton = page.locator('//button[normalize-space(.)="RESOLVE ALL"]');
        this.positiveButton = page.locator('//button[normalize-space(.)="POSITIVE"]');
    }
    /**
     * Dynamically selects the first option from each of the three menus in the resolve flow, repeated
     * twice more (total 3 rounds), then clicks the final Resolve/confirm button.
     * Uses role/text-based selectors only (no class names), targeting the active modal dialog.
     */
    async _dynamicSelectFirstOptionsAndResolve() {
        // Prefer an aria-modal dialog; fallback to any role=dialog
        const dialog = this.page.locator('[role="dialog"][aria-modal="true"]').first();
        const anyDialog = this.page.locator('[role="dialog"]').first();
        const activeDialog = (await dialog.count()) ? dialog : anyDialog;
        await activeDialog.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

        // Helper: click first selectable option in the current step
        const clickFirstSelectable = async () => {
            // Normalize scroll to ensure first items are in view
            try {
                await activeDialog.evaluate(el => { el.scrollTop = 0; });
            } catch {}

            // Candidate selectors in priority order
            const selectors = [
                '[role="radio"]',
                '[role="option"]',
                '[role="menuitemradio"]',
                'button',
                '[role="button"]',
                '[tabindex]:not([tabindex="-1"])'
            ];

            // Exclusion pattern for navigation buttons
            /** @param {string | null | undefined} text */
            const isNavButton = (text) => /^(Back|Cancel|Close|Resolve All|Next|Previous)$/i.test((text || '').trim());

            for (const sel of selectors) {
                const list = activeDialog.locator(sel);
                const count = await list.count().catch(() => 0);
                if (count === 0) continue;

                // Find first visible & non-nav element
                const max = Math.min(count, 10);
                for (let i = 0; i < max; i++) {
                    const el = list.nth(i);
                    if (!(await el.isVisible().catch(() => false))) continue;
                    const name = (await el.textContent().catch(() => '')) || '';
                    if (sel.includes('button') && isNavButton(name)) continue;
                    try {
                        if (sel === '[role="radio"]') {
                            await el.check({ force: true });
                        } else {
                            await el.click({ force: true });
                        }
                        return true;
                    } catch {}
                }
            }
            return false;
        };

        // Attempt up to 6 selections to cover Sector → Type → Outcome transitions (some UIs require extra clicks)
        for (let i = 0; i < 6; i++) {
            const clicked = await clickFirstSelectable();
            if (!clicked) {
                console.log('[WorkflowHelper] No selectable option found on this step');
                break;
            }
            await this.page.waitForTimeout(250);

            // If Resolve button is visible/enabled, we can stop selecting
            const resolveReady = await activeDialog.getByRole('button', { name: /^Resolve$/i })
                .isVisible({ timeout: 200 }).catch(() => false);
            if (resolveReady && i >= 2) break; // Ensure we attempted at least 3 selections
        }

        // Click the primary Resolve button (not Resolve All)
        const resolveBtn = activeDialog.getByRole('button', { name: /^Resolve$/i }).first();
        if (await resolveBtn.isVisible().catch(() => false)) {
            await resolveBtn.click({ force: true });
        } else {
            // Fallback: click last non-nav button
            const fallbackBtn = activeDialog.locator('button:visible').filter({ hasNotText: /(Back|Cancel|Close|Resolve All)/i }).last();
            if (await fallbackBtn.isVisible().catch(() => false)) {
                await fallbackBtn.click({ force: true });
            }
        }

        // Wait for dialog to close to ensure action completed
        await activeDialog.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
        await this.page.waitForLoadState('networkidle');
        await this._ensureNoModalOrOverlay({ timeoutMs: 15000 }).catch(() => {});
    }

    /**
     * Ensure there are no visible modal dialogs or overlays intercepting clicks.
     * Avoids class-based selectors; relies on role/text semantics and generic dismissal patterns.
     * @param {{ timeoutMs?: number }} [opts]
     */
    async _ensureNoModalOrOverlay(opts) {
        const timeoutMs = opts?.timeoutMs ?? 15000;
        const start = Date.now();

        const dialogs = this.page.locator('[role="dialog"]');
        const activeModal = this.page.locator('[role="dialog"][aria-modal="true"]').first();

        /** Helper to determine if any dialog is visible */
        const anyDialogVisible = async () => {
            const count = await dialogs.count();
            for (let i = 0; i < count; i++) {
                const dlg = dialogs.nth(i);
                if (await dlg.isVisible().catch(() => false)) return true;
            }
            return false;
        };

        // Try up to timeoutMs to close any visible dialogs/overlays
        while (Date.now() - start < timeoutMs) {
            if (!(await anyDialogVisible())) return; // Nothing visible

            // Prefer Close/Cancel buttons inside the active modal
            const container = (await activeModal.isVisible().catch(() => false)) ? activeModal : dialogs.first();
            const closeBtn = container.getByRole('button', { name: /^(Close|Cancel|Dismiss)$/i }).first();
            if (await closeBtn.isVisible().catch(() => false)) {
                await closeBtn.click({ force: true }).catch(() => {});
                await this.page.waitForTimeout(200);
            } else {
                // Try Escape key to dismiss react-aria overlays
                await this.page.keyboard.press('Escape').catch(() => {});
                await this.page.waitForTimeout(200);
            }

            // As a last resort, click a safe area (main region or body top-left)
            const mainRegion = this.page.locator('main, [role="main"]').first();
            if (await mainRegion.isVisible().catch(() => false)) {
                await mainRegion.click({ position: { x: 5, y: 5 } }).catch(() => {});
            } else {
                await this.page.mouse.click(10, 10).catch(() => {});
            }

            // Give time for overlays to animate out
            await this.page.waitForTimeout(250);

            // If still visible, loop again until timeout
        }
        // If we reach here, an overlay may still be present; log but don't throw to avoid flakiness
        console.warn('[WorkflowHelper] ⚠️ Overlay may still be present after timeout; proceeding with caution');
    }
    /**
     * Wait until the current stack shows empty state or has zero cards.
     * Returns true if empty state confirmed within timeout.
     * @param {'Situation'|'Incident'} stackType
     * @param {{timeoutMs?: number, pollMs?: number}} [opts]
     */
    async _waitForStackEmpty(stackType, opts) {
        const timeoutMs = opts?.timeoutMs ?? 30000; // default 30s for slower envs
        const pollMs = opts?.pollMs ?? 1000;
        const start = Date.now();
        const stackContainer = this.page.locator('[data-test-id="aggregated-alert-stack"]');
        const noResultsText = stackContainer.locator('text="No Results Found"');
        const adjustSearchText = stackContainer.locator('text="Please adjust your search to see results"');
        while (Date.now() - start < timeoutMs) {
            // Prefer explicit empty-state signals
            if (await noResultsText.isVisible({ timeout: 500 }).catch(() => false) ||
                await adjustSearchText.isVisible({ timeout: 500 }).catch(() => false)) {
                console.log(`[WorkflowHelper] ✅ ${stackType} stack empty confirmed via empty-state text`);
                return true;
            }
            // Fallback to zero cards check
            const siteCards = await this.page.locator('[data-test-id="aggregated-site-card"]').count();
            const manualCards = await this.page.locator('[data-test-id="manual-alert-card"]').count();
            if (siteCards === 0 && manualCards === 0) {
                console.log(`[WorkflowHelper] ✅ ${stackType} stack empty confirmed via zero cards`);
                return true;
            }
            await this.page.waitForTimeout(pollMs);
        }
        console.warn(`[WorkflowHelper] ⚠️ ${stackType} stack not empty after ${timeoutMs}ms`);
        return false;
    }
    /**
     * Performs dynamic cleanup routine for manual alerts.
     * Checks for "No Results Found" text first, then processes visible MA cards.
     */
    async manualAlertCleanUp() {
        console.log('[WorkflowHelper] Starting manual alert cleanup...');
        
        const alertsDashboardPage = new (await import('./AlertsDashboardPage.js')).AlertsDashboardPage(this.page);
        
        // Ensure we start on Incident stack
        await this._switchToStack('Incident');

        // 1) Reset filter and apply Manual Alert filter
        console.log('[WorkflowHelper] Resetting alert filter...');
        await alertsDashboardPage.resetAlertFilter();
        await alertsDashboardPage.filterByManualAlert();
        await this.page.waitForLoadState('networkidle');

        // 2) Process Incident stack first per desired flow
        await this._processStackForManualAlerts('Incident');

        // 3) Then process Situation stack
        await this._processStackForManualAlerts('Situation');
        
        console.log('[WorkflowHelper] Manual alert cleanup completed');
    }
    /**
     * Helper method to process manual alerts on a specific stack
     * @param {'Situation' | 'Incident'} stackType - Stack type to process
     */
    async _processStackForManualAlerts(stackType) {
        console.log(`[WorkflowHelper] Processing ${stackType} stack for manual alerts...`);

        // Switch stacks robustly
        await this._switchToStack(stackType);

        const manualAlertCards = this.page.locator('[data-test-id="manual-alert-card"]');
        const aggregatedSiteCards = this.page.locator('[data-test-id="aggregated-site-card"]');

        // Wait briefly for cards to render
        try {
            await Promise.race([
                manualAlertCards.first().waitFor({ timeout: 5000 }),
                aggregatedSiteCards.first().waitFor({ timeout: 5000 })
            ]);
        } catch {}

        const manualCardCount = await manualAlertCards.count();
        const siteCardCount = await aggregatedSiteCards.count();
        console.log(`[WorkflowHelper] Found ${manualCardCount} manual alert cards and ${siteCardCount} site cards on ${stackType} stack`);

        // If no cards, check explicit empty state
        if (manualCardCount === 0 && siteCardCount === 0) {
            const stackContainer = this.page.locator('[data-test-id="aggregated-alert-stack"]');
            const noResultsText = stackContainer.locator('text="No Results Found"');
            const adjustSearchText = stackContainer.locator('text="Please adjust your search to see results"');
            if (await noResultsText.isVisible({ timeout: 3000 }).catch(() => false) ||
                await adjustSearchText.isVisible({ timeout: 3000 }).catch(() => false)) {
                console.log(`[WorkflowHelper] ✅ No Results Found on ${stackType} stack - nothing to clean`);
                return;
            }
        }

        if (stackType === 'Incident') {
            // Click an aggregated site card (prefer one containing 'MA')
            const aggregatedWithMA = this.page.locator('[data-test-id="aggregated-site-card"]').filter({ hasText: 'MA' }).first();
            const anyAggregated = this.page.locator('[data-test-id="aggregated-site-card"]').first();
            const targetAggregated = await aggregatedWithMA.isVisible({ timeout: 1000 }).catch(() => false) ? aggregatedWithMA : anyAggregated;

            if (await targetAggregated.isVisible({ timeout: 3000 }).catch(() => false)) {
                await targetAggregated.click();
                await this.page.waitForLoadState('networkidle');

                await this.sopPage.completeAndValidateSop();

                const dismissVisible = await this.wrongDismissButton.isVisible({ timeout: 2000 }).catch(() => false);
                if (dismissVisible) {
                    console.log('[WorkflowHelper] Dismissing manual alert group on Incident...');
                    await this.wrongDismissButton.click({ force: true });
                } else {
                    console.log('[WorkflowHelper] Dismiss not available; using Resolve All on Incident...');
                    await this.resolveAllButton.click({ force: true });
                    await this.page.waitForLoadState('networkidle');
                    const positiveVisible = await this.positiveButton.isVisible({ timeout: 2000 }).catch(() => false);
                    if (positiveVisible) {
                        await this.positiveButton.click({ force: true });
                    } else {
                        await this._dynamicSelectFirstOptionsAndResolve();
                    }
                }

                await this._waitForStackEmpty('Incident', { timeoutMs: 30000, pollMs: 1000 });
            } else {
                console.log(`[WorkflowHelper] No aggregated site card available on ${stackType} stack`);
            }
        } else {
            const alertsDashboardPage = new (await import('./AlertsDashboardPage.js')).AlertsDashboardPage(this.page);
            await alertsDashboardPage.expandAndSelectFirstManualAlertCard();
            await this.sopPage.completeAndValidateSop();
            await this.resolveAllButton.click({ force: true });
            await this.page.waitForLoadState('networkidle');
            await this._dynamicSelectFirstOptionsAndResolve();
            await this._waitForStackEmpty('Situation', { timeoutMs: 30000, pollMs: 1000 });
        }
    }
    /**
     * Performs dynamic cleanup routine for UB and Trex alerts.
     * Always processes Incident stack first, then Situation stack.
     * @param {string} siteName - Name of the site to clean up (e.g., 'WVRD_9th Ave and JG Strydom Rd_62')
     */
    async ubAndTrexCleanUp(siteName = 'WVRD_9th Ave and JG Strydom Rd_62') {
        console.log('[WorkflowHelper] Starting UB and Trex cleanup...');
        
        const alertsDashboardPage = new (await import('./AlertsDashboardPage.js')).AlertsDashboardPage(this.page);
        
     //    const Dropdown = this.eventsSituationsDropdown.filter({ hasText: 'Situation' });
      //  if (await Dropdown.isVisible({ timeout: 5000 })) {
      //      await Dropdown.click();
      //     await this.page.waitForLoadState('networkidle');
      //  }    

        // STEP 1: Always ensure we start with Incident stack first
        console.log('[WorkflowHelper] Ensuring we start with Incident stack...');
        const incidentDropdown = this.eventsSituationsDropdown.filter({ hasText: 'Situation' });
        if (await incidentDropdown.isVisible({ timeout: 9000 })) {
            await incidentDropdown.click();
            await this.page.waitForLoadState('networkidle');
        }

        // STEP 2: Process Incident stack (complete flow including filter reset and application)
        console.log('[WorkflowHelper] ========== Processing INCIDENT stack ==========');
        
        // Reset alert filter
        console.log('[WorkflowHelper] Resetting alert filter...');
        await alertsDashboardPage.resetAlertFilter();
        await this.page.waitForLoadState('networkidle');

        // Apply UB and Trex filter
        console.log(`[WorkflowHelper] Applying UB and Trex filter for site: ${siteName}...`);
        try {
            await alertsDashboardPage.filterByUBAndTrex(siteName);
            console.log('[WorkflowHelper] ✅ UB and Trex filter applied successfully');
            await this.page.waitForLoadState('networkidle');
        } catch (error) {
            const errMessage = error instanceof Error ? error.message : String(error);
            console.log(`[WorkflowHelper] ⚠️ Failed to apply UB/Trex filter: ${errMessage}`);
        }        // IMPROVED LOGIC: Enhanced wait for cards to load with better timing for Incident stack
        
        // Step 1: Wait for UB/Trex cards or site cards to appear with enhanced timing
        const aggregatedSiteCards = this.page.locator('[data-test-id="aggregated-site-card"]');
        const ubTrexAlertCards = this.page.locator('[data-test-id="alert-card"]:has-text("Unusual Behaviour"), [data-test-id="alert-card"]:has-text("Trex")');
        
        console.log('[WorkflowHelper] Waiting for UB/Trex cards to appear on Incident stack with enhanced timing...');
        
        // Use the reliability helper for consistent waiting
        try {
            await this.reliabilityHelper.waitForAlertsToRender('Incident', {
                minimumWaitTime: 3000,  // 3 seconds minimum for incident stack (reduced from 5000ms)
                maxWaitTime: 5000,     // 15 seconds maximum
                checkInterval: 1000     // Check every 1 second
            });
            
            console.log('[WorkflowHelper] Initial alert rendering wait completed for Incident stack');
        } catch (error) {
            console.log('[WorkflowHelper] Alert rendering wait completed with warnings for Incident stack');
        }
        
        // Step 2: Now count the cards after timeout
        const siteCardCount = await aggregatedSiteCards.count();
        const ubTrexCardCount = await ubTrexAlertCards.count();
        
        console.log(`[WorkflowHelper] Found ${siteCardCount} site cards and ${ubTrexCardCount} UB/Trex cards on Incident stack`);
        
        // Step 3: If no cards found after timeout, then check for "No Results Found" text
        if (siteCardCount === 0 && ubTrexCardCount === 0) {
            // Use the aggregated-alert-stack container to find the "No Results Found" text more reliably
            const stackContainer = this.page.locator('[data-test-id="aggregated-alert-stack"]');
            const noResultsText = stackContainer.locator('text="No Results Found"');
            const adjustSearchText = stackContainer.locator('text="Please adjust your search to see results"');
            
            if (await noResultsText.isVisible({ timeout: 3000 }) || await adjustSearchText.isVisible({ timeout: 3000 })) {
                console.log('[WorkflowHelper] ✅ No UB/Trex cards found and "No Results Found" text detected on Incident stack - skipping Incident cleanup');
            } else {
                console.log('[WorkflowHelper] No UB/Trex cards found but no "No Results Found" text either on Incident stack - proceeding with caution');
            }
        } else {
            // Step 3: Process UB/Trex cards if found - target PARENT card directly
            try {
                console.log(`[WorkflowHelper] Found cards for site: ${siteName}, proceeding with PARENT card cleanup...`);
                
                // Enhanced site card detection with multiple strategies
                let parentSiteCard = null;
                
                // Strategy 1: Try exact XPath match first
                try {
                    parentSiteCard = this.page.locator(`//div[@data-test-id="aggregated-site-card" and .//span[contains(text(), "${siteName}")]]`);
                    await parentSiteCard.waitFor({ state: 'visible', timeout: 5000 });
                    console.log(`[WorkflowHelper] ✅ Found site card using exact XPath for: ${siteName}`);
                } catch (error) {
                    const errMessage = error instanceof Error ? error.message : String(error);
                    console.log(`[WorkflowHelper] XPath strategy failed: ${errMessage}`);
                }
                
                // Strategy 2: Try partial site name matching if exact fails
                if (!await parentSiteCard?.isVisible({ timeout: 1000 }).catch(() => false)) {
                    const siteNameParts = siteName.split(' ');
                    const firstPart = siteNameParts[0]; // e.g., "WVRD_9th"
                    
                    try {
                        parentSiteCard = this.page.locator(`[data-test-id="aggregated-site-card"]:has-text("${firstPart}")`);
                        await parentSiteCard.waitFor({ state: 'visible', timeout: 5000 });
                        console.log(`[WorkflowHelper] ✅ Found site card using partial name: ${firstPart}`);
                    } catch (error) {
                        const errMessage = error instanceof Error ? error.message : String(error);
                        console.log(`[WorkflowHelper] Partial name strategy failed: ${errMessage}`);
                    }
                }
                
                // Strategy 3: Try finding any aggregated site card if specific site not found
                if (!await parentSiteCard?.isVisible({ timeout: 1000 }).catch(() => false)) {
                    try {
                        parentSiteCard = this.page.locator('[data-test-id="aggregated-site-card"]').first();
                        await parentSiteCard.waitFor({ state: 'visible', timeout: 5000 });
                        console.log(`[WorkflowHelper] ✅ Found site card using fallback strategy (first available)`);
                    } catch (error) {
                        const errMessage = error instanceof Error ? error.message : String(error);
                        console.log(`[WorkflowHelper] Fallback strategy failed: ${errMessage}`);
                    }
                }
                
                // Verify we have a valid card before proceeding
                if (!parentSiteCard || !await parentSiteCard.isVisible({ timeout: 1000 }).catch(() => false)) {
                    console.log(`[WorkflowHelper] ❌ No aggregated site card found for ${siteName} on Incident stack`);
                    throw new Error(`No site card found for cleanup on Incident stack`);
                }
                
                // Click on the parent card to select it (but don't expand)
                console.log(`[WorkflowHelper] Clicking on parent aggregated site card...`);
                await parentSiteCard.click();
                console.log('[WorkflowHelper] ✅ Successfully selected parent site card on Incident stack');
                
                await this.page.waitForLoadState('networkidle');
                
                // Complete SOP if required
                await this.sopPage.completeAndValidateSop();

                // Click the parent card's dismiss button to dismiss ALL child alerts
                console.log('[WorkflowHelper] Clicking wrong dismiss button for parent aggregated card...');
                await this.wrongDismissButton.click({ force: true });
                await this.page.waitForLoadState('networkidle');
                
                // CRITICAL: Wait for the alert to be removed and verify "No Results Found" appears
                console.log('[WorkflowHelper] Waiting for alert to be dismissed and "No Results Found" to appear...');
                await this.page.waitForTimeout(2000); // Give time for UI to update
                
                // Check if the alert was actually removed by looking for "No Results Found"
                const stackContainer = this.page.locator('[data-test-id="aggregated-alert-stack"]');
                const noResultsText = stackContainer.locator('text="No Results Found"');
                const adjustSearchText = stackContainer.locator('text="Please adjust your search to see results"');
                
                let verificationAttempts = 0;
                const maxVerificationAttempts = 5;
                let alertDismissed = false;
                
                while (!alertDismissed && verificationAttempts < maxVerificationAttempts) {
                    verificationAttempts++;
                    console.log(`[WorkflowHelper] Verification attempt ${verificationAttempts}/${maxVerificationAttempts} - checking if alert was dismissed...`);
                    
                    // Check if "No Results Found" text is now visible
                    if (await noResultsText.isVisible({ timeout: 2000 }) || await adjustSearchText.isVisible({ timeout: 2000 })) {
                        alertDismissed = true;
                        console.log('[WorkflowHelper] ✅ Alert successfully dismissed - "No Results Found" text confirmed');
                    } else {
                        // Check if there are still cards present
                        const remainingCards = await this.page.locator('[data-test-id="aggregated-site-card"]').count();
                        if (remainingCards === 0) {
                            alertDismissed = true;
                            console.log('[WorkflowHelper] ✅ Alert successfully dismissed - no cards remaining');
                        } else {
                            console.log(`[WorkflowHelper] Alert still present (${remainingCards} cards remaining), waiting...`);
                            await this.page.waitForTimeout(1000);
                        }
                    }
                }
                
                if (!alertDismissed) {
                    console.warn('[WorkflowHelper] ⚠️ Alert may not have been properly dismissed after maximum attempts');
                } else {
                    console.log('[WorkflowHelper] ✅ UB/Trex Incident stack cleanup completed and verified');
                }
                
            } catch (error) {
                const errMessage = error instanceof Error ? error.message : String(error);
                console.log(`[WorkflowHelper] ⚠️ Error processing UB/Trex cards on Incident stack: ${errMessage}`);
            }
        }        // STEP 3: Switch to Situation stack and process with enhanced timing
        console.log('[WorkflowHelper] ========== Processing SITUATION stack ==========');
        const situationDropdown = this.eventsSituationsDropdown.filter({ hasText: 'Incident' });
        if (await situationDropdown.isVisible({ timeout: 5000 })) {
            console.log('[WorkflowHelper] Switching to Situation stack...');
            await situationDropdown.click();
            
            // Use enhanced stack switching with proper alert rendering wait
            await this.reliabilityHelper.switchStackWithAlertsWait('Situation', {
                waitAfterSwitch: 3000, // 3 seconds minimum wait for UB/Trex alerts to render
                retryCount: 2
            });
        } else {
            // Even if dropdown not found, ensure alerts have time to render
            console.log('[WorkflowHelper] Dropdown not found, ensuring alerts have time to render...');
            await this.reliabilityHelper.waitForAlertsToRender('Situation', {
                minimumWaitTime: 3000, // 3 seconds minimum for situation stack (reduced from 8000ms)
                maxWaitTime: 20000
            });
        }        // IMPROVED LOGIC: Enhanced wait for cards to load with extended timeout for Situation stack
        
        // Step 1: Extended wait for UB/Trex cards or site cards to appear on Situation stack
        const situationSiteCards = this.page.locator('[data-test-id="aggregated-site-card"]');
        const situationUbTrexCards = this.page.locator('[data-test-id="alert-card"]:has-text("Unusual Behaviour"), [data-test-id="alert-card"]:has-text("Trex")');
        
        console.log('[WorkflowHelper] Waiting for UB/Trex cards to appear on Situation stack with enhanced timing...');
        
        // Use the reliability helper's enhanced waiting mechanism
        try {
            await this.reliabilityHelper.waitForAlertsToRender('Situation', {
                minimumWaitTime: 3000,  // 3 seconds minimum for situation stack (reduced from 6000ms)
                maxWaitTime: 18000,     // 18 seconds maximum
                checkInterval: 1500     // Check every 1.5 seconds
            });
            
            // Additional check for specific UB/Trex cards after general alert wait
            await Promise.race([
                situationUbTrexCards.first().waitFor({ state: 'visible', timeout: 3000 }),
                situationSiteCards.first().waitFor({ state: 'visible', timeout: 3000 })
            ]);
            console.log('[WorkflowHelper] Cards detected on Situation stack after enhanced wait');
        } catch (error) {
            console.log('[WorkflowHelper] No cards appeared within enhanced timeout on Situation stack');
        }
        
        // Step 2: Now count the cards after timeout
        const situationSiteCardCount = await situationSiteCards.count();
        const situationUbTrexCardCount = await situationUbTrexCards.count();
        
        console.log(`[WorkflowHelper] Found ${situationSiteCardCount} site cards and ${situationUbTrexCardCount} UB/Trex cards on Situation stack`);
        
        // Step 3: If no cards found after timeout, then check for "No Results Found" text
        if (situationSiteCardCount === 0 && situationUbTrexCardCount === 0) {
            // Use the aggregated-alert-stack container to find the "No Results Found" text more reliably
            const situationStackContainer = this.page.locator('[data-test-id="aggregated-alert-stack"]');
            const situationNoResultsText = situationStackContainer.locator('text="No Results Found"');
            const situationAdjustSearchText = situationStackContainer.locator('text="Please adjust your search to see results"');
            
            if (await situationNoResultsText.isVisible({ timeout: 3000 }) || await situationAdjustSearchText.isVisible({ timeout: 3000 })) {
                console.log('[WorkflowHelper] ✅ No UB/Trex cards found and "No Results Found" text detected on Situation stack - cleanup completed');
            } else {
                console.log('[WorkflowHelper] No UB/Trex cards found but no "No Results Found" text either on Situation stack - proceeding with caution');
            }
        } else {
            // Step 3: Process UB/Trex cards if found
            try {
                await alertsDashboardPage.expandAndSelectUBAndTrexCard(siteName);
                console.log('[WorkflowHelper] ✅ Successfully selected UB/Trex alert card on Situation stack');
                await this.page.waitForLoadState('networkidle');
                
                await this.sopPage.completeAndValidateSop();
                
                console.log('[WorkflowHelper] Clicking RESOLVE ALL button for UB/Trex...');
                await this.resolveAllButton.click({ force: true });
                await this.page.waitForLoadState('networkidle');
                
                // Select resolution categories for Situation stack
                console.log('[WorkflowHelper] Using dynamic 3-menu first-option selection and Resolve...');
                await this._dynamicSelectFirstOptionsAndResolve();
                
                // CRITICAL: Wait for the alert to be resolved and verify "No Results Found" appears
                console.log('[WorkflowHelper] Waiting for alert to be resolved and "No Results Found" to appear...');
                await this.page.waitForTimeout(2000); // Give time for UI to update
                
                // Check if the alert was actually resolved by looking for "No Results Found"
                const situationStackContainer = this.page.locator('[data-test-id="aggregated-alert-stack"]');
                const situationNoResultsText = situationStackContainer.locator('text="No Results Found"');
                const situationAdjustSearchText = situationStackContainer.locator('text="Please adjust your search to see results"');
                
                let situationVerificationAttempts = 0;
                const maxSituationVerificationAttempts = 5;
                let situationAlertResolved = false;
                
                while (!situationAlertResolved && situationVerificationAttempts < maxSituationVerificationAttempts) {
                    situationVerificationAttempts++;
                    console.log(`[WorkflowHelper] Situation verification attempt ${situationVerificationAttempts}/${maxSituationVerificationAttempts} - checking if alert was resolved...`);
                    
                    // Check if "No Results Found" text is now visible
                    if (await situationNoResultsText.isVisible({ timeout: 2000 }) || await situationAdjustSearchText.isVisible({ timeout: 2000 })) {
                        situationAlertResolved = true;
                        console.log('[WorkflowHelper] ✅ Alert successfully resolved - "No Results Found" text confirmed');
                    } else {
                        // Check if there are still cards present
                        const remainingSituationCards = await this.page.locator('[data-test-id="aggregated-site-card"]').count();
                        if (remainingSituationCards === 0) {
                            situationAlertResolved = true;
                            console.log('[WorkflowHelper] ✅ Alert successfully resolved - no cards remaining');
                        } else {
                            console.log(`[WorkflowHelper] Alert still present (${remainingSituationCards} cards remaining), waiting...`);
                            await this.page.waitForTimeout(1000);
                        }
                    }
                }
                
                if (!situationAlertResolved) {
                    console.warn('[WorkflowHelper] ⚠️ Alert may not have been properly resolved after maximum attempts');
                } else {
                    console.log('[WorkflowHelper] ✅ UB/Trex Situation stack cleanup completed and verified');
                }
                
            } catch (error) {
                const errMessage = error instanceof Error ? error.message : String(error);
                console.log(`[WorkflowHelper] ⚠️ Error processing UB/Trex cards on Situation stack: ${errMessage}`);
            }
        }
          // Final assertion: ensure no UB/Trex alerts remain for the site on BOTH stacks
          await this._assertNoUbTrexAlertsRemaining(siteName);

          console.log('[WorkflowHelper] UB and Trex cleanup completed');
    }

    /**
     * Internal: Switch to a given stack using the dropdown label logic
     * @param { 'Incident' | 'Situation' } stackType
     */
    async _switchToStack(stackType) {
        // The dropdown shows the name of the OTHER stack to switch to
        // So when we want Incident, we click the button that contains text "Situation"
        const targetLabel = stackType === 'Incident' ? 'Situation' : 'Incident';
        const dropdown = this.eventsSituationsDropdown.filter({ hasText: targetLabel });

        // Ensure no lingering overlays before trying to click
        await this._ensureNoModalOrOverlay({ timeoutMs: 8000 }).catch(() => {});

        if (await dropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
            // Try up to 3 times in case of intercepted clicks
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await dropdown.click();
                    await this.page.waitForLoadState('networkidle');
                    // Basic confirmation: after switch, the dropdown text should flip
                    const confirmLabel = stackType; // After clicking targetLabel, we should now see desired stack text
                    const confirmVisible = await this.eventsSituationsDropdown
                        .filter({ hasText: confirmLabel })
                        .isVisible({ timeout: 2000 })
                        .catch(() => false);
                    if (confirmVisible) return; // switch successful
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.log(`[WorkflowHelper] Retry ${attempt}/3 switching to ${stackType} due to: ${msg}`);
                    await this._ensureNoModalOrOverlay({ timeoutMs: 3000 }).catch(() => {});
                    await this.page.waitForTimeout(300);
                }
            }
        }
        console.warn(`[WorkflowHelper] ⚠️ Could not confidently switch to ${stackType}; continuing`);
    }

    /**
     * Internal: Assert that no UB/Trex alerts remain for the given site on BOTH stacks.
     * Throws if any matching cards remain after cleanup.
     * @param {string} siteName
     */
    async _assertNoUbTrexAlertsRemaining(siteName) {
        const AlertsDashboardPage = (await import('./AlertsDashboardPage.js')).AlertsDashboardPage;
        const alertsDashboardPage = new AlertsDashboardPage(this.page);

    /** @type {Array<'Incident'|'Situation'>} */
    const stacks = ['Incident', 'Situation'];
    for (const stack of stacks) {
            console.log(`[WorkflowHelper] Verifying no remaining UB/Trex alerts on ${stack} stack for site: ${siteName}`);
            await this._switchToStack(stack);

            // Re-apply strict filter by site + UB/Trex to limit to target site
            try {
                await alertsDashboardPage.filterByUBAndTrex(siteName);
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.log(`[WorkflowHelper] Filter apply warning on ${stack} stack:`, msg);
            }

            // Give a brief moment for results to settle
            await this.page.waitForTimeout(1000);

            const siteCards = this.page.locator('[data-test-id="aggregated-site-card"]');
            const ubTrexCards = this.page.locator('[data-test-id="alert-card"]:has-text("Unusual Behaviour"), [data-test-id="alert-card"]:has-text("Trex")');

            const [siteCardCount, ubTrexCardCount] = await Promise.all([
                siteCards.count(),
                ubTrexCards.count()
            ]);

            const noResultsVisible = await this.page.getByText('No Results Found').isVisible().catch(() => false);

            // Consider cleanup failed only if UB/Trex cards remain; ignore presence of site group if it has no UB/Trex
            if (ubTrexCardCount > 0) {
                // Cards still present -> fail the test with clear context
                const screenshotPath = `debug/cleanup-unresolved-${stack}-${Date.now()}.png`;
                try { await this.page.screenshot({ path: screenshotPath, fullPage: true }); } catch {}
                throw new Error(`UB/Trex cleanup failed on ${stack} stack for site "${siteName}". ` +
                    `Remaining ubTrexCards=${ubTrexCardCount}. siteCards=${siteCardCount}. ` +
                    `Screenshot: ${screenshotPath}`);
            }

            if (siteCardCount > 0 && ubTrexCardCount === 0) {
                console.log(`[WorkflowHelper] Site group present on ${stack} but no UB/Trex cards remain (acceptable).`);
            }

            if (!noResultsVisible) {
                // Even when count is 0, we expect explicit empty-state; warn but don't fail
                console.log(`[WorkflowHelper] No cards found on ${stack} stack; empty-state text not visible (non-fatal).`);
            }

            console.log(`[WorkflowHelper] ✅ No remaining UB/Trex alerts on ${stack} stack for site: ${siteName}`);
        }
    }
}
