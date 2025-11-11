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

test.describe('Manual Alert Cleanup Test - Automation Company', () => {
  let sharedTestSteps;
  let apiHelper;

  test.beforeEach(async ({ page }) => {
    sharedTestSteps = new SharedTestSteps(page);
    apiHelper = new ApiHelper();
  });

  test('Run Manual Alert Cleanup on Situation stack (assuming alerts exist)', async ({ page }) => {
    // Manual alerts are created in the UI, not via API
    // This test assumes manual alerts already exist in the system
    
    // ===========================================
    // Step 1: Navigate and Authenticate
    // ===========================================
    console.log('[Step 1] Navigating to Proof360 and authenticating...');
    await page.goto('https://uat.proof360.io/');
    await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
    
    // Validate: Must be on command page after authentication
    await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
    console.log('✅ [Step 1] Authentication successful - on /command page');
    
    // ===========================================
    // Step 2: Select Automation Company
    // ===========================================
    console.log('[Step 2] Selecting Automation company...');
    await sharedTestSteps.selectCompany('Automation company');
    console.log('✅ [Step 2] Automation company selected');

    // ===========================================
    // Step 3: Run Manual Alert Cleanup
    // ===========================================
    console.log('[Step 3] Running manual alert cleanup...');
    console.log('[Step 3] This will test the explicit sequence: Infrastructure (skip if not found) → Attempted entry → Arrest → Resolve');
    await sharedTestSteps.cleanupManualAlerts();
    console.log('✅ [Step 3] Manual alert cleanup completed');
    
    console.log('🎉 TEST COMPLETED SUCCESSFULLY!');
  });
});
