/**
 * Storage State Manager for Proof360 Playwright Tests
 * Manages authentication state persistence across test runs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StorageStateManager {
    constructor() {
        this.storageStatePath = path.resolve(__dirname, '..', 'userStorageState.json');
    }

    /**
     * Check if storage state file exists and is valid
     * @returns {Promise<boolean>} True if storage state exists and is valid
     */
    async hasValidStorageState() {
        try {
            if (!fs.existsSync(this.storageStatePath)) {
                console.log('[StorageStateManager] No storage state file found');
                return false;
            }

            const stats = fs.statSync(this.storageStatePath);
            const fileAge = Date.now() - stats.mtime.getTime();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

            if (fileAge > maxAge) {
                console.log('[StorageStateManager] Storage state file is older than 24 hours, will refresh');
                return false;
            }

            const storageState = JSON.parse(fs.readFileSync(this.storageStatePath, 'utf8'));
            
            // Basic validation - check if it has cookies and origins
            if (!storageState.cookies || !storageState.origins || storageState.cookies.length === 0) {
                console.log('[StorageStateManager] Storage state file is invalid or empty');
                return false;
            }

            console.log('[StorageStateManager] Valid storage state found');
            return true;
        } catch (error) {
            console.log('[StorageStateManager] Error checking storage state:', error.message);
            return false;
        }
    }

    /**
     * Clear the storage state file
     */
    async clearStorageState() {
        try {
            if (fs.existsSync(this.storageStatePath)) {
                fs.unlinkSync(this.storageStatePath);
                console.log('[StorageStateManager] Storage state cleared');
            }
        } catch (error) {
            console.log('[StorageStateManager] Error clearing storage state:', error.message);
        }
    }

    /**
     * Save storage state from page context
     * @param {import('@playwright/test').BrowserContext} context - Browser context
     */
    async saveStorageState(context) {
        try {
            await context.storageState({ path: this.storageStatePath });
            console.log('[StorageStateManager] Storage state saved');
        } catch (error) {
            console.log('[StorageStateManager] Error saving storage state:', error.message);
        }
    }

    /**
     * Get storage state path
     * @returns {string} Path to storage state file
     */
    getStorageStatePath() {
        return this.storageStatePath;
    }
}
