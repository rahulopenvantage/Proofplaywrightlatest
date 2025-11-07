import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Session State Manager for persistent authentication across multiple test files
 * Supports multiple user types (admin, normal, etc.)
 */
export class SessionManager {
    constructor(userType = 'admin') {
        this.userType = userType;
        this.storageStatePath = path.resolve(__dirname, '..', `userStorageState_${userType}.json`);
        this.sessionValidityPath = path.resolve(__dirname, '..', `sessionValidity_${userType}.json`);
        this.sessionValidityDuration = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Check if we have a valid session for this user type
     * @returns {Promise<boolean>} True if session is valid
     */
    async hasValidSession() {
        try {
            // Check if storage state file exists
            if (!fs.existsSync(this.storageStatePath)) {
                console.log(`[SessionManager-${this.userType}] No storage state file found`);
                return false;
            }

            // Check if session validity file exists
            if (!fs.existsSync(this.sessionValidityPath)) {
                console.log(`[SessionManager-${this.userType}] No session validity file found`);
                return false;
            }

            // Check session validity timestamp
            const validityData = JSON.parse(fs.readFileSync(this.sessionValidityPath, 'utf8'));
            const now = Date.now();
            const sessionAge = now - validityData.timestamp;

            if (sessionAge > this.sessionValidityDuration) {
                console.log(`[SessionManager-${this.userType}] Session expired`);
                return false;
            }

            // Validate storage state structure
            const storageState = JSON.parse(fs.readFileSync(this.storageStatePath, 'utf8'));
            if (!storageState.cookies || !storageState.origins || storageState.cookies.length === 0) {
                console.log(`[SessionManager-${this.userType}] Invalid storage state structure`);
                return false;
            }

            console.log(`[SessionManager-${this.userType}] Valid session found`);
            return true;
        } catch (error) {
            console.log(`[SessionManager-${this.userType}] Error checking session validity:`, error.message);
            return false;
        }
    }

    /**
     * Mark session as valid for this user type
     */
    async markSessionValid() {
        try {
            const validityData = {
                timestamp: Date.now(),
                created: new Date().toISOString(),
                userType: this.userType
            };
            fs.writeFileSync(this.sessionValidityPath, JSON.stringify(validityData, null, 2));
            console.log(`[SessionManager-${this.userType}] Session marked as valid`);
        } catch (error) {
            console.log(`[SessionManager-${this.userType}] Error marking session as valid:`, error.message);
        }
    }

    /**
     * Clear session state for this user type
     */
    async clearSession() {
        try {
            if (fs.existsSync(this.storageStatePath)) {
                fs.unlinkSync(this.storageStatePath);
            }
            if (fs.existsSync(this.sessionValidityPath)) {
                fs.unlinkSync(this.sessionValidityPath);
            }
            console.log(`[SessionManager-${this.userType}] Session cleared`);
        } catch (error) {
            console.log(`[SessionManager-${this.userType}] Error clearing session:`, error.message);
        }
    }

    /**
     * Check if session needs refresh
     * @returns {boolean} True if session needs refresh
     */
    async needsRefresh() {
        try {
            if (!fs.existsSync(this.sessionValidityPath)) {
                return true;
            }

            const validityData = JSON.parse(fs.readFileSync(this.sessionValidityPath, 'utf8'));
            const now = Date.now();
            const sessionAge = now - validityData.timestamp;
            const refreshThreshold = 20 * 60 * 1000; // 20 minutes

            return sessionAge > refreshThreshold;
        } catch (error) {
            return true;
        }
    }

    /**
     * Get storage state path for this user type
     * @returns {string} Path to storage state file
     */
    getStorageStatePath() {
        return this.storageStatePath;
    }

    /**
     * Update session timestamp (extend validity)
     */
    async extendSession() {
        try {
            if (fs.existsSync(this.sessionValidityPath)) {
                const validityData = JSON.parse(fs.readFileSync(this.sessionValidityPath, 'utf8'));
                validityData.timestamp = Date.now();
                validityData.lastExtended = new Date().toISOString();
                fs.writeFileSync(this.sessionValidityPath, JSON.stringify(validityData, null, 2));
                console.log(`[SessionManager-${this.userType}] Session extended`);
            }
        } catch (error) {
            console.log(`[SessionManager-${this.userType}] Error extending session:`, error.message);
        }
    }

    /**
     * Get user type
     * @returns {string} User type
     */
    getUserType() {
        return this.userType;
    }
}
