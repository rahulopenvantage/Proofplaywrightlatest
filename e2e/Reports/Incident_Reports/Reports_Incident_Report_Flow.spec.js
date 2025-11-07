import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../../backend/SharedTestSteps.js';
import { AuthHelper } from '../../../backend/AuthHelper.js';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import path from 'path';

// Import global failure handler for automatic failure screenshots
import '../../../backend/GlobalFailureHandler.js';

// -------- Helpers for text normalization --------
function normalizeText(s) {
    if (!s) return '';
    return s
        .replace(/\u00A0/g, ' ') // non-breaking spaces
        .replace(/\s+/g, ' ') // collapse whitespace
        .trim();
}

function containsNormalized(haystack, needle) {
    return normalizeText(haystack).toLowerCase().includes(normalizeText(needle).toLowerCase());
}

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;
const SITE_NAME = process.env.trex_private;

test.describe('Combined Alert Reports Workflow & PDF Text Extraction', () => {
    let sharedSteps;
    let authHelper;

    const requiredTexts = [
        'Dispatch',
        'Dispatch Created',
        'Responder Dispatched',
        'Responder Dispatched',
        'Responder Arrived',
        'Responder Completed'
    ];

    test.beforeEach(async ({ page }) => {
        test.setTimeout(300000); // 5 minutes timeout
        
        if (!USERNAME || !PASSWORD) {
            throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
        }

        sharedSteps = new SharedTestSteps(page);
        authHelper = new AuthHelper(page);
        
        console.log('[Combined] Authentication and company selection...');
        await authHelper.ensureAuthenticated(sharedSteps, USERNAME, PASSWORD, 'Vodacom');
        await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
    });

    test('Alert Reports Workflow with PDF verification', async ({ page }) => {
        console.log('[AlertReports] Starting Alert Reports workflow...');

        // Step 1: Navigate to Alert reports > Alert Reports
        console.log('[AlertReports] Step 1: Navigating to Alert Reports...');
        await sharedSteps.menuPage.navigateToAlertReports();
        console.log('✅ Step 1 completed');

        // Step 2: Click on Create new button
        console.log('[AlertReports] Step 2: Clicking Create new button...');
        await page.getByText('Create new').click();
        await page.waitForTimeout(2000);
        console.log('✅ Step 2 completed');

        // Step 3: In the Report name field enter "Automation test"
        console.log('[AlertReports] Step 3: Entering report name...');
        const reportNameField = page.locator('.input-container input[type="text"], input.input, .row.input-container input').first();
        await reportNameField.waitFor({ state: 'visible', timeout: 10000 });
        await reportNameField.fill('Automation test');
        console.log('✅ Step 3 completed');

        // Step 4: Click the Next button
        console.log('[AlertReports] Step 4: Clicking Next button...');
        await page.getByText('Next').click();
        await page.waitForTimeout(2000);
        console.log('✅ Step 4 completed');

        // Step 5: Click on the site search input field
        console.log('[AlertReports] Step 5: Clicking site search input...');
        const siteSearchInput = page.locator('input[type="search"][placeholder="Select sites"]');
        await siteSearchInput.waitFor({ state: 'visible', timeout: 10000 });
        await siteSearchInput.click();
        console.log('✅ Step 5 completed');

        // Step 6: Enter target site name in the search field
        console.log('[AlertReports] Step 6: Entering site name...');
        await siteSearchInput.fill(SITE_NAME);
        await page.waitForTimeout(1000); // Wait for dropdown to appear
        console.log('✅ Step 6 completed');

        // Step 7: Click the checkbox for target site
        console.log('[AlertReports] Step 7: Clicking site checkbox...');
        // Use specific locator for target site
        const siteCheckbox = page.getByRole('checkbox', { name: new RegExp(SITE_NAME) });
        await siteCheckbox.waitFor({ state: 'visible', timeout: 10000 });
        await siteCheckbox.click();
        await page.waitForTimeout(1000);
        console.log('✅ Step 7 completed');

        // Step 8: Click anywhere else on the page so the checkbox closes
        console.log('[AlertReports] Step 8: Closing site dropdown...');
        await page.locator('body').click();
        await page.waitForTimeout(1000);
        console.log('✅ Step 8 completed');

        // Step 8.5: Wait for incidents to load after site selection
        console.log('[AlertReports] Step 8.5: Waiting for incidents to load...');
        
        // Wait for the incidents table/section to appear and populate
        await page.waitForFunction(() => {
            // Look for either incident rows or a "no incidents" message
            const hasIncidentRows = document.querySelectorAll('table input[type="checkbox"], .incidents input[type="checkbox"], tbody input[type="checkbox"]').length > 0;
            const hasNoIncidentsMessage = document.body.textContent?.includes('No incidents') || 
                                        document.body.textContent?.includes('no data') ||
                                        document.body.textContent?.includes('No data');
            return hasIncidentRows || hasNoIncidentsMessage;
        }, { timeout: 30000 });
        
        await page.waitForTimeout(2000); // Additional wait for data stabilization
        console.log('✅ Step 8.5 completed');

        // Step 9: Click the checkbox under the "Incidents" section with enhanced logic
        console.log('[AlertReports] Step 9: Clicking incidents checkbox...');
        
        // Check if there are any incidents available
        const incidentCheckboxes = page.locator('table input[type="checkbox"], .incidents input[type="checkbox"], tbody input[type="checkbox"]');
        const checkboxCount = await incidentCheckboxes.count();
        
        if (checkboxCount === 0) {
            console.log('[AlertReports] ⚠️ No incident checkboxes found. Checking for alternative selectors...');
            
            // Try alternative selectors for incidents
            const alternativeSelectors = [
                'input[type="checkbox"]',
                '[role="checkbox"]', 
                '.checkbox',
                '[data-test-id*="incident"] input[type="checkbox"]',
                '.incident-row input[type="checkbox"]'
            ];
            
            let foundCheckbox = null;
            for (const selector of alternativeSelectors) {
                const altCheckbox = page.locator(selector).first();
                if (await altCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
                    console.log(`[AlertReports] ✅ Found checkbox with selector: ${selector}`);
                    foundCheckbox = altCheckbox;
                    break;
                }
            }
            
            if (foundCheckbox) {
                await foundCheckbox.click();
            } else {
                throw new Error('No incident checkboxes found after trying multiple selectors. The site may have no incidents.');
            }
        } else {
            console.log(`[AlertReports] ✅ Found ${checkboxCount} incident checkbox(es)`);
            const incidentsCheckbox = incidentCheckboxes.first();
            await incidentsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
            await incidentsCheckbox.click();
        }
        
        await page.waitForTimeout(1000);
        console.log('✅ Step 9 completed');

        // Step 10: Click on Add to export selection
        console.log('[AlertReports] Step 10: Clicking Add to export selection...');
        await page.getByText('Add to export selection').click();
        await page.waitForTimeout(2000);
        console.log('✅ Step 10 completed');

        // Step 11: Click next
        console.log('[AlertReports] Step 11: Clicking Next button...');
        await page.getByText('Next').click();
        await page.waitForTimeout(2000);
        console.log('✅ Step 11 completed');        // Steps 12-14: Enhanced robust snapshot workflow with retry logic
        console.log('[AlertReports] Steps 12-14: Starting enhanced snapshot workflow...');
        
        let snapshotAttempts = 0;
        const maxSnapshotAttempts = 5; // Increased attempts
        let snapshotSuccess = false;
        
        while (snapshotAttempts < maxSnapshotAttempts && !snapshotSuccess) {
            try {
                snapshotAttempts++;
                console.log(`[AlertReports] Snapshot attempt ${snapshotAttempts}/${maxSnapshotAttempts}`);
                
                // Step 12: Click on the Take snapshot button with enhanced waiting
                console.log('[AlertReports] Step 12: Clicking Take snapshot button...');
                const takeSnapshotButton = page.getByText('Take snapshot');
                await takeSnapshotButton.waitFor({ state: 'visible', timeout: 15000 });
                await takeSnapshotButton.click();
                console.log('✅ Step 12 completed');

                // Step 13: Enhanced snapshot processing wait
                console.log('[AlertReports] Step 13: Waiting for snapshot to be taken...');
                
                // Wait for initial processing
                await page.waitForTimeout(5000); // Increased initial wait
                
                // Enhanced waiting logic with multiple checks
                await page.waitForFunction(() => {
                    // Check if snapshot is processing
                    const bodyText = document.body.textContent || '';
                    const isProcessing = bodyText.includes('processing') || 
                                       bodyText.includes('generating') ||
                                       bodyText.includes('loading');
                    
                    // Check if Next button is available and clickable
                    const nextButton = Array.from(document.querySelectorAll('button')).find(btn => 
                        btn.textContent?.trim() === 'Next' && !btn.disabled
                    );
                    
                    // Check if we're still on snapshot step
                    const stillOnSnapshot = bodyText.includes('Take snapshot');
                    
                    console.log(`Snapshot wait: processing=${isProcessing}, nextReady=${!!nextButton}, stillOnSnapshot=${stillOnSnapshot}`);
                    
                    // Wait until: not processing AND (Next button ready OR we moved past snapshot step)
                    return !isProcessing && (nextButton !== null || !stillOnSnapshot);
                }, { timeout: 90000 }); // Increased timeout to 90 seconds
                
                // Additional wait for snapshot completion
                await page.waitForTimeout(5000); // Increased wait
                console.log('✅ Step 13 completed');

                // Step 14: Click Next with enhanced verification and retry logic
                console.log('[AlertReports] Step 14: Clicking Next button...');
                
                let nextClickAttempts = 0;
                const maxNextClickAttempts = 5; // Increased attempts
                let nextClickSuccess = false;
                
                while (nextClickAttempts < maxNextClickAttempts && !nextClickSuccess) {
                    try {
                        nextClickAttempts++;
                        console.log(`[AlertReports] Next button click attempt ${nextClickAttempts}/${maxNextClickAttempts}`);
                        
                        // Wait longer for Next button to be ready
                        const nextButton = page.getByText('Next');
                        await nextButton.waitFor({ state: 'visible', timeout: 15000 });
                        
                        // Check if button is actually clickable
                        const isEnabled = await nextButton.isEnabled();
                        if (!isEnabled) {
                            console.log(`[AlertReports] Next button not enabled yet, waiting...`);
                            await page.waitForTimeout(5000);
                            continue;
                        }
                        
                        console.log(`[AlertReports] Clicking Next button (enabled: ${isEnabled})`);
                        await nextButton.click();
                        
                        // Enhanced verification with multiple indicators
                        console.log(`[AlertReports] Verifying navigation to Preview export step...`);
                        await page.waitForFunction(() => {
                            const body = document.body;
                            const bodyText = body.textContent || '';
                            
                            // Multiple ways to detect we're on Preview export step
                            const hasPreviewExport = bodyText.includes('3. Preview export') || 
                                                   bodyText.includes('Preview export') ||
                                                   bodyText.includes('preview export');
                            
                            const hasCarousel = document.querySelector('[data-test-id="incident-carsousel"]') !== null ||
                                              document.querySelector('[data-test-id="incident-carousel"]') !== null ||
                                              bodyText.includes('incident-carsousel') ||
                                              bodyText.includes('carousel');
                            
                            const hasExportButton = Array.from(document.querySelectorAll('button')).some(btn => 
                                btn.textContent?.toLowerCase().includes('export'));
                            
                            const noMapSnapshot = !bodyText.includes('Take snapshot') && 
                                                !bodyText.includes('Map snapshot');
                            
                            console.log(`Preview indicators: preview=${hasPreviewExport}, carousel=${hasCarousel}, export=${hasExportButton}, noMap=${noMapSnapshot}`);
                            
                            return hasPreviewExport || hasCarousel || (hasExportButton && noMapSnapshot);
                        }, { timeout: 20000 });
                        
                        nextClickSuccess = true;
                        console.log(`✅ Next button clicked successfully on attempt ${nextClickAttempts}`);
                        
                    } catch (nextError) {
                        console.log(`⚠️ Next button click attempt ${nextClickAttempts} failed: ${nextError.message}`);
                        
                        // Additional debugging info
                        try {
                            const currentPageText = await page.textContent('body');
                            const hasSnapshot = currentPageText.includes('Take snapshot');
                            const hasNext = currentPageText.includes('Next');
                            console.log(`[AlertReports] Debug - Page state: hasSnapshot=${hasSnapshot}, hasNext=${hasNext}`);
                        } catch (debugError) {
                            console.log(`[AlertReports] Debug failed: ${debugError.message}`);
                        }
                        
                        if (nextClickAttempts < maxNextClickAttempts) {
                            console.log(`🔄 Retrying Next button click... (attempt ${nextClickAttempts + 1}/${maxNextClickAttempts})`);
                            await page.waitForTimeout(5000); // Longer wait before retry
                        } else {
                            throw new Error(`Next button click failed after ${maxNextClickAttempts} attempts. Last error: ${nextError.message}`);
                        }
                    }
                }
                
                await page.waitForTimeout(2000);
                console.log('✅ Step 14 completed');
                
                snapshotSuccess = true;
                console.log(`✅ Snapshot workflow completed successfully on attempt ${snapshotAttempts}`);
                
            } catch (error) {
                console.log(`⚠️ Snapshot attempt ${snapshotAttempts} failed: ${error.message}`);
                
                if (snapshotAttempts < maxSnapshotAttempts) {
                    console.log(`🔄 Retrying snapshot workflow... (attempt ${snapshotAttempts + 1}/${maxSnapshotAttempts})`);
                    
                    // Wait before retry
                    await page.waitForTimeout(8000); // Increased wait
                    
                    // Enhanced recovery logic
                    try {
                        console.log('[AlertReports] Attempting recovery...');
                        
                        // Check current page state
                        const currentPageText = await page.textContent('body');
                        console.log(`[AlertReports] Recovery - Current page text length: ${currentPageText.length}`);
                        
                        // If we're still on the map snapshot page, retry the snapshot
                        const takeSnapshotButton = page.getByText('Take snapshot');
                        if (await takeSnapshotButton.isVisible({ timeout: 3000 })) {
                            console.log('🔄 Still on snapshot page, will retry Take snapshot...');
                            continue;
                        }
                        
                        // If we're past the snapshot page, check if Next button is available
                        const nextButton = page.getByText('Next');
                        if (await nextButton.isVisible({ timeout: 3000 })) {
                            console.log('🔄 Snapshot may have completed, trying Next button...');
                            try {
                                await nextButton.click();
                                
                                // Quick verification
                                await page.waitForFunction(() => {
                                    const bodyText = document.body.textContent || '';
                                    return bodyText.includes('Preview export') || 
                                           bodyText.includes('3. Preview export') ||
                                           document.querySelector('[data-test-id="incident-carsousel"]') !== null;
                                }, { timeout: 10000 });
                                
                                snapshotSuccess = true;
                                console.log('✅ Recovery successful - moved to Preview export');
                                break;
                            } catch (recoveryError) {
                                console.log(`⚠️ Recovery Next click failed: ${recoveryError.message}`);
                            }
                        }
                        
                        // If we're already on Preview export, mark as success
                        if (currentPageText.includes('Preview export') || currentPageText.includes('3. Preview export')) {
                            console.log('✅ Recovery successful - already on Preview export');
                            snapshotSuccess = true;
                            break;
                        }
                        
                    } catch (resetError) {
                        console.log(`⚠️ Recovery attempt failed: ${resetError.message}`);
                    }
                } else {
                    console.log(`❌ Snapshot workflow failed after ${maxSnapshotAttempts} attempts`);
                    throw new Error(`Snapshot workflow failed after ${maxSnapshotAttempts} attempts. Last error: ${error.message}`);
                }
            }
        }

        // Step 15: Click on incident carousel (note: actual element has typo "carsousel", use first() for multiple elements)
        console.log('[AlertReports] Step 15: Clicking incident carousel...');
        const incidentCarousel = page.locator('[data-test-id="incident-carsousel"]').first();
        await incidentCarousel.waitFor({ state: 'visible', timeout: 10000 });
        await incidentCarousel.click();
        console.log('✅ Step 15 completed');

        // Step 16: Verify that required dispatch workflow text is displayed
        console.log('[AlertReports] Step 16: Verifying dispatch workflow statuses in preview...');
        const requiredWorkflowTexts = [
            'Dispatch',
            'Dispatch Created',
            'Responder Dispatched',
            'Responder Arrived',
            'Responder Completed',
            'Reserve',
            'SOP',
            'Escalated',
            'Resolved'
        ];

        // Wait for activity log to fully load
        await page.waitForTimeout(2000);

        const missingPreviewTexts = [];
        for (const text of requiredWorkflowTexts) {
            try {
                // Try multiple strategies to find the text
                let found = false;

                // Strategy 1: Use getByText with exact: false
                const textElement = page.getByText(text, { exact: false });
                const count = await textElement.count();

                if (count > 0 && await textElement.first().isVisible({ timeout: 3000 })) {
                    console.log(`✅ Found status in preview: "${text}"`);
                    found = true;
                } else {
                    // Strategy 2: Check if text exists in page content
                    const pageContent = await page.textContent('body');
                    if (pageContent && pageContent.includes(text)) {
                        console.log(`✅ Found status in preview content: "${text}"`);
                        found = true;
                    }
                }

                if (!found) {
                    // Strategy 3: Try scrolling and searching again
                    await page.evaluate(() => window.scrollBy(0, 300));
                    await page.waitForTimeout(1000);

                    if (await textElement.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                        console.log(`✅ Found status in preview after scrolling: "${text}"`);
                        found = true;
                    }
                }

                if (!found) {
                    console.log(`❌ Required status missing in preview: "${text}"`);
                    missingPreviewTexts.push(text);
                }
            } catch (error) {
                console.log(`❌ Error while searching for status "${text}" in preview: ${error.message}`);
                missingPreviewTexts.push(text);
            }
        }

        if (missingPreviewTexts.length > 0) {
            console.log('[AlertReports] ❌ Missing required statuses in preview:');
            console.log(missingPreviewTexts);
        }

        // Assert immediately that all statuses are in preview
        expect(
            missingPreviewTexts.length,
            `Missing ${missingPreviewTexts.length} required status(es) in preview: ${missingPreviewTexts.join(', ')}`
        ).toBe(0);

        console.log('✅ Step 16 completed - All statuses found in preview');

        // Step 16.5: Detect brand
        console.log('[AlertReports] Step 16.5: Detecting brand...');
        const pageBodyText = (await page.textContent('body')) || '';
        let brand = 'Unknown';
        if (/aura/i.test(pageBodyText)) brand = 'Aura';
        if (/response\s*24/i.test(pageBodyText)) brand = 'REsponse 24';
        console.log(`[AlertReports] Detected brand: ${brand}`);

        // Step 17: Click on export button
        console.log('[AlertReports] Step 17: Clicking export button...');
        await page.locator('button:has-text("Export")').click();
        console.log('✅ Step 17 completed');

        // Step 18: Check for popup that displays Report generation
        console.log('[AlertReports] Step 18: Checking for report generation popup...');
        try {
            await expect(page.getByText('Report generation')).toBeVisible({ timeout: 10000 });
            await expect(page.getByText('Report Automation test has been generated')).toBeVisible({ timeout: 5000 });
            console.log('✅ Report generation popup displayed');
        } catch (error) {
            console.log('⚠️ Report generation popup not found, continuing...');
        }
        console.log('✅ Step 18 completed');

        // Step 19: Looking at the first row, Check for Download button to be enabled
        console.log('[AlertReports] Step 19: Waiting for Download button to be enabled...');
        const firstRowDownloadButton = page.locator('tbody tr:first-child button:has-text("Download"), table tr:first-child button:has-text("Download")').first();
        
        // Wait for the download button to be enabled (may take time for report generation)
        await page.waitForTimeout(5000); // Initial wait for report processing
        
        let attempts = 0;
        const maxAttempts = 30; // 30 attempts = 5 minutes max wait
        
        while (attempts < maxAttempts) {
            try {
                const isEnabled = await firstRowDownloadButton.isEnabled({ timeout: 2000 });
                if (isEnabled) {
                    console.log('✅ Download button is enabled');
                    break;
                }
            } catch (error) {
                // Button might not be visible yet
            }
            
            attempts++;
            console.log(`⏳ Waiting for download button to be enabled... (attempt ${attempts}/${maxAttempts})`);
            await page.waitForTimeout(10000); // Wait 10 seconds between checks
        }
        
        if (attempts >= maxAttempts) {
            throw new Error('Download button did not become enabled within the timeout period');
        }
        console.log('✅ Step 19 completed');

        // Step 20: Click download on the first row (prefer direct download event; fallback to popup)
        console.log('[AlertReports] Step 20: Initiating download...');
        let download = null;
        let pdfPage = null;
        try {
            [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 30000 }),
                firstRowDownloadButton.click()
            ]);
            console.log('✅ Download event captured');
        } catch (e) {
            console.log('⚠️ No download event; attempting popup strategy...');
            [pdfPage] = await Promise.all([
                page.waitForEvent('popup', { timeout: 30000 }),
                firstRowDownloadButton.click()
            ]);
            console.log('✅ Popup captured');
        }
        console.log('✅ Step 20 completed');

        // Step 21: Resolve PDF content source
        console.log('[AlertReports] Step 21: Resolving PDF content...');
        let pdfBuffer = null;
        let pdfUrl = '';

        if (download) {
            // Ensure Downloads directory exists
            const downloadsDir = 'Downloads';
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
            }
            const suggested = download.suggestedFilename();
            const targetPath = path.join(downloadsDir, `${Date.now()}-${suggested || 'report.pdf'}`);
            await download.saveAs(targetPath);
            const p = await download.path();
            console.log(`[AlertReports] Saved download to: ${targetPath}`);
            pdfBuffer = fs.readFileSync(targetPath);
            pdfUrl = `file://${targetPath}`;
        } else if (pdfPage) {
            await pdfPage.waitForLoadState('networkidle', { timeout: 45000 });
            pdfUrl = pdfPage.url();
            console.log(`PDF URL: ${pdfUrl}`);
            // Attempt to fetch the PDF bytes from the URL
            const resp = await page.request.get(pdfUrl);
            if (resp && resp.ok()) {
                pdfBuffer = await resp.body();
            } else {
                throw new Error(`Failed to fetch PDF from URL: ${pdfUrl}`);
            }
        } else {
            throw new Error('Neither download nor popup was captured for the PDF.');
        }

        console.log('✅ Step 21 completed');

        // Step 21.1: Parse the PDF and verify required statuses are present
        console.log('[AlertReports] Step 21.1: Parsing PDF and verifying statuses...');
        const pdfDataParsed = await pdfParse(pdfBuffer);
        const pdfTextRaw = pdfDataParsed.text || '';
        const pdfText = normalizeText(pdfTextRaw);

        console.log(`[AlertReports] PDF text length (normalized): ${pdfText.length}`);
        console.log(`[AlertReports] PDF sample: ${pdfText.substring(0, 200)}...`);

        // Verify brand if detected
        if (brand !== 'Unknown') {
            expect.soft(
                containsNormalized(pdfText, brand),
                `PDF missing expected brand: "${brand}"`
            ).toBeTruthy();
        }

        // Verify that all required statuses are present in the PDF
        const missingPdfStatuses = [];
        for (const status of requiredWorkflowTexts) {
            const inPdf = containsNormalized(pdfText, status);
            if (!inPdf) {
                console.log(`❌ Required status missing in PDF: "${status}"`);
                missingPdfStatuses.push(status);
            } else {
                console.log(`✅ Found status in PDF: "${status}"`);
            }
        }

        if (missingPdfStatuses.length > 0) {
            console.log('[AlertReports] ❌ Missing required statuses in PDF:');
            console.log(missingPdfStatuses);
        } else {
            console.log('[AlertReports] ✅ All required statuses found in PDF');
        }

        // Assert that all statuses are present in PDF
        expect(
            missingPdfStatuses.length,
            `Missing ${missingPdfStatuses.length} required status(es) in PDF: ${missingPdfStatuses.join(', ')}`
        ).toBe(0);

        console.log('✅ Step 21.1 completed - All statuses verified in both preview and PDF');

        // Cleanup: Close PDF page if it exists
        if (pdfPage) {
            try {
                await pdfPage.close();
                console.log('✅ PDF page closed successfully');
            } catch (error) {
                console.log(`⚠️ Error closing PDF page: ${error.message}`);
            }
        }

        console.log('🎉 Alert Reports workflow completed successfully!');
    });

    

});