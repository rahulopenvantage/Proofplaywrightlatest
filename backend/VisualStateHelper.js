/**
 * VisualStateHelper.js
 * Robust alternatives to screenshot comparison for visual state verification
 */

export class VisualStateHelper {
    constructor(page) {
        this.page = page;
    }

    /**
     * Verify filter state without screenshots
     * @param {Object} options - Verification options
     * @param {boolean} options.filtersApplied - Should show "Filters applied"
     * @param {string[]} options.alertTypes - Expected alert types (e.g., ['Trex', 'Unusual Behaviour'])
     * @param {boolean} options.suppressionActive - Should show suppression effects
     */
    async verifyFilterState(options = {}) {
        const {
            filtersApplied = true,
            alertTypes = [],
            suppressionActive = false
        } = options;

        console.log('[VisualStateHelper] Verifying filter state...');

        // 1. Check "Filters applied" indicator
        if (filtersApplied) {
            await expect(this.page.locator('text=Filters applied')).toBeVisible();
            console.log('[VisualStateHelper] ✅ "Filters applied" indicator verified');
        }

        // 2. Verify alert types
        if (alertTypes.length > 0) {
            await expect(this.page.locator('text=Alert Types:')).toBeVisible();
            for (const alertType of alertTypes) {
                await expect(this.page.locator(`text=${alertType}`)).toBeVisible();
                console.log(`[VisualStateHelper] ✅ Alert type "${alertType}" verified`);
            }
        }

        // 3. Check suppression effects
        if (suppressionActive) {
            const zeroGroups = this.page.locator('text=0 Groups');
            const noResults = this.page.locator('text=No Results Found');
            
            const suppressionVisible = await Promise.race([
                zeroGroups.isVisible(),
                noResults.isVisible()
            ]);
            
            expect(suppressionVisible).toBeTruthy();
            console.log('[VisualStateHelper] ✅ Suppression effects verified');
        }

        // 4. Verify filter button is present and interactive
        const filterButton = this.page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
        await expect(filterButton).toBeVisible();
        await expect(filterButton).toBeEnabled();
        console.log('[VisualStateHelper] ✅ Filter button state verified');

        return true;
    }

    /**
     * Verify suppression modal workflow
     * @param {string} reason - Suppression reason (e.g., 'Bad Alerts')
     * @param {string} duration - Suppression duration (e.g., '15 mins')
     */
    async verifySuppressionModal(reason, duration) {
        console.log('[VisualStateHelper] Verifying suppression modal...');

        // Check modal elements are present
        await expect(this.page.locator('[data-test-id="reasonForSuppressionDDL"]')).toBeVisible();
        await expect(this.page.locator('[data-test-id="durationOfSuppressionDDL"]')).toBeVisible();
        await expect(this.page.locator('button:has-text("Confirm")')).toBeVisible();
        await expect(this.page.locator('button:has-text("Cancel")')).toBeVisible();

        console.log('[VisualStateHelper] ✅ Suppression modal elements verified');
        return true;
    }

    /**
     * Verify stack switch occurred
     * @param {string} expectedStack - Expected stack name ('Incident' or 'Situation')
     */
    async verifyStackSwitch(expectedStack) {
        console.log(`[VisualStateHelper] Verifying switch to ${expectedStack} stack...`);

        // Check stack indicator
        await expect(this.page.locator(`text=${expectedStack}`)).toBeVisible();
        
        // Verify URL contains expected pattern if needed
        if (expectedStack.toLowerCase() === 'incident' || expectedStack.toLowerCase() === 'situation') {
            await expect(this.page).toHaveURL(/.*command/);
        }

        console.log(`[VisualStateHelper] ✅ ${expectedStack} stack verified`);
        return true;
    }

    /**
     * Check for visual indicators using CSS properties
     * @param {string} selector - Element selector
     * @param {Object} expectedStyles - Expected CSS properties
     */
    async verifyElementStyles(selector, expectedStyles) {
        console.log(`[VisualStateHelper] Verifying styles for ${selector}...`);

        const element = this.page.locator(selector);
        await expect(element).toBeVisible();

        for (const [property, expectedValue] of Object.entries(expectedStyles)) {
            const actualValue = await element.evaluate((el, prop) => {
                return window.getComputedStyle(el).getPropertyValue(prop);
            }, property);

            expect(actualValue).toBe(expectedValue);
            console.log(`[VisualStateHelper] ✅ ${property}: ${actualValue} matches expected`);
        }

        return true;
    }

    /**
     * Verify element count changes (for counter verification)
     * @param {string} selector - Element selector
     * @param {number} expectedCount - Expected count
     * @param {string} description - Description for logging
     */
    async verifyElementCount(selector, expectedCount, description = 'elements') {
        console.log(`[VisualStateHelper] Verifying ${description} count...`);

        const elements = this.page.locator(selector);
        await expect(elements).toHaveCount(expectedCount);

        console.log(`[VisualStateHelper] ✅ ${description} count: ${expectedCount} verified`);
        return true;
    }

    /**
     * Wait for and verify success notifications
     * @param {string} expectedMessage - Expected success message
     */
    async verifySuccessNotification(expectedMessage) {
        console.log('[VisualStateHelper] Verifying success notification...');

        await expect(this.page.locator(`text=${expectedMessage}`)).toBeVisible();
        console.log(`[VisualStateHelper] ✅ Success notification verified: ${expectedMessage}`);

        return true;
    }
}
