import { test as base } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extended test fixture for normal user tests
 * This configures the test to use normal user storage state
 */
export const normalUserTest = base.extend({
  // Override the storage state for normal user tests
  storageState: async ({}, use) => {
    const normalUserStorageState = path.resolve(__dirname, '..', 'userStorageState_normal.json');
    await use(normalUserStorageState);
  },
});

// Export expect for convenience
export { expect } from '@playwright/test';
