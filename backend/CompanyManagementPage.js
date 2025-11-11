// backend/CompanyManagementPage.js
// @ts-check
import { expect } from '@playwright/test';

/**
 * CompanyManagementPage - Page Object Model for Company Management functionality
 *
 * This class provides methods for interacting with the Company Management page,
 * including creating, searching, editing, and archiving companies.
 */
export class CompanyManagementPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Buttons
    this.createNewBtn = page.getByRole('button', { name: /create new/i });
    this.saveAndCreateBtn = page.locator('[data-test-id="company-management-CREATE-company"]');
    this.saveAndUpdateBtn = page.locator('[data-test-id="company-management-UPDATE-company"]');
    this.searchToggleBtn = page.locator('[data-test-id="search-toggle"]');
    this.searchInput = page.locator('[data-test-id="search-input"]');
    /** @param {string} companyName */
    this.editBtn = (companyName) => page.locator(`tbody tr:has(td:nth-of-type(3):text-is("${companyName}")) [data-test-id="company-edit-btn"]`);
    /** @param {string} companyName */
    this.archiveBtn = (companyName) => page.locator(`tbody tr:has(td:nth-of-type(3):text-is("${companyName}")) [data-test-id="company-archive-btn"]`);
    this.confirmCheckboxDiv = page.locator('div[role="dialog"] .checkbox-container');
    this.archiveYesBtn = page.locator('div[role="dialog"] button:has-text("Yes")');
    // Form fields
    this.companyNameDropdown = page.locator('[data-test-id="company-management-company-name"]');
    this.registrationNumberInput = page.locator('[data-test-id="company-management-registration-number"]');
    this.emailInput = page.locator('[data-test-id="company-management-email"]');
    this.contactPersonInput = page.locator('[data-test-id="company-management-contact-person"]');
    this.configTab = page.locator('[data-test-id="company-management-company-configuration"]');
    this.milestoneUsernameInput = page.locator('[data-test-id="company-management-milestone-username"]');
    this.telegramNumberInput = page.locator('[data-test-id="linkedTelegramNumber"]');
  }

  /**
   * Clicks the Create New button
   */
  async clickCreateNew() {
    console.log('[CompanyManagement] Clicking Create New...');
    await this.page.getByRole('button', { name: /create new/i }).click();
  }

  /**
   * Fills out the company creation form - Fixed dropdown handling
   * @param {Object} formData
   * @param {string} formData.companyName
   * @param {string} formData.registrationNumber
   * @param {string} formData.email
   * @param {string} formData.contactPerson
   */
  async fillCompanyForm({ companyName, registrationNumber, email, contactPerson }) {
    console.log(`[CompanyManagement] Filling company form: ${companyName}`);
    
    // Click company name dropdown to open it
    await this.page.locator('[data-test-id="company-management-company-name"]').click();
    
    // Wait for dropdown options to appear and select the company
    await this.page.waitForTimeout(1000);
    const companyOption = this.page.getByText(companyName, { exact: true });
    await companyOption.click();
    
    // Fill form fields
    await this.page.locator('[data-test-id="company-management-registration-number"]').fill(registrationNumber);
    
    await this.page.locator('[data-test-id="company-management-email"]').fill(email);
    
    await this.page.locator('[data-test-id="company-management-contact-person"]').fill(contactPerson);
  }

  /**
   * Switches to the Company Configuration tab
   */
  async switchToConfigTab() {
    console.log('[CompanyManagement] Switching to Company Configuration tab...');
    await this.page.locator('[data-test-id="company-management-company-configuration"]').click();
    await expect(this.page.getByText('Company configuration')).toBeVisible();
  }

  /**
   * Fills out the configuration fields
   * @param {Object} configData
   * @param {string} configData.milestoneUsername
   * @param {string} configData.telegramNumber
   */
  async fillConfigFields({ milestoneUsername, telegramNumber }) {
    console.log('[CompanyManagement] Filling configuration fields...');
    
    await this.page.locator('[data-test-id="company-management-milestone-username"]').fill(milestoneUsername);
    
    await this.page.locator('[data-test-id="linkedTelegramNumber"]').fill(telegramNumber);
  }

  /**
   * Clicks Save and Create
   */
  async saveAndCreate() {
    console.log('[CompanyManagement] Saving and creating company...');
    await this.page.locator('[data-test-id="company-management-CREATE-company"]').click();
  }

  /**
   * Searches for a company by name
   * @param {string} name
   */
  async searchCompany(name) {
    console.log(`[CompanyManagement] Searching for company: ${name}`);
    
    await this.page.locator('[data-test-id="search-toggle"]').click();
    
    await this.page.locator('[data-test-id="search-input"]').fill(name);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Edits the contact person for a company
   * @param {string} companyName
   * @param {string} newContactPerson
   */
  async editContactPerson(companyName, newContactPerson) {
    console.log(`[CompanyManagement] Editing contact person for: ${companyName}`);
    const editBtn = this.editBtn(companyName);
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    await this.contactPersonInput.fill(newContactPerson);
    await this.saveAndUpdateBtn.click();
  }

  /**
   * Validates the contact person in the table
   * @param {string} companyName
   * @param {string} expectedContactPerson
   */
  async expectContactPerson(companyName, expectedContactPerson) {
    const contactPersonCell = this.page.locator(`tbody tr:has(td:nth-of-type(3):text-is("${companyName}")) td:nth-of-type(1)`);
    await expect(contactPersonCell).toHaveText(new RegExp(expectedContactPerson, 'i'));
  }

  /**
   * Archives a company by name
   * @param {string} companyName
   */
  async archiveCompany(companyName) {
    console.log(`[CompanyManagement] Archiving company: ${companyName}`);
    const archiveBtn = this.archiveBtn(companyName);
    await expect(archiveBtn).toBeVisible();
    await archiveBtn.click();
    await expect(this.confirmCheckboxDiv).toBeVisible();
    await this.confirmCheckboxDiv.click();
    await expect(this.archiveYesBtn).toBeEnabled();
    await this.archiveYesBtn.click();
  }

  /**
   * Returns the locator for the row dropdown
   */
  rowDropdown() {
    return this.page.locator('[data-test-id="rowDropdown"]');
  }

  /**
   * Waits for the row dropdown to be visible
   */
  async rowDropdownVisible() {
    await expect(this.rowDropdown()).toBeVisible();
  }

  /**
   * Selects a value in the row dropdown
   * @param {string} value
   */
  async selectRowDropdownValue(value) {
    await this.rowDropdown().selectOption(value);
  }

  /**
   * Clicks the edit button for a company by name (row with companyName in column 3)
   * @param {string} companyName
   */
  async clickEditBtnByCompanyName(companyName) {
    await this.page.locator(`tr:has-text("${companyName}") [data-test-id="company-edit-btn"]`).click();
  }

  /**
   * Returns the locator for the contact person input
   */
  getContactPersonInput() {
    return this.page.locator('[data-test-id="company-management-contact-person"]');
  }

  /**
   * Clicks the Save and Update button
   */
  async clickSaveAndUpdate() {
    await this.saveAndUpdateBtn.click();
  }

  /**
   * Clicks the search toggle button
   */
  async clickSearchToggle() {
    await this.searchToggleBtn.click();
  }

  /**
   * Fills the search input and presses Enter
   * @param {string} value
   */
  async fillSearchInput(value) {
    await this.searchInput.fill(value);
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Returns all text contents of third column cells in the table body
   * @returns {Promise<string[]>}
   */
  async getThirdColumnCells() {
    return await this.page.locator('tbody td:nth-of-type(3)').allTextContents();
  }

  /**
   * Clicks the column settings/edit button
   */
  async clickColumnSettingsBtn() {
    await this.page.click('[data-test-id="column-btn"]');
  }

  /**
   * Toggles the checkbox for "COMPANY NAME" in the column toggle modal
   */
  async toggleCompanyNameColumnCheckbox() {
    await this.page.getByText('COMPANY NAME').locator('..').locator('input[type="checkbox"]').click();
  }

  /**
   * Returns all text contents of table header cells
   * @returns {Promise<string[]>}
   */
  async getTableHeaderCells() {
    return await this.page.locator('table thead th').allTextContents();
  }
} 