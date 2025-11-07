// e2e/Company_Management.spec.js
// @ts-check
import { test, expect } from '@playwright/test';
import { SharedTestSteps } from '../../backend/SharedTestSteps.js';
import { MenuPage } from '../../backend/MenuPage.js';
import { CompanyManagementPage } from '../../backend/CompanyManagementPage.js';

// Import global failure handler for automatic failure screenshots
import '../../backend/GlobalFailureHandler.js';

/**
 * Environment variables for authentication
 */
const USERNAME = process.env.ADMIN_MS_USERNAME;
const PASSWORD = process.env.ADMIN_MS_PASSWORD;

// Default company for tests
const COMPANY_NAME = 'Automation company';

/**
 * Company Management Test Suite
 *
 * This suite tests the Company Management functionality including:
 * - Creating a new company
 * - Editing company details
 * - Searching for companies
 * - Archiving companies
 */
test.describe('Company Management', () => {
  /** @type {SharedTestSteps} */
  let sharedTestSteps;
  /** @type {MenuPage} */
  let menuPage;
  /** @type {CompanyManagementPage} */
  let companyManagementPage;

  test.beforeEach(async ({ page }) => {
    console.log('[Setup] Starting Company Management test setup...');
    test.setTimeout(300000); // 5 minutes for complete workflow
    sharedTestSteps = new SharedTestSteps(page);
    menuPage = new MenuPage(page);
    companyManagementPage = new CompanyManagementPage(page);

    if (!USERNAME || !PASSWORD) {
      throw new Error('ADMIN_MS_USERNAME and ADMIN_MS_PASSWORD environment variables must be set.');
    }

    // Authenticate and navigate to Company Management
    await sharedTestSteps.authenticateAndSetup(USERNAME, PASSWORD);
    await expect(page).toHaveURL(/.*command/, { timeout: 45000 });
    await sharedTestSteps.selectCompany(COMPANY_NAME);
    await sharedTestSteps.navigateToConfigurationSubmenu('Company Management');
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/company-management$/);
    console.log('[Setup] Company Management test setup completed');
  });

  /**
   * Test: Create, edit, validate, and archive a company
   *
   * Steps:
   * 1. Create a new company with configuration
   * 2. Search for the new company
   * 3. Edit the Contact Person field
   * 4. Validate the change
   * 5. Archive the company (cleanup)
   */
  test('should create, edit, validate, and archive a company', async ({ page }) => {
    // Cleanup: Archive 'You_Source' if it already exists
    await companyManagementPage.searchCompany('You_Source');
    const youSourceExists = (await companyManagementPage.getThirdColumnCells()).some(/** @param {string} text */ (text) => /you_source/i.test(text));
    if (youSourceExists) {
      await companyManagementPage.archiveCompany('You_Source');
      // Wait for the archive to complete and table to refresh
      await page.waitForTimeout(2000);
    }

    // 1. Create a new company with configuration
    await companyManagementPage.clickCreateNew();
    await companyManagementPage.fillCompanyForm({
      companyName: 'You_Source',
      registrationNumber: '01',
      email: 'testmail@gmail.com',
      contactPerson: 'tester',
    });
    await companyManagementPage.switchToConfigTab();
    await companyManagementPage.fillConfigFields({
      milestoneUsername: 'milestonetestdata',
      telegramNumber: '27126641821',
    });
    await companyManagementPage.saveAndCreate();
    await page.waitForTimeout(5000);
    await expect(companyManagementPage.createNewBtn).toBeVisible({ timeout: 15000 });

    // 2. Search for the new company
    await companyManagementPage.searchCompany('You_Source');

    // 3. Edit the Contact Person field
    await companyManagementPage.editContactPerson('You_Source', 'testers');

    // 4. Validate the change
    await companyManagementPage.searchCompany('You_Source');
    await companyManagementPage.expectContactPerson('You_Source', 'testers');

    // 5. Archive the company (cleanup)
    await companyManagementPage.archiveCompany('You_Source');
  });

  /**
   * Test: Perform additional table functionality
   *
   * Steps:
   * 1. Test row dropdown functionality
   * 2. Test column editing
   * 3. Test search functionality
   */
  test('should perform additional table functionality', async ({ page }) => {
    console.log('[Test] Starting Company Management table functionality test...');
    // 1. Test row dropdown functionality
    await companyManagementPage.rowDropdownVisible();
    await companyManagementPage.rowDropdown().click();
    await companyManagementPage.selectRowDropdownValue('20');

    // 2. Test column editing
    await companyManagementPage.clickEditBtnByCompanyName('Automation company');
    await expect(companyManagementPage.getContactPersonInput()).toHaveValue(/automation test/i);
    await companyManagementPage.clickSaveAndUpdate();

    // 3. Test search functionality
    await companyManagementPage.clickSearchToggle();
    await page.waitForTimeout(500);
    await companyManagementPage.fillSearchInput('Vumacam');
    await page.waitForTimeout(500);

    // Verify 'Vumacam' is present in any third column cell (case-insensitive)
    const cells = await companyManagementPage.getThirdColumnCells();
    expect(cells.some(/** @param {string} text */ (text) => /vumacam/i.test(text))).toBeTruthy();

    // Test column toggle
    await companyManagementPage.clickColumnSettingsBtn();
    await companyManagementPage.toggleCompanyNameColumnCheckbox();
    await companyManagementPage.clickColumnSettingsBtn();

    // Verify that the company name column is no longer visible (case-insensitive)
    await expect(page.locator('table thead')).not.toContainText(/company name/i);

    // Verify that the 'Contact Person' column header is visible (case-insensitive)
    const headerCells_visible = await companyManagementPage.getTableHeaderCells();
    expect(headerCells_visible.some(/** @param {string} text */ (text) => /contact person/i.test(text))).toBeTruthy();

    // Verify that the 'Company Name' column header is not visible (case-insensitive)
    const headerCells_notvisible = await companyManagementPage.getTableHeaderCells();
    expect(headerCells_notvisible.some(/** @param {string} text */ (text) => /company name/i.test(text))).toBeFalsy();
  });
}); 