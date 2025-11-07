// backend/GlobalFailureHandler.js
import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global failure handler that captures screenshots and page snapshots on test failures
 * This provides additional debugging information beyond the default Playwright screenshot
 */
export class GlobalFailureHandler {
    constructor() {
        this.setupGlobalHooks();
    }

    setupGlobalHooks() {
        // Global afterEach hook that runs for ALL tests
        test.afterEach(async ({ page }, testInfo) => {
            // Only capture additional debug info on failure
            if (testInfo.status === 'failed') {
                await this.captureFailureArtifacts(page, testInfo);
            }
        });
    }

    async captureFailureArtifacts(page, testInfo) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const testName = testInfo.title.replace(/[^a-zA-Z0-9]/g, '_');
        const artifactDir = path.join('test-failures', `${testName}_${timestamp}`);
        
        // Ensure directory exists
        fs.mkdirSync(artifactDir, { recursive: true });

        try {
            console.log(`🚨 TEST FAILURE DETECTED: ${testInfo.title}`);
            console.log(`📁 Saving failure artifacts to: ${artifactDir}`);

            // 1. Capture full page screenshot (high quality)
            const screenshotPath = path.join(artifactDir, 'failure-screenshot.png');
            await page.screenshot({ 
                path: screenshotPath, 
                fullPage: true,
                type: 'png'
            });
            console.log(`📸 Screenshot: ${screenshotPath}`);

            // 2. Capture page HTML content
            const htmlPath = path.join(artifactDir, 'page-content.html');
            const htmlContent = await page.content();
            fs.writeFileSync(htmlPath, htmlContent);
            console.log(`📄 HTML: ${htmlPath}`);

            // 3. Capture page URL and basic info
            const infoPath = path.join(artifactDir, 'failure-info.json');
            const failureInfo = {
                testTitle: testInfo.title,
                testFile: testInfo.file,
                failureTime: new Date().toISOString(),
                pageUrl: page.url(),
                viewport: await page.viewportSize(),
                userAgent: await page.evaluate(() => navigator.userAgent),
                errors: testInfo.errors.map(error => ({
                    message: error.message,
                    stack: error.stack
                }))
            };
            fs.writeFileSync(infoPath, JSON.stringify(failureInfo, null, 2));
            console.log(`📊 Info: ${infoPath}`);

            // 4. Try to capture console logs if available
            try {
                const consoleLogs = await page.evaluate(() => {
                    return window.console._logs || [];
                });
                if (consoleLogs.length > 0) {
                    const consoleLogPath = path.join(artifactDir, 'console-logs.json');
                    fs.writeFileSync(consoleLogPath, JSON.stringify(consoleLogs, null, 2));
                    console.log(`[GlobalFailureHandler] Console logs saved: ${consoleLogPath}`);
                }
            } catch (error) {
                // Console logs not available, skip
            }

            // 5. Capture accessibility snapshot if possible
            try {
                const accessibilitySnapshot = await page.accessibility.snapshot();
                if (accessibilitySnapshot) {
                    const a11yPath = path.join(artifactDir, 'accessibility-snapshot.json');
                    fs.writeFileSync(a11yPath, JSON.stringify(accessibilitySnapshot, null, 2));
                    console.log(`[GlobalFailureHandler] Accessibility snapshot saved: ${a11yPath}`);
                }
            } catch (error) {
                // Accessibility snapshot failed, skip
            }

            // 6. Attach artifacts to test results for HTML report
            await testInfo.attach('Failure Screenshot', { 
                path: screenshotPath, 
                contentType: 'image/png' 
            });
            await testInfo.attach('Page HTML Content', { 
                path: htmlPath, 
                contentType: 'text/html' 
            });
            await testInfo.attach('Failure Information', { 
                path: infoPath, 
                contentType: 'application/json' 
            });

            console.log(`✅ All failure artifacts saved to: ${artifactDir}`);

        } catch (error) {
            console.error(`❌ Failed to capture failure artifacts: ${error.message}`);
        }
    }
}

// Auto-instantiate the global failure handler
new GlobalFailureHandler();
