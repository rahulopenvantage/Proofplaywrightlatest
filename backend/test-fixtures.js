import { test as base } from '@playwright/test';
import { SharedTestSteps } from './SharedTestSteps.js';

/**
 * Enhanced test fixtures with automatic cleanup and stability helpers
 * 
 * Usage in tests:
 * import { test, expect } from '../backend/test-fixtures.js';
 * 
 * test('my test', async ({ page, sharedSteps, autoCleanup }) => {
 *   // Your test code - cleanup happens automatically
 * });
 */
export const test = base.extend({
  /**
   * Automatic page cleanup before each test
   */
  page: async ({ page }, use) => {
    console.log('[TestFixture] Setting up page with enhanced stability...');
    
    // Set default navigation timeout
    page.setDefaultNavigationTimeout(90000);
    page.setDefaultTimeout(60000);
    
    // Clear any existing modals/overlays before test
    await page.evaluate(() => {
      document.querySelectorAll('.react-aria-ModalOverlay, [role="dialog"]').forEach(el => el.remove());
    }).catch(() => {}); // Ignore if page not loaded yet
    
    // Use the page in the test
    await use(page);
    
    // Cleanup after test
    console.log('[TestFixture] Cleaning up page after test...');
    
    // Remove any lingering modals
    await page.evaluate(() => {
      document.querySelectorAll('.react-aria-ModalOverlay, [role="dialog"]').forEach(el => el.remove());
    }).catch(() => {});
    
    // Clear browser storage if needed
    await page.evaluate(() => {
      sessionStorage.clear();
    }).catch(() => {});
  },
  
  /**
   * Auto-instantiated SharedTestSteps
   */
  sharedSteps: async ({ page }, use) => {
    const sharedSteps = new SharedTestSteps(page);
    await use(sharedSteps);
  },
  
  /**
   * Enhanced wait helper with automatic retries
   */
  waitHelper: async ({ page }, use) => {
    const helper = {
      /**
       * Wait for element with automatic retries and better error messages
       */
      async waitForElement(selector, options = {}) {
        const timeout = options.timeout || 30000;
        const retries = options.retries || 3;
        
        for (let i = 0; i < retries; i++) {
          try {
            await page.waitForSelector(selector, { 
              state: options.state || 'visible',
              timeout: timeout / retries 
            });
            return true;
          } catch (error) {
            if (i === retries - 1) {
              console.error(`[WaitHelper] Failed to find element after ${retries} retries: ${selector}`);
              throw error;
            }
            console.log(`[WaitHelper] Retry ${i + 1}/${retries} for element: ${selector}`);
            await page.waitForTimeout(1000);
          }
        }
      },
      
      /**
       * Wait for network to be idle with timeout protection
       */
      async waitForNetworkIdle(options = {}) {
        const timeout = options.timeout || 10000;
        try {
          await page.waitForLoadState('networkidle', { timeout });
        } catch (error) {
          console.log('[WaitHelper] Network idle timeout - continuing anyway');
          // Don't throw - this is often safe to ignore
        }
      },
      
      /**
       * Smart wait that combines multiple conditions
       */
      async smartWait(selector, options = {}) {
        // Wait for selector
        await this.waitForElement(selector, options);
        
        // Wait for element to be stable (not animating)
        await page.waitForFunction(
          (sel) => {
            const el = document.querySelector(sel);
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          },
          selector,
          { timeout: 5000 }
        ).catch(() => {});
        
        // Short stabilization wait
        await page.waitForTimeout(500);
      }
    };
    
    await use(helper);
  },
  
  /**
   * Automatic cleanup helper that runs after each test
   */
  autoCleanup: async ({ page, sharedSteps }, use, testInfo) => {
    // Track if cleanup is needed
    const cleanupNeeded = {
      filters: false,
      alerts: false,
      modals: false
    };
    
    // Provide cleanup API to tests
    const cleanup = {
      markFiltersUsed: () => { cleanupNeeded.filters = true; },
      markAlertsCreated: () => { cleanupNeeded.alerts = true; },
      markModalsOpened: () => { cleanupNeeded.modals = true; }
    };
    
    await use(cleanup);
    
    // Auto cleanup after test
    console.log('[AutoCleanup] Running post-test cleanup...');
    
    try {
      // Always clean modals
      await page.evaluate(() => {
        document.querySelectorAll('.react-aria-ModalOverlay, [role="dialog"]').forEach(el => el.remove());
      }).catch(() => {});
      
      // Clean filters if used
      if (cleanupNeeded.filters) {
        console.log('[AutoCleanup] Resetting stack filters...');
        await sharedSteps.resetStackFilter().catch((e) => {
          console.log(`[AutoCleanup] Filter reset failed: ${e.message}`);
        });
      }
      
      // Note: Alert cleanup is handled by individual tests since it's site-specific
      
      console.log('[AutoCleanup] Cleanup completed');
    } catch (error) {
      console.log(`[AutoCleanup] Cleanup error (non-fatal): ${error.message}`);
    }
  }
});

export { expect } from '@playwright/test';
