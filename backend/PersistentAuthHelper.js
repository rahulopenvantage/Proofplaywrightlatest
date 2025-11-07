/**
 * Persistent Authentication Helper for Proof360 Playwright Tests
 * Maintains browser session across tests with minimal resets
 */
export class PersistentAuthHelper {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    /**
     * Check if user is authenticated and on a valid page
     * @param {number} timeout - Timeout for checks in milliseconds
     * @returns {Promise<boolean>} True if authenticated, false otherwise
     */
    async isAuthenticated(timeout = 10000) {
        try {
            console.log('[PersistentAuth] Checking authentication status...');
            
            // Check for key authenticated elements without navigation
            const authIndicators = [
                '[data-test-id="burger-menu-button"]',
                '[data-test-id="selected-company"]',
                '.hamburger-menu'
            ];
            
            for (const selector of authIndicators) {
                const isVisible = await this.page.locator(selector).isVisible({ timeout: 2000 });
                if (isVisible) {
                    console.log('[PersistentAuth] ✅ Authentication confirmed - found element:', selector);
                    return true;
                }
            }
            
            // Check URL as additional confirmation
            const currentUrl = this.page.url();
            if (currentUrl.includes('/command') || currentUrl.includes('uat.proof360.io')) {
                // Try to find any dashboard elements
                const dashboardElements = await this.page.locator('[data-test-id], .dashboard, .nav, .menu').count();
                if (dashboardElements > 0) {
                    console.log('[PersistentAuth] ✅ Authentication confirmed - dashboard elements found');
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.log('[PersistentAuth] ❌ Authentication check failed:', error.message);
            return false;
        }
    }

    /**
     * Check if the correct company is selected
     * @param {string} companyName - Expected company name
     * @param {number} timeout - Timeout for check in milliseconds
     * @returns {Promise<boolean>} True if correct company is selected
     */
    async isCorrectCompanySelected(companyName, timeout = 5000) {
        try {
            const companySelector = '[data-test-id="selected-company"]';
            const companyElement = this.page.locator(companySelector);
            
            // Check if element exists first
            const exists = await companyElement.isVisible({ timeout: timeout });
            if (!exists) {
                console.log('[PersistentAuth] ⚠️  Company selector not found');
                return false;
            }
            
            const selectedCompanyText = await companyElement.textContent();
            const isCorrect = selectedCompanyText?.includes(companyName) || false;
            
            if (isCorrect) {
                console.log(`[PersistentAuth] ✅ Correct company selected: ${companyName}`);
            } else {
                console.log(`[PersistentAuth] ⚠️  Wrong company selected. Expected: ${companyName}, Found: ${selectedCompanyText}`);
            }
            
            return isCorrect;
            
        } catch (error) {
            console.log('[PersistentAuth] ❌ Company check failed:', error.message);
            return false;
        }
    }

    /**
     * Reset to base URL and verify authentication state
     * This is the main method for persistent session management
     * @param {Object} sharedSteps - SharedTestSteps instance
     * @param {string} companyName - Expected company name
     * @param {boolean} forceCompanySelection - Force company selection even if correct
     * @returns {Promise<void>}
     */
    async resetToBaseAndVerify(sharedSteps, companyName = 'Vodacom', forceCompanySelection = false) {
        console.log('[PersistentAuth] 🔄 Resetting to base URL and verifying session...');
        
        try {
            // Step 1: Navigate to base command page
            console.log('[PersistentAuth] Navigating to base command page...');
            await this.page.goto('/command', { 
                timeout: 30000,
                waitUntil: 'domcontentloaded' 
            });
            
            // Step 2: Wait for page to stabilize
            await this.page.waitForTimeout(2000);
            await this.page.waitForLoadState('networkidle', { timeout: 15000 });
            
            // Step 3: Check authentication status
            const isAuth = await this.isAuthenticated(10000);
            
            if (!isAuth) {
                console.log('[PersistentAuth] ❌ Authentication lost - session expired');
                throw new Error('Authentication session expired - requires fresh login');
            }
            
            console.log('[PersistentAuth] ✅ Authentication confirmed');
            
            // Step 4: Handle company selection
            if (forceCompanySelection) {
                console.log('[PersistentAuth] 🏢 Force selecting company...');
                await sharedSteps.selectCompany(companyName);
            } else {
                // Check if correct company is selected
                const isCorrectCompany = await this.isCorrectCompanySelected(companyName, 5000);
                
                if (!isCorrectCompany) {
                    console.log('[PersistentAuth] 🔄 Selecting correct company...');
                    await sharedSteps.selectCompany(companyName);
                } else {
                    console.log('[PersistentAuth] ✅ Correct company already selected');
                }
            }
            
            // Step 5: Final verification
            await this.page.waitForTimeout(1000);
            console.log('[PersistentAuth] ✅ Base reset completed successfully');
            
        } catch (error) {
            console.error('[PersistentAuth] ❌ Base reset failed:', error.message);
            throw new Error(`Session reset failed: ${error.message}`);
        }
    }

    /**
     * Quick session health check
     * @returns {Promise<boolean>} True if session is healthy
     */
    async isSessionHealthy() {
        try {
            // Check if we can interact with basic elements
            const healthIndicators = [
                () => this.page.locator('[data-test-id="burger-menu-button"]').isVisible({ timeout: 3000 }),
                () => this.page.locator('[data-test-id="selected-company"]').isVisible({ timeout: 3000 }),
                () => this.page.url().includes('uat.proof360.io')
            ];
            
            for (const check of healthIndicators) {
                const result = await check();
                if (result) {
                    console.log('[PersistentAuth] ✅ Session health check passed');
                    return true;
                }
            }
            
            console.log('[PersistentAuth] ⚠️  Session health check failed');
            return false;
            
        } catch (error) {
            console.log('[PersistentAuth] ❌ Session health check error:', error.message);
            return false;
        }
    }

    /**
     * Ensure the page is ready for test interactions
     * @param {number} timeout - Maximum wait time
     */
    async ensurePageReady(timeout = 10000) {
        try {
            console.log('[PersistentAuth] Ensuring page is ready for interactions...');
            
            // Wait for network activity to settle
            await this.page.waitForLoadState('networkidle', { timeout: timeout });
            
            // Wait for any loading indicators to disappear
            const loadingSelectors = [
                '.loading',
                '.spinner',
                '[data-test-id*="loading"]',
                '.loading-overlay'
            ];
            
            for (const selector of loadingSelectors) {
                try {
                    await this.page.locator(selector).waitFor({ 
                        state: 'hidden', 
                        timeout: 5000 
                    });
                } catch {
                    // Ignore if loading indicator doesn't exist
                }
            }
            
            // Small stabilization wait
            await this.page.waitForTimeout(1000);
            
            console.log('[PersistentAuth] ✅ Page ready for interactions');
            
        } catch (error) {
            console.log('[PersistentAuth] ⚠️  Page readiness check completed with warnings:', error.message);
        }
    }
}
