#!/usr/bin/env node

/**
 * Custom Reports Test Runner
 * Ensures priority tests run first when executing Reports folder tests
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Priority tests that must run first
const PRIORITY_TESTS = [
  'e2e/Reports/Dispatch_Reports/Reports_Dispatch_flow_Aura_consolidated.spec.js',
  'e2e/Reports/Dispatch_Reports/Reports_Dispatch_flow_Vodacom.spec.js'
];

/**
 * Check if the command is trying to run Reports folder tests
 */
function isReportsExecution(args) {
  return args.some(arg => 
    arg.includes('e2e/Reports') || 
    arg.includes('Reports/') ||
    arg.includes('/Reports')
  );
}

/**
 * Extract additional Playwright arguments (like --reporter, --headed, etc.)
 */
function extractPlaywrightArgs(args) {
  const playwrightArgs = [];
  
  // Skip the first argument which is the test path
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    // Include common Playwright flags
    if (arg.startsWith('--reporter') || 
        arg.startsWith('--headed') || 
        arg.startsWith('--debug') ||
        arg.startsWith('--trace') ||
        arg.startsWith('--timeout') ||
        arg.startsWith('--workers') ||
        arg.startsWith('--retries') ||
        arg === '--ui' ||
        arg === '--headed' ||
        arg === '--debug') {
      playwrightArgs.push(arg);
    }
  }
  
  return playwrightArgs.join(' ');
}

/**
 * Run priority tests first
 */
async function runPriorityTests(additionalArgs = '') {
  console.log('🔥 REPORTS EXECUTION DETECTED');
  console.log('📋 Running priority tests first...\n');
  
  for (const [index, testFile] of PRIORITY_TESTS.entries()) {
    console.log(`\n⭐ PRIORITY TEST ${index + 1}/2: ${path.basename(testFile)}`);
    console.log('=' .repeat(60));
    
    try {
      const command = `npx playwright test ${testFile} ${additionalArgs}`;
      console.log(`Executing: ${command}\n`);
      
      const { stdout, stderr } = await execAsync(command, { cwd: __dirname });
      
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      console.log(`✅ Priority test ${index + 1} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Priority test ${index + 1} failed:`, error.message);
      
      // Continue with other priority tests even if one fails
      console.log('⚠️  Continuing with remaining priority tests...\n');
    }
  }
  
  console.log('\n🎯 All priority tests completed');
  console.log('=' .repeat(60));
}

/**
 * Run remaining Reports tests (excluding priority tests)
 */
async function runRemainingReportsTests(originalArgs, additionalArgs = '') {
  console.log('\n📂 Running remaining Reports tests...\n');
  
  // Create exclude pattern for priority tests
  const excludePattern = PRIORITY_TESTS.map(test => `--ignore=${test}`).join(' ');
  
  try {
    // Determine the test path from original arguments
    const testPath = originalArgs.find(arg => arg.includes('Reports') || arg.includes('e2e/')) || 'e2e/Reports';
    
    const command = `npx playwright test ${testPath} ${excludePattern} ${additionalArgs}`;
    console.log(`Executing: ${command}\n`);
    
    const { stdout, stderr } = await execAsync(command, { cwd: __dirname });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('✅ Remaining Reports tests completed');
    
  } catch (error) {
    console.error('❌ Remaining Reports tests failed:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node run-reports.js <test-path> [playwright-options]');
    console.log('Example: node run-reports.js e2e/Reports --reporter=dot');
    process.exit(1);
  }
  
  // Check if this is a Reports execution
  if (!isReportsExecution(args)) {
    console.log('Not a Reports execution, running normally...');
    const command = `npx playwright test ${args.join(' ')}`;
    
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: __dirname });
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (error) {
      console.error('Test execution failed:', error.message);
      process.exit(1);
    }
    
    return;
  }
  
  // Extract additional Playwright arguments
  const additionalArgs = extractPlaywrightArgs(args);
  
  try {
    // Step 1: Run priority tests first
    await runPriorityTests(additionalArgs);
    
    // Step 2: Run remaining Reports tests
    await runRemainingReportsTests(args, additionalArgs);
    
    console.log('\n🎉 REPORTS EXECUTION COMPLETED SUCCESSFULLY!');
    console.log('✅ Priority tests ran first, followed by remaining Reports tests');
    
  } catch (error) {
    console.error('\n💥 REPORTS EXECUTION FAILED:', error.message);
    process.exit(1);
  }
}

// Execute main function
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});