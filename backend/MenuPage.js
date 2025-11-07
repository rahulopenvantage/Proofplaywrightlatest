// e2e/MenuPage.js
// @ts-check
import { expect } from '@playwright/test';

export class MenuPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        // Locators using exact Cypress data-test-id selectors
        this.hamburgerMenu = page.locator('[data-test-id="burger-menu-button"]');
        this.commandLink = page.locator('[data-test-id="command"]');
        this.historyLink = page.locator('[data-test-id="history"]');
        this.viewLink = page.locator('[data-test-id="proof-view"]');
        this.sitesLink = page.locator('[data-test-id="sites"]');
        this.metricsLink = page.locator('[data-test-id="metrics"]');
        this.reportsLink = page.locator('[data-test-id="sidebaritem-reports"]');
        this.configurationsLink = page.locator('[data-test-id="configurations"]');
        
        // Configuration submenu selectors
        this.configurationSubmenuSelectors = {
            'User Management': '[data-test-id="user-management"]',
            'Role Management': '[data-test-id="role-management"]',
            'Area Management': '[data-test-id="area-management"]',
            'Company Management': '[data-test-id="company-management"]',
            'Filter Management': '[data-test-id="filter-management"]',
            'Standard Operating Procedures': '[data-test-id="standard-operating-procedures-management"]',
            'Station Management': '[data-test-id="station-management"]',
            'Suppression Management': '[data-test-id="suppression-management"]',
            'Telegram Management': '[data-test-id="telegram-management"]',
            'VOI Management': '[data-test-id="voi-management-voi"]',
            'Wallboard Management': '[data-test-id="wallboard-management"]'
        };
        
        // Reports submenu selectors
        this.reportsSubmenuSelectors = {
            'Audit Log': '[data-test-id="sidebaritem-audit-log"]',
            'Alert Reports': '[data-test-id="sidebaritem-alert-reports"]',
            'Alert Reports Schedules': '[data-test-id="sidebaritem-alert-reports-schedules"]',
            'Dispatch Reports': 'text=Dispatch Reports' // MCP debugging found this works via text selector
        };
    }

    async navigateToDispatchReports() {
    console.log('[Menu] Navigating to Dispatch Reports...');
    
    // First navigate to Alert Reports
    await this.navigateToAlertReports();
    
    // Wait for Alert Reports page to load
    await this.page.waitForTimeout(3000); // Increased wait time
    
    // Click on the Dispatch Reports tab with enhanced logic
    console.log('[Menu] Clicking Dispatch Reports tab...');
    
    let dispatchReportsTab = null;
    let selectorUsed = '';
    let retryCount = 0;
    const maxRetries = 3;
    
    // Retry mechanism for finding the Dispatch Reports tab
    while (!dispatchReportsTab && retryCount < maxRetries) {
        console.log(`[Menu] Attempt ${retryCount + 1}/${maxRetries} to find Dispatch Reports tab`);
        
        // Try multiple selectors for the Dispatch Reports tab
        const dispatchReportsSelectors = [
            'text=Dispatch Reports',
            '[data-test-id*="dispatch"]',
            'a:has-text("Dispatch Reports")',
            'button:has-text("Dispatch Reports")',
            '[href*="dispatch"]',
            'text="Dispatch Reports"'
        ];
        
        for (const selector of dispatchReportsSelectors) {
            try {
                const tab = this.page.locator(selector).first();
                if (await tab.isVisible({ timeout: 5000 })) {
                    dispatchReportsTab = tab;
                    selectorUsed = selector;
                    console.log(`[Menu] Found Dispatch Reports tab with selector: ${selector}`);
                    break;
                }
            } catch (error) {
                // Continue to next selector
            }
        }
        
        if (!dispatchReportsTab) {
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`[Menu] Dispatch Reports tab not found, waiting and retrying...`);
                await this.page.waitForTimeout(3000);
                // Try reloading the Alert Reports page to refresh tabs
                await this.navigateToAlertReports();
                await this.page.waitForTimeout(2000);
            }
        }
    }
    
    if (!dispatchReportsTab) {
        // Debug: Log what tabs are actually available
        const allTabs = await this.page.locator('a, button').allTextContents();
        console.log('[Menu] Available tabs/buttons:', allTabs.filter(text => text.trim().length > 0));
        throw new Error('Dispatch Reports tab not found with any selector after retries');
    }
    
    await dispatchReportsTab.click();
    console.log(`[Menu] Clicked Dispatch Reports tab using selector: ${selectorUsed}`);
    
    // Wait for the tab to load with verification
    await this.page.waitForTimeout(2000);
    
    // Verify we're on the Dispatch Reports page
    await this.page.waitForFunction(() => {
        const bodyText = document.body.textContent || '';
        return bodyText.includes('Dispatch Reports') || 
               bodyText.includes('Create New') ||
               window.location.pathname.includes('dispatch');
    }, { timeout: 10000 });
    
    console.log('[Menu] Dispatch Reports navigation completed');
}

    /**
     * Opens the hamburger menu if it's not already open.
     */
    async openHamburgerMenu() {
        try {
            // Check if hamburger menu is visible first
            await this.hamburgerMenu.waitFor({ state: 'visible', timeout: 10000 });
            
            // Check if the sidenav is already open by checking for the absence of 'hide' class
            const sidenavElement = this.page.locator('div.sidenav');
            const isHidden = await sidenavElement.evaluate(el => el.classList.contains('hide')).catch(() => true);
            
            if (isHidden) {
                console.log('[Menu] Opening hamburger menu...');
                await this.hamburgerMenu.click({ force: true });
                
                // Wait for menu to be visible and not hidden
                await expect(sidenavElement).toBeVisible();
                await expect(sidenavElement).not.toHaveClass('hide');
            } else {
                console.log('[Menu] Hamburger menu already open');
            }
        } catch (error) {
            console.log('[Menu] Error with hamburger menu state check, attempting to click anyway');
            await this.hamburgerMenu.click({ force: true });
        }
    }

    /**
     * Generic method to click a menu item by opening hamburger menu first
     * @param {string} menuName - The name of the menu item
     */
    async clickMenu(menuName) {
        await this.openHamburgerMenu();
        
        const menuMap = {
            'Command': this.commandLink,
            'History': this.historyLink,
            'View': this.viewLink,
            'Sites': this.sitesLink,
            'Metrics': this.metricsLink,
            'Reports': this.reportsLink,
            'Configurations': this.configurationsLink
        };
        
        const menuLocator = menuMap[menuName];
        if (!menuLocator) {
            throw new Error(`No locator defined for menu: ${menuName}`);
        }
        
        await menuLocator.scrollIntoViewIfNeeded();
        await menuLocator.click({ force: true });
    }

    async openCommand() {
        await this.clickMenu('Command');
    }

    async openHistory() {
        await this.clickMenu('History');
    }

    async openView() {
        await this.clickMenu('View');
    }

    async openSites() {
        await this.clickMenu('Sites');
    }

    async openMetrics() {
        await this.clickMenu('Metrics');
    }

    async openReports() {
        await this.clickMenu('Reports');
    }    async openConfigurations() {
        await this.clickMenu('Configurations');
    }

    // ===========================================
    // MAIN NAVIGATION METHODS
    // ===========================================

    /**
     * Main navigation method - maps to specific menu navigation
     * @param {string} menuName - The name of the menu to navigate to
     */
    async navigateToMenu(menuName) {
        console.log(`[MenuPage] Navigating to ${menuName}...`);
        await this.clickMenu(menuName);
    }

    /**
     * Navigate to Command page
     */
    async navigateToCommand() {
        await this.navigateToMenu('Command');
    }

    /**
     * Navigate to Sites page
     */
    async navigateToSites() {
        await this.navigateToMenu('Sites');
    }

    /**
     * Navigate to People page (if exists)
     */
    async navigateToPeople() {
        // Add people navigation if it exists in the system
        console.log('[MenuPage] People navigation not implemented yet');
        throw new Error('People navigation method not implemented');
    }

    /**
     * Navigate to Contacts page (if exists)
     */
    async navigateToContacts() {
        // Add contacts navigation if it exists in the system
        console.log('[MenuPage] Contacts navigation not implemented yet');
        throw new Error('Contacts navigation method not implemented');
    }

    /**
     * Navigates to a specific submenu under Configurations.
     * @param {string} submenuName The text of the submenu item to click.
     */    async navigateToConfigurationSubmenu(submenuName) {
        const selector = this.configurationSubmenuSelectors[submenuName];
        if (!selector) {
            throw new Error(`Selector not found for submenu: ${submenuName}`);
        }
        
        console.log(`[Menu] Starting navigation to Configuration submenu: ${submenuName}`);
        const submenuLocator = this.page.locator(selector);
        
        // Always open the hamburger menu first to ensure we have access to the configurations
        await this.openHamburgerMenu();
        
        // Check if submenu item is already visible
        const isVisible = await submenuLocator.isVisible().catch(() => false);
        
        if (!isVisible) {
            // Submenu is not visible, open the Configurations dropdown first
            console.log(`[Menu] Submenu "${submenuName}" not visible, opening Configurations dropdown...`);
            
            // Click configurations to expand dropdown
            await this.configurationsLink.click({ force: true });
            
            // Wait for dropdown to expand
            await this.page.waitForTimeout(2000);
            
            // Wait for submenu to become visible
            await submenuLocator.waitFor({ state: 'visible', timeout: 10000 });
            console.log(`[Menu] Submenu "${submenuName}" is now visible`);
        }
        
        // Ensure element is in viewport and clickable
        await submenuLocator.scrollIntoViewIfNeeded();
        
        // Wait a bit more to ensure any animations are complete
        await this.page.waitForTimeout(500);
        
        // Click the submenu item
        await submenuLocator.click({ force: true });
        
        // Wait for navigation to complete - check for URL change
        console.log(`[Menu] Clicked submenu item, waiting for navigation to complete...`);
        await this.page.waitForTimeout(2000);
        
        console.log(`[Menu] Successfully navigated to Configuration submenu: ${submenuName}`);
    }async navigateToCommandPage() {
        await this.openCommand();
    }

    /**
     * Navigates to a specific submenu under Reports.
     * @param {string} submenuName The text of the submenu item to click.
     */    async navigateToReportsSubmenu(submenuName) {
        const selector = this.reportsSubmenuSelectors[submenuName];
        if (!selector) {
            throw new Error(`Selector not found for Reports submenu: ${submenuName}`);
        }
        
        console.log(`[Menu] Starting navigation to Reports submenu: ${submenuName}`);
        const submenuLocator = this.page.locator(selector);
        
        // Always open the hamburger menu first to ensure we have access to the reports
        await this.openHamburgerMenu();
        
        // Check if submenu item is already visible
        const isVisible = await submenuLocator.isVisible().catch(() => false);
        
        if (!isVisible) {
            // Submenu is not visible, open the Reports dropdown first
            console.log(`[Menu] Reports submenu "${submenuName}" not visible, opening Reports dropdown...`);
            await this.reportsLink.click({ force: true });
            
            // Wait for submenu to appear
            await this.page.waitForTimeout(1000);
            
            // Verify the submenu item is now visible
            await submenuLocator.waitFor({ state: 'visible', timeout: 10000 });
        }
        
        // Ensure element is in viewport and clickable
        await submenuLocator.scrollIntoViewIfNeeded();
        
        // Wait a bit more to ensure any animations are complete
        await this.page.waitForTimeout(500);
        
        // Click the submenu item
        await submenuLocator.click({ force: true });
        
        // Wait for navigation to complete
        console.log(`[Menu] Clicked submenu item, waiting for navigation to complete...`);
        await this.page.waitForTimeout(2000);
        
        console.log(`[Menu] Successfully navigated to Reports submenu: ${submenuName}`);
    }/**
     * Navigates to Alert Reports submenu under Reports.
     */
    async navigateToAlertReports() {
        console.log('[Menu] Navigating to Alert Reports...');
        await this.navigateToReportsSubmenu('Alert Reports');
        console.log('[Menu] Alert Reports navigation completed');
    }
}
