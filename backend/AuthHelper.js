/**
 * Authentication Helper for Proof360 Playwright Tests
 * Provides utilities for efficient authentication checking and fallback
 */
export class AuthHelper {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    /**
     * Check if user is authenticated and on the correct page
     * @param {number} timeout - Timeout for checks in milliseconds
     * @returns {Promise<boolean>} True if authenticated, false otherwise
     */
    async isAuthenticated(timeout = 15000) {
        try {
            console.log('[AuthHelper] Checking authentication status...');
            
            // Try to navigate to command page (main dashboard)
            await this.page.goto('/command', { timeout: timeout });
            
            // Wait for network to be idle to ensure page is fully loaded
            await this.page.waitForLoadState('networkidle', { timeout: timeout });
            
            // Check for key authenticated elements
            const authIndicators = [
                '[data-test-id="burger-menu-button"]',
                '[data-test-id="selected-company"]',
                '.hamburger-menu'
            ];
            
            for (const selector of authIndicators) {
                const isVisible = await this.page.locator(selector).isVisible({ timeout: 5000 });
                if (isVisible) {
                    console.log('[AuthHelper] ✅ Authentication confirmed - found element:', selector);
                    return true;
                }
            }
            
            // Check URL as additional confirmation
            if (this.page.url().includes('/command')) {
                console.log('[AuthHelper] ✅ Authentication confirmed - on command page');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.log('[AuthHelper] ❌ Authentication check failed:', error.message);
            return false;
        }
    }

    /**
     * Check if the correct company is selected
     * @param {string} companyName - Expected company name
     * @param {number} timeout - Timeout for check in milliseconds
     * @returns {Promise<boolean>} True if correct company is selected
     */
    async isCorrectCompanySelected(companyName, timeout = 10000) {
        try {
            const companySelector = '[data-test-id="selected-company"]';
            await this.page.locator(companySelector).waitFor({ timeout: timeout });
            
            const selectedCompanyText = await this.page.locator(companySelector).textContent();
            const isCorrect = selectedCompanyText?.includes(companyName) || false;
            
            if (isCorrect) {
                console.log(`[AuthHelper] ✅ Correct company selected: ${companyName}`);
            } else {
                console.log(`[AuthHelper] ⚠️  Wrong company selected. Expected: ${companyName}, Found: ${selectedCompanyText}`);
            }
            
            return isCorrect;
            
        } catch (error) {
            console.log('[AuthHelper] ❌ Company check failed:', error.message);
            return false;
        }
    }

    /**
     * Efficiently handle authentication with storage state optimization
     * @param {Object} sharedSteps - SharedTestSteps instance
     * @param {string} username - Username for authentication
     * @param {string} password - Password for authentication  
     * @param {string} companyName - Company to select after authentication
     * @param {number} timeout - Timeout for operations
     */
    async ensureAuthenticated(sharedSteps, username, password, companyName = 'Vodacom', timeout = 30000) {
        console.log('[AuthHelper] Starting authentication check...');
        
        try {
            // Step 1: Check if already authenticated
            const isAuth = await this.isAuthenticated(timeout);
            
            if (isAuth) {
                // Step 2: Check if correct company is selected
                const isCorrectCompany = await this.isCorrectCompanySelected(companyName, 10000);
                
                if (isCorrectCompany) {
                    console.log('[AuthHelper] ✅ Already authenticated with correct company - skipping login');
                    return;
                } else {
                    console.log('[AuthHelper] 🔄 Authenticated but wrong company - selecting correct company');
                    await sharedSteps.selectCompany(companyName);
                    return;
                }
            }
            
            // Step 3: Not authenticated - perform fresh authentication
            console.log('[AuthHelper] 🔑 Not authenticated - performing fresh login');
            await this.performFreshAuthentication(sharedSteps, username, password, companyName, timeout);
            
        } catch (error) {
            console.error('[AuthHelper] ❌ Authentication process failed:', error.message);
            // Try fresh authentication as fallback
            console.log('[AuthHelper] 🔄 Attempting fresh authentication as fallback');
            await this.performFreshAuthentication(sharedSteps, username, password, companyName, timeout);
        }
    }

    /**
     * Perform fresh authentication when storage state is invalid
     * @param {Object} sharedSteps - SharedTestSteps instance
     * @param {string} username - Username for authentication
     * @param {string} password - Password for authentication
     * @param {string} companyName - Company to select after authentication
     * @param {number} timeout - Timeout for operations
     */
    async performFreshAuthentication(sharedSteps, username, password, companyName, timeout = 45000) {
        console.log('[AuthHelper] Performing fresh authentication...');
        
        await sharedSteps.authenticateAndSetup(username, password);
        
        // Verify authentication was successful
        await this.page.waitForURL(/.*command/, { timeout: timeout });
        console.log('[AuthHelper] ✅ Fresh authentication successful');
        
        // Select company
        await sharedSteps.selectCompany(companyName);
        console.log(`[AuthHelper] ✅ Company selected: ${companyName}`);
    }
}
