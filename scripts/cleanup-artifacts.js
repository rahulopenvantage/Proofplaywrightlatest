import { testArtifactsCleanup } from '../backend/TestArtifactsCleanup.js';

(async () => {
  try {
    testArtifactsCleanup.displaySummary();
    await testArtifactsCleanup.cleanup();
    process.exit(0);
  } catch (err) {
    console.error('[Cleanup] Script failed:', err?.message || err);
    process.exit(1);
  }
})();