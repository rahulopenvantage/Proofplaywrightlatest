import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Export commonly used environment variables
export const USERNAME = process.env.ADMIN_MS_USERNAME;
export const PASSWORD = process.env.ADMIN_MS_PASSWORD;
export const AURA_EMAIL = process.env.AURA_EMAIL;
export const AURA_PASSWORD = process.env.AURA_PASSWORD;
export const DEFAULT_COMPANY = process.env.TEST_COMPANY || 'Automation company';
export const DISPATCH_ID = process.env.DISPATCH_ID;
export const TEST_ES_SITE = process.env.TEST_ES_SITE;

// Validate critical environment variables
if (!USERNAME || !PASSWORD) {
    throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set in .env file');
}