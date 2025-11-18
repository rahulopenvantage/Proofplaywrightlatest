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
    // Robust: prefer role-based case-insensitive button names, fallback to XPath text match
    this.resolveAllButton = page.getByRole('button', { name: /resolve all/i }).first();
    this.resolveAllButtonFallback = page.locator('//button[normalize-space(.)="RESOLVE ALL"]');
    this.positiveButton = page.getByRole('button', { name: /positive/i }).first();
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
                        // Fallback: wait briefly and try pressing Escape to dismiss any dialog
                        await this.page.waitForTimeout(500);
                        await this.page.keyboard.press('Escape').catch(() => {});
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
            // Prefer robust Resolve All button; fallback to strict xpath
            if (await this.resolveAllButton.isVisible().catch(() => false)) {
                await this.resolveAllButton.click({ force: true });
            } else {
                await this.resolveAllButtonFallback.click({ force: true }).catch(() => {});
            }
            await this.page.waitForLoadState('networkidle');
            // Use fixed explicit choices per user specification (Infrastructure optional)
            await this._resolveUbTrexExplicitSequence();
            await this._waitForStackEmpty('Situation', { timeoutMs: 30000, pollMs: 1000 });
        }
    }
    /**
     * Clean up UB (Unusual Behaviour) and Trex alerts for a specific site
     * 
     * 8-STEP FLOW WITH SINGLE FILTER APPLICATION:
     * 1. Already on Alerts Dashboard (handled by caller)
     * 2. Open Alerts Dashboard (ensure we're ready on Incident stack)
     * 3. Apply UB + Trex stack filter ONCE on Incident for target site
     * 4. Log stack label + card counts (pre-switch)
     * 5. If Incident empty → switch to Situation WITHOUT reapplying filter
     * 6. Log stack label again (capture inversion) + card counts (post-switch)
     * 7. Run old stable cleanup (no filter reapply, handles SOP/Resolve All POSITIVE, no context closures)
     * 8. Verify cleanup + log final state
     * 
     * KEY CONSTRAINTS:
     * - Filter applied EXACTLY ONCE (step 3)
     * - NEVER reapply filter after stack switch or during cleanup
     * - Use old stable cleanup logic (no page/context closures)
     * - Log stack label inversion throughout
     * 
     * @param {string} siteName - Name of the site to clean up (e.g., 'WVRD_9th Ave and JG Strydom Rd_62')
     */
    async ubAndTrexCleanUp(siteName = 'WVRD_9th Ave and JG Strydom Rd_62') {
        console.log('[WorkflowHelper] ========================================');
        console.log('[WorkflowHelper] UB + TREX CLEANUP - 8-STEP SINGLE-APPLY FLOW');
        console.log('[WorkflowHelper] Target Site: ' + siteName);
        console.log('[WorkflowHelper] ========================================');
        
        const alertsDashboardPage = new (await import('./AlertsDashboardPage.js')).AlertsDashboardPage(this.page);
        let currentStack = 'Incident'; // Track current stack for logging
        
        // ==========================================
        // STEP 2: Ensure we're on Alerts Dashboard and on Incident stack
        // ==========================================
        console.log('[WorkflowHelper] [STEP 2] Ensuring we start with Incident stack...');
        const incidentDropdown = this.eventsSituationsDropdown.filter({ hasText: 'Situation' });
        if (await incidentDropdown.isVisible({ timeout: 9000 })) {
            console.log('[WorkflowHelper] [STEP 2] Switching to Incident stack...');
            await incidentDropdown.click();
            await this.page.waitForLoadState('networkidle');
        }
        console.log('[WorkflowHelper] [STEP 2] ✅ Ready on Incident stack');

        // ==========================================
        // STEP 3: Apply UB + Trex filter ONCE on Incident stack
        // ==========================================
        console.log('[WorkflowHelper] [STEP 3] ========================================');
        console.log('[WorkflowHelper] [STEP 3] Applying UB + Trex filter ONCE on Incident stack');
        console.log('[WorkflowHelper] [STEP 3] ========================================');
        
        // Reset alert filter first
        console.log('[WorkflowHelper] [STEP 3] Resetting alert filter...');
        await alertsDashboardPage.resetAlertFilter();
        await this.page.waitForLoadState('networkidle');

        // Apply UB and Trex filter - SINGLE APPLICATION
        console.log(`[WorkflowHelper] [STEP 3] Applying UB and Trex filter for site: ${siteName}...`);
        try {
            await alertsDashboardPage.filterByUBAndTrex(siteName);
            console.log('[WorkflowHelper] [STEP 3] ✅ UB and Trex filter applied successfully');
            console.log('[WorkflowHelper] [STEP 3] 🔒 SINGLE APPLY CONFIRMED');
            await this.page.waitForLoadState('networkidle');
        } catch (error) {
            const errMessage = error instanceof Error ? error.message : String(error);
            console.log(`[WorkflowHelper] [STEP 3] ⚠️ Failed to apply UB/Trex filter: ${errMessage}`);
        }
        
        // CRITICAL: Log confirmation that filter will NOT be reapplied
        console.log('[WorkflowHelper] [STEP 3] 🔒 FILTER POLICY: Filter applied ONCE.');
        console.log('[WorkflowHelper] [STEP 3] 🔒 Will NOT reapply after stack switch or during cleanup.');
        console.log('[WorkflowHelper] [STEP 3] ========================================');

        // ==========================================
        // STEP 4: Log stack dropdown label and card counts (PRE-SWITCH)
        // ==========================================
        console.log('[WorkflowHelper] [STEP 4] ========================================');
        console.log('[WorkflowHelper] [STEP 4] Logging PRE-SWITCH state on Incident stack');
        console.log('[WorkflowHelper] [STEP 4] ========================================');
        
        // Get current stack dropdown label (will show OPPOSITE stack name due to inversion)
        const preDropdownLabel = await this.eventsSituationsDropdown.textContent().catch(() => 'Unknown');
        console.log(`[WorkflowHelper] [STEP 4] 📊 Stack Dropdown Label: "${preDropdownLabel}"`);
        console.log(`[WorkflowHelper] [STEP 4] 📊 Current Stack: ${currentStack}`);
        console.log('[WorkflowHelper] [STEP 4] 🔍 Note: Dropdown shows OPPOSITE stack name (label inversion)');
        
        // Wait for cards to load
        await this.page.waitForTimeout(3000);
        
        // Count cards
        const aggregatedSiteCards = this.page.locator('[data-test-id="aggregated-site-card"]');
        const ubTrexAlertCards = this.page.locator('[data-test-id="alert-card"]:has-text("Unusual Behaviour"), [data-test-id="alert-card"]:has-text("Trex")');
        const siteCardCount = await aggregatedSiteCards.count();
        const ubTrexCardCount = await ubTrexAlertCards.count();
        
        console.log(`[WorkflowHelper] [STEP 4] 📊 Site Card Count: ${siteCardCount}`);
        console.log(`[WorkflowHelper] [STEP 4] 📊 UB/Trex Alert Card Count: ${ubTrexCardCount}`);
        
        // Check for "No Results Found"
        const stackContainer = this.page.locator('[data-test-id="aggregated-alert-stack"]');
        const noResultsText = stackContainer.locator('text="No Results Found"');
        const adjustSearchText = stackContainer.locator('text="Please adjust your search to see results"');
        const incidentHasNoResults = await noResultsText.isVisible({ timeout: 3000 }).catch(() => false) || 
                                      await adjustSearchText.isVisible({ timeout: 3000 }).catch(() => false);
        
        console.log(`[WorkflowHelper] [STEP 4] 📊 "No Results Found" visible: ${incidentHasNoResults}`);
        console.log('[WorkflowHelper] [STEP 4] ========================================');

        // ==========================================
        // STEP 5: If Incident empty → switch to Situation WITHOUT reapplying filter
        // ==========================================
        let needsCleanup = false;
        
        if (siteCardCount === 0 && ubTrexCardCount === 0 && incidentHasNoResults) {
            console.log('[WorkflowHelper] [STEP 5] ========================================');
            console.log('[WorkflowHelper] [STEP 5] Incident stack is EMPTY - switching to Situation');
            console.log('[WorkflowHelper] [STEP 5] 🔒 NO FILTER REAPPLY - using existing filter');
            console.log('[WorkflowHelper] [STEP 5] ========================================');
            
            // Switch to Situation stack
            const situationDropdown = this.eventsSituationsDropdown.filter({ hasText: 'Incident' });
            if (await situationDropdown.isVisible({ timeout: 5000 })) {
                console.log('[WorkflowHelper] [STEP 5] Clicking Situation dropdown...');
                await situationDropdown.click();
                await this.page.waitForLoadState('networkidle');
                currentStack = 'Situation';
                console.log('[WorkflowHelper] [STEP 5] ✅ Switched to Situation stack (NO FILTER REAPPLY)');
            }
            
            // ==========================================
            // STEP 6: Log stack label again (capture inversion) + card counts (POST-SWITCH)
            // ==========================================
            console.log('[WorkflowHelper] [STEP 6] ========================================');
            console.log('[WorkflowHelper] [STEP 6] Logging POST-SWITCH state on Situation stack');
            console.log('[WorkflowHelper] [STEP 6] ========================================');
            
            // Wait for Situation stack to render
            await this.page.waitForTimeout(3000);
            
            // Get current stack dropdown label after switch
            const postDropdownLabel = await this.eventsSituationsDropdown.textContent().catch(() => 'Unknown');
            console.log(`[WorkflowHelper] [STEP 6] 📊 Stack Dropdown Label: "${postDropdownLabel}"`);
            console.log(`[WorkflowHelper] [STEP 6] 📊 Current Stack: ${currentStack}`);
            console.log('[WorkflowHelper] [STEP 6] 🔍 Label Inversion Captured: Dropdown now shows previous stack name');
            
            // Count cards on Situation stack
            const situationSiteCardCount = await aggregatedSiteCards.count();
            const situationUbTrexCardCount = await ubTrexAlertCards.count();
            
            console.log(`[WorkflowHelper] [STEP 6] 📊 Site Card Count: ${situationSiteCardCount}`);
            console.log(`[WorkflowHelper] [STEP 6] 📊 UB/Trex Alert Card Count: ${situationUbTrexCardCount}`);
            
            const situationHasNoResults = await noResultsText.isVisible({ timeout: 3000 }).catch(() => false) || 
                                           await adjustSearchText.isVisible({ timeout: 3000 }).catch(() => false);
            
            console.log(`[WorkflowHelper] [STEP 6] 📊 "No Results Found" visible: ${situationHasNoResults}`);
            console.log('[WorkflowHelper] [STEP 6] ========================================');
            
            // Determine if cleanup is needed on Situation stack
            if (situationSiteCardCount > 0 || situationUbTrexCardCount > 0) {
                needsCleanup = true;
                console.log('[WorkflowHelper] [STEP 6] ✅ Cards found on Situation stack - will proceed with cleanup');
            } else {
                console.log('[WorkflowHelper] [STEP 6] ℹ️ No cards on Situation stack either - nothing to clean');
            }
        } else {
            console.log('[WorkflowHelper] [STEP 5] ========================================');
            console.log('[WorkflowHelper] [STEP 5] Incident stack has cards - will clean Incident directly');
            console.log('[WorkflowHelper] [STEP 5] 🔒 NO STACK SWITCH NEEDED');
            console.log('[WorkflowHelper] [STEP 5] ========================================');
            needsCleanup = true;
        }

        // ==========================================
        // STEP 7: Run old stable cleanup (no filter reapply, no context closures)
        // ==========================================
        if (needsCleanup) {
            console.log('[WorkflowHelper] [STEP 7] ========================================');
            console.log(`[WorkflowHelper] [STEP 7] Starting cleanup on ${currentStack} stack`);
            console.log('[WorkflowHelper] [STEP 7] Using OLD STABLE CLEANUP logic');
            console.log('[WorkflowHelper] [STEP 7] 🔒 NO FILTER REAPPLY during cleanup');
            console.log('[WorkflowHelper] [STEP 7] ========================================');
            
            try {
                // Find and select the parent aggregated site card
                console.log(`[WorkflowHelper] [STEP 7] Looking for site card: ${siteName}...`);
                
                let parentSiteCard = null;
                
                // Strategy 1: Try exact XPath match first
                try {
                    parentSiteCard = this.page.locator(`//div[@data-test-id="aggregated-site-card" and .//span[contains(text(), "${siteName}")]]`);
                    await parentSiteCard.waitFor({ state: 'visible', timeout: 5000 });
                    console.log(`[WorkflowHelper] [STEP 7] ✅ Found site card using exact XPath`);
                } catch (error) {
                    console.log(`[WorkflowHelper] [STEP 7] XPath strategy failed, trying partial name...`);
                }
                
                // Strategy 2: Try partial site name matching if exact fails
                if (!await parentSiteCard?.isVisible({ timeout: 1000 }).catch(() => false)) {
                    const siteNameParts = siteName.split(' ');
                    const firstPart = siteNameParts[0];
                    
                    try {
                        parentSiteCard = this.page.locator(`[data-test-id="aggregated-site-card"]:has-text("${firstPart}")`);
                        await parentSiteCard.waitFor({ state: 'visible', timeout: 5000 });
                        console.log(`[WorkflowHelper] [STEP 7] ✅ Found site card using partial name: ${firstPart}`);
                    } catch (error) {
                        console.log(`[WorkflowHelper] [STEP 7] Partial name strategy failed, using fallback...`);
                    }
                }
                
                // Strategy 3: Try finding any aggregated site card if specific site not found
                if (!await parentSiteCard?.isVisible({ timeout: 1000 }).catch(() => false)) {
                    try {
                        parentSiteCard = this.page.locator('[data-test-id="aggregated-site-card"]').first();
                        await parentSiteCard.waitFor({ state: 'visible', timeout: 5000 });
                        console.log(`[WorkflowHelper] [STEP 7] ✅ Found site card using fallback strategy`);
                    } catch (error) {
                        throw new Error(`No site card found for cleanup on ${currentStack} stack`);
                    }
                }
                
                // Verify we have a valid card before proceeding
                if (!parentSiteCard) {
                    throw new Error(`No site card found for cleanup on ${currentStack} stack`);
                }
                
                // Click on the parent card to select it
                console.log(`[WorkflowHelper] [STEP 7] Clicking on parent site card...`);
                await parentSiteCard.click();
                console.log('[WorkflowHelper] [STEP 7] ✅ Parent site card selected');
                await this.page.waitForLoadState('networkidle');
                
                // Complete SOP if required
                console.log('[WorkflowHelper] [STEP 7] Completing SOP...');
                await this.sopPage.completeAndValidateSop();
                console.log('[WorkflowHelper] [STEP 7] ✅ SOP completed');

                // Use appropriate dismiss/resolve method based on stack
                if (currentStack === 'Incident') {
                    console.log('[WorkflowHelper] [STEP 7] Dismissing alert on Incident stack...');
                    await this.wrongDismissButton.click({ force: true });
                    console.log('[WorkflowHelper] [STEP 7] ✅ Dismiss button clicked');
                } else {
                    console.log('[WorkflowHelper] [STEP 7] Resolving alert on Situation stack with explicit choices...');
                    // Click Resolve All button to open the resolution overlay
                    console.log('[WorkflowHelper] [STEP 7] Clicking Resolve All to open resolution overlay...');
                    const resolveAllBtn = this.resolveAllButton;
                    if (await resolveAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                        await resolveAllBtn.click({ force: true });
                        console.log('[WorkflowHelper] [STEP 7] ✅ Clicked Resolve All button');
                    } else {
                        const fallback = this.resolveAllButtonFallback;
                        if (await fallback.isVisible({ timeout: 2000 }).catch(() => false)) {
                            await fallback.click({ force: true });
                            console.log('[WorkflowHelper] [STEP 7] ✅ Clicked Resolve All button (fallback)');
                        } else {
                            console.log('[WorkflowHelper] [STEP 7] ❌ Resolve All button not found');
                            try {
                                const screenshotPath = `debug/resolve-all-missing-${Date.now()}.png`;
                                await this.page.screenshot({ path: screenshotPath, fullPage: true });
                                console.log(`[WorkflowHelper] [STEP 7] Saved screenshot: ${screenshotPath}`);
                            } catch {}
                        }
                    }
                    
                    // Wait briefly for overlay to appear, then run explicit sequence
                    await this.page.waitForTimeout(800);
                    console.log('[WorkflowHelper] [STEP 7] Running UB/Trex explicit button sequence...');
                    await this._resolveUbTrexExplicitSequence();
                    console.log('[WorkflowHelper] [STEP 7] ✅ Resolution completed');
                }
                
                await this.page.waitForLoadState('networkidle');
                
                // Verify alert was cleaned up
                console.log('[WorkflowHelper] [STEP 7] Verifying cleanup...');
                await this.page.waitForTimeout(2000);
                
                let verificationAttempts = 0;
                const maxVerificationAttempts = 5;
                let alertCleanedUp = false;
                
                while (!alertCleanedUp && verificationAttempts < maxVerificationAttempts) {
                    verificationAttempts++;
                    console.log(`[WorkflowHelper] [STEP 7] Verification attempt ${verificationAttempts}/${maxVerificationAttempts}...`);
                    
                    // Check if "No Results Found" text is now visible
                    if (await noResultsText.isVisible({ timeout: 2000 }) || await adjustSearchText.isVisible({ timeout: 2000 })) {
                        alertCleanedUp = true;
                        console.log('[WorkflowHelper] [STEP 7] ✅ Alert cleaned up - "No Results Found" confirmed');
                    } else {
                        // Check if there are still cards present
                        const remainingCards = await this.page.locator('[data-test-id="aggregated-site-card"]').count();
                        if (remainingCards === 0) {
                            alertCleanedUp = true;
                            console.log('[WorkflowHelper] [STEP 7] ✅ Alert cleaned up - no cards remaining');
                        } else {
                            console.log(`[WorkflowHelper] [STEP 7] Alert still present (${remainingCards} cards), waiting...`);
                            await this.page.waitForTimeout(1000);
                        }
                    }
                }
                
                if (!alertCleanedUp) {
                    console.warn('[WorkflowHelper] [STEP 7] ⚠️ Alert may not have been fully cleaned up');
                    // Enforce failure for Situation stack per new requirement
                    if (currentStack === 'Situation') {
                        console.log('[WorkflowHelper] [STEP 7] Enforcing empty stack requirement (Situation)');
                        await this._assertStackEmpty('Situation', 'post-resolution verification loop incomplete');
                    }
                } else {
                    console.log(`[WorkflowHelper] [STEP 7] ✅ Cleanup completed on ${currentStack} stack`);
                    // Assert final emptiness strictly if Situation
                    if (currentStack === 'Situation') {
                        await this._assertStackEmpty('Situation', 'successful resolution');
                    }
                }
                
            } catch (error) {
                const errMessage = error instanceof Error ? error.message : String(error);
                console.log(`[WorkflowHelper] [STEP 7] ❌ Error during cleanup on ${currentStack} stack: ${errMessage}`);
                throw error;
            }
        } else {
            console.log('[WorkflowHelper] [STEP 7] ℹ️ No cleanup needed - both stacks are empty');
        }

        // ==========================================
        // STEP 8: Verify cleanup + log final state
        // ==========================================
        console.log('[WorkflowHelper] [STEP 8] ========================================');
        console.log('[WorkflowHelper] [STEP 8] Final verification and summary');
        console.log('[WorkflowHelper] [STEP 8] ========================================');
        
        // Log final stack label
        const finalDropdownLabel = await this.eventsSituationsDropdown.textContent().catch(() => 'Unknown');
        console.log(`[WorkflowHelper] [STEP 8] 📊 Final Stack Dropdown Label: "${finalDropdownLabel}"`);
        console.log(`[WorkflowHelper] [STEP 8] 📊 Final Stack: ${currentStack}`);
        
        // Log final card counts
        const finalSiteCardCount = await aggregatedSiteCards.count();
        const finalUbTrexCardCount = await ubTrexAlertCards.count();
        console.log(`[WorkflowHelper] [STEP 8] 📊 Final Site Card Count: ${finalSiteCardCount}`);
        console.log(`[WorkflowHelper] [STEP 8] 📊 Final UB/Trex Alert Card Count: ${finalUbTrexCardCount}`);
        // Enforce final empty state if we operated on Situation stack
        if (currentStack === 'Situation') {
            try {
                await this._assertStackEmpty('Situation', 'final summary check');
            } catch (e) {
                console.log('[WorkflowHelper] [STEP 8] ❌ Final empty-state assertion failed:', (/** @type {any} */(e)).message || e);
                throw e; // propagate failure to fail test
            }
        }
        
        // Summary
        console.log('[WorkflowHelper] [STEP 8] ========================================');
        console.log('[WorkflowHelper] [STEP 8] 🎉 CLEANUP SUMMARY:');
        console.log(`[WorkflowHelper] [STEP 8]   ✓ Filter applied: ONCE on Incident stack`);
        console.log(`[WorkflowHelper] [STEP 8]   ✓ Filter reapplied: NEVER`);
        console.log(`[WorkflowHelper] [STEP 8]   ✓ Cleanup performed on: ${currentStack} stack`);
        console.log(`[WorkflowHelper] [STEP 8]   ✓ Stack label inversion: Logged throughout`);
    console.log(`[WorkflowHelper] [STEP 8]   ✓ Final state: ${finalSiteCardCount + finalUbTrexCardCount} cards remaining (must be 0 on Situation)`);
        console.log('[WorkflowHelper] [STEP 8] ========================================');
        
        console.log('[WorkflowHelper] ✅ UB and Trex cleanup completed successfully');
        console.log('[WorkflowHelper] ========================================');
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
                    await this.page.waitForTimeout(300);
                }
            }
        }
        console.warn(`[WorkflowHelper] ⚠️ Could not confidently switch to ${stackType}; continuing`);
    }

    /**
     * Assert current stack is empty for UB/Trex target after cleanup.
     * Fails test if any aggregated-site-card or UB/Trex card remains; attaches screenshot path.
     * @param {'Incident'|'Situation'} stackType
     * @param {string} [reason]
     */
    async _assertStackEmpty(stackType, reason) {
        const stackContainer = this.page.locator('[data-test-id="aggregated-alert-stack"]');
        const noResultsText = stackContainer.locator('text="No Results Found"');
        const adjustSearchText = stackContainer.locator('text="Please adjust your search to see results"');
        const cards = this.page.locator('[data-test-id="aggregated-site-card"], [data-test-id="alert-card"]');

        // small grace wait for UI to settle
        await this.page.waitForTimeout(1000);

        const [hasNoResults, hasAdjust, cardCount] = await Promise.all([
            noResultsText.isVisible().catch(() => false),
            adjustSearchText.isVisible().catch(() => false),
            cards.count()
        ]);

        if ((hasNoResults || hasAdjust) && cardCount === 0) {
            console.log(`[WorkflowHelper] ✅ ${stackType} stack is empty${reason ? ` (${reason})` : ''}`);
            return;
        }

        const screenshotPath = `debug/stack-not-empty-${stackType}-${Date.now()}.png`;
        try { await this.page.screenshot({ path: screenshotPath, fullPage: true }); } catch {}
        throw new Error(`${stackType} stack not empty after cleanup${reason ? ` (${reason})` : ''}. ` +
            `noResults=${hasNoResults}, adjust=${hasAdjust}, cardCount=${cardCount}. Screenshot: ${screenshotPath}`);
    }

    /**
     * DYNAMIC UB/Trex resolution sequence for Situation stack.
     * Flow: Sector (optional) -> Type (click first button) -> Outcome (click first button) -> Resolve
     * No dependency on specific button text - always clicks the first visible option.
     */
    async _resolveUbTrexExplicitSequence() {
        console.log('[WorkflowHelper] 🔄 Dynamic UB/Trex resolve sequence starting (text-agnostic)');

        // Wait for overlay to appear after Resolve All click
        await this.page.waitForTimeout(1500);
        
        // Try multiple overlay detection strategies
        let active = null;
        const overlay = this.page.locator('.react-aria-ModalOverlay').first();
        if (await overlay.isVisible().catch(() => false)) {
            active = overlay;
            console.log('[WorkflowHelper] ✅ Found react-aria-ModalOverlay');
        } else {
            const anyOverlay = this.page.locator('[class*="ModalOverlay"]').first();
            if (await anyOverlay.isVisible().catch(() => false)) {
                active = anyOverlay;
                console.log('[WorkflowHelper] ✅ Found ModalOverlay');
            } else {
                const dialog = this.page.locator('[role="dialog"]').first();
                if (await dialog.isVisible().catch(() => false)) {
                    active = dialog;
                    console.log('[WorkflowHelper] ✅ Found dialog');
                } else {
                    // Last resort: use page as container
                    active = this.page;
                    console.log('[WorkflowHelper] ⚠️ Overlay not found, using page as container');
                }
            }
        }

        console.log('[WorkflowHelper] Starting dynamic button click sequence...');

        /**
         * Click the FIRST visible button with the structure:
         * button > .content-wrapper > .text-content > p.main-text
         * Returns the clicked button's text for logging, or null if none found.
         */
        const clickFirstAvailableButton = async (stepName) => {
            console.log(`[WorkflowHelper] [${stepName}] Looking for first available button...`);
            
            // Find all buttons with the expected structure
            const buttons = active.locator('button:has(div.content-wrapper > div.text-content > p.main-text)');
            const count = await buttons.count();
            
            console.log(`[WorkflowHelper] [${stepName}] Found ${count} buttons with correct structure`);
            
            if (count === 0) {
                console.log(`[WorkflowHelper] [${stepName}] ⚠️ No buttons found`);
                return null;
            }
            
            // Click the first visible button
            for (let i = 0; i < count; i++) {
                const btn = buttons.nth(i);
                if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
                    // Get the text before clicking
                    const textElement = btn.locator('p.main-text').first();
                    const buttonText = await textElement.textContent().catch(() => 'Unknown');
                    
                    await btn.click({ force: true });
                    console.log(`[WorkflowHelper] [${stepName}] ✅ Clicked first button: "${buttonText}"`);
                    return buttonText;
                }
            }
            
            console.log(`[WorkflowHelper] [${stepName}] ⚠️ No visible buttons found`);
            return null;
        };

        // Step 1: Sector (optional - skip if not found)
        console.log('[WorkflowHelper] [STEP 1: SECTOR] Checking for Sector step (optional)...');
        const sectorClicked = await clickFirstAvailableButton('SECTOR');
        if (sectorClicked) {
            console.log(`[WorkflowHelper] [STEP 1: SECTOR] ✅ Sector selected: "${sectorClicked}"`);
            await this.page.waitForTimeout(400);
        } else {
            console.log('[WorkflowHelper] [STEP 1: SECTOR] ⏭️ No Sector buttons found - SKIPPING (optional step)');
        }

        // Step 2: Type (required - click first button)
        console.log('[WorkflowHelper] [STEP 2: TYPE] Selecting Type (required)...');
        const typeClicked = await clickFirstAvailableButton('TYPE');
        if (!typeClicked) {
            console.log('[WorkflowHelper] [STEP 2: TYPE] ❌ No Type buttons found - taking screenshot');
            try {
                await this.page.screenshot({ path: `debug/type-missing-${Date.now()}.png`, fullPage: true });
            } catch {}
            return; // Graceful abort
        }
        console.log(`[WorkflowHelper] [STEP 2: TYPE] ✅ Type selected: "${typeClicked}"`);
        await this.page.waitForTimeout(400);

        // Step 3: Outcome (required - click first button)
        console.log('[WorkflowHelper] [STEP 3: OUTCOME] Selecting Outcome (required)...');
        const outcomeClicked = await clickFirstAvailableButton('OUTCOME');
        if (!outcomeClicked) {
            console.log('[WorkflowHelper] [STEP 3: OUTCOME] ❌ No Outcome buttons found - taking screenshot');
            try {
                await this.page.screenshot({ path: `debug/outcome-missing-${Date.now()}.png`, fullPage: true });
            } catch {}
            return;
        }
        console.log(`[WorkflowHelper] [STEP 3: OUTCOME] ✅ Outcome selected: "${outcomeClicked}"`);
        await this.page.waitForTimeout(400);

        // Final: Resolve button
        console.log('[WorkflowHelper] [FINAL STEP] Clicking Resolve button...');
        const resolveBtn = active.getByRole('button', { name: /^Resolve$/i }).first();
        if (await resolveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            // Wait for it to be enabled
            try { 
                await expect(resolveBtn).toBeEnabled({ timeout: 4000 }); 
            } catch {
                console.log('[WorkflowHelper] Resolve button not enabled yet, proceeding anyway...');
            }
            await resolveBtn.click({ force: true });
            console.log('[WorkflowHelper] ✅ Clicked Resolve button');
        } else {
            const resolveFallback = active.locator('button:has-text("Resolve")').first();
            if (await resolveFallback.isVisible({ timeout: 1000 }).catch(() => false)) {
                await resolveFallback.click({ force: true });
                console.log('[WorkflowHelper] ✅ Clicked Resolve button (fallback)');
            } else {
                console.log('[WorkflowHelper] ❌ Resolve button not found - taking screenshot');
                try {
                    await this.page.screenshot({ path: `debug/resolve-button-missing-${Date.now()}.png`, fullPage: true });
                } catch {}
                return;
            }
        }

        // Allow overlay to close (do NOT forcibly dismiss)
        console.log('[WorkflowHelper] Waiting for overlay to close after resolution...');
        if (active !== this.page && 'waitFor' in active) {
            await active.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
                console.log('[WorkflowHelper] ⚠️ Overlay did not close within 15s (may still be processing)');
            });
        } else {
            await this.page.waitForTimeout(2000);
        }
        console.log('[WorkflowHelper] 🎉 Dynamic UB/Trex resolve sequence finished');
    }
}
