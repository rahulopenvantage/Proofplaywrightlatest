import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';

// ESM setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Environment variables
const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Situation stack manual alert cleanup - Resolve All', () => {
  let shared;

  test.beforeEach(async ({ page }) => {
    shared = new SharedTestSteps(page);
  });

  test('Clean up Trex alert(s) using Resolve All', async ({ page }) => {
    // 1) Auth and go to Command
    await shared.authenticateAndSetup(USERNAME, PASSWORD);
    await shared.navigateToMenu('Command');
    await shared.selectCompany('Automation company');
    // 2) Run UB & Trex cleanup for a known site (handles both stacks internally)
    await shared.cleanupUBAndTrexAlerts('WVRD_9th Ave and JG Strydom Rd_62');
  });
});
