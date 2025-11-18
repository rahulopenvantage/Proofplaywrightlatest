// @ts-check
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.dirname(__filename);

// Allow ENV_FILE override (e.g. ENV_FILE=.env.uat)
dotenv.config({ path: path.resolve(projectRoot, process.env.ENV_FILE || '.env') });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Changed to false for better stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Enable retries: 1 for local, 2 for CI
  workers: 1,
  reporter: 'html',
  
  // Global timeout for all tests
  globalTimeout: 2 * 60 * 60 * 1000, // 2 hours for full suite

  // Runs once before all tests (kept from your original)
  globalSetup: path.resolve(projectRoot, 'backend/global.setup.js'),

  snapshotPathTemplate: 'snapshots/{testFilePath}/{arg}-{projectName}-{platform}{ext}',

  use: {
    // UI base URL
    baseURL: 'https://uat.proof360.io/',

    trace: 'on-first-retry',
    storageState: path.resolve(projectRoot, 'userStorageState_admin.json'),

    // Timeouts tuned for SSO/slow nav
    actionTimeout: 60_000,
    navigationTimeout: 90_000,

    // Dynamic headless
    headless:
      !process.env.PWDEBUG &&
      !process.argv.includes('--headed') &&
      !process.argv.includes('--debug'),

    // Consistent rendering
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: 'light',

    // Enhanced visual testing configuration
    expect: {
      timeout: 30000, // 30 seconds for expect assertions
      // Default screenshot comparison configuration to reduce false positives
      toHaveScreenshot: {
        threshold: 0.3,           // 30% tolerance - more forgiving for minor UI changes
        maxDiffPixels: 200,       // Allow up to 200 pixel differences
        animations: 'disabled',   // Disable animations for consistency
        mode: 'RGB'              // Use RGB mode for better cross-platform consistency
      }
    },

    // Artifacts
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Per-test timeout (5 minutes for complex workflows with SSO)
  timeout: 300_000,

  projects: [
    // UI tests (Chromium)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Exclude API specs from UI project
      testIgnore: /e2e\/api\//,
    },

    // API tests (Postman flows migrated to Playwright)
    {
      name: 'api',
      // Only pick API specs under e2e/api/
      testMatch: /e2e\/api\/.*\.spec\.(js|ts)/,
      // API-specific overrides (no UI state/baseURL)
      use: {
        storageState: undefined,
        baseURL: undefined,
        headless: true,
        trace: 'on-first-retry',
      },
    },

    // If you want other browsers later, re-enable below:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // If you run a local app, plug your webServer here:
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
