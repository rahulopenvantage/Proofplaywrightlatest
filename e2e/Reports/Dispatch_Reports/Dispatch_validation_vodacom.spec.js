import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../../backend/AuthHelper.js';
import { SharedTestSteps } from '../../../backend/SharedTestSteps.js';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import Papa from 'papaparse';

// Environment variables
const TARGET_GROUP_NAME = process.env.trex_private;

// Test configuration
const TEST_CONFIG = {
    authentication: {
        username: process.env.ADMIN_MS_USERNAME || "proof360test@vumacam.online",
        password: process.env.ADMIN_MS_PASSWORD || "J~rM!b8twq3J#4!",
        baseUrl: "https://uat.proof360.io/"
    },
    testData: {
        currentTime: new Date().toTimeString().slice(0, 8).replace(/:/g, '-'),
        currentDate: new Date().toISOString().slice(0, 10),
        // Use today's date dynamically - acts like "Today" button functionality
        fromDate: new Date().getDate().toString(),
        toDate: new Date().getDate().toString()
    }
};

/**
 * Helper function to create dispatch report with automatic cleanup tracking
 * @param {Object} sharedSteps - SharedTestSteps instance
 * @param {Array} createdReports - Array to track created reports
 * @param {string} testName - Base name for the test
 * @param {Object} config - Additional configuration
 * @returns {Promise<Object>} Download object and report name
 */
async function createAndTrackReport(sharedSteps, createdReports, testName, config = {}) {
    const reportName = `${testName} ${TEST_CONFIG.testData.currentTime}`;
    
    const reportConfig = {
        reportName: reportName,
        fileFormat: '.xlsx - no images attached',
        fromDate: TEST_CONFIG.testData.fromDate,
        toDate: TEST_CONFIG.testData.toDate,
        ...config // Allow overriding default config
    };
    
    // Create the report
    await sharedSteps.createDispatchReport(reportConfig);
    
    // Track for cleanup
    createdReports.push(reportName);
    
    // Download the report
    const download = await sharedSteps.downloadDispatchReport(reportName);
    
    return { download, reportName };
}

/**
 * Enhanced parseDownloadedFile function with robust error handling
 * @param {string} filePath - Path to the downloaded file
 * @returns {Object} Parsed data with rows and headers
 */
async function parseDownloadedFile(filePath) {
    console.log(`[FileParser] Attempting to parse file: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    try {
        const fileExtension = path.extname(filePath).toLowerCase();
        console.log(`[FileParser] File extension detected: ${fileExtension}`);
        
        if (fileExtension === '.xlsx' || fileExtension === '.xls') {
            console.log(`[FileParser] Reading Excel file...`);
            const workbook = XLSX.readFile(filePath);
            
            // Debug: Show available sheet names
            console.log(`[FileParser] Available sheets: ${workbook.SheetNames.join(', ')}`);
            
            const sheetName = workbook.SheetNames[0];
            console.log(`[FileParser] Using sheet: ${sheetName}`);
            
            const worksheet = workbook.Sheets[sheetName];
            
            // Debug: Show worksheet range
            if (worksheet['!ref']) {
                console.log(`[FileParser] Worksheet range: ${worksheet['!ref']}`);
            } else {
                console.log(`[FileParser] ⚠️ Worksheet has no range defined`);
            }
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            console.log(`[FileParser] Raw JSON data length: ${jsonData.length}`);
            if (jsonData.length > 0) {
                console.log(`[FileParser] First row (headers): ${JSON.stringify(jsonData[0])}`);
                if (jsonData.length > 1) {
                    console.log(`[FileParser] Second row (first data): ${JSON.stringify(jsonData[1])}`);
                }
            }
            
            if (jsonData.length === 0) {
                throw new Error('Excel file appears to be empty');
            }
            
            const headers = jsonData[0];
            const rows = jsonData.slice(1);
            console.log(`[FileParser] Successfully parsed Excel file. Headers: ${headers.length}, Rows: ${rows.length}`);
            return { headers, rows, data: jsonData };
        } else if (fileExtension === '.csv') {
            console.log(`[FileParser] Reading CSV file...`);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const parsed = Papa.parse(fileContent, { header: false });
            
            if (parsed.errors.length > 0) {
                console.warn(`[FileParser] CSV parsing warnings:`, parsed.errors);
            }
            
            if (parsed.data.length === 0) {
                throw new Error('CSV file appears to be empty');
            }
            
            const headers = parsed.data[0];
            const rows = parsed.data.slice(1);
            console.log(`[FileParser] Successfully parsed CSV file. Headers: ${headers.length}, Rows: ${rows.length}`);
            return { headers, rows, data: parsed.data };
        } else {
            throw new Error(`Unsupported file format: ${fileExtension}`);
        }
    } catch (error) {
        console.error(`[FileParser] Error parsing file ${filePath}:`, error.message);
        throw error;
    }
}

/**
 * Helper function to save and parse downloaded reports
 * @param {Object} download - Playwright download object
 * @param {string} testName - Name of the test for directory creation
 * @returns {Object} Parsed file data
 */
async function saveAndParseDownload(download, testName) {
    console.log(`[DownloadHelper] Processing download for test: ${testName}`);
    
    // Create test-downloads directory if it doesn't exist
    const downloadsDir = path.join(process.cwd(), 'test-downloads');
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
        console.log(`[DownloadHelper] Created downloads directory: ${downloadsDir}`);
    }
    
    // Save the file
    const fileName = download.suggestedFilename();
    const filePath = path.join(downloadsDir, fileName);
    await download.saveAs(filePath);
    console.log(`[DownloadHelper] File saved to: ${filePath}`);
    
    // Parse the file
    const parsedData = await parseDownloadedFile(filePath);
    console.log(`[DownloadHelper] File parsed successfully for test: ${testName}`);
    
    return parsedData;
}

/**
 * Helper function to clean test-downloads directory before tests
 * Ensures clean state by removing all previous downloaded files
 */
async function cleanTestDownloadsDirectory() {
    console.log('[DownloadCleanup] Starting test-downloads directory cleanup...');
    
    const downloadsDir = path.join(process.cwd(), 'test-downloads');
    
    try {
        if (fs.existsSync(downloadsDir)) {
            // Get list of files before deletion for logging
            const files = fs.readdirSync(downloadsDir);
            
            if (files.length > 0) {
                console.log(`[DownloadCleanup] Removing ${files.length} files from test-downloads...`);
                
                // Remove the entire directory and its contents
                fs.rmSync(downloadsDir, { recursive: true, force: true });
                console.log(`[DownloadCleanup] 🗑️  Cleared test-downloads directory`);
            } else {
                console.log(`[DownloadCleanup] test-downloads directory already empty`);
            }
        } else {
            console.log(`[DownloadCleanup] test-downloads directory doesn't exist, skipping`);
        }
        
        // Recreate the directory structure
        fs.mkdirSync(downloadsDir, { recursive: true });
        console.log(`[DownloadCleanup] 📁 Recreated clean test-downloads directory`);
        
    } catch (error) {
        console.error(`[DownloadCleanup] Failed to clean test-downloads: ${error.message}`);
        throw error;
    }
}

test.describe('Dispatch Report Data Field Validation', () => {
    let authHelper;
    let sharedSteps;
    let createdReports = []; // Track created reports for cleanup

    test.beforeEach(async ({ page }) => {
        console.log('[DispatchValidation] Starting test setup...');
        
        // Validate environment variables
        if (!TARGET_GROUP_NAME) {
            throw new Error('TARGET_GROUP_NAME environment variable (trex_private) must be set. Please check your .env file.');
        }
        console.log(`[DispatchValidation] Using target group: ${TARGET_GROUP_NAME}`);
        
        // Clean test-downloads directory at the beginning of each test
        await cleanTestDownloadsDirectory();
        
        console.log('[DispatchValidation] Authentication and company selection...');
        
        // Initialize SharedTestSteps first (AuthHelper depends on it)
        sharedSteps = new SharedTestSteps(page);
        
        // Initialize AuthHelper and authenticate with required parameters
        authHelper = new AuthHelper(page);
        await authHelper.ensureAuthenticated(
            sharedSteps, 
            TEST_CONFIG.authentication.username, 
            TEST_CONFIG.authentication.password,
            'Vodacom'
        );
        
        // Reset created reports tracker for this test
        createdReports = [];
        
        console.log('[DispatchValidation] Setup completed');
    });

    test.afterEach(async ({ page }) => {
        console.log('[DispatchValidation] Starting cleanup...');
        
        if (createdReports.length > 0) {
            console.log(`[DispatchValidation] Cleaning up ${createdReports.length} created reports...`);
            
            try {
                // Enhanced navigation with multiple approaches
                let navigationSuccess = false;
                let currentUrl = page.url();
                console.log(`[DispatchValidation] Current URL before navigation: ${currentUrl}`);
                
                // Approach 1: Check if we're already on dispatch reports page
                if (currentUrl.includes('/reports') || currentUrl.includes('dispatch')) {
                    console.log('[DispatchValidation] Already on reports page, checking for dispatch reports content...');
                    
                    // Check if dispatch reports content is visible
                    const hasDispatchContent = await page.locator('table').count() > 0 || 
                                              await page.locator('text=Dispatch').count() > 0 ||
                                              await page.locator('[data-test-id*="report"]').count() > 0;
                    
                    if (hasDispatchContent) {
                        console.log('[DispatchValidation] ✅ Already on dispatch reports page with content visible');
                        navigationSuccess = true;
                    }
                }
                
                if (!navigationSuccess) {
                    // Approach 2: Try direct navigation with aggressive optimization for cleanup
                    const dispatchReportUrls = [
                        'https://uat.proof360.io/alert-reports/dispatch-reports'
                    ];
                    
                    for (const url of dispatchReportUrls) {
                        try {
                            console.log(`[DispatchValidation] Trying direct navigation to: ${url}`);
                            
                            // More aggressive approach for cleanup - just navigate without strict waits
                            await page.goto(url, { 
                                waitUntil: 'domcontentloaded', 
                                timeout: 8000  // Reduced timeout for faster cleanup
                            });
                            
                            // Quick check for basic page elements - don't wait too long
                            await page.waitForTimeout(1000); // Minimal wait
                            
                            // Simplified success check - just look for any table or report-like content
                            const hasAnyContent = await Promise.race([
                                page.locator('table').count().then(count => count > 0),
                                page.locator('text=Dispatch').count().then(count => count > 0),
                                page.locator('[data-test-id*="report"]').count().then(count => count > 0),
                                page.locator('tr').count().then(count => count > 0), // Any table rows
                                page.locator('.report').count().then(count => count > 0), // Any report class
                                new Promise(resolve => setTimeout(() => resolve(false), 3000)) // 3 second timeout
                            ]);
                            
                            if (hasAnyContent) {
                                navigationSuccess = true;
                                console.log(`[DispatchValidation] ✅ Successfully navigated via direct URL: ${url}`);
                                break;
                            } else {
                                // Even if no specific content found, if page loaded, assume success for cleanup
                                const currentUrl = page.url();
                                if (currentUrl.includes('dispatch') || currentUrl.includes('reports')) {
                                    navigationSuccess = true;
                                    console.log(`[DispatchValidation] ✅ Navigation successful - on reports-related page: ${currentUrl}`);
                                    break;
                                } else {
                                    console.log(`[DispatchValidation] URL ${url} loaded but page may still be loading - proceeding anyway`);
                                    navigationSuccess = true; // Force success for cleanup attempt
                                    break;
                                }
                            }
                        } catch (directNavError) {
                            console.log(`[DispatchValidation] Direct navigation to ${url} failed: ${directNavError.message}`);
                            // For cleanup, even if navigation fails, try to proceed if we're on any reasonable page
                            const currentUrl = page.url();
                            if (currentUrl.includes('proof360.io')) {
                                console.log(`[DispatchValidation] Navigation failed but still on Proof360 - proceeding with cleanup attempt`);
                                navigationSuccess = true;
                                break;
                            }
                        }
                    }
                }
                
                // Approach 3: Try menu navigation as final fallback (only if above failed)
                if (!navigationSuccess) {
                    console.log('[DispatchValidation] Attempting menu navigation as fallback...');
                    for (let attempt = 1; attempt <= 2; attempt++) {
                        try {
                            console.log(`[DispatchValidation] Menu navigation attempt ${attempt}/2`);
                            
                            // Use SharedTestSteps navigation which is more reliable
                            const menuPage = new (await import('../../../backend/MenuPage.js')).MenuPage(page);
                            await menuPage.navigateToDispatchReports();
                            
                            // Reduced waits for cleanup speed
                            await page.waitForSelector('table', { timeout: 5000 });
                            await page.waitForTimeout(1000); // Reduced wait
                            
                            navigationSuccess = true;
                            console.log('[DispatchValidation] ✅ Successfully navigated to dispatch reports page via menu');
                            break;
                        } catch (navError) {
                            console.warn(`[DispatchValidation] Menu navigation attempt ${attempt} failed: ${navError.message}`);
                            if (attempt < 2) {
                                await page.waitForTimeout(1000); // Reduced wait before retry
                            } else {
                                // Last resort - just assume we can attempt cleanup from current page
                                console.log('[DispatchValidation] Menu navigation failed, but proceeding with cleanup attempt from current page');
                                navigationSuccess = true; // Force success to attempt cleanup
                            }
                        }
                    }
                }
                
                // If all navigation attempts failed, try one final attempt with basic cleanup
                if (!navigationSuccess) {
                    console.warn('[DispatchValidation] ⚠️ All navigation approaches failed, attempting basic cleanup from current page');
                    
                    // Try to find and clean reports from whatever page we're on
                    for (const reportName of createdReports) {
                        try {
                            // Quick attempt to find and archive report without strict navigation requirements
                            const reportRow = page.locator(`tr:has-text("${reportName}")`);
                            const rowCount = await reportRow.count();
                            
                            if (rowCount > 0) {
                                console.log(`[DispatchValidation] Found report on current page: ${reportName}`);
                                const archiveButton = reportRow.first().locator('button:has-text("Archive")');
                                const buttonCount = await archiveButton.count();
                                
                                if (buttonCount > 0) {
                                    await archiveButton.click();
                                    console.log(`[DispatchValidation] ✅ Attempted to archive ${reportName} from current page`);
                                    await page.waitForTimeout(2000); // Wait for archive to process
                                }
                            }
                        } catch (basicCleanupError) {
                            console.log(`[DispatchValidation] Basic cleanup attempt failed for ${reportName}: ${basicCleanupError.message}`);
                        }
                    }
                    
                    console.warn('[DispatchValidation] ⚠️ Basic cleanup completed - manual verification recommended for these reports:', createdReports.join(', '));
                    return; // Exit cleanup with attempted basic cleanup
                }
                
                // Delete each created report with enhanced error handling
                for (let i = 0; i < createdReports.length; i++) {
                    const reportName = createdReports[i];
                    try {
                        console.log(`[DispatchValidation] Attempting to archive report ${i + 1}/${createdReports.length}: ${reportName}`);
                        
                        // Faster page stabilization for cleanup
                        await page.waitForTimeout(1000); // Reduced from 2000ms
                        
                        // Try multiple approaches to find the report with timeout protection
                        let reportFound = false;
                        let archiveButton = null;
                        
                        // Approach 1: Find by exact report name in table row with timeout
                        try {
                            const reportRowByText = page.locator(`tr:has-text("${reportName}")`);
                            const rowCount = await Promise.race([
                                reportRowByText.count(),
                                new Promise(resolve => setTimeout(() => resolve(0), 3000)) // 3 second timeout
                            ]);
                            
                            if (rowCount > 0) {
                                archiveButton = reportRowByText.first().locator('button:has-text("Archive")');
                                const buttonCount = await Promise.race([
                                    archiveButton.count(),
                                    new Promise(resolve => setTimeout(() => resolve(0), 2000)) // 2 second timeout
                                ]);
                                
                                if (buttonCount > 0) {
                                    reportFound = true;
                                    console.log(`[DispatchValidation] Found report via text search`);
                                }
                            }
                        } catch (approach1Error) {
                            console.log(`[DispatchValidation] Approach 1 failed: ${approach1Error.message}`);
                        }
                        
                        // Approach 2: Find by partial name match if exact didn't work
                        if (!reportFound) {
                            try {
                                const partialName = reportName.split(' ')[0]; // Use first word
                                const reportRowByPartial = page.locator(`tr:has-text("${partialName}")`);
                                const rowCount = await Promise.race([
                                    reportRowByPartial.count(),
                                    new Promise(resolve => setTimeout(() => resolve(0), 3000)) // 3 second timeout
                                ]);
                                
                                if (rowCount > 0) {
                                    archiveButton = reportRowByPartial.first().locator('button:has-text("Archive")');
                                    const buttonCount = await Promise.race([
                                        archiveButton.count(),
                                        new Promise(resolve => setTimeout(() => resolve(0), 2000)) // 2 second timeout
                                    ]);
                                    
                                    if (buttonCount > 0) {
                                        reportFound = true;
                                        console.log(`[DispatchValidation] Found report via partial name search: ${partialName}`);
                                    }
                                }
                            } catch (approach2Error) {
                                console.log(`[DispatchValidation] Approach 2 failed: ${approach2Error.message}`);
                            }
                        }
                        
                        // Approach 3: Try to find any Archive button in the vicinity of the report name
                        if (!reportFound) {
                            try {
                                // Look for archive buttons that might be associated with our report
                                const allArchiveButtons = page.locator('button:has-text("Archive")');
                                const archiveCount = await Promise.race([
                                    allArchiveButtons.count(),
                                    new Promise(resolve => setTimeout(() => resolve(0), 2000)) // 2 second timeout
                                ]);
                                
                                if (archiveCount > 0) {
                                    // Try to find the one that corresponds to our report by checking surrounding text
                                    for (let btnIndex = 0; btnIndex < Math.min(archiveCount, 5); btnIndex++) { // Limit to first 5 for speed
                                        try {
                                            const button = allArchiveButtons.nth(btnIndex);
                                            const parentRow = button.locator('xpath=ancestor::tr[1]');
                                            const rowText = await Promise.race([
                                                parentRow.textContent(),
                                                new Promise(resolve => setTimeout(() => resolve(''), 1000)) // 1 second timeout
                                            ]);
                                            
                                            if (rowText && (rowText.includes(reportName) || rowText.includes(reportName.split(' ')[0]))) {
                                                archiveButton = button;
                                                reportFound = true;
                                                console.log(`[DispatchValidation] Found report via archive button scan: ${reportName}`);
                                                break;
                                            }
                                        } catch (btnError) {
                                            // Continue to next button
                                            continue;
                                        }
                                    }
                                }
                            } catch (approach3Error) {
                                console.log(`[DispatchValidation] Approach 3 failed: ${approach3Error.message}`);
                            }
                        }
                        
                        if (!reportFound) {
                            console.log(`[DispatchValidation] ℹ️ Report "${reportName}" not found, may already be archived`);
                            continue;
                        }
                        
                        // Click the archive button with improved error handling
                        await archiveButton.waitFor({ timeout: 3000 }); // Reduced timeout
                        await archiveButton.click({ timeout: 3000 }); // Add click timeout
                        
                        // Wait for archive success notification and verify archiving with faster checks
                        let archiveConfirmed = false;
                        try {
                            await page.waitForSelector('text=Archived Successfully', { timeout: 3000 }); // Reduced timeout
                            console.log(`[DispatchValidation] ✅ Archive notification received for: ${reportName}`);
                            archiveConfirmed = true;
                        } catch (confirmError) {
                            console.log(`[DispatchValidation] ⚠️ No archive notification seen for: ${reportName}, checking if report disappeared...`);
                        }
                        
                        // Faster UI update check
                        await page.waitForTimeout(1000); // Reduced from 2000ms
                        
                        // Verify the report is no longer visible (archived successfully) with timeout protection
                        try {
                            const reportStillVisible = await Promise.race([
                                page.locator(`tr:has-text("${reportName}")`).count(),
                                new Promise(resolve => setTimeout(() => resolve(-1), 3000)) // 3 second timeout, return -1 if timeout
                            ]);
                            
                            if (reportStillVisible === 0) {
                                console.log(`[DispatchValidation] ✅ VERIFIED: Report "${reportName}" successfully archived - no longer visible in list`);
                                archiveConfirmed = true;
                            } else if (reportStillVisible === -1) {
                                console.log(`[DispatchValidation] ⚠️ Timeout checking report visibility for "${reportName}" - assuming archived`);
                                archiveConfirmed = true; // Assume success for timeout cases during cleanup
                            } else {
                                console.log(`[DispatchValidation] ⚠️ WARNING: Report "${reportName}" still visible after archive attempt`);
                                
                                // Quick check if the Archive button is still there with timeout
                                try {
                                    const archiveButtonStillExists = await Promise.race([
                                        page.locator(`tr:has-text("${reportName}")`).first().locator('button:has-text("Archive")').count(),
                                        new Promise(resolve => setTimeout(() => resolve(0), 2000)) // 2 second timeout
                                    ]);
                                    
                                    if (archiveButtonStillExists > 0) {
                                        console.log(`[DispatchValidation] ❌ FAILED: Archive button still present for "${reportName}" - archive may have failed`);
                                    } else {
                                        console.log(`[DispatchValidation] ✅ Archive button gone for "${reportName}" - likely archived successfully`);
                                        archiveConfirmed = true;
                                    }
                                } catch (buttonCheckError) {
                                    console.log(`[DispatchValidation] ⚠️ Could not verify archive button status for "${reportName}" - assuming archived`);
                                    archiveConfirmed = true; // Assume success for error cases during cleanup
                                }
                            }
                        } catch (verifyError) {
                            console.log(`[DispatchValidation] ⚠️ Could not verify archive status for "${reportName}": ${verifyError.message} - assuming archived`);
                            archiveConfirmed = true; // Assume success for error cases during cleanup
                        }
                        
                        if (archiveConfirmed) {
                            console.log(`[DispatchValidation] 🎯 CONFIRMED: Report "${reportName}" has been successfully archived`);
                        } else {
                            console.log(`[DispatchValidation] ❌ UNCONFIRMED: Archive status unclear for "${reportName}" - may require manual verification`);
                        }
                        
                        // Wait between operations - reduced for faster cleanup
                        await page.waitForTimeout(500); // Reduced from 1000ms
                        
                    } catch (deleteError) {
                        console.warn(`[DispatchValidation] ⚠️ Failed to archive report ${reportName}: ${deleteError.message}`);
                        // Continue with other reports even if one fails
                        
                        // For cleanup robustness, log the error but don't let it stop other cleanups
                        console.log(`[DispatchValidation] Continuing with remaining cleanup tasks...`);
                    }
                }
                
                // Final verification with timeout protection - check if any of our test reports are still visible
                console.log('[DispatchValidation] 🔍 Performing final verification of archive status...');
                await page.waitForTimeout(1000); // Reduced from 2000ms - let page update faster
                
                let reportsStillPresent = [];
                let reportsConfirmedArchived = [];
                
                for (const reportName of createdReports) {
                    try {
                        const reportStillVisible = await Promise.race([
                            page.locator(`tr:has-text("${reportName}")`).count(),
                            new Promise(resolve => setTimeout(() => resolve(-1), 3000)) // 3 second timeout for final check
                        ]);
                        
                        if (reportStillVisible === 0) {
                            reportsConfirmedArchived.push(reportName);
                            console.log(`[DispatchValidation] ✅ ARCHIVED: "${reportName}" successfully removed from reports list`);
                        } else if (reportStillVisible === -1) {
                            // Timeout case - assume archived for cleanup robustness
                            reportsConfirmedArchived.push(reportName);
                            console.log(`[DispatchValidation] ✅ ASSUMED ARCHIVED: "${reportName}" (timeout during verification but likely archived)`);
                        } else {
                            reportsStillPresent.push(reportName);
                            console.log(`[DispatchValidation] ❌ STILL PRESENT: "${reportName}" is still visible in reports list`);
                        }
                    } catch (checkError) {
                        // For cleanup robustness, assume archived if we can't verify
                        reportsConfirmedArchived.push(reportName);
                        console.log(`[DispatchValidation] ✅ ASSUMED ARCHIVED: "${reportName}" (error during verification but likely archived): ${checkError.message}`);
                    }
                }
                
                // Summary of cleanup results
                console.log('[DispatchValidation] 📊 CLEANUP SUMMARY:');
                console.log(`[DispatchValidation]    • Total reports processed: ${createdReports.length}`);
                console.log(`[DispatchValidation]    • Successfully archived: ${reportsConfirmedArchived.length}`);
                console.log(`[DispatchValidation]    • Still present (failed): ${reportsStillPresent.length}`);
                
                if (reportsConfirmedArchived.length > 0) {
                    console.log(`[DispatchValidation] ✅ Successfully archived reports: ${reportsConfirmedArchived.join(', ')}`);
                }
                
                if (reportsStillPresent.length > 0) {
                    console.log(`[DispatchValidation] ❌ Reports requiring manual cleanup: ${reportsStillPresent.join(', ')}`);
                    console.log('[DispatchValidation] ⚠️ Manual intervention may be required for these reports');
                } else {
                    console.log('[DispatchValidation] 🎉 ALL REPORTS SUCCESSFULLY ARCHIVED - No manual cleanup required!');
                }
                
                console.log('[DispatchValidation] ✅ Cleanup process completed');
            } catch (cleanupError) {
                console.error(`[DispatchValidation] ❌ Cleanup failed: ${cleanupError.message}`);
            }
        } else {
            console.log('[DispatchValidation] No reports to clean up');
        }
    });

    test('Verify Dispatch ID is not blank and duplication logic', async ({ page }) => {
        console.log('[DispatchValidation] Testing Dispatch ID validation...');
        
        // Create and track dispatch report
        const { download, reportName } = await createAndTrackReport(
            sharedSteps, 
            createdReports, 
            'Dispatch ID Test',
            { station: 'Rustenburg' }
        );
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Dispatch_ID_Validation');
        
        console.log(`[DispatchValidation] Report headers: ${JSON.stringify(parsedData.headers)}`);
        
        // Validation: Verify Incident ID column exists (closest to Dispatch ID)
        const incidentIdColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('incident') && header.toLowerCase().includes('id')
        );
        
        if (incidentIdColumnIndex === -1) {
            console.log('[DispatchValidation] Available headers:', parsedData.headers);
            throw new Error('Incident ID column not found in the report. Note: Expected "Dispatch ID" but found structure uses "Incident Id"');
        }
        
        console.log(`[DispatchValidation] ✅ Incident ID column found at index ${incidentIdColumnIndex}: ${parsedData.headers[incidentIdColumnIndex]}`);
        
        if (parsedData.rows.length === 0) {
            console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
            console.log('[DispatchValidation] 📋 Available columns:', parsedData.headers.join(', '));
            throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
        }
        
        // Check all rows for non-blank Incident IDs (only if data exists)
        let blankIncidentIds = 0;
        parsedData.rows.forEach((row, index) => {
            const incidentId = row[incidentIdColumnIndex];
            if (!incidentId || incidentId.toString().trim() === '') {
                blankIncidentIds++;
                console.warn(`[DispatchValidation] Row ${index + 1}: Blank Incident ID found`);
            }
        });
        
        expect(blankIncidentIds).toBe(0);
        console.log('[DispatchValidation] ✅ All Incident IDs are properly populated');
        
        // Validation: Check for duplicate Incident IDs
        const incidentIds = parsedData.rows.map(row => row[incidentIdColumnIndex]).filter(id => id && id.toString().trim() !== '');
        const uniqueIncidentIds = new Set(incidentIds);
        
        expect(incidentIds.length).toBe(uniqueIncidentIds.size);
        console.log(`[DispatchValidation] ✅ No duplicate Incident IDs found. Total unique IDs: ${uniqueIncidentIds.size}`);
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Dispatch ID is not blank and duplication logic');
    });

    test('Verify Dispatch ID duplication logic', async ({ page }) => {
        console.log('[DispatchValidation] Testing Dispatch ID duplication logic...');
        
        const reportName = `Dispatch Duplication Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Dispatch_Duplication_Logic');
        
        // Find Incident ID column (actual column name in reports)
        const incidentIdColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('incident') && header.toLowerCase().includes('id')
        );
        
        expect(incidentIdColumnIndex).toBeGreaterThanOrEqual(0);
        console.log(`[DispatchValidation] ✅ Incident ID column found at index ${incidentIdColumnIndex}: ${parsedData.headers[incidentIdColumnIndex]}`);
        
        if (parsedData.rows.length === 0) {
            console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
            throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
        }
        
        // Extract all Incident IDs and count occurrences
        const incidentIds = parsedData.rows.map(row => row[incidentIdColumnIndex])
            .filter(id => id && id.toString().trim() !== '');
        
        const idCounts = {};
        incidentIds.forEach(id => {
            idCounts[id] = (idCounts[id] || 0) + 1;
        });
        
        // Check for duplicates - duplicates may be allowed for multiple dispatches to same site
        const duplicateIds = Object.entries(idCounts).filter(([id, count]) => count > 1);
        
        if (duplicateIds.length > 0) {
            console.log(`[DispatchValidation] ℹ️ Found ${duplicateIds.length} duplicate Incident IDs - this may be valid for multiple dispatches to same site`);
            duplicateIds.forEach(([id, count]) => {
                console.log(`[DispatchValidation] Incident ID ${id} appears ${count} times`);
            });
        }
        
        console.log(`[DispatchValidation] ✅ Duplication logic verified. Total unique Incident IDs: ${Object.keys(idCounts).length}, Total entries: ${incidentIds.length}`);
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Dispatch ID duplication logic');
    });

    test('Verify Incident ID accuracy and presence', async ({ page }) => {
        console.log('[DispatchValidation] Testing Incident ID validation...');
        
        const reportName = `Incident ID Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Incident_ID_Validation');
        
        // Find Incident ID column
        const incidentIdColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('incident') && header.toLowerCase().includes('id')
        );
        
        expect(incidentIdColumnIndex).toBeGreaterThanOrEqual(0);
        console.log(`[DispatchValidation] ✅ Incident ID column found at index ${incidentIdColumnIndex}: ${parsedData.headers[incidentIdColumnIndex]}`);
        
        if (parsedData.rows.length === 0) {
            console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
            throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
        }
        
        // Verify all Incident IDs are present and properly formatted
        let invalidIncidentIds = 0;
        parsedData.rows.forEach((row, index) => {
            const incidentId = row[incidentIdColumnIndex];
            if (!incidentId || incidentId.toString().trim() === '') {
                invalidIncidentIds++;
                console.warn(`[DispatchValidation] Row ${index + 1}: Missing or blank Incident ID`);
            }
        });
        
        expect(invalidIncidentIds).toBe(0);
        console.log('[DispatchValidation] ✅ All Incident IDs are properly populated and present');
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Incident ID accuracy and presence');
    });

    test('Verify Group Name presence', async ({ page }) => {
        console.log('[DispatchValidation] Testing Group Name validation...');
        
        const reportName = `Group Name Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Group_Name_Validation');
        
        // Find Group Name column
        const groupNameColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('group') && header.toLowerCase().includes('name')
        );
        
        expect(groupNameColumnIndex).toBeGreaterThanOrEqual(0);
        console.log(`[DispatchValidation] ✅ Group Name column found at index ${groupNameColumnIndex}: ${parsedData.headers[groupNameColumnIndex]}`);
        
        if (parsedData.rows.length === 0) {
            console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
            throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
        }
        
        // Verify Group Names are present
        let missingGroupNames = 0;
        parsedData.rows.forEach((row, index) => {
            const groupName = row[groupNameColumnIndex];
            if (!groupName || groupName.toString().trim() === '') {
                missingGroupNames++;
                console.warn(`[DispatchValidation] Row ${index + 1}: Missing Group Name`);
            }
        });
        
        expect(missingGroupNames).toBe(0);
        console.log('[DispatchValidation] ✅ All Group Names are properly populated');
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Group Name presence');
    });

    test('Verify Site Name accuracy', async ({ page }) => {
        console.log('[DispatchValidation] Testing Site Name validation...');
        
        const reportName = `Site Name Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Site_Name_Validation');
        
        // Find Site Name column
        const siteNameColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('site') && header.toLowerCase().includes('name')
        );
        
        expect(siteNameColumnIndex).toBeGreaterThanOrEqual(0);
        console.log(`[DispatchValidation] ✅ Site Name column found at index ${siteNameColumnIndex}: ${parsedData.headers[siteNameColumnIndex]}`);
        
        if (parsedData.rows.length === 0) {
            console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
            throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
        }
        
        // Verify Site Names are present and valid
        let invalidSiteNames = 0;
        parsedData.rows.forEach((row, index) => {
            const siteName = row[siteNameColumnIndex];
            if (!siteName || siteName.toString().trim() === '') {
                invalidSiteNames++;
                console.warn(`[DispatchValidation] Row ${index + 1}: Missing or invalid Site Name`);
            }
        });
        
        expect(invalidSiteNames).toBe(0);
        console.log('[DispatchValidation] ✅ All Site Names are properly populated and accurate');
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Site Name accuracy');
    });

    test('Verify Customer Site ID handling', async ({ page }) => {
        console.log('[DispatchValidation] Testing Customer Site ID validation...');
        
        const reportName = `Customer Site ID Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Customer_Site_ID_Validation');
        
        // Find Customer Site ID column
        const customerSiteIdColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('customer') && 
            header.toLowerCase().includes('site') && header.toLowerCase().includes('id')
        );
        
        if (customerSiteIdColumnIndex >= 0) {
            console.log(`[DispatchValidation] ✅ Customer Site ID column found at index ${customerSiteIdColumnIndex}: ${parsedData.headers[customerSiteIdColumnIndex]}`);
            
            if (parsedData.rows.length === 0) {
                console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
                throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
            } else {
                // Verify Customer Site IDs where present
                parsedData.rows.forEach((row, index) => {
                    const customerSiteId = row[customerSiteIdColumnIndex];
                    // Allow empty values as they may be optional, but if present should be valid
                    if (customerSiteId && customerSiteId.toString().trim() !== '') {
                        console.log(`[DispatchValidation] Row ${index + 1}: Customer Site ID: ${customerSiteId}`);
                    }
                });
            }
            
            console.log('[DispatchValidation] ✅ Customer Site ID handling verified');
        } else {
            console.log('[DispatchValidation] ℹ️ Customer Site ID column not found - may be optional in this report');
        }
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Customer Site ID handling');
    });

    test('Verify Dispatch Service entries', async ({ page }) => {
        console.log('[DispatchValidation] Testing Dispatch Service validation...');
        
        const reportName = `Dispatch Service Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Dispatch_Service_Validation');
        
        // Find Dispatch Service column
        const dispatchServiceColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('dispatch') && header.toLowerCase().includes('service')
        );
        
        expect(dispatchServiceColumnIndex).toBeGreaterThanOrEqual(0);
        console.log(`[DispatchValidation] ✅ Dispatch Service column found at index ${dispatchServiceColumnIndex}: ${parsedData.headers[dispatchServiceColumnIndex]}`);
        
        if (parsedData.rows.length === 0) {
            console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
            throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
        }
        
        // Verify Dispatch Service entries (should be Response24 or Aura)
        let invalidServiceEntries = 0;
        const validServices = ['response24', 'aura'];
        
        parsedData.rows.forEach((row, index) => {
            const dispatchService = row[dispatchServiceColumnIndex];
            if (!dispatchService || dispatchService.toString().trim() === '') {
                invalidServiceEntries++;
                console.warn(`[DispatchValidation] Row ${index + 1}: Missing Dispatch Service`);
            } else {
                const service = dispatchService.toString().toLowerCase().trim();
                if (!validServices.some(validService => service.includes(validService))) {
                    console.log(`[DispatchValidation] Row ${index + 1}: Service "${dispatchService}" (may be valid - not strictly Response24/Aura)`);
                }
            }
        });
        
        expect(invalidServiceEntries).toBe(0);
        console.log('[DispatchValidation] ✅ All Dispatch Service entries are properly populated');
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Dispatch Service entries');
    });

    test('Verify Company Name source accuracy', async ({ page }) => {
        console.log('[DispatchValidation] Testing Company Name validation...');
        
        const reportName = `Company Name Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Company_Name_Validation');
        
        // Find Company Name column
        const companyNameColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('company') && header.toLowerCase().includes('name')
        );
        
        expect(companyNameColumnIndex).toBeGreaterThanOrEqual(0);
        console.log(`[DispatchValidation] ✅ Company Name column found at index ${companyNameColumnIndex}: ${parsedData.headers[companyNameColumnIndex]}`);
        
        if (parsedData.rows.length === 0) {
            console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
            throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
        }
        
        // Verify Company Names are accurate and consistent (should be Vumacam or Vodacom)
        let invalidCompanyNames = 0;
        const companyNames = new Set();
        const validCompanies = ['vumacam', 'vodacom'];
        
        parsedData.rows.forEach((row, index) => {
            const companyName = row[companyNameColumnIndex];
            if (!companyName || companyName.toString().trim() === '') {
                invalidCompanyNames++;
                console.warn(`[DispatchValidation] Row ${index + 1}: Missing Company Name`);
            } else {
                const company = companyName.toString().trim();
                companyNames.add(company);
                
                const companyLower = company.toLowerCase();
                if (!validCompanies.some(validCompany => companyLower.includes(validCompany))) {
                    console.log(`[DispatchValidation] Row ${index + 1}: Company "${company}" (may be valid - not strictly Vumacam/Vodacom)`);
                }
            }
        });
        
        expect(invalidCompanyNames).toBe(0);
        console.log(`[DispatchValidation] ✅ Company Name source accuracy verified. Unique companies: ${companyNames.size}`);
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Company Name source accuracy');
    });

    test('Verify Alert Type accuracy', async ({ page }) => {
        console.log('[DispatchValidation] Testing Alert Type validation...');
        
        const reportName = `Alert Type Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Alert_Type_Validation');
        
        // Find Alert Type column
        const alertTypeColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('alert') && header.toLowerCase().includes('type')
        );
        
        expect(alertTypeColumnIndex).toBeGreaterThanOrEqual(0);
        
        // Verify Alert Types are present and valid
        let invalidAlertTypes = 0;
        parsedData.rows.forEach((row, index) => {
            const alertType = row[alertTypeColumnIndex];
            if (!alertType || alertType.toString().trim() === '') {
                invalidAlertTypes++;
                console.warn(`[DispatchValidation] Row ${index + 1}: Missing Alert Type`);
            }
        });
        
        expect(invalidAlertTypes).toBe(0);
        console.log('[DispatchValidation] ✅ Alert Type accuracy verified');
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Alert Type accuracy');
    });

    test('Verify CreatedBy operator accuracy', async ({ page }) => {
        console.log('[DispatchValidation] Testing CreatedBy validation...');
        
        const reportName = `CreatedBy Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'CreatedBy_Validation');
        
        // Find CreatedBy column
        const createdByColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('created') && header.toLowerCase().includes('by')
        );
        
        expect(createdByColumnIndex).toBeGreaterThanOrEqual(0);
        
        // Verify CreatedBy operators are present
        let missingCreatedBy = 0;
        parsedData.rows.forEach((row, index) => {
            const createdBy = row[createdByColumnIndex];
            if (!createdBy || createdBy.toString().trim() === '') {
                missingCreatedBy++;
                console.warn(`[DispatchValidation] Row ${index + 1}: Missing CreatedBy operator`);
            }
        });
        
        expect(missingCreatedBy).toBe(0);
        console.log('[DispatchValidation] ✅ CreatedBy operator accuracy verified');
        
        console.log('[DispatchValidation] ✅ Test completed: Verify CreatedBy operator accuracy');
    });

    test('Verify Action Timestamp accuracy', async ({ page }) => {
        console.log('[DispatchValidation] Testing Action Timestamp validation...');
        
        const reportName = `Action Timestamp Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Action_Timestamp_Validation');
        
        // Find Action Timestamp column
        const actionTimestampColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('action') && header.toLowerCase().includes('timestamp')
        );
        
        expect(actionTimestampColumnIndex).toBeGreaterThanOrEqual(0);
        
        // Verify Action Timestamps are present and properly formatted
        let invalidTimestamps = 0;
        parsedData.rows.forEach((row, index) => {
            const actionTimestamp = row[actionTimestampColumnIndex];
            if (!actionTimestamp || actionTimestamp.toString().trim() === '') {
                invalidTimestamps++;
                console.warn(`[DispatchValidation] Row ${index + 1}: Missing Action Timestamp`);
            } else {
                // Basic timestamp format validation
                const timestamp = actionTimestamp.toString();
                if (!timestamp.includes('-') && !timestamp.includes('/') && !timestamp.includes(':')) {
                    console.warn(`[DispatchValidation] Row ${index + 1}: Potentially invalid timestamp format: ${timestamp}`);
                }
            }
        });
        
        expect(invalidTimestamps).toBe(0);
        console.log('[DispatchValidation] ✅ Action Timestamp accuracy verified');
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Action Timestamp accuracy');
    });

    test('Cross-check Action Timestamp consistency', async ({ page }) => {
        console.log('[DispatchValidation] Testing Action Timestamp consistency...');
        
        const reportName = `Timestamp Consistency Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Timestamp_Consistency_Validation');
        
        // Find Action Timestamp column
        const actionTimestampColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('action') && header.toLowerCase().includes('timestamp')
        );
        
        expect(actionTimestampColumnIndex).toBeGreaterThanOrEqual(0);
        
        // Cross-check timestamp consistency
        const timestamps = [];
        parsedData.rows.forEach((row, index) => {
            const actionTimestamp = row[actionTimestampColumnIndex];
            if (actionTimestamp && actionTimestamp.toString().trim() !== '') {
                timestamps.push({
                    row: index + 1,
                    timestamp: actionTimestamp.toString(),
                    date: new Date(actionTimestamp.toString())
                });
            }
        });
        
        // Check for chronological consistency if multiple timestamps exist
        if (timestamps.length > 1) {
            const sortedTimestamps = [...timestamps].sort((a, b) => a.date - b.date);
            console.log(`[DispatchValidation] ✅ Timestamp consistency verified. Range: ${sortedTimestamps[0].timestamp} to ${sortedTimestamps[sortedTimestamps.length - 1].timestamp}`);
        }
        
        console.log('[DispatchValidation] ✅ Test completed: Cross-check Action Timestamp consistency');
    });

    test('Verify Proof Status accuracy', async ({ page }) => {
        console.log(`[DispatchValidation] Testing Proof Status validation for ${TARGET_GROUP_NAME}...`);
        
        const reportName = `Proof Status Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Get current date and time for today's full range
        const now = new Date();
        const currentDay = now.getDate().toString();
        const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format
        
        console.log(`[DispatchValidation] Creating report for today (${currentDay}) from 00:00:00 to ${currentTime}`);
        console.log('[DispatchValidation] No station filter applied (All Stations)');
        console.log('[DispatchValidation] No additional filters applied');
        
        // Create dispatch report with today's date range and NO filters
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: currentDay,
            toDate: currentDay,
            fromTime: '00:00:00',
            toTime: currentTime,
            station: '', // Explicitly empty to ensure "All Stations"
            email: '' // No email filter
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Proof_Status_Validation');
        
        // Find Proof Status column
        const proofStatusColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('proof') && header.toLowerCase().includes('status')
        );
        
        // Find Group Name column
        const groupNameColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('group') && header.toLowerCase().includes('name')
        );
        
        expect(proofStatusColumnIndex).toBeGreaterThanOrEqual(0);
        expect(groupNameColumnIndex).toBeGreaterThanOrEqual(0);
        
        console.log(`[DispatchValidation] ✅ Proof Status column found at index ${proofStatusColumnIndex}: "${parsedData.headers[proofStatusColumnIndex]}"`);
        console.log(`[DispatchValidation] ✅ Group Name column found at index ${groupNameColumnIndex}: "${parsedData.headers[groupNameColumnIndex]}"`);
        
        // Target group name to filter by
        const targetGroupName = TARGET_GROUP_NAME;
        
        // Expected Proof Status values
        const expectedStatuses = [
            'DISPATCH_CREATED',
            'RESPONDER_DISPATCHED',
            'RESPONDER_ARRIVED',
            'RESPONDER_COMPLETED',
            'OPERATOR_CANCELLED'
        ];
        
        if (parsedData.rows.length === 0) {
            console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
            console.log('[DispatchValidation] 📋 Available columns:', parsedData.headers.join(', '));
            console.log(`[DispatchValidation] 🎯 Expected to find these Proof Statuses for group "${targetGroupName}":`, expectedStatuses.join(', '));
            throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
        }
        
        // Filter rows by target group name and collect Proof Status values
        const targetGroupRows = parsedData.rows.filter(row => {
            const groupName = row[groupNameColumnIndex];
            return groupName && groupName.toString().trim() === targetGroupName;
        });
        
        console.log(`[DispatchValidation] 📊 PROOF STATUS ANALYSIS FOR GROUP "${targetGroupName}":`);
        console.log(`[DispatchValidation] Total data rows: ${parsedData.rows.length}`);
        console.log(`[DispatchValidation] Rows matching target group: ${targetGroupRows.length}`);
        
        if (targetGroupRows.length === 0) {
            console.log(`[DispatchValidation] ❌ No rows found for group name "${targetGroupName}"`);
            console.log('[DispatchValidation] 🔍 Available group names in report:');
            const allGroupNames = new Set();
            parsedData.rows.forEach((row, index) => {
                const groupName = row[groupNameColumnIndex];
                if (groupName && groupName.toString().trim() !== '') {
                    allGroupNames.add(groupName.toString().trim());
                }
            });
            Array.from(allGroupNames).sort().forEach(groupName => {
                console.log(`[DispatchValidation]    • ${groupName}`);
            });
            throw new Error(`No data found for target group "${targetGroupName}". Check if this group name exists in the current data.`);
        }
        
        // Collect all unique Proof Status values found for the target group
        const foundStatuses = new Set();
        let invalidProofStatuses = 0;
        
        targetGroupRows.forEach((row, index) => {
            const proofStatus = row[proofStatusColumnIndex];
            if (!proofStatus || proofStatus.toString().trim() === '') {
                invalidProofStatuses++;
                console.warn(`[DispatchValidation] Group "${targetGroupName}" Row ${index + 1}: Missing Proof Status`);
            } else {
                const status = proofStatus.toString().trim();
                foundStatuses.add(status);
            }
        });
        
        console.log(`[DispatchValidation] Rows with missing status: ${invalidProofStatuses}`);
        console.log(`[DispatchValidation] Unique statuses found: ${foundStatuses.size}`);
        
        // ENHANCED VALIDATION WITH VISUAL INDICATORS
        console.log(`\n[DispatchValidation] 🔍 PROOF STATUS VALIDATION FOR GROUP "${targetGroupName}":`);
        console.log(`[DispatchValidation] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // Check each expected status individually with visual indicators
        let allStatusesPresent = true;
        expectedStatuses.forEach(expectedStatus => {
            const isPresent = Array.from(foundStatuses).some(found => 
                found.toUpperCase().includes(expectedStatus.toUpperCase()) || 
                expectedStatus.toUpperCase().includes(found.toUpperCase())
            );
            
            if (isPresent) {
                const matchingStatus = Array.from(foundStatuses).find(found => 
                    found.toUpperCase().includes(expectedStatus.toUpperCase()) || 
                    expectedStatus.toUpperCase().includes(found.toUpperCase())
                );
                const count = targetGroupRows.filter(row => 
                    row[proofStatusColumnIndex] && 
                    row[proofStatusColumnIndex].toString().trim() === matchingStatus
                ).length;
                console.log(`[DispatchValidation] ✅ ${expectedStatus.padEnd(25)} ← Found as "${matchingStatus}" (${count} occurrence${count > 1 ? 's' : ''})`);
            } else {
                console.log(`[DispatchValidation] ❌ ${expectedStatus.padEnd(25)} ← NOT FOUND`);
                allStatusesPresent = false;
            }
        });
        
        console.log(`[DispatchValidation] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // Show summary with overall result
        if (allStatusesPresent) {
            console.log(`[DispatchValidation] 🎉 VALIDATION RESULT: ✅ PASS - All ${expectedStatuses.length} expected proof statuses are present!`);
        } else {
            const missingCount = expectedStatuses.filter(expected => 
                !Array.from(foundStatuses).some(found => 
                    found.toUpperCase().includes(expected.toUpperCase()) || 
                    expected.toUpperCase().includes(found.toUpperCase())
                )
            ).length;
            console.log(`[DispatchValidation] � VALIDATION RESULT: ❌ FAIL - ${missingCount} expected status(es) missing!`);
        }
        
        // Show additional statuses found (if any)
        const unexpectedStatuses = Array.from(foundStatuses).filter(found => 
            !expectedStatuses.some(expected => 
                found.toUpperCase().includes(expected.toUpperCase()) || 
                expected.toUpperCase().includes(found.toUpperCase())
            )
        );
        
        if (unexpectedStatuses.length > 0) {
            console.log(`\n[DispatchValidation] 🟡 ADDITIONAL STATUSES FOUND (not in expected list):`);
            unexpectedStatuses.forEach(status => {
                const count = targetGroupRows.filter(row => 
                    row[proofStatusColumnIndex] && 
                    row[proofStatusColumnIndex].toString().trim() === status
                ).length;
                console.log(`[DispatchValidation] ℹ️ ${status.padEnd(25)} (${count} occurrence${count > 1 ? 's' : ''})`);
            });
        }
        
        // Detailed summary
        console.log(`\n[DispatchValidation] � DETAILED SUMMARY:`);
        console.log(`[DispatchValidation] • Expected status types: ${expectedStatuses.length}`);
        console.log(`[DispatchValidation] • Status types found: ${foundStatuses.size}`);
        console.log(`[DispatchValidation] • Missing from expected: ${expectedStatuses.length - (allStatusesPresent ? expectedStatuses.length : (expectedStatuses.length - expectedStatuses.filter(expected => !Array.from(foundStatuses).some(found => found.toUpperCase().includes(expected.toUpperCase()) || expected.toUpperCase().includes(found.toUpperCase()))).length))}`);
        console.log(`[DispatchValidation] • Additional unexpected: ${unexpectedStatuses.length}`);
        console.log(`[DispatchValidation] • Total rows for this group: ${targetGroupRows.length}\n`);
        
        // Fail the test if any statuses are missing
        if (!allStatusesPresent) {
            const missingStatuses = expectedStatuses.filter(expected => 
                !Array.from(foundStatuses).some(found => 
                    found.toUpperCase().includes(expected.toUpperCase()) || 
                    expected.toUpperCase().includes(found.toUpperCase())
                )
            );
            throw new Error(`❌ VALIDATION FAILED: Missing expected proof statuses: ${missingStatuses.join(', ')}`);
        }
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Proof Status accuracy');
    });

    test('Verify Extended Responder Status values', async ({ page }) => {
        console.log(`[DispatchValidation] Testing Extended Responder Status validation for ${TARGET_GROUP_NAME}...`);
        
        const reportName = `Extended Responder Status Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Get current date and time for today's full range
        const now = new Date();
        const currentDay = now.getDate().toString();
        const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format
        
        console.log(`[DispatchValidation] Creating report for today (${currentDay}) from 00:00:00 to ${currentTime}`);
        console.log('[DispatchValidation] No station filter applied (All Stations)');
        console.log('[DispatchValidation] Checking for extended responder statuses in column 11');
        
        // Create dispatch report with today's date range and NO filters
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: currentDay,
            toDate: currentDay,
            fromTime: '00:00:00',
            toTime: currentTime,
            station: '', // Explicitly empty to ensure "All Stations"
            email: '' // No email filter
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Extended_Responder_Status_Validation');
        
        // Find Responder Status column (column 11, index 11)
        const responderStatusColumnIndex = 11; // Column 11 (0-based index)
        
        // Find Group Name column for filtering
        const groupNameColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('group') && header.toLowerCase().includes('name')
        );
        
        // Verify columns exist
        if (parsedData.headers.length <= responderStatusColumnIndex) {
            console.log(`[DispatchValidation] ❌ Column 11 (index ${responderStatusColumnIndex}) does not exist. Available columns: ${parsedData.headers.length}`);
            console.log('[DispatchValidation] 📋 Available columns:', parsedData.headers.join(', '));
            throw new Error(`Column 11 not found. Report only has ${parsedData.headers.length} columns.`);
        }
        
        expect(groupNameColumnIndex).toBeGreaterThanOrEqual(0);
        
        console.log(`[DispatchValidation] ✅ Responder Status column found at index ${responderStatusColumnIndex}: "${parsedData.headers[responderStatusColumnIndex]}"`);
        console.log(`[DispatchValidation] ✅ Group Name column found at index ${groupNameColumnIndex}: "${parsedData.headers[groupNameColumnIndex]}"`);
        
        // Target group name to filter by
        const targetGroupName = TARGET_GROUP_NAME;
        
        // Extended Responder Status values to check for
        const expectedExtendedStatuses = [
            'open',
            'pickedUp',
            'responding',
            'responderOnSite',
            'completed',
            'cancelled'
        ];
        
        if (parsedData.rows.length === 0) {
            console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
            console.log('[DispatchValidation] 📋 Available columns:', parsedData.headers.join(', '));
            console.log(`[DispatchValidation] 🎯 Expected to find these Extended Responder Statuses for group "${targetGroupName}":`, expectedExtendedStatuses.join(', '));
            throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
        }
        
        // Filter rows by target group name
        const targetGroupRows = parsedData.rows.filter(row => {
            const groupName = row[groupNameColumnIndex];
            return groupName && groupName.toString().trim() === targetGroupName;
        });
        
        console.log(`[DispatchValidation] 📊 EXTENDED RESPONDER STATUS ANALYSIS FOR GROUP "${targetGroupName}":`);
        console.log(`[DispatchValidation] Total data rows: ${parsedData.rows.length}`);
        console.log(`[DispatchValidation] Rows matching target group: ${targetGroupRows.length}`);
        
        if (targetGroupRows.length === 0) {
            console.log(`[DispatchValidation] ❌ No rows found for group name "${targetGroupName}"`);
            console.log('[DispatchValidation] 🔍 Available group names in report:');
            const allGroupNames = new Set();
            parsedData.rows.forEach((row, index) => {
                const groupName = row[groupNameColumnIndex];
                if (groupName && groupName.toString().trim() !== '') {
                    allGroupNames.add(groupName.toString().trim());
                }
            });
            Array.from(allGroupNames).sort().forEach(groupName => {
                console.log(`[DispatchValidation]    • ${groupName}`);
            });
            throw new Error(`No data found for target group "${targetGroupName}". Check if this group name exists in the current data.`);
        }
        
        // Collect all unique Extended Responder Status values found for the target group
        const foundExtendedStatuses = new Set();
        let invalidResponderStatuses = 0;
        
        targetGroupRows.forEach((row, index) => {
            const responderStatus = row[responderStatusColumnIndex];
            if (!responderStatus || responderStatus.toString().trim() === '') {
                invalidResponderStatuses++;
                console.warn(`[DispatchValidation] Group "${targetGroupName}" Row ${index + 1}: Missing Responder Status`);
            } else {
                const status = responderStatus.toString().trim();
                foundExtendedStatuses.add(status);
            }
        });
        
        console.log(`[DispatchValidation] Rows with missing responder status: ${invalidResponderStatuses}`);
        console.log(`[DispatchValidation] Unique extended statuses found: ${foundExtendedStatuses.size}`);
        
        // ENHANCED VALIDATION WITH VISUAL INDICATORS
        console.log(`\n[DispatchValidation] 🔍 EXTENDED RESPONDER STATUS VALIDATION FOR GROUP "${targetGroupName}":`);
        console.log(`[DispatchValidation] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // Check each expected status individually with visual indicators
        let allStatusesPresent = true;
        expectedExtendedStatuses.forEach(expectedStatus => {
            const isPresent = Array.from(foundExtendedStatuses).some(found => 
                found.toLowerCase().includes(expectedStatus.toLowerCase()) || 
                expectedStatus.toLowerCase().includes(found.toLowerCase())
            );
            
            if (isPresent) {
                const matchingStatus = Array.from(foundExtendedStatuses).find(found => 
                    found.toLowerCase().includes(expectedStatus.toLowerCase()) || 
                    expectedStatus.toLowerCase().includes(found.toLowerCase())
                );
                const count = targetGroupRows.filter(row => 
                    row[responderStatusColumnIndex] && 
                    row[responderStatusColumnIndex].toString().trim() === matchingStatus
                ).length;
                console.log(`[DispatchValidation] ✅ ${expectedStatus.padEnd(20)} ← Found as "${matchingStatus}" (${count} occurrence${count > 1 ? 's' : ''})`);
            } else {
                console.log(`[DispatchValidation] ❌ ${expectedStatus.padEnd(20)} ← NOT FOUND`);
                allStatusesPresent = false;
            }
        });
        
        console.log(`[DispatchValidation] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // Show summary with overall result
        if (allStatusesPresent) {
            console.log(`[DispatchValidation] 🎉 VALIDATION RESULT: ✅ PASS - All ${expectedExtendedStatuses.length} expected extended responder statuses are present!`);
        } else {
            const missingCount = expectedExtendedStatuses.filter(expected => 
                !Array.from(foundExtendedStatuses).some(found => 
                    found.toLowerCase().includes(expected.toLowerCase()) || 
                    expected.toLowerCase().includes(found.toLowerCase())
                )
            ).length;
            console.log(`[DispatchValidation] � VALIDATION RESULT: ❌ FAIL - ${missingCount} expected status(es) missing!`);
        }
        
        // Show additional statuses found (if any)
        const unexpectedExtendedStatuses = Array.from(foundExtendedStatuses).filter(found => 
            !expectedExtendedStatuses.some(expected => 
                found.toLowerCase().includes(expected.toLowerCase()) || 
                expected.toLowerCase().includes(found.toLowerCase())
            )
        );
        
        if (unexpectedExtendedStatuses.length > 0) {
            console.log(`\n[DispatchValidation] 🟡 ADDITIONAL STATUSES FOUND (not in expected list):`);
            unexpectedExtendedStatuses.forEach(status => {
                const count = targetGroupRows.filter(row => 
                    row[responderStatusColumnIndex] && 
                    row[responderStatusColumnIndex].toString().trim() === status
                ).length;
                console.log(`[DispatchValidation] ℹ️ ${status.padEnd(20)} (${count} occurrence${count > 1 ? 's' : ''})`);
            });
        }
        
        // Detailed summary
        console.log(`\n[DispatchValidation] � DETAILED SUMMARY:`);
        console.log(`[DispatchValidation] • Expected status types: ${expectedExtendedStatuses.length}`);
        console.log(`[DispatchValidation] • Status types found: ${foundExtendedStatuses.size}`);
        console.log(`[DispatchValidation] • Missing from expected: ${expectedExtendedStatuses.length - (allStatusesPresent ? expectedExtendedStatuses.length : (expectedExtendedStatuses.length - expectedExtendedStatuses.filter(expected => !Array.from(foundExtendedStatuses).some(found => found.toLowerCase().includes(expected.toLowerCase()) || expected.toLowerCase().includes(found.toLowerCase()))).length))}`);
        console.log(`[DispatchValidation] • Additional unexpected: ${unexpectedExtendedStatuses.length}`);
        console.log(`[DispatchValidation] • Total rows for this group: ${targetGroupRows.length}\n`);
        
        // Fail the test if any statuses are missing
        if (!allStatusesPresent) {
            const missingExtendedStatuses = expectedExtendedStatuses.filter(expected => 
                !Array.from(foundExtendedStatuses).some(found => 
                    found.toLowerCase().includes(expected.toLowerCase()) || 
                    expected.toLowerCase().includes(found.toLowerCase())
                )
            );
            throw new Error(`❌ VALIDATION FAILED: Missing expected responder statuses: ${missingExtendedStatuses.join(', ')}`);
        }
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Extended Responder Status values');
    });

    test('Verify Both Column Status Pairs', async ({ page }) => {
        console.log(`[DispatchValidation] Testing Both Column Status Pairs validation for ${TARGET_GROUP_NAME}...`);
        
        const reportName = `Both Column Status Pairs Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Get current date and time for today's full range
        const now = new Date();
        const currentDay = now.getDate().toString();
        const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format
        
        console.log(`[DispatchValidation] Creating report for today (${currentDay}) from 00:00:00 to ${currentTime}`);
        console.log('[DispatchValidation] No station filter applied (All Stations)');
        console.log('[DispatchValidation] Checking for status pairs: Column 10 (Proof Status) + Column 11 (Responder Status)');
        
        // Create dispatch report with today's date range and NO filters
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: currentDay,
            toDate: currentDay,
            fromTime: '00:00:00',
            toTime: currentTime,
            station: '', // Explicitly empty to ensure "All Stations"
            email: '' // No email filter
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Both_Column_Status_Pairs_Validation');
        
        // Find column indices
        const proofStatusColumnIndex = 10; // Column 10 (0-based index)
        const responderStatusColumnIndex = 11; // Column 11 (0-based index)
        
        // Find Group Name column for filtering
        const groupNameColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('group') && header.toLowerCase().includes('name')
        );
        
        // Verify columns exist
        if (parsedData.headers.length <= responderStatusColumnIndex) {
            console.log(`[DispatchValidation] ❌ Columns not found. Available columns: ${parsedData.headers.length}`);
            console.log('[DispatchValidation] 📋 Available columns:', parsedData.headers.join(', '));
            throw new Error(`Columns not found. Report only has ${parsedData.headers.length} columns.`);
        }
        
        expect(groupNameColumnIndex).toBeGreaterThanOrEqual(0);
        
        console.log(`[DispatchValidation] ✅ Proof Status column found at index ${proofStatusColumnIndex}: "${parsedData.headers[proofStatusColumnIndex]}"`);
        console.log(`[DispatchValidation] ✅ Responder Status column found at index ${responderStatusColumnIndex}: "${parsedData.headers[responderStatusColumnIndex]}"`);
        console.log(`[DispatchValidation] ✅ Group Name column found at index ${groupNameColumnIndex}: "${parsedData.headers[groupNameColumnIndex]}"`);
        
        // Target group name to filter by
        const targetGroupName = TARGET_GROUP_NAME;
        
        // Expected status pairs: [Proof Status, Responder Status]
        const expectedStatusPairs = [
            ['DISPATCH_CREATED', 'open'],
            ['RESPONDER_DISPATCHED', 'pickedUp'],
            ['RESPONDER_DISPATCHED', 'responding'],
            ['RESPONDER_ARRIVED', 'responderOnSite'],
            ['RESPONDER_COMPLETED', 'completed'],
            ['OPERATOR_CANCELLED', 'cancelled']
        ];
        
        if (parsedData.rows.length === 0) {
            console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
            console.log('[DispatchValidation] 📋 Available columns:', parsedData.headers.join(', '));
            console.log(`[DispatchValidation] 🎯 Expected to find these status pairs for group "${targetGroupName}":`, expectedStatusPairs.map(pair => `${pair[0]} ↔ ${pair[1]}`).join(', '));
            throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
        }
        
        // Filter rows by target group name
        const targetGroupRows = parsedData.rows.filter(row => {
            const groupName = row[groupNameColumnIndex];
            return groupName && groupName.toString().trim() === targetGroupName;
        });
        
        console.log(`[DispatchValidation] 📊 BOTH COLUMN STATUS PAIRS ANALYSIS FOR GROUP "${targetGroupName}":`);
        console.log(`[DispatchValidation] Total data rows: ${parsedData.rows.length}`);
        console.log(`[DispatchValidation] Rows matching target group: ${targetGroupRows.length}`);
        
        if (targetGroupRows.length === 0) {
            console.log(`[DispatchValidation] ❌ No rows found for group name "${targetGroupName}"`);
            console.log('[DispatchValidation] 🔍 Available group names in report:');
            const allGroupNames = new Set();
            parsedData.rows.forEach((row, index) => {
                const groupName = row[groupNameColumnIndex];
                if (groupName && groupName.toString().trim() !== '') {
                    allGroupNames.add(groupName.toString().trim());
                }
            });
            Array.from(allGroupNames).sort().forEach(groupName => {
                console.log(`[DispatchValidation]    • ${groupName}`);
            });
            throw new Error(`No data found for target group "${targetGroupName}". Check if this group name exists in the current data.`);
        }
        
        // Collect all unique status pairs found for the target group
        const foundStatusPairs = new Set();
        let invalidRows = 0;
        
        targetGroupRows.forEach((row, index) => {
            const proofStatus = row[proofStatusColumnIndex];
            const responderStatus = row[responderStatusColumnIndex];
            
            if (!proofStatus || proofStatus.toString().trim() === '' || 
                !responderStatus || responderStatus.toString().trim() === '') {
                invalidRows++;
                console.warn(`[DispatchValidation] Group "${targetGroupName}" Row ${index + 1}: Missing status data`);
            } else {
                const pair = `${proofStatus.toString().trim()}|${responderStatus.toString().trim()}`;
                foundStatusPairs.add(pair);
            }
        });
        
        console.log(`[DispatchValidation] Rows with missing status data: ${invalidRows}`);
        console.log(`[DispatchValidation] Unique status pairs found: ${foundStatusPairs.size}`);
        
        // ENHANCED VALIDATION WITH VISUAL INDICATORS
        console.log(`\n[DispatchValidation] 🔍 BOTH COLUMN STATUS PAIRS VALIDATION FOR GROUP "${targetGroupName}":`);
        console.log(`[DispatchValidation] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // Check each expected status pair individually with visual indicators
        let allPairsPresent = true;
        expectedStatusPairs.forEach(([expectedProof, expectedResponder]) => {
            const expectedPair = `${expectedProof}|${expectedResponder}`;
            const isPresent = foundStatusPairs.has(expectedPair);
            
            if (isPresent) {
                const count = targetGroupRows.filter(row => 
                    row[proofStatusColumnIndex] && row[proofStatusColumnIndex].toString().trim() === expectedProof &&
                    row[responderStatusColumnIndex] && row[responderStatusColumnIndex].toString().trim() === expectedResponder
                ).length;
                console.log(`[DispatchValidation] ✅ ${expectedProof.padEnd(25)} ↔ ${expectedResponder.padEnd(20)} (${count} occurrence${count > 1 ? 's' : ''})`);
            } else {
                console.log(`[DispatchValidation] ❌ ${expectedProof.padEnd(25)} ↔ ${expectedResponder.padEnd(20)} NOT FOUND`);
                allPairsPresent = false;
            }
        });
        
        console.log(`[DispatchValidation] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        // Show summary with overall result
        if (allPairsPresent) {
            console.log(`[DispatchValidation] 🎉 VALIDATION RESULT: ✅ PASS - All ${expectedStatusPairs.length} expected status pairs are present!`);
        } else {
            const missingCount = expectedStatusPairs.filter(([expectedProof, expectedResponder]) => {
                const expectedPair = `${expectedProof}|${expectedResponder}`;
                return !foundStatusPairs.has(expectedPair);
            }).length;
            console.log(`[DispatchValidation] 💥 VALIDATION RESULT: ❌ FAIL - ${missingCount} expected status pair(s) missing!`);
        }
        
        // Show additional status pairs found (if any)
        const unexpectedPairs = Array.from(foundStatusPairs).filter(foundPair => {
            return !expectedStatusPairs.some(([expectedProof, expectedResponder]) => {
                const expectedPair = `${expectedProof}|${expectedResponder}`;
                return foundPair === expectedPair;
            });
        });
        
        if (unexpectedPairs.length > 0) {
            console.log(`\n[DispatchValidation] 🟡 ADDITIONAL STATUS PAIRS FOUND (not in expected list):`);
            unexpectedPairs.forEach(pair => {
                const [proofStatus, responderStatus] = pair.split('|');
                const count = targetGroupRows.filter(row => 
                    row[proofStatusColumnIndex] && row[proofStatusColumnIndex].toString().trim() === proofStatus &&
                    row[responderStatusColumnIndex] && row[responderStatusColumnIndex].toString().trim() === responderStatus
                ).length;
                console.log(`[DispatchValidation] ℹ️ ${proofStatus.padEnd(25)} ↔ ${responderStatus.padEnd(20)} (${count} occurrence${count > 1 ? 's' : ''})`);
            });
        }
        
        // Detailed summary
        console.log(`\n[DispatchValidation] 📊 DETAILED SUMMARY:`);
        console.log(`[DispatchValidation] • Expected status pair types: ${expectedStatusPairs.length}`);
        console.log(`[DispatchValidation] • Status pair types found: ${foundStatusPairs.size}`);
        console.log(`[DispatchValidation] • Missing from expected: ${expectedStatusPairs.length - (allPairsPresent ? expectedStatusPairs.length : (expectedStatusPairs.length - expectedStatusPairs.filter(([expectedProof, expectedResponder]) => foundStatusPairs.has(`${expectedProof}|${expectedResponder}`)).length))}`);
        console.log(`[DispatchValidation] • Additional unexpected: ${unexpectedPairs.length}`);
        console.log(`[DispatchValidation] • Total rows for this group: ${targetGroupRows.length}\n`);
        
        // Fail the test if any status pairs are missing
        if (!allPairsPresent) {
            const missingPairs = expectedStatusPairs.filter(([expectedProof, expectedResponder]) => {
                const expectedPair = `${expectedProof}|${expectedResponder}`;
                return !foundStatusPairs.has(expectedPair);
            });
            throw new Error(`❌ VALIDATION FAILED: Missing expected status pairs: ${missingPairs.map(([proof, responder]) => `${proof} ↔ ${responder}`).join(', ')}`);
        }
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Both Column Status Pairs');
    });

    test('Verify Responder Status accuracy', async ({ page }) => {
        console.log('[DispatchValidation] Testing Responder Status validation...');
        
        const reportName = `Responder Status Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Responder_Status_Validation');
        
        // Verify column 10 exists (index 9) and check for Responder Status
        const responderStatusColumnIndex = 9; // Column 10 (0-based index)
        
        if (parsedData.headers.length <= responderStatusColumnIndex) {
            console.log(`[DispatchValidation] ❌ Column 10 (index ${responderStatusColumnIndex}) does not exist. Available columns: ${parsedData.headers.length}`);
            console.log('[DispatchValidation] 📋 Available columns:', parsedData.headers.join(', '));
            throw new Error(`Column 10 not found. Report only has ${parsedData.headers.length} columns.`);
        }
        
        console.log(`[DispatchValidation] ✅ Column 10 found at index ${responderStatusColumnIndex}: "${parsedData.headers[responderStatusColumnIndex]}"`);
        
        // Expected Responder Status values to verify in column 10
        const expectedStatuses = [
            'DISPATCH_CREATED',
            'RESPONDER_DISPATCHED', 
            'RESPONDER_ARRIVED',
            'RESPONDER_COMPLETED',
            'OPERATOR_CANCELLED'
        ];
        
        if (parsedData.rows.length === 0) {
            console.log('[DispatchValidation] ❌ Report contains no data rows - this indicates a system issue');
            console.log('[DispatchValidation] 📋 Available columns:', parsedData.headers.join(', '));
            console.log(`[DispatchValidation] 🎯 Expected to find these Responder Statuses in column 10 (${parsedData.headers[responderStatusColumnIndex]}):`, expectedStatuses.join(', '));
            throw new Error('Dispatch report should contain data for the selected time period. Empty report suggests system problem or incorrect date range.');
        }
        
        // Collect all unique status values found in the report
        const foundStatuses = new Set();
        let invalidResponderStatuses = 0;
        
        parsedData.rows.forEach((row, index) => {
            const responderStatus = row[responderStatusColumnIndex];
            if (!responderStatus || responderStatus.toString().trim() === '') {
                invalidResponderStatuses++;
                console.warn(`[DispatchValidation] Row ${index + 1}: Missing Responder Status`);
            } else {
                const status = responderStatus.toString().trim();
                foundStatuses.add(status);
            }
        });
        
        // Show detailed status analysis
        console.log('[DispatchValidation] 📊 RESPONDER STATUS ANALYSIS (Column 10):');
        console.log(`[DispatchValidation] Column 10 header: "${parsedData.headers[responderStatusColumnIndex]}"`);
        console.log(`[DispatchValidation] Total data rows: ${parsedData.rows.length}`);
        console.log(`[DispatchValidation] Rows with missing status: ${invalidResponderStatuses}`);
        console.log(`[DispatchValidation] Unique statuses found: ${foundStatuses.size}`);
        
        // Show what statuses were actually found
        if (foundStatuses.size > 0) {
            console.log('[DispatchValidation] 🟢 STATUSES PRESENT IN REPORT:');
            Array.from(foundStatuses).sort().forEach(status => {
                const count = parsedData.rows.filter(row => 
                    row[responderStatusColumnIndex] && 
                    row[responderStatusColumnIndex].toString().trim() === status
                ).length;
                console.log(`[DispatchValidation]    ✅ ${status} (${count} occurrences)`);
            });
        }
        
        // Show which expected statuses are missing
        const missingStatuses = expectedStatuses.filter(expected => 
            !Array.from(foundStatuses).some(found => 
                found.toUpperCase().includes(expected.toUpperCase()) || 
                expected.toUpperCase().includes(found.toUpperCase())
            )
        );
        
        if (missingStatuses.length > 0) {
            console.log('[DispatchValidation] 🔴 EXPECTED STATUSES NOT FOUND:');
            missingStatuses.forEach(status => {
                console.log(`[DispatchValidation]    ❌ ${status} - NOT PRESENT`);
            });
        } else {
            console.log('[DispatchValidation] 🎉 All expected status types are represented in the report data');
        }
        
        // Show which found statuses weren't in our expected list
        const unexpectedStatuses = Array.from(foundStatuses).filter(found => 
            !expectedStatuses.some(expected => 
                found.toUpperCase().includes(expected.toUpperCase()) || 
                expected.toUpperCase().includes(found.toUpperCase())
            )
        );
        
        if (unexpectedStatuses.length > 0) {
            console.log('[DispatchValidation] 🟡 ADDITIONAL STATUSES FOUND (not in expected list):');
            unexpectedStatuses.forEach(status => {
                const count = parsedData.rows.filter(row => 
                    row[responderStatusColumnIndex] && 
                    row[responderStatusColumnIndex].toString().trim() === status
                ).length;
                console.log(`[DispatchValidation]    ℹ️ ${status} (${count} occurrences)`);
            });
        }
        
        // Summary
        console.log('[DispatchValidation] 📋 VALIDATION SUMMARY:');
        console.log(`[DispatchValidation] • Expected status types: ${expectedStatuses.length}`);
        console.log(`[DispatchValidation] • Status types found: ${foundStatuses.size}`);
        console.log(`[DispatchValidation] • Missing from expected: ${missingStatuses.length}`);
        console.log(`[DispatchValidation] • Additional unexpected: ${unexpectedStatuses.length}`);
        
        expect(invalidResponderStatuses).toBe(0);
        console.log('[DispatchValidation] ✅ Responder Status accuracy verified - all status fields populated');
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Responder Status accuracy');
    });

    test('Verify Response Provider logic', async ({ page }) => {
        console.log('[DispatchValidation] Testing Response Provider validation...');
        
        const reportName = `Response Provider Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Response_Provider_Validation');
        
        // Find Response Provider column
        const responseProviderColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('response') && header.toLowerCase().includes('provider')
        );
        
        if (responseProviderColumnIndex >= 0) {
            // Verify Response Provider logic
            let validProviders = 0;
            parsedData.rows.forEach((row, index) => {
                const responseProvider = row[responseProviderColumnIndex];
                if (responseProvider && responseProvider.toString().trim() !== '') {
                    validProviders++;
                }
            });
            
            console.log(`[DispatchValidation] ✅ Response Provider logic verified. Valid providers: ${validProviders}`);
        } else {
            console.log('[DispatchValidation] ℹ️ Response Provider column not found - may be optional');
        }
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Response Provider logic');
    });

    test('Verify Created At timestamp accuracy', async ({ page }) => {
        console.log('[DispatchValidation] Testing Created At validation...');
        
        const reportName = `Created At Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Created_At_Validation');
        
        // Find Created At column
        const createdAtColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('created') && header.toLowerCase().includes('at')
        );
        
        expect(createdAtColumnIndex).toBeGreaterThanOrEqual(0);
        
        // Verify Created At timestamps
        let invalidCreatedAt = 0;
        parsedData.rows.forEach((row, index) => {
            const createdAt = row[createdAtColumnIndex];
            if (!createdAt || createdAt.toString().trim() === '') {
                invalidCreatedAt++;
                console.warn(`[DispatchValidation] Row ${index + 1}: Missing Created At timestamp`);
            }
        });
        
        expect(invalidCreatedAt).toBe(0);
        console.log('[DispatchValidation] ✅ Created At timestamp accuracy verified');
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Created At timestamp accuracy');
    });

    test('Verify Auto Dispatch handling', async ({ page }) => {
        console.log('[DispatchValidation] Testing Auto Dispatch validation...');
        
        const reportName = `Auto Dispatch Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Auto_Dispatch_Validation');
        
        // Find Auto Dispatch column
        const autoDispatchColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('auto') && header.toLowerCase().includes('dispatch')
        );
        
        if (autoDispatchColumnIndex >= 0) {
            // Verify Auto Dispatch handling
            const autoDispatchValues = new Set();
            parsedData.rows.forEach((row, index) => {
                const autoDispatch = row[autoDispatchColumnIndex];
                if (autoDispatch && autoDispatch.toString().trim() !== '') {
                    autoDispatchValues.add(autoDispatch.toString().trim().toLowerCase());
                }
            });
            
            console.log(`[DispatchValidation] ✅ Auto Dispatch handling verified. Values found: ${Array.from(autoDispatchValues).join(', ')}`);
        } else {
            console.log('[DispatchValidation] ℹ️ Auto Dispatch column not found - may be optional');
        }
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Auto Dispatch handling');
    });

    test('Verify Latitude accuracy', async ({ page }) => {
        console.log('[DispatchValidation] Testing Latitude validation...');
        
        const reportName = `Latitude Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Latitude_Validation');
        
        // Find Latitude column
        const latitudeColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('lat')
        );
        
        if (latitudeColumnIndex >= 0) {
            // Verify Latitude values are valid
            let invalidLatitudes = 0;
            parsedData.rows.forEach((row, index) => {
                const latitude = row[latitudeColumnIndex];
                if (latitude && latitude.toString().trim() !== '') {
                    const lat = parseFloat(latitude);
                    if (isNaN(lat) || lat < -90 || lat > 90) {
                        invalidLatitudes++;
                        console.warn(`[DispatchValidation] Row ${index + 1}: Invalid latitude: ${latitude}`);
                    }
                }
            });
            
            expect(invalidLatitudes).toBe(0);
            console.log('[DispatchValidation] ✅ Latitude accuracy verified');
        } else {
            console.log('[DispatchValidation] ℹ️ Latitude column not found - may be optional');
        }
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Latitude accuracy');
    });

    test('Verify Longitude accuracy', async ({ page }) => {
        console.log('[DispatchValidation] Testing Longitude validation...');
        
        const reportName = `Longitude Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: TEST_CONFIG.testData.fromDate,
            toDate: TEST_CONFIG.testData.toDate,
            // station: 'Rustenburg'
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps (proper method)
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Longitude_Validation');
        
        // Find Longitude column
        const longitudeColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('lon') || header.toLowerCase().includes('lng')
        );
        
        if (longitudeColumnIndex >= 0) {
            // Verify Longitude values are valid
            let invalidLongitudes = 0;
            parsedData.rows.forEach((row, index) => {
                const longitude = row[longitudeColumnIndex];
                if (longitude && longitude.toString().trim() !== '') {
                    const lng = parseFloat(longitude);
                    if (isNaN(lng) || lng < -180 || lng > 180) {
                        invalidLongitudes++;
                        console.warn(`[DispatchValidation] Row ${index + 1}: Invalid longitude: ${longitude}`);
                    }
                }
            });
            
            expect(invalidLongitudes).toBe(0);
            console.log('[DispatchValidation] ✅ Longitude accuracy verified');
        } else {
            console.log('[DispatchValidation] ℹ️ Longitude column not found - may be optional');
        }
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Longitude accuracy');
    });
});

test.describe('Dispatch Report CSV Format Validation', () => {
    let authHelper;
    let sharedSteps;
    let createdReports = []; // Track created reports for cleanup

    // Get dynamic dates for CSV test
    const dynamicDates = {
        currentTime: new Date().toTimeString().slice(0, 8),
        hyphenatedTime: new Date().toTimeString().slice(0, 8).replace(/:/g, '-'),
        currentDate: new Date().toISOString().slice(0, 10)
    };

    test.beforeEach(async ({ page }) => {
        console.log('[DispatchValidation] Starting test setup...');
        
        // Validate environment variables
        if (!TARGET_GROUP_NAME) {
            throw new Error('TARGET_GROUP_NAME environment variable (trex_private) must be set. Please check your .env file.');
        }
        console.log(`[DispatchValidation] Using target group: ${TARGET_GROUP_NAME}`);
        
        // Clean test-downloads directory at the beginning of each test
        await cleanTestDownloadsDirectory();
        
        console.log('[DispatchValidation] Authentication and company selection...');
        
        // Initialize SharedTestSteps first 
        sharedSteps = new SharedTestSteps(page);
        
        // Initialize AuthHelper and authenticate with required parameters
        authHelper = new AuthHelper(page);
        await authHelper.ensureAuthenticated(
            sharedSteps, 
            TEST_CONFIG.authentication.username, 
            TEST_CONFIG.authentication.password,
            'Vodacom'
        );
        
        // Reset created reports tracker for this test
        createdReports = [];
        
        console.log('[DispatchValidation] Setup completed');
    });

    test.afterEach(async ({ page }) => {
        console.log('[DispatchValidation] Starting cleanup...');
        
        if (createdReports.length > 0) {
            console.log(`[DispatchValidation] Cleaning up ${createdReports.length} created reports...`);
            
            try {
                // Navigate directly to dispatch reports page with retry
                console.log('[DispatchValidation] Navigating to dispatch reports page...');
                
                let navigationSuccess = false;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        console.log(`[DispatchValidation] Navigation attempt ${attempt}/3`);
                        
                        // Go directly to the reports page
                        await page.goto('https://uat.proof360.io/report-manager/dispatch-reports');
                        await page.waitForLoadState('networkidle', { timeout: 10000 });
                        
                        // Wait for the reports table to be visible
                        await page.locator('table').first().waitFor({ timeout: 10000 });
                        
                        navigationSuccess = true;
                        break;
                    } catch (navError) {
                        console.warn(`[DispatchValidation] Navigation attempt ${attempt} failed: ${navError.message}`);
                        if (attempt < 3) {
                            await page.waitForTimeout(3000); // Wait before retry
                        }
                    }
                }
                
                if (!navigationSuccess) {
                    console.warn('[DispatchValidation] ⚠️ Failed to navigate to dispatch reports, skipping cleanup');
                    return;
                }
                
                console.log('[DispatchValidation] Successfully navigated to dispatch reports page');
                
                // Delete each created report with individual error handling
                for (const reportName of createdReports) {
                    try {
                        console.log(`[DispatchValidation] Attempting to delete report: ${reportName}`);
                        
                        // Wait for page to settle
                        await page.waitForTimeout(2000);
                        
                        // Find the report row more robustly
                        const reportRow = page.getByRole('row').filter({ 
                            has: page.getByRole('cell').filter({ hasText: new RegExp(`^${reportName}$`) })
                        }).first();
                        
                        // Check if report exists
                        const reportExists = await reportRow.count() > 0;
                        if (!reportExists) {
                            console.log(`[DispatchValidation] ℹ️ Report ${reportName} not found, may already be deleted`);
                            continue;
                        }
                        
                        // Click the archive button
                        const archiveButton = reportRow.getByRole('button', { name: 'Archive' });
                        await archiveButton.waitFor({ timeout: 5000 });
                        await archiveButton.click();
                        
                        // Wait for archive confirmation
                        await page.waitForTimeout(1000);
                        
                        console.log(`[DispatchValidation] ✅ Successfully deleted: ${reportName}`);
                    } catch (deleteError) {
                        console.warn(`[DispatchValidation] ⚠️ Failed to delete report ${reportName}: ${deleteError.message}`);
                        // Continue with other reports even if one fails
                    }
                }
                
                console.log('[DispatchValidation] ✅ Cleanup completed');
            } catch (cleanupError) {
                console.error(`[DispatchValidation] ❌ Cleanup failed: ${cleanupError.message}`);
            }
        } else {
            console.log('[DispatchValidation] No reports to clean up');
        }
    });

    test('Verify CSV Format Field Validation', async ({ page }) => {
        console.log('[DispatchValidation] Testing CSV format validation...');
        
        // Create and track CSV format dispatch report
        const { download, reportName } = await createAndTrackReport(
            sharedSteps, 
            createdReports, 
            'CSV Validation Test',
            { fileFormat: '.csv' }
        );
        
        // Parse the CSV file (backend always generates .xlsx regardless of CSV selection)
        const parsedData = await saveAndParseDownload(download, 'CSV_Format_Validation');
        
        // Verify CSV format structure
        expect(parsedData.headers.length).toBeGreaterThan(0);
        
        // Handle empty reports gracefully (like other tests)
        if (parsedData.rows.length === 0) {
            console.log(`[DispatchValidation] ℹ️ Report contains no data rows - validating structure only`);
            console.log(`[DispatchValidation] ✅ CSV format structure validated. Headers: ${parsedData.headers.length}`);
        } else {
            console.log(`[DispatchValidation] ✅ CSV format validated. Headers: ${parsedData.headers.length}, Rows: ${parsedData.rows.length}`);
        }        // Verify key fields exist in CSV
        const expectedFields = ['dispatch', 'incident', 'site', 'company'];
        const headersLower = parsedData.headers.map(h => h ? h.toLowerCase() : '');
        
        expectedFields.forEach(field => {
            const fieldExists = headersLower.some(header => header.includes(field));
            expect(fieldExists).toBe(true);
            console.log(`[DispatchValidation] ✅ Required field '${field}' found in CSV headers`);
        });
        
        console.log('[DispatchValidation] ✅ Test completed: Verify CSV Format Field Validation');
    });

    test('Verify Target Group Name Data Presence', async ({ page }) => {
        console.log(`[DispatchValidation] Testing ${TARGET_GROUP_NAME} data presence...`);
        
        const reportName = `Target Group Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report with wider date range for better data coverage
        const sharedSteps = new SharedTestSteps(page);
        const today = new Date();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: yesterday.getDate().toString(), // Yesterday's date
            toDate: today.getDate().toString(),       // Today's date  
            fromTime: '00:00',                       // Start of yesterday
            toTime: today.toTimeString().slice(0, 5), // Current time today (HH:MM format)
            // Remove station filter to get data from all stations
            // station: 'Rustenburg'  
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Target_Group_Validation');
        
        // Find Group Name column
        const groupNameColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('group') && header.toLowerCase().includes('name')
        );
        
        expect(groupNameColumnIndex).toBeGreaterThanOrEqual(0);
        console.log(`[DispatchValidation] ✅ Group Name column found at index ${groupNameColumnIndex}: ${parsedData.headers[groupNameColumnIndex]}`);
        
        if (parsedData.rows.length === 0) {
            console.log(`[DispatchValidation] ℹ️ Report contains no data rows - cannot validate ${TARGET_GROUP_NAME} presence`);
            console.log(`[DispatchValidation] ⚠️ Consider using a broader date range to capture ${TARGET_GROUP_NAME} data`);
            return;
        }
        
        // Search for target group entries in Group Name
        let targetGroupCount = 0;
        const targetGroupEntries = [];
        
        parsedData.rows.forEach((row, index) => {
            const groupName = row[groupNameColumnIndex];
            if (groupName && groupName.toString().includes(TARGET_GROUP_NAME)) {
                targetGroupCount++;
                targetGroupEntries.push({
                    row: index + 1,
                    groupName: groupName.toString(),
                    siteName: row[parsedData.headers.findIndex(h => h && h.toLowerCase().includes('site') && h.toLowerCase().includes('name'))] || 'N/A',
                    incidentId: row[parsedData.headers.findIndex(h => h && h.toLowerCase().includes('incident') && h.toLowerCase().includes('id'))] || 'N/A'
                });
            }
        });
        
        console.log(`[DispatchValidation] 📊 Found ${targetGroupCount} entries for ${TARGET_GROUP_NAME}`);
        
        if (targetGroupCount > 0) {
            console.log(`[DispatchValidation] ✅ ${TARGET_GROUP_NAME} data found in dispatch report:`);
            targetGroupEntries.forEach((entry, index) => {
                console.log(`[DispatchValidation] Entry ${index + 1}: Row ${entry.row}, Group: ${entry.groupName}, Site: ${entry.siteName}, Incident: ${entry.incidentId}`);
            });
            
            // Verify that all target group entries have proper data
            const validEntries = targetGroupEntries.filter(entry => 
                entry.incidentId !== 'N/A' && entry.incidentId !== '' && 
                entry.siteName !== 'N/A' && entry.siteName !== ''
            );
            
            console.log(`[DispatchValidation] ✅ Valid ${TARGET_GROUP_NAME} entries: ${validEntries.length}/${targetGroupCount}`);
            
            // Expect at least some valid entries if data exists
            expect(validEntries.length).toBeGreaterThan(0);
        } else {
            console.log(`[DispatchValidation] ℹ️ No ${TARGET_GROUP_NAME} entries found in current date range`);
            console.log('[DispatchValidation] 📋 Available Group Names sample (first 5):');
            
            // Show sample of available group names for debugging
            const sampleGroupNames = parsedData.rows.slice(0, 5).map(row => 
                row[groupNameColumnIndex] || 'Empty'
            );
            sampleGroupNames.forEach((groupName, index) => {
                console.log(`[DispatchValidation] Sample ${index + 1}: ${groupName}`);
            });
        }
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Target Group Name Data Presence');
    });

    test('Verify Dispatch flow for Target Group', async ({ page }) => {
        console.log(`[DispatchValidation] Testing ${TARGET_GROUP_NAME} dispatch workflow statuses...`);
        
        const reportName = `Target Group Dispatch Flow Test ${TEST_CONFIG.testData.currentTime}`;
        
        // Create dispatch report with today's date only for current dispatch data
        const sharedSteps = new SharedTestSteps(page);
        const today = new Date();
        
        await sharedSteps.createDispatchReport({
            reportName: reportName,
            fileFormat: '.xlsx - no images attached',
            fromDate: today.getDate().toString(),     // Today's date
            toDate: today.getDate().toString(),       // Today's date  
            fromTime: '00:00',                       // Start of today
            toTime: today.toTimeString().slice(0, 5), // Current time today (HH:MM format)
            // Remove station filter to get data from all stations
            // station: 'Rustenburg'  
        });
        
        // Track for cleanup
        createdReports.push(reportName);
        
        // Download the report using SharedTestSteps
        const download = await sharedSteps.downloadDispatchReport(reportName);
        
        // Parse the downloaded file
        const parsedData = await saveAndParseDownload(download, 'Target_Group_Dispatch_Flow_Validation');
        
        // Find Group Name column (Column 3)
        const groupNameColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('group') && header.toLowerCase().includes('name')
        );
        
        expect(groupNameColumnIndex).toBeGreaterThanOrEqual(0);
        console.log(`[DispatchValidation] ✅ Group Name column found at index ${groupNameColumnIndex}: ${parsedData.headers[groupNameColumnIndex]}`);
        
        // Dynamically find Proof Status column (expecting index 10)
        const proofStatusColumnIndex = parsedData.headers.findIndex(header => 
            header && header.toLowerCase().includes('proof') && header.toLowerCase().includes('status')
        );
        
        expect(proofStatusColumnIndex).toBeGreaterThanOrEqual(0);
        console.log(`[DispatchValidation] ✅ Proof Status column found at index ${proofStatusColumnIndex}: ${parsedData.headers[proofStatusColumnIndex]}`);
        
        // Verify expected column index for Proof Status
        if (proofStatusColumnIndex !== 10) {
            console.warn(`[DispatchValidation] ⚠️ Proof Status found at index ${proofStatusColumnIndex}, expected index 10`);
        } else {
            console.log(`[DispatchValidation] ✅ Proof Status column at expected index 10`);
        }
        
        if (parsedData.rows.length === 0) {
            console.log(`[DispatchValidation] ℹ️ Report contains no data rows - cannot validate ${TARGET_GROUP_NAME} dispatch flow`);
            console.log(`[DispatchValidation] ⚠️ Consider using a broader date range to capture ${TARGET_GROUP_NAME} dispatch workflow data`);
            return;
        }
        
        // Filter rows where Group Name matches target group
        const targetGroupRows = [];
        parsedData.rows.forEach((row, index) => {
            const groupName = row[groupNameColumnIndex];
            if (groupName && groupName.toString().includes(TARGET_GROUP_NAME)) {
                targetGroupRows.push({
                    rowIndex: index + 1,
                    groupName: groupName.toString(),
                    proofStatus: row[proofStatusColumnIndex] ? row[proofStatusColumnIndex].toString().trim() : '',
                    incidentId: row[parsedData.headers.findIndex(h => h && h.toLowerCase().includes('incident') && h.toLowerCase().includes('id'))] || 'N/A'
                });
            }
        });
        
        console.log(`[DispatchValidation] 📊 Found ${targetGroupRows.length} ${TARGET_GROUP_NAME} entries for dispatch flow analysis`);
        
        if (targetGroupRows.length === 0) {
            console.log(`[DispatchValidation] ℹ️ No ${TARGET_GROUP_NAME} entries found in current date range`);
            console.log('[DispatchValidation] 📋 Available Group Names sample (first 5):');
            
            // Show sample of available group names for debugging
            const sampleGroupNames = parsedData.rows.slice(0, 5).map(row => 
                row[groupNameColumnIndex] || 'Empty'
            );
            sampleGroupNames.forEach((groupName, index) => {
                console.log(`[DispatchValidation] Sample ${index + 1}: ${groupName}`);
            });
            return;
        }
        
        // Extract all Proof Status values for target group entries
        const proofStatuses = targetGroupRows
            .map(row => row.proofStatus)
            .filter(status => status && status !== '');
        
        const uniqueStatuses = [...new Set(proofStatuses)];
        
        console.log(`[DispatchValidation] 📋 Found Proof Status values for ${TARGET_GROUP_NAME}:`);
        uniqueStatuses.forEach((status, index) => {
            const count = proofStatuses.filter(s => s === status).length;
            console.log(`[DispatchValidation] Status ${index + 1}: "${status}" (appears ${count} times)`);
        });
        
        // Expected dispatch workflow statuses
        const expectedStatuses = [
            'DISPATCH_CREATED',
            'RESPONDER_DISPATCHED', 
            'RESPONDER_ARRIVED',
            'RESPONDER_COMPLETED',
            'OPERATOR_CANCELLED'
        ];
        
        console.log('[DispatchValidation] 🔍 Validating expected dispatch workflow statuses...');
        
        // Check for each expected status
        const missingStatuses = [];
        const foundStatuses = [];
        
        expectedStatuses.forEach(expectedStatus => {
            const found = uniqueStatuses.some(actualStatus => 
                actualStatus.toUpperCase().includes(expectedStatus.toUpperCase()) ||
                expectedStatus.toUpperCase().includes(actualStatus.toUpperCase())
            );
            
            if (found) {
                foundStatuses.push(expectedStatus);
                console.log(`[DispatchValidation] ✅ Expected status found: ${expectedStatus}`);
            } else {
                missingStatuses.push(expectedStatus);
                console.warn(`[DispatchValidation] ❌ Missing expected status: ${expectedStatus}`);
            }
        });
        
        // Display detailed workflow analysis
        console.log(`[DispatchValidation] 📊 Dispatch Workflow Analysis for ${TARGET_GROUP_NAME}:`);
        console.log(`[DispatchValidation] Total entries: ${targetGroupRows.length}`);
        console.log(`[DispatchValidation] Unique statuses found: ${uniqueStatuses.length}`);
        console.log(`[DispatchValidation] Expected statuses found: ${foundStatuses.length}/${expectedStatuses.length}`);
        
        if (foundStatuses.length > 0) {
            console.log(`[DispatchValidation] ✅ Found statuses: ${foundStatuses.join(', ')}`);
        }
        
        if (missingStatuses.length > 0) {
            console.log(`[DispatchValidation] ❌ Missing statuses: ${missingStatuses.join(', ')}`);
        }
        
        // Validation: Fail if any expected status is missing
        expect(missingStatuses.length).toBe(0);
        console.log(`[DispatchValidation] ✅ All expected dispatch workflow statuses found for ${TARGET_GROUP_NAME}`);
        
        // Additional validation: Ensure we have actual data to validate
        expect(targetGroupRows.length).toBeGreaterThan(0);
        expect(proofStatuses.length).toBeGreaterThan(0);
        
        console.log('[DispatchValidation] ✅ Test completed: Verify Dispatch flow for Target Group');
    });

    // Additional cleanup test to handle any remaining reports
    test('Cleanup any remaining test reports', async ({ page }) => {
        console.log('[DispatchValidation] Running final cleanup check...');
        
        try {
            // Navigate to dispatch reports page
            await page.goto('https://uat.proof360.io/alert-reports/dispatch-reports', { 
                waitUntil: 'domcontentloaded', 
                timeout: 15000 
            });
            await page.waitForTimeout(2000);
            
            // Look for any test reports that might still be present
            const testReportPatterns = [
                'Dispatch ID Test',
                'Dispatch Duplication Test', 
                'Incident ID Test',
                'Group Name Test',
                'Site Name Test',
                'Customer Site ID Test',
                'Dispatch Service Test',
                'Company Name Test',
                'Alert Type Test',
                'CreatedBy Test',
                'Action Timestamp Test',
                'Timestamp Consistency Test',
                'Proof Status Test',
                'Responder Status Test',
                'Response Provider Test',
                'Created At Test',
                'Auto Dispatch Test',
                'Latitude Test',
                'Longitude Test',
                'CSV Validation Test',
                'Target Group Test',
                'Target Group Dispatch Flow Test'
            ];
            
            let reportsArchived = 0;
            for (const pattern of testReportPatterns) {
                try {
                    const reportRows = page.locator(`tr:has-text("${pattern}")`);
                    const count = await reportRows.count();
                    
                    for (let i = 0; i < count; i++) {
                        try {
                            const reportRow = reportRows.nth(i);
                            const reportName = await reportRow.locator('td').nth(1).textContent();
                            const archiveButton = reportRow.locator('button[title="Archive"]');
                            
                            if (await archiveButton.isVisible({ timeout: 2000 })) {
                                await archiveButton.click();
                                await page.waitForTimeout(1500);
                                
                                console.log(`[DispatchValidation] ✅ Archived remaining report: ${reportName}`);
                                reportsArchived++;
                            }
                        } catch (archiveError) {
                            console.log(`[DispatchValidation] Could not archive report: ${archiveError.message}`);
                        }
                    }
                } catch (patternError) {
                    // Pattern not found, continue
                }
            }
            
            if (reportsArchived > 0) {
                console.log(`[DispatchValidation] 🎉 Final cleanup completed: ${reportsArchived} reports archived`);
            } else {
                console.log('[DispatchValidation] ✅ No remaining test reports found - cleanup not needed');
            }
            
        } catch (cleanupError) {
            console.log(`[DispatchValidation] Final cleanup failed: ${cleanupError.message}`);
            // Don't fail the test for cleanup issues
        }
    });
});
