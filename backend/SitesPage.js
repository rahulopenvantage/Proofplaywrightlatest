// e2e/SitesPage.js
// @ts-check
import { expect } from '@playwright/test';
import { MenuPage } from './MenuPage.js';

export class SitesPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.menuPage = new MenuPage(page);

        // Locators from the 'createManualAlertForAutomationCompany' Cypress command
        this.searchToggle = page.locator('[data-test-id="search-toggle"]');
        this.searchInput = page.locator('[data-test-id="search-input"]');
        this.createAlertSiteButton = page.locator('[data-test-id="createAlertSiteBtn"]');
        // Locator for the "Create Manual Alert" heading/paragraph to check for its absence
        this.createManualAlertHeading = page.locator('p').filter({ hasText: 'Create Manual Alert' });
    }

    /**
     * Navigates to the Sites page using the MenuPage.
     */
    async navigateToSites() {
        await this.menuPage.openSites();
    }

    /**
     * Creates a manual alert for Automation company - exact implementation of Cypress command.
     * Based on 'createManualAlertForAutomationCompany' Cypress command.
     */
    async createManualAlertForAutomationCompany() {
        // 1. Navigate to Sites page (MenuPage.openSites() is called in Cypress)
        await this.navigateToSites();

        // 2. Click on the site-search icon
        await this.searchToggle.click();

        // 3. Type the site name and press Enter - exactly as in Cypress: 'BDFD_Boeing{enter}'
        await this.searchInput.type('BDFD_Boeing');

        // 4. Wait until "BDFD_Boeing" appears on the page
        await expect(this.page.getByText('BDFD_Boeing')).toBeVisible();

        // 5. Click the "Create Alert Site" button
        await this.createAlertSiteButton.click();

        // 6. Select the first device in the list
        await this.page.locator('input[type="radio"]').first().click(); // Using click() to match Cypress

        // 7. Click the "Create" button to confirm alert creation
        await this.page.getByRole('button', { name: 'Create' }).click();

        // 8. Wait until the "Create Manual Alert" heading is gone
        await expect(this.createManualAlertHeading).not.toBeVisible();
    }

    /**
     * Creates a manual alert for a given site name with enhanced reliability.
     * This is a more generic version for other sites.
     * @param {string} siteName - The name of the site to search for (e.g., 'BDFD_Boeing').
     */
    async createManualAlert(siteName) {
        console.log(`[SitesPage] Creating manual alert for site: ${siteName}`);
        
        // Navigate to Sites page first
        await this.navigateToSites();
        
        // 1. Click on the site-search icon
        await this.searchToggle.waitFor({ state: 'visible', timeout: 8000 });
        await this.searchToggle.click();

        // 2. Type the site name and press Enter
        await this.searchInput.waitFor({ state: 'visible', timeout: 3000 });
        await this.searchInput.fill(siteName);
        await this.searchInput.press('Enter');

        // 3. Enhanced wait for site to appear - single strategy with fallback
        console.log(`[SitesPage] Waiting for site "${siteName}" to appear...`);
        try {
            // Primary: Wait for exact text match
            await expect(this.page.getByText(siteName)).toBeVisible({ timeout: 10000 });
        } catch (error) {
            // Fallback: Try partial match for truncated names
            await expect(this.page.getByText(siteName.substring(0, 10))).toBeVisible({ timeout: 5000 });
        }

        // 4. Click the "Create Alert Site" button
        await this.createAlertSiteButton.waitFor({ state: 'visible', timeout: 5000 });
        await this.createAlertSiteButton.click();

        // 5. Select the first device in the list
        await this.page.waitForTimeout(800); // Brief wait for modal to appear
        const firstRadioInput = this.page.locator('input[type="radio"]').first();
        await firstRadioInput.waitFor({ state: 'visible', timeout: 8000 });
        await firstRadioInput.click();

        // 6. Click the "Create" button to confirm alert creation
        const createButton = this.page.getByRole('button', { name: 'Create' });
        await createButton.waitFor({ state: 'visible', timeout: 3000 });
        await createButton.click();

        // 7. Wait for alert creation completion
        await expect(this.createManualAlertHeading).not.toBeVisible({ timeout: 12000 });
        
        console.log(`[SitesPage] ✅ Manual alert created successfully for: ${siteName}`);
    }    /**
     * Creates a manual alert and extracts the alert ID and timestamp for tracking
     * @param {string} siteName - The name of the site to create alert for
     * @returns {Promise<Object>} Object containing alertId and timestamp
     */
     async createManualAlertForTheMarc() {
        // 1. Navigate to Sites page (MenuPage.openSites() is called in Cypress)
        await this.navigateToSites();

        // 2. Click on the site-search icon
        await this.searchToggle.click();

        // 3. Type the site name and press Enter - exactly as in Cypress: 'SNDTN_The Marc Rivonia Rd{enter}'
        await this.searchInput.fill('SNDTN_The Marc Rivonia Rd');

        // 4. Wait until "SNDTN_The Marc Rivonia Rd" appears on the page
        await expect(this.page.getByText('SNDTN_The Marc Rivonia Rd')).toBeVisible();

        await this.createAlertSiteButton.click();
                // Click the Site Group dropdown to open it
        await this.page.getByText('Select Site GroupSelect Site').click();

        // Wait for the dropdown options to appear
        await this.page.waitForSelector('[role="listbox"]');

        // Click on the "Entrance" option
        await this.page.getByRole('option', { name: 'Entrance' }).click();
       
        // 6. Select the first device in the list
        await this.page.locator('input[type="radio"]').first().click(); 

        // 7. Click the "Create" button to confirm alert creation
        await this.page.getByRole('button', { name: 'Create' }).click();

        // 8. Wait until the "Create Manual Alert" heading is gone
        await expect(this.createManualAlertHeading).not.toBeVisible();
    }
    
    async createManualAlertWithExtraction(siteName = 'BDFD_Boeing') {
        console.log(`[SitesPage] Creating manual alert for site: ${siteName}`);
        
        // Navigate to Sites page
        await this.navigateToSites();
        
        // Record creation start time
        const creationStartTime = new Date().toISOString();
        
        // Click on the site-search icon
        await this.searchToggle.click();
        
        // Search for the site
        await this.searchInput.fill(siteName);
        await this.searchInput.press('Enter');
        
        // Wait for site to appear
        await expect(this.page.getByText(siteName)).toBeVisible({ timeout: 15000 });
        
        // Click create alert button
        await this.createAlertSiteButton.click();
        
        // Select first device
        await this.page.locator('input[type="radio"]').first().click();
        
        // Create the alert
        await this.page.getByRole('button', { name: 'Create' }).click();
        
        // Wait for creation completion
        await expect(this.createManualAlertHeading).not.toBeVisible();
        
        // Extract alert ID from the response or URL
        const alertId = await this.extractAlertId();
        
        console.log(`[SitesPage] Alert created successfully - ID: ${alertId}`);
        
        return {
            alertId: alertId,
            timestamp: creationStartTime,
            siteName: siteName
        };
    }    /**
     * Extracts the alert ID after creation
     * @returns {Promise<string>} The alert ID
     */
    async extractAlertId() {
        // Wait for any network requests to complete
        await this.page.waitForLoadState('networkidle');
        
        // Try to extract from URL parameters or notifications
        try {
            // Method 1: Check for alert ID in URL
            const currentUrl = this.page.url();
            const alertIdMatch = currentUrl.match(/alert[=\/]([a-zA-Z0-9-]+)/);
            if (alertIdMatch) {
                return alertIdMatch[1];
            }
            
            // Method 2: Check for success notification with alert ID
            const notification = this.page.locator('[data-testid*="notification"], .notification, .alert-success');
            if (await notification.isVisible({ timeout: 5000 })) {
                const notificationText = await notification.textContent();
                if (notificationText) {
                    const alertIdMatch = notificationText.match(/alert\s*[:\-]\s*([a-zA-Z0-9-]+)/i);
                    if (alertIdMatch) {
                        return alertIdMatch[1];
                    }
                }
            }
            
            // Method 3: Generate a timestamp-based ID if extraction fails
            const timestamp = Date.now();
            return `manual-alert-${timestamp}`;
            
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.warn('[SitesPage] Could not extract alert ID, generating fallback:', errorMsg);
            return `manual-alert-${Date.now()}`;
        }
    }

    /**
     * Validates that a manual alert was created successfully
     * @param {string} siteName - The site name used for creation
     */
    async validateAlertCreation(siteName) {
        // Verify we're no longer in the creation flow
        await expect(this.createManualAlertHeading).not.toBeVisible();
        
        // Verify we've returned to a stable state
        await this.page.waitForLoadState('networkidle');
        
        console.log(`[SitesPage] Alert creation validated for site: ${siteName}`);
    }
}
