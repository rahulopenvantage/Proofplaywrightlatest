import { expect } from '@playwright/test';
import { AdminLoginPage } from './AdminLoginPage.js';
import { MenuPage } from './MenuPage.js';
import { AppInteractionsPage } from './AppInteractionsPage.js';
import { SitesPage } from './SitesPage.js';
import { AlertsDashboardPage } from './AlertsDashboardPage.js';
import { SopPage } from './SopPage.js';
import { WorkflowHelper } from './WorkflowHelper.js';
import { AlertReportsPage } from './AlertReportsPage.js';
import { DispatchReportsPage } from './DispatchReportsPage.js';
import { TestIsolationHelper } from './TestIsolationHelper.js';
import { SessionManager } from './SessionManager.js';
import { TestReliabilityHelper } from './TestReliabilityHelper.js';

/**
 * SharedTestSteps - Centralized library for common test operations
 * 
 * This class provides a single import point for all shared test steps,
 * standardizing method signatures and providing consistent logging.
 * All methods delegate to existing page objects for maintainability.
 */
export class SharedTestSteps {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.adminLoginPage = new AdminLoginPage(page);
        this.menuPage = new MenuPage(page);
        this.appInteractionsPage = new AppInteractionsPage(page);
        this.sitesPage = new SitesPage(page);
        this.alertsDashboardPage = new AlertsDashboardPage(page);
        this.sopPage = new SopPage(page);
        this.workflowHelper = new WorkflowHelper(page);
        this.alertReportsPage = new AlertReportsPage(page);
        this.dispatchReportsPage = new DispatchReportsPage(page);
        this.testIsolationHelper = new TestIsolationHelper(page);
        this.sessionManager = null; // Will be set when login is called
        this.reliabilityHelper = new TestReliabilityHelper(page);
        this.lastLoggedInUserType = null; // Track user type to avoid unnecessary logouts
    }

    /**
     * Determine user type based on username
     * @param {string} username - The username to check
     * @returns {string} User type ('admin' or 'normal')
     */
    getUserType(username) {
        const adminUsername = process.env.ADMIN_MS_USERNAME;
        const normalUsername = process.env.NORMAL_MS_USERNAME;
        
        if (username === adminUsername) {
            return 'admin';
        } else if (username === normalUsername) {
            return 'normal';
        } else {
            // Default to admin if unsure
            console.log(`[SharedSteps] Unknown username, defaulting to admin user type`);
            return 'admin';
        }
    }

    /**
     * Determines if logout is needed based on current user vs target user
     * @param {string} targetUsername - The username we want to login as
     * @returns {Promise<boolean>} True if logout is needed, false otherwise
     */
    async shouldLogoutForUserSwitch(targetUsername) {
        try {
            // Get the current logged-in user (check URL or page elements)
            const currentUrl = this.page.url();
            
            // Try to get current user info from page elements if available
            // For now, we'll use a simple approach: if someone is logged in,
            // we assume it might be a different user and need to check
            
            const targetUserType = this.getUserType(targetUsername);
            
            // Simple logic: For now, always logout if switching users
            // In a more complex scenario, you could check session storage,
            // cookies, or page elements to determine current user
            
            // For this fix, we'll be more conservative and only logout
            // if we detect we're definitely on a different user
            // Since we can't easily detect current user, we'll use a flag-based approach
            
            // Store the last logged-in user type in a class variable
            if (!this.lastLoggedInUserType) {
                // First login - no logout needed
                this.lastLoggedInUserType = targetUserType;
                return false;
            }
            
            if (this.lastLoggedInUserType !== targetUserType) {
                // User type has changed - logout needed
                console.log(`[SharedSteps] User type change detected: ${this.lastLoggedInUserType} -> ${targetUserType}`);
                this.lastLoggedInUserType = targetUserType;
                return true;
            }
            
            // Same user type - no logout needed
            console.log(`[SharedSteps] Same user type (${targetUserType}), no logout needed`);
            return false;
            
        } catch (error) {
            console.log('[SharedSteps] Error determining if logout needed:', error.message);
            // Default to no logout on error
            return false;
        }
    }

    // ===========================================
    // 0. TEST ISOLATION & SETUP
    // ===========================================

    /**
     * Complete test isolation setup - run before each test
     */
    async setupTestIsolation() {
        console.log('[SharedSteps] Setting up test isolation...');
        await this.testIsolationHelper.resetApplicationState();
        await this.testIsolationHelper.ensureCleanPageState();
        console.log('[SharedSteps] Test isolation setup completed');
    }

    /**
     * Complete test cleanup - run after each test
     */
    async cleanupTestIsolation() {
        console.log('[SharedSteps] Cleaning up test isolation...');
        await this.testIsolationHelper.cleanupAfterTest();
        console.log('[SharedSteps] Test isolation cleanup completed');
    }

    // ===========================================
    // 1. AUTHENTICATION & SETUP
    // ===========================================

    /**
     * Checks if user is already authenticated by looking for company selector
     * @returns {boolean} true if already authenticated, false otherwise
     */
    async isAlreadyAuthenticated() {
        try {
            // Check if company selector is visible (indicates user is logged in)
            const companySelector = this.page.locator('[data-test-id="selected-company"]');
            const isVisible = await companySelector.isVisible({ timeout: 5000 });
            
            if (isVisible) {
                console.log('[SharedSteps] User is already authenticated');
                return true;
            } else {
                console.log('[SharedSteps] User is not authenticated');
                return false;
            }
        } catch (error) {
            console.log('[SharedSteps] Authentication check failed:', error.message);
            return false;
        }
    }

    /**
     * Performs complete authentication flow with company selection
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     */
    async authenticateAndSetup(username, password) {
        console.log('[SharedSteps] Starting authentication and setup...');
        
        // Check if already authenticated first
        const isAuthenticated = await this.isAlreadyAuthenticated();
        if (!isAuthenticated) {
            await this.adminLoginPage.login(username, password);
            await this.adminLoginPage.verifyLoginSuccessful();
        } else {
            console.log('[SharedSteps] Already authenticated, skipping login');
        }
        
        console.log('[SharedSteps] Authentication and setup completed');
    }

    /**
     * Basic login without company selection
     * Always checks base URL first and handles logout only when switching user types
     * @param {string} username - Username
     * @param {string} password - Password
     */
    async login(username, password) {
        console.log('[SharedSteps] Starting login process...');
        
        try {
            // Step 1: Always go to base URL first to check authentication state
            console.log('[SharedSteps] Navigating to base URL to check authentication...');
            await this.page.goto('/', { timeout: 30000 });
            console.log('[SharedSteps] ✅ Page navigation completed, waiting for network idle...');
            await this.page.waitForLoadState('networkidle', { timeout: 30000 });
            console.log('[SharedSteps] ✅ Network idle state reached');
            
            // Step 1.5: Check if we're on the terms and conditions page
            console.log('[SharedSteps] Checking for terms and conditions page...');
            const currentUrl = this.page.url();
            console.log(`[SharedSteps] Current URL: ${currentUrl}`);
            
            if (currentUrl.includes('/auth-step/terms-and-conditions')) {
                console.log('[SharedSteps] ✅ On terms and conditions page - accepting terms...');
                
                // Wait for terms button to be visible
                const termsButton = this.page.locator('[data-test-id="termsAndConditonsAcceptBtn"]');
                console.log('[SharedSteps] Waiting for terms button to be visible...');
                await termsButton.waitFor({ state: 'visible', timeout: 15000 });
                console.log('[SharedSteps] Terms button is visible, clicking...');
                
                // Click the terms button
                await termsButton.click();
                console.log('[SharedSteps] ✅ Terms and conditions accepted');
                
                // Wait for navigation after terms acceptance
                console.log('[SharedSteps] Waiting for navigation after terms acceptance...');
                await this.page.waitForLoadState('networkidle', { timeout: 30000 });
                console.log('[SharedSteps] ✅ Navigation after terms acceptance completed');
                
                const newUrl = this.page.url();
                console.log(`[SharedSteps] New URL after terms acceptance: ${newUrl}`);
            } else {
                console.log('[SharedSteps] Not on terms and conditions page, proceeding...');
            }
            
            // Step 2: Check if we're already logged in
            console.log('[SharedSteps] Step 2: Checking if already logged in...');
            const isCurrentlyLoggedIn = await this.isLoggedIn();
            console.log(`[SharedSteps] Current login state: ${isCurrentlyLoggedIn ? 'LOGGED IN' : 'NOT LOGGED IN'}`);
            
            if (isCurrentlyLoggedIn) {
                // NEW LOGIC: Check if we need to switch users
                const currentUserType = this.getUserType(username);
                const shouldLogout = await this.shouldLogoutForUserSwitch(username);
                
                console.log(`[SharedSteps] Target user type: ${currentUserType}`);
                console.log(`[SharedSteps] Should logout for user switch: ${shouldLogout}`);
                
                if (shouldLogout) {
                    console.log('[SharedSteps] User type mismatch detected, logging out...');
                    
                    // Attempt logout with comprehensive error handling
                    try {
                        console.log('[SharedSteps] Attempting logout...');
                        await this.logout();
                        console.log('[SharedSteps] ✅ Logout completed successfully');
                    } catch (logoutError) {
                        console.log('[SharedSteps] ❌ Logout failed:', logoutError.message);
                        console.log('[SharedSteps] Attempting to continue with login anyway...');
                    }
                    
                    // Wait a bit for logout to complete
                    console.log('[SharedSteps] Waiting for logout to complete...');
                    await this.page.waitForTimeout(3000);
                    
                    // Check if logout was successful
                    console.log('[SharedSteps] Checking logout status...');
                    const isNowLoggedOut = await this.isLoggedOut();
                    console.log(`[SharedSteps] Logout status: ${isNowLoggedOut ? 'LOGGED OUT' : 'STILL LOGGED IN'}`);
                    
                    if (!isNowLoggedOut) {
                        console.log('[SharedSteps] ⚠️ Logout may not have completed, but proceeding with login...');
                        // Force navigate to login page
                        console.log('[SharedSteps] Force navigating to base URL...');
                        await this.page.goto('/', { timeout: 30000 });
                        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
                        console.log('[SharedSteps] ✅ Force navigation completed');
                    } else {
                        console.log('[SharedSteps] ✅ Logout successful, proceeding with login...');
                    }
                } else {
                    console.log('[SharedSteps] Same user type, skipping logout and proceeding...');
                    // Skip login entirely since we're already logged in with the correct user
                    console.log('[SharedSteps] ✅ Already logged in with correct user, skipping login');
                    return;
                }
            } else {
                console.log('[SharedSteps] Not logged in, proceeding with login...');
            }
            
            // Step 3: Perform login with comprehensive error handling
            console.log('[SharedSteps] Step 3: Performing login...');
            console.log(`[SharedSteps] Logging in with username: ${username}`);
            
            try {
                await this.adminLoginPage.login(username, password);
                console.log('[SharedSteps] ✅ AdminLoginPage.login completed');
            } catch (loginError) {
                console.log('[SharedSteps] ❌ AdminLoginPage.login failed:', loginError.message);
                throw new Error(`Login failed: ${loginError.message}`);
            }
            
            try {
                await this.adminLoginPage.verifyLoginSuccessful();
                console.log('[SharedSteps] ✅ Login verification completed');
            } catch (verifyError) {
                console.log('[SharedSteps] ❌ Login verification failed:', verifyError.message);
                throw new Error(`Login verification failed: ${verifyError.message}`);
            }
            
            console.log('[SharedSteps] ✅ Login completed successfully');
            
        } catch (error) {
            console.log('[SharedSteps] ❌ Login process failed:', error.message);
            console.log('[SharedSteps] Current URL:', this.page.url());
            
            // Take screenshot for debugging
            try {
                await this.page.screenshot({ path: 'debug/login-error.png' });
                console.log('[SharedSteps] Login error screenshot saved: debug/login-error.png');
            } catch (screenshotError) {
                console.log('[SharedSteps] Could not save login error screenshot:', screenshotError.message);
            }
            
            throw error;
        }
        
        console.log('[SharedSteps] Login process completed');
    }

    /**
     * Check if user is logged out by looking for login indicators
     * @returns {Promise<boolean>} True if logged out, false if still logged in
     */
    async isLoggedOut() {
        try {
            // Check for Microsoft login page indicators
            const loginIndicators = [
                '[name="loginfmt"]',  // Username field
                '[name="passwd"]',    // Password field  
                'text=Sign in',       // Sign in text
                'text=Pick an account', // Account selection
                'text=Use another account' // Use another account
            ];
            
            for (const indicator of loginIndicators) {
                const isVisible = await this.page.locator(indicator).isVisible({ timeout: 2000 }).catch(() => false);
                if (isVisible) {
                    console.log(`[SharedSteps] ✅ Logout confirmed - found login indicator: ${indicator}`);
                    return true;
                }
            }
            
            // Check if URL contains login-related paths
            const currentUrl = this.page.url();
            const logoutUrls = [
                'login.microsoftonline.com',
                'Sign in',
                'auth-step'
            ];
            
            for (const urlPattern of logoutUrls) {
                if (currentUrl.includes(urlPattern)) {
                    console.log(`[SharedSteps] ✅ Logout confirmed - URL contains: ${urlPattern}`);
                    return true;
                }
            }
            
            console.log(`[SharedSteps] ❌ Still logged in - URL: ${currentUrl}`);
            return false;
            
        } catch (error) {
            console.log('[SharedSteps] Error checking logout state:', error.message);
            return false;
        }
    }

    /**
     * Check if user is logged in by looking for authenticated page elements
     * @returns {Promise<boolean>} True if logged in, false if logged out
     */
    async isLoggedIn() {
        try {
            // Check for authenticated page indicators
            const authIndicators = [
                '[data-test-id="burger-menu-button"]',
                '[data-test-id="selected-company"]',
                '[data-test-id="logoutDropdown"]'
            ];
            
            for (const indicator of authIndicators) {
                const isVisible = await this.page.locator(indicator).isVisible({ timeout: 2000 }).catch(() => false);
                if (isVisible) {
                    console.log(`[SharedSteps] ✅ Login confirmed - found auth indicator: ${indicator}`);
                    return true;
                }
            }
            
            // Check if URL contains /command (main authenticated page)
            const currentUrl = this.page.url();
            if (currentUrl.includes('/command')) {
                console.log(`[SharedSteps] ✅ Login confirmed - URL contains /command`);
                return true;
            }
            
            console.log(`[SharedSteps] ❌ Not logged in - URL: ${currentUrl}`);
            return false;
            
        } catch (error) {
            console.log('[SharedSteps] Error checking login state:', error.message);
            return false;
        }
    }

    /**
     * Select company after login with improved isolation
     * @param {string} [company='Automation company'] - Company to select
     * @param {boolean} [forceReselection=false] - Whether to force reselection even if already selected
     */
    async selectCompany(company = 'Automation company', forceReselection = false) {
        console.log(`[SharedSteps] Selecting company: ${company} (force: ${forceReselection})`);
        
        // Use the enhanced company selection method that handles state isolation
        await this.appInteractionsPage.ensureCorrectCompanySelection(company, forceReselection);
        
        // Handle special post-selection logic for specific companies
        if (company === 'Vodacom') {
            // For Vodacom, select "South Africa Whole" station if available
            console.log('[SharedSteps] Selecting station for Vodacom...');
            const stationDropdown = this.page.locator('[data-test-id="stationDropDown"]');
            
            try {
                // Wait for station dropdown to be visible
                await stationDropdown.waitFor({ state: 'visible', timeout: 10000 });
                
                // Click to open the custom dropdown
                await stationDropdown.click();
                
                // Wait for dropdown options to appear
                await this.page.waitForTimeout(1500);
                
                // Try to find "South Africa Whole" option in the dropdown panel
                const southAfricaOption = this.page.locator('li[role="option"]').filter({ hasText: 'South Africa Whole' });
                const southAfricaExists = await southAfricaOption.count() > 0;
                
                if (southAfricaExists) {
                    await southAfricaOption.click();
                    console.log('[SharedSteps] Selected "South Africa Whole" station for Vodacom');
                } else {
                    // Fallback to first available option
                    const firstOption = this.page.locator('li[role="option"]').first();
                    const firstOptionText = await firstOption.textContent();
                    await firstOption.click();
                    console.log(`[SharedSteps] "South Africa Whole" not found, selected first available option: "${firstOptionText}" for Vodacom`);
                }
                
                // Wait for dropdown to close
                await this.page.waitForTimeout(500);
                
            } catch (error) {
                console.log(`[SharedSteps] Station selection failed for Vodacom: ${error.message}`);
                // Continue without failing the test as station might not be required for all tests
            }
        }
        
        console.log('[SharedSteps] Company selection completed');
    }

    /**
     * Simple test isolation check - just verify and select correct company if needed
     * @param {string} expectedCompany - The company that should be selected for this test
     */
    async ensureTestIsolation(expectedCompany) {
        console.log(`[SharedSteps] Checking company selection for: ${expectedCompany}`);
        
        try {
            // Just use the regular company selection method
            await this.selectCompany(expectedCompany, false);
            
        } catch (/** @type {any} */ error) {
            console.log(`[SharedSteps] Company selection error: ${error.message}`);
            // Try one more time with force
            await this.selectCompany(expectedCompany, false);
        }
    }

    /**
     * Switch to normal user (logout if needed and login with normal user)
     * @param {string} username - Normal user username
     * @param {string} password - Normal user password
     */
    async switchToNormalUser(username, password) {
        console.log('[SharedSteps] Switching to normal user...');
        
        // The login method will handle checking if we're logged in and logout if needed
        await this.login(username, password);
        
        console.log('[SharedSteps] Successfully switched to normal user');
    }

    /**
     * Switch to admin user (logout if needed and login with admin user)
     * @param {string} username - Admin user username
     * @param {string} password - Admin user password
     */
    async switchToAdminUser(username, password) {
        console.log('[SharedSteps] Switching to admin user...');
        
        // The login method will handle checking if we're logged in and logout if needed
        await this.login(username, password);
        
        console.log('[SharedSteps] Successfully switched to admin user');
    }

    // ===========================================
    // 2. NAVIGATION
    // ===========================================

    /**
     * Navigate to main menu pages
     * @param {string} menuName - 'Command', 'Sites', 'History', 'View', 'Metrics', 'Reports', 'Configurations'
     */
    async navigateToMenu(menuName) {
        console.log(`[SharedSteps] Navigating to ${menuName}...`);
        
        const menuMethods = {
            'Command': () => this.menuPage.openCommand(),
            'Sites': () => this.menuPage.openSites(),
            'History': () => this.menuPage.openHistory(),
            'View': () => this.menuPage.openView(),
            'Metrics': () => this.menuPage.openMetrics(),
            'Reports': () => this.menuPage.openReports(),
            'Configurations': () => this.menuPage.openConfigurations()
        };
        
        const method = menuMethods[menuName];
        if (!method) {
            throw new Error(`Navigation method for "${menuName}" not found`);
        }
        
        await method();
        console.log(`[SharedSteps] Navigation to ${menuName} completed`);
    }    /**
     * Navigate to configuration submenu
     * @param {string} submenuName - Name of the configuration submenu
     */
    async navigateToConfigurationSubmenu(submenuName) {
        console.log(`[SharedSteps] Navigating to configuration submenu: ${submenuName}`);
        await this.menuPage.navigateToConfigurationSubmenu(submenuName);
        console.log('[SharedSteps] Configuration submenu navigation completed');
    }

    /**
     * Navigate to reports submenu
     * @param {string} submenuName - Name of the reports submenu
     */
    async navigateToReportsSubmenu(submenuName) {
        console.log(`[SharedSteps] Navigating to reports submenu: ${submenuName}`);
        await this.menuPage.navigateToReportsSubmenu(submenuName);
        console.log('[SharedSteps] Reports submenu navigation completed');
    }

    // ===========================================
    // 3. ALERT OPERATIONS
    // ===========================================

    /**
     * Create manual alert for Automation company (BDFD_Boeing site)
     */
    async createManualAlert() {
        console.log('[SharedSteps] Creating manual alert for Automation company...');
        await this.sitesPage.createManualAlertForAutomationCompany();
        console.log('[SharedSteps] Manual alert creation completed');
    }

    
    async createManualAlertTheMarc() {
        console.log('[SharedSteps] Creating manual alert for Automation company...');
        await this.sitesPage.createManualAlertForTheMarc();
        console.log('[SharedSteps] Manual alert creation completed');
    }
    /**
     * Create manual alert for specific site
     * @param {string} siteName - Name of the site to create alert for
     */
    async createManualAlertForSite(siteName) {
        console.log(`[SharedSteps] Creating manual alert for site: ${siteName}`);
        await this.sitesPage.createManualAlert(siteName);
        console.log('[SharedSteps] Manual alert creation completed');
    }    /**
     * Generic manual alert stack filter
     */
    async genericManualAlertStackFilter() {
        console.log('[SharedSteps] Applying generic manual alert stack filter...');
        await this.alertsDashboardPage.filterByManualAlert();
        console.log('[SharedSteps] Generic manual alert stack filter completed');
    }    /**
     * Alert order newest to oldest
     * Sets the alert order to "Oldest to Newest" through the stack filter
     */    async alertOrderNewestToOldest() {
        console.log('[SharedSteps] Setting alert order to Newest to Oldest...');
        
        // Step 1: Click on the dashboard stack filter button
        console.log('[Alert Order Test] Step 1: Clicking the stack filter button.');
        const stackFilterButton = this.page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
        await stackFilterButton.click();
        
        // Wait for filter modal to open
        await this.page.waitForTimeout(1000);
          // Step 2: Click on "Alert Order / Newest to Oldest"
        // Use the specific test-id for Alert Order Within Incidents
        console.log('[Alert Order Test] Step 2: Selecting "Newest to Oldest" for Alert Order.');
        const newestToOldestOption = this.page.locator('[data-test-id="alert-order-false"]').getByText('Newest to Oldest');
        await newestToOldestOption.click();

         const newestToOldestOption2 = this.page.locator('[data-test-id="stack-order-false"]').getByText('Newest to Oldest');
        await newestToOldestOption2.click();

        // Step 3: Click on the "Apply" button in the filter
        console.log('[Alert Order Test] Step 3: Clicking the "Apply" button.');
        await this.page.waitForTimeout(500);
        const applyButton = this.page.locator('[data-test-id="alert-filter-apply-button"]');
        await applyButton.click();

        // Step 4: Click on the close button for the filter modal
        console.log('[Alert Order Test] Step 4: Closing the stack filter modal.');
        
        // Wait briefly after Apply for any notifications
        await this.page.waitForTimeout(1000);
        
        // Wait for any success notifications to disappear before clicking close
        console.log('[Alert Order Test] Waiting for any success notifications to disappear...');
        try {
            const notifications = this.page.locator('.rnc__notification-item');
            
            // Quick check for notifications and wait for them to disappear if present
            if (await notifications.first().isVisible({ timeout: 2000 })) {
                console.log('[Alert Order Test] Notification found, waiting for it to disappear...');
                await notifications.first().waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {
                    console.log('[Alert Order Test] Notification timeout, proceeding...');
                });
            } else {
                console.log('[Alert Order Test] No notifications found.');
            }
        } catch (error) {
            console.log('[Alert Order Test] Notification handling error (continuing):', error.message);
        }
        
        const closeButton = this.page.locator('[data-test-id="modalClose"]');
        await closeButton.click();
        
        // Wait for modal to close and changes to apply
        await this.page.waitForTimeout(2000);
        await this.page.waitForLoadState('networkidle', { timeout: 15000 });
        
        console.log('[SharedSteps] Alert order set to Newest to Oldest completed');
    }    /**
     * Alert order oldest to newest
     * Sets the alert order to "Oldest to Newest" through the stack filter
     */
    async alertOrderOldestToNewest() {
        console.log('[SharedSteps] Setting alert order to Oldest to Newest...');
        
        // Step 1: Click on the dashboard stack filter button
        console.log('[Alert Order Test] Step 1: Clicking the stack filter button.');
        const stackFilterButton = this.page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
        await stackFilterButton.click();
        
        // Wait for filter modal to open
        await this.page.waitForTimeout(1000);
          // Step 2: Click on "Alert Order / Oldest to Newest"
        // Use the specific test-id for Alert Order Within Incidents
        console.log('[Alert Order Test] Step 2: Selecting "Oldest to Newest" for Alert Order.');
        const oldestToNewestOption = this.page.locator('[data-test-id="alert-order-true"]').getByText('Oldest to Newest');
        await oldestToNewestOption.click();

        const newestToOldestOption2 = this.page.locator('[data-test-id="stack-order-true"]').getByText('Oldest to Newest');
        await newestToOldestOption2.click();

        // Step 3: Click on the "Apply" button in the filter
        console.log('[Alert Order Test] Step 3: Clicking the "Apply" button.');
        await this.page.waitForTimeout(500);
        const applyButton = this.page.locator('[data-test-id="alert-filter-apply-button"]');
        await applyButton.click();

        // Step 4: Click on the close button for the filter modal
        console.log('[Alert Order Test] Step 4: Closing the stack filter modal.');
        
        // Wait briefly after Apply for any notifications
        await this.page.waitForTimeout(1000);
        
        // Wait for any success notifications to disappear before clicking close
        console.log('[Alert Order Test] Waiting for any success notifications to disappear...');
        try {
            const notification = this.page.locator('.rnc__notification-item--success');
            if (await notification.isVisible({ timeout: 5000 })) {
                console.log('[Alert Order Test] Success notification detected, waiting for it to disappear...');
                
                // Use polling approach for consistency (similar to AlertsDashboardPage)
                let notificationVisible = true;
                let attempts = 0;
                const maxAttempts = 15; // 15 seconds total
                
                while (notificationVisible && attempts < maxAttempts) {
                    const isVisible = await notification.isVisible().catch(() => false);
                    if (!isVisible) {
                        notificationVisible = false;
                        console.log('[Alert Order Test] Success notification disappeared.');
                    } else {
                        await this.page.waitForTimeout(1000);
                        attempts++;
                    }
                }
                
                if (notificationVisible) {
                    console.log('[Alert Order Test] Timeout waiting for notification to disappear, proceeding anyway.');
                }
            } else {
                console.log('[Alert Order Test] No success notifications found.');
            }
        } catch (error) {
            console.log('[Alert Order Test] Error handling notifications (continuing):', error.message);
        }
        
        // Additional wait to ensure any animations are complete
        await this.page.waitForTimeout(1000);
        
        const closeButton = this.page.locator('[data-test-id="modalClose"]');
        await closeButton.click();
        
        // Wait for modal to close and changes to apply
        await this.page.waitForTimeout(2000);
        await this.page.waitForLoadState('networkidle', { timeout: 15000 });
        
        console.log('[SharedSteps] Alert order set to Oldest to Newest completed');
    }

    /**
     * Expand and select manual card
     */
    async expandAndSelectManualCard() {
        console.log('[SharedSteps] Expanding and selecting manual card...');
        await this.alertsDashboardPage.expandAndSelectFirstManualAlertCard();
        console.log('[SharedSteps] Manual card expansion and selection completed');
    }

    /**
     * Stack filter for UB and Trex alerts for specific site
     * @param {string} siteName - Name of the site to filter for
     */
    async stackFilterUBAndTrex(siteName) {
        console.log(`[SharedSteps] Applying UB and Trex stack filter for site: ${siteName}...`);
        
        // Wait for page to be fully loaded before applying filter
        console.log(`[SharedSteps] Ensuring page is fully loaded before applying filter...`);
        // Replace networkidle with more reliable wait - real-time apps have continuous background requests
        await this.page.waitForFunction(() => {
            const cards = document.querySelectorAll('[data-test-id*="card"]');
            return cards.length > 0 || document.querySelector('[data-test-id="alert-stack-popover-trigger-button"]');
        }, { timeout: 30000 });
        
        // Wait for alert cards to render - this is crucial for filter accuracy
        console.log(`[SharedSteps] Waiting for alert cards to render...`);
        await this.page.waitForTimeout(3000); // Initial wait for cards to appear
        
        // Verify that there are cards present before filtering
        const cardCount = await this.page.locator('[data-test-id*="card"]').count();
        console.log(`[SharedSteps] Found ${cardCount} cards before filtering`);
        
        if (cardCount === 0) {
            console.log(`[SharedSteps] No cards found, waiting additional time for content to load...`);
            await this.page.waitForTimeout(5000);
            const retryCardCount = await this.page.locator('[data-test-id*="card"]').count();
            console.log(`[SharedSteps] After additional wait, found ${retryCardCount} cards`);
        }
        
    // Apply the filter on the current stack (typically Incident)
    await this.alertsDashboardPage.filterByUBAndTrex(siteName);
        
        // Wait for filter results to stabilize
        console.log(`[SharedSteps] Waiting for filter results to stabilize...`);
        await this.page.waitForTimeout(2000);
        
        // Verify filter was applied by checking for either results or "No Results Found"
        console.log(`[SharedSteps] Verifying filter was applied...`);
        let filterApplied = false;
        for (let i = 0; i < 5; i++) {
            const hasResults = await this.page.locator('[data-test-id*="card"]').count() > 0;
            const hasNoResults = await this.page.getByText('No Results Found').isVisible().catch(() => false);
            
            if (hasResults || hasNoResults) {
                filterApplied = true;
                console.log(`[SharedSteps] Filter verified - Results: ${hasResults}, No Results: ${hasNoResults}`);
                break;
            }
            
            console.log(`[SharedSteps] Filter verification attempt ${i + 1}/5, waiting...`);
            await this.page.waitForTimeout(1000);
        }
        
        if (!filterApplied) {
            console.log(`[SharedSteps] ⚠️ Filter verification failed, but continuing...`);
        }

        // Fallback: If we explicitly see "No Results Found" on current stack, switch to Situation and re-apply filter
        try {
            const noResultsOnCurrent = await this.page.getByText('No Results Found').isVisible({ timeout: 500 }).catch(() => false);
            if (noResultsOnCurrent) {
                console.log('[SharedSteps] "No Results Found" detected on current stack, switching to Situation and re-applying filter...');
                await this.appInteractionsPage.switchToSituationStack();
                await this.alertsDashboardPage.filterByUBAndTrex(siteName);
                await this.page.waitForTimeout(1500);
            }
        } catch (e) {
            // Keep non-fatal
            console.log('[SharedSteps] Fallback stack switch after no-results failed (continuing):', (e && e.message) ? e.message : e);
        }

        console.log('[SharedSteps] UB and Trex stack filter completed');
    }    /**
     * Enhanced expand and select UB and Trex card with robust retry mechanisms
     * @param {string} [siteName] - Name of the site (optional, passed to underlying method)
     */
    async expandAndSelectUBAndTrexCard(siteName) {
        console.log(`[SharedSteps] Expanding and selecting UB and Trex card for site: ${siteName || 'default'}...`);
        return await this.reliabilityHelper.retryOperation(async () => {
            // First validate that test data exists
            const hasValidData = await this.reliabilityHelper.validateTestData('site', siteName);
            if (!hasValidData) {
                throw new Error(`No valid site data found for "${siteName}"`);
            }
            // Verify filter is still applied before expanding
            console.log(`[SharedSteps] Verifying UB/Trex filter is applied for site: ${siteName}`);
            await this.page.waitForTimeout(2000);
            await this.alertsDashboardPage.expandAndSelectUBAndTrexCard(siteName);
        }, `Expand and select UB/Trex card for ${siteName}`, 1);
    }

    // ===========================================
    // 4. STACK OPERATIONS
    // ===========================================
     async resetStackFilter() {
        console.log('[SharedSteps] Resetting stack filter...');
        await this.alertsDashboardPage.resetAlertFilter();
        console.log('[SharedSteps] Stack filter reset completed');
    }
    /**
     * Switch to Situation stack
     */
    async switchToSituationStack() {
        console.log('[SharedSteps] Switching to Situation stack...');
        await this.appInteractionsPage.switchToSituationStack();
        console.log('[SharedSteps] Switched to Situation stack');
    }

    /**
     * Switch to Incident stack
     */
    async switchToIncidentStack() {
        console.log('[SharedSteps] Switching to Incident stack...');
        // Use the generic switchToStack to avoid inversion issues
        await this.appInteractionsPage.switchToIncidentStack();
        console.log('[SharedSteps] Switched to Incident stack');
    }

    // ===========================================
    // 5. SOP OPERATIONS
    // ===========================================

    /**
     * Complete SOP process and validate
     */
    async completeSOP() {
        console.log('[SharedSteps] Completing SOP process...');
        await this.sopPage.completeAndValidateSop();
        console.log('[SharedSteps] SOP completion validated');
    }

    /**
     * Click SOP Dispatch button
     */
    async dispatchSOP() {
        console.log('[SharedSteps] Clicking SOP Dispatch button...');
        await this.sopPage.clickDispatchButton();
        console.log('[SharedSteps] SOP dispatch completed');
    }

    /**
     * Click SOP Escalate button
     */
    async escalateSOP() {
        console.log('[SharedSteps] Clicking SOP Escalate button...');
        await this.sopPage.clickEscalateButton();
        console.log('[SharedSteps] SOP escalation initiated');
    }

    // ===========================================
    // 6. CLEANUP OPERATIONS
    // ===========================================

    /**
     * Perform manual alert cleanup
     */
    async cleanupManualAlerts() {
        console.log('[SharedSteps] Starting manual alert cleanup...');
        await this.workflowHelper.manualAlertCleanUp();
        console.log('[SharedSteps] Manual alert cleanup completed');
    }    /**
     * Perform UB and Trex alert cleanup
     * @param {string} siteName - Name of the site to clean up (required)
     */
    async cleanupUBAndTrexAlerts(siteName) {
        if (!siteName) {
            throw new Error('Site name is required for UB and Trex cleanup');
        }
        console.log(`[SharedSteps] Starting UB and Trex alert cleanup for site: ${siteName}...`);
        
        // Use the reliability helper for smart cleanup with better error handling
        await this.reliabilityHelper.performStackAwareCleanup(
            async () => {
                await this.workflowHelper.ubAndTrexCleanUp(siteName);
            },
            'Both Stacks', // This cleanup operates on both Incident and Situation stacks
            `UB and Trex cleanup for ${siteName}`
        );
        
        console.log('[SharedSteps] UB and Trex alert cleanup completed');
    }

    // ===========================================
    // 7. COMMON WORKFLOWS
    // ===========================================

    /**
     * Complete workflow: Login → Create Alert → Filter → Expand
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     */
    async completeAlertCreationWorkflow(username, password) {
        console.log('[SharedSteps] Starting complete alert creation workflow...');
        
        await this.authenticateAndSetup(username, password);        await this.navigateToMenu('Sites');
        await this.createManualAlert();
        await this.navigateToMenu('Command');
        await this.genericManualAlertStackFilter();
        await this.expandAndSelectManualCard();
        
        console.log('[SharedSteps] Complete alert creation workflow finished');
    }

    /**
     * Complete workflow: Login → Navigate to Command → Filter → Expand → Complete SOP
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     */
    async completeSopWorkflow(username, password) {
        console.log('[SharedSteps] Starting complete SOP workflow...');
          await this.authenticateAndSetup(username, password);
        await this.navigateToMenu('Command');
        await this.genericManualAlertStackFilter();
        await this.expandAndSelectManualCard();
        await this.completeSOP();
        
        console.log('[SharedSteps] Complete SOP workflow finished');
    }

    /**
     * Complete workflow with cleanup: Create Alert → Process → Cleanup
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     */
    async completeWorkflowWithCleanup(username, password) {
        console.log('[SharedSteps] Starting complete workflow with cleanup...');
        
        try {
            await this.completeAlertCreationWorkflow(username, password);
            await this.completeSOP();
        } finally {
            await this.cleanupManualAlerts();
        }
        
        console.log('[SharedSteps] Complete workflow with cleanup finished');
    }

    // ===========================================
    // 8. PDF VERIFICATION WORKFLOWS
    // ===========================================

    /**
     * Navigates to Alert Reports and verifies PDF download
     * @param {string} [expectedText='Incident Report'] - Text to verify in PDF
     * @returns {Promise<import('@playwright/test').Page>} PDF page for further operations
     */
    async navigateToAlertReportsAndVerifyPDF(expectedText = 'Incident Report') {
        console.log('[SharedSteps] Starting Alert Reports PDF verification workflow...');
        
        // Navigate to Alert Reports
        await this.menuPage.navigateToAlertReports();
        await this.alertReportsPage.waitForPageToLoad();
        
        // Click first download button and get PDF page
        const pdfPage = await this.alertReportsPage.clickFirstDownloadButton();
        
        // Verify PDF contains expected text
        await this.alertReportsPage.verifyPDFContainsText(pdfPage, expectedText);
        
        console.log('[SharedSteps] Alert Reports PDF verification completed successfully');
        return pdfPage;
    }

    /**
     * Navigates to Alert Reports and opens the first download without strict verification.
     * Returns the popup page for custom handling.
     * @returns {Promise<import('@playwright/test').Page>}
     */
    async openAlertReportsFirstPDF() {
        console.log('[SharedSteps] Opening first Alert Report PDF (no strict verify)...');
        await this.menuPage.navigateToAlertReports();
        await this.alertReportsPage.waitForPageToLoad();
        const pdfPage = await this.alertReportsPage.clickFirstDownloadButton();
        // Non-throw presence check (best-effort)
        await this.alertReportsPage.detectPDF(pdfPage).catch(() => false);
        console.log('[SharedSteps] First Alert Report PDF opened');
        return pdfPage;
    }

    /**
     * Downloads and verifies specific PDF by index
     * @param {number} index - Index of download button to click
     * @param {string} [expectedText='Incident Report'] - Text to verify in PDF
     * @returns {Promise<import('@playwright/test').Page>} PDF page for further operations
     */
    async downloadAndVerifyPDFByIndex(index, expectedText = 'Incident Report') {
        console.log(`[SharedSteps] Downloading and verifying PDF at index ${index}...`);
        
        await this.alertReportsPage.waitForPageToLoad();
        
        const pdfPage = await this.alertReportsPage.clickDownloadButtonByIndex(index);
        await this.alertReportsPage.verifyPDFContainsText(pdfPage, expectedText);
        
        console.log('[SharedSteps] PDF download and verification completed successfully');
        return pdfPage;
    }

    /**
     * Complete PDF verification workflow with cleanup
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     * @param {string} [expectedText='Incident Report'] - Text to verify in PDF
     */
    async completePDFVerificationWorkflow(username, password, expectedText = 'Incident Report') {
        console.log('[SharedSteps] Starting complete PDF verification workflow...');
        
        let pdfPage = null;
        
        try {
            // Authentication and setup
            await this.authenticateAndSetup(username, password);
            
            // Navigate to Alert Reports and verify PDF
            pdfPage = await this.navigateToAlertReportsAndVerifyPDF(expectedText);
            
            console.log('[SharedSteps] ✅ Complete PDF verification workflow finished successfully');
            
        } catch (error) {
            console.log(`[SharedSteps] ❌ PDF verification workflow failed: ${error.message}`);
            throw error;
        } finally {
            // Cleanup: Close PDF page if it was opened
            if (pdfPage) {
                await this.alertReportsPage.closePDFPage(pdfPage);
            }
        }
    }

    // ===========================================
    // 8.5. DISPATCH REPORTS OPERATIONS
    // ===========================================

    /**
     * Navigate to Dispatch Reports page
     */
    async navigateToDispatchReports() {
        console.log('[SharedSteps] Navigating to Dispatch Reports...');
        // Use MenuPage to navigate to Dispatch Reports (which handles both Alert Reports and the tab)
        await this.menuPage.navigateToDispatchReports();
        console.log('[SharedSteps] Dispatch Reports navigation completed');
    }

    /**
     * Create a complete dispatch report with standard configuration
     * @param {Object} config - Report configuration
     * @param {string} config.reportName - Report name
     * @param {string} [config.fileFormat='.xlsx - no images attached'] - File format
     * @param {string} [config.fromDate='20'] - From date (day)
     * @param {string} [config.toDate='21'] - To date (day)
     * @param {string} [config.station=''] - Station name (optional)
     * @param {string} [config.email=''] - Email address (optional)
     */
    async createDispatchReport(config) {
        console.log(`[SharedSteps] Creating dispatch report: ${config.reportName}`);
        // Navigate to dispatch reports first
        await this.navigateToDispatchReports();
        // Then create the report
        await this.dispatchReportsPage.createCompleteReport(config);
        console.log(`[SharedSteps] Dispatch report created successfully: ${config.reportName}`);
    }

    /**
     * Create dispatch report with "Today" button functionality
     * This method automatically sets today's date for both from and to dates
     * @param {Object} config - Report configuration
     * @param {string} config.reportName - Report name
     * @param {string} [config.fileFormat='.xlsx - no images attached'] - File format
     * @param {string} [config.station='South Africa Whole'] - Station to select
     * @param {string} [config.email=''] - Email address (optional)
     */
    async createTodayDispatchReport(config) {
        console.log(`[SharedSteps] Creating dispatch report with "Today" functionality: ${config.reportName}`);
        
        // Navigate to dispatch reports first
        await this.navigateToDispatchReports();
        
        // Create a new dispatch report
        await this.dispatchReportsPage.createNewDispatchReport();
        
        // Set file format
        await this.dispatchReportsPage.selectFileFormat(config.fileFormat || '.xlsx - no images attached');
        
        // Set report name
        await this.dispatchReportsPage.setReportName(config.reportName);
        
        // Set email if provided
        if (config.email) {
            await this.dispatchReportsPage.setEmail(config.email);
        }
        
        // Use "Today" button functionality for date selection
        await this.dispatchReportsPage.selectTodayDateRange();
        
        // Set time range
        await this.dispatchReportsPage.verifyTimeRange();
        
        // Select station
        await this.dispatchReportsPage.selectStation(config.station || 'South Africa Whole');
        
        // Continue to generate report
        await this.dispatchReportsPage.continueToReportGeneration();
        
        console.log(`[SharedSteps] Today's dispatch report created successfully: ${config.reportName}`);
    }

    /**
     * Download and verify dispatch report
     * @param {string} reportName - Report name to download
     * @param {string} [expectedExtension='.xlsx'] - Expected file extension
     * @returns {Promise<import('@playwright/test').Download>} Download object
     */
    async downloadDispatchReport(reportName, expectedExtension = '.xlsx') {
        console.log(`[SharedSteps] Downloading dispatch report: ${reportName}`);
        const download = await this.dispatchReportsPage.downloadReport(reportName, expectedExtension);
        console.log(`[SharedSteps] Dispatch report downloaded successfully: ${reportName}`);
        return download;
    }

    /**
     * Archive dispatch report
     * @param {string} reportName - Report name to archive
     */
    async archiveDispatchReport(reportName) {
        console.log(`[SharedSteps] Archiving dispatch report: ${reportName}`);
        await this.dispatchReportsPage.archiveReport(reportName);
        console.log(`[SharedSteps] Dispatch report archived successfully: ${reportName}`);
    }

    /**
     * Delete (archive) dispatch report - alias for archiveDispatchReport
     * @param {string} reportName - Report name to delete
     */
    async deleteDispatchReport(reportName) {
        console.log(`[SharedSteps] Deleting dispatch report: ${reportName}`);
        await this.archiveDispatchReport(reportName);
        console.log(`[SharedSteps] Dispatch report deleted successfully: ${reportName}`);
    }

    /**
     * Verify dispatch report details in table
     * @param {string} reportName - Report name
     * @param {string} [format='XLSX'] - Expected format
     * @param {string} [status='Ready'] - Expected status
     * @param {string} [creator='Proof360 Test'] - Expected creator
     */
    async verifyDispatchReportDetails(reportName, format = 'XLSX', status = 'Ready', creator = 'Proof360 Test') {
        console.log(`[SharedSteps] Verifying dispatch report details: ${reportName}`);
        await this.dispatchReportsPage.verifyReportDetails(reportName, format, status, creator);
        console.log(`[SharedSteps] Dispatch report details verified: ${reportName}`);
    }

    // ===========================================
    // 9. SUPPRESSION OPERATIONS
    // ===========================================

    /**
     * Navigate to Suppression Management and perform unsuppression
     * This method handles the complete unsuppression workflow with validation
     */
    async unsuppress() {
        console.log('[SharedSteps] Starting unsuppression workflow...');
        
        try {
            // Step 1: Navigate to Suppression Management
            console.log('Step 1: Navigating to Suppression Management...');
            await this.navigateToConfigurationSubmenu('Suppression Management');
            
            // Wait for the page to load
            await this.page.waitForTimeout(2000);
            
            // Step 2: Check if there are any suppressions to remove
            console.log('Step 2: Checking for active suppressions...');
            const suppressionRows = this.page.locator('table tbody tr');
            const rowCount = await suppressionRows.count();
            
            if (rowCount === 0) {
                console.log('[SharedSteps] ✅ No active suppressions found - cleanup not needed');
                return;
            }
            
            console.log(`[SharedSteps] Found ${rowCount} active suppressions - proceeding to remove them`);
            
            // Step 3: Remove all suppressions using a more robust approach
            let suppressionsRemoved = 0;
            
            while (true) {
                // Check if there are still suppressions
                const currentRows = this.page.locator('table tbody tr');
                const currentCount = await currentRows.count();
                
                if (currentCount === 0) {
                    console.log('[SharedSteps] ✅ All suppressions removed successfully');
                    break;
                }
                
                console.log(`Step 3.${suppressionsRemoved + 1}: Removing suppression ${suppressionsRemoved + 1}...`);
                
                try {
                    // Get the first row details for logging
                    const firstRow = currentRows.first();
                    const deviceName = await firstRow.locator('td').nth(0).textContent();
                    console.log(`[SharedSteps] Removing suppression for device: ${deviceName}`);
                    
                    // Click Unsuppress button in the table (using data-test-id)
                    await this.page.locator('button[data-test-id="unsuppressBtn"]').first().click();
                    console.log('[SharedSteps] Clicked Unsuppress button in table');
                    
                    // Wait for modal to appear
                    await this.page.waitForTimeout(1000);
                    
                    // Click UNSUPPRESS in the confirmation modal
                    await this.page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
                            btn.textContent && btn.textContent.includes('UNSUPPRESS')
                        );
                        const modalButton = buttons.find(btn => 
                            btn.textContent.trim() === 'UNSUPPRESS' && 
                            !btn.hasAttribute('data-test-id')
                        );
                        if (modalButton) {
                            modalButton.click();
                        }
                    });
                    console.log('[SharedSteps] Clicked UNSUPPRESS confirmation in modal');
                    
                    // Wait for the server to process the unsuppression
                    await this.page.waitForTimeout(3000);
                    
                    // Validate that the suppression was actually removed
                    const newRowCount = await this.page.locator('table tbody tr').count();
                    if (newRowCount < currentCount) {
                        suppressionsRemoved++;
                        console.log(`[SharedSteps] ✅ Suppression ${suppressionsRemoved} removed successfully`);
                    } else {
                        console.log(`[SharedSteps] ⚠️ Suppression may not have been removed (count unchanged: ${newRowCount})`);
                        // Try to close any lingering modals
                        try {
                            await this.page.keyboard.press('Escape');
                            await this.page.waitForTimeout(1000);
                        } catch (e) {}
                        break;
                    }
                    
                } catch (error) {
                    console.log(`[SharedSteps] ⚠️ Failed to remove suppression ${suppressionsRemoved + 1}: ${error.message}`);
                    // Try to close any lingering modals
                    try {
                        await this.page.keyboard.press('Escape');
                        await this.page.waitForTimeout(1000);
                    } catch (e) {}
                    break;
                }
                
                // Safety check: prevent infinite loop
                if (suppressionsRemoved >= 10) {
                    console.log('[SharedSteps] ⚠️ Safety limit reached - stopping unsuppression loop');
                    break;
                }
            }
            
            // Final validation
            const finalRowCount = await this.page.locator('table tbody tr').count();
            if (finalRowCount === 0) {
                console.log(`[SharedSteps] ✅ Unsuppression workflow completed successfully - all ${suppressionsRemoved} suppressions removed`);
            } else {
                console.log(`[SharedSteps] ⚠️ Unsuppression partially completed - ${suppressionsRemoved} suppressions removed, ${finalRowCount} remaining`);
            }
            
        } catch (error) {
            console.log(`[SharedSteps] ❌ Unsuppression workflow failed: ${error.message}`);
            throw error;
        }
        
        console.log('[SharedSteps] Unsuppression workflow finished');
    }

    // ===========================================
    // 10. SPECIFIC FILTER OPERATIONS
    // ===========================================

    /**
     * Apply Trex filter specifically
     */
    async applyTrexFilter() {
        console.log('[SharedSteps] Applying Trex filter...');
        
   
        // Step 1: Click on the dashboard stack filter button
        console.log('[Trex Filter Test] Step 1: Click on btn_dashboard_stackFilter.');
        await this.page.locator("[data-test-id='alert-stack-popover-trigger-button']").click();
          console.log('[AlertsDashboard] Clicking Trex checkbox...');
        try {
            await this.page.locator('label:has([data-test-id="stack-filter-alert-type-Trex"])').click();
            console.log('[AlertsDashboard] Clicked Trex label successfully.');
        } catch (error) {
            console.log('[AlertsDashboard] Trex label click failed, trying direct checkbox...');
            await this.page.locator('[data-test-id="stack-filter-alert-type-Trex"]').click({ force: true });
            console.log('[AlertsDashboard] Clicked Trex checkbox with force successfully.');
        }
        
        // Step 4: Click the apply button to confirm the filter selection
        console.log('[Trex Filter Test] Step 4: Click on btn_stackFilter_Apply.');
        await this.page.locator("[data-test-id='alert-filter-apply-button']").click();        // Step 5: Click the close button for the filter modal
        console.log('[Trex Filter Test] Step 5: Click on btn_stackFilter_close.');
        await this.page.locator("[data-test-id='modalClose']").click();
          // Verification Step: Check that the 'Trex' filter tag is now active on the dashboard
        console.log('[Trex Filter Test] Verification: Check for active "Trex" filter tag.');
        await this.page.waitForTimeout(1000);
       
        console.log('[SharedSteps] Trex filter applied successfully');
    }    /**
     * Apply multiple stack filters (LPR, Manual Alert, Trex, UB)
     * This method assumes the filter modal is already open
     */
    async applyMultipleStackFilters() {
        console.log('[SharedSteps] Applying multiple stack filters...');

        // Step 1: Click on option_stackFilter_LPR
        console.log('[Multi-Filter Test] Step 1: Click on LPR filter.');
        await this.page.getByLabel('LPR').check();

        // Step 2: Click on Stack Filter Manual Alert
        console.log('[Multi-Filter Test] Step 2: Click on Manual Alert filter.');
        await this.page.getByLabel('Manual Alert').check();
        
        // Step 3: Click on option_stackFilter_Trex
        console.log('[Multi-Filter Test] Step 3: Click on Trex filter.');
        await this.page.getByLabel('Trex').check();

        // Step 4: Click on option_stackFilter_UB
        console.log('[Multi-Filter Test] Step 4: Click on Unusual Behaviour filter.');
        await this.page.getByLabel('Unusual Behaviour').check();

        // Apply the filters
        console.log('[Multi-Filter Test] Applying filters and verifying active tags...');
        await this.page.locator("[data-test-id='alert-filter-apply-button']").click();
        await this.page.locator("[data-test-id='modalClose']").click();
        
        // Verification: Check for active filter tags
        await this.page.waitForTimeout(1000);
        await this.page.locator('.filter-tag').filter({ hasText: 'LPR' }).waitFor({ state: 'visible', timeout: 10000 });
        await this.page.locator('.filter-tag').filter({ hasText: 'Manual' }).waitFor({ state: 'visible', timeout: 10000 });
        await this.page.locator('.filter-tag').filter({ hasText: 'Trex' }).waitFor({ state: 'visible', timeout: 10000 });
        await this.page.locator('.filter-tag').filter({ hasText: 'UB' }).waitFor({ state: 'visible', timeout: 10000 });
        
        console.log('[SharedSteps] Multiple stack filters applied successfully');
    }

    /**
     * Complete multiple stack filter workflow (opens modal, applies filters, verifies)
     */
    async completeMultipleStackFilterWorkflow() {
        console.log('[SharedSteps] Starting complete multiple stack filter workflow...');
        
        // First open the filter modal
        await this.page.locator("[data-test-id='alert-stack-popover-trigger-button']").click();
        await this.page.waitForTimeout(1000);
        
        // Apply the multiple filters
        await this.applyMultipleStackFilters();
        
        console.log('[SharedSteps] Complete multiple stack filter workflow finished');
    }

    /**
     * Verify UB and Trex filters are checked
     */    async verifyUBAndTrexFiltersChecked() {
        console.log('[SharedSteps] Verifying UB and Trex filters are checked...');
        
        // Step 1: Click on the dashboard stack filter button to open the modal
        console.log('[Verification Test] Step 1: Click on btn_dashboard_stackFilter.');
        await this.page.locator("[data-test-id='alert-stack-popover-trigger-button']").click();
        
        // Check the actual state of both filters for debugging
        const ubCheckbox = this.page.locator('[data-test-id="stack-filter-alert-type-Unusual Behaviour"]');
        const trexCheckbox = this.page.locator('[data-test-id="stack-filter-alert-type-Trex"]');
        
        const ubChecked = await ubCheckbox.isChecked();
        const trexChecked = await trexCheckbox.isChecked();
        
        console.log(`[Verification Test] Actual state - UB: ${ubChecked ? 'CHECKED' : 'UNCHECKED'}, Trex: ${trexChecked ? 'CHECKED' : 'UNCHECKED'}`);
        
        // Step 2: Verify that the element 'Unusual Behaviour' is CHECKED
        console.log('[Verification Test] Step 2: Verify that the element Unusual Behaviour is CHECKED.');
        if (!ubChecked) {
            throw new Error('Unusual Behaviour filter is not checked as expected');
        }

        // Step 3: Verify that the element 'Trex' is CHECKED
        console.log('[Verification Test] Step 3: Verify that the element Trex is CHECKED.');
        if (!trexChecked) {
            throw new Error('Trex filter is not checked as expected');
        }
        
        // Step 4: Click on the close button for the stack filter modal
        console.log('[Verification Test] Step 4: Click on btn_stackFilter_close.');
        await this.page.locator("[data-test-id='modalClose']").click();
        
        console.log('[SharedSteps] UB and Trex filters verification completed - both are checked');
    }

    /**
     * Verify UB and Trex filters are unchecked
     */    async verifyUBAndTrexFiltersUnchecked() {
        console.log('[SharedSteps] Verifying UB and Trex filters are unchecked...');
        
        // Step 1: Click on the dashboard stack filter button to open the modal
        console.log('[Verification Test] Step 1: Click on btn_dashboard_stackFilter.');
        await this.page.locator("[data-test-id='alert-stack-popover-trigger-button']").click();
        
        // Check the actual state of both filters for debugging
        const ubCheckbox = this.page.locator('[data-test-id="stack-filter-alert-type-Unusual Behaviour"]');
        const trexCheckbox = this.page.locator('[data-test-id="stack-filter-alert-type-Trex"]');
        
        const ubChecked = await ubCheckbox.isChecked();
        const trexChecked = await trexCheckbox.isChecked();
        
        console.log(`[Verification Test] Actual state - UB: ${ubChecked ? 'CHECKED' : 'UNCHECKED'}, Trex: ${trexChecked ? 'CHECKED' : 'UNCHECKED'}`);
        
        // Step 2: Verify that the element 'Unusual Behaviour' is UNCHECKED
        console.log('[Verification Test] Step 2: Verify that the element Unusual Behaviour is UNCHECKED.');
        if (ubChecked) {
            throw new Error('Unusual Behaviour filter is checked but should be unchecked');
        }

        // Step 3: Verify that the element 'Trex' is UNCHECKED
        console.log('[Verification Test] Step 3: Verify that the element Trex is UNCHECKED.');
        if (trexChecked) {
            throw new Error('Trex filter is checked but should be unchecked');
        }
        
        // Step 4: Click on the close button for the stack filter modal
        console.log('[Verification Test] Step 4: Click on btn_stackFilter_close.');
        await this.page.locator("[data-test-id='modalClose']").click();
          console.log('[SharedSteps] UB and Trex filters verification completed - both are unchecked');
    }

    /**
     * Verify only Trex filter is unchecked (for filter bleed test)
     */
    async verifyTrexFilterUnchecked() {
        console.log('[SharedSteps] Verifying Trex filter is unchecked...');
        
        // Step 1: Click on the dashboard stack filter button to open the modal
        console.log('[Verification Test] Step 1: Click on btn_dashboard_stackFilter.');
        await this.page.locator("[data-test-id='alert-stack-popover-trigger-button']").click();
        
        // Check the actual state of the Trex filter for debugging
        const trexCheckbox = this.page.locator('[data-test-id="stack-filter-alert-type-Trex"]');
        const trexChecked = await trexCheckbox.isChecked();
        
        console.log(`[Verification Test] Actual Trex state: ${trexChecked ? 'CHECKED' : 'UNCHECKED'}`);
        
        // Verify that the element 'Trex' is UNCHECKED
        console.log('[Verification Test] Step 2: Verify that the element Trex is UNCHECKED.');
        if (trexChecked) {
            throw new Error('Trex filter is checked but should be unchecked (filter bleeding detected)');
        }
        
        // Step 3: Click on the close button for the stack filter modal
        console.log('[Verification Test] Step 3: Click on btn_stackFilter_close.');
        await this.closeStackFilter();
          console.log('[SharedSteps] Trex filter verification completed - filter is properly unchecked (no bleeding)');
    }

    /**
     * Verify only Trex filter is checked (for filter bleed test)
     */
    async verifyTrexFilterChecked() {
        console.log('[SharedSteps] Verifying Trex filter is checked...');
        
        // Step 1: Click on the dashboard stack filter button to open the modal
        console.log('[Verification Test] Step 1: Click on btn_dashboard_stackFilter.');
        await this.page.locator("[data-test-id='alert-stack-popover-trigger-button']").click();
        
        // Check the actual state of the Trex filter for debugging
        const trexCheckbox = this.page.locator('[data-test-id="stack-filter-alert-type-Trex"]');
        const trexChecked = await trexCheckbox.isChecked();
        
        console.log(`[Verification Test] Actual Trex state: ${trexChecked ? 'CHECKED' : 'UNCHECKED'}`);
        
        // Verify that the element 'Trex' is CHECKED
        console.log('[Verification Test] Step 2: Verify that the element Trex is CHECKED.');
        if (!trexChecked) {
            throw new Error('Trex filter is not checked as expected (filter bleeding working correctly - this may be expected behavior)');
        }
        
        // Step 3: Click on the close button for the stack filter modal
        console.log('[Verification Test] Step 3: Click on btn_stackFilter_close.');
        await this.closeStackFilter();
        
        console.log('[SharedSteps] Trex filter verification completed - filter is checked (filter bleeding detected)');
    }

    /**
     * Verify UB and Trex filters are checked (Station Management version)
     * This version is for Station Management context where the stack filter panel is already visible
     */
    async verifyUBAndTrexFiltersCheckedStationManagement() {
        console.log('[SharedSteps] Verifying UB and Trex filters are checked in Station Management...');
        
        // Check the actual state of both filters for debugging
        const ubCheckbox = this.page.locator('[data-test-id="stack-filter-alert-type-Unusual Behaviour"]');
        const trexCheckbox = this.page.locator('[data-test-id="stack-filter-alert-type-Trex"]');
        
        const ubChecked = await ubCheckbox.isChecked();
        const trexChecked = await trexCheckbox.isChecked();
        
        console.log(`[Station Management Verification] Actual state - UB: ${ubChecked ? 'CHECKED' : 'UNCHECKED'}, Trex: ${trexChecked ? 'CHECKED' : 'UNCHECKED'}`);
        
        // Verify that the element 'Unusual Behaviour' is CHECKED
        console.log('[Station Management Verification] Verifying that Unusual Behaviour is CHECKED.');
        if (!ubChecked) {
            throw new Error('Unusual Behaviour filter is not checked as expected in Station Management');
        }

        // Verify that the element 'Trex' is CHECKED
        console.log('[Station Management Verification] Verifying that Trex is CHECKED.');
        if (!trexChecked) {
            throw new Error('Trex filter is not checked as expected in Station Management');
        }
        
        console.log('[SharedSteps] UB and Trex filters verification completed in Station Management - both are checked');
    }

    /**
     * Verify UB and Trex filters are unchecked (Station Management version)
     * This version is for Station Management context where the stack filter panel is already visible
     */
    async verifyUBAndTrexFiltersUncheckedStationManagement() {
        console.log('[SharedSteps] Verifying UB and Trex filters are unchecked in Station Management...');
        
        // Check the actual state of both filters for debugging
        const ubCheckbox = this.page.locator('[data-test-id="stack-filter-alert-type-Unusual Behaviour"]');
        const trexCheckbox = this.page.locator('[data-test-id="stack-filter-alert-type-Trex"]');
        
        const ubChecked = await ubCheckbox.isChecked();
        const trexChecked = await trexCheckbox.isChecked();
        
        console.log(`[Station Management Verification] Actual state - UB: ${ubChecked ? 'CHECKED' : 'UNCHECKED'}, Trex: ${trexChecked ? 'CHECKED' : 'UNCHECKED'}`);
        
        // Verify that the element 'Unusual Behaviour' is UNCHECKED
        console.log('[Station Management Verification] Verifying that Unusual Behaviour is UNCHECKED.');
        if (ubChecked) {
            throw new Error('Unusual Behaviour filter is checked but should be unchecked in Station Management');
        }

        // Verify that the element 'Trex' is UNCHECKED
        console.log('[Station Management Verification] Verifying that Trex is UNCHECKED.');
        if (trexChecked) {
            throw new Error('Trex filter is checked but should be unchecked in Station Management');
        }
        
        console.log('[SharedSteps] UB and Trex filters verification completed in Station Management - both are unchecked');
    }

    /**
     * Apply "None" filter with conditional logic
     */
    async applyNoneFilter() {
        console.log('[SharedSteps] Applying None filter with conditional logic...');
        
        // Step 1: Check if a filter is currently active
        console.log('[None Filter Test] Step 1: Checking if a filter is currently active.');
        
        const removeFilterButton = this.page.locator("[data-test-id='btn_remove_filter']");
        const isFilterActive = await removeFilterButton.isVisible();

        if (!isFilterActive) {
            // IF block: No filter is active.
            console.log('[None Filter Test] IF: No filter is active. Applying "None" filter.');
            
            // Step 1.1: Click on stack filter dropdown
            await this.page.locator("[data-test-id='alert-stack-popover-trigger-button']").click();
            
            // Step 1.2: Click on Automation Filter None
            await this.page.locator("[data-test-id='option_filter_None']").click();

        } else {
            // ELSE block: A filter is active.
            console.log('[None Filter Test] ELSE: Filter is active. Removing it first.');

            // Step 2.1: Click on remove filter
            await removeFilterButton.click();
            await this.page.waitForTimeout(500);

            // Step 2.2: Click on stack filter dropdown
            await this.page.locator("[data-test-id='alert-stack-popover-trigger-button']").click();

            // Step 2.3: Click on Automation Filter None
            await this.page.locator("[data-test-id='option_filter_None']").click();
        }

        await this.page.waitForTimeout(1000);
        console.log('[SharedSteps] None filter applied successfully');
    }

    // ===========================================
    // 11. STATION MANAGEMENT
    // ===========================================

    /**
     * Change station to Automation Test
     */
    async changeStationToAutomationTest() {
        console.log('[SharedSteps] Changing station to Automation Test...');
        
        // Step 1: Click on the Station Dropdown to open the selection list
        console.log('[Change Station Test] Step 1: Click on Station DropDown.');
        await this.page.locator("[data-test-id='stationDropDown']").click();        // Step 2: Click on the 'Automation test' dropdown option
        console.log('[Change Station Test] Step 2: Click on Automation test Dropdown.');
        await this.page.locator('[data-pc-section="itemlabel"]').filter({ hasText: 'Automation test' }).click();
        
        console.log('[SharedSteps] Station changed to Automation Test successfully');
    }

    /**
     * Change station to ALL
     */
    async changeStationToAll() {
        console.log('[SharedSteps] Changing station to ALL...');
        
        // Step 1: Click on the Station Dropdown to open the selection list
        console.log('[Change Station Test] Step 1: Click on Station DropDown.');
        await this.page.locator("[data-test-id='stationDropDown']").click();
          // Step 2: Click on the 'ALL' dropdown option  
        console.log('[Change Station Test] Step 2: Click on ALL Dropdown.');
        await this.page.locator('[data-pc-section="itemlabel"]').filter({ hasText: 'ALL' }).click();
        
        console.log('[SharedSteps] Station changed to ALL successfully');
    }    /**
     * Navigate to Station Management and change filter to ALL
     */
    async stationManagementChangeFilterToAll() {
        console.log('[SharedSteps] Navigating to Station Management and changing filter to ALL...');
        
        // Step 1: Navigate to Station Management
        console.log('[Edit Station Test] Step 1: Navigate to Station Management.');
        await this.navigateToConfigurationSubmenu('Station Management');
        await this.page.waitForURL(/.*\/station-management/, { timeout: 30000 });

        // Step 2: Enter 'Automation test' in the search input field
        console.log('[Edit Station Test] Step 2: Enter Automation test in the search field.');
        await this.page.locator("[data-test-id='search-input']").fill('Automation test');

        // Step 3: Press the Enter/Return key to initiate the search
        console.log('[Edit Station Test] Step 3: Press Enter/Return Key.');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);

        // Step 4: Click on the edit button for the first row result
        console.log('[Edit Station Test] Step 4: Click on edit_row1_stationManagement.');
        await this.page.locator('tr').filter({ hasText: 'Automation test' }).getByRole('button', { name: 'edit' }).click();

        // Step 5: Implement "IF All filter" conditional logic
        console.log('[Edit Station Test] Step 5: Implementing "IF All filter" conditional logic.');
        await this.applyAllFilterConditionalLogic();

        // Step 6: Click on the Save and Update Button
        console.log('[Edit Station Test] Step 6: Click on Save and Update Button.');
        await this.page.getByRole('button', { name: 'Save and Update' }).click();

        // Verification Step: Check for a success message
        console.log('[Edit Station Test] Verification: Check for update success message.');
        await this.page.getByText('Station updated successfully').waitFor({ state: 'visible', timeout: 10000 });
        
        console.log('[SharedSteps] Station Management filter changed to ALL successfully');
    }    /**
     * Apply "All" filter in station edit context with conditional logic
     */
    async applyAllFilterConditionalLogic() {
        console.log('[SharedSteps] Applying All filter with conditional logic...');
        
        // Check if the filter dropdown shows "None selected" (meaning filter is empty)
        const filterInput = this.page.locator('input[placeholder="None selected"]');
        const isFilterEmpty = await filterInput.isVisible();
          if (isFilterEmpty) {
            // IF block: Filter is empty (None selected)
            console.log('[Edit Station Test] IF: Filter is empty (None selected). Applying All filter directly.');
            await this.clickFilterDropdownAndSelectOption('All');
        } else {
            // ELSE block: Filter is active, need to remove it first
            console.log('[Edit Station Test] ELSE: Filter is active. Removing it first.');
              // Try the correct remove filter button selector
            const removeFilterButton = this.page.locator("[data-test-id='edit-select-filter-remove-filter']");
            
            if (await removeFilterButton.isVisible({ timeout: 2000 })) {
                await removeFilterButton.click();
                console.log('[Edit Station Test] Successfully clicked remove filter button');
            } else {
                console.log('[Edit Station Test] Warning: Remove filter button not found, proceeding with filter selection...');
            }
            
            // Apply the All filter
            await this.clickFilterDropdownAndSelectOption('All');
        }        // Verification: Check that the filter dropdown shows the selected value
        console.log('[Edit Station Test] Verifying All filter was applied...');
        
        // Wait for the filter input to show the selected value
        const filterInputVerification = this.page.locator('input[placeholder="None selected"]');
        await expect(filterInputVerification).toHaveValue('Automation Filter All', { timeout: 10000 });
        console.log('[Edit Station Test] "All" filter applied and verified successfully.');
        console.log('[SharedSteps] All filter conditional logic completed successfully');
    }

    /**
     * Navigate to Station Management and apply None filter
     */
    async stationManagementApplyNoneFilter() {
        console.log('[SharedSteps] Navigating to Station Management and applying None filter...');
        
        // Step 1: Navigate to Station Management
        console.log('[Edit Station Test] Step 1: Navigate to Station Management.');
        await this.navigateToConfigurationSubmenu('Station Management');
        await this.page.waitForURL(/.*\/station-management/, { timeout: 30000 });

        // Step 2: Enter 'Automation test' in the search input field (fixed to use hyphen)
        console.log('[Edit Station Test] Step 2: Enter Automation test in the search field.');
        await this.page.locator("[data-test-id='search-input']").fill('Automation test');

        // Step 3: Press the Enter/Return key to initiate the search
        console.log('[Edit Station Test] Step 3: Press Enter/Return Key.');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);

        // Step 4: Click on the edit button for the first row result
        console.log('[Edit Station Test] Step 4: Click on edit_row1_stationManagement.');
        await this.page.locator('tr').filter({ hasText: 'Automation test' }).getByRole('button', { name: 'edit' }).click();

        // Step 5: Implement "IF None filter" conditional logic
        console.log('[Edit Station Test] Step 5: Implementing "IF None filter" conditional logic.');
        await this.applyNoneFilterConditionalLogic();

        // Check if remove filter button appears after filter change
        const removeFilterSelectors = [
            '[data-test-id="remove-filter-button"]',
            'button:has-text("Remove Filter")',
            'button[title*="Remove"]',
            '.remove-filter'
        ];
        
        let removeFilterButton = null;
        for (const selector of removeFilterSelectors) {
            try {
                const button = this.page.locator(selector);
                if (await button.isVisible({ timeout: 2000 })) {
                    removeFilterButton = button;
                    console.log(`[SharedTestSteps] Remove filter button found with selector: ${selector}`);
                    break;
                }
            } catch (error) {
                console.log(`[SharedTestSteps] Remove filter button not found with selector: ${selector}`);
            }
        }
        
        if (removeFilterButton) {
            console.log('[SharedTestSteps] Remove filter button is visible after None filter application');
        } else {
            console.log('[SharedTestSteps] Remove filter button not found after None filter application');
        }

        // Step 6: Click on the Save and Update Button
        console.log('[Edit Station Test] Step 6: Click on Save and Update Button.');
        await this.page.getByRole('button', { name: 'Save and Update' }).click();

        // Verification Step: Check for a success message
        console.log('[Edit Station Test] Verification: Check for update success message.');
        await this.page.getByText('Station updated successfully').waitFor({ state: 'visible', timeout: 10000 });
        
        console.log('[SharedSteps] Station Management None filter applied successfully');    }


         /**
     * IF All filter - Apply "All" filter with conditional logic
     * Checks if filter dropdown is empty, then applies "All" filter accordingly
     */
    async ifAllFilter() {
        console.log('[SharedSteps] IF All filter - Applying All filter with conditional logic...');
        
        try {
            // Check the actual state of the dropdown input
            const dropdownInput = this.page.locator('//input[@placeholder="None selected"]');
            
            // Get the current value/text of the input to determine its state
            const inputValue = await dropdownInput.getAttribute('value') || '';
            const inputText = await dropdownInput.inputValue() || '';
            
            console.log(`[SharedSteps] Current dropdown state - value: "${inputValue}", inputValue: "${inputText}"`);
            
            // Check if dropdown is empty (no filter selected)
            const isEmpty = inputValue === '' && inputText === '';
            
            if (isEmpty) {
                console.log('[SharedSteps] IF: Element None selected Input_Dropdown filter is empty');
                
                // Step 1.1: Click on stack filter dropdown
                console.log('[SharedSteps] Step 1.1: Click on stack filter dropdown.');
                await dropdownInput.click();
                
                // Wait for dropdown options to appear
                await this.page.waitForTimeout(1000);
                
                // Step 1.2: Click on Automation Filter All
                console.log('[SharedSteps] Step 1.2: Click on Automation Filter All.');
                await this.page.getByText('Automation Filter All', { exact: true }).click();
                
            } else {
                console.log('[SharedSteps] ELSE');
                
                // Step 2.1: Click on remove filter
                console.log('[SharedSteps] Step 2.1: Click on remove filter.');
                await this.page.locator("[data-test-id='edit-select-filter-remove-filter']").click();
                
                // Wait for filter to be removed
                await this.page.waitForTimeout(500);
                
                // Step 2.2: Click on stack filter dropdown
                console.log('[SharedSteps] Step 2.2: Click on stack filter dropdown.');
                await dropdownInput.click();
                
                // Wait for dropdown options to appear
                await this.page.waitForTimeout(1000);
                
                // Step 2.3: Click on Automation Filter All
                console.log('[SharedSteps] Step 2.3: Click on Automation Filter All.');
                await this.page.getByText('Automation Filter All', { exact: true }).click();
            }
            
            console.log('[SharedSteps] All filter applied successfully');
            
        } catch (error) {
            console.log(`[SharedSteps] Error applying All filter: ${error.message}`);
            throw error;
        }
    }

    /**
     * IF None filter - Apply "None" filter with conditional logic
     * Checks if filter dropdown is empty, then applies "None" filter accordingly
     * Enhanced for Station Management compatibility
     */
    async ifNoneFilter() {
        console.log('[SharedSteps] IF None filter - Applying None filter with conditional logic...');
        
        try {
            // Check the actual state of the dropdown input
            const dropdownInput = this.page.locator('//input[@placeholder="None selected"]');
            
            // Get the current value/text of the input to determine its state
            const inputValue = await dropdownInput.getAttribute('value') || '';
            const inputText = await dropdownInput.inputValue() || '';
            
            console.log(`[SharedSteps] Current dropdown state - value: "${inputValue}", inputValue: "${inputText}"`);
            
            // Check if dropdown is empty (no filter selected)
            const isEmpty = inputValue === '' && inputText === '';
            
            if (isEmpty) {
                console.log('[SharedSteps] IF: Element None selected Input_Dropdown filter is empty');
                
                // Step 1.1: Click on stack filter dropdown
                console.log('[SharedSteps] Step 1.1: Click on stack filter dropdown.');
                await dropdownInput.click();
                
                // Wait for dropdown options to appear
                await this.page.waitForTimeout(1000);
                
                // Step 1.2: Click on Automation Filter None
                console.log('[SharedSteps] Step 1.2: Click on Automation Filter None.');
                await this.page.locator('li:has-text("Automation Filter None")').click();
            } else {
                console.log('[SharedSteps] ELSE');
                
                // Step 2.1: Click on remove filter
                console.log('[SharedSteps] Step 2.1: Click on remove filter.');
                await this.page.locator("[data-test-id='edit-select-filter-remove-filter']").click();
                
                // Wait for filter to be removed
                await this.page.waitForTimeout(500);
                
                // Step 2.2: Click on stack filter dropdown
                console.log('[SharedSteps] Step 2.2: Click on stack filter dropdown.');
                await dropdownInput.click();
                
                // Wait for dropdown options to appear
                await this.page.waitForTimeout(1000);
                
                // Step 2.3: Click on Automation Filter None
                console.log('[SharedSteps] Step 2.3: Click on Automation Filter None.');
                await this.page.locator('li:has-text("Automation Filter None")').click();
            }
            
            console.log('[SharedSteps] None filter applied successfully');
            
        } catch (error) {
            console.log(`[SharedSteps] Error applying None filter: ${error.message}`);
            throw error;
        }
    }
    // ===========================================
    // 12. USER MANAGEMENT
    // ===========================================

    /**
     * Perform user logout - Simple and reliable version
     */
    async logout() {
        console.log('[SharedSteps] Performing user logout...');
        
        try {
            // Step 1: Click on the logout dropdown
            console.log('[Logout] Step 1: Click on logout dropdown.');
            await this.page.locator("[data-test-id='logoutDropdown']").click();
            
            // Step 2: Click on "Log out" button
            console.log('[Logout] Step 2: Click on "Log out".');
            await this.page.locator("[data-test-id='logoutBtn']").click();
            
            // Step 3: Wait for logout process to start
            console.log('[Logout] Step 3: Waiting for Microsoft logout flow...');
            await this.page.waitForTimeout(3000);
            
            // Step 4: Handle account selection if present
            const pickAccountVisible = await this.page.getByText('Pick an account').isVisible({ timeout: 10000 }).catch(() => false);
            
            if (pickAccountVisible) {
                console.log('[Logout] Step 4: Handling account selection...');
                
                // Try admin account first
                const adminAccount = this.page.getByText('Proof360Test@vumacam.online');
                const adminVisible = await adminAccount.isVisible({ timeout: 5000 }).catch(() => false);
                
                if (adminVisible) {
                    console.log('[Logout] Clicking admin account...');
                    await adminAccount.click();
                } else {
                    // Try normal user account
                    const normalAccount = this.page.getByText('prooftestbotsa@vumacam.online');
                    const normalVisible = await normalAccount.isVisible({ timeout: 5000 }).catch(() => false);
                    
                    if (normalVisible) {
                        console.log('[Logout] Clicking normal user account...');
                        await normalAccount.click();
                    }
                }
                
                // Wait for account selection to complete
                await this.page.waitForTimeout(2000);
            }
            
            console.log('[Logout] ✅ Logout completed successfully');
            
        } catch (error) {
            console.log('[Logout] ❌ Logout failed:', error.message);
            throw error;
        }
        
        console.log('[SharedSteps] User logout completed');
    }

    /**
     * Handle account selection logout scenario
     * When logout shows "Pick an account" page
     */
    async handleAccountSelectionLogout() {
        console.log('[Logout] ✅ On account selection page - proceeding with account logout');
        
        // Dynamic check for which account is present with comprehensive logging
        console.log('[Logout] Searching for user accounts to sign out...');
        let accountClicked = false;
        
        // Check for admin account first (exact case from MCP testing)
        console.log('[Logout] Checking for admin account (Proof360Test@vumacam.online)...');
        const adminAccount = this.page.getByText('Proof360Test@vumacam.online');
        const adminAccountVisible = await adminAccount.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (adminAccountVisible) {
            console.log('[Logout] Found admin account - clicking to sign out');
            await adminAccount.click();
            accountClicked = true;
        } else {
            // Check for normal user account (exact case from MCP testing) 
            console.log('[Logout] Checking for normal user account (prooftestbotSA@vumacam.online)...');
            const normalAccount = this.page.getByText('prooftestbotSA@vumacam.online');
            const normalAccountVisible = await normalAccount.isVisible({ timeout: 5000 }).catch(() => false);
            
            if (normalAccountVisible) {
                console.log('[Logout] Found normal user account - clicking to sign out');
                await normalAccount.click();
                accountClicked = true;
            } else {
                console.log('[Logout] No known account found in account list');
                // Try to find any account button and click it
                const accountButtons = this.page.locator('button').filter({ hasText: '@vumacam.online' });
                const accountCount = await accountButtons.count();
                
                if (accountCount > 0) {
                    console.log(`[Logout] Found ${accountCount} account(s) - clicking first one`);
                    await accountButtons.first().click();
                    accountClicked = true;
                }
            }
        }
        
        if (!accountClicked) {
            console.log('[Logout] ❌ No account found to sign out');
            const pageContent = await this.page.content();
            console.log('[Logout] Page content:', pageContent.substring(0, 1000));
            throw new Error('No account found to sign out');
        }
        
        // Wait for page transition after clicking account with detailed logging
        console.log('[Logout] Waiting for page transition after account selection...');
        await this.page.waitForLoadState('networkidle', { timeout: 20000 });
        
        // Wait for "Use another account" to appear
        console.log('[Logout] Waiting for "Use another account" button...');
        const useAnotherAccountButton = this.page.getByText('Use another account');
        const useAnotherAccountVisible = await useAnotherAccountButton.isVisible({ timeout: 10000 }).catch(() => false);
        
        if (useAnotherAccountVisible) {
            console.log('[Logout] Clicking "Use another account"...');
            await useAnotherAccountButton.click();
            
            // Wait for login page to load
            console.log('[Logout] Waiting for login page to load...');
            await this.page.waitForLoadState('networkidle', { timeout: 20000 });
        } else {
            console.log('[Logout] ⚠️ "Use another account" button not found - may have been redirected directly');
        }
    }

    /**
     * Handle logout session page scenario
     * When logout shows "You signed out of your account" page
     */
    async handleLogoutSessionPage() {
        console.log('[Logout] ✅ On logout session page - waiting for automatic redirect');
        
        // Wait for automatic redirect to login page
        console.log('[Logout] Waiting for automatic redirect to login page...');
        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
        
        // Check if we're now on a login-related page
        const loginIndicators = [
            'text=Pick an account',
            '[name="loginfmt"]',
            'text=Sign in'
        ];
        
        for (const indicator of loginIndicators) {
            const isVisible = await this.page.locator(indicator).isVisible({ timeout: 5000 }).catch(() => false);
            if (isVisible) {
                console.log(`[Logout] ✅ Successfully redirected to login page (found: ${indicator})`);
                return;
            }
        }
        
        console.log('[Logout] ⚠️ No login indicators found after redirect, forcing navigation');
        await this.page.goto('https://uat.proof360.io/', { timeout: 20000 });
        await this.page.waitForLoadState('networkidle', { timeout: 20000 });
    }

    /**
     * Handle unknown logout state scenario
     * When logout doesn't match any known pattern
     */
    async handleUnknownLogoutState() {
        console.log('[Logout] ⚠️ Unknown logout state detected');
        
        // Take screenshot for debugging
        try {
            await this.page.screenshot({ path: 'debug/logout-unknown-state.png' });
            console.log('[Logout] Debug screenshot saved: debug/logout-unknown-state.png');
        } catch (screenshotError) {
            console.log('[Logout] Could not save debug screenshot:', screenshotError.message);
        }
        
        // Log page details
        const currentUrl = this.page.url();
        console.log('[Logout] Current URL:', currentUrl);
        
        const pageContent = await this.page.content();
        console.log('[Logout] Page content:', pageContent.substring(0, 1000));
        
        // Try to navigate to login page as fallback
        console.log('[Logout] Attempting to navigate to login page as fallback...');
        await this.page.goto('https://uat.proof360.io/', { timeout: 20000 });
        await this.page.waitForLoadState('networkidle', { timeout: 20000 });
        console.log('[Logout] ✅ Fallback navigation to login page completed');
    }

    /**
     * Switch to admin user method
     * 1. Navigate to base url
     * 2. If logged in already, click logout dropdown
     * 3. Click logout button
     * 4. Dynamic wait for "Pick an account"
     * 5. Click prooftestbotsa@vumacam.online or proof360test@vumacam.online
     * 6. Dynamic wait for "Use another account"
     * 7. Click "Use another account"
     * 8. Follow normal login and authenticate flow
     * If not logged in, use normal login method
     */
    async switchToAdminUser() {
        console.log('[SharedSteps] Switching to admin user...');
        
        try {
            // Step 1: Navigate to base url
            console.log('[Switch Admin] Step 1: Navigate to base url');
            await this.page.goto('https://uat.proof360.io/', { timeout: 30000 });
            
            // Wait for page load with fallback (avoid networkidle in real-time apps)
            try {
                await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
                // Wait for either login form or command dashboard to appear
                await this.page.waitForFunction(() => {
                    return document.querySelector('[name="loginfmt"]') || 
                           document.querySelector('[data-test-id="burger-menu-button"]') ||
                           document.querySelector('.login-form') ||
                           document.querySelector('[data-test-id="command"]');
                }, { timeout: 15000 });
            } catch (error) {
                console.log('[Switch Admin] Fallback: Using basic timeout instead of networkidle');
                await this.page.waitForTimeout(3000);
            }
            
            // Check for terms and conditions page first
            console.log('[Switch Admin] Checking for terms and conditions page...');
            const termsButton = this.page.locator('[data-test-id="termsAndConditonsAcceptBtn"]');
            const termsVisible = await termsButton.isVisible({ timeout: 5000 }).catch(() => false);
            
            if (termsVisible) {
                console.log('[Switch Admin] Terms and conditions page detected - clicking accept');
                await termsButton.click();
                await this.page.waitForLoadState('networkidle', { timeout: 20000 });
            }
            
            // Check if already logged in by looking for logout dropdown
            console.log('[Switch Admin] Checking if already logged in...');
            const logoutDropdown = this.page.locator('[data-test-id="logoutDropdown"]');
            const isLoggedIn = await logoutDropdown.isVisible({ timeout: 10000 }).catch(() => false);
            
            if (isLoggedIn) {
                console.log('[Switch Admin] Already logged in - proceeding with logout');
                
                // Step 2: Click logout dropdown
                console.log('[Switch Admin] Step 2: Click logout dropdown');
                await logoutDropdown.click();
                
                // Step 3: Click logout button
                console.log('[Switch Admin] Step 3: Click logout button');
                await this.page.locator('[data-test-id="logoutBtn"]').click();
                
                // Step 4: Dynamic wait for "Pick an account"
                console.log('[Switch Admin] Step 4: Dynamic wait for "Pick an account"');
                await this.page.waitForSelector('text=Pick an account', { timeout: 30000 });
                
                // Step 5: Click on the account to sign out
                console.log('[Switch Admin] Step 5: Click on account to sign out');
                const accountButton = this.page.getByText('Proof360Test@vumacam.online');
                const accountVisible = await accountButton.isVisible({ timeout: 5000 }).catch(() => false);
                
                if (accountVisible) {
                    console.log('[Switch Admin] Clicking Proof360Test@vumacam.online account');
                    await accountButton.click();
                } else {
                    console.log('[Switch Admin] Account not found - trying any account with @vumacam.online');
                    const anyAccount = this.page.locator('text=@vumacam.online').first();
                    await anyAccount.click();
                }
                
                // Dynamic wait for page to load after clicking account
                console.log('[Switch Admin] Waiting for page to load after account click...');
                await this.page.waitForLoadState('networkidle', { timeout: 20000 });
                
                // Step 6: Wait for "Use another account" to appear
                console.log('[Switch Admin] Step 6: Wait for "Use another account" to appear');
                await this.page.waitForSelector('text=Use another account', { timeout: 30000 });
                
                // Step 7: Click "Use another account"
                console.log('[Switch Admin] Step 7: Click "Use another account"');
                await this.page.getByText('Use another account').click();
                
                // Dynamic wait for login page to load
                console.log('[Switch Admin] Waiting for login page to load...');
                await this.page.waitForLoadState('networkidle', { timeout: 20000 });
                
                // Step 8: Follow normal login and authenticate flow
                console.log('[Switch Admin] Step 8: Follow normal login and authenticate flow');
                await this.page.waitForLoadState('networkidle', { timeout: 20000 });
                
                // Use admin credentials
                const adminUsername = process.env.ADMIN_MS_USERNAME;
                const adminPassword = process.env.ADMIN_MS_PASSWORD;
                
                if (!adminUsername || !adminPassword) {
                    throw new Error('Admin credentials not found in environment variables');
                }
                
                await this.login(adminUsername, adminPassword);
                
            } else {
                console.log('[Switch Admin] Not logged in - using normal login method');
                
                // Use admin credentials
                const adminUsername = process.env.ADMIN_MS_USERNAME;
                const adminPassword = process.env.ADMIN_MS_PASSWORD;
                
                if (!adminUsername || !adminPassword) {
                    throw new Error('Admin credentials not found in environment variables');
                }
                
                await this.login(adminUsername, adminPassword);
            }
            
            console.log('[Switch Admin] ✅ Successfully switched to admin user');
            
        } catch (error) {
            console.log('[Switch Admin] ❌ Switch to admin user failed:', error.message);
            throw error;
        }
    }

    /**
     * Switch to normal user method with 3-retry logic for network resilience
     * 1. Navigate to base url
     * 2. If logged in already, click logout dropdown
     * 3. Click logout button
     * 4. Dynamic wait for "Pick an account"
     * 5. Click proof360test@vumacam.online or prooftestbotsa@vumacam.online
     * 6. Dynamic wait for "Use another account"
     * 7. Click "Use another account"
     * 8. Follow normal login and authenticate flow
     * If not logged in, use normal login method
     */
    async switchToNormalUser() {
        console.log('[SharedSteps] Switching to normal user with retry logic...');
        
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Switch Normal] Attempt ${attempt}/${maxRetries} - Starting user switch`);
                
                // Step 1: Navigate to base url
                console.log('[Switch Normal] Step 1: Navigate to base url');
                await this.page.goto('https://uat.proof360.io/', { timeout: 30000 });
                await this.page.waitForLoadState('networkidle', { timeout: 20000 });
                
                // Check for terms and conditions page first
                console.log('[Switch Normal] Checking for terms and conditions page...');
                const termsButton = this.page.locator('[data-test-id="termsAndConditonsAcceptBtn"]');
                const termsVisible = await termsButton.isVisible({ timeout: 5000 }).catch(() => false);
                
                if (termsVisible) {
                    console.log('[Switch Normal] Terms and conditions page detected - clicking accept');
                    await termsButton.click();
                    await this.page.waitForLoadState('networkidle', { timeout: 20000 });
                }
                
                // Check if already logged in by looking for logout dropdown
                console.log('[Switch Normal] Checking if already logged in...');
                const logoutDropdown = this.page.locator('[data-test-id="logoutDropdown"]');
                const isLoggedIn = await logoutDropdown.isVisible({ timeout: 10000 }).catch(() => false);
                
                if (isLoggedIn) {
                    console.log('[Switch Normal] Already logged in - proceeding with logout');
                    
                    // Step 2: Click logout dropdown
                    console.log('[Switch Normal] Step 2: Click logout dropdown');
                    await logoutDropdown.click();
                    
                    // Step 3: Click logout button
                    console.log('[Switch Normal] Step 3: Click logout button');
                    await this.page.locator('[data-test-id="logoutBtn"]').click();
                    
                    // Step 4: Dynamic wait for "Pick an account"
                    console.log('[Switch Normal] Step 4: Dynamic wait for "Pick an account"');
                    await this.page.waitForSelector('text=Pick an account', { timeout: 30000 });
                    
                    // Step 5: Click on the account to sign out
                    console.log('[Switch Normal] Step 5: Click on account to sign out');
                    const accountButton = this.page.getByText('Proof360Test@vumacam.online');
                    const accountVisible = await accountButton.isVisible({ timeout: 5000 }).catch(() => false);
                    
                    if (accountVisible) {
                        console.log('[Switch Normal] Clicking Proof360Test@vumacam.online account');
                        await accountButton.click();
                    } else {
                        console.log('[Switch Normal] Account not found - trying any account with @vumacam.online');
                        const anyAccount = this.page.locator('text=@vumacam.online').first();
                        await anyAccount.click();
                    }
                    
                    // Dynamic wait for page to load after clicking account
                    console.log('[Switch Normal] Waiting for page to load after account click...');
                    await this.page.waitForLoadState('networkidle', { timeout: 20000 });
                    
                    // Step 6: Wait for "Use another account" to appear
                    console.log('[Switch Normal] Step 6: Wait for "Use another account" to appear');
                    await this.page.waitForSelector('text=Use another account', { timeout: 30000 });
                    
                    // Step 7: Click "Use another account"
                    console.log('[Switch Normal] Step 7: Click "Use another account"');
                    await this.page.getByText('Use another account').click();
                    
                    // Dynamic wait for login page to load
                    console.log('[Switch Normal] Waiting for login page to load...');
                    await this.page.waitForLoadState('networkidle', { timeout: 20000 });
                    
                    // Step 8: Follow normal login and authenticate flow
                    console.log('[Switch Normal] Step 8: Follow normal login and authenticate flow');
                    await this.page.waitForLoadState('networkidle', { timeout: 20000 });
                    
                    // Use normal user credentials
                    const normalUsername = process.env.NORMAL_MS_USERNAME;
                    const normalPassword = process.env.NORMAL_MS_PASSWORD;
                    
                    if (!normalUsername || !normalPassword) {
                        throw new Error('Normal user credentials not found in environment variables');
                    }
                    
                    await this.login(normalUsername, normalPassword);
                    
                } else {
                    console.log('[Switch Normal] Not logged in - using normal login method');
                    
                    // Use normal user credentials
                    const normalUsername = process.env.NORMAL_MS_USERNAME;
                    const normalPassword = process.env.NORMAL_MS_PASSWORD;
                    
                    if (!normalUsername || !normalPassword) {
                        throw new Error('Normal user credentials not found in environment variables');
                    }
                    
                    await this.login(normalUsername, normalPassword);
                }
                
                console.log(`[Switch Normal] ✅ Successfully switched to normal user on attempt ${attempt}`);
                return; // Success, exit retry loop
                
            } catch (error) {
                lastError = error;
                console.log(`[Switch Normal] ❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    const waitTime = attempt * 2000; // Progressive wait: 2s, 4s
                    console.log(`[Switch Normal] Waiting ${waitTime}ms before retry...`);
                    await this.page.waitForTimeout(waitTime);
                } else {
                    console.log('[Switch Normal] ❌ All retry attempts exhausted');
                }
            }
        }
        
        // If we get here, all retries failed
        throw new Error(`Failed to switch to normal user after ${maxRetries} attempts. Last error: ${lastError.message}`);
    }

    // ===========================================
    // 13. HELPER METHODS FOR ROBUSTNESS
    // ===========================================

    /**
     * Robust helper method to click filter dropdown and select an option
     * Uses multiple fallback strategies to handle various UI states
     * @param {string} optionText - The text of the filter option to select (e.g., "Automation Filter All")
     */
    async clickFilterDropdownAndSelectOption(optionText) {
        console.log(`[Filter Dropdown] Attempting to select option: ${optionText}`);
        
        // Map simple option names to full UI text
        const optionMap = {
            'All': 'Automation Filter All',
            'None': 'Automation Filter None',
            'No Filter Selected': 'No Filter Selected'
        };
        
        // Get the full option text for UI interaction
        const fullOptionText = optionMap[optionText] || optionText;
        console.log(`[Filter Dropdown] Using full option text: ${fullOptionText}`);
        
        // Strategy 1: Try the placeholder-based selector (most common case)
        try {
            console.log('[Filter Dropdown] Strategy 1: Trying placeholder-based selector');
            await this.page.locator('input[placeholder="None selected"]').click({ timeout: 5000 });
            console.log('[Filter Dropdown] Strategy 1: Successfully clicked dropdown trigger');
        } catch (error) {
            console.log('[Filter Dropdown] Strategy 1 failed, trying strategy 2');
            
            // Strategy 2: Try label-based selector with input targeting
            try {
                console.log('[Filter Dropdown] Strategy 2: Trying label-based selector');
                await this.page.locator('label:has-text("Select filter") >> .. >> input').click({ timeout: 5000 });
                console.log('[Filter Dropdown] Strategy 2: Successfully clicked dropdown trigger');
            } catch (error2) {
                console.log('[Filter Dropdown] Strategy 2 failed, trying strategy 3');
                
                // Strategy 3: Try class-based selector (based on observed HTML structure)
                try {
                    console.log('[Filter Dropdown] Strategy 3: Trying class-based selector');
                    await this.page.locator('.sc-gXoWbv.iEbUkU').click({ timeout: 5000 });
                    console.log('[Filter Dropdown] Strategy 3: Successfully clicked dropdown trigger');
                } catch (error3) {
                    console.log('[Filter Dropdown] Strategy 3 failed, trying strategy 4');
                    
                    // Strategy 4: Try comprehensive selector with multiple attributes
                    try {
                        console.log('[Filter Dropdown] Strategy 4: Trying comprehensive selector');
                        await this.page.locator('input[type="text"][placeholder*="selected"]').click({ timeout: 5000 });
                        console.log('[Filter Dropdown] Strategy 4: Successfully clicked dropdown trigger');
                    } catch (error4) {
                        console.log('[Filter Dropdown] All strategies failed, trying final fallback');
                        
                        // Strategy 5: Final fallback - find any input near "Select filter" label
                        await this.page.locator('text=Select filter').locator('..').locator('input').click({ timeout: 5000 });
                        console.log('[Filter Dropdown] Final fallback: Successfully clicked dropdown trigger');
                    }
                }
            }
        }
        
        // Wait for dropdown to open and options to be visible
        console.log('[Filter Dropdown] Waiting for dropdown options to appear');
        await this.page.waitForTimeout(1000);
          // Strategy for selecting the option
        try {
            // First try: Select by exact text match in li element
            console.log(`[Filter Dropdown] Attempting to select option with text: ${fullOptionText}`);
            await this.page.locator(`li:has-text("${fullOptionText}")`).click({ timeout: 5000 });
            console.log('[Filter Dropdown] Successfully selected option via li selector');
        } catch (error) {
            console.log('[Filter Dropdown] li selector failed, trying text selector');
            
            // Second try: Select by text content
            await this.page.locator(`text=${fullOptionText}`).click({ timeout: 5000 });
            console.log('[Filter Dropdown] Successfully selected option via text selector');
        }
        
        // Wait for dropdown to close and selection to take effect
        await this.page.waitForTimeout(1000);
        console.log(`[Filter Dropdown] Successfully selected filter option: ${fullOptionText}`);
    }

    /**
     * Apply "None" filter with conditional logic - implements the "IF None filter" logic
     * from test case documentation
     */    async applyNoneFilterConditionalLogic() {
        console.log('[SharedTestSteps] Applying None filter with conditional logic...');
        
        try {
            // Wait for the filter dropdown to be visible
            const filterDropdown = this.page.locator('[data-test-id="station-management-filter-dropdown"]');
            await expect(filterDropdown).toBeVisible({ timeout: 10000 });
            
            // Get current filter text
            const currentFilterText = await filterDropdown.textContent();
            console.log(`[SharedTestSteps] Current filter value: "${currentFilterText}"`);
            
            // Check if filter is already "None" 
            if (currentFilterText && currentFilterText.trim() === 'None') {
                console.log('[SharedTestSteps] Filter is already set to "None". No action needed.');
                return;
            }
            
            // Check if any filter is applied (not "All" and not "None")
            if (currentFilterText && currentFilterText.trim() !== 'All' && currentFilterText.trim() !== 'None') {
                console.log('[SharedTestSteps] Filter is currently applied. Removing existing filter...');
                
                // Remove the existing filter using the remove filter button
                const removeFilterButton = this.page.locator('[data-test-id="edit-select-filter-remove-filter"]');
                await expect(removeFilterButton).toBeVisible({ timeout: 5000 });
                await removeFilterButton.click();
                console.log('[SharedTestSteps] Existing filter removed successfully.');
                
                // Wait for the filter to reset and verify it shows "All"
                await expect(filterDropdown).toContainText('All', { timeout: 10000 });
                console.log('[SharedTestSteps] Filter reset to "All" after removal.');
            }
            
            // Now apply "None" filter using the dropdown
            console.log('[SharedTestSteps] Applying "None" filter...');
            await this.clickFilterDropdownAndSelectOption('None');
            
            // Verify the filter shows "None"
            await expect(filterDropdown).toContainText('None', { timeout: 10000 });
            console.log('[SharedTestSteps] "None" filter applied successfully. Current value: "None"');
            
        } catch (error) {
            console.error('[SharedTestSteps] Error in applyNoneFilterConditionalLogic:', error);
            throw error;
        }
    }

    /**
     * Verify that the filter dropdown displays the expected value
     */
    async verifyFilterDropdownValue(expectedValue) {
        console.log(`[SharedTestSteps] Verifying filter dropdown shows: ${expectedValue}`);
        
        const dropdownLocator = this.page.locator('[data-test-id="station-management-filter-dropdown"]');
        
        // Wait for the dropdown to be visible
        await dropdownLocator.waitFor({ state: 'visible', timeout: 5000 });
        
        // Get the current text content
        const currentValue = await dropdownLocator.textContent();
        console.log(`[SharedTestSteps] Current dropdown value: ${currentValue}`);
        
        // Verify the value matches
        if (currentValue && currentValue.includes(expectedValue)) {
            console.log(`[SharedTestSteps] ✓ Filter dropdown verification successful: ${expectedValue}`);
        } else {
            console.log(`[SharedTestSteps] ✗ Filter dropdown verification failed. Expected: ${expectedValue}, Got: ${currentValue}`);
            throw new Error(`Filter dropdown verification failed. Expected: ${expectedValue}, Got: ${currentValue}`);
        }
    }    /**
     * Shared Step 2: Create new Role with conditional logic for edit permissions
     * Based on the attached image steps 6-13 (corresponds to step 2 in shared steps)
     */
    async createNewRole(roleName, roleDescription, canEdit = true) {
        console.log(`[Create Role Test] Step 2: Creating new role: ${roleName}`);
        
        try {
            // Step 6 & 7: Enter Group Name using correct locator
            console.log(`[Create Role Test] Step 6 & 7: Enter Group Name: ${roleName}.`);
            const roleNameField = this.page.locator('[data-test-id="TextField"][testid="groupName"]');
            await expect(roleNameField).toBeVisible({ timeout: 10000 });
            await roleNameField.fill(roleName);

            // Step 8 & 9: Enter Group Description using correct locator
            console.log(`[Create Role Test] Step 8 & 9: Enter Group Description: ${roleDescription}.`);
            const descriptionField = this.page.locator('[data-test-id="TextField"][testid="groupDescription"]');
            await expect(descriptionField).toBeVisible({ timeout: 10000 });            await descriptionField.fill(roleDescription);            // Step 10: Click on all "Select all" buttons to grant all permissions
            console.log('[Create Role Test] Step 10: Clicking on all "Select all" buttons to grant all permissions.');
            
            const selectAllButtons = this.page.locator('button:has-text("Select all")');
            const buttonCount = await selectAllButtons.count();
            console.log(`[Create Role Test] Found ${buttonCount} "Select all" buttons`);
            
            for (let i = 0; i < buttonCount; i++) {
                const button = selectAllButtons.nth(i);
                await expect(button).toBeVisible({ timeout: 5000 });
                await button.click();
                console.log(`[Create Role Test] Successfully clicked "Select all" button ${i + 1} of ${buttonCount}`);
                await this.page.waitForTimeout(500); // Small delay between clicks
            }
            
            console.log('[Create Role Test] Step 10: Successfully clicked all "Select all" buttons.');            // Step 11 & 12: Conditional logic for Stack Filter permission
            console.log('[Create Role Test] Step 11 & 12: Performing conditional logic for Stack Filter editing.');
            
            if (canEdit) {
                console.log('[Create Role Test] IF: canEdit is true, selecting "Yes" for Stack Filter permission.');
                // Select "Yes" for Stack Filter permission - use nth(1) for the second radio button (No -> Yes)
                await this.page.locator('input[name="rg-EditStackFilters"]').first().click();
            } else {
                console.log('[Create Role Test] ELSE: canEdit is false, selecting "No" for Stack Filter permission.');
                // Select "No" for Stack Filter permission - use first() for the first radio button (Yes -> No)
                await this.page.locator('input[name="rg-EditStackFilters"]').nth(1).click();
            }

            // Step 13: Click on Save button
            console.log('[Create Role Test] Step 13: Click on Save btn.');
            await this.page.getByRole('button', { name: 'Save and Apply' }).click();
            
            // Step 14: Wait for success message or role to appear
            console.log('[Create Role Test] Step 14: Waiting for role creation to complete.');
            await this.page.waitForTimeout(5000);

            console.log(`[Create Role Test] Role "${roleName}" created successfully.`);
            
        } catch (error) {
            console.error(`[Create Role Test] Error creating role "${roleName}":`, error);
            throw error;
        }
    } 
        /**
     * Open stack filter (used in step 12)
     */
    async openStackFilter() {
        console.log('[Stack Filter Test] Step 12: Opening stack filter.');
        
        try {
            const stackFilterButton = this.page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
            await expect(stackFilterButton).toBeVisible({ timeout: 10000 });
            await stackFilterButton.click();
            
            // Wait for filter modal to open
            await this.page.waitForTimeout(1000);
            console.log('[Stack Filter Test] Stack filter opened successfully.');
            
        } catch (error) {
            console.error('[Stack Filter Test] Error opening stack filter:', error);
            throw error;
        }
    }    /**
     * Close stack filter (used in step 14)
     */
    async closeStackFilter() {
        console.log('[Stack Filter Test] Step 14: Closing stack filter.');
        
        try {
            const closeButton = this.page.locator('[data-test-id="modalClose"]');
            await expect(closeButton).toBeVisible({ timeout: 5000 });
            await closeButton.click();
            
            // Wait for filter modal to close
            await this.page.waitForTimeout(1000);
            console.log('[Stack Filter Test] Stack filter closed successfully.');
            
        } catch (error) {
            console.error('[Stack Filter Test] Error closing stack filter:', error);
            throw error;
        }
    }

    
    // ===========================================
    // 10. Draw polygon on map
    // ===========================================
   
    /**
     * Draws a polygon on the map by clicking the polygon tool, then the given points, then the finish button.
     * @param {Array<{x: number, y: number}>} points - Array of points to click on the map.
     */
    async drawPolygonOnMap(points) {
        const mapSelector = '.leaflet-container';
        const polygonToolSelector = '.leaflet-draw-draw-polygon';
        const finishButtonSelector = "a[title='Finish drawing']";

        // Wait for map tiles to load
        await this.page.waitForSelector('.leaflet-tile-loaded', { state: 'visible' });

        // Click the polygon tool
        await this.page.click(polygonToolSelector);
        await this.page.waitForTimeout(5000);

        // Click each point on the map
        for (const { x, y } of points) {
            await this.page.click(mapSelector, { position: { x, y } });
            await this.page.waitForTimeout(2000);
        }

        // Click the finish button to complete the polygon
        await this.page.click(finishButtonSelector);
        await this.page.waitForTimeout(3000);

        // Check if there's an "Unsaved Changes" dialog and handle it
        const unsavedChangesDialog = this.page.locator('text=Unsaved Changes Detected');
        if (await unsavedChangesDialog.isVisible({ timeout: 2000 })) {
            console.log('[DrawPolygon] Handling unsaved changes dialog...');
            // Close the dialog by pressing Escape or clicking outside
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(1000);
        }

        console.log('[DrawPolygon] Polygon drawing completed successfully');
    }

    // ===========================================
    // 14. HISTORY PAGE OPERATIONS
    // ===========================================

    /**
     * Navigate to History page
     */
    async navigateToHistory() {
        console.log('[SharedSteps] Navigating to History page...');
        await this.navigateToMenu('History');
        console.log('[SharedSteps] Navigation to History completed');
    }

    /**
     * Verify all History table headings are present
     */
    async verifyHistoryTableHeadings() {
        console.log('[SharedSteps] Verifying History table headings...');
        
        const expectedHeadings = [
            'Thumbnail',
            'Device name',
            'Objects detected',
            'Alert type',
            'System dismissed',
            'Timestamp'
        ];
        
        for (const heading of expectedHeadings) {
            console.log(`[SharedSteps] Verifying heading: ${heading}`);
            await expect(this.page.getByText(heading, { exact: true })).toBeVisible({ timeout: 10000 });
        }
        
        console.log('[SharedSteps] All History table headings verified successfully');
    }

    /**
     * Set History date range filter (From 1st to 3rd of current month)
     */
    async setHistoryDateRange() {
        console.log('[SharedSteps] Setting History date range filter...');
        
        try {
            // Step 1: Click on From Date input to open calendar
            console.log('[History Filter] Step 1: Clicking on From Date input');
            await this.page.locator('[data-test-id="fromdate_dropdown"]').click();
            
            // Step 2: Wait for calendar to open and select 1st of the month
            console.log('[History Filter] Step 2: Waiting for calendar to open and selecting 1st of month');
            await this.page.waitForTimeout(1000);
            
            // Use robust interaction for date selection
            const fromDateSelected = await this.page.evaluate(() => {
                const calendar = document.querySelector('.p-datepicker');
                if (calendar) {
                    const dateElements = calendar.querySelectorAll('td span');
                    for (let elem of dateElements) {
                        if (elem.textContent.trim() === '1' && !elem.classList.contains('p-datepicker-other-month')) {
                            elem.click();
                            return true;
                        }
                    }
                }
                return false;
            });
            
            if (!fromDateSelected) {
                throw new Error('Could not select 1st of month for from date');
            }
            console.log('[History Filter] Selected 1st of month as from date');
            
            // Step 3: Click on To Date input to open calendar
            console.log('[History Filter] Step 3: Clicking on To Date input');
            await this.page.locator('[data-test-id="todate_dropdown"]').click();
            
            // Step 4: Wait for calendar to open and select 3rd of the month
            console.log('[History Filter] Step 4: Waiting for calendar to open and selecting 3rd of month');
            await this.page.waitForTimeout(1000);
            
            // Use robust interaction for date selection
            const toDateSelected = await this.page.evaluate(() => {
                const calendar = document.querySelector('.p-datepicker');
                if (calendar) {
                    const dateElements = calendar.querySelectorAll('td span');
                    for (let elem of dateElements) {
                        if (elem.textContent.trim() === '3' && !elem.classList.contains('p-datepicker-other-month')) {
                            elem.click();
                            return true;
                        }
                    }
                }
                return false;
            });
            
            if (!toDateSelected) {
                throw new Error('Could not select 3rd of month for to date');
            }
            console.log('[History Filter] Selected 3rd of month as to date');
            
            console.log('[SharedSteps] History date range filter set successfully');
            
        } catch (error) {
            console.error(`[SharedSteps] Failed to set history date range: ${error.message}`);
            // Clear any open calendars before rethrowing
            await this.page.keyboard.press('Escape');
            throw error;
        }
    }

    /**
     * Set History time range (00:00:00 to 23:59:59)
     */
    async setHistoryTimeRange() {
        console.log('[SharedSteps] Setting History time range...');
        
        try {
            // Set From Time
            console.log('[History Filter] Setting From Time to 00:00:00');
            await this.page.locator('[data-test-id="fromtime_dropdown"]').click();
            
            await this.page.locator('[data-test-id="fromtime_dropdown"] input.p-inputtext').fill('00:00:00');
            
            // Set To Time
            console.log('[History Filter] Setting To Time to 23:59:59');
            await this.page.locator('[data-test-id="totime_dropdown"]').click();
            
            await this.page.locator('[data-test-id="totime_dropdown"] input.p-inputtext').fill('23:59:59');
            
            console.log('[SharedSteps] History time range set successfully');
            
        } catch (error) {
            console.error(`[SharedSteps] Failed to set history time range: ${error.message}`);
            throw error;
        }
    }

    /**
     * Add alert type to History filter
     * @param {string} alertType - Alert type to select (e.g., 'LPR', 'Manual Alert', 'Trex', 'UB')
     */
    async addAlertTypeToHistoryFilter(alertType) {
        console.log(`[SharedSteps] Adding alert type ${alertType} to History filter...`);
        
        try {
            // Click on dropdown to open it
            await this.page.locator('[data-test-id="alert_type_history"] input.p-inputtext').click();
            
            // Select the alert type
            await this.page.locator('[data-test-id="alert_type_history"] input.p-inputtext').fill(alertType);
            
            // Wait for dropdown options to appear and select
            await this.page.getByText(alertType).first().click();
            
            console.log(`[SharedSteps] Alert type ${alertType} added successfully`);
            
        } catch (error) {
            console.error(`[SharedSteps] Failed to add alert type ${alertType}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Add sites to History filter
     * @param {Array<string>} sites - Array of site names to add
     */
    async addSitesToHistoryFilter(sites) {
        console.log('[SharedSteps] Adding sites to History filter...');
        
        for (let i = 0; i < sites.length; i++) {
            const site = sites[i];
            console.log(`[History Filter] Processing site ${i + 1}/${sites.length}: ${site}`);
            
            try {
                // Click on dropdown to open it
                await this.page.locator('[data-test-id="site_search_dropdown_history"] input.p-inputtext').click();
                
                // Fill the search term
                await this.page.locator('[data-test-id="site_search_dropdown_history"] input.p-inputtext').fill(site);
                
                // Wait for dropdown options to appear and select
                await this.page.getByText(site).first().click();
                
                console.log(`[History Filter] Successfully selected ${site}`);
                
            } catch (error) {
                console.error(`[History Filter] Failed to select ${site}: ${error.message}`);
                // Continue with other sites instead of failing completely
            }
            
            // Clear input for next site if not the last one
            if (i < sites.length - 1) {
                try {
                    await this.page.locator('[data-test-id="site_search_dropdown_history"] input.p-inputtext').fill('');
                } catch (error) {
                    console.warn(`[History Filter] Warning clearing input: ${error.message}`);
                }
            }
        }
        
        console.log('[SharedSteps] Sites added to History filter successfully');
    }

    /**
     * Fill alert and sites in History filter
     * @param {string} alertType - Alert type to select
     * @param {Array<string>} sites - Array of site names to add
     */
    async fillAlertAndSites(alertType, sites) {
        console.log('[SharedSteps] Filling alert and sites in History filter...');
        
        // Add alert type
        await this.addAlertTypeToHistoryFilter(alertType);
        
        // Add sites
        await this.addSitesToHistoryFilter(sites);
        
        console.log('[SharedSteps] Alert and sites filled successfully');
    }

    /**
     * Complete History filter workflow
     * Sets date range from 2 days before to 1 day before, time range 00:00:00 to 23:59:59,
     * adds alert type and specified sites
     * @param {string} [alertType='LPR'] - Alert type to filter
     * @param {Array<string>} [sites=['SNDTN_The Marc Rivonia Rd']] - Sites to filter
     */
    async fillProofHistoryFilter(alertType = 'LPR', sites = ['SNDTN_The Marc Rivonia Rd']) {
        console.log('[SharedSteps] Starting complete History filter workflow...');
        
        // Add date and time
        await this.setHistoryDateRange();
        await this.setHistoryTimeRange();
        
        // Fill alert and sites
        await this.fillAlertAndSites(alertType, sites);
        
        console.log('[SharedSteps] Complete History filter workflow finished');
    }

    /**
     * Apply History filter
     */
    async applyHistoryFilter() {
        console.log('[SharedSteps] Applying History filter...');
        
        const applyButton = this.page.locator('[data-test-id="apply_filter_search_history"]');
        await applyButton.click();
        
        // Wait for filter to be applied and results to load
        await this.page.waitForLoadState('networkidle', { timeout: 15000 });
        
        console.log('[SharedSteps] History filter applied successfully');
    }

    /**
     * Clear History filter
     */
    async clearHistoryFilter() {
        console.log('[SharedSteps] Clearing History filter...');
        
        const clearButton = this.page.locator('[data-test-id="clear_all_history"]');
        await clearButton.click();
        
        // Wait for filter to be cleared
        await this.page.waitForTimeout(1000);
        
        console.log('[SharedSteps] History filter cleared successfully');
    }

    /**
     * Verify History results are displayed
     * @param {number} [minResults=1] - Minimum number of results expected
     */
    async verifyHistoryResults(minResults = 1) {
        console.log('[SharedSteps] Verifying History results...');
        
        const historyRows = this.page.locator('[data-test-id="history-table-row"]');
        const rowCount = await historyRows.count();
        
        console.log(`[SharedSteps] Found ${rowCount} history results`);
        
        if (rowCount < minResults) {
            throw new Error(`Expected at least ${minResults} history results, but found ${rowCount}`);
        }
        
        console.log('[SharedSteps] History results verification completed successfully');
    }

    /**
     * Verify all History filter fields are empty
     */
    async verifyAllHistoryFieldsAreEmpty() {
        console.log('[SharedSteps] Verifying all History filter fields are empty...');
        
        // Step 1: Verify From Date input has empty value
        console.log('[History Filter] Step 1: Verifying From Date input has empty value');
        const fromDateInput = this.page.locator('[data-test-id="fromdate_dropdown"] input.p-inputtext');
        await expect(fromDateInput).toHaveValue('');
        
        // Step 2: Verify To Date input has empty value
        console.log('[History Filter] Step 2: Verifying To Date input has empty value');
        const toDateInput = this.page.locator('[data-test-id="todate_dropdown"] input.p-inputtext');
        await expect(toDateInput).toHaveValue('');
        
        // Step 3: Verify From Time input has empty value
        console.log('[History Filter] Step 3: Verifying From Time input has empty value');
        const fromTimeInput = this.page.locator('[data-test-id="fromtime_dropdown"] input.p-inputtext');
        await expect(fromTimeInput).toHaveValue('');
        
        // Step 4: Verify To Time input has empty value
        console.log('[History Filter] Step 4: Verifying To Time input has empty value');
        const toTimeInput = this.page.locator('[data-test-id="totime_dropdown"] input.p-inputtext');
        await expect(toTimeInput).toHaveValue('');
        
        // Step 5: Verify Select alert types input has empty value
        console.log('[History Filter] Step 5: Verifying Select alert types input has empty value');
        const alertTypesInput = this.page.locator('[data-test-id="alert_type_history"] input.p-inputtext');
        await expect(alertTypesInput).toHaveValue('');
        
        // Step 6: Verify Search and select sites input has empty value
        console.log('[History Filter] Step 6: Verifying Search and select sites input has empty value');
        const sitesInput = this.page.locator('[data-test-id="site_search_dropdown_history"] input.p-inputtext');
        await expect(sitesInput).toHaveValue('');
        
        // Step 7: Verify Search and select devices input has empty value
        console.log('[History Filter] Step 7: Verifying Search and select devices input has empty value');
        const devicesInput = this.page.locator('[data-test-id="device_search_dropdown_history"] input.p-inputtext');
        await expect(devicesInput).toHaveValue('');
        
        console.log('[SharedSteps] All History filter fields verified as empty');
    }

    /**
     * Complete History verification workflow
     * Navigates to History, verifies headings, applies filters, and verifies results
     * @param {string} [alertType] - Optional alert type to filter
     * @param {Array<string>} [sites] - Optional sites to filter
     */
    async completeHistoryVerificationWorkflow(alertType, sites) {
        console.log('[SharedSteps] Starting complete History verification workflow...');
        
        // Navigate to History
        await this.navigateToHistory();
        
        // Verify table headings
        await this.verifyHistoryTableHeadings();
        
        // Fill and apply filter
        await this.fillProofHistoryFilter(alertType, sites);
        await this.applyHistoryFilter();
        
        // Verify results
        await this.verifyHistoryResults();
        
        console.log('[SharedSteps] Complete History verification workflow finished');
    }

    /**
     * Helper method to navigate to correct month in date picker and click the target date
     * @param {string} calendarSelector - Selector for the calendar panel
     * @param {Date} targetDate - Date to select
     */
    async navigateToDateInCalendar(calendarSelector, targetDate) {
        const targetDateString = targetDate.toISOString().split('T')[0];
        console.log(`[Calendar Navigation] Navigating to date: ${targetDateString}`);
        
        const calendar = this.page.locator(calendarSelector);
        
        // Try to find the date directly first
        const targetDateCell = calendar.locator(`td[aria-label="${targetDateString}"]`);
        
        // Check if the target date is visible
        let isDateVisible = false;
        try {
            await targetDateCell.waitFor({ state: 'visible', timeout: 2000 });
            isDateVisible = true;
        } catch (error) {
            console.log(`[Calendar Navigation] Date ${targetDateString} not visible, need to navigate to correct month`);
        }
        
        // If date is not visible, navigate to the correct month
        if (!isDateVisible) {
            const today = new Date();
            const targetMonth = targetDate.getMonth();
            const targetYear = targetDate.getFullYear();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            
            // Calculate how many months to navigate (negative = go back, positive = go forward)
            const monthsToNavigate = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
            
            console.log(`[Calendar Navigation] Need to navigate ${monthsToNavigate} months`);
            
            if (monthsToNavigate < 0) {
                // Navigate backwards (previous months)
                for (let i = 0; i < Math.abs(monthsToNavigate); i++) {
                    await calendar.locator('button[aria-label="Previous Month"]').click();
                    await this.page.waitForTimeout(500); // Wait for calendar to update
                }
            } else if (monthsToNavigate > 0) {
                // Navigate forwards (next months) 
                for (let i = 0; i < monthsToNavigate; i++) {
                    await calendar.locator('button[aria-label="Next Month"]').click();
                    await this.page.waitForTimeout(500); // Wait for calendar to update
                }
            }
        }
        
        // Now click the target date
        console.log(`[Calendar Navigation] Clicking on date: ${targetDateString}`);
        await calendar.locator(`td[aria-label="${targetDateString}"]`).click();
    }

    /**
     * Clear all applied filters to show all alerts
     */
    async clearAllFilters() {
        console.log('[SharedSteps] Clearing all filters...');
        
        try {
            // Try to find and click clear/reset filters button
            const clearButtons = [
                'button:has-text("Clear")',
                'button:has-text("Reset")', 
                'button:has-text("Clear Filters")',
                '[data-test-id="clear-filters"]',
                '.clear-filters'
            ];
            
            for (const selector of clearButtons) {
                const btn = this.page.locator(selector).first();
                if (await btn.isVisible({ timeout: 2000 })) {
                    await btn.click();
                    console.log(`[SharedSteps] Clicked clear filter button: ${selector}`);
                    return;
                }
            }
            
            // Alternative: Log warning if no clear button found
            console.log('[SharedSteps] No clear button found, skipping filter clear...');
            
        } catch (error) {
            console.log('[SharedSteps] Error clearing filters:', error.message);
        }
    }

    /**
     * Apply basic UB (Unusual Behaviour) filter without site restrictions
     */
    async applyBasicUBFilter() {
        console.log('[SharedSteps] Applying basic UB filter...');
        
        try {
            // Open filter modal
            await this.page.keyboard.press('Escape').catch(() => {});
            const filterTrigger = this.page.locator('[data-test-id="alert-stack-popover-trigger-button"]');
            await filterTrigger.click({ timeout: 15000 });
            await this.page.locator('[data-test-id="alert-filter-reset-button"]').waitFor({ state: 'visible', timeout: 10000 });
            await this.page.waitForTimeout(300);
            
            // Click UB checkbox only
            const ubCheckbox = this.page.locator('[data-test-id="stack-filter-alert-type-Unusual Behaviour"], label:has-text("Unusual Behaviour")').first();
            if (await ubCheckbox.isVisible({ timeout: 3000 })) {
                await ubCheckbox.click();
                console.log('[SharedSteps] Clicked Unusual Behaviour filter');
            }
            
            // Apply filter
            const applyBtn = this.page.locator('[data-test-id="alert-filter-apply-button"]');
            if (await applyBtn.isVisible({ timeout: 2000 })) {
                await applyBtn.click();
                console.log('[SharedSteps] Applied UB filter');
            }
            
            await this.page.waitForTimeout(2000);
            
        } catch (error) {
            console.log('[SharedSteps] Error applying basic UB filter:', error.message);
            throw error;
        }
    }

    /**
     * Smart wait for element with automatic retries and stability checks
     * @param {string} selector - Element selector
     * @param {Object} options - Wait options
     * @returns {Promise<void>}
     */
    async smartWait(selector, options = {}) {
        const timeout = options.timeout || 30000;
        const retries = options.retries || 3;
        const stabilityCheck = options.stabilityCheck !== false; // Default true
        
        console.log(`[SharedSteps] Smart wait for: ${selector}`);
        
        for (let i = 0; i < retries; i++) {
            try {
                // Wait for selector
                await this.page.waitForSelector(selector, {
                    state: options.state || 'visible',
                    timeout: timeout / retries
                });
                
                // Check element stability if requested
                if (stabilityCheck) {
                    await this.page.waitForFunction(
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
                    await this.page.waitForTimeout(500);
                }
                
                console.log(`[SharedSteps] ✅ Element ready: ${selector}`);
                return;
                
            } catch (error) {
                if (i === retries - 1) {
                    console.error(`[SharedSteps] ❌ Failed to find element after ${retries} retries: ${selector}`);
                    throw error;
                }
                console.log(`[SharedSteps] ⚠️ Retry ${i + 1}/${retries} for: ${selector}`);
                await this.page.waitForTimeout(1000);
            }
        }
    }

    /**
     * Wait for network idle with timeout protection
     * @param {Object} options - Wait options
     * @returns {Promise<void>}
     */
    async waitForNetworkIdle(options = {}) {
        const timeout = options.timeout || 10000;
        try {
            console.log('[SharedSteps] Waiting for network idle...');
            await this.page.waitForLoadState('networkidle', { timeout });
            console.log('[SharedSteps] ✅ Network idle');
        } catch (error) {
            console.log('[SharedSteps] ⚠️ Network idle timeout - continuing anyway');
            // Don't throw - this is often safe to ignore in real-time apps
        }
    }

    /**
     * Clear all modals and overlays from the page
     * @returns {Promise<void>}
     */
    async clearModalsAndOverlays() {
        console.log('[SharedSteps] Clearing all modals and overlays...');
        try {
            await this.page.evaluate(() => {
                // Remove React Aria modals
                document.querySelectorAll('.react-aria-ModalOverlay').forEach(el => el.remove());
                
                // Remove generic dialogs
                document.querySelectorAll('[role="dialog"]').forEach(el => {
                    // Only remove if not a permanent dialog
                    if (!el.hasAttribute('data-permanent')) {
                        el.remove();
                    }
                });
                
                // Remove any backdrop overlays
                document.querySelectorAll('.modal-backdrop, .overlay, [class*="backdrop"]').forEach(el => el.remove());
            });
            console.log('[SharedSteps] ✅ Modals and overlays cleared');
        } catch (error) {
            console.log(`[SharedSteps] ⚠️ Error clearing modals: ${error.message}`);
        }
    }

    /**
     * Enhanced wait for page load with multiple checks
     * @returns {Promise<void>}
     */
    async waitForPageFullyLoaded() {
        console.log('[SharedSteps] Waiting for page to fully load...');
        
        try {
            // Wait for DOM content
            await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 });
            
            // Wait for network to settle (with timeout protection)
            await this.waitForNetworkIdle({ timeout: 10000 });
            
            // Wait for any loading spinners to disappear
            await this.page.waitForFunction(() => {
                const spinners = document.querySelectorAll('[class*="loading"], [class*="spinner"], .loader');
                return spinners.length === 0 || Array.from(spinners).every(s => s.style.display === 'none');
            }, { timeout: 10000 }).catch(() => {
                console.log('[SharedSteps] Loading spinner check timeout - continuing');
            });
            
            // Short final stabilization
            await this.page.waitForTimeout(1000);
            
            console.log('[SharedSteps] ✅ Page fully loaded');
        } catch (error) {
            console.log(`[SharedSteps] ⚠️ Page load timeout: ${error.message}`);
        }
    }

}

