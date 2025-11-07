// backend/TestIsolationHelper.js
export class TestIsolationHelper {
    constructor(page) {
        this.page = page;
    }

    /**
     * Complete application state reset before each test
     */
    async resetApplicationState() {
        console.log('[TestIsolation] Starting complete application state reset...');
        
        try {
            // 1. Clear all notifications
            await this.clearAllNotifications();
            
            // 2. Close any open modals
            await this.closeAllModals();
            
            // 3. Reset filters
            await this.resetAllFilters();
            
            // 4. Clear localStorage and sessionStorage
            await this.clearBrowserStorage();
            
            // 5. Reset network state
            await this.resetNetworkState();
            
            console.log('[TestIsolation] Application state reset completed');
        } catch (error) {
            console.warn('[TestIsolation] State reset warning:', error.message);
        }
    }

    /**
     * Clear all notifications that might block interactions
     */
    async clearAllNotifications() {
        console.log('[TestIsolation] Clearing all notifications...');
        
        try {
            // Wait for any existing notifications to disappear
            await this.page.waitForTimeout(2000);
            
            // Force close any persistent notifications
            const notifications = this.page.locator('.rnc__notification-content, .notification, .toast');
            const notificationCount = await notifications.count();
            
            if (notificationCount > 0) {
                console.log(`[TestIsolation] Found ${notificationCount} notifications to clear`);
                
                // Click outside to dismiss
                await this.page.locator('body').click({ position: { x: 10, y: 10 } });
                await this.page.waitForTimeout(1000);
                
                // Press Escape to close any remaining
                await this.page.keyboard.press('Escape');
                await this.page.waitForTimeout(1000);
            }
        } catch (error) {
            console.warn('[TestIsolation] Notification cleanup warning:', error.message);
        }
    }

    /**
     * Close all open modals
     */
    async closeAllModals() {
        console.log('[TestIsolation] Closing all modals...');
        
        try {
            // Close filter modals
            const filterModal = this.page.locator('[data-test-id="modalClose"]');
            if (await filterModal.isVisible()) {
                await filterModal.click();
                await this.page.waitForTimeout(1000);
            }
            
            // Close any other modals
            const genericModals = this.page.locator('.modal-close, .close-button, [aria-label="Close"]');
            const modalCount = await genericModals.count();
            
            for (let i = 0; i < modalCount; i++) {
                try {
                    await genericModals.nth(i).click({ timeout: 2000 });
                    await this.page.waitForTimeout(500);
                } catch (e) {
                    // Continue if modal close fails
                }
            }
            
            // Press Escape as final fallback
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(500);
        } catch (error) {
            console.warn('[TestIsolation] Modal cleanup warning:', error.message);
        }
    }

    /**
     * Reset all filters to default state
     */
    async resetAllFilters() {
        console.log('[TestIsolation] Resetting all filters...');
        
        try {
            // Only reset if we're on a page with filters
            const currentUrl = this.page.url();
            if (currentUrl.includes('command') || currentUrl.includes('history')) {
                
                // Reset stack filters (if on command page)
                if (currentUrl.includes('command')) {
                    await this.resetStackFilters();
                }
                
                // Reset history filters (if on history page)
                if (currentUrl.includes('history')) {
                    await this.resetHistoryFilters();
                }
            }
        } catch (error) {
            console.warn('[TestIsolation] Filter reset warning:', error.message);
        }
    }

    /**
     * Reset stack filters on command page
     */
    async resetStackFilters() {
        try {
            const filterButton = this.page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
            if (await filterButton.isVisible()) {
                await filterButton.click();
                await this.page.waitForTimeout(1000);
                
                const resetButton = this.page.locator('[data-test-id="btn_stackFilter_reset"]');
                if (await resetButton.isVisible()) {
                    await resetButton.click();
                    await this.page.waitForTimeout(1000);
                    
                    const applyButton = this.page.locator('[data-test-id="btn_stackFilter_Apply"]');
                    if (await applyButton.isVisible()) {
                        await applyButton.click();
                        await this.page.waitForTimeout(1000);
                    }
                }
                
                // Close the modal
                const closeButton = this.page.locator('[data-test-id="modalClose"]');
                if (await closeButton.isVisible()) {
                    await closeButton.click();
                    await this.page.waitForTimeout(1000);
                }
            }
        } catch (error) {
            console.warn('[TestIsolation] Stack filter reset warning:', error.message);
        }
    }

    /**
     * Reset history filters on history page
     */
    async resetHistoryFilters() {
        try {
            const clearAllButton = this.page.locator('[data-test-id="clear_all_history_filters"]');
            if (await clearAllButton.isVisible()) {
                await clearAllButton.click();
                await this.page.waitForTimeout(1000);
            }
        } catch (error) {
            console.warn('[TestIsolation] History filter reset warning:', error.message);
        }
    }

    /**
     * Clear browser storage
     */
    async clearBrowserStorage() {
        console.log('[TestIsolation] Clearing browser storage...');
        
        try {
            await this.page.evaluate(() => {
                // Clear localStorage
                localStorage.clear();
                
                // Clear sessionStorage
                sessionStorage.clear();
                
                // Clear any cached data
                if ('caches' in window) {
                    caches.keys().then(names => {
                        names.forEach(name => {
                            caches.delete(name);
                        });
                    });
                }
            });
        } catch (error) {
            console.warn('[TestIsolation] Storage cleanup warning:', error.message);
        }
    }

    /**
     * Reset network state
     */
    async resetNetworkState() {
        console.log('[TestIsolation] Resetting network state...');
        
        try {
            // Wait for any pending network requests to complete
            await this.page.waitForLoadState('networkidle', { timeout: 5000 });
        } catch (error) {
            console.warn('[TestIsolation] Network reset warning:', error.message);
        }
    }

    /**
     * Ensure clean page state before test execution
     */
    async ensureCleanPageState() {
        console.log('[TestIsolation] Ensuring clean page state...');
        
        try {
            // Wait for page to be fully loaded
            await this.page.waitForLoadState('domcontentloaded');
            await this.page.waitForTimeout(2000);
            
            // Clear any focus states
            await this.page.evaluate(() => {
                if (document.activeElement) {
                    document.activeElement.blur();
                }
            });
            
            // Click somewhere neutral to clear any active states
            await this.page.locator('body').click({ position: { x: 10, y: 10 } });
            await this.page.waitForTimeout(500);
            
        } catch (error) {
            console.warn('[TestIsolation] Page state cleanup warning:', error.message);
        }
    }

    /**
     * Complete test cleanup after test execution
     */
    async cleanupAfterTest() {
        console.log('[TestIsolation] Starting post-test cleanup...');
        
        try {
            // Clear any created test data
            await this.clearTestData();
            
            // Reset application state
            await this.resetApplicationState();
            
            console.log('[TestIsolation] Post-test cleanup completed');
        } catch (error) {
            console.warn('[TestIsolation] Post-test cleanup warning:', error.message);
        }
    }

    /**
     * Clear test data that might have been created
     */
    async clearTestData() {
        console.log('[TestIsolation] Clearing test data...');
        
        try {
            // This would need to be customized based on specific test data
            // For now, just ensure we're in a clean state
            await this.page.waitForTimeout(1000);
        } catch (error) {
            console.warn('[TestIsolation] Test data cleanup warning:', error.message);
        }
    }
}
