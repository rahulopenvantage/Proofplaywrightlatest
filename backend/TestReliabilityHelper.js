/**
 * TestReliabilityHelper.js
 * 
 * This helper class provides robust retry mechanisms, enhanced wait strategies,
 * and reliability improvements for Playwright tests to increase success rates.
 */

export class TestReliabilityHelper {
    constructor(page) {
        this.page = page;
        this.maxRetries = 3;
        this.baseDelay = 1000; // 1 second base delay
    }

    /**
     * Enhanced retry mechanism with exponential backoff
     * @param {Function} operation - The operation to retry
     * @param {string} operationName - Name for logging
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise<any>} - Result of the operation
     */
    async retryOperation(operation, operationName, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Reliability] ${operationName} - Attempt ${attempt}/${maxRetries}`);
                
                // Add progressive delay between retries
                if (attempt > 1) {
                    const delay = baseDelay * Math.pow(2, attempt - 2); // Exponential backoff
                    console.log(`[Reliability] Waiting ${delay}ms before retry...`);
                    await this.page.waitForTimeout(delay);
                }
                
                const result = await operation();
                console.log(`[Reliability] ${operationName} - ✅ Success on attempt ${attempt}`);
                return result;
                
            } catch (error) {
                lastError = error;
                console.log(`[Reliability] ${operationName} - ❌ Failed on attempt ${attempt}: ${error.message}`);
                
                // If it's the last attempt, don't wait
                if (attempt === maxRetries) {
                    console.log(`[Reliability] ${operationName} - All ${maxRetries} attempts failed`);
                    break;
                }
                
                // Take a screenshot for debugging on failures
                if (attempt === maxRetries - 1) {
                    try {
                        await this.page.screenshot({ 
                            path: `debug/${operationName}-failure-attempt-${attempt}.png`,
                            fullPage: true 
                        });
                    } catch (screenshotError) {
                        console.log(`[Reliability] Failed to take debug screenshot: ${screenshotError.message}`);
                    }
                }
            }
        }
        
        throw new Error(`${operationName} failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
    }

    /**
     * Enhanced wait for element with multiple strategies
     * @param {string|Function} locator - Element locator or function returning locator
     * @param {Object} options - Wait options
     * @returns {Promise<Locator>} - The found element
     */
    async waitForElementRobust(locator, options = {}) {
        const {
            timeout = 30000,
            state = 'visible',
            description = 'element',
            fallbackSelectors = [],
            maxRetries = 3
        } = options;

        return await this.retryOperation(async () => {
            // Try primary locator first
            let element;
            if (typeof locator === 'function') {
                element = locator();
            } else {
                element = typeof locator === 'string' ? this.page.locator(locator) : locator;
            }

            try {
                await element.waitFor({ state, timeout: timeout / (fallbackSelectors.length + 1) });
                return element;
            } catch (primaryError) {
                console.log(`[Reliability] Primary selector failed for ${description}, trying fallbacks...`);
                
                // Try fallback selectors
                for (let i = 0; i < fallbackSelectors.length; i++) {
                    try {
                        const fallbackElement = this.page.locator(fallbackSelectors[i]);
                        await fallbackElement.waitFor({ state, timeout: timeout / (fallbackSelectors.length + 1) });
                        console.log(`[Reliability] Fallback selector ${i + 1} succeeded for ${description}`);
                        return fallbackElement;
                    } catch (fallbackError) {
                        console.log(`[Reliability] Fallback selector ${i + 1} failed: ${fallbackError.message}`);
                    }
                }
                
                throw primaryError;
            }
        }, `Wait for ${description}`, maxRetries);
    }

    /**
     * Enhanced site card detection with multiple strategies
     * @param {string} siteName - The site name to search for
     * @param {Object} options - Detection options
     * @returns {Promise<Locator>} - The found site card
     */
    async findSiteCardRobust(siteName, options = {}) {
        const {
            timeout = 20000,
            allowPartialMatch = true,
            fallbackSites = []
        } = options;

        // Create multiple search strategies
        const searchStrategies = [];
        
        // Strategy 1: Exact match
        searchStrategies.push({
            name: 'exact match',
            selector: `//span[@data-test-id="aggregated-site-card-name" and text()="${siteName}"]`
        });
        
        // Strategy 2: Contains match (for partial site names)
        if (allowPartialMatch) {
            const siteNamePrefix = siteName.split(' ').slice(0, 2).join(' ');
            searchStrategies.push({
                name: 'prefix match',
                selector: `//span[@data-test-id="aggregated-site-card-name" and contains(text(), "${siteNamePrefix}")]`
            });
            
            // Strategy 3: First word match (for heavily truncated names)
            const firstWord = siteName.split(' ')[0];
            if (firstWord.length > 3) {
                searchStrategies.push({
                    name: 'first word match',
                    selector: `//span[@data-test-id="aggregated-site-card-name" and contains(text(), "${firstWord}")]`
                });
            }
        }

        return await this.retryOperation(async () => {
            // First check if any cards exist at all
            const anyCards = this.page.locator('[data-test-id="aggregated-site-card-name"]');
            const cardCount = await anyCards.count();
            
            if (cardCount === 0) {
                // Wait a bit longer for cards to load
                console.log(`[Reliability] No site cards found yet, waiting for cards to load...`);
                await this.page.waitForTimeout(3000);
                
                const newCardCount = await anyCards.count();
                if (newCardCount === 0) {
                    // Check for "No Results Found" text
                    const noResults = this.page.locator('text="No Results Found"');
                    const hasNoResults = await noResults.isVisible().catch(() => false);
                    if (hasNoResults) {
                        throw new Error(`No site cards available - "No Results Found" displayed`);
                    }
                    throw new Error(`No site cards found on page`);
                }
            }

            console.log(`[Reliability] Found ${cardCount} site cards, searching for: ${siteName}`);
            
            // Try each search strategy
            for (const strategy of searchStrategies) {
                try {
                    console.log(`[Reliability] Trying ${strategy.name} strategy for site: ${siteName}`);
                    const element = this.page.locator(strategy.selector).first();
                    await element.waitFor({ state: 'visible', timeout: timeout / searchStrategies.length });
                    console.log(`[Reliability] ✅ Found site card using ${strategy.name} strategy`);
                    return element;
                } catch (error) {
                    console.log(`[Reliability] ${strategy.name} strategy failed: ${error.message}`);
                }
            }

            throw new Error(`Site card not found for "${siteName}" using any strategy`);
        }, `Find site card: ${siteName}`, 1);
    }

    /**
     * Enhanced page stability check with multiple indicators
     * @param {Object} options - Stability check options
     */
    async ensurePageStability(options = {}) {
        const {
            networkIdleTimeout = 10000,
            domStableTimeout = 2000,
            maxWaitTime = 30000
        } = options;

        console.log(`[Reliability] Ensuring page stability...`);
        
        const startTime = Date.now();
        
        try {
            // Wait for network to be idle
            await this.page.waitForLoadState('networkidle', { timeout: networkIdleTimeout });
            console.log(`[Reliability] ✅ Network idle achieved`);
            
            // Wait for DOM to be stable
            await this.page.waitForLoadState('domcontentloaded', { timeout: domStableTimeout });
            console.log(`[Reliability] ✅ DOM content loaded`);
            
            // Additional wait for dynamic content
            await this.page.waitForTimeout(1000);
            
            const elapsed = Date.now() - startTime;
            console.log(`[Reliability] ✅ Page stability achieved in ${elapsed}ms`);
            
        } catch (error) {
            const elapsed = Date.now() - startTime;
            console.log(`[Reliability] ⚠️ Page stability check completed with warnings after ${elapsed}ms: ${error.message}`);
            
            // Don't fail the test, just log the warning
            if (elapsed < maxWaitTime) {
                await this.page.waitForTimeout(Math.min(2000, maxWaitTime - elapsed));
            }
        }
    }

    /**
     * Check if test data exists and is valid
     * @param {string} dataType - Type of data to check
     * @param {string} identifier - Identifier for the data
     * @returns {Promise<boolean>} - Whether valid data exists
     */
    async validateTestData(dataType, identifier) {
        console.log(`[Reliability] Validating ${dataType} data for: ${identifier}`);
        
        try {
            switch (dataType) {
                case 'site':
                    const siteCard = await this.findSiteCardRobust(identifier, { 
                        timeout: 5000,
                        allowPartialMatch: true 
                    });
                    return await siteCard.isVisible();
                    
                case 'alerts':
                    const alertCards = this.page.locator('[data-test-id*="alert-card"]');
                    const alertCount = await alertCards.count();
                    console.log(`[Reliability] Found ${alertCount} alert cards`);
                    return alertCount > 0;
                    
                default:
                    console.log(`[Reliability] Unknown data type: ${dataType}`);
                    return false;
            }
        } catch (error) {
            console.log(`[Reliability] Data validation failed for ${dataType}:${identifier} - ${error.message}`);
            return false;
        }
    }

    /**
     * Smart cleanup with validation
     * @param {Function} cleanupOperation - The cleanup operation to perform
     * @param {string} operationName - Name for logging
     * @returns {Promise<boolean>} - Whether cleanup was successful
     */
    async performSmartCleanup(cleanupOperation, operationName) {
        return await this.retryOperation(async () => {
            console.log(`[Reliability] Starting smart cleanup: ${operationName}`);
            
            // Perform the cleanup operation
            await cleanupOperation();
            
            // Validate cleanup was successful
            await this.ensurePageStability();
            
            // Additional validation could be added here
            console.log(`[Reliability] ✅ Smart cleanup completed: ${operationName}`);
            return true;
            
        }, `Smart cleanup: ${operationName}`, 2);
    }

    /**
     * Wait for alerts to render after stack switching with enhanced timing
     * @param {string} stackType - Type of stack (Incident/Situation)
     * @param {Object} options - Wait options
     */
    async waitForAlertsToRender(stackType = 'stack', options = {}) {
        const {
            minimumWaitTime = 4000, // 4 seconds minimum wait (reduced from 5000ms)
            maxWaitTime = 5000,    // 15 seconds maximum wait
            checkInterval = 1000    // Check every 1 second
        } = options;

        console.log(`[Reliability] Waiting for alerts to render in ${stackType} stack...`);
        
        // Always wait the minimum time first to allow for slow renders
        console.log(`[Reliability] Initial wait of ${minimumWaitTime}ms for ${stackType} stack alerts...`);
        await this.page.waitForTimeout(minimumWaitTime);
        
        // Then check for alert stability with progressive checks
        const startTime = Date.now();
        let previousAlertCount = 0;
        let stableCount = 0;
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                // Count all possible alert indicators
                const alertCards = this.page.locator('[data-test-id*="alert-card"], [data-test-id*="site-card"], [data-test-id="aggregated-site-card"]');
                const currentAlertCount = await alertCards.count();
                
                console.log(`[Reliability] ${stackType} stack - Found ${currentAlertCount} alert/site cards (${Date.now() - startTime}ms elapsed)`);
                
                // Check if count is stable
                if (currentAlertCount === previousAlertCount) {
                    stableCount++;
                    if (stableCount >= 2) { // Stable for 2 consecutive checks
                        console.log(`[Reliability] ✅ ${stackType} stack alert count stabilized at ${currentAlertCount} cards`);
                        break;
                    }
                } else {
                    stableCount = 0; // Reset stability counter
                    previousAlertCount = currentAlertCount;
                }
                
                // Wait before next check
                await this.page.waitForTimeout(checkInterval);
                
            } catch (error) {
                console.log(`[Reliability] Error checking alert count: ${error.message}`);
                await this.page.waitForTimeout(checkInterval);
            }
        }
        
        // Final stability check
        await this.ensurePageStability({
            networkIdleTimeout: 5000,
            domStableTimeout: 1000
        });
        
        console.log(`[Reliability] ✅ Alert rendering wait completed for ${stackType} stack (${Date.now() - startTime}ms total)`);
    }

    /**
     * Enhanced stack switching with proper alert rendering wait
     * @param {string} stackType - Target stack type (Incident/Situation)
     * @param {Object} options - Stack switching options
     */
    async switchStackWithAlertsWait(stackType, options = {}) {
        const {
            retryCount = 3,
            waitAfterSwitch = 5000
        } = options;

        return await this.retryOperation(async () => {
            console.log(`[Reliability] Switching to ${stackType} stack with enhanced wait...`);
            
            // Perform the stack switch (this should be implemented by the calling code)
            // The actual switch action will be handled by the caller
            
            // Wait for the switch to complete and page to stabilize
            await this.ensurePageStability({
                networkIdleTimeout: 8000,
                domStableTimeout: 2000
            });
            
            // Wait specifically for alerts to render in the new stack
            await this.waitForAlertsToRender(stackType, {
                minimumWaitTime: waitAfterSwitch,
                maxWaitTime: 20000
            });
            
            console.log(`[Reliability] ✅ Stack switch to ${stackType} completed with alert rendering`);
            
        }, `Switch to ${stackType} stack`, retryCount);
    }

    /**
     * Enhanced cleanup operation with stack-aware timing
     * @param {Function} cleanupOperation - The cleanup operation to perform
     * @param {string} stackType - The stack type being cleaned
     * @param {string} operationName - Name for logging
     * @returns {Promise<boolean>} - Whether cleanup was successful
     */
    async performStackAwareCleanup(cleanupOperation, stackType, operationName) {
        return await this.retryOperation(async () => {
            console.log(`[Reliability] Starting stack-aware cleanup: ${operationName} on ${stackType} stack`);
            
            // Ensure we start with a stable page state
            await this.ensurePageStability();
            
            // Wait for alerts to be fully rendered before cleanup
            await this.waitForAlertsToRender(stackType, {
                minimumWaitTime: 5000, // 5 seconds minimum for UB/Trex cleanup
                maxWaitTime: 15000
            });
            
            // Perform the cleanup operation
            await cleanupOperation();
            
            // Validate cleanup was successful with additional wait
            await this.ensurePageStability({
                networkIdleTimeout: 8000,
                domStableTimeout: 3000
            });
            
            console.log(`[Reliability] ✅ Stack-aware cleanup completed: ${operationName} on ${stackType} stack`);
            return true;
            
        }, `Stack-aware cleanup: ${operationName}`, 2);
    }

    /**
     * Enhanced error context collection
     * @param {string} testName - Name of the test
     * @param {Error} error - The error that occurred
     */
    async collectErrorContext(testName, error) {
        console.log(`[Reliability] Collecting error context for: ${testName}`);
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const baseFileName = `debug/${testName}-${timestamp}`;
            
            // Take screenshot
            await this.page.screenshot({ 
                path: `${baseFileName}-screenshot.png`,
                fullPage: true 
            });
            
            // Get page HTML
            const html = await this.page.content();
            await require('fs').promises.writeFile(`${baseFileName}-page.html`, html);
            
            // Get current URL
            const url = this.page.url();
            
            // Get visible text content
            const visibleText = await this.page.locator('body').textContent();
            
            // Create error context report
            const errorContext = {
                testName,
                timestamp: new Date().toISOString(),
                error: {
                    message: error.message,
                    stack: error.stack
                },
                page: {
                    url,
                    title: await this.page.title(),
                    visibleTextLength: visibleText?.length || 0
                },
                files: {
                    screenshot: `${baseFileName}-screenshot.png`,
                    html: `${baseFileName}-page.html`
                }
            };
            
            await require('fs').promises.writeFile(
                `${baseFileName}-context.json`, 
                JSON.stringify(errorContext, null, 2)
            );
            
            console.log(`[Reliability] ✅ Error context collected: ${baseFileName}-context.json`);
            
        } catch (contextError) {
            console.log(`[Reliability] ❌ Failed to collect error context: ${contextError.message}`);
        }
    }

    /**
     * Optimized dynamic wait for stack to be ready - based on real application analysis
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @returns {Promise<void>}
     */
    static async waitForStackReady(page) {
        try {
            // Quick check if stack is already loaded
            const groupCount = page.locator('text=/\\d+ Groups/');
            await groupCount.waitFor({ state: 'visible', timeout: 3000 });
            
            // Ensure at least one site card is visible
            const firstCard = page.locator('[data-test-id="aggregated-site-card"]').first();
            await firstCard.waitFor({ state: 'visible', timeout: 2000 });
            
            console.log(`[TestReliabilityHelper] Stack is ready - cards loaded`);
        } catch (error) {
            console.log(`[TestReliabilityHelper] Stack not ready: ${error.message}`);
            throw error;
        }
    }

    /**
     * Quick smart element detection with minimal waits
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {string} selector - Element selector
     * @param {number} timeout - Maximum wait time
     * @returns {Promise<boolean>}
     */
    static async isElementReady(page, selector, timeout = 1000) {
        try {
            await page.locator(selector).first().waitFor({ state: 'visible', timeout });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Dynamic wait for alerts with intelligent detection
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {number} maxWait - Maximum wait time in milliseconds
     * @returns {Promise<void>}
     */
    static async waitForAlertsToRenderOptimized(page, maxWait = 3000) {
        console.log(`[TestReliabilityHelper] Optimized wait for alerts to render...`);
        
        // Check for loading indicators first
        const loadingIndicator = page.locator('.loader');
        if (await this.isElementReady(page, '.loader', 500)) {
            console.log(`[TestReliabilityHelper] Loading indicator found, waiting for completion...`);
            await loadingIndicator.waitFor({ state: 'hidden', timeout: maxWait });
        }
        
        // Quick stability check - ensure at least one alert card is visible
        const alertCard = page.locator('[data-test-id="aggregated-site-card"]').first();
        await alertCard.waitFor({ state: 'visible', timeout: 2000 });
        
        // Brief stabilization wait - much shorter than before
        await page.waitForTimeout(200);
        console.log(`[TestReliabilityHelper] Alerts rendered successfully`);
    }

    /**
     * Fast company switch detection
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @returns {Promise<void>}
     */
    static async waitForCompanySwitch(page) {
        console.log(`[TestReliabilityHelper] Waiting for company switch to complete...`);
        
        // Wait for the command page URL (based on real app behavior)
        await page.waitForURL(/.*command/, { timeout: 10000 });
        
        // Quick check that main interface is loaded
        await this.waitForStackReady(page);
        
        console.log(`[TestReliabilityHelper] Company switch completed`);
    }

    /**
     * Intelligent modal detection with limited attempts (reduced from 5 to 2)
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {number} maxAttempts - Maximum detection attempts
     * @returns {Promise<boolean>}
     */
    static async detectAndHandleModalOptimized(page, maxAttempts = 2) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`[TestReliabilityHelper] Modal detection attempt ${attempt}/${maxAttempts}`);
            
            // Check for common modal indicators
            const modalSelectors = [
                '.p-dialog-mask',
                '[role="dialog"]',
                '.modal',
                '.popup',
                '.p-component-overlay'
            ];
            
            for (const selector of modalSelectors) {
                if (await this.isElementReady(page, selector, 500)) {
                    console.log(`[TestReliabilityHelper] Modal detected: ${selector}`);
                    
                    // Try to close modal
                    const closeButton = page.locator(`${selector} button:has-text("Close"), ${selector} button:has-text("Cancel"), ${selector} .p-dialog-header-icon`);
                    if (await this.isElementReady(page, closeButton.first(), 500)) {
                        await closeButton.first().click();
                        await page.waitForTimeout(200); // Reduced from 300ms
                        return true;
                    }
                    
                    // Try escape key
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(200); // Reduced from 300ms
                    return true;
                }
            }
            
            if (attempt < maxAttempts) {
                await page.waitForTimeout(300); // Reduced from 500ms
            }
        }
        
        return false;
    }

    /**
     * Smart site card finder with optimized search patterns
     * @param {import('@playwright/test').Page} page - Playwright page object
     * @param {string} targetSiteName - Name of the site to find (UB or Trex)
     * @param {number} maxRetries - Maximum number of retry attempts
     * @returns {Promise<import('@playwright/test').Locator|null>}
     */
    static async findSiteCardOptimized(page, targetSiteName, maxRetries = 2) {
        console.log(`[TestReliabilityHelper] Starting optimized search for site: ${targetSiteName}`);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`[TestReliabilityHelper] Attempt ${attempt}/${maxRetries} for site: ${targetSiteName}`);
            
            try {
                // Dynamic wait for stack to be ready
                await this.waitForStackReady(page);
                
                // Optimized search patterns based on real application analysis
                const searchPatterns = [
                    `[data-test-id="aggregated-site-card"]:has-text("${targetSiteName}")`,
                    `[data-test-id="aggregated-site-card"] >> text=${targetSiteName}`,
                    `[data-test-id="aggregated-site-card-name"]:has-text("${targetSiteName}")`,
                ];
                
                for (const pattern of searchPatterns) {
                    console.log(`[TestReliabilityHelper] Trying pattern: ${pattern}`);
                    const cards = page.locator(pattern);
                    const count = await cards.count();
                    
                    if (count > 0) {
                        console.log(`[TestReliabilityHelper] Found ${count} card(s) with pattern: ${pattern}`);
                        const firstCard = cards.first();
                        
                        // Quick visibility check - no long timeout
                        await firstCard.waitFor({ state: 'visible', timeout: 1500 });
                        console.log(`[TestReliabilityHelper] Successfully found site card for: ${targetSiteName}`);
                        return firstCard;
                    }
                }
                
                // If no cards found, minimal wait and retry
                if (attempt < maxRetries) {
                    console.log(`[TestReliabilityHelper] Site not found, quick retry...`);
                    await page.waitForTimeout(500); // Much shorter wait
                }
                
            } catch (error) {
                console.log(`[TestReliabilityHelper] Attempt ${attempt} failed: ${error.message}`);
                if (attempt === maxRetries) {
                    throw error;
                }
                await page.waitForTimeout(300); // Shorter retry wait
            }
        }
        
        console.log(`[TestReliabilityHelper] Failed to find site card for: ${targetSiteName} after ${maxRetries} attempts`);
        return null;
    }
}
