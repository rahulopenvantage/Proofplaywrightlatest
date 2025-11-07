// e2e/CommandHelpers.js
// @ts-check
import { expect } from '@playwright/test';
import { MenuPage } from './MenuPage.js';
import { SitesPage } from './SitesPage.js';
import { AlertsDashboardPage } from './AlertsDashboardPage.js';
import { SopPage } from './SopPage.js';
import { WorkflowHelper } from './WorkflowHelper.js';

/**
 * Helper class that provides Playwright equivalents of Cypress custom commands.
 * This acts as a bridge between the old Cypress commands and new Playwright POMs.
 */
export class CommandHelpers {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.menuPage = new MenuPage(page);
        this.sitesPage = new SitesPage(page);
        this.alertsDashboardPage = new AlertsDashboardPage(page);
        this.sopPage = new SopPage(page);
        this.workflowHelper = new WorkflowHelper(page);
    }

    /**
     * Equivalent of cy.navigateToCommandPage()
     */
    async navigateToCommandPage() {
        await this.menuPage.openCommand();
    }

    /**
     * Equivalent of cy.navigateToHistoryPage()
     */
    async navigateToHistoryPage() {
        await this.menuPage.openHistory();
    }

    /**
     * Equivalent of cy.navigateToViewPage()
     */
    async navigateToViewPage() {
        await this.menuPage.openView();
    }

    /**
     * Equivalent of cy.navigateToSitesPage()
     */
    async navigateToSitesPage() {
        await this.menuPage.openSites();
    }

    /**
     * Equivalent of cy.navigateToMetricsPage()
     */
    async navigateToMetricsPage() {
        await this.menuPage.openMetrics();
    }

    /**
     * Equivalent of cy.navigateToReportsPage()
     */
    async navigateToReportsPage() {
        await this.menuPage.openReports();
    }

    /**
     * Equivalent of cy.navigateToConfigurationsPage()
     */
    async navigateToConfigurationsPage() {
        await this.menuPage.openConfigurations();
    }

    /**
     * Equivalent of cy.navigateToConfigurationSubmenu(submenuName)
     * @param {string} submenuName - The submenu name to navigate to
     */
    async navigateToConfigurationSubmenu(submenuName) {
        await this.menuPage.navigateToConfigurationSubmenu(submenuName);
    }

    /**
     * Equivalent of cy.createManualAlertForAutomationCompany()
     */
    async createManualAlertForAutomationCompany() {
        await this.sitesPage.createManualAlertForAutomationCompany();
    }

    /**
     * Equivalent of cy.sopCompleteAndValidate()
     */
    async sopCompleteAndValidate() {
        await this.sopPage.completeAndValidateSop();
    }

    /**
     * Equivalent of cy.expandAndSelectManualCard()
     */
    async expandAndSelectManualCard() {
        await this.alertsDashboardPage.expandAndSelectFirstManualAlertCard();
    }

    /**
     * Equivalent of cy.genericManualalertstackfilter()
     */
    async genericManualalertstackfilter() {
        await this.alertsDashboardPage.filterByManualAlert();
    }

    /**
     * Equivalent of cy.manualAlertCleanUp()
     */
    async manualAlertCleanUp() {
        await this.workflowHelper.manualAlertCleanUp();
    }

    /**
     * Equivalent of cy.getByText(tag, text) - XPath approach
     * @param {string} tag - The HTML tag name
     * @param {string} text - The text content to find
     * @returns {import('@playwright/test').Locator}
     */
    getByText(tag, text) {
        return this.page.locator(`//${tag}[normalize-space(.)='${text}']`);
    }
}
