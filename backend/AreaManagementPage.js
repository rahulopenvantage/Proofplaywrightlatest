// backend/AreaManagementPage.js
// @ts-check
import { expect } from '@playwright/test';

/**
 * AreaManagementPage - Page Object Model for Area Management functionality
 * 
 * This class provides methods for interacting with the Area Management page,
 * including creating, searching, and archiving areas.
 */
export class AreaManagementPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    // Tabs
    this.mapViewTab = page.locator('[data-test-id="tab-Map View"]');
    this.tableTab = page.locator('[data-test-id="tab-Table"]');
    // Buttons
    this.createNewBtn = page.getByRole('button', { name: /create new/i });
    this.saveAndUpdateBtn = page.locator('[data-test-id="Save and Update"]');
    // Inputs
    this.areaNameInput = page.getByRole('textbox', { name: 'Area name' });
    this.areaDescriptionInput = page.getByRole('textbox', { name: 'Area description' });
    this.searchInput = page.locator('[data-test-id="search-input"]');
  }

  // ===========================================
  // 1. AREA CREATION
  // ===========================================

  /**
   * Clicks Create New button and selects By List option
   */
  async clickCreateNewByList() {
    console.log('[AreaManagement] Clicking Create New and selecting By List...');
    await this.createNewBtn.click();
    await this.page.click('li[role="menuitem"]:has-text("By List")');
    console.log('[AreaManagement] Selected By List option');
  }

  /**
   * Selects an area checkbox by its name
   * @param {string} name - The name of the area to select
   */
  async selectAreaCheckboxByName(name) {
    console.log(`[AreaManagement] Selecting area checkbox: ${name}`);
    await this.page.getByRole('checkbox', { name }).click();
  }

  /**
   * Clicks the Add to custom area list button
   */
  async addToCustomAreaList() {
    console.log('[AreaManagement] Adding selected areas to custom list...');
    await this.page.getByRole('button', { name: 'Add to custom area list' }).click();
  }

  /**
   * Fills in the area name field
   * @param {string} name - The name to enter
   */
  async fillAreaName(name) {
    console.log(`[AreaManagement] Filling area name: ${name}`);
    await this.areaNameInput.fill(name);
  }

  /**
   * Fills in the area description field
   * @param {string} desc - The description to enter
   */
  async fillAreaDescription(desc) {
    console.log(`[AreaManagement] Filling area description: ${desc}`);
    await this.areaDescriptionInput.fill(desc);
  }

  /**
   * Clicks the Save and Update button
   */
  async saveArea() {
    console.log('[AreaManagement] Saving area...');
    await this.saveAndUpdateBtn.click();
  }

  // ===========================================
  // 2. AREA SEARCH & MANAGEMENT
  // ===========================================

  /**
   * Searches for an area by name
   * @param {string} name - The name of the area to search for
   */
  async searchArea(name) {
    console.log(`[AreaManagement] Searching for area: ${name}`);
    await this.searchInput.fill(name);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Archives an area by its name
   * @param {string} name - The name of the area to archive
   */
  async archiveAreaByName(name) {
    console.log(`[AreaManagement] Archiving area: ${name}`);
    await this.page.click(`tr:has-text('${name}') [data-test-id='archive-button']`);
    const modalArchiveButton = this.page.locator('section[data-test-id="dialog"] button[data-test-id="dialog-button-2"]');
    await modalArchiveButton.waitFor({ state: 'visible', timeout: 10000 });
    await modalArchiveButton.click();
    console.log(`[AreaManagement] Area archived: ${name}`);
  }

  // ===========================================
  // 3. ASSERTIONS
  // ===========================================

  /**
   * Verifies that an area is visible in the table
   * @param {string} name - The name of the area to verify
   * @param {string} [desc] - Optional description to verify
   */
  async expectAreaVisible(name, desc) {
    console.log(`[AreaManagement] Verifying area visibility: ${name}`);
    await expect(this.page.getByText(name)).toBeVisible();
    if (desc) {
      await expect(this.page.getByText(desc)).toBeVisible();
    }
  }

  /**
   * Verifies that an area is not visible in the table
   * @param {string} name - The name of the area to verify
   */
  async expectAreaNotVisible(name) {
    console.log(`[AreaManagement] Verifying area is not visible: ${name}`);
    await expect(this.page.getByText(name)).not.toBeVisible({ timeout: 10000 });
  }
} 