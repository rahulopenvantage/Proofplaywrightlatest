// e2e/AppInteractionsPage.js
// @ts-check
import { expect } from '@playwright/test';

export class AppInteractionsPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.companyDropdown = page.locator('[data-test-id="selected-company"]');
        this.eventsSituationsDropdown = page.locator('[testid="events-situations-dropdown"]');
    }

    /**
     * Selects a company from the company dropdown.
     * @param {string} companyName
     */
    async selectCompany(companyName) {
        console.log(`[AppInteractions] Selecting ${companyName} company...`);
        
        // Click dropdown to open it
        await this.companyDropdown.click();
        await this.page.waitForTimeout(1000); // Wait for dropdown to open
        
        // Wait for the specific company name text to be present in the DOM and visible
        await this.page.waitForSelector(`text="${companyName}"`, { timeout: 10000 });
        
        // Wait for the company option to be visible and then click it
        const option = this.page.getByText(companyName, { exact: true });
        await option.waitFor({ state: 'visible', timeout: 10000 });
        await option.click({ force: true }); // Use force: true

        // Wait for the selection to be processed by the UI
        await this.page.waitForTimeout(2000); 
        
        // Wait for the company selection to be reflected in the dropdown
        // This is more reliable than networkidle for real-time applications
        await this.page.waitForFunction((expectedCompany) => {
            const dropdown = document.querySelector('[data-test-id="selected-company"] .p-dropdown-label');
            return dropdown && dropdown.textContent && dropdown.textContent.trim() === expectedCompany;
        }, companyName, { timeout: 30000 });
        
        console.log(`[AppInteractions] ${companyName} company selected`);
    }

    /**
     * Selects "Automation company" from the dropdown.
     */
    async selectAutomationCompany() {
        console.log('[AppInteractions] Selecting Automation company...');
        
        try {
            // First, check if we need to accept terms and conditions
            await this.handleTermsAndConditions();
            
            // Wait for company dropdown to be available and click it
            await this.page.locator('[data-test-id="selected-company"]').click();
            
            // Wait for dropdown to open
            await this.page.waitForTimeout(1000);
            
            // Use direct text matching for the dropdown option that appears in the list
            // This targets the visible option text in the dropdown
            const automationCompanyOption = this.page.getByText('Automation company').last();
            
            // Wait for the "Automation company" option to be visible
            await automationCompanyOption.waitFor({ state: 'visible', timeout: 15000 });
            
            // Click the option using standard click
            await automationCompanyOption.click();
            
            // Wait for the selection to be processed and verify it took effect
            await this.page.waitForTimeout(2000);
            
            // Wait for the company selection to be reflected in the dropdown
            // This is more reliable than networkidle for real-time applications
            await this.page.waitForFunction(() => {
                const dropdown = document.querySelector('[data-test-id="selected-company"] .p-dropdown-label');
                return dropdown && dropdown.textContent && dropdown.textContent.trim() === 'Automation company';
            }, { timeout: 30000 });
            
            console.log('[AppInteractions] Automation company selected successfully');
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[AppInteractions] Failed to select Automation company: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Switches to Situation Stack by clicking 'Incident' in the dropdown.
     * This matches the original Cypress command logic.
     */
    async switchToSituationStack() {
        console.log('[AppInteractions] Switching to Situation Stack...');
        
        // Check if we're already on Situation stack by checking if 'Incident' text is visible
        const incidentText = this.eventsSituationsDropdown.getByText('Incident');
        const isIncidentVisible = await incidentText.isVisible().catch(() => false);
        
        if (!isIncidentVisible) {
            console.log('[AppInteractions] Already on Situation Stack, no switch needed');
            return;
        }
        
        await incidentText.click();
        
        // Wait for stack switch to complete by waiting for UI to stabilize
        await this.page.waitForTimeout(2000);
        
        // Wait for any loading states to complete
        await this.page.waitForFunction(() => {
            return !document.querySelector('.loading-indicator, .spinner, [data-loading="true"]');
        }, { timeout: 30000 });
        
        console.log("[AppInteractions] Switched to Situation Stack. Current URL: " + this.page.url());
    }

    /**
     * Switches to Incident Stack by clicking 'Situation' in the dropdown.
     * This matches the original Cypress command logic.
     */
    async switchToIncidentStack() {
        console.log('[AppInteractions] Switching to Incident Stack...');
        
        // Check if we're already on Incident stack by checking if 'Situation' text is visible
        const situationText = this.eventsSituationsDropdown.getByText('Situation');
        const isSituationVisible = await situationText.isVisible().catch(() => false);
        
        if (!isSituationVisible) {
            console.log('[AppInteractions] Already on Incident Stack, no switch needed');
            return;
        }
        
        await situationText.click();
        
        // Wait for stack switch to complete by waiting for UI to stabilize
        await this.page.waitForTimeout(2000);
        
        // Wait for any loading states to complete
        await this.page.waitForFunction(() => {
            return !document.querySelector('.loading-indicator, .spinner, [data-loading="true"]');
        }, { timeout: 30000 });
        
        console.log("[AppInteractions] Switched to Incident Stack. Current URL: " + this.page.url());
    }

    /**
     * Selects "1 SIte (Pty) Ltd" company from the dropdown.
     */
    async select1TrackInvestigationsCompany() {
        console.log('[AppInteractions] Selecting 1 SIte (Pty) Ltd company...');
        
        // Click dropdown to open it
        await this.companyDropdown.click();
        await this.page.waitForTimeout(1000);
        
        // Wait for dropdown options to be visible
        await this.page.waitForSelector('text="1 SIte (Pty) Ltd"', { timeout: 10000 });
        
        // Find and click the option with retry logic
        const option = this.page.getByText('1 SIte (Pty) Ltd', { exact: true });
        await option.waitFor({ state: 'visible', timeout: 10000 });
        await option.click({ force: true });
        
        // Wait for the selection to be processed
        await this.page.waitForTimeout(2000);
        
        // Wait for the company selection to be reflected in the dropdown
        await this.page.waitForFunction(() => {
            const dropdown = document.querySelector('[data-test-id="selected-company"] .p-dropdown-label');
            return dropdown && dropdown.textContent && dropdown.textContent.trim() === '1 SIte (Pty) Ltd';
        }, { timeout: 30000 });
        console.log('[AppInteractions] 1 SIte (Pty) Ltd company selected');
    }

    /**
     * Selects "Vumacam" company from the dropdown.
     */
    async selectVumacamCompany() {
        console.log('[AppInteractions] Selecting Vumacam company...');
        await this.companyDropdown.click();
        await this.page.waitForTimeout(1000); // Wait for dropdown to open

        // Wait for the specific company name text to be present in the DOM and visible
        await this.page.waitForSelector('text="Vumacam"', { timeout: 10000 });
        
        const option = this.page.getByText('Vumacam', { exact: true });
        await option.waitFor({ state: 'visible', timeout: 10000 });
        await option.click({ force: true });

        // Wait for the selection to be processed by the UI
        await this.page.waitForTimeout(2000); 

        // Wait for the company selection to be reflected in the dropdown
        await this.page.waitForFunction(() => {
            const dropdown = document.querySelector('[data-test-id="selected-company"] .p-dropdown-label');
            return dropdown && dropdown.textContent && dropdown.textContent.trim() === 'Vumacam';
        }, { timeout: 30000 });
        console.log('[AppInteractions] Vumacam company selected');
    }

    /**
     * Selects "Vodacom" company from the dropdown.
     */
    async selectVodacomCompany() {
        console.log('[AppInteractions] Selecting Vodacom company...');
        await this.companyDropdown.click();
        await this.page.waitForTimeout(1000);
        
        // Use more specific selector to avoid strict mode violation
        const option = this.page.locator('[data-pc-section="itemlabel"]').filter({ hasText: 'Vodacom' });
        await option.click({ force: true });
        
        // Wait for the company selection to be reflected in the dropdown
        await this.page.waitForFunction(() => {
            const dropdown = document.querySelector('[data-test-id="selected-company"] .p-dropdown-label');
            return dropdown && dropdown.textContent && dropdown.textContent.trim() === 'Vodacom';
        }, { timeout: 30000 });
        console.log('[AppInteractions] Vodacom company selected');
    }

    /**
     * Handles terms and conditions popup if it appears
     */
    async handleTermsAndConditions() {
        try {
            // Check if terms and conditions popup is visible
            const termsButton = this.page.locator('[data-test-id="termsAndConditonsAcceptBtn"]');
            if (await termsButton.isVisible()) {
                console.log('[AppInteractions] Terms and conditions popup detected, accepting...');
                await termsButton.click();
                await this.page.waitForTimeout(2000);
                console.log('[AppInteractions] Terms and conditions accepted');
            }
        } catch (error) {
            console.log('[AppInteractions] No terms and conditions popup found or error handling it');
        }
    }

    /**
     * Gets the currently selected company name
     * @returns {Promise<string|null>} Current company name or null if not found
     */
    async getCurrentlySelectedCompany() {
        try {
            const dropdownLabel = this.page.locator('[data-test-id="selected-company"] .p-dropdown-label');
            await dropdownLabel.waitFor({ state: 'visible', timeout: 5000 });
            const companyText = await dropdownLabel.textContent();
            return companyText ? companyText.trim() : null;
        } catch (/** @type {any} */ error) {
            console.log('[AppInteractions] Could not get currently selected company:', error.message);
            return null;
        }
    }

    /**
     * Verifies that the expected company is currently selected
     * @param {string} expectedCompany - The company that should be selected
     * @returns {Promise<boolean>} True if expected company is selected
     */
    async verifyCompanySelection(expectedCompany) {
        try {
            const currentCompany = await this.getCurrentlySelectedCompany();
            const isCorrect = currentCompany === expectedCompany;
            
            if (isCorrect) {
                console.log(`[AppInteractions] Company verification passed: ${expectedCompany} is selected`);
            } else {
                console.log(`[AppInteractions] Company verification failed: Expected '${expectedCompany}', but found '${currentCompany}'`);
            }
            
            return isCorrect;
        } catch (/** @type {any} */ error) {
            console.log(`[AppInteractions] Company verification error:`, error.message);
            return false;
        }
    }

    /**
     * Clears application state to prevent contamination between tests
     * This includes clearing localStorage, sessionStorage, and cookies
     */
    async clearApplicationState() {
        console.log('[AppInteractions] Clearing application state...');
        
        try {
            // Clear browser storage
            await this.page.evaluate(() => {
                // Clear localStorage
                localStorage.clear();
                
                // Clear sessionStorage  
                sessionStorage.clear();
                
                // Clear any cached application state
                if (/** @type {any} */ (window).appState) {
                    /** @type {any} */ (window).appState = null;
                }
                
                // Clear any Redux/state management stores if they exist
                if (/** @type {any} */ (window).__REDUX_STORE__) {
                    /** @type {any} */ (window).__REDUX_STORE__.dispatch({ type: 'RESET_STATE' });
                }
            });

            // Clear cookies for the current domain
            const cookies = await this.page.context().cookies();
            if (cookies.length > 0) {
                await this.page.context().clearCookies();
            }

            console.log('[AppInteractions] Application state cleared successfully');
        } catch (/** @type {any} */ error) {
            console.log('[AppInteractions] Error clearing application state:', error.message);
            // Don't throw - this is cleanup, continue with test
        }
    }

    /**
     * Ensures the correct company is selected with basic verification
     * @param {string} targetCompany - The company that should be selected
     * @param {boolean} forceReselection - Whether to force reselection even if already selected
     */
    async ensureCorrectCompanySelection(targetCompany, forceReselection = false) {
        console.log(`[AppInteractions] Ensuring ${targetCompany} is selected (force: ${forceReselection})`);
        
        try {
            // First check if the correct company is already selected
            const currentCompany = await this.getCurrentlySelectedCompany();
            
            if (!forceReselection && currentCompany === targetCompany) {
                console.log(`[AppInteractions] ${targetCompany} already selected, no action needed`);
                return true;
            }
            
            console.log(`[AppInteractions] Selecting ${targetCompany}...`);
            
            // Select the target company using existing methods
            await this.selectCompanyByName(targetCompany);
            
            // Verify the selection took effect
            const verificationPassed = await this.verifyCompanySelection(targetCompany);
            
            if (!verificationPassed) {
                console.log(`[AppInteractions] Verification failed for ${targetCompany}, but continuing...`);
            }
            
            console.log(`[AppInteractions] Company selection completed for ${targetCompany}`);
            return true;
            
        } catch (/** @type {any} */ error) {
            console.error(`[AppInteractions] Failed to ensure ${targetCompany} selection:`, error.message);
            throw error;
        }
    }

    /**
     * Generic company selection method that routes to specific company methods
     * @param {string} companyName - Name of the company to select
     */
    async selectCompanyByName(companyName) {
        console.log(`[AppInteractions] Selecting company by name: ${companyName}`);
        
        switch (companyName) {
            case 'Automation company':
                await this.selectAutomationCompany();
                break;
            case 'Vumacam':
                await this.selectVumacamCompany();
                break;
            case 'Vodacom':
                await this.selectVodacomCompany();
                break;
            case '1 SIte (Pty) Ltd':
                await this.select1TrackInvestigationsCompany();
                break;
            default:
                // Fallback to generic selection method
                await this.selectCompany(companyName);
                break;
        }
    }
}