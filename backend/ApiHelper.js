import { EventPublisher } from './EventPublisher.js';

/**
 * Simple API Helper for easy alert generation
 * Usage: 
 *   const apiHelper = new ApiHelper();
 *   await apiHelper.sendAlert('trex_public');
 *   await apiHelper.sendAlert('trex_private');
 *   await apiHelper.sendAlert('unusual_behaviour');
 *   await apiHelper.sendAlert('public_lpr');
 */
export class ApiHelper {
    constructor() {
        this.eventPublisher = new EventPublisher();
    }

    /**
     * Send an alert of the specified type
     * @param {string} alertType - One of: 'trex_public', 'trex_private', 'unusual_behaviour', 'public_lpr'
     * @returns {Promise<{ok: boolean, status: number}>}
     */
    async sendAlert(alertType) {
        const siteName = this.getSiteName(alertType);
        console.log(`🎯 [${alertType.toUpperCase()}] Sending alert for site: ${siteName}`);
        
        let result;
        switch (alertType.toLowerCase()) {
            case 'trex_public':
            case 'trex':
                result = await this.eventPublisher.trexPublic();
                break;
            case 'trex_private':
                result = await this.eventPublisher.trexPrivate();
                break;
            case 'unusual_behaviour':
            case 'ub':
                result = await this.eventPublisher.unusualBehaviour();
                break;
            case 'public_lpr':
            case 'lpr':
                result = await this.eventPublisher.publicLpr();
                break;
            default:
                throw new Error(`Unknown alert type: ${alertType}. Use: trex_public, trex_private, unusual_behaviour, public_lpr`);
        }
        
        console.log(`✅ [${alertType.toUpperCase()}] Status: ${result.status}, Success: ${result.ok}`);
        return result;
    }

    /**
     * Send multiple alerts in sequence
     * @param {string[]} alertTypes - Array of alert types
     * @returns {Promise<Array>}
     */
    async sendMultipleAlerts(alertTypes) {
        const results = [];
        for (const alertType of alertTypes) {
            const result = await this.sendAlert(alertType);
            results.push({ alertType, ...result });
            
            // Small delay between alerts to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return results;
    }

    /**
     * Get the configured site name for an alert type
     * @param {string} alertType 
     * @returns {string}
     */
    getSiteName(alertType) {
        switch (alertType.toLowerCase()) {
            case 'trex_public':
            case 'trex':
                return process.env.trex || 'WVRD_9th Ave and JG Strydom Rd_62';
            case 'trex_private':
                return process.env.trex_private || 'NGA_20481_Ramoshie_Eaton';
            case 'unusual_behaviour':
            case 'ub':
                return process.env.UB || 'WVRD_9th Ave and JG Strydom Rd_62';
            case 'public_lpr':
            case 'lpr':
                return process.env.public_lpr || 'MCLN_Berea Str and Bourke Str_20.4_A';
            default:
                return 'Unknown Site';
        }
    }

    /**
     * Validate that API can be called (environment variables are set)
     * @returns {boolean}
     */
    validateApiConfig() {
        const requiredVars = ['UAT_URL', 'UAT_SASKEY', 'ENVIRONMENT'];
        const missing = requiredVars.filter(varName => !process.env[varName]);
        
        if (missing.length > 0) {
            console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
            return false;
        }
        
        console.log('✅ API configuration is valid');
        return true;
    }
}

export default ApiHelper;
