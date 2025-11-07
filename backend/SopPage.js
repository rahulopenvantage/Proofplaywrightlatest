// e2e/SopPage.js
// @ts-check
import { expect } from '@playwright/test';

export class SopPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.sopTab = page.locator('[data-test-id="SOP-tab"]');
        this.answerButton = page.getByTestId('answer-button'); // Assuming this is the correct TestId for answer buttons
        this.sopCompleteText = 'Standard operating procedure complete';
        this.dispatchButton = page.locator('button:has-text("DISPATCH")').last(); // Use last() to avoid strict mode violation
    }

    /**
     * Debug method to check answer button visibility and take screenshot
     */
    async debugSopAnswerButtons() {
        console.log('[SopPage] Debugging SOP answer buttons - checking visibility...');
        
        // Check the working answer button locator
        try {
            const yesButton = this.page.locator('button:has-text("Yes")');
            const count = await yesButton.count();
            console.log(`[SopPage] Yes button count: ${count}`);
            
            if (count > 0) {
                for (let i = 0; i < count; i++) {
                    const button = yesButton.nth(i);
                    const isVisible = await button.isVisible();
                    if (isVisible) {
                        const textContent = await button.textContent();
                        const tagName = await button.evaluate(el => el.tagName);
                        const className = await button.getAttribute('class');
                        const testId = await button.getAttribute('data-test-id');
                        console.log(`[SopPage] ✅ Yes Button ${i}: ${tagName}, text: "${textContent}", class: "${className}", test-id: "${testId}"`);
                    }
                }
            }
        } catch (error) {
            console.log(`[SopPage] Yes button check failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Check for fallback answer button with test-id
        try {
            const answerButton = this.page.locator('[data-test-id="answer-button"]');
            const count = await answerButton.count();
            console.log(`[SopPage] Answer button [data-test-id] count: ${count}`);
            
            if (count > 0) {
                const isVisible = await answerButton.first().isVisible();
                if (isVisible) {
                    const textContent = await answerButton.first().textContent();
                    const className = await answerButton.first().getAttribute('class');
                    console.log(`[SopPage] ✅ Answer Button: text: "${textContent}", class: "${className}"`);
                }
            }
        } catch (error) {
            console.log(`[SopPage] Answer button [data-test-id] check failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Take a screenshot for visual debugging
        await this.page.screenshot({ path: 'debug-sop-answer-buttons.png', fullPage: true });
        console.log('[SopPage] Screenshot saved: debug-sop-answer-buttons.png');
    }

    /**
     * Debug method to check SOP tab visibility and take screenshot
     */
    async debugSopTabLocators() {
        console.log('[SopPage] Debugging SOP tab - checking visibility...');
        
        // Take a screenshot to see current state
        await this.page.screenshot({ path: 'debug-sop-tab-search.png', fullPage: true });
        
        // Check the working SOP tab locator
        try {
            const sopTab = this.page.locator('[data-test-id="SOP-tab"]');
            const count = await sopTab.count();
            const isVisible = count > 0 ? await sopTab.isVisible() : false;
            console.log(`[SopPage] SOP tab [data-test-id="SOP-tab"] - Count: ${count}, Visible: ${isVisible}`);
            
            if (isVisible) {
                const textContent = await sopTab.textContent();
                console.log(`[SopPage] ✅ SOP tab found with text: "${textContent}"`);
            }
        } catch (error) {
            console.log(`[SopPage] SOP tab check failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Check if page contains SOP text
        const pageText = await this.page.textContent('body');
        const hasSopText = pageText?.includes('SOP') || pageText?.includes('Standard Operating Procedure');
        console.log(`[SopPage] Page contains SOP text: ${hasSopText}`);
    }

    /**
     * Completes and validates the Standard Operating Procedure.
     * Based on 'sopCompleteAndValidate' Cypress command.
     */
    async completeAndValidateSop() {
        console.log('[SopPage] Starting SOP completion...');
        
        // Wait for SOP tab to become visible (it appears after alert is selected)
        console.log('[SopPage] Waiting for SOP tab to become visible with enhanced detection...');
        
        try {
            // Enhanced SOP tab detection - wait for tab to be both present and actually visible
            console.log('[SopPage] Using enhanced waitForFunction to ensure SOP tab is truly visible...');
            await this.page.waitForFunction(() => {
                const sopTab = document.querySelector('[data-test-id="SOP-tab"]');
                if (!sopTab) return false;
                
                // Check if element is actually visible in viewport
                const rect = sopTab.getBoundingClientRect();
                const style = window.getComputedStyle(sopTab);
                
                return rect.width > 0 && 
                       rect.height > 0 && 
                       style.display !== 'none' && 
                       style.visibility !== 'hidden' &&
                       style.opacity !== '0';
            }, { timeout: 15000 });
            
            console.log('[SopPage] Enhanced SOP tab detection successful - tab is truly visible');
            const sopTabElement = this.sopTab;
            await sopTabElement.click();
            console.log('[SopPage] SOP tab clicked successfully');
            
        } catch (error) {
            console.log(`[SopPage] Enhanced SOP tab wait failed: ${error instanceof Error ? error.message : String(error)}`);
            
            // Fallback to original approach with extended timeout
            console.log('[SopPage] Trying fallback approach with original locator...');
            try {
                const sopTabElement = this.sopTab;
                await expect(sopTabElement).toBeVisible({ timeout: 10000 });
                await sopTabElement.click();
                console.log('[SopPage] Fallback SOP tab detection worked');
            } catch (fallbackError) {
                // Final attempt with text locator as last resort
                console.log('[SopPage] Trying final alternative SOP tab locator...');
                try {
                    const altSopTab = this.page.locator('text="SOP"').first();
                    await expect(altSopTab).toBeVisible({ timeout: 5000 });
                    await altSopTab.click();
                    console.log('[SopPage] Alternative text-based SOP locator worked');
                } catch (altError) {
                    await this.page.screenshot({ path: 'debug-sop-tab-not-found.png', fullPage: true });
                    throw new Error(`SOP tab not found with any approach. Enhanced error: ${error instanceof Error ? error.message : String(error)}, Fallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}, Alternative error: ${altError instanceof Error ? altError.message : String(altError)}`);
                }
            }
        }        const bodyTextLocator = this.page.locator('body');
        const isSopAlreadyComplete = await bodyTextLocator.getByText(this.sopCompleteText, { exact: true }).isVisible();
        
        if (isSopAlreadyComplete) {
            console.log('SOP is already complete');
        } else {
            console.log('SOP not complete, attempting to find and click answer buttons');
            
            // Use the proven working answer button locator first
            console.log(`[SopPage] Trying primary answer button locator: button:has-text("Yes")`);
            const yesButtons = this.page.locator('button:has-text("Yes")');
            const yesCount = await yesButtons.count();
            
            let answerButtonFound = false;
            
            if (yesCount > 0) {
                console.log(`[SopPage] Found ${yesCount} Yes buttons`);
                
                // Try to click the first visible Yes button
                for (let i = 0; i < yesCount; i++) {
                    const button = yesButtons.nth(i);
                    const isVisible = await button.isVisible();
                    const isEnabled = isVisible ? await button.isEnabled() : false;
                    
                    if (isVisible && isEnabled) {
                        const buttonText = await button.textContent();
                        console.log(`[SopPage] Clicking Yes button ${i} with text: "${buttonText}"`);
                        
                        await button.click({ force: true });
                        answerButtonFound = true;
                        console.log('[SopPage] Successfully clicked Yes button');
                        break;
                    }
                }
            }
            
            // Fallback to test-id locator if Yes button didn't work
            if (!answerButtonFound) {
                console.log(`[SopPage] Trying fallback answer button locator: [data-test-id="answer-button"]`);
                try {
                    const answerButtons = this.page.locator('[data-test-id="answer-button"]');
                    const count = await answerButtons.count();
                    
                    if (count > 0) {
                        console.log(`[SopPage] Found ${count} answer buttons with test-id`);
                        
                        const button = answerButtons.first();
                        const isVisible = await button.isVisible();
                        const isEnabled = isVisible ? await button.isEnabled() : false;
                        
                        if (isVisible && isEnabled) {
                            const buttonText = await button.textContent();
                            console.log(`[SopPage] Clicking answer button with text: "${buttonText}"`);
                            
                            await button.click({ force: true });
                            answerButtonFound = true;
                            console.log('[SopPage] Successfully clicked answer button');
                        }
                    }
                } catch (error) {
                    console.log(`[SopPage] Error with fallback locator: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            
            if (!answerButtonFound) {
                // Call debug method only when there's an issue
                console.log('[SopPage] No answer buttons found with primary locators, running debug...');
                await this.debugSopAnswerButtons();
                throw new Error('No clickable answer buttons found in SOP. Check debug-sop-answer-buttons.png for details.');
            }
            
            // Verify SOP completion with enhanced fallback logic
            try {
                await expect(this.page.getByText(this.sopCompleteText, { exact: true })).toBeVisible({ timeout: 20000 }); // Increased timeout to 20s
            } catch (error) {
                console.log('[SopPage] SOP completion verification failed, attempting fallback verification...');
                
                // Fallback: Check for any SOP completion indicators
                const fallbackCompleteSelectors = [
                    'text="Standard operating procedure complete"',
                    'text="SOP Complete"', 
                    'text="Procedure Complete"',
                    '[data-test-id*="sop"][data-test-id*="complete"]',
                    '[class*="sop"][class*="complete"]'
                ];
                
                let sopCompleted = false;
                for (const selector of fallbackCompleteSelectors) {
                    try {
                        await this.page.waitForSelector(selector, { timeout: 5000 });
                        console.log(`[SopPage] SOP completion confirmed with fallback selector: ${selector}`);
                        sopCompleted = true;
                        break;
                    } catch (fallbackError) {
                        // Continue to next selector
                    }
                }
                
                if (!sopCompleted) {
                    console.log('[SopPage] SOP completion could not be verified with any method');
                    throw new Error(`SOP completion verification failed. Expected text: "${this.sopCompleteText}"`);
                }
            }
        }
    }

    /**
     * Clicks the dispatch button, typically after SOP completion.
     * Based on the Cypress test line: cy.contains('button', 'DISPATCH').click();
     */
    async clickDispatchButton() {
        await expect(this.dispatchButton).toBeVisible({ timeout: 5000 });
        await this.dispatchButton.click();
        // Consider adding a wait for the dispatch action to complete, e.g., a spinner to disappear or a status update.
        await this.page.waitForTimeout(1000); // From cy.wait(1000) in Cypress test
    }

    async clickEscalateButton() {
        console.log('[SopPage] Starting escalation process...');
        
        // First, capture the current count of any alert cards that should disappear after escalation
        const allAlertCards = this.page.locator('[data-test-id*="alert-card"], [data-test-id="manual-alert-card"], [data-test-id="aggregated-site-card"]');
        const initialAlertCount = await allAlertCards.count();
        console.log(`[SopPage] Current alert cards count before escalation: ${initialAlertCount}`);
        
        // Wait for escalate button to be visible and click it
        await expect(this.page.locator('button:has-text("ESCALATE")')).toBeVisible({ timeout: 5000 });
        await this.page.locator('button:has-text("ESCALATE")').click();
        console.log('[SopPage] Escalate button clicked');
        
        // Dynamic wait: Check if ALL alert cards disappear (moved to Situation Stack)
        if (initialAlertCount > 0) {
            console.log('[SopPage] Waiting for all alert cards to disappear after escalation...');
            
            // Dynamic polling: Check card count every 500ms until it reaches 0
            const startTime = Date.now();
            const maxWaitTime = 15000; // Maximum 15 seconds
            let currentCount = initialAlertCount;
            
            while (currentCount > 0 && (Date.now() - startTime) < maxWaitTime) {
                await this.page.waitForTimeout(500); // Check every 500ms
                currentCount = await allAlertCards.count();
                console.log(`[SopPage] Current card count: ${currentCount} (elapsed: ${Date.now() - startTime}ms)`);
            }
            
            if (currentCount === 0) {
                console.log(`[SopPage] ✅ All alert cards disappeared in ${Date.now() - startTime}ms - escalation completed`);
            } else {
                console.log(`[SopPage] ⚠️ ${currentCount} alert cards still visible after ${maxWaitTime}ms timeout`);
                // Take a screenshot for debugging
                await this.page.screenshot({ path: 'debug-escalation-cards-still-visible.png', fullPage: true });
                console.log('[SopPage] Continuing anyway - escalation might still be processing');
            }
        } else {
            console.log('[SopPage] No alert cards were visible before escalation, skipping disappearance check');
        }
        
        console.log('[SopPage] Escalation process completed');
    }
}
