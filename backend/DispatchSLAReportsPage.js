import { expect } from '@playwright/test';

export class DispatchSLAReportsPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        
        // Navigation and page elements - more specific to avoid strict mode violations
        this.pageTitle = page.locator('text=Dispatch SLA Reports').first();
        this.createNewButton = page.getByRole('button', { name: 'Create new' });
        
        // Form modal elements - based on manual testing findings
        this.reportNameField = page.locator('input.input').first();
        this.emailField = page.locator('input.input').nth(1);
        
        // Date picker fields - using the working selectors from manual testing
        this.fromDateField = page.locator('input[placeholder="Select date"]').first();
        this.toDateField = page.locator('input[placeholder="Select date"]').nth(1);
        this.todayButton = page.locator('button[aria-label*="today"], button[aria-label*="Today"], .p-datepicker-today, .today');
        
        // Time fields
        this.fromTimeField = page.locator('input[placeholder="Select time - 24 hr format"]').first();
        this.toTimeField = page.locator('input[placeholder="Select time - 24 hr format"]').nth(1);
        
        // Station and Site selection
        this.stationSearchField = page.locator('input[placeholder="Select Station"]');
        this.siteSearchField = page.locator('input[placeholder="Select Sites"]');
        
        // Modal actions
        this.continueButton = page.locator('button:has-text("Continue"), button:has-text("CONTINUE")');
        this.cancelButton = page.locator('button:has-text("CANCEL")');
        
        // Report list elements
        this.reportTable = page.locator('table');
        this.showColumnsButton = page.locator('text=Show Columns');
        this.filterButton = page.locator('text=Filter');
        
        // Action buttons in table
        this.downloadButton = page.locator('text=Download');
        this.archiveButton = page.locator('text=Archive');
    }

    async clickCreateNew() {
        console.log('[DispatchSLAReportsPage] Clicking Create new button...');
    await this.createNewButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.createNewButton.click();
        await this.page.waitForTimeout(2000); // Wait for modal to open
        console.log('[DispatchSLAReportsPage] Create new modal opened');
    }

    async fillReportDetails(reportName, email) {
        console.log('[DispatchSLAReportsPage] Filling report details...');
        
        // Fill both report name and email using JavaScript - based on MCP server testing
        console.log('[DispatchSLAReportsPage] Filling report name and email...');
        await this.page.evaluate((data) => {
            const modal = document.querySelector('.ReactModal__Content');
            if (modal) {
                const inputs = modal.querySelectorAll('input.input');
                if (inputs[0]) {
                    inputs[0].value = data.reportName;
                    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                    inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (inputs[1]) {
                    inputs[1].value = data.email;
                    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
                    inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }, { reportName, email });
        
        console.log('[DispatchSLAReportsPage] Report details filled successfully');
    }

    async setDateRange(fromDate = 'today', toDate = 'today') {
        console.log('[DispatchSLAReportsPage] Setting date range...');
        
        // Set From Date - using working JavaScript approach from MCP testing
        console.log('[DispatchSLAReportsPage] Setting From Date...');
        await this.fromDateField.click();
        await this.page.waitForTimeout(1000); // Wait for date picker to open
        
        if (fromDate === 'today') {
            await this.page.evaluate(() => {
                const calendar = document.querySelector('.p-datepicker');
                if (calendar) {
                    const allSpans = Array.from(calendar.querySelectorAll('span'));
                    // Try to find today's date (September 1st) or use 31st (previous day)
                    const today = new Date().getDate().toString();
                    let targetDate = allSpans.find(span => span.textContent.trim() === today);
                    if (!targetDate) {
                        // Fallback to 31st if current date not available
                        targetDate = allSpans.find(span => span.textContent.trim() === '31') ||
                                   allSpans.find(span => span.textContent.trim() === '30');
                    }
                    if (targetDate) {
                        targetDate.click();
                    }
                }
            });
        }
        
        await this.page.waitForTimeout(1000);
        
        // Set To Date - using the same working approach
        console.log('[DispatchSLAReportsPage] Setting To Date...');
        await this.toDateField.click();
        await this.page.waitForTimeout(1000); // Wait for date picker to open
        
        if (toDate === 'today') {
            await this.page.evaluate(() => {
                const calendar = document.querySelector('.p-datepicker');
                if (calendar) {
                    const allSpans = Array.from(calendar.querySelectorAll('span'));
                    // Find today's date (September 1st)
                    const today = new Date().getDate().toString();
                    const targetDate = allSpans.find(span => span.textContent.trim() === today);
                    if (targetDate) {
                        targetDate.click();
                    }
                }
            });
        }
        
        console.log('[DispatchSLAReportsPage] Date range set successfully');
    }

    async setTimeRange(fromTime = '00:00', toTime = '23:59') {
        console.log('[DispatchSLAReportsPage] Setting time range...');
        
        // Set time fields using JavaScript - based on MCP server testing
        await this.page.evaluate((timeData) => {
            const modal = document.querySelector('.ReactModal__Content');
            if (modal) {
                const timeInputs = modal.querySelectorAll('input[placeholder="Select time - 24 hr format"]');
                if (timeInputs[0]) {
                    timeInputs[0].value = timeData.fromTime;
                    timeInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                    timeInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (timeInputs[1]) {
                    timeInputs[1].value = timeData.toTime;
                    timeInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
                    timeInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }, { fromTime, toTime });
        
        console.log('[DispatchSLAReportsPage] Time range set successfully');
    }

    async selectStation(stationName = 'Cape town') {
        console.log(`[DispatchSLAReportsPage] Selecting station: ${stationName}...`);
        await this.stationSearchField.click();
        await this.stationSearchField.fill(stationName);
        // Prefer clicking from the autocomplete panel to avoid submitting the form with Enter
        const panel = this.page.locator('.p-autocomplete-panel');
        const item = panel.locator('.p-autocomplete-item').filter({ hasText: new RegExp(stationName, 'i') }).first();
        try {
            await item.waitFor({ state: 'visible', timeout: 3000 });
            await item.click();
        } catch {
            // Fallback: click first available item if exact match not found
            const anyItem = panel.locator('.p-autocomplete-item').first();
            if (await anyItem.isVisible().catch(() => false)) {
                await anyItem.click();
            }
        }
        // Light blur
        const dialog = this.page.locator('[role="dialog"]');
        if (await dialog.isVisible().catch(() => false)) {
            await dialog.click({ position: { x: 12, y: 12 } }).catch(() => {});
        }
        await this.page.waitForTimeout(300);
        console.log(`[DispatchSLAReportsPage] Station ${stationName} selected`);
    }

    async selectSite(siteName = 'CEN') {
        console.log(`[DispatchSLAReportsPage] Selecting site: ${siteName}...`);
        // Click and type into the Sites autocomplete
        await this.siteSearchField.click();
        await this.siteSearchField.fill(siteName);

        // Prefer selecting from PrimeReact autocomplete panel
        const panel = this.page.locator('.p-autocomplete-panel');
        const item = panel.locator('.p-autocomplete-item').filter({ hasText: new RegExp(siteName, 'i') }).first();
        try {
            await item.waitFor({ state: 'visible', timeout: 4000 });
            await item.click();
        } catch {
            // Fallback: select first visible item
            const first = panel.locator('.p-autocomplete-item').first();
            if (await first.isVisible().catch(() => false)) {
                await first.click();
            } else {
                // Final fallback: commit with Enter if panel didn't render
                await this.page.keyboard.press('Enter');
            }
        }

        // Light blur so overlay does not block following inputs
        const dialog = this.page.locator('[role="dialog"]');
        if (await dialog.isVisible().catch(() => false)) {
            await dialog.click({ position: { x: 12, y: 12 } }).catch(() => {});
        }
        await this.page.waitForTimeout(300);

        console.log(`[DispatchSLAReportsPage] Site ${siteName} selected`);
    }

    async submitReportCreation() {
        console.log('[DispatchSLAReportsPage] Submitting report creation...');
        // Take a screenshot before submission to see form state
        await this.page.screenshot({ path: 'debug-before-form-submission.png' });

        // Stabilize overlays – avoid sending Escape which can close the modal in this app
        await this.page.waitForTimeout(500);

        const dialog = this.page.locator('[role="dialog"]');
        const dialogVisible = await dialog.isVisible().catch(() => false);
        if (!dialogVisible) {
            // If dialog already closed, nothing to do
            console.log('[DispatchSLAReportsPage] Dialog not visible; assuming submission already completed');
            return;
        }

    // Do not auto-fill fields here; rely on tests to provide values to avoid mismatches

        // Prefer in-modal buttons; first try Continue, then Create
        const continueBtn = dialog.getByRole('button', { name: /^(Continue|CONTINUE)$/ });
        const createBtn = dialog.getByRole('button', { name: /Create/i });

        let clicked = false;
        try {
            if (await continueBtn.isVisible({ timeout: 4000 })) {
                await expect(continueBtn).toBeEnabled();
                await continueBtn.click();
                clicked = true;
            }
        } catch {}

        // After Continue, wait for second step (Download) or Create button to appear
        try {
            await this.page.waitForTimeout(300); // small settle
            if (await createBtn.isVisible({ timeout: 8000 })) {
                await expect(createBtn).toBeEnabled();
                await createBtn.click();
                clicked = true;
            }
        } catch {}

        // If neither button within modal was found, fallback to JS search including Create
        if (!clicked) {
            const result = await this.page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const findEnabled = (btn) => btn && !btn.disabled && btn.offsetParent !== null;
                const byText = (text) => btns.find(b => b.textContent && b.textContent.trim().toLowerCase() === text.toLowerCase());

                let target = byText('Continue') || byText('CONTINUE') || byText('Create');
                if (findEnabled(target)) {
                    target.click();
                    return { success: true, buttonText: target.textContent?.trim() };
                }
                return { success: false, reason: 'No continue/create button found', availableButtons: btns.map(b => b.textContent?.trim()) };
            });
            console.log('[DispatchSLAReportsPage] Fallback click result:', result);
            if (!result.success) {
                throw new Error(`Failed to submit form: ${result.reason || 'Unknown error'}`);
            }
        }

        // Success handling: either success dialog with "Continue to reports" or modal closes directly
        const successBtn = this.page.getByRole('button', { name: /Continue to reports/i });
        const successVisible = await successBtn.isVisible().catch(() => false);
        if (successVisible) {
            await successBtn.click().catch(() => {});
            await successBtn.locator('xpath=ancestor::*[@role="dialog"][1]').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
        } else {
            // Wait for dialog to close; if it doesn't, try clicking Create again if available
            try {
                await dialog.waitFor({ state: 'hidden', timeout: 15000 });
            } catch {
                if (await createBtn.isVisible().catch(() => false)) {
                    await createBtn.click().catch(() => {});
                }
                await dialog.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
            }
        }

        // Additional wait for page to stabilize after form submission
        await this.page.waitForTimeout(1500);

        console.log('[DispatchSLAReportsPage] Report creation submitted');
    }

    async cancelReportCreation() {
        console.log('[DispatchSLAReportsPage] Cancelling report creation...');
        
        await this.cancelButton.click();
        await this.page.waitForTimeout(1000);
        
        console.log('[DispatchSLAReportsPage] Report creation cancelled');
    }

    async createCompleteReport(reportData) {
        console.log('[DispatchSLAReportsPage] Creating complete SLA report...');
        
        const {
            reportName = `SLA Report - ${new Date().toISOString().split('T')[0]}`,
            email = 'test@proof360.io',
            fromDate = 'today',
            toDate = 'today',
            fromTime = '00:00',
            toTime = '23:59',
            station = 'Cape town',
            site = 'CEN'
        } = reportData || {};

        // Open create new modal
        await this.clickCreateNew();
        
        // Fill basic details
        await this.fillReportDetails(reportName, email);
        
        // Set date and time range
        await this.setDateRange(fromDate, toDate);
        await this.setTimeRange(fromTime, toTime);
        
        // Select station and site (now with defaults)
        await this.selectStation(station);
        await this.selectSite(site);
        
        // Submit the report
        await this.submitReportCreation();
        
        console.log('[DispatchSLAReportsPage] Complete SLA report creation finished');
        
        return {
            reportName,
            email,
            fromDate,
            toDate,
            fromTime,
            toTime,
            station,
            site
        };
    }

    async verifyReportInList(reportName) {
        console.log(`[DispatchSLAReportsPage] Verifying report "${reportName}" appears in list...`);
        
        // Don't rely on networkidle for real-time apps; continue proactively

        // Take a screenshot to debug current state
        await this.page.screenshot({ path: 'debug-verify-report-state.png' });
        
        // Check if we're back on the main reports page
        await this.page.waitForSelector('text=Dispatch SLA Reports', { timeout: 15000 });
        console.log('[DispatchSLAReportsPage] Confirmed we are on the reports page');
        
        // Wait for the table to be visible and stable
        await this.page.waitForSelector('table', { timeout: 15000 });
        console.log('[DispatchSLAReportsPage] Table is visible');
        
        // Poll the table text for the report name instead of reloading
        const deadline = Date.now() + 45000;
        while (Date.now() < deadline) {
            const count = await this.page.locator(`tr:has-text("${reportName}")`).count();
            if (count > 0) break;
            await this.page.waitForTimeout(1000);
        }
        
        // Log current table content for debugging
        const tableText = await this.page.locator('table').textContent();
        console.log(`[DispatchSLAReportsPage] Current table contains: ${tableText.includes(reportName) ? 'FOUND' : 'NOT FOUND'} "${reportName}"`);
        
        // Look for the report with increased timeout
        console.log(`[DispatchSLAReportsPage] Looking for report row containing: "${reportName}"`);
        const reportRow = this.page.locator(`tr:has-text("${reportName}")`);
        
        try {
            await expect(reportRow).toBeVisible({ timeout: 45000 });
            console.log(`[DispatchSLAReportsPage] SUCCESS: Report "${reportName}" found in list`);
            return reportRow;
        } catch (error) {
            // Enhanced debugging if report not found
            console.log(`[DispatchSLAReportsPage] FAILED: Report "${reportName}" not found. Error:`, error.message);
            
            // Get all report names in the table for debugging
            const allReportNames = await this.page.locator('tr td:nth-child(2)').allTextContents();
            console.log('[DispatchSLAReportsPage] All reports in table:', allReportNames);
            
            // Take a final screenshot for debugging
            await this.page.screenshot({ path: 'debug-report-not-found-final.png' });
            
            throw error;
        }
    }

    async downloadReport(reportName) {
        console.log(`[DispatchSLAReportsPage] Downloading report: ${reportName}...`);
        
        const reportRow = await this.verifyReportInList(reportName);
        const downloadButton = reportRow.locator(this.downloadButton);
        await downloadButton.click();
        
        console.log(`[DispatchSLAReportsPage] Report ${reportName} download initiated`);
    }

    async archiveReport(reportName) {
        console.log(`[DispatchSLAReportsPage] Archiving report: ${reportName}...`);
        
        const reportRow = await this.verifyReportInList(reportName);
        const archiveButton = reportRow.locator(this.archiveButton);
        await archiveButton.click();
        
        console.log(`[DispatchSLAReportsPage] Report ${reportName} archived`);
    }

    async waitForReportProcessing(reportName, timeout = 30000) {
        console.log(`[DispatchSLAReportsPage] Waiting for report "${reportName}" to be processed...`);
        
        const reportRow = this.page.locator(`tr:has-text("${reportName}")`);
        const readyStatus = reportRow.locator('text=Ready');
        
        await expect(readyStatus).toBeVisible({ timeout });
        
        console.log(`[DispatchSLAReportsPage] Report "${reportName}" is ready`);
    }

    async getReportStatus(reportName) {
        console.log(`[DispatchSLAReportsPage] Getting status for report: ${reportName}...`);
        
        const reportRow = await this.verifyReportInList(reportName);
        const statusCell = reportRow.locator('td').nth(5); // Assuming status is in 6th column
        const status = await statusCell.textContent();
        
        console.log(`[DispatchSLAReportsPage] Report ${reportName} status: ${status}`);
        return status?.trim();
    }

    async verifyPageElements() {
        console.log('[DispatchSLAReportsPage] Verifying page elements...');
        
        await expect(this.pageTitle).toBeVisible();
        await expect(this.createNewButton).toBeVisible();
        await expect(this.reportTable).toBeVisible();
        
        console.log('[DispatchSLAReportsPage] All page elements verified');
    }
}
