// utils/api.js
// Small helpers that mirror Postman runtime pieces used in your flows.

import { request, expect } from '@playwright/test';

/** Return ISO timestamp like Postman's {{$isoTimestamp}} */
export function isoTimestamp() {
  return new Date().toISOString();
}

/** Return GUID/UUID like Postman's {{$guid}} */
export function guid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Fallback simple UUIDv4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Builds an APIRequestContext configured like your Postman env.
 * Required env vars:
 *   ENVIRONMENT=dev|uat
 *   DEV_URL, UAT_URL
 *   DEV_SASKEY, UAT_SASKEY
 *   DEV_TOPIC, UAT_TOPIC
 *   DEV_ISENTRY_TOPIC, UAT_ISENTRY_TOPIC
 *   DEV_ISENTRY_FIREFLY_TOPIC, UAT_ISENTRY_FIREFLY_TOPIC
 */
export async function newApiContext(envOverride) {
  const env = (envOverride || process.env.ENVIRONMENT || 'uat').toLowerCase();
  const cfg = env === 'dev' ? {
    url: process.env.DEV_URL,
    saskey: process.env.DEV_SASKEY,
    topic: process.env.DEV_TOPIC,
    isentryTopic: process.env.DEV_ISENTRY_TOPIC,
    isentryFireflyTopic: process.env.DEV_ISENTRY_FIREFLY_TOPIC,
  } : {
    url: process.env.UAT_URL,
    saskey: process.env.UAT_SASKEY,
    topic: process.env.UAT_TOPIC,
    isentryTopic: process.env.UAT_ISENTRY_TOPIC,
    isentryFireflyTopic: process.env.UAT_ISENTRY_FIREFLY_TOPIC,
  };

  if (!cfg.url || !cfg.saskey) {
    throw new Error('Missing required env vars for API config. Check README and .env.*');
  }

  const api = await request.newContext({
    baseURL: cfg.url,
    extraHTTPHeaders: {
      'aeg-sas-key': cfg.saskey
    }
  });
  return { api, cfg };
}
