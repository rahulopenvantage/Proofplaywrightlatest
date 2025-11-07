// e2e/global.setup.js
import { chromium } from '@playwright/test';
import { AdminLoginPage } from './AdminLoginPage.js';
import { SessionManager } from './SessionManager.js';
import { testArtifactsCleanup } from './TestArtifactsCleanup.js';
import dotenv from 'dotenv';
import path from 'path';

// Resolve __dirname for ES modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ADMIN_USERNAME = process.env.ADMIN_MS_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_MS_PASSWORD;
const NORMAL_USERNAME = process.env.NORMAL_MS_USERNAME;
const NORMAL_PASSWORD = process.env.NORMAL_MS_PASSWORD;

async function setupUserSession(userType, username, password, baseURL) {
  console.log(`[GlobalSetup] Setting up ${userType} user session...`);
  
  const sessionManager = new SessionManager(userType);
  
  // Check if we already have a valid session
  const hasValidSession = await sessionManager.hasValidSession();
  if (hasValidSession) {
    console.log(`[GlobalSetup] Valid ${userType} session found, skipping login`);
    return;
  }

  console.log(`[GlobalSetup] No valid ${userType} session found, performing login...`);
  
  const browser = await chromium.launch({ 
    headless: !process.env.PWDEBUG && !process.argv.includes('--headed'),
  });
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    const adminLoginPage = new AdminLoginPage(page);
    console.log(`[GlobalSetup] Attempting ${userType} login with username: ${username ? 'provided' : 'NOT PROVIDED'}`);
    
    if (!username || !password) {
      console.log(`[GlobalSetup] Username or Password not provided for ${userType} user, skipping setup`);
      return;
    }
    
    await adminLoginPage.login(username, password);
    console.log(`[GlobalSetup] ${userType} login method called. Verifying login success...`);
    
    await page.waitForURL('**/command', { timeout: 60000 });
    console.log(`[GlobalSetup] ${userType} successfully navigated to /command. Login appears successful.`);

    console.log(`[GlobalSetup] Waiting for network idle before saving ${userType} state...`);
    

    await page.context().storageState({ path: sessionManager.getStorageStatePath() });
    await sessionManager.markSessionValid();
    console.log(`[GlobalSetup] ${userType} storage state saved and session marked as valid`);
  } catch (error) {
    console.error(`[GlobalSetup] Error during ${userType} login and saving storage state:`, error);
    
    // Try to take screenshot for debugging, but don't let it fail the setup
    try {
      await page.screenshot({ path: `debug-global-setup-${userType}-login-failed.png`, fullPage: true });
    } catch (screenshotError) {
      console.warn(`[GlobalSetup] Could not take debug screenshot for ${userType}:`, screenshotError.message);
    }
    
    // Don't throw error for missing normal user - some environments might not have it
    if (userType === 'admin') {
      throw error;
    }
  } finally {
    await browser.close();
    console.log(`[GlobalSetup] ${userType} browser closed.`);
  }
}

async function globalSetup(config) {
  console.log('[GlobalSetup] Starting global setup...');
  
  // Clean test artifacts before starting test run
  try {
    await testArtifactsCleanup.cleanup();
  } catch (error) {
    console.warn('[GlobalSetup] Warning: Cleanup failed, continuing with setup:', error.message);
  }
  
  // Ensure baseURL is correctly accessed
  const baseURL = config.projects && config.projects[0] && config.projects[0].use && config.projects[0].use.baseURL 
                  ? config.projects[0].use.baseURL 
                  : 'https://uat.proof360.io/';

  // Setup admin session (required)
  await setupUserSession('admin', ADMIN_USERNAME, ADMIN_PASSWORD, baseURL);
  
  // Setup normal user session (optional)
  await setupUserSession('normal', NORMAL_USERNAME, NORMAL_PASSWORD, baseURL);
  
  console.log('[GlobalSetup] Global setup completed');
}

export default globalSetup;
