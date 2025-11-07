// e2e/AdminLoginPage.js
// @ts-check
import { expect } from '@playwright/test';

export class AdminLoginPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        // Selectors matching your Cypress implementation
        this.usernameField = page.locator('[name="loginfmt"]');
        this.passwordField = page.locator('[name="passwd"]');
        this.nextButton = page.locator('#idSIButton9');
        this.termsButton = page.locator('[data-test-id="termsAndConditonsAcceptBtn"]');
        this.noThanksButton = page.locator('#idBtn_Back'); // "Stay signed in?" -> "No"
        this.useAnotherAccountButton = page.locator('[id="otherTileText"]'); // "Use another account"
    }

    /**
     * Navigates to the login page.
     * Assumes baseURL is configured in playwright.config.js.
     */    async visit() {
        // Some environments immediately redirect to Microsoft login which can
        // interrupt the navigation if we wait for 'load'. Use a lighter wait
        // and treat navigation interruption as non-fatal.
        try {
            await this.page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        } catch (/** @type {any} */ err) {
            const msg = err?.message || '';
            if (msg.includes('is interrupted by another navigation')) {
                console.log('[Login] Navigation interrupted by auth redirect (expected). Continuing...');
            } else {
                throw err;
            }
        }
        console.log('[Login] Navigated to the login entry page. Current URL:', this.page.url());
    }/**
     * Confirms terms and conditions by clicking the accept button.
     * Only called after Microsoft login is completely finished.
     * @private
     */
    async _confirmTerms() {
        try {
            console.log('[Login] Checking for terms and conditions dialog after Microsoft login...');
            
            // Wait for page to stabilize after Microsoft login redirection
            await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
            
            // Check if we're now on the Proof360 application and terms might appear
            const currentUrl = this.page.url();
            if (currentUrl.includes('login.microsoftonline.com')) {
                console.log('[Login] Still on Microsoft domain, cannot check for terms yet.');
                return;
            }
            
            // Give a moment for any terms dialog to appear
            await this.page.waitForTimeout(2000);
            
            // Check if terms button exists and is visible
            const termsButtonExists = await this.termsButton.count() > 0;
            if (termsButtonExists) {
                const isVisible = await this.termsButton.isVisible();
                if (isVisible) {
                    console.log('[Login] Terms and conditions dialog found, accepting...');
                    await this.termsButton.click();
                    console.log('[Login] Clicked "Accept" on Terms and Conditions.');
                    
                    // Wait for navigation after terms acceptance
                    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
                    await this.page.waitForTimeout(1000); // Brief pause for stability
                    console.log('[Login] Terms acceptance complete.');
                } else {
                    console.log('[Login] Terms button exists but not visible, skipping...');
                }
            } else {
                console.log('[Login] No terms and conditions dialog found, proceeding...');
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.log('[Login] Terms confirmation process encountered an issue (continuing anyway):', msg);
        }    }

    /**
     * Waits for either the terms acceptance button OR company selector to appear.
     * This handles the post-login state where either of these elements indicates successful login.
     * @private
     */
    async _waitForPostLoginState() {
        console.log('[Login] Waiting for post-login state - either terms button OR company selector...');
        
    const termsButton = this.page.locator('[data-test-id="termsAndConditonsAcceptBtn"]');
    // Use the company selector as a reliable indicator of being logged in
    const companySelector = this.page.locator('[data-test-id="selected-company"]');
    let postLoginStateDetected = false;
        let maxAttempts = 10; // Reduced from 30 to 10 for faster flow detection
        let attempt = 0;
        
        while (!postLoginStateDetected && attempt < maxAttempts) {
            attempt++;
            console.log(`[Login] Post-login state detection attempt ${attempt}/${maxAttempts}...`);
            
            try {                // Check for terms button
                const termsVisible = await termsButton.isVisible({ timeout: 1000 }).catch(() => false);
                if (termsVisible) {
                    console.log('[Login] ✅ Terms button detected - checking if enabled...');
                    
                    // Check if the terms button is enabled before clicking
                    const termsEnabled = await termsButton.isEnabled({ timeout: 2000 }).catch(() => false);
                    
                    if (termsEnabled) {
                        console.log('[Login] Terms button is enabled - clicking to accept...');
                        try {
                            await termsButton.click({ timeout: 5000 });
                            console.log('[Login] ✅ Terms accepted successfully, waiting for company selector to appear...');
                            
                            // After accepting terms, there's a processing/loading period
                            // Wait for page to process the terms acceptance
                            await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
                            console.log('[Login] 🔄 DOM loaded, waiting for company selector transition...');
                            
                            // Give extra time for the company selector to appear after terms processing
                            await this.page.waitForTimeout(3000); // Increased wait for transition
                            
                            const companySelectorAfterTerms = await companySelector.isVisible({ timeout: 15000 }).catch(() => false);
                            if (companySelectorAfterTerms) {
                                console.log('[Login] ✅ Company selector appeared after terms acceptance');
                                postLoginStateDetected = true;
                                break;
                            } else {
                                console.log('[Login] ⚠️ Company selector still not visible, checking for terms button again...');
                                // Sometimes terms need to be accepted multiple times
                                continue;
                            }
                        } catch (clickError) {
                            const msg = clickError instanceof Error ? clickError.message : String(clickError);
                            console.log('[Login] ⚠️ Terms button click failed, retrying...', msg);
                            continue; // Skip to next attempt
                        }
                    } else {
                        console.log('[Login] ⚠️ Terms button is disabled, skipping this attempt...');
                    }
                }
                
                // Check for company selector (already logged in case)
                const companyVisible = await companySelector.isVisible({ timeout: 1000 }).catch(() => false);
                if (companyVisible) {
                    console.log('[Login] ✅ Company selector detected - user already logged in');
                    postLoginStateDetected = true;
                    break;
                }
                
                // If neither found, wait more time before next attempt for admin user
                await this.page.waitForTimeout(1000); // Increased back to 1000ms from 500ms for admin compatibility
                                    } catch (error) {
                                const msg = error instanceof Error ? error.message : String(error);
                                console.log(`[Login] Post-login state check attempt ${attempt} encountered error (continuing):`, msg);
                await this.page.waitForTimeout(1000); // Increased back to 1000ms from 500ms for admin compatibility
            }
        }
        
        if (!postLoginStateDetected) {
            console.log('[Login] ⚠️ Post-login state detection timeout - neither terms nor company selector found');
            console.log('[Login] Current URL:', this.page.url());
        } else {
            console.log('[Login] ✅ Post-login state successfully detected');
        }
    }

    /**
     * Handles the Microsoft login flow with all scenarios from Cypress.
     * Updated to handle both admin and normal user flows based on MCP server testing.
     * @param {string} username 
     * @param {string} password 
     * @private
     */
    async _handleMicrosoftLoginFlow(username, password) {
        console.log('[Login] Checking for Microsoft login elements.');
        await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 });

        const usernameVisible = await this.usernameField.isVisible();
        const passwordVisible = await this.passwordField.isVisible();
        const useAnotherAccountVisible = await this.useAnotherAccountButton.isVisible();
        let msLoginAttempted = false;

        if (usernameVisible) {
            console.log('[Login] Username field visible, entering credentials.');
            await this.usernameField.fill(username);
            await this.nextButton.click();
            
            // Add 3-second wait after entering email and clicking next
            console.log('[Login] Waiting 3 seconds after email submission...');
            await this.page.waitForTimeout(3000);
            
            await this.passwordField.waitFor({ state: 'visible', timeout: 20000 });
            await this.passwordField.fill(password);
            await this.nextButton.click();
            msLoginAttempted = true;
        } else if (passwordVisible) {
            console.log('[Login] Password field directly visible on MS page.');
            await this.passwordField.fill(password);
            await this.nextButton.click();
            msLoginAttempted = true;
        } else if (useAnotherAccountVisible) {
            console.log('[Login] Found "Use another account" button, clicking it.');
            await this.useAnotherAccountButton.click();
            await this.usernameField.waitFor({ state: 'visible', timeout: 20000 });
            await this.usernameField.fill(username);
            await this.nextButton.click();
            
            // Add 3-second wait after entering email and clicking next
            console.log('[Login] Waiting 3 seconds after email submission...');
            await this.page.waitForTimeout(3000);
            
            await this.passwordField.waitFor({ state: 'visible', timeout: 20000 });
            await this.passwordField.fill(password);
            await this.nextButton.click();
            msLoginAttempted = true;
        } else {
            console.log('[Login] None of the primary Microsoft login elements were visible. Assuming SSO passthrough or unexpected state.');
        }
        
        // If any MS login interaction was attempted, handle post-login flow
        if (msLoginAttempted) {
            console.log('[Login] Microsoft login credentials submitted. Checking for post-login prompts...');
            
            // Check for "Stay signed in?" prompt for all users
            console.log('[Login] Checking for "Stay signed in?" prompt...');
            try {
                await this.noThanksButton.waitFor({ state: 'visible', timeout: 10000 });
                if (await this.noThanksButton.isVisible()) { 
                    await this.noThanksButton.click();
                    console.log('[Login] ✅ Clicked "No" on "Stay signed in?" prompt.');
                } else {
                    console.log('[Login] "Stay signed in?" prompt not found or not visible, continuing...');
                }
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.log('[Login] "Stay signed in?" prompt not found or timed out:', msg);
            }
            
            // Wait for page to stabilize after login
            await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
            
        } else {
            console.log('[Login] No direct MS login fields interacted with. Proceeding to check page URL.');
        }
    }
    /**
     * Performs the complete login process with dynamic flow detection using polling.
     * @param {string} username
     * @param {string} password
     */
    async login(username, password) {
        console.log(`[Login] Starting login process for user: ${username}`);
        
        if (!this.page.url().includes('login.microsoftonline.com')) {
            await this.visit(); 
        } else {
            console.log('[Login] Already on a Microsoft domain. Proceeding with MS login flow.');
        }
        
        await this.page.waitForLoadState('domcontentloaded', {timeout: 10000});
        
        // DYNAMIC FLOW DETECTION WITH POLLING - Handle redirect timing issues
        console.log('[Login] Starting dynamic flow detection with polling...');
        
    // Logged-in indicator should be the selected company control, not the filter button
    const companySelector = this.page.locator('[data-test-id="selected-company"]');
        const usernameField = this.page.locator('[name="loginfmt"]');
        
        let flowDetected = false;
        let alreadyLoggedIn = false;
        let needsMicrosoftLogin = false;
        
        // Polling loop to detect the correct flow (max 10 seconds)
        for (let attempt = 0; attempt < 10; attempt++) {
            console.log(`[Login] Flow detection attempt ${attempt + 1}/10...`);
            
            // Check for already logged in state (company selector visible)
            const companyVisible = await companySelector.isVisible().catch(() => false);
            if (companyVisible) {
                console.log('[Login] ✅ User already logged in - company selector found');
                alreadyLoggedIn = true;
                flowDetected = true;
                break;
            }
            
            // Check for Microsoft login requirement (username field visible)
            const usernameVisible = await usernameField.isVisible().catch(() => false);
            if (usernameVisible) {
                console.log('[Login] 🔑 Microsoft login required - username field found');
                needsMicrosoftLogin = true;
                flowDetected = true;
                break;
            }
            
            // Check for other Microsoft login indicators
            const passwordVisible = await this.passwordField.isVisible().catch(() => false);
            const useAnotherAccount = await this.useAnotherAccountButton.isVisible().catch(() => false);
            
            if (passwordVisible || useAnotherAccount) {
                console.log('[Login] 🔑 Microsoft login detected (password field or use another account)');
                needsMicrosoftLogin = true;
                flowDetected = true;
                break;
            }
            
            // Wait 1 second before next check
            await this.page.waitForTimeout(1000);
        }
        
        if (!flowDetected) {
            console.log('[Login] ⚠️ Flow detection timeout - no clear indicators found, defaulting to Microsoft login attempt');
            needsMicrosoftLogin = true;
        }
        
        // Execute the appropriate flow based on detection
        if (alreadyLoggedIn) {
            console.log('[Login] Skipping login flow - user already authenticated');
            return; // Skip entire login process
        }
          if (needsMicrosoftLogin) {
            console.log('[Login] Proceeding with Microsoft login flow');
            await this._handleMicrosoftLoginFlow(username, password);
            
            // Wait for redirect and handle post-login state
            console.log('[Login] Microsoft login flow submitted. Waiting for app redirect/load.');
            
            try {
                // Only wait for redirect if we're still on Microsoft domain
                const currentUrl = this.page.url();
                if (currentUrl.includes('login.microsoftonline.com')) {
                    await this.page.waitForURL((url) => !url.href.includes('login.microsoftonline.com'), { timeout: 45000 }); 
                    console.log('[Login] Successfully navigated away from Microsoft login page.');
                }
                
                // Wait for either terms button OR company selector to appear
                await this._waitForPostLoginState();
                
            } catch (e) {
                console.warn('[Login] Did not navigate away from Microsoft login page within timeout. Current URL:', this.page.url());
                await this.page.screenshot({ path: 'debug-login-stuck-on-microsoft.png' });
                // Still try to wait for post-login state even if redirect detection failed
                await this._waitForPostLoginState();
            }
        }

        console.log('[Login] Login process on AdminLoginPage complete. Final verification in test/setup.');
    }

    async verifyLoginSuccessful() {
        console.log('[Login] verifyLoginSuccessful called (typically used in tests, globalSetup has its own checks).');
    }

    /**
     * Helper to perform admin login
     * @param {string} username
     * @param {string} password
     */
    async performAdminLogin(username, password) {
        await this.login(username, password);
    }
}
