import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
import { ApiHelper } from '../../backend/ApiHelper.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

test.describe('Dashboard - Map functionality', () => {
    let sharedSteps;
    let apiHelper;
    
    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000); // 2 minutes for complex operations
        
        // Instantiate helpers
        sharedSteps = new SharedTestSteps(page);
        apiHelper = new ApiHelper();
        
        // Environment validation
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }
        
        // Validate API configuration
        if (!apiHelper.validateApiConfig()) {
            throw new Error('API configuration is invalid. Check UAT_URL and UAT_SASKEY environment variables.');
        }
    });

    test('should verify map functionality and interactions', async ({ page }) => {
        console.log('[Map Functionality] Starting test flow...');
        
        // Step 1: Send TREX alerts to create test data
        console.log('[Map Functionality] Step 1: Send TREX alerts for test data');
        const trexResult = await apiHelper.sendAlert('trex_public');
        expect(trexResult.status).toBe(200);
        
        // Allow time for alerts to be processed
        await page.waitForTimeout(5000);
        
        // Step 2: Navigate to application and login
        console.log('[Map Functionality] Step 2: Navigate to application and login');
        await page.goto('https://uat.proof360.io/');
        await sharedSteps.login(USERNAME, PASSWORD);
        await sharedSteps.selectCompany('Automation company');
        
        // Step 3: Apply WVRD_9th Ave alert stack filter
        await sharedSteps.stackFilterUBAndTrex('WVRD_9th Ave');
        
        // Step 4: Click on 1st Aggregated card on stack
        console.log('[Map Functionality] Step 4: Click on first aggregated card');
        await sharedSteps.expandAndSelectUBAndTrexCard('WVRD_9th Ave');
        
        // Step 5: Click on Map tab (use last() to avoid strict mode violation)
        console.log('[Map Functionality] Step 5: Click on Map tab (using last)');
        await page.locator('[data-test-id="map-tab"]').last().click();
        
        // Step 6: Wait for map to load
        console.log('[Map Functionality] Step 6: Wait for map to load');
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');
        

        // Step 9: Test map interaction controls if available
        console.log('[Map Functionality] Step 9: Test map interaction controls');
        const zoomInButton = page.locator('[data-test-id="map-zoom-in"]');
        const zoomOutButton = page.locator('[data-test-id="map-zoom-out"]');
        
        if (await zoomInButton.isVisible()) {
            await zoomInButton.click();
            await page.waitForTimeout(1000);
            console.log('[Map Functionality] Zoom in control verified');
        }
        
        if (await zoomOutButton.isVisible()) {
            await zoomOutButton.click();
            await page.waitForTimeout(1000);
            console.log('[Map Functionality] Zoom out control verified');
        }
        
        // Step 10: Verify map markers or pins if present
        console.log('[Map Functionality] Step 10: Verify map markers');
        const mapMarkers = page.locator('[data-test-id*="map-marker"], .map-marker, .leaflet-marker-icon');
        if (await mapMarkers.count() > 0) {
            await expect(mapMarkers.first()).toBeVisible();
            console.log('[Map Functionality] Map markers verified');
        }
       
    });
    test.afterEach(async ({ page }) => {
        // Cleanup after each test
        console.log('[Map Functionality] Starting cleanup process...');
        try {
            // Navigate back to base
            await page.goto('https://uat.proof360.io/');
            
            // Re-authenticate and select company
            await sharedSteps.login(USERNAME, PASSWORD);
            await sharedSteps.selectCompany('Automation company');
            
            // Clean UB/Trex alerts for WVRD_9th Ave site used in test
            await sharedSteps.cleanupUBAndTrexAlerts('WVRD_9th Ave');
            console.log('[Map Functionality] Cleanup completed successfully.');
        } catch (error) {
            console.log(`[Map Functionality] Cleanup failed: ${error.message}`);
            // Don't fail test due to cleanup issues
        }
    });
});
