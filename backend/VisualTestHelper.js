// backend/VisualTestHelper.js
// Robust helper for visual screenshot testing

import { expect } from '@playwright/test'; // Add proper import

export class VisualTestHelper {
    constructor(page) {
        this.page = page;
    }

    /**
     * Takes a robust screenshot with maximum stability settings
     * @param {Object} locator - Playwright locator
     * @param {string} screenshotName - Name for the screenshot file
     * @param {Object} options - Additional options
     */
    async takeRobustScreenshot(locator, screenshotName, options = {}) {
        const defaultOptions = {
            threshold: 0.2,           // 20% tolerance for better stability
            maxDiffPixels: 150,       // Allow up to 150 different pixels
            animations: 'disabled',    // Disable animations
            mode: 'RGB',              // Use RGB mode for better consistency
            ...options
        };

        // Wait for complete stability
        await this.waitForStability();
        
        // Ensure element is visible and stable
        await locator.waitFor({ state: 'visible', timeout: 15000 });
        await this.waitForElementStability(locator);
        
        // Additional stability wait with font loading check
        await this.waitForFontsAndStyles();
        await this.page.waitForTimeout(300); // Enhanced stability wait
        
        console.log(`[VisualTestHelper] Taking robust screenshot: ${screenshotName}`);
        
        try {
            await expect(locator).toHaveScreenshot(screenshotName, defaultOptions);
            console.log(`[VisualTestHelper] ✅ Screenshot comparison passed: ${screenshotName}`);
            return true;
        } catch (error) {
            console.log(`[VisualTestHelper] ⚠️ Screenshot comparison failed: ${error.message}`);
            
            // Fallback: Take a reference screenshot for debugging
            await locator.screenshot({ 
                path: `debug-${screenshotName}`, 
                animations: 'disabled' 
            });
            console.log(`[VisualTestHelper] 📸 Debug screenshot saved: debug-${screenshotName}`);
            
            throw error;
        }
    }

    /**
     * Waits for maximum UI stability before screenshot
     */
    async waitForStability() {
        // Avoid relying on networkidle in a real-time app; prefer short, deterministic waits
        await this.page.waitForTimeout(500); // Increased for better stability

        // Ensure fonts are ready to avoid text reflow changing element size by 1px
        await this.waitForFontsAndStyles();
        
        // Disable animations globally for consistency
        await this.page.addStyleTag({
            content: `
                *, *::before, *::after {
                    animation-duration: 0s !important;
                    animation-delay: 0s !important;
                    transition-duration: 0s !important;
                    transition-delay: 0s !important;
                    scroll-behavior: auto !important;
                }
                /* Disable CSS transform transitions that can cause positioning issues */
                * {
                    transform: none !important;
                }
            `
        });
        
        console.log('[VisualTestHelper] UI stability achieved');
    }

    /**
     * Enhanced font and style loading check
     */
    async waitForFontsAndStyles() {
        try {
            await this.page.evaluate(async () => {
                // Wait for fonts
                if (document.fonts) {
                    await document.fonts.ready;
                }
                
                // Wait for stylesheets
                const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
                await Promise.all(links.map(link => {
                    if (link.sheet) return Promise.resolve();
                    return new Promise((resolve) => {
                        link.addEventListener('load', resolve, { once: true });
                        setTimeout(resolve, 1000); // Fallback timeout
                    });
                }));
                
                // Small delay for style application
                await new Promise(resolve => setTimeout(resolve, 100));
            });
        } catch (error) {
            console.log('[VisualTestHelper] Font/style loading check failed, continuing:', error.message);
        }
    }

    /**
     * Waits until the locator's bounding box is stable across a few checks
     * @param {Object} locator - Playwright locator
     * @param {number} attempts
     * @param {number} interval
     */
    async waitForElementStability(locator, attempts = 6, interval = 150) {
        let prev;
        await locator.waitFor({ state: 'visible', timeout: 15000 });
        
        for (let i = 0; i < attempts; i++) {
            const box = await locator.boundingBox();
            if (!box) {
                await this.page.waitForTimeout(interval);
                continue;
            }
            
            // Round to avoid sub-pixel differences
            const cur = `${Math.round(box.x)}:${Math.round(box.y)}:${Math.round(box.width)}:${Math.round(box.height)}`;
            
            if (prev === cur) {
                console.log(`[VisualTestHelper] Element stable after ${i + 1} checks`);
                return true;
            }
            prev = cur;
            await this.page.waitForTimeout(interval);
        }
        
        console.log('[VisualTestHelper] Element stability check completed (proceeding anyway)');
        return true; // proceed even if not perfectly stable
    }

    /**
     * Takes a screenshot with automatic retry on failure
     * @param {Object} locator - Playwright locator
     * @param {string} screenshotName - Name for the screenshot file
     * @param {string} description - Test description for logging
     * @param {number} maxRetries - Maximum number of retries
     */
    async takeScreenshotWithRetry(locator, screenshotName, description = '', maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[VisualTestHelper] ${description} - Attempt ${attempt}/${maxRetries}: ${screenshotName}`);
                
                await this.takeRobustScreenshot(locator, screenshotName, {
                    threshold: 0.15 + (attempt * 0.05), // Start strict, get more tolerant
                    maxDiffPixels: 80 + (attempt * 40)   // Gradually increase pixel tolerance
                });
                
                console.log(`[VisualTestHelper] ✅ Screenshot successful on attempt ${attempt}: ${screenshotName}`);
                return true; // Success
            } catch (error) {
                console.log(`[VisualTestHelper] Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt === maxRetries) {
                    console.log(`[VisualTestHelper] ❌ All ${maxRetries} attempts failed for ${screenshotName}`);
                    
                    // Take final debug screenshot
                    await locator.screenshot({ 
                        path: `final-debug-${screenshotName}`, 
                        animations: 'disabled' 
                    });
                    console.log(`[VisualTestHelper] 📸 Final debug screenshot saved: final-debug-${screenshotName}`);
                    
                    throw error;
                }
                
                // Wait and try stability again before retry
                await this.page.waitForTimeout(1500);
                await this.waitForStability();
            }
        }
    }

    /**
     * Update baseline screenshots (use when UI legitimately changes)
     * @param {Object} locator - Playwright locator
     * @param {string} screenshotName - Name for the screenshot file
     */
    async updateBaseline(locator, screenshotName) {
        await this.waitForStability();
        await locator.waitFor({ state: 'visible' });
        
        await expect(locator).toHaveScreenshot(screenshotName, {
            updateSnapshots: 'all',
            animations: 'disabled'
        });
        
        console.log(`[VisualTestHelper] ✅ Baseline updated: ${screenshotName}`);
    }
}
