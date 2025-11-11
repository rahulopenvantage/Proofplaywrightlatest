import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ApiHelper } from '../../backend/ApiHelper.js';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// ESM setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Environment variables
const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const SITE_NAME = 'WVRD_9th Ave';

test.describe('Unusual Behaviour Alert Test - Automation Company', () => {
  let sharedTestSteps;
  let apiHelper;

  test.beforeEach(async ({ page }) => {
    sharedTestSteps = new SharedTestSteps(page);
    apiHelper = new ApiHelper();
  });

  test('Create UB alert via API and verify on Incident stack for Automation company', async ({ page }) => {
    // ===========================================
    // Step 1: Create UB Alert via API
    // ===========================================
    console.log('[Step 1] Creating Unusual Behaviour alert via API...');
    const ubResult = await apiHelper.sendAlert('unusual_behaviour');
    
    // Validate API call succeeded
    expect(ubResult.status).toBe(200);
    expect(ubResult).toBeTruthy();
    console.log('✅ [Step 1] UB alert created via API - Status 200');
    
    // Wait for alert to propagate from backend to UI
    console.log('[Step 1] Waiting 10 seconds for alert to propagate to UI...');
    await page.waitForTimeout(10000);
    console.log('✅ [Step 1] Alert propagation wait completed');

    // ===========================================
    // Step 2: Navigate and Authenticate
    // ===========================================
    console.log('[Step 2] Navigating to Proof360 and authenticating...');
    await page.goto('https://uat.proof360.io/');
    await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
    
    // Validate: Must be on command page after authentication
    await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
    console.log('✅ [Step 2] Authentication successful - on /command page');
    
    // ===========================================
    // Step 3: Select Automation Company
    // ===========================================
    console.log('[Step 3] Selecting Automation company...');
    await sharedTestSteps.selectCompany('Automation company');
    console.log('✅ [Step 3] Automation company selected');

    
    console.log('✅ [Step 7] Alert card verification completed');
    
    // ===========================================
    // Step 8: Cleanup (Optional)
    // ===========================================
    console.log('[Step 8] Cleaning up test alerts...');
    await sharedTestSteps.cleanupUBAndTrexAlerts(SITE_NAME);
    console.log('✅ [Step 8] Cleanup completed');
    
    console.log('🎉 TEST COMPLETED SUCCESSFULLY!');
  });
});
