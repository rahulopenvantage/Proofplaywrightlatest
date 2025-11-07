#!/usr/bin/env node

/**
 * Environment Configuration Checker
 * 
 * This script validates that all required environment variables are set
 * for the 4 Proof360 API alert types to work correctly.
 */

import 'dotenv/config';

console.log('🔍 Proof360 API Environment Configuration Check');
console.log('='.repeat(60));

const env = process.env.ENVIRONMENT || 'uat';
console.log(`Environment: ${env.toUpperCase()}\n`);

// Critical variables that MUST be set for APIs to work
const criticalVars = [
    'ENVIRONMENT',
    env === 'dev' ? 'DEV_URL' : 'UAT_URL',
    env === 'dev' ? 'DEV_SASKEY' : 'UAT_SASKEY',
    env === 'dev' ? 'DEV_TOPIC' : 'UAT_TOPIC',
    env === 'dev' ? 'DEV_ISENTRY_TOPIC' : 'UAT_ISENTRY_TOPIC',
    env === 'dev' ? 'DEV_ISENTRY_FIREFLY_TOPIC' : 'UAT_ISENTRY_FIREFLY_TOPIC'
];

// TREX public has separate endpoint (from Postman collection)
const trexVars = [
    'TREX_PUBLIC_URL',
    'TREX_PUBLIC_SASKEY'
];

// Optional variables with sensible defaults
const optionalVars = [
    'CAMERA_ID_PRIVATE',
    'DEVICE_ID_PUBLIC', 
    'ORGANIZATION_ID',
    'PLATE_ID2',
    'trex_private'
];

let allGood = true;

console.log('🚨 CRITICAL VARIABLES (API will fail without these):');
console.log('-'.repeat(50));
for (const varName of criticalVars) {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
    } else {
        console.log(`❌ ${varName}: NOT SET`);
        allGood = false;
    }
}

console.log('\n🔗 TREX PUBLIC VARIABLES (uses separate endpoint):');
console.log('-'.repeat(50));
let trexConfigured = true;
for (const varName of trexVars) {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`);
    } else {
        console.log(`⚠️  ${varName}: NOT SET (will use defaults from Postman collection)`);
        trexConfigured = false;
    }
}

console.log('\n📝 OPTIONAL VARIABLES (have defaults):');
console.log('-'.repeat(50));
for (const varName of optionalVars) {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value}`);
    } else {
        console.log(`⚠️  ${varName}: NOT SET (will use default)`);
    }
}

console.log('\n' + '='.repeat(60));

if (allGood && trexConfigured) {
    console.log('🎉 ALL CONFIGURATION COMPLETE!');
    console.log('✅ All 4 alert types should work correctly.');
} else if (allGood) {
    console.log('✅ BASIC CONFIGURATION COMPLETE!');
    console.log('⚠️  TREX Public will use Postman collection defaults.');
    console.log('✅ All 4 alert types should work.');
} else {
    console.log('❌ CONFIGURATION INCOMPLETE!');
    console.log('💡 Create a .env file with the missing variables.');
    console.log('📄 See .env.template for the complete list.');
    console.log('🚫 API tests will be skipped until configuration is complete.');
}

console.log('\n📚 Alert Types Summary:');
console.log('1. Unusual Behaviour → Main Event Grid endpoint');
console.log('2. TREX Private → Main Event Grid endpoint'); 
console.log('3. TREX Public → Separate TREX endpoint');
console.log('4. Public LPR/VOI → Main Event Grid endpoint');

// Show what the actual URLs would be
console.log('\n🌐 Endpoint Summary:');
const mainUrl = process.env[env === 'dev' ? 'DEV_URL' : 'UAT_URL'];
const trexUrl = process.env.TREX_PUBLIC_URL || 'https://staging-vum-eventgriddomain-licenseplatereads-san.southafricanorth-1.eventgrid.azure.net/api/events';

if (mainUrl) {
    console.log(`📡 Main Event Grid: ${mainUrl}`);
} else {
    console.log('📡 Main Event Grid: NOT CONFIGURED');
}

console.log(`📡 TREX Public: ${trexUrl} ${process.env.TREX_PUBLIC_URL ? '(custom)' : '(default)'}`);

console.log('\n' + '='.repeat(60));
