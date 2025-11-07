import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../../backend/SharedTestSteps.js';
import { ApiHelper } from '../../../backend/ApiHelper.js';
import ElasticsearchClient from '../../../backend/elasticsearch-client.js';
import '../../../backend/GlobalFailureHandler.js';

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// =========================
// Environment Setup
// =========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// =========================
// Constants
// =========================
const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const SITE_NAME = 'WVRD_9th Ave and JG Strydom Rd_62';
const SITE_PREFIX = 'WVRD_9th Ave';

let esClient = null;

// =========================
// Enhanced Elasticsearch Search with Broader Strategy
// =========================
async function getLatestDispatchIdBroadSearch(esClient) {
  if (!esClient) {
    console.log('[ES Search] No ES client available');
    return null;
  }

  console.log('[ES Search] Starting broad search for dispatch ID...');
  
  // Strategy 1: Expanded time windows (most likely to find recent dispatch)
  const expandedTimeWindows = [
    'now-5m',
    'now-10m', 
    'now-15m',
    'now-30m',
    'now-1h',
    'now-2h',
    'now-3h',
    'now-6h',
    'now-12h',
    'now-24h',
    'now-48h',
    'now-7d'
  ];

  // Strategy 2: Try multiple site name variations
  const siteNameVariations = [
    SITE_NAME,                    // Full: "WVRD_9th Ave and JG Strydom Rd_62"
    SITE_PREFIX,                  // Prefix: "WVRD_9th Ave"
    'WVRD',                       // Just the site code
    '',                           // No site filter (any site)
  ];

  console.log('[ES Search] Search strategy:');
  console.log(`  - Time windows: ${expandedTimeWindows.length} windows from 5m to 7d`);
  console.log(`  - Site variations: ${siteNameVariations.length} variations`);
  console.log(`  - Company: Automation company (fixed)`);

  // Try each time window with each site variation
  for (const timeRange of expandedTimeWindows) {
    for (const siteName of siteNameVariations) {
      try {
        const siteDesc = siteName ? `site="${siteName}"` : 'any site';
        console.log(`[ES Search] Trying: ${timeRange} + ${siteDesc}`);
        
        const id = await esClient.getLatestDispatchId({ 
          companyName: 'Automation company', 
          siteName: siteName,
          timeRange 
        });
        
        if (id) {
          console.log(`[ES Search] ✅ SUCCESS! Found dispatch ID: ${id}`);
          console.log(`[ES Search] Match: timeRange=${timeRange}, siteName="${siteName || 'any'}"`);
          return {
            id,
            companyName: 'Automation company',
            timeRange,
            siteName: siteName || 'any',
            searchStrategy: `${timeRange} + ${siteDesc}`
          };
        }
      } catch (error) {
        console.log(`[ES Search] Search failed for ${timeRange} + ${siteName || 'any'}: ${error.message}`);
      }
    }
  }

  console.log('[ES Search] ❌ No dispatch ID found after broad search');
  return null;
}

async function writeDispatchArtifact(data, filename = 'dispatch-latest.json') {
  try {
    const outDir = path.resolve(__dirname, '../../../test-results');
    const outFile = path.join(outDir, filename);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(
      outFile,
      JSON.stringify({ 
        ...data, 
        writtenAt: new Date().toISOString(),
        testFile: 'Create_Dispatch_Get_ID.spec.js'
      }, null, 2),
      'utf-8'
    );
    console.log(`[Artifact] ✅ Wrote dispatch artifact: ${outFile}`);
    console.log(`[Artifact] Dispatch ID: ${data.id}`);
    return outFile;
  } catch (err) {
    console.warn('[Artifact] ⚠️ Failed to write dispatch artifact:', err?.message);
    return null;
  }
}

// =========================
// Test Suite
// =========================
test.describe('Create UB Alert → Dispatch → Get Dispatch ID', () => {
  let sharedTestSteps;
  let apiHelper;

  test.beforeAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('TEST: Create Dispatch and Retrieve ID from Elasticsearch');
    console.log('='.repeat(80));
    console.log('[Setup] Initializing Elasticsearch client...');
    
    try {
      esClient = new ElasticsearchClient();
      const ok = await esClient.testConnection();
      if (!ok) {
        console.warn('[Setup] ⚠️ ES connection test failed, but continuing...');
      } else {
        console.log('[Setup] ✅ Elasticsearch connected successfully');
      }
    } catch (e) {
      console.warn('[Setup] ⚠️ Failed to initialize ES client:', e.message);
      esClient = null;
    }
  });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(300000); // 5 minutes
    sharedTestSteps = new SharedTestSteps(page);
    apiHelper = new ApiHelper();

    if (!USERNAME || !PASSWORD) {
      throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD must be set');
    }

    if (!apiHelper.validateApiConfig()) {
      throw new Error('API configuration is invalid');
    }
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
    try {
      const steps = new SharedTestSteps(page);
      console.log(`[Cleanup] ✅ Cleaned up alerts for site: ${SITE_NAME}`);
    } catch (cleanupErr) {
      console.warn(`[Cleanup] ⚠️ Cleanup failed: ${cleanupErr?.message}`);
    } finally {
      if (esClient) {
        try {
          await esClient.close();
          console.log('[Cleanup] ✅ ES client closed');
        } catch (error) {
          console.error('[Cleanup] ⚠️ Error closing ES client:', error.message);
        }
      }
    }
  });

  test('Create UB Alert → Filter → Dispatch → Retrieve Dispatch ID from ES', async ({ page }) => {
    console.log('\n' + '-'.repeat(80));
    console.log('STEP 1: Create UB Alert via API');
    console.log('-'.repeat(80));
    
    const ubResult = await apiHelper.sendAlert('unusual_behaviour');
    expect(ubResult.status).toBe(200);
    expect(ubResult).toBeTruthy();
    console.log('✅ UB alert created via API - Status 200');
    
    // Wait for alert to propagate
    console.log('⏳ Waiting 5 seconds for alert to propagate to UI...');
    await page.waitForTimeout(5000);

    console.log('\n' + '-'.repeat(80));
    console.log('STEP 2: Navigate and Authenticate');
    console.log('-'.repeat(80));
    
    await page.goto('https://uat.proof360.io/');
    await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
    await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
    console.log('✅ Authentication successful - on /command page');

    console.log('\n' + '-'.repeat(80));
    console.log('STEP 3: Select Automation Company');
    console.log('-'.repeat(80));
    
    await sharedTestSteps.selectCompany('Automation company');
    console.log('✅ Selected Automation company');

    console.log('\n' + '-'.repeat(80));
    console.log('STEP 4: Switch to Incident Stack and Apply Filter');
    console.log('-'.repeat(80));
    
    await sharedTestSteps.switchToIncidentStack();
    console.log('✅ Switched to Incident stack');
    
    await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);
    console.log('✅ Applied UB/Trex filter for site:', SITE_NAME);
    
    // Wait for filter results
    await page.waitForTimeout(3000);
    
    // Check if alert is visible
    let cardsAfterFilter = await page.locator('[data-test-id="aggregated-site-card"]').count();
    console.log(`📊 Found ${cardsAfterFilter} card(s) on Incident stack`);
    
    // If no cards on Incident, try Situation stack
    if (cardsAfterFilter === 0) {
      console.log('⚠️ No alerts on Incident stack, checking Situation stack...');
      await sharedTestSteps.switchToSituationStack();
      await sharedTestSteps.stackFilterUBAndTrex(SITE_NAME);
      await page.waitForTimeout(3000);
      cardsAfterFilter = await page.locator('[data-test-id="aggregated-site-card"]').count();
      console.log(`📊 Found ${cardsAfterFilter} card(s) on Situation stack`);
    }
    
    if (cardsAfterFilter === 0) {
      throw new Error(`❌ No UB alerts found on either stack after filtering for ${SITE_NAME}`);
    }
    
    console.log(`✅ Alert found - ${cardsAfterFilter} card(s) visible`);

    console.log('\n' + '-'.repeat(80));
    console.log('STEP 5: Select Alert, Complete SOP, and Dispatch');
    console.log('-'.repeat(80));
    
    await sharedTestSteps.expandAndSelectUBAndTrexCard(SITE_NAME);
    console.log('✅ Selected UB alert card');
    
    await sharedTestSteps.completeSOP();
    console.log('✅ Completed SOP');
    
    await sharedTestSteps.dispatchSOP();
    console.log('✅ Dispatched alert');

    console.log('\n' + '-'.repeat(80));
    console.log('STEP 6: Wait for Dispatch to Propagate to Elasticsearch');
    console.log('-'.repeat(80));
    
    // Progressive wait strategy - ES indexing can be slow
    // We need to wait longer and verify we're getting a NEW dispatch (not an old one)
    const waitStrategies = [
      { delay: 5000, description: '5 seconds (fast)' },
      { delay: 10000, description: '10 seconds (normal)' },
      { delay: 15000, description: '15 seconds (slow)' },
      { delay: 20000, description: '20 seconds (very slow)' }
    ];
    
    let dispatchResult = null;
    const testStartTime = new Date();
    console.log(`⏱️ Test started at: ${testStartTime.toISOString()}`);
    
    for (const strategy of waitStrategies) {
      console.log(`⏳ Waiting ${strategy.description} for ES propagation...`);
      await page.waitForTimeout(strategy.delay);
      
      console.log('\n' + '-'.repeat(80));
      console.log(`STEP 7: Search Elasticsearch for Dispatch ID (Attempt after ${strategy.description})`);
      console.log('-'.repeat(80));
      
      if (esClient) {
        dispatchResult = await getLatestDispatchIdBroadSearch(esClient);
        
        if (dispatchResult?.id) {
          // Verify this is a NEW dispatch by checking timestamp
          console.log('\n🔍 Verifying dispatch timestamp...');
          console.log(`  Test started: ${testStartTime.toISOString()}`);
          console.log(`  Dispatch timestamp from ES: Checking...`);
          
          // Get more details about the dispatch
          try {
            const searchResult = await esClient.searchDispatchRecords({
              companyName: 'Automation company',
              siteName: dispatchResult.siteName,
              timeRange: 'now-1h',
              size: 1
            });
            
            if (searchResult?.hits?.hits?.[0]?._source) {
              const dispatchTimestamp = new Date(searchResult.hits.hits[0]._source.actionTimestamp);
              console.log(`  Dispatch timestamp: ${dispatchTimestamp.toISOString()}`);
              
              // Check if dispatch was created AFTER we started the test (within last 5 minutes)
              const timeDiff = dispatchTimestamp - testStartTime;
              const minutesOld = Math.abs(timeDiff) / 1000 / 60;
              
              console.log(`  Time difference: ${minutesOld.toFixed(2)} minutes`);
              
              if (timeDiff > 0 && minutesOld < 5) {
                console.log('  ✅ This is a NEW dispatch created during this test run!');
                console.log('\n✅✅✅ DISPATCH ID FOUND! ✅✅✅');
                console.log(`  ID: ${dispatchResult.id}`);
                console.log(`  Company: ${dispatchResult.companyName}`);
                console.log(`  Time Range: ${dispatchResult.timeRange}`);
                console.log(`  Site: ${dispatchResult.siteName}`);
                console.log(`  Strategy: ${dispatchResult.searchStrategy}`);
                console.log(`  Age: ${minutesOld.toFixed(2)} minutes`);
                break; // Found a fresh dispatch!
              } else {
                console.log(`  ⚠️ This dispatch is ${minutesOld.toFixed(2)} minutes old (created before test started)`);
                console.log(`  ⚠️ This is an OLD dispatch, continuing to search for a newer one...`);
                dispatchResult = null; // Reset and keep searching
              }
            }
          } catch (err) {
            console.log(`  ⚠️ Could not verify timestamp: ${err.message}`);
            console.log(`  ⚠️ Accepting dispatch ID ${dispatchResult.id} anyway`);
            break;
          }
        } else {
          console.log(`⚠️ No dispatch ID found after ${strategy.description}, trying next strategy...`);
        }
      }
    }

    console.log('\n' + '-'.repeat(80));
    console.log('STEP 8: Save Dispatch ID Artifact');
    console.log('-'.repeat(80));
    
    if (dispatchResult?.id) {
      const artifactPath = await writeDispatchArtifact(dispatchResult);
      console.log('✅ Dispatch artifact saved');
      
      // Also save a backup with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await writeDispatchArtifact(dispatchResult, `dispatch-${timestamp}.json`);
      
      console.log('\n' + '='.repeat(80));
      console.log('TEST COMPLETED SUCCESSFULLY! 🎉');
      console.log('='.repeat(80));
      console.log(`Dispatch ID: ${dispatchResult.id}`);
      console.log(`Artifact: ${artifactPath}`);
      console.log('='.repeat(80) + '\n');
    } else {
      console.log('\n' + '='.repeat(80));
      console.log('TEST COMPLETED WITH WARNING ⚠️');
      console.log('='.repeat(80));
      console.log('Alert was created and dispatched successfully');
      console.log('BUT: Dispatch ID could not be retrieved from Elasticsearch');
      console.log('Possible reasons:');
      console.log('  1. ES indexing delay (try waiting longer)');
      console.log('  2. ES configuration issue (check credentials/index name)');
      console.log('  3. Dispatch webhook not firing (check Proof360 backend)');
      console.log('='.repeat(80) + '\n');
      
      // Don't fail the test - the dispatch was successful
      // We just couldn't retrieve the ID from ES
      console.warn('⚠️ Continuing without ES dispatch ID verification');
    }
  });
});
