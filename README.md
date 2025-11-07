# Proof Playwright Tests

End-to-end and API tests for Proof 360 using Playwright.

## Prerequisites
- Node.js 18+ and npm
- (Optional) Google Chrome/Chromium/Firefox/WebKit installed by Playwright

## Setup
1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create your environment file from the example and fill in values:

   ```bash
   copy .env.example .env
   # then edit .env
   ```

   Notes:
   - `.env` and all `.env.*` files are ignored by Git.
   - Only `.env.example` is committed.

## Running tests
- Run all tests (default config):

  ```bash
  npx playwright test
  ```

- Use the enhanced config:

  ```bash
  npx playwright test -c playwright.enhanced.config.js
  ```

- Headed mode and a specific file:

  ```bash
  npx playwright test e2e/seed.spec.ts --headed
  ```

- Open the report:

  ```bash
  npx playwright show-report
  ```

## Useful scripts
- Cleanup artifacts:

  ```bash
  node scripts/cleanup-artifacts.js
  ```

- Verify environment setup:

  ```bash
  node scripts/verify-env.js
  ```

- Run reports (custom):

  ```bash
  node scripts/run-reports.js
  ```

## CI (GitHub Actions)
A manual workflow is provided at `.github/workflows/playwright.yml`.

- It does not run automatically; trigger it via "Run workflow" in the Actions tab.
- Add required secrets in GitHub > Settings > Secrets and variables > Actions (e.g., `ADMIN_MS_USERNAME`, `ADMIN_MS_PASSWORD`, etc.).
- The workflow exposes these secrets as environment variables for tests.

## Repo hygiene
- Secrets are not committed; `.env` and variants are ignored via `.gitignore`.
- Use `.env.example` as the template and keep it up to date with required keys.

## Troubleshooting
- If browsers are missing, install them:

  ```bash
  npx playwright install --with-deps
  ```

- On Windows PowerShell, prefer using quotes for paths and escape special characters in env values.
