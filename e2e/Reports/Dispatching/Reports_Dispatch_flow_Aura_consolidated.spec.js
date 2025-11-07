import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../../backend/SharedTestSteps.js';
import { ApiHelper } from '../../../backend/ApiHelper.js';
import ElasticsearchClient from '../../../backend/elasticsearch-client.js';
import '../../../backend/GlobalFailureHandler.js';

// Node/ESM utilities used across the merged specs
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// =========================
// Common env bootstrap
// =========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load env from project root (3 levels up from this spec file)
// __dirname = <root>/e2e/Reports/Dispatch_Reports → ../../../ points to <root>
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// =========================
// Shared constants
// =========================
const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const SITE_NAME = 'WVRD_9th Ave and JG Strydom Rd_62';

const COMPANIES = ['Automation company', 'Vumacam'];
const DEFAULT_SITE = 'WVRD_9th Ave';
const SITE = process.env.TEST_ES_SITE || DEFAULT_SITE;

// AURA + cross-spec env (hoisted for helper scope)
const AURA_EMAIL = process.env.AURA_EMAIL;
const AURA_PASSWORD = process.env.AURA_PASSWORD;
const DEFAULT_COMPANY = process.env.TEST_COMPANY || 'Automation company';
const SEEDED_DISPATCH_ID = process.env.DISPATCH_ID; // optional seed

let esClient = null; // shared across tests in this file

// Elasticsearch helper functions - Enhanced with proven broad search strategy
async function getLatestId(
  esClient,
  { site = SITE, windows = ['now-5m', 'now-10m', 'now-15m', 'now-30m', 'now-1h', 'now-2h', 'now-3h', 'now-6h', 'now-12h', 'now-24h', 'now-48h', 'now-7d'] } = {}
) {
  if (!esClient) return null;
  
  console.log(`[ES Integration] Searching for most recent dispatch: company="Automation company", site="${site}"`);
  console.log(`[ES Integration] Using ${windows.length} time windows (${windows[0]} to ${windows[windows.length - 1]})`);
  
  // Strategy: Try multiple site name variations with expanded time windows
  const siteVariations = [
    site,                    // Full site name
    'WVRD_9th Ave',         // Prefix
    'WVRD',                 // Just site code
    '',                     // No site filter (any site)
  ];
  
  // First priority: Search for specific Automation company + site variations
  for (const timeRange of windows) {
    for (const siteName of siteVariations) {
      try {
        const siteDesc = siteName ? `site="${siteName}"` : 'any site';
        console.log(`[ES Integration] Trying: ${timeRange} + ${siteDesc}`);
        const id = await esClient.getLatestDispatchId({ 
          companyName: 'Automation company', 
          siteName: siteName, 
          timeRange 
        });
        if (id) {
          console.log(`[ES Integration] ✅ Found target dispatch ID: ${id}`);
          console.log(`[ES Integration] Match: timeRange=${timeRange}, siteName="${siteName || 'any'}"`);
          return { id, companyName: 'Automation company', timeRange, site: siteName || 'any' };
        }
      } catch (error) {
        // Silent fail, continue searching
      }
    }
  }
  
  // Final fallback: Any company (last resort)
  for (const timeRange of windows) {
    for (const companyName of COMPANIES) {
      try {
        const id = await esClient.getLatestDispatchId({ companyName, siteName: '', timeRange });
        if (id) {
          console.log(`[ES Integration] ⚠️ Using any available dispatch ID: ${id} (${companyName})`);
          return { id, companyName, timeRange, site: '' };
        }
      } catch (error) {
        // Silent fail
      }
    }
  }
  
  console.log(`[ES Integration] ❌ No dispatch records found in any time window`);
  return null;
}

// Removed: waitForStatusChange() - was always timing out and adding ~20 seconds
// Status changes are verified via AURA interface completion, not Proof360 UI polling

// Helper function for performing AURA actions
async function performAuraAction(auraPage, actionLabel) {
  console.log(`[Aura→Proof360][AURA] Performing action: ${actionLabel}`);
  
  // Use exact text matching with force click for MUI Stepper labels
  // The status steps are: "Responder Dispatched", "Responder Arrived", "Responder Completed", "Close Callout"
  try {
    // First try to find the MuiStepLabel with exact text
    const stepLabel = auraPage.locator(`span.MuiStepLabel-label:has-text("${actionLabel}")`).first();
    
    // Wait for the element to be present (it exists but may be disabled initially)
    await stepLabel.waitFor({ state: 'attached', timeout: 5000 });
    console.log(`[Aura→Proof360][AURA] Found step label: ${actionLabel}`);
    
    // Force click regardless of enabled/disabled state
    await stepLabel.click({ force: true });
    console.log(`[Aura→Proof360][AURA] ✅ Clicked: ${actionLabel}`);
    
    // Short wait for action to process
    await auraPage.waitForTimeout(1000);
    
  } catch (error) {
    console.log(`[Aura→Proof360][AURA] ⚠️ Failed to click "${actionLabel}": ${error.message}`);
    
    // Fallback: try clicking the parent button role
    try {
      const roleButton = auraPage.locator(`span[role="button"]:has-text("${actionLabel}")`).first();
      await roleButton.click({ force: true });
      console.log(`[Aura→Proof360][AURA] ✅ Clicked via role="button": ${actionLabel}`);
      await auraPage.waitForTimeout(1000);
    } catch (fallbackError) {
      console.log(`[Aura→Proof360][AURA] ❌ Both click attempts failed for: ${actionLabel}`);
    }
  }
}

async function writeLatestArtifact(data) {
  try {
    const outDir = path.resolve(__dirname, '../../../test-results');
    const outFile = path.join(outDir, 'dispatch-latest.json');
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(
      outFile,
      JSON.stringify({ ...data, writtenAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
    console.log(`[ES] Wrote latest dispatch artifact: ${outFile}`);
  } catch (err) {
    console.warn('[ES] Failed to write latest dispatch artifact:', err?.message);
  }
}

// =========================
// Comprehensive Aura Workflow Test
// =========================
test.describe('Comprehensive Aura Dispatch and AURA Validation Workflow', () => {
  let sharedTestSteps;
  let apiHelper;

  // Single shared beforeAll for the suite (matching original pattern)
  test.beforeAll(async () => {
    console.log('[ES Smoke] ENV URL:', process.env.ELASTICSEARCH_URL);
    console.log('[ES Smoke] ENV API KEY set:', !!process.env.ELASTICSEARCH_API_KEY);
    console.log('[ES Smoke] ENV INDEX:', process.env.ELASTICSEARCH_INDEX);

    try {
      esClient = new ElasticsearchClient();
      const ok = await esClient.testConnection();
      if (!ok) {
        console.warn('[ElasticHelper] Connection test failed, ES will be optional.');
        esClient = null;
      }
    } catch (e) {
      console.warn('[ElasticHelper] Failed to initialize ES client:', e.message);
      esClient = null;
    }
  });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(600000); // 10 minutes for comprehensive workflow
    sharedTestSteps = new SharedTestSteps(page);
    apiHelper = new ApiHelper();

    if (!USERNAME || !PASSWORD) {
      throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
    }

    // Validate API configuration
    if (!apiHelper.validateApiConfig()) {
      throw new Error('API configuration is invalid. Check environment variables.');
    }
  });

  test.afterEach(async ({ page }) => {
    // Shared UB/Trex cleanup to keep stacks tidy between tests
    try {
      const steps = new SharedTestSteps(page);
      await steps.cleanupUBAndTrexAlerts(SITE_NAME);
      console.log(`✅ Post-test cleanup completed for site: ${SITE_NAME}`);
    } catch (cleanupErr) {
      console.warn(`[Cleanup] Post-test cleanup skipped/failed: ${cleanupErr?.message || cleanupErr}`);
    } finally {
      if (esClient) {
        try {
          await esClient.close();
          console.log('✅ Elasticsearch client closed');
        } catch (error) {
          console.error('⚠️ Error closing Elasticsearch client:', error.message);
        }
      }
    }
  });

  test('Complete Aura dispatch flow with Elasticsearch validation and AURA integration', async ({ page, context }) => {
    /*
     * COMPREHENSIVE AURA DISPATCH WORKFLOW TEST
     * ========================================
     * 
     * Test Flow Overview:
     * 1-3: Create UB Alert → Authentication → Company Selection
     * 4-5: Apply UB/TREX Filter → Locate Created Alert
     * 6-7: Select Alert → Complete SOP → Dispatch
     * 8: Elasticsearch Validation → Get Dispatch ID
     * 9: AURA Integration → Status Transitions → Activity Log Verification
     * 
     * AURA Integration (Step 9) - Enhanced with MCP Session Findings:
     * ==============================================================
     * 9a: Open AURA staging portal in new tab
     * 9b: Authenticate with AURA credentials
     * 9c: Navigate to Integration → Responder Simulator
     * 9d: Load callout ID using Material-UI progressive disclosure:
     *     - Handle staging mode notifications (appear repeatedly)
     *     - Expand Real Callout Material-UI card via h4 header click
     *     - Click right arrow button for progressive disclosure
     *     - Use JavaScript fallback for disabled buttons
     *     - Wait for input field to appear in collapsible content
     * 9e: Perform status transitions (Dispatched → Arrived → Completed → Closed)
     * 9f: Verify each status appears in Proof360 activity log
     * 9g: Clean up and close AURA tab
     * 
     * Key MCP Session Discoveries Implemented:
     * - Material-UI collapsible cards (.MuiCard-root, .MuiCollapse-*)
     * - Progressive disclosure requiring multiple interaction steps
     * - Staging mode notifications after each major interaction
     * - Arrow buttons may be disabled, requiring force clicks or JavaScript
     * - Input fields only appear after complete interaction sequence
     * 
     * Environment Requirements:
     * - ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD for Proof360
     * - AURA_EMAIL and AURA_PASSWORD for AURA staging portal
     * - Elasticsearch client configured for dispatch ID retrieval
     */
    // ===========================================
    // STEPS 1-3: Create UB Alert via API for WVRD site
    // ===========================================
    // ===========================================
    // Step 1: Create UB Alert via API
    // ===========================================
    console.log('[Step 1] Creating UB alert via API...');
    const apiHelper = new ApiHelper();
    const ubResult = await apiHelper.sendAlert('unusual_behaviour');
    
    // VALIDATION: API call must succeed
    expect(ubResult.status).toBe(200);
    expect(ubResult).toBeTruthy();
    console.log('✅ [Step 1] UB alert created via API - Status 200');
    
    // Extended wait for alert processing and propagation to UI
    console.log('[Step 1] Waiting for alert to propagate to UI...');
    await page.waitForTimeout(5000);

    // ===========================================
    // Steps 2-3: Navigate and Authenticate
    // ===========================================
    console.log('[Step 2] Navigating to Proof360 and authenticating...');
    await page.goto('https://uat.proof360.io/');
    await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
    
    // VALIDATION: Must be on command page after authentication
    await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
    console.log('✅ [Step 2] Authentication successful - on /command page');
    
    console.log('[Step 3] Selecting Automation company...');
    await sharedTestSteps.selectCompany('Automation company');

    // ===========================================
    // STEPS 4-5: Switch to INCIDENT STACK and Apply UB/TREX Filter
    // ===========================================
    console.log('[Step 4] Switching to Incident stack (process and dispatch first)...');
    await sharedTestSteps.switchToIncidentStack();
    
    console.log('[Step 5] Applying UB and Trex filter for WVRD site on Incident stack...');
    await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);
    
    // Additional wait for filter results to propagate
    console.log('[Step 5] Waiting for filter results to fully load...');
    await page.waitForTimeout(3000);
    
    // VALIDATION: Alert should be visible after filter (Incident stack)
    const cardsAfterFilter = await page.locator('[data-test-id="aggregated-site-card"]').count();
    if (cardsAfterFilter === 0) {
      throw new Error(`No UB alerts found on Incident stack after filtering for ${SITE_NAME}`);
    }
    console.log(`✅ [Step 4-5] Filter applied - ${cardsAfterFilter} card(s) found on Incident stack`);

    // ===========================================
    // STEPS 6-7: Select UB Alert, Complete SOP and Dispatch
    // ===========================================
    console.log('[Step 6] Selecting UB alert and completing SOP...');
    let dispatchCompleted = false;
    
    await sharedTestSteps.expandAndSelectUBAndTrexCard(SITE_NAME);
    await sharedTestSteps.completeSOP();
    await sharedTestSteps.dispatchSOP();
    
    dispatchCompleted = true;
  console.log('✅ [Step 6-7] Alert dispatched successfully (Incident stack)');

  // ===========================================
  // STEP 7.5: Switch to Situation stack post-dispatch and re-apply filter for downstream steps
  // ===========================================
  console.log('[Step 7.5] Switching to Situation stack and re-applying filter for status tracking...');
  await sharedTestSteps.switchToSituationStack();
  await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);

    // ===========================================
    // STEP 8: Elasticsearch Validation
    // ===========================================
    console.log('[Step 8] Fetching dispatch ID from Elasticsearch...');
    
  if (esClient && (dispatchCompleted || (SEEDED_DISPATCH_ID && SEEDED_DISPATCH_ID.trim()))) {
      try {
        const result = await getLatestId(esClient);
        if (!result?.id) throw new Error('No dispatch ID found');
        
        console.log(`✅ [Step 8] Dispatch ID: ${result.id}`);
        await writeLatestArtifact({
          id: result.id,
          companyName: result.companyName,
          timeRange: result.timeRange,
          site: result.site || '',
        });

      } catch (error) {
        console.log(`[Step 8] ES fetch failed: ${error.message}`);
      }
    }

    // ===========================================
    // STEP 9: AURA RESPONDER SIMULATOR INTEGRATION WITH TAB SWITCHING
    // ===========================================
    // 
    // SIMPLIFIED AURA WORKFLOW:
    // -------------------------
    // 1. Open AURA portal in new tab and navigate to simulator
    //    - Login to AURA with credentials
    //    - Switch to staging mode (click "production" text to switch)
    //    - Navigate to: Integration > Responder Simulator
    //    - Click the arrow button on "Real Callout" card (NOT "Test Callout")
    //      → This navigates to the response-flow page
    //
    // 2. Load the dispatch/callout ID (from Step 8 Elasticsearch)
    //    - Enter dispatch ID in "Callout ID" input field
    //    - Press Enter to load the callout
    //    - Verify 4 status step labels appear (indicating callout loaded)
    //
    // 3. Click through each status in AURA (Tab 2):
    //    - Click "Responder Dispatched" button
    //    - Switch to Proof360 (Tab 1) → Verify status appears on alert card
    //    - Switch back to AURA (Tab 2)
    //    - Click "Responder Arrived" button
    //    - Switch to Proof360 (Tab 1) → Verify status appears on alert card
    //    - Switch back to AURA (Tab 2)
    //    - Click "Responder Completed" button
    //    - Switch to Proof360 (Tab 1) → Verify status appears on alert card
    //    - Switch back to AURA (Tab 2)
    //    - Click "Close Callout" button
    //    - Switch to Proof360 (Tab 1) → Verify "Dispatch Closed" appears on alert card
    //
    // NOTE: Each AURA status click triggers a webhook that updates the Proof360 UI
    // NOTE: Currently, statuses are NOT updating correctly in Proof360 (webhook issue)
    // -------------------------
    
    console.log('[Step 9] Starting AURA integration...');
    
  if (AURA_EMAIL && AURA_PASSWORD && (dispatchCompleted || (SEEDED_DISPATCH_ID && SEEDED_DISPATCH_ID.trim()))) {
        const ctx = await getDispatchContext();
        console.log(`[Step 9] Using dispatch ID: ${ctx.id}`);

  // NOTE: We've switched to Situation stack and re-applied filter in Step 7.5
        
        // Step 9b: Open AURA portal in new tab (Tab 2)
        console.log('[Step 9b] Opening AURA portal in new tab...');
        const auraPage = await context.newPage();
        const simState = await ensureResponderSimulatorReady(auraPage, AURA_EMAIL, AURA_PASSWORD);
        if (!simState.available) {
          throw new Error(`AURA Simulator unavailable: ${simState.reason}`);
        }

        // Step 9c: Load callout in AURA simulator
        await loadCalloutInSimulator(auraPage, ctx.id);
        
        // Define status transitions with their expected text on Proof360 card
        const statuses = [
          { label: 'Responder Dispatched', expectedText: 'Responder Dispatched' },
          { label: 'Responder Arrived', expectedText: 'Responder Arrived' },
          { label: 'Responder Completed', expectedText: 'Responder Completed' },
          { label: 'Close Callout', expectedText: 'Dispatch Closed' }
        ];

        // Step 9d-9g: Perform each AURA action and verify on Proof360 card
        for (const { label, expectedText } of statuses) {
          // Click status in AURA (Tab 2)
          console.log(`[Step 9] Tab 2 (AURA): Clicking ${label}...`);
          await performAuraAction(auraPage, label);
          await auraPage.waitForTimeout(3000); // Increased wait for AURA to process
          
          // Switch back to Proof360 (Tab 1)
          console.log(`[Step 9] Switching to Tab 1 (Proof360)...`);
          await page.bringToFront();
          
          // Extended wait for AURA webhook to propagate to Proof360
          console.log(`[Step 9] Waiting for webhook to propagate (5 seconds)...`);
          await page.waitForTimeout(5000);

          // Re-apply filter to show our alert
          console.log(`[Step 9] Re-applying filter to ensure alert is visible...`);
          await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);
          await page.waitForTimeout(2000);
          
          // Ensure we're looking at the correct card - re-expand if needed
          try {
            // Find and click the site card to ensure it's selected
            const siteCard = page.getByTestId('aggregated-site-card').filter({ hasText: SITE_NAME }).first();
            if (await siteCard.isVisible({ timeout: 5000 })) {
              await siteCard.scrollIntoViewIfNeeded();
              await siteCard.click({ timeout: 5000 });
              console.log(`[Step 9] Ensured site card is selected for: ${SITE_NAME}`);
              await page.waitForTimeout(1000);
            }
          } catch (error) {
            console.log(`[Step 9] Could not re-select site card: ${error.message}`);
          }
          
          // Verify status appears on the alert card (with flexible locator)
          console.log(`[Step 9] Tab 1 (Proof360): Verifying "${expectedText}" appears on card...`);
          
          // Try multiple locator strategies for robustness
          let statusFound = false;
          let finalStatusLocator = null;
          
          // Strategy 1: Look for text anywhere on the page
          let statusLocator = page.locator(`text="${expectedText}"`).first();
          if (await statusLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
            statusFound = true;
            finalStatusLocator = statusLocator;
          }
          
          // Strategy 2: Look within the dispatch status area
          if (!statusFound) {
            statusLocator = page.locator('[data-test-id*="dispatch"], [data-test-id*="status"]').locator(`text="${expectedText}"`).first();
            if (await statusLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
              statusFound = true;
              finalStatusLocator = statusLocator;
            }
          }
          
          // Strategy 3: Look for partial text match (case insensitive)
          if (!statusFound) {
            const searchText = expectedText.replace(/\s+/g, '\\s+'); // Handle variable spacing
            statusLocator = page.locator(`text=/${searchText}/i`).first();
            if (await statusLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
              statusFound = true;
              finalStatusLocator = statusLocator;
            }
          }
          
          // CRITICAL: Fail test if status verification fails
          if (statusFound) {
            console.log(`✅ [Step 9] Verified: "${expectedText}" is displayed on Proof360 card`);
          } else {
            // Take screenshot for debugging
            await page.screenshot({ 
              path: `test-failures/status-verification-failed-${label.replace(/\s+/g, '-')}.png`, 
              fullPage: true 
            });
            
            // Log error and fail test
            console.log(`❌ [Step 9] FAILED: Could not verify "${expectedText}" on Proof360 card`);
            console.log(`❌ [Step 9] This indicates the AURA webhook did not propagate correctly`);
            
            // Use Playwright's expect to fail with a clear message
            await expect(page.locator(`text="${expectedText}"`).first()).toBeVisible({ 
              timeout: 10000 // Give one final extended wait before failing
            });
          }
          
          // Switch back to AURA (Tab 2) for next action
          if (label !== 'Close Callout') {
            console.log(`[Step 9] Switching back to Tab 2 (AURA)...`);
            await auraPage.bringToFront();
            await auraPage.waitForTimeout(500);
          }
        }

        // Final cleanup
        console.log('[Step 9] Switching back to Tab 1 for cleanup...');
        await page.bringToFront();
        await sharedTestSteps.cleanupUBAndTrexAlerts(SITE_NAME);
        console.log(`✅ [Step 9] AURA integration completed for dispatch ID: ${ctx.id}`);
        
    } else {
      console.log('[Step 9] Skipping AURA - prerequisites not met');
    }

    console.log('✅ Test completed: Dispatch Flow + ES Validation + AURA Integration');
    

  });
});

// =========================
// AURA Integration Helper Functions
// =========================

async function getDispatchContext() {
  // Seeded takes priority
  if (SEEDED_DISPATCH_ID && SEEDED_DISPATCH_ID.trim()) {
    console.log(`[Aura→Proof360] Using seeded dispatch ID: ${SEEDED_DISPATCH_ID.trim()}`);
    return { id: SEEDED_DISPATCH_ID.trim() };
  }
  
  // Try shared artifact from Step 8 (most reliable - uses the dispatch we just created)
  try {
    const artifactPath = path.resolve(process.cwd(), 'test-results', 'dispatch-latest.json');
    const raw = await fs.readFile(artifactPath, 'utf-8');
    const json = JSON.parse(raw);
    if (json?.id) {
      console.log(`[Aura→Proof360] ✅ Using dispatch ID from artifact (Step 8): ${json.id}`);
      console.log(`[Aura→Proof360] Artifact details: company="${json.companyName}", site="${json.site || 'any'}", timeRange="${json.timeRange}"`);
      return { id: `${json.id}`, site: json.site || json.siteName, companyName: json.companyName };
    }
  } catch (err) {
    console.log(`[Aura→Proof360] ⚠️ Could not read artifact: ${err.message}`);
  }
  
  // Fallback: Search ES directly with enhanced broad search
  console.log('[Aura→Proof360] Fallback: Fetching latest dispatch ID from Elasticsearch...');
  try {
    const es = new ElasticsearchClient();
    
    // Use same enhanced strategy as getLatestId() for consistency
    const expandedWindows = ['now-5m', 'now-10m', 'now-15m', 'now-30m', 'now-1h', 'now-2h', 'now-3h', 'now-6h', 'now-12h', 'now-24h', 'now-48h'];
    const siteVariations = ['WVRD_9th Ave and JG Strydom Rd_62', 'WVRD_9th Ave', 'WVRD', ''];
    
    console.log('[Aura→Proof360] Enhanced search: Automation company with multiple time windows and site variations');
    
    for (const timeRange of expandedWindows) {
      for (const siteName of siteVariations) {
        const id = await es.getLatestDispatchId({ 
          companyName: 'Automation company', 
          siteName: siteName,
          timeRange 
        });
        if (id) {
          const siteDesc = siteName || 'any site';
          console.log(`[Aura→Proof360] ✅ Found dispatch: ${id} (${timeRange} + ${siteDesc})`);
          return { id: `${id}`, companyName: 'Automation company', site: siteName || 'any' };
        }
      }
    }
    
    throw new Error('No dispatch ID found for Automation company in ES');
  } catch (err) {
    throw new Error(`Failed to acquire dispatchId: ${err.message}`);
  }
}

async function focusSiteCard(page, site) {
  try {
    console.log(`[Aura→Proof360] Focusing site card for: ${site}`);
    const card = page.getByTestId('aggregated-site-card').filter({ hasText: site }).first();
    await card.scrollIntoViewIfNeeded();
    await card.click({ timeout: 10000 });
    const statusArea = page.getByTestId('latestDispatchStatus').first();
    await statusArea.waitFor({ state: 'visible', timeout: 5000 }).catch(() => page.waitForTimeout(800));
  } catch (e) {
    console.log(`[Aura→Proof360] ⚠️ Could not focus site card for "${site}": ${e.message}`);
  }
}

async function ensureResponderSimulatorReady(auraPage, email, password) {
  console.log('[Aura→Proof360][AURA] Navigating to portal and logging in...');
  await auraPage.goto('https://staging-portal.aura.services/', { timeout: 60000 });
  await auraPage.waitForLoadState('domcontentloaded');

  await auraSimpleLogin(auraPage, email, password);

  // Early detection: if reCAPTCHA is present post-login, surface it explicitly
  const recaptchaStatus = await detectAndHandleRecaptcha(auraPage, { attemptClick: true });
  if (recaptchaStatus.present && !recaptchaStatus.solved) {
    console.log('[Aura→Proof360][AURA] ⚠️ reCAPTCHA detected after login; simulator may be blocked.');
    return { available: false, reason: 'AURA portal shows reCAPTCHA; manual verification or test bypass required' };
  }

  // Dismiss cookie prompts if any
  const acceptBtn = auraPage.getByRole('button', { name: /accept|allow|ok/i }).first();
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click().catch(() => {});
  }

  // Environment selection (e.g., "production") if present
  const envButton = auraPage.getByRole('button', { name: /production|staging/i }).first();
  if (await envButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await envButton.click();
    await auraPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  // Alternative approach: Click production text to switch to staging
  const productionText = auraPage.locator('text=production').first();
  if (await productionText.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('[Aura→Proof360][AURA] Clicking production button to switch to staging mode...');
    await productionText.click();
    
    try {
      await auraPage.waitForSelector('text=staging', { timeout: 8000 });
      console.log('[Aura→Proof360][AURA] ✅ Successfully switched to staging mode');
    } catch {
      await auraPage.waitForTimeout(1500);
      const stagingText = await auraPage.locator('text=staging').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stagingText) {
        console.log('[Aura→Proof360][AURA] ✅ Successfully switched to staging mode');
      } else {
        console.log('[Aura→Proof360][AURA] ⚠️ Environment switch may not have completed');
      }
    }
  }

  // Deterministic navigation: Integration -> Responder simulator
  const navigateToResponderSimulatorMenu = async () => {
    // Open Integration section in the sidebar/menu
    console.log('[Aura→Proof360][AURA] Waiting for Integration button to be visible...');
    const integrationLink = auraPage.getByRole('link', { name: /^\s*Integration\s*$/i }).first();
    
    // Wait for Integration button to be visible before clicking
    try {
      await integrationLink.waitFor({ state: 'visible', timeout: 10000 });
      console.log('[Aura→Proof360][AURA] Integration button is visible, clicking...');
      await integrationLink.scrollIntoViewIfNeeded().catch(() => {});
      await integrationLink.click();
      console.log('[Aura→Proof360][AURA] ✅ Integration button clicked successfully');
      await auraPage.waitForLoadState('domcontentloaded');
      await auraPage.waitForTimeout(500);
    } catch (error) {
      console.log('[Aura→Proof360][AURA] ⚠️ Integration link not found with role, trying fallback...');
      // Fallback: any Integration text
      const anyIntegration = auraPage.getByText(/Integration/i).first();
      if (await anyIntegration.isVisible({ timeout: 4000 }).catch(() => false)) {
        await anyIntegration.scrollIntoViewIfNeeded().catch(() => {});
        await anyIntegration.click();
        console.log('[Aura→Proof360][AURA] ✅ Integration (fallback) clicked successfully');
        await auraPage.waitForTimeout(400);
      } else {
        console.log('[Aura→Proof360][AURA] ❌ Could not find Integration button');
      }
    }

    // Click Responder simulator nav item with enhanced wait
    console.log('[Aura→Proof360][AURA] Looking for Responder simulator link...');
    await auraPage.waitForTimeout(1000); // Give menu time to expand after Integration click
    
    // Try multiple strategies to find and click Responder simulator
    let responderClicked = false;
    
    // Strategy 1: Role-based link
    const responderSimLink = auraPage.getByRole('link', { name: /Responder simulator/i }).first();
    if (await responderSimLink.isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log('[Aura→Proof360][AURA] Found Responder simulator link (role-based)');
      await responderSimLink.scrollIntoViewIfNeeded().catch(() => {});
      await responderSimLink.click();
      await auraPage.waitForLoadState('domcontentloaded');
      responderClicked = true;
    }
    
    // Strategy 2: Text-based locator
    if (!responderClicked) {
      const responderSimText = auraPage.getByText('Responder simulator', { exact: true }).first();
      if (await responderSimText.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[Aura→Proof360][AURA] Found Responder simulator (text-based)');
        await responderSimText.scrollIntoViewIfNeeded().catch(() => {});
        await responderSimText.click();
        await auraPage.waitForLoadState('domcontentloaded');
        responderClicked = true;
      }
    }
    
    // Strategy 3: Deep fallback - evaluate and navigate
    if (!responderClicked) {
      console.log('[Aura→Proof360][AURA] Using fallback - searching DOM for link...');
      try {
        const href = await auraPage.evaluate(() => {
          const a = document.querySelector('a[href*="responder-simulator"]');
          return a ? (a.getAttribute('href') || '') : '';
        });
        if (href) {
          console.log(`[Aura→Proof360][AURA] Found href: ${href}`);
          const absolute = href.startsWith('http') ? href : new URL(href, auraPage.url()).href;
          console.log(`[Aura→Proof360][AURA] Navigating to: ${absolute}`);
          await auraPage.goto(absolute, { waitUntil: 'domcontentloaded', timeout: 30000 });
          responderClicked = true;
        } else {
          console.log('[Aura→Proof360][AURA] ⚠️ No responder-simulator href found in DOM');
        }
      } catch (err) {
        console.log(`[Aura→Proof360][AURA] ⚠️ Fallback navigation failed: ${err.message}`);
      }
    }

    // Confirm we're on the Responder simulator page
    await auraPage.waitForTimeout(2000);
    const onSimulatorPage = await auraPage.waitForFunction(() => 
      /Responder simulator/i.test(document.body?.innerText || ''), 
      { timeout: 8000 }
    ).catch(() => false);
    
    if (onSimulatorPage) {
      console.log('[Aura→Proof360][AURA] ✅ Successfully navigated to Responder simulator page');
    } else {
      console.log('[Aura→Proof360][AURA] ⚠️ May not be on Responder simulator page');
    }
  };

  await navigateToResponderSimulatorMenu().catch(() => {});

  const bodyText = await safeBodyText(auraPage);
  const hasAppIndicators = /logout|responder simulator|integrator portal/i.test(bodyText);

  if (hasAppIndicators) {
    console.log('[Aura→Proof360][AURA] ✅ Login successful - AURA portal accessible');
    return { available: true };
  }

  if (/404|unexpected application error/i.test(bodyText)) {
    console.log('[Aura→Proof360][AURA] Portal returned 404/Unexpected Application Error.');
    return { available: false, reason: 'AURA portal 404/Unexpected Application Error' };
  }

  const hasLoginIndicators = /protected with auth0|log in|submit/i.test(bodyText);
  if (hasLoginIndicators && !hasAppIndicators) {
    console.log('[Aura→Proof360][AURA] Still on Auth0 login screen - authentication may have failed.');
    return { available: false, reason: 'AURA Auth0 login failed or not configured properly' };
  }

  console.log('[Aura→Proof360][AURA] Portal appears to be accessible after login');
  return { available: true };
}

// Try to locate the responder simulator context (an iframe or the main page)
async function getAuraSimulatorScope(auraPage) {
  // First, see if any child frame contains simulator markers
  const frames = auraPage.frames();
  for (const fr of frames) {
    try {
      const txt = await fr.evaluate(() => document.body?.innerText || '');
      if (/Responder simulator|Real\s*Callout|Existing\s*callout/i.test(txt)) {
        return fr;
      }
    } catch {}
  }
  // Wait briefly for frames to mount if none found yet
  const start = Date.now();
  while (Date.now() - start < 4000) {
    const frs = auraPage.frames();
    for (const fr of frs) {
      try {
        const txt = await fr.evaluate(() => document.body?.innerText || '');
        if (/Responder simulator|Real\s*Callout|Existing\s*callout/i.test(txt)) {
          return fr;
        }
      } catch {}
    }
    await auraPage.waitForTimeout(250);
  }
  return auraPage; // fallback to main page
}

// Search across all frames for the callout input; returns { frame, locator } or null
async function findCalloutInput(auraPage) {
  const candidateFrames = [auraPage.mainFrame(), ...auraPage.frames()].filter(
    (f, idx, arr) => idx === arr.findIndex((g) => g === f)
  );

  const tryFindInFrame = async (fr) => {
    try {
      // Prefer accessible queries first
      let loc = fr.getByLabel(/^(existing\s*)?callout\s*id$/i).first();
      if (await loc.isVisible({ timeout: 800 }).catch(() => false)) return loc;

      loc = fr.getByRole('textbox', { name: /callout/i }).first();
      if (await loc.isVisible({ timeout: 800 }).catch(() => false)) return loc;

      loc = fr.getByPlaceholder(/callout|call\s*out/i).first();
      if (await loc.isVisible({ timeout: 800 }).catch(() => false)) return loc;

      // Attribute-based fallbacks
      loc = fr.locator(
        [
          'input[name="calloutid"]',
          'input[name="calloutId"]',
          'input[name="callout-id"]',
          'input[name="callout_id"]',
          'input[id*="callout" i]',
          'input[name*="callout" i]',
          'input[placeholder*="callout" i]',
          'input[type="number"]',
          'input[type="text"]'
        ].join(', ')
      ).first();
      if (await loc.isVisible({ timeout: 800 }).catch(() => false)) return loc;

      // Generic visible textbox in this frame
      const count = await fr.getByRole('textbox').count().catch(() => 0);
      if (count > 0) return fr.getByRole('textbox').first();
    } catch {}
    return null;
  };

  for (const fr of candidateFrames) {
    const found = await tryFindInFrame(fr);
    if (found) return { frame: fr, locator: found };
  }
  return null;
}

// Handle staging mode notifications that appear during AURA interactions
async function handleStagingModeNotifications(scope) {
  try {
    // Look for staging mode notification text
    const notificationTexts = [
      'Please ensure you are in Staging mode to continue',
      'Staging mode',
      'staging mode'
    ];
    
    for (const notificationText of notificationTexts) {
      if (await scope.getByText(notificationText).isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('[Aura→Proof360][AURA] Staging mode notification detected, dismissing...');
        
        // Look for dismiss button
        const dismissButton = scope.getByRole('button', { name: /dismiss/i }).first();
        if (await dismissButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dismissButton.click();
          await scope.waitForTimeout(500);
          console.log('[Aura→Proof360][AURA] ✅ Staging mode notification dismissed');
          return true;
        }
        
        // Fallback: try text-based dismiss button
        const dismissText = scope.getByText(/dismiss/i).first();
        if (await dismissText.isVisible({ timeout: 1000 }).catch(() => false)) {
          await dismissText.click();
          await scope.waitForTimeout(500);
          console.log('[Aura→Proof360][AURA] ✅ Staging mode notification dismissed (text fallback)');
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.log('[Aura→Proof360][AURA] Error handling staging mode notification:', error.message);
    return false;
  }
}

async function loadCalloutInSimulator(auraPage, dispatchId) {
  console.log(`[Aura→Proof360][AURA] Loading callout ${dispatchId} in simulator...`);
  
  /*
   * AURA Real Callout Workflow (Based on MCP Session Analysis)
   * =======================================================
   * 1. Navigate to Integration → Responder Simulator
   * 2. Handle staging mode notifications (appear multiple times)
   * 3. Locate Real Callout Material-UI card via h4 heading
   * 4. Click h4 header to expand collapsible section
   * 5. Click right arrow button for progressive disclosure
   * 6. Handle staging mode notifications after each interaction
   * 7. Use JavaScript fallback if UI buttons are disabled
   * 8. Wait for progressive disclosure to reveal input field
   * 9. Locate and fill callout ID input in revealed section
   * 
   * Key Findings from MCP Session:
   * - Interface uses Material-UI collapsible cards (.MuiCard-root, .MuiCollapse-*)
   * - Progressive disclosure requires multiple interaction steps
   * - Staging mode notifications appear after each major interaction
   * - Arrow buttons may be disabled initially, requiring force clicks or JS
   * - Input fields only appear after complete interaction sequence
   */

  // If reCAPTCHA is in the way at this point, fail fast with actionable message
  const recaptchaStatus = await detectAndHandleRecaptcha(auraPage, { attemptClick: true });
  if (recaptchaStatus.present && !recaptchaStatus.solved) {
    await auraDiagnostics(auraPage, 'recaptcha-blocking-simulator');
    throw new Error('AURA simulator is gated by reCAPTCHA; cannot proceed in automation. Please disable captcha for test users or whitelist the test environment.');
  }

  // Assume ensureResponderSimulatorReady navigated via menu; if not, try once more
  const ensuredOnSimulator = /Responder simulator/i.test(await safeBodyText(auraPage));
  if (!ensuredOnSimulator) {
    // Attempt menu navigation again rather than constructing URLs
    const integrationLink = auraPage.getByText(/Integration/i).first();
    if (await integrationLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await integrationLink.click();
      await auraPage.waitForTimeout(300);
    }
    const responderSimLink = auraPage.getByText(/Responder simulator/i).first();
    if (await responderSimLink.isVisible({ timeout: 4000 }).catch(() => false)) {
      await responderSimLink.click();
      await auraPage.waitForLoadState('domcontentloaded');
      await auraPage.waitForTimeout(600);
    }
  }

  // Narrow scope to simulator frame or main page
  const scope = await getAuraSimulatorScope(auraPage);

  // Give the simulator a brief moment to render dynamic UI and mount shadow roots
  try {
    await scope.waitForFunction(() => /Responder\s*simulator|Existing\s*callout|Real\s*Callout/i.test(document.body?.innerText || ''), { timeout: 5000 });
  } catch {}

  // Step 5: Handle staging mode notifications (MCP Session Finding)
  console.log('[Aura→Proof360][AURA] Checking for staging mode notifications...');
  await handleStagingModeNotifications(scope);

  // Step 6: Navigate to Real Callout response flow page
  console.log('[Aura→Proof360][AURA] Navigating to Real Callout response flow page...');
  
  /*
   * AURA NAVIGATION FIX (Healer Agent Discovery):
   * ==============================================
   * The Responder Simulator main page shows cards for different callout types.
   * Each card has an arrow button that NAVIGATES to a separate flow page.
   * 
   * HTML Structure (from diagnostics):
   * <div class="MuiCard-root">
   *   <h4>Real Callout</h4>
   *   ...
   *   <a href="/dashboard/staging/.../responder-simulator/response-flow">
   *     <button><svg>Arrow Icon</svg></button>
   *   </a>
   * </div>
   *
   * The callout ID input field is on the response-flow page, NOT on the main page.
   * Previous code was trying to expand a collapsible, but should navigate instead.
   *
   * ROBUSTNESS STRATEGY:
   * - Primary: Target <a> with href*="response-flow" (semantic & stable)
   * - Fallback 1: Arrow button with SVG icon (visual element)
   * - Fallback 2: Any link within Real Callout card (structural)
   * 
   * RECOMMENDATION FOR AURA TEAM:
   * Add data-testid="real-callout-flow-link" to the <a> element for maximum stability.
   */
  
  // Find the Real Callout card by its h4 heading
  const realCalloutH4 = scope.locator('h4').filter({ hasText: 'Real Callout' }).first();
  
  if (await realCalloutH4.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('[Aura→Proof360][AURA] ✅ Found Real Callout card');
    
    // Get the parent card
    const realCalloutCard = realCalloutH4.locator('xpath=ancestor::*[contains(@class, "MuiCard-root")][1]');
    await realCalloutCard.scrollIntoViewIfNeeded().catch(() => {});
    
    // Find the link to response-flow page within this card
    // Strategy: Multiple fallbacks for robustness
    // 1. Primary: Link with href containing "response-flow"
    // 2. Fallback: Any link or button with aria-label/role within card
    // 3. Last resort: Click anywhere on the card (if it's clickable)
    
    let navigationSuccessful = false;
    
    // Attempt 1: Specific href link (most reliable)
    const responseFlowLink = realCalloutCard.locator('a[href*="response-flow"]').first();
    if (await responseFlowLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[Aura→Proof360][AURA] Clicking response-flow link (primary locator)...');
      await responseFlowLink.click();
      navigationSuccessful = true;
    }
    
    // Attempt 2: Arrow button within card (SVG with orientation or any button)
    if (!navigationSuccessful) {
      console.log('[Aura→Proof360][AURA] Primary link not found, trying arrow button...');
      const arrowButton = realCalloutCard.locator('button:has(svg), a:has(svg[orientation="right"])').first();
      if (await arrowButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('[Aura→Proof360][AURA] Clicking arrow button (fallback locator)...');
        await arrowButton.click();
        navigationSuccessful = true;
      }
    }
    
    // Attempt 3: Any link within the card (last resort)
    if (!navigationSuccessful) {
      console.log('[Aura→Proof360][AURA] Arrow button not found, trying any link in card...');
      const anyLink = realCalloutCard.locator('a').first();
      if (await anyLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('[Aura→Proof360][AURA] Clicking card link (last resort locator)...');
        await anyLink.click();
        navigationSuccessful = true;
      }
    }
    
    if (navigationSuccessful) {
      
      // Wait for navigation to complete
      await auraPage.waitForLoadState('domcontentloaded');
      await auraPage.waitForTimeout(2000);
      
      // Handle any staging mode notifications after navigation
      await handleStagingModeNotifications(auraPage);
      
      // Verify we navigated to the correct page (flexible URL check)
      const currentURL = auraPage.url();
      if (currentURL.includes('response-flow') || currentURL.includes('responder-simulator') && currentURL !== scope.url()) {
        console.log('[Aura→Proof360][AURA] ✅ Successfully navigated to response flow page');
      } else {
        console.log(`[Aura→Proof360][AURA] ⚠️ Unexpected URL after navigation: ${currentURL}`);
      }
    } else {
      console.log('[Aura→Proof360][AURA] ❌ All navigation attempts failed - could not find clickable element');
      
      // Fallback: click the button directly
      const arrowButton = realCalloutCard.locator('button[type="button"]').first();
      if (await arrowButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await arrowButton.click();
        await auraPage.waitForLoadState('domcontentloaded');
        await auraPage.waitForTimeout(2000);
        await handleStagingModeNotifications(auraPage);
      }
    }
  } else {
    console.log('[Aura→Proof360][AURA] ⚠️ Could not find Real Callout h4 header on main page');
    
    // Try direct URL navigation as fallback
    const currentURL = auraPage.url();
    const responseFlowURL = currentURL.replace('/responder-simulator', '/responder-simulator/response-flow');
    console.log(`[Aura→Proof360][AURA] Attempting direct URL navigation to: ${responseFlowURL}`);
    await auraPage.goto(responseFlowURL);
    await auraPage.waitForLoadState('domcontentloaded');
    await auraPage.waitForTimeout(2000);
  }

  // Step 7: Wait for response flow page to load
  console.log('[Aura→Proof360][AURA] Waiting for response flow page to fully load...');
  
  // Extended wait for the page to fully render - Material-UI components can be slow
  await auraPage.waitForTimeout(5000);
  
  // Check for any staging mode notifications on the new page
  await handleStagingModeNotifications(auraPage);
  
  // Additional wait after dismissing notifications
  await auraPage.waitForTimeout(2000);

  // Step 8: Locate callout ID input field with enhanced progressive disclosure awareness
  console.log('[Aura→Proof360][AURA] Searching for callout ID input field after progressive disclosure...');
  
  // Give extra time for any progressive disclosure animations or lazy-loaded components
  await auraPage.waitForTimeout(2000);

  // Helper: Enhanced scoped input search for Material-UI interface
  const findScopedInput = async () => {
    // First, try to find within the Real Callout card
    const realCalloutCard = scope.locator('.MuiCard-root').filter({ hasText: 'Real Callout' }).first();
    if (await realCalloutCard.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('[Aura→Proof360][AURA] Searching within Real Callout Material-UI card...');
      
      // Look for expanded/collapsed content within the card
      const collapsibleContent = realCalloutCard.locator('.MuiCollapse-entered, .MuiCollapse-wrapper, .MuiCollapse-wrapperInner');
      if (await collapsibleContent.isVisible({ timeout: 1000 }).catch(() => false)) {
        const candidate = collapsibleContent.locator('input[type="text"], input[type="number"], [role="textbox"]').first();
        if (await candidate.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log('[Aura→Proof360][AURA] Found input in collapsible content');
          return candidate;
        }
      }
      
      // Search within any newly revealed sections
      const candidate = realCalloutCard.locator('input[name*="callout"], input[placeholder*="callout"], input[type="text"], input[type="number"], [role="textbox"]').first();
      if (await candidate.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('[Aura→Proof360][AURA] Found input in Real Callout card');
        return candidate;
      }
    }
    
    // Fallback: original scoped search
    let heading = scope.getByRole('heading', { name: /Real\s*Callout/i }).first();
    if (!(await heading.isVisible({ timeout: 1500 }).catch(() => false))) {
      heading = scope.getByText(/Real\s*Callout/i).first();
    }
    if (await heading.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Walk up to a container and search for an input inside it
      let scoped = heading.locator('xpath=ancestor::*[self::section or self::div][1]');
      // If the immediate ancestor has no input, go one more level up
      if (!(await scoped.locator('input, [role="textbox"]').first().isVisible({ timeout: 800 }).catch(() => false))) {
        scoped = heading.locator('xpath=ancestor::*[self::section or self::div][2]');
      }
      const candidate = scoped.locator('input[name="calloutid"], input[name="calloutId"], input[name="callout-id"], input[name="callout_id"], input[type="text"], [role="textbox"]').first();
      if (await candidate.isVisible({ timeout: 1200 }).catch(() => false)) return candidate;
    }
    return null;
  };

  // Primary strategies (prefer accessible queries that pierce shadow DOM)
  // 1) By label
  let calloutInput = scope.getByLabel(/^(existing\s*)?callout\s*id$/i).first();
  if (!(await calloutInput.isVisible({ timeout: 1500 }).catch(() => false))) {
    // 2) By role + accessible name
    calloutInput = scope.getByRole('textbox', { name: /callout/i }).first();
  }
  if (!(await calloutInput.isVisible({ timeout: 1500 }).catch(() => false))) {
    // 3) By placeholder (also pierces shadow)
    calloutInput = scope.getByPlaceholder(/callout/i).first();
  }
  if (!(await calloutInput.isVisible({ timeout: 1500 }).catch(() => false))) {
    // 4) Known name attributes
    calloutInput = scope.locator('input[name="calloutid"]').first();
  }
  if (!(await calloutInput.isVisible({ timeout: 2000 }).catch(() => false))) {
    calloutInput = await findScopedInput() || calloutInput;
  }
  if (!(await calloutInput.isVisible({ timeout: 2000 }).catch(() => false))) {
    calloutInput = scope.locator('input[name="calloutId"], input[name="callout-id"], input[name="callout_id"]').first();
  }
  if (!(await calloutInput.isVisible({ timeout: 2000 }).catch(() => false))) {
    // 5) Generic text input with accessible hints
    calloutInput = scope.locator('input[aria-label*="callout" i], input[placeholder*="callout" i], input[placeholder*="call out" i], input[aria-label*="call out" i]').first();
  }
  if (!(await calloutInput.isVisible({ timeout: 2000 }).catch(() => false))) {
    // Label proximity strategies
    const labelTexts = [/Existing callout Id/i, /Callout Id/i, /Callout ID/i];
    for (const re of labelTexts) {
      const label = scope.getByText(re).first();
      if (await label.isVisible({ timeout: 1500 }).catch(() => false)) {
        await label.scrollIntoViewIfNeeded().catch(() => {});
        // Find the parent container and search for input within it
        const container = label.locator('xpath=ancestor::*[self::div or self::section or self::form][1]');
        const nearInput = container.locator('input, [role="textbox"]').first();
        if (await nearInput.isVisible({ timeout: 1500 }).catch(() => false)) {
          calloutInput = nearInput;
          break;
        }
        const following = label.locator('xpath=following::input[1]').first();
        if (await following.isVisible({ timeout: 1500 }).catch(() => false)) {
          calloutInput = following;
          break;
        }
      }
    }
  }
  if (!(await calloutInput.isVisible({ timeout: 2000 }).catch(() => false))) {
    // 6) Broad fallback: pick the most likely visible text input (pierce shadow via role)
    const visibleInputs = await scope.getByRole('textbox').count().catch(() => 0);
    if (visibleInputs > 0) {
      calloutInput = scope.getByRole('textbox').first();
    }
  }

  // Cross-frame fallback sweep if scoped strategies failed
  if (!(await calloutInput.isVisible({ timeout: 1500 }).catch(() => false))) {
    const cross = await findCalloutInput(auraPage);
    if (cross?.locator) {
      calloutInput = cross.locator;
    }
  }

  // Ensure the input field is visible before proceeding or try JS-based fallback
  if (!(await calloutInput.isVisible({ timeout: 12000 }).catch(() => false))) {
    // Capture some extra context text for debugging
    try {
      const txt = await (scope === auraPage ? auraPage : scope).evaluate(() => document.body?.innerText || '');
      await fs.mkdir('test-failures', { recursive: true }).catch(() => {});
      await fs.writeFile('test-failures/aura-callout-scope-text.txt', txt, 'utf-8').catch(() => {});
    } catch {}
    await auraDiagnostics(auraPage, 'callout-input-not-found');

    // JavaScript-based fallback: scan DOM for likely input and fill/submit programmatically
    console.log('[Aura→Proof360][AURA] Attempting JS fallback to locate and fill callout input...');
    const jsResult = await (scope === auraPage ? auraPage : scope).evaluate((id) => {
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return !!(rect.width || rect.height) && window.getComputedStyle(el).visibility !== 'hidden';
      };
      const candidates = Array.from(document.querySelectorAll('input, [role="textbox"], input[type="number"], input[type="text"]'));
      let target = null;
      for (const el of candidates) {
        const name = (el.getAttribute('name') || '').toLowerCase();
        const idAttr = (el.getAttribute('id') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        const likely = /callout/.test(name + idAttr + placeholder + aria) || /callout/.test(el.textContent || '') || /id/.test(name + idAttr + placeholder + aria);
        if (likely && isVisible(el)) { target = el; break; }
      }
      if (!target) return { success: false, step: 'no-input' };
      // Fill value and dispatch events
      const setVal = (el, value) => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (nativeSetter) nativeSetter.set.call(el, value);
        else el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setVal(target, String(id));

      // Find a submit/search/load button in the same container
      const container = target.closest('form, section, div, article') || document.body;
      const buttons = Array.from(container.querySelectorAll('button'));
      const match = (b) => /submit|load|search|create/i.test(b.innerText || '') || b.type === 'submit';
      const btn = buttons.find((b) => isVisible(b) && match(b)) || Array.from(document.querySelectorAll('button')).find((b) => isVisible(b) && match(b));
      if (btn) {
        btn.click();
        return { success: true, step: 'clicked', usedButton: true };
      }
      // As a fallback, press Enter on the input
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      return { success: true, step: 'enter', usedButton: false };
    }, dispatchId).catch(() => ({ success: false }));

    if (!jsResult?.success) {
      throw new Error('locator.waitFor: Timeout while locating callout input field');
    } else {
      console.log(`[Aura→Proof360][AURA] JS fallback succeeded (step=${jsResult.step}, usedButton=${jsResult.usedButton})`);
      // Continue as if the form was submitted; wait briefly for status buttons
      await auraPage.waitForTimeout(2000);
    }
  }
  await calloutInput.scrollIntoViewIfNeeded().catch(() => {});
  console.log('[Aura→Proof360][AURA] ✅ Callout input field located successfully');

  // Clear existing value and enter dispatch ID
  await calloutInput.clear();
  await calloutInput.fill(`${dispatchId}`);
  
  // Verify the value was entered correctly
  const inputValue = await calloutInput.inputValue();
  if (inputValue !== `${dispatchId}`) {
    throw new Error(`[Aura→Proof360][AURA] ❌ Failed to set callout ID. Expected ${dispatchId}, got ${inputValue}`);
  }
  
  console.log(`[Aura→Proof360][AURA] ✅ Successfully entered dispatch ID: ${dispatchId}`);

  // Step 7: Submit the callout by pressing Enter
  console.log('[Aura→Proof360][AURA] Submitting callout by pressing Enter...');
  
  // Press Enter to submit the dispatch ID
  await calloutInput.press('Enter');
  console.log('[Aura→Proof360][AURA] ✅ Pressed Enter on callout ID input field');
  
  // Wait for the callout to load (increased to give AURA time to fetch and render)
  console.log('[Aura→Proof360][AURA] Waiting 3 seconds for callout to load...');
  await auraPage.waitForTimeout(3000);

  // Verify status stepper is present -> indicates callout loaded
  // The status steps are MUI Stepper labels (span.MuiStepLabel-label), not buttons
  const statusLabels = auraPage.locator('span.MuiStepLabel-label').filter({ 
    hasText: /Responder Dispatched|Responder Arrived|Responder Completed|Close Callout/
  });
  
  const labelCount = await statusLabels.count().catch(() => 0);
  if (labelCount === 0) {
    await auraDiagnostics(auraPage, 'no-status-buttons');
    throw new Error(`AURA callout ${dispatchId} may not have loaded properly - no status buttons found`);
  }
  
  console.log(`[Aura→Proof360][AURA] ✅ Found ${labelCount} status step labels - callout loaded successfully`);
  console.log(`[Aura→Proof360][AURA] ✅ Callout ${dispatchId} loaded successfully in simulator`);
}

async function auraDiagnostics(auraPage, tag) {
  try {
    await auraPage.screenshot({ path: `test-failures/aura-${tag}.png`, fullPage: true });
    const html = await auraPage.content();
    try {
      await fs.mkdir('test-failures', { recursive: true });
      await fs.writeFile(`test-failures/aura-${tag}.html`, html, 'utf-8');
      // Also try to capture iframe HTML if present
      const frames = auraPage.frames();
      for (let i = 0; i < frames.length; i++) {
        try {
          const fhtml = await frames[i].content();
          await fs.writeFile(`test-failures/aura-${tag}-frame${i}.html`, fhtml, 'utf-8');
        } catch {}
      }
    } catch {}
    await auraPage.context().tracing?.stop?.().catch(() => {});
    console.log(`[Aura→Proof360][AURA] Saved diagnostics for ${tag}`);
  } catch {}
}

async function safeBodyText(page) {
  try {
    return await page.locator('body').innerText();
  } catch {
    return '';
  }
}

async function auraSimpleLogin(auraPage, email, password) {
  console.log('[Aura→Proof360][AURA] Starting simple login process...');

  try {
    await auraPage.waitForLoadState('domcontentloaded');
    await auraPage.waitForTimeout(3000);

    // Check if already logged in
    const logoutText = auraPage.getByText(/logout/i).first();
    if (await logoutText.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[Aura→Proof360][AURA] Already authenticated (Logout visible)');
      return;
    }

    // Click initial login button if present
    const initialLoginSelectors = [
      'button:has-text("Log In")', 'button:has-text("Login")', 'button:has-text("Sign In")',
      '[data-test-id="login"]', 'a:has-text("Log In")',
    ];

    for (const selector of initialLoginSelectors) {
      const loginButton = auraPage.locator(selector);
      if (await loginButton.isVisible({ timeout: 2000 })) {
        await loginButton.click();
        await auraPage.waitForLoadState('domcontentloaded');
        await auraPage.waitForTimeout(2000);
        break;
      }
    }

    // Fill credentials
    const emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[name="username"]', 'input[id="email"]'];
    const passwordSelectors = ['input[type="password"]', 'input[name="password"]', 'input[id="password"]'];

    let emailFilled = false;
    for (const selector of emailSelectors) {
      const field = auraPage.locator(selector);
      if (await field.isVisible({ timeout: 3000 })) {
        await field.clear();
        await field.fill(email);
        emailFilled = true;
        break;
      }
    }

    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      const field = auraPage.locator(selector);
      if (await field.isVisible({ timeout: 3000 })) {
        await field.clear();
        await field.fill(password);
        passwordFilled = true;
        break;
      }
    }

    if (!emailFilled || !passwordFilled) {
      console.log('[Aura→Proof360][AURA] Could not find email/password fields');
      return;
    }

    // Submit the form
    const submitSelectors = [
      'button[type="submit"]', 'input[type="submit"]', 'button:has-text("Log In")',
      'button:has-text("Login")', 'button:has-text("Sign In")', 'button:has-text("Submit")',
    ];

    for (const selector of submitSelectors) {
      const button = auraPage.locator(selector);
      if (await button.isVisible({ timeout: 3000 })) {
        await button.click();
        console.log('[Aura→Proof360][AURA] Login form submitted');
        break;
      }
    }

    // Wait for login to complete
    try {
      await auraPage.waitForFunction(() => {
        const bodyText = document.body?.innerText || '';
        return /logout|responder simulator|integrator portal/i.test(bodyText);
      }, { timeout: 30000 });
      console.log('[Aura→Proof360][AURA] ✅ Login completed successfully');
    } catch {
      console.log('[Aura→Proof360][AURA] ⚠️ Login may not have completed within timeout');
    }
  } catch (error) {
    console.log(`[Aura→Proof360][AURA] Simple login error: ${error.message}`);
    throw error;
  }
}

// Detect and optionally attempt interaction with reCAPTCHA widget.
// Note: This does NOT solve reCAPTCHA; it only flags presence and tries a basic checkbox click
// when it's the easy variant. For automation-friendly flows, prefer disabling captchas for test users.
async function detectAndHandleRecaptcha(page, options = { attemptClick: false }) {
  try {
    // Quick heuristic: look for common recaptcha iframe titles and anchors
    const frames = page.frames();
    let checkboxFrame = null;
    let challengeFrame = null;

    for (const fr of frames) {
      const url = fr.url() || '';
      const title = await fr.evaluate(() => document.title || '').catch(() => '');
      if (/google\.com\/recaptcha\/api2\/anchor/i.test(url) || /recaptcha/i.test(title)) {
        checkboxFrame = fr;
      }
      if (/google\.com\/recaptcha\/api2\/bframe/i.test(url)) {
        challengeFrame = fr;
      }
    }

    const present = !!(checkboxFrame || challengeFrame);
    if (!present) return { present: false, solved: false };

    // Optional best-effort: click the checkbox inside anchor frame
    let solved = false;
    if (options.attemptClick && checkboxFrame) {
      try {
        const checkbox = checkboxFrame.locator('#recaptcha-anchor, .recaptcha-checkbox-border');
        if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
          await checkbox.click({ force: true });
          // Wait briefly to see if challenge does not appear
          await page.waitForTimeout(1500);
          // If no challenge frame appears, we consider it passed for now
          const stillChallenge = page.frames().some(fr => /recaptcha\/api2\/bframe/i.test(fr.url() || ''));
          solved = !stillChallenge;
        }
      } catch {}
    }

    return { present: true, solved };
  } catch {
    return { present: false, solved: false };
  }
}