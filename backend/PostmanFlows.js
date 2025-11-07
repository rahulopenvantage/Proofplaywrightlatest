// Lightweight helper to trigger Postman Flows from Playwright tests
// Usage contract
// - Provide Playwright's APIRequestContext (from the `request` fixture)
// - Optionally configure URLs and API keys via ctor options or environment variables
// - Methods return the Playwright APIResponse

import 'dotenv/config';

/**
 * @typedef {Object} PostmanFlowsOptions
 * @property {string} [urlTrex]
 * @property {string} [urlTrexPrivate]
 * @property {string} [urlPublicLpr]
 * @property {string} [urlUnusualBehaviour]
 * @property {Record<string,string>} [defaultHeaders]
 * @property {string} [trexApiKey]
 * @property {string} [trexPrivateApiKey]
 * @property {string} [publicLprApiKey]
 * @property {string} [unusualBehaviourApiKey]
 */

export class PostmanFlows {
    /**
     * @param {import('@playwright/test').APIRequestContext} request
     * @param {PostmanFlowsOptions} [options]
     */
    constructor(request, options = {}) {
        this.request = request;

        // Support both UPPER_SNAKE_CASE and the existing .env camelCase keys
        const envTrex = process.env.URL_TREX || process.env.url_Trex;
        const envTrexPrivate = process.env.URL_TREX_PRIVATE || process.env.url_Trex_Private;
        const envPublicLpr = process.env.URL_PUBLIC_LPR || process.env.url_Public_LPR;
        const envUnusual = process.env.URL_UNUSUAL_BEHAVIOUR || process.env.url_UnusualBehaviour;

        // Configure URLs from environment or options
        this.urls = {
            trex: options.urlTrex || envTrex,
            trexPrivate: options.urlTrexPrivate || envTrexPrivate,
            publicLpr: options.urlPublicLpr || envPublicLpr,
            unusualBehaviour: options.urlUnusualBehaviour || envUnusual,
        };

        this.keys = {
            trex: options.trexApiKey || process.env.TREX_API_KEY,
            trexPrivate: options.trexPrivateApiKey || process.env.TREX_PRIVATE_API_KEY,
            publicLpr: options.publicLprApiKey || process.env.PUBLIC_LPR_API_KEY,
            unusualBehaviour: options.unusualBehaviourApiKey || process.env.UNUSUAL_BEHAVIOUR_API_KEY,
        };

        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...options.defaultHeaders,
        };
    }

    /**
     * Internal POST helper with JSON body and optional api key header.
     * @param {string} url
     * @param {any} body
     * @param {string | undefined} apiKey
     * @param {Record<string,string>} [extraHeaders]
     */
    async #post(url, body, apiKey, extraHeaders = {}) {
        const headers = { ...this.defaultHeaders, ...extraHeaders };
        // If an API key is provided, set a common header name. Adjust if your flow expects a different header.
        if (apiKey) headers['x-api-key'] = apiKey;

        return await this.request.post(url, {
            headers,
            data: body ?? {},
        });
    }

    /**
     * Send payload to the Trex public flow
     * @param {any} payload
     * @param {Record<string,string>} [headers]
     */
    async sendTrex(payload, headers) {
        return this.#post(this.urls.trex, payload, this.keys.trex, headers);
    }

    /**
     * Send payload to the Trex private flow
     * @param {any} payload
     * @param {Record<string,string>} [headers]
     */
    async sendTrexPrivate(payload, headers) {
        return this.#post(this.urls.trexPrivate, payload, this.keys.trexPrivate, headers);
    }

    /**
     * Send payload to the Public LPR flow
     * @param {any} payload
     * @param {Record<string,string>} [headers]
     */
    async sendPublicLpr(payload, headers) {
        return this.#post(this.urls.publicLpr, payload, this.keys.publicLpr, headers);
    }

    /**
     * Send payload to the Unusual Behaviour flow
     * @param {any} payload
     * @param {Record<string,string>} [headers]
     */
    async sendUnusualBehaviour(payload, headers) {
        return this.#post(this.urls.unusualBehaviour, payload, this.keys.unusualBehaviour, headers);
    }
}

export default PostmanFlows;
