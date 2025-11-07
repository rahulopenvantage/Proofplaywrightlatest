import { StorageStateManager } from './StorageStateManager.js';
import { SharedTestSteps } from './SharedTestSteps.js';

/**
 * Simple Authentication Helper that uses storage state for session persistence
 */
export class SimpleAuthHelper {
    constructor(page) {
        this.page = page;
        this.storageStateManager = new StorageStateManager();
        this.sharedSteps = new SharedTestSteps(page);
    }

    /**
     * Ensure user is authenticated - either from storage state or fresh login
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     * @param {string} [company='Automation company'] - Company to select
     */
    async ensureAuthenticated(username, password, company = 'Automation company') {
        console.log('[SimpleAuthHelper] Ensuring user is authenticated...');
        
        try {
            // First check if current page is already authenticated
            const isAuthenticated = await this.sharedSteps.isAlreadyAuthenticated();
            
            if (isAuthenticated) {
                console.log('[SimpleAuthHelper] Already authenticated on current page');
                // Still need to ensure correct company is selected
                await this.ensureCorrectCompany(company);
                return;
            }

            // If not authenticated, try to navigate to command page (storage state should kick in)
            console.log('[SimpleAuthHelper] Checking if storage state provides authentication...');
            await this.page.goto('/command');
            await this.page.waitForTimeout(2000); // Brief wait for page to load
            
            const isAuthenticatedAfterNavigation = await this.sharedSteps.isAlreadyAuthenticated();
            
            if (isAuthenticatedAfterNavigation) {
                console.log('[SimpleAuthHelper] Storage state authentication successful');
                await this.ensureCorrectCompany(company);
                return;
            }

            // If storage state didn't work, do fresh login
            console.log('[SimpleAuthHelper] Storage state authentication failed, performing fresh login...');
            await this.sharedSteps.login(username, password);
            await this.sharedSteps.selectCompany(company);
            
        } catch (error) {
            console.log('[SimpleAuthHelper] Authentication failed:', error.message);
            // Fallback to fresh login
            await this.sharedSteps.login(username, password);
            await this.sharedSteps.selectCompany(company);
        }
    }

    /**
     * Ensure correct company is selected
     * @param {string} company - Company name to select
     */
    async ensureCorrectCompany(company) {
        try {
            const companySelector = '[data-test-id="selected-company"]';
            const companyElement = this.page.locator(companySelector);
            
            const isVisible = await companyElement.isVisible({ timeout: 5000 });
            if (!isVisible) {
                console.log('[SimpleAuthHelper] Company selector not found, selecting company...');
                await this.sharedSteps.selectCompany(company);
                return;
            }
            
            const selectedCompanyText = await companyElement.textContent();
            if (!selectedCompanyText?.includes(company)) {
                console.log(`[SimpleAuthHelper] Wrong company selected. Expected: ${company}, Found: ${selectedCompanyText}`);
                await this.sharedSteps.selectCompany(company);
            } else {
                console.log(`[SimpleAuthHelper] Correct company already selected: ${company}`);
            }
        } catch (error) {
            console.log('[SimpleAuthHelper] Error checking company, selecting default:', error.message);
            await this.sharedSteps.selectCompany(company);
        }
    }

    /**
     * Quick authentication check - just checks if user is authenticated
     * @returns {Promise<boolean>} True if authenticated
     */
    async isAuthenticated() {
        return await this.sharedSteps.isAlreadyAuthenticated();
    }

    /**
     * Force fresh login (ignores storage state)
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     * @param {string} [company='Automation company'] - Company to select
     */
    async forceLogin(username, password, company = 'Automation company') {
        console.log('[SimpleAuthHelper] Forcing fresh login...');
        await this.page.goto('/'); // Start fresh
        await this.sharedSteps.login(username, password);
        await this.sharedSteps.selectCompany(company);
    }
}
