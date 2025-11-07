import { defineConfig, devices } from '@playwright/test';

/**
 * Enhanced Playwright configuration with improved reliability settings
 * 
 * This configuration is optimized for:
 * - Better retry mechanisms
 * - Increased timeouts for stability
 * - Enhanced error reporting
 * - Improved test isolation
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Global test timeout (15 minutes for complex workflows)
  timeout: 15 * 60 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 30000 // 30 seconds for assertions
  },
  
  // Test configuration
  fullyParallel: false, // Disable parallel execution for better stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 2, // Increased retries
  workers: 1, // Single worker for better reliability
  
  // Enhanced reporter configuration
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never' 
    }],
    ['json', { 
      outputFile: 'test-results/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/junit.xml' 
    }],
    ['list'], // Console output
    ['allure-playwright', {
      detail: true,
      outputFolder: 'allure-results',
      suiteTitle: true,
    }]
  ],
  
  // Global setup
  globalSetup: require.resolve('./backend/global.setup.js'),
  
  // Use projects for different test categories
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enhanced browser settings for reliability
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=TranslateUI',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ],
          slowMo: 100 // Add small delay between actions for stability
        },
        // Enhanced timeouts
        actionTimeout: 30000, // 30 seconds for actions
        navigationTimeout: 60000, // 60 seconds for navigation
        
        // Enhanced context options
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
        
        // Enhanced video and screenshot settings
        video: {
          mode: 'retain-on-failure',
          size: { width: 1920, height: 1080 }
        },
        screenshot: {
          mode: 'only-on-failure',
          fullPage: true
        },
        
        // Enhanced trace settings
        trace: {
          mode: 'retain-on-failure',
          screenshots: true,
          snapshots: true,
          sources: true
        }
      },
      dependencies: ['setup'],
    },
    
    // Cleanup tests (highest priority)
    {
      name: 'cleanup',
      testMatch: /.*cleanup.*\.spec\.js/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'userStorageState_admin.json'
      },
      dependencies: ['setup'],
    },
    
    // Stack filter tests
    {
      name: 'stack-filter',
      testMatch: /.*Stack_Filter.*\.spec\.js/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'userStorageState_admin.json'
      },
      dependencies: ['cleanup'],
    },
    
    // Dashboard tests
    {
      name: 'dashboard',
      testMatch: /.*Dashboard.*\.spec\.js/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'userStorageState_admin.json'
      },
      dependencies: ['cleanup'],
    },
    
    // Management pages
    {
      name: 'management',
      testMatch: /.*Management_Pages.*\.spec\.js/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'userStorageState_admin.json'
      },
      dependencies: ['cleanup'],
    },
    
    // Other tests
    {
      name: 'other',
      testMatch: /(?!.*(?:cleanup|Stack_Filter|Dashboard|Management_Pages)).*\.spec\.js/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'userStorageState_normal.json'
      },
      dependencies: ['cleanup'],
    }
  ],
  
  // Enhanced web server configuration
  webServer: {
    command: 'npm run serve',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000 // 2 minutes for server startup
  },
  
  // Output directories
  outputDir: 'test-results/',
  
  // Enhanced test configuration
  use: {
    // Base URL
    baseURL: process.env.BASE_URL || 'https://uat.proof360.io',
    
    // Enhanced timeouts
    actionTimeout: 30000,
    navigationTimeout: 60000,
    
    // Browser context options
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    
    // Enhanced video settings
    video: {
      mode: 'retain-on-failure',
      size: { width: 1920, height: 1080 }
    },
    
    // Enhanced screenshot settings
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    
    // Enhanced trace settings for debugging
    trace: {
      mode: 'retain-on-failure',
      screenshots: true,
      snapshots: true,
      sources: true
    },
    
    // User agent
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});
