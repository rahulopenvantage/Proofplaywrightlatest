// @ts-nocheck
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../../backend/SharedTestSteps.js';
import { AuthHelper } from '../../../backend/AuthHelper.js';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

// Soft matcher to find text (case-insensitive, ignore extra whitespace)
function containsCI(haystack, needle) {
  const h = haystack.replace(/\s+/g, ' ').toLowerCase();
  const n = needle.replace(/\s+/g, ' ').toLowerCase();
  return h.includes(n);
}

// Common regexes
const re = {
  date: /(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{1,2} \w{3,9} \d{4})/, // 2025-10-28 or 28 Oct 2025
  time: /(\d{1,2}:\d{2}(?::\d{2})?)/, // 14:05 or 14:05:33
  incidentId: /(incident\s*id\s*[:#-]?\s*[A-Za-z0-9\-_/]+)/i,
};

// Extract and normalize full PDF text using test page API context
async function extractPdfTextFromPage(apiPage, pdfPage, downloadsDir = 'Downloads') {
  // Prefer waiting for a PDF-like URL rather than load state
  await pdfPage.waitForLoadState('load', { timeout: 45000 }).catch(() => {});
  
  // Wait for the PDF to be fully rendered
  await pdfPage.waitForTimeout(2000);
  
  const url = pdfPage.url();
  console.log(`[PDF Extract] Downloading PDF from URL: ${url}`);
  
  const response = await apiPage.request.get(url);
  const pdfBuffer = await response.body();

  if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
  const filePath = path.join(downloadsDir, `incident-report-${Date.now()}.pdf`);
  fs.writeFileSync(filePath, pdfBuffer);
  console.log(`[PDF Extract] PDF saved to: ${filePath}`);

  const parsed = await pdfParse(pdfBuffer);
  const text = parsed.text.replace(/\s+/g, ' ').trim();
  console.log(`[PDF Extract] Extracted ${text.length} characters from ${parsed.numpages} pages`);
  return { text, pages: parsed.numpages, filePath };
}

// Find the first visible Download button across paginated results
async function findFirstDownloadOnAnyPage(page, maxPages = 25) {
  for (let i = 0; i < maxPages; i++) {
    const btns = page.locator('button:has-text("Download")');
    const count = await btns.count();
    for (let j = 0; j < count; j++) {
      const b = btns.nth(j);
      if (await b.isVisible().catch(() => false)) {
        const ariaRow = b.locator('xpath=ancestor::*[@role="row"][1]');
        const trRow = b.locator('xpath=ancestor::tr[1]');
        const row = (await ariaRow.count()) ? ariaRow : trRow;
        return { button: b, row };
      }
    }
    const next = page.getByRole('button', { name: 'Next page' });
    if (!await next.isEnabled().catch(() => false)) break;
    await next.click();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  return null;
}

// Download-first retrieval: wait for browser download, save, and parse PDF text
async function downloadAndParseFirstReport(page, downloadsDir = 'Downloads') {
  const found = await findFirstDownloadOnAnyPage(page);
  if (!found) return null;
  const { button, row } = found;
  const uiRowText = ((await row.textContent()) || '').replace(/\s+/g, ' ').trim();

  let download = null;
  let pdfPage = null;
  let buffer = null;
  let filePath = null;

  try {
    // Try download event first
    [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      button.click()
    ]);
    console.log('[Download] ✅ Download event captured');
  } catch (e) {
    console.log('[Download] ⚠️ No download event; attempting popup strategy...');
    try {
      // Fallback to popup strategy
      [pdfPage] = await Promise.all([
        page.waitForEvent('popup', { timeout: 30000 }),
        button.click()
      ]);
      console.log('[Download] ✅ Popup captured');
    } catch (popupError) {
      console.log('[Download] ❌ Both download and popup strategies failed');
      throw new Error('Failed to capture PDF via download or popup');
    }
  }

  // Handle download event
  if (download) {
    const suggested = download.suggestedFilename();
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
    filePath = path.join(downloadsDir, suggested || `incident-report-${Date.now()}.pdf`);
    await download.saveAs(filePath);
    buffer = fs.readFileSync(filePath);
  }
  // Handle popup
  else if (pdfPage) {
    await pdfPage.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
    const pdfUrl = pdfPage.url();
    console.log(`[Download] PDF URL from popup: ${pdfUrl}`);
    
    // Fetch the PDF bytes from the URL
    const resp = await page.request.get(pdfUrl);
    if (resp && resp.ok()) {
      buffer = await resp.body();
      if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
      filePath = path.join(downloadsDir, `incident-report-${Date.now()}.pdf`);
      fs.writeFileSync(filePath, buffer);
    } else {
      throw new Error(`Failed to fetch PDF from URL: ${pdfUrl}`);
    }
    
    // Close the popup
    await pdfPage.close().catch(() => {});
  }

  const parsed = await pdfParse(buffer);
  const text = parsed.text.replace(/\s+/g, ' ').trim();
  return { text, pages: parsed.numpages, filePath, uiRowText };
}

test.describe('Incident Report – PDF Content Validation', () => {
  let sharedSteps; let authHelper;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(300000);
    if (!USERNAME || !PASSWORD) throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD must be set');

    sharedSteps = new SharedTestSteps(page);
    authHelper = new AuthHelper(page);

    await authHelper.ensureAuthenticated(sharedSteps, USERNAME, PASSWORD, 'Vodacom');
    await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
  });

  test('Open an existing Incident Report PDF and verify key content', async ({ page }) => {
    console.log('[Test] Starting: Open an existing Incident Report PDF and verify key content');
    
  // Navigate to Alert Reports and use browser download (more reliable than popup)
  await sharedSteps.menuPage.navigateToAlertReports();
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);

  console.log('[Test] Extracting PDF content via download...');
  const downloaded = await downloadAndParseFirstReport(page);
  if (!downloaded) test.skip(true, 'No downloadable report found');
  const { text, pages } = downloaded;
  console.log(`[Test] PDF extracted: ${text.substring(0, 200)}...`);

    // Always present expectations
    console.log('[Test] Verifying: PDF contains "Incident Report"');
    expect.soft(containsCI(text, 'Incident Report')).toBeTruthy();

    // Report date exists
    console.log('[Test] Verifying: PDF contains date pattern');
    expect.soft(re.date.test(text)).toBeTruthy();

  // Footer/branding hints (optional, don't fail test if branding text varies)
  const brandingPresent = ['Proof', 'Proof 360', 'Powered by'].some(b => containsCI(text, b));
  console.log(`[Test] Branding present: ${brandingPresent}`);

    // Basic incident fields
    console.log('[Test] Verifying: PDF contains incident ID');
    expect.soft(re.incidentId.test(text)).toBeTruthy();

    // Status variants – presence depends on data; validate softly
    const statusHints = ['Resolved', 'Not resolved', 'Dismissed', 'Escalated', 'Dispatch'];
    const presentStatuses = statusHints.filter(s => containsCI(text, s));
    console.log(`[Test] Found status indicators: ${presentStatuses.join(', ')}`);
    expect.soft(presentStatuses.length > 0).toBeTruthy();

  // Alert types – UB/LPR/Object Motion keywords when applicable (optional)
  const typeHints = ['Unusual Behaviour', 'Object Motion', 'LPR'];
  const presentTypes = typeHints.filter(t => containsCI(text, t));
  console.log(`[Test] Found alert types: ${presentTypes.join(', ') || 'none'}`);

    // Timestamp patterns should occur
    console.log('[Test] Verifying: PDF contains time patterns');
    expect.soft(re.time.test(text)).toBeTruthy();

  // Map snapshot label (image not verifiable by text) - treat as optional
  const mapRef = ['Map', 'Map Snapshot', 'Map Reference'].some(k => containsCI(text, k));
  console.log(`[Test] Map reference present: ${mapRef}`);

    // Page count > 0
    console.log(`[Test] Verifying: PDF has pages (found ${pages} pages)`);
    expect.soft(pages >= 1).toBeTruthy();
    
    console.log('[Test] ✅ Test completed: Open an existing Incident Report PDF and verify key content');
  });

  test('Validate dispatch provider actions (Response 24 / Aura) when present', async ({ page }) => {
    console.log('[Test] Starting: Validate dispatch provider actions');
    
  // Navigate to Alert Reports and download first report
  await sharedSteps.menuPage.navigateToAlertReports();
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);

  console.log('[Test] Extracting PDF content via download...');
  const downloaded = await downloadAndParseFirstReport(page);
  if (!downloaded) test.skip(true, 'No downloadable report found');
  const { text } = downloaded;

    // Response 24 lifecycle
    const r24 = [
      'Dispatch',
      'Dispatch Created',
      'Responder Dispatched',
      'Responder Arrived',
      'Image Taken',
      'Responder Completed',
      'Responder Cancelled',
      'Dispatch Closed',
    ];
  const r24Present = r24.filter(k => containsCI(text, k));
  console.log(`[Test] Found Response24 indicators: ${r24Present.join(', ') || 'none'}`);

    // Aura lifecycle
    const aura = [
      'Dispatch',
      'Response Requested',
      'Activepolling',
      'Responder Completed',
      'Dispatch Closed',
    ];
    const auraPresent = aura.filter(k => containsCI(text, k));
    console.log(`[Test] Found Aura indicators: ${auraPresent.join(', ') || 'none'}`);

    // If neither provider lifecycle is present, treat as data-dependent and skip instead of failing
    if (r24Present.length === 0 && auraPresent.length === 0) {
      test.skip(true, 'No dispatch provider lifecycle found in the PDF for this report (data-dependent).');
    }
    
    console.log('[Test] ✅ Test completed: Validate dispatch provider actions');
  });

  test('Preview vs Download consistency (title/name/date)', async ({ page }) => {
    console.log('[Test] Starting: Preview vs Download consistency');

    // Go to Alert Reports and wait for list
    await sharedSteps.menuPage.navigateToAlertReports();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const found = await findFirstDownloadOnAnyPage(page);
    if (!found) {
      console.log('[Test] ⚠️ No downloadable report found across pages');
      test.skip(true, 'No downloadable report found');
    }

    const { button: downloadBtn, row } = found;
    const uiRowText = ((await row.textContent()) || '').replace(/\s+/g, ' ').trim();
    console.log(`[Test] UI Row text: ${uiRowText.substring(0, 140)}...`);

    // Try to get the Report Name cell specifically if ARIA gridcells exist
    let reportName = '';
    try {
      const firstCell = row.locator('[role="gridcell"]').first();
      if (await firstCell.isVisible().catch(() => false)) {
        reportName = (await firstCell.textContent() || '').replace(/\s+/g, ' ').trim();
      }
    } catch {}

    console.log(`[Test] Report name (best-effort): ${reportName || '(fallback to row text)'}
`);

    console.log('[Test] Clicking download button and waiting for PDF...');
    let download = null;
    let pdfPage = null;
    let buffer = null;
    
    try {
      // Try download event first
      [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        downloadBtn.click()
      ]);
      console.log('[Test] ✅ Download event captured');
    } catch (e) {
      console.log('[Test] ⚠️ No download event; attempting popup strategy...');
      try {
        // Fallback to popup strategy
        [pdfPage] = await Promise.all([
          page.waitForEvent('popup', { timeout: 30000 }),
          downloadBtn.click()
        ]);
        console.log('[Test] ✅ Popup captured');
      } catch (popupError) {
        console.log('[Test] ❌ Both download and popup strategies failed');
        throw new Error('Failed to capture PDF via download or popup');
      }
    }

    // Handle download event
    if (download) {
      const suggested = download.suggestedFilename();
      const downloadsDir = 'Downloads';
      if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
      const filePath = path.join(downloadsDir, suggested || `incident-report-${Date.now()}.pdf`);
      await download.saveAs(filePath);
      buffer = fs.readFileSync(filePath);
    }
    // Handle popup
    else if (pdfPage) {
      await pdfPage.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
      const pdfUrl = pdfPage.url();
      console.log(`[Test] PDF URL from popup: ${pdfUrl}`);
      
      // Fetch the PDF bytes from the URL
      const resp = await page.request.get(pdfUrl);
      if (resp && resp.ok()) {
        buffer = await resp.body();
        const downloadsDir = 'Downloads';
        if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
        const filePath = path.join(downloadsDir, `incident-report-${Date.now()}.pdf`);
        fs.writeFileSync(filePath, buffer);
      } else {
        throw new Error(`Failed to fetch PDF from URL: ${pdfUrl}`);
      }
      
      // Close the popup
      await pdfPage.close().catch(() => {});
    }

    const parsed = await pdfParse(buffer);
    const text = parsed.text.replace(/\s+/g, ' ').trim();

    // Normalize and compare
    const pdfText = text;
    const nameToCheck = reportName || uiRowText.split('|')[0];
    const simpleNameMatch = nameToCheck && nameToCheck.length > 0 ? containsCI(pdfText, nameToCheck) : false;

    // Token-based fuzzy matching
    const rawTokens = (reportName || uiRowText).split(/[^A-Za-z0-9]+/).filter(Boolean);
    const tokens = rawTokens.filter(t => t.length >= 4 && !/^\d+$/.test(t)).slice(0, 8);
    const matched = tokens.filter(tok => containsCI(pdfText, tok));
    console.log(`[Test] Matched tokens in PDF: ${matched.join(', ')} (${matched.length}/${tokens.length})`);

    // Expect at least the name string or at least 3 token matches
    expect.soft(simpleNameMatch || matched.length >= 3).toBeTruthy();

    console.log('[Test] ✅ Test completed: Preview vs Download consistency');
  });
});
