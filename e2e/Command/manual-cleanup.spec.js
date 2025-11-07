import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// ESM setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Manual Alert Cleanup - Automation company', () => {
  let steps;

  test.beforeEach(async ({ page }) => {
    steps = new SharedTestSteps(page);
  });

  test('Create Manual Alert and cleanup across Incident and Situation stacks', async ({ page }) => {
    // Navigate and authenticate
    await page.goto('https://uat.proof360.io/');
    await steps.authenticateAndSetup(USERNAME, PASSWORD);
    await expect(page).toHaveURL(/.*command/, { timeout: 45000 });

    // Ensure company
    await steps.selectCompany('Automation company');

    // Create a manual alert
    await steps.navigateToMenu('Sites');
    await steps.createManualAlert();

    // Go back to Command
    await steps.navigateToMenu('Command');

    // Run shared manual cleanup (implements the 14-step flow for manual alerts)
    await steps.cleanupManualAlerts();
  });
});
