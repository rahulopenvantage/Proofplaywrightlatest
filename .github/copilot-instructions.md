# Proof360 Playwright Test Framework - AI Agent Guide

## Project Overview
This is an end-to-end test framework for **Proof360**, a real-time security alert monitoring platform. Tests validate incident/situation stack management, alert filtering, suppression, dispatch reports, and SOP workflows across multiple user roles and companies.

## Critical Architecture Patterns

### 1. Persistent Authentication System
- **Session-based reuse**: `SessionManager` (`backend/SessionManager.js`) maintains 30-minute authentication sessions to avoid re-login overhead
- **Multi-user support**: Separate storage states for admin (`userStorageState_admin.json`) and normal users (`userStorageState_normal.json`)
- **Global setup**: `backend/global.setup.js` runs once before all tests to establish authenticated sessions
- **When to use**: Always call `sharedTestSteps.login()` in test setup - it automatically checks for valid sessions and only re-authenticates if needed

```javascript
// Login pattern - checks session validity first
await sharedTestSteps.login(USERNAME, PASSWORD);
// Session is automatically extended if valid, re-authenticated if expired
```

### 2. Page Object Hierarchy
```
SharedTestSteps (facade)
    ├── AdminLoginPage (auth flows)
    ├── MenuPage (navigation)
    ├── AlertsDashboardPage (stack operations, filters)
    ├── SitesPage (alert creation)
    ├── SopPage (SOP workflows)
    ├── SessionManager (auth persistence)
    ├── TestReliabilityHelper (retry logic)
    └── WorkflowHelper (cleanup operations)
```

**Key principle**: Use `SharedTestSteps` as the primary interface - it delegates to specialized page objects while providing standardized logging and error handling.

### 3. Test Isolation Strategy
- **Company selection**: Tests must select specific companies (`Automation company`, `Vodacom`) to isolate test data
- **Stack filter management**: Always reset filters in `afterEach` hooks using `sharedTestSteps.resetStackFilter()`
- **Modal cleanup**: React Aria modals can persist across tests - use explicit cleanup:
  ```javascript
  await page.evaluate(() => {
      document.querySelectorAll('.react-aria-ModalOverlay').forEach(o => o.remove());
  });
  ```
- **Cleanup order**:  Filter reset → Manual alerts → UB/Trex alerts

### 4. Real-Time Alert Publishing
- **Direct Event Grid publishing**: `EventPublisher` (`backend/EventPublisher.js`) sends events directly to Azure Event Grid - **no Postman flows**
- **Alert types**: `unusualBehaviour()`, `trexPublic()`, `trexPrivate()`, `publicLpr()`
- **When to use**: Publish alerts in `beforeEach` hooks for tests that require fresh alert data:
  ```javascript
  const publisher = new EventPublisher();
  await publisher.unusualBehaviour(); // Creates UB alert via API
  ```
- **Graceful degradation**: Returns `{ skipped: true }` if API env vars not configured

### 5. Visual Testing with Retries
- **VisualTestHelper** (`backend/VisualTestHelper.js`): Handles screenshot comparison with stability checks
- **Element stabilization**: Forces consistent sizing/rendering before capture:
  ```javascript
  await visualTestHelper.takeScreenshotWithRetry(
      filterButton, 
      'filter_button_with_suppression.png',
      'Filter verification',
      3 // max retries
  );
  ```
- **Tolerance settings**: Default 30% threshold + 200px diff allowance (in `playwright.config.js`)

## Common Development Workflows

### Running Tests
```powershell
# Standard config (default - single worker, no retries)
npx playwright test

# Enhanced config (parallel projects, retries, extended timeouts)
npx playwright test -c playwright.enhanced.config.js

# Specific test file
npx playwright test e2e/Command/Floor-plan-status-indicator-functionality_and_site_tab.spec.js

# Debug mode
npx playwright test --debug

# Show report
npx playwright show-report
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in required credentials:
   - `ADMIN_MS_USERNAME` / `ADMIN_MS_PASSWORD` (Microsoft SSO admin)
   - `NORMAL_MS_USERNAME` / `NORMAL_MS_PASSWORD` (standard user)
   - Event Grid API keys (UAT_URL, UAT_SASKEY) for alert publishing
   - Elasticsearch credentials (for dispatch report verification)

### Creating New Tests
1. **Always** import and instantiate `SharedTestSteps` in `beforeEach`:
   ```javascript
   import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
   let sharedTestSteps;
   test.beforeEach(async ({ page }) => {
       sharedTestSteps = new SharedTestSteps(page);
       await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
       await sharedTestSteps.selectCompany('Automation company');
   });
   ```

2. **Cleanup pattern** (in `afterEach`):
   ```javascript
   test.afterEach(async ({ page }) => {
       await sharedTestSteps.cleanupManualAlerts();
       await sharedTestSteps.cleanupUBAndTrexAlerts('SITE_NAME');
       await sharedTestSteps.resetStackFilter();
       await sharedTestSteps.unsuppress(); // if suppression was used
   });
   ```

3. **Stack operations**:
   ```javascript
   // Switch stacks
   await sharedTestSteps.switchToIncidentStack();
   await sharedTestSteps.switchToSituationStack();
   
   // Apply filters
   await sharedTestSteps.stackFilterUBAndTrex('SITE_NAME');
   await sharedTestSteps.genericManualAlertStackFilter();
   
   // Expand cards
   await sharedTestSteps.expandAndSelectUBAndTrexCard('SITE_NAME');
   ```

## Project-Specific Conventions

### Logging Pattern
All methods in `SharedTestSteps` use consistent logging:
```javascript
console.log('[SharedSteps] Starting operation...');
console.log('[ComponentName] Step 1: Action description');
console.log('[ComponentName] ✅ Success message'); // success
console.log('[ComponentName] ⚠️ Warning message');  // warning
console.log('[ComponentName] ❌ Error message');    // error
```

### Data-Test-ID Selectors
Prefer `data-test-id` attributes for stability:
```javascript
page.locator('[data-test-id="alert-stack-popover-trigger-button"]')
page.locator('[data-test-id="stationDropDown"]')
```

### Modal Interaction Pattern
1. Wait for modal elements to be visible
2. Scope selectors to the dialog to avoid strict mode violations:
   ```javascript
   const modalRoot = page.locator('[role="dialog"]').filter({ has: page.getByText('Expected Text') });
   const confirmButton = modalRoot.getByRole('button', { name: /Confirm/ });
   ```
3. Verify modal closure before continuing

### Suppression Workflow (Complex Example)
```javascript
// 1. Open suppression menu
await page.locator('[data-test-id="verticalDots"]').first().click();
await page.locator('text=Suppress Item').click();

// 2. Select reason and duration (scoped to modal)
const reasonLabel = page.getByText('Reason for suppression', { exact: true });
const reasonSelect = reasonLabel.locator('xpath=following::select[1]');
await reasonSelect.selectOption({ label: 'Bad Alerts' });

// 3. Confirm (handles double-confirmation dialog)
const modalRoot = page.locator('[role="dialog"]').filter({ has: reasonLabel });
await modalRoot.getByRole('button', { name: /Confirm/ }).click();

// 4. Handle second confirmation if present
const secondConfirm = page.locator('text=Are you sure you want to suppress this item?');
if (await secondConfirm.isVisible({ timeout: 5000 })) {
    await page.locator('[role="dialog"]').last().getByRole('button', { name: /Confirm/ }).click();
}
```

## Key File References

### Core Infrastructure
- **`backend/SharedTestSteps.js`** (3184 lines): Primary test API - use this for 95% of operations
- **`backend/global.setup.js`**: Session initialization - runs before all tests
- **`backend/SessionManager.js`**: Authentication persistence logic
- **`backend/EventPublisher.js`**: Direct Event Grid alert publishing (no Postman)
- **`playwright.config.js`**: Default config (1 worker, no retries, admin storage state)
- **`playwright.enhanced.config.js`**: Production config (projects, retries, extended timeouts)

### Example Tests
- **`e2e/Incident_and_Situation_Stacks/Incident_and_Situation_Stack_filter_Visual_Queues.spec.js`**: Complete example showing suppression + visual testing + cleanup
- **`e2e/Command/Floor-plan-status-indicator-functionality_and_site_tab.spec.js`**: Navigation and company selection patterns
- **`e2e/Stack_Filter/Default_Stack_Filter_Change_stack_filter_not_bleeding_across_stations.spec.js`**: Filter isolation validation

## Common Pitfalls

1. **Modal overlay persistence**: After suppression/filter operations, modals may not auto-close. Always verify closure with `waitFor({ state: 'hidden' })` or force-remove overlays.

2. **Network idle timeouts**: Real-time apps have continuous background requests. Replace `waitForLoadState('networkidle')` with explicit element waits:
   ```javascript
   await page.waitForFunction(() => document.querySelector('[data-test-id="expected-element"]'));
   ```

3. **Filter bleeding across tests**: Stack filters persist between tests. **Always** call `resetStackFilter()` in cleanup hooks.

4. **User type switching**: When switching from admin to normal user (or vice versa), `SharedTestSteps.login()` automatically handles logout - don't call `logout()` manually unless explicitly needed.

5. **Screenshot flakiness**: Use `VisualTestHelper` with retries instead of raw `toHaveScreenshot()` to handle timing/rendering variations.

## Debug Artifacts
- Screenshots on failure: `test-failures/` (auto-captured via `GlobalFailureHandler.js`)
- Trace files: `test-results/` (enabled with `--trace on`)
- HTML reports: `playwright-report/index.html`

## Questions for Clarification
1. Should new tests use the enhanced config by default, or is the standard config preferred for certain test categories?
2. Are there preferred site names or companies for specific test types (e.g., Vodacom vs Automation company)?
3. Should EventPublisher API failures be treated as test failures, or gracefully skipped?
