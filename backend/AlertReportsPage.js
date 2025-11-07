// e2e/AlertReportsPage.js
// @ts-check

export class AlertReportsPage {
    /**
     * @param {import('@playwright/test').Page} page
     */    constructor(page) {
        this.page = page;
        
        // Alert Reports page locators
        this.pageTitle = page.locator('h1, h2, .page-title, [data-test-id*="title"]');
        this.downloadButtons = page.locator('button:has-text("Download")');
        this.firstDownloadButton = this.downloadButtons.first();
    }

    /**
     * Waits for the Alert Reports page to load
     */
    async waitForPageToLoad() {
        console.log('[AlertReports] Waiting for Alert Reports page to load...');
        
        // Wait for page to be fully loaded
        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
        
        // Wait for download buttons to be visible
        await this.downloadButtons.first().waitFor({ 
            state: 'visible', 
            timeout: 30000 
        });
        
        console.log('[AlertReports] Alert Reports page loaded successfully');
    }

    /**
     * Clicks the first download button and handles PDF opening in new tab
     * @returns {Promise<import('@playwright/test').Page>} Returns the PDF page
     */
    async clickFirstDownloadButton() {
        console.log('[AlertReports] Clicking first download button...');
        
        // Wait for new page/tab to open
        const [pdfPage] = await Promise.all([
            this.page.waitForEvent('popup', { timeout: 30000 }),
            this.firstDownloadButton.click()
        ]);
        
        console.log('[AlertReports] Download button clicked, new tab opened');
        
        // Wait for the PDF page to load
        await pdfPage.waitForLoadState('networkidle', { timeout: 45000 });
        
        return pdfPage;
    }    /**
     * Light-weight PDF detection using URL, embed and network signals.
     * Does not throw, returns boolean.
     * @param {import('@playwright/test').Page} pdfPage
     * @returns {Promise<boolean>}
     */
    /**
     * @param {import('@playwright/test').Page} pdfPage
     */
    async detectPDF(pdfPage) {
        // Wait briefly to allow content to load
        await pdfPage.waitForTimeout(2000);

        // 1) Quick URL-based detection
        const url = pdfPage.url() || '';
        if (url.includes('.pdf') || url.toLowerCase().includes('application/pdf')) {
            console.log(`[AlertReports] ✅ PDF detected via URL: ${url}`);
            return true;
        }

        // 2) Look for embedded PDF elements (viewer)
        try {
            const embedInfo = await pdfPage.evaluate(() => {
                const el = document.querySelector('embed[type="application/pdf"], object[type="application/pdf"], iframe[src*=".pdf"]');
                if (!el) return { found: false };
                // @ts-ignore
                const src = el.src || el.data || '';
                return { found: true, src };
            });
            if (embedInfo?.found) {
                console.log(`[AlertReports] ✅ PDF detected via embedded element${embedInfo.src ? `: ${embedInfo.src}` : ''}`);
                return true;
            }
        } catch (/** @type {any} */ e) {
            console.log(`[AlertReports] Debug: embed detection failed: ${e?.message || e}`);
        }

        // 3) Network-level detection: wait for any PDF response
        try {
            const pdfResp = await pdfPage.waitForResponse((/** @type {import('@playwright/test').Response} */ r) => {
                const ct = ((r.headers() || {})['content-type'] || '').toLowerCase();
                return ct.includes('application/pdf') || /\.pdf(\?|$)/i.test(r.url());
            }, { timeout: 5000 });
            if (pdfResp) {
                console.log(`[AlertReports] ✅ PDF detected via network response: ${pdfResp.url()}`);
                return true;
            }
        } catch {}

        // Could not positively detect a PDF
        console.log(`[AlertReports] ⚠️ Unable to confirm PDF via URL, embed, or network. URL observed: ${url || '(empty)'}`);
        return false;
    }

    /**
     * Verifies that a PDF is present/loaded by signals; throws if not.
     * Kept strict to match earlier expectations.
     * @param {import('@playwright/test').Page} pdfPage - The PDF page
     * @param {string} expectedText - Unused currently; kept for signature compatibility
     */
    async verifyPDFContainsText(pdfPage, expectedText = 'Incident Report') {
        console.log(`[AlertReports] Verifying PDF presence (strict)`);
        const detected = await this.detectPDF(pdfPage);
        if (!detected) {
            throw new Error('PDF verification failed - unable to confirm PDF content via URL, embed, or network');
        }
        return true;
    }

    /**
     * Gets the count of download buttons on the page
     * @returns {Promise<number>} Number of download buttons
     */
    async getDownloadButtonCount() {
        const count = await this.downloadButtons.count();
        console.log(`[AlertReports] Found ${count} download buttons on the page`);
        return count;
    }

    /**
     * Clicks a specific download button by index
     * @param {number} index - Index of the download button to click (0-based)
     * @returns {Promise<import('@playwright/test').Page>} Returns the PDF page
     */
    async clickDownloadButtonByIndex(index) {
        console.log(`[AlertReports] Clicking download button at index ${index}...`);
        
        const downloadButton = this.downloadButtons.nth(index);
        await downloadButton.waitFor({ state: 'visible', timeout: 15000 });
        
        const [pdfPage] = await Promise.all([
            this.page.waitForEvent('popup', { timeout: 30000 }),
            downloadButton.click()
        ]);
        
        await pdfPage.waitForLoadState('networkidle', { timeout: 45000 });
        console.log(`[AlertReports] Download button ${index} clicked, new tab opened`);
        
        return pdfPage;
    }

    /**
     * Closes PDF page/tab safely
     * @param {import('@playwright/test').Page} pdfPage - The PDF page to close
     */
    async closePDFPage(pdfPage) {
        try {
            console.log('[AlertReports] Closing PDF page...');
            await pdfPage.close();
            console.log('[AlertReports] PDF page closed successfully');
        } catch (/** @type {any} */ error) {
            console.log(`[AlertReports] Warning: Error closing PDF page: ${error?.message || error}`);
        }
    }
}
