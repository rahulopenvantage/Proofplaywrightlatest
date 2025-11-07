#!/usr/bin/env node
/**
 * Session Reset Utility
 * Use this when you want to force a fresh login for one or both user types
 */

import { SessionManager } from './backend/SessionManager.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userType = process.argv[2]; // Get user type from command line

if (userType && ['admin', 'normal'].includes(userType)) {
    console.log(`🔄 Clearing stored session for ${userType} user...`);
    const sessionManager = new SessionManager(userType);
    await sessionManager.clearSession();
    console.log(`✅ ${userType} session cleared! Next test run will perform fresh login.`);
} else {
    console.log('🔄 Clearing stored sessions for all user types...');
    
    // Clear admin session
    const adminSessionManager = new SessionManager('admin');
    await adminSessionManager.clearSession();
    
    // Clear normal user session
    const normalSessionManager = new SessionManager('normal');
    await normalSessionManager.clearSession();
    
    console.log('✅ All sessions cleared! Next test run will perform fresh login.');
}

console.log('');
console.log('Usage:');
console.log('  node reset-session.js        # Clear all sessions (admin + normal)');
console.log('  node reset-session.js admin  # Clear only admin session');
console.log('  node reset-session.js normal # Clear only normal user session');
console.log('  npx playwright test          # Will now perform fresh login as needed');
