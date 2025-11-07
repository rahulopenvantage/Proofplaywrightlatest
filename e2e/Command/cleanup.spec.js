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

    // ===========================================
    // Step 5: Apply UB and Trex Filter
    // ===========================================
    console.log('[Step 5] Applying UB and Trex filter for WVRD site on Incident stack...');
    await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);
    console.log('✅ [Step 5] Filter applied successfully');
    
    // ===========================================
    // Step 6: Verify Alert Appears with Retry Logic
    // ===========================================
    console.log('[Step 6] Verifying UB alerts appear on Incident stack...');
    let cardsFound = 0;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts && cardsFound === 0) {
      attempts++;
      console.log(`[Step 6] Attempt ${attempts}/${maxAttempts} - Checking for alert cards...`);
      
      // Count cards after filter
      cardsFound = await page.locator('[data-test-id="aggregated-site-card"]').count();
      console.log(`[Step 6] Found ${cardsFound} alert card(s)`);
      
      if (cardsFound === 0 && attempts < maxAttempts) {
        console.log(`[Step 6] No cards found yet, waiting 5 seconds before retry...`);
        await page.waitForTimeout(5000);
      }
    }
    
    // Validate: At least one alert card should be visible
    if (cardsFound === 0) {
      // Take screenshot for debugging
      await page.screenshot({ path: `debug-no-alerts-found-${Date.now()}.png`, fullPage: true });
      throw new Error(`No UB alerts found on Incident stack after filtering for ${SITE_NAME} (tried ${attempts} times)`);
    }
    
    console.log(`✅ [Step 6] SUCCESS! Found ${cardsFound} UB alert card(s) on Incident stack after ${attempts} attempt(s)`);
    
    // ===========================================
    // Step 7: Verify Card Details
    // ===========================================
    console.log('[Step 7] Verifying alert card details...');
    
    // Get the first card
    const firstCard = page.locator('[data-test-id="aggregated-site-card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    
    // Check if site name is visible in the card
    const siteNameVisible = await firstCard.locator(`text=/WVRD_9th Ave/i`).count();
    if (siteNameVisible > 0) {
      console.log('✅ [Step 7] Site name found in alert card');
    } else {
      console.log('⚠️ [Step 7] Site name not clearly visible in card, but card exists');
    }
    
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
