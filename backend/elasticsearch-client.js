import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

function ensureEnvLoaded() {
  if (process.env.ELASTICSEARCH_URL) return; // already loaded
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(path.dirname(new URL(import.meta.url).pathname), '../.env'),
    path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../.env'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const res = dotenv.config({ path: p });
        if (res.parsed && res.parsed.ELASTICSEARCH_URL) return;
      }
    } catch {}
  }
}

ensureEnvLoaded();

class ElasticsearchClient {
  constructor() {
    this.baseURL = process.env.ELASTICSEARCH_URL;
    this.index = process.env.ELASTICSEARCH_INDEX || 'proof360-dispatch*';

    if (!this.baseURL) {
      throw new Error('ELASTICSEARCH_URL environment variable is required');
    }

    this.headers = {
      'Content-Type': 'application/json',
    };

    if (process.env.ELASTICSEARCH_API_KEY) {
      this.headers['Authorization'] = `ApiKey ${process.env.ELASTICSEARCH_API_KEY}`;
    } else if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
      const auth = Buffer.from(
        `${process.env.ELASTICSEARCH_USERNAME}:${process.env.ELASTICSEARCH_PASSWORD}`
      ).toString('base64');
      this.headers['Authorization'] = `Basic ${auth}`;
    } else {
      throw new Error('Either ELASTICSEARCH_API_KEY or ELASTICSEARCH_USERNAME/PASSWORD must be provided');
    }
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/_cluster/health`, {
        headers: this.headers
      });
      console.log('✅ Elasticsearch connection successful:', response.data.status);
      return true;
    } catch (error) {
      console.error('❌ Elasticsearch connection failed:', error.response?.data || error.message);
      return false;
    }
  }

  async searchDispatchRecords(filters = {}) {
    const {
      companyName = 'Automation company',
      siteName = 'WVRD_9th Ave and JG Strydom Rd_62',
      timeRange = 'now-24h',
      size = 10
    } = filters;

    // Build bool query with robust company and time handling
    const bool = {
      must: [
        { match_phrase: { 'companyName': companyName } }
      ],
      filter: [
        { range: { 'actionTimestamp': { gte: timeRange, lte: 'now' } } }
      ]
    };

    // Optional site/group/asset constraint
    if (siteName && siteName.trim().length > 0) {
      bool.should = [
        { match_phrase: { 'siteName': siteName } },
        { match_phrase: { 'groupName': siteName } },
        { match_phrase: { 'assetName': siteName } }
      ];
      bool.minimum_should_match = 1;
    }

    const query = {
      size,
      sort: [
        { 'actionTimestamp': { order: 'desc' } }
      ],
      query: { bool },
      _source: [
        'dispatchId',
        'internalDispatchId',
        'id',
        'responseData.callout.calloutid',
        'responseData.callout.acknowledged',
        'companyName',
        'siteName',
        'groupName',
        'assetName',
        'alertType',
        'actionTimestamp',
        'proofStatus'
      ]
    };

    try {
      const response = await axios.post(
        `${this.baseURL}/${this.index}/_search`,
        query,
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      console.error('Elasticsearch search error:', error.response?.data || error.message);
      throw error;
    }
  }

  extractDispatchId(hit) {
    const source = hit._source;

    const valueFrom = (obj, path) => path.split('.').reduce((current, key) => current?.[key], obj);

    const possibleFields = [
      'dispatchId',
      'internalDispatchId',
      'id',
      'responseData.callout.calloutid',
      'responseData.callout.acknowledged'
    ];

    for (const field of possibleFields) {
      const value = valueFrom(source, field);
      if (value) {
        console.log(`Found dispatch ID in field '${field}': ${value}`);
        return value;
      }
    }

    console.warn('No dispatch ID found in record:', source);
    return null;
  }

  async getLatestDispatchId(filters = {}) {
    try {
      const results = await this.searchDispatchRecords({ ...filters, size: 1 });

      if (!results.hits?.hits?.length) {
        console.log('No dispatch records found with the given criteria');
        return null;
      }

      const latestHit = results.hits.hits[0];
      const dispatchId = this.extractDispatchId(latestHit);

      if (dispatchId) {
        console.log(`✅ Latest dispatch ID: ${dispatchId}`);
        console.log(`Record timestamp: ${latestHit._source['actionTimestamp']}`);
        console.log(`Company: ${latestHit._source.companyName}`);
        console.log(`Site: ${latestHit._source.siteName || latestHit._source.groupName || latestHit._source.assetName}`);
      }

      return dispatchId;
    } catch (error) {
      console.error('Failed to get latest dispatch ID:', error);
      return null;
    }
  }

  async searchDispatches(filters = {}) {
    try {
      const results = await this.searchDispatchRecords(filters);
      
      if (!results.hits?.hits) {
        return [];
      }

      // Extract and return the dispatch records as an array
      return results.hits.hits.map(hit => {
        const source = hit._source;
        return {
          dispatchId: this.extractDispatchId(hit),
          companyName: source.companyName,
          siteName: source.siteName || source.groupName || source.assetName,
          alertType: source.alertType,
          timestamp: source.actionTimestamp,
          proofStatus: source.proofStatus,
          ...source
        };
      });
    } catch (error) {
      console.error('Failed to search dispatches:', error);
      return [];
    }
  }

  async close() {
    // Axios doesn't require explicit connection closing like other HTTP clients
    // This method exists for compatibility but doesn't need to do anything
    console.log('Elasticsearch client closed (no action required for axios)');
  }
}

export default ElasticsearchClient;
