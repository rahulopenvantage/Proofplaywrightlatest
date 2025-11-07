// backend/TestArtifactsCleanup.js
import fs from 'fs';
import path from 'path';

/**
 * Cleanup utility for test artifacts directories
 * Ensures clean state before each test run by removing previous artifacts
 */
export class TestArtifactsCleanup {
    constructor() {
        this.projectRoot = process.cwd();
        this.testFailuresDir = path.join(this.projectRoot, 'test-failures');
        this.testResultsDir = path.join(this.projectRoot, 'test-results');
    }

    /**
     * Main cleanup method - clears both test-failures and test-results directories
     */
    async cleanup() {
        console.log('[Cleanup] Starting test artifacts cleanup...');
        
        try {
            // Clean test-failures directory (custom GlobalFailureHandler artifacts)
            await this.cleanDirectory(this.testFailuresDir, 'test-failures');
            
            // Clean test-results directory (Playwright built-in artifacts)
            await this.cleanDirectory(this.testResultsDir, 'test-results');
            
            console.log('[Cleanup] ✅ Test artifacts cleanup completed successfully');
            
        } catch (error) {
            console.error(`[Cleanup] ❌ Cleanup failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clean a specific directory and recreate it empty
     * @param {string} dirPath - Path to directory to clean
     * @param {string} dirName - Name for logging
     */
    async cleanDirectory(dirPath, dirName) {
        try {
            if (fs.existsSync(dirPath)) {
                // Get list of items before deletion for logging
                const items = fs.readdirSync(dirPath);
                
                if (items.length > 0) {
                    console.log(`[Cleanup] Removing ${items.length} items from ${dirName}...`);
                    
                    // Remove the entire directory and its contents
                    fs.rmSync(dirPath, { recursive: true, force: true });
                    console.log(`[Cleanup] 🗑️  Cleared ${dirName} directory`);
                } else {
                    console.log(`[Cleanup] ${dirName} directory already empty`);
                }
            } else {
                console.log(`[Cleanup] ${dirName} directory doesn't exist, skipping`);
            }
            
            // Recreate the directory structure
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`[Cleanup] 📁 Recreated clean ${dirName} directory`);
            
        } catch (error) {
            console.error(`[Cleanup] Failed to clean ${dirName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get summary of what would be cleaned (dry run)
     */
    getSummary() {
        const summary = {
            testFailures: { exists: false, count: 0, items: [] },
            testResults: { exists: false, count: 0, items: [] }
        };

        try {
            if (fs.existsSync(this.testFailuresDir)) {
                const items = fs.readdirSync(this.testFailuresDir);
                summary.testFailures = {
                    exists: true,
                    count: items.length,
                    items: items
                };
            }

            if (fs.existsSync(this.testResultsDir)) {
                const items = fs.readdirSync(this.testResultsDir);
                summary.testResults = {
                    exists: true,
                    count: items.length,
                    items: items.filter(item => item !== '.last-run.json') // Exclude Playwright's tracking file
                };
            }
        } catch (error) {
            console.warn(`[Cleanup] Warning: Could not read directories for summary: ${error.message}`);
        }

        return summary;
    }

    /**
     * Display cleanup summary
     */
    displaySummary() {
        const summary = this.getSummary();
        
        console.log('[Cleanup] Artifact directories status:');
        console.log(`  📁 test-failures: ${summary.testFailures.count} items`);
        console.log(`  📁 test-results: ${summary.testResults.count} items`);
        
        if (summary.testFailures.count > 0 || summary.testResults.count > 0) {
            console.log('[Cleanup] Will clean these directories before test run');
        } else {
            console.log('[Cleanup] Directories already clean');
        }
    }
}

// Auto-instantiate for import usage
export const testArtifactsCleanup = new TestArtifactsCleanup();
