// tests/api/trex.spec.js
import { test, expect } from '@playwright/test';
import { newApiContext, isoTimestamp, guid } from '../../utils/api.js';

/**
 * Mirrors "TREX" request from Postman.
 * Body + header topology copied; secrets/env from .env.*
 */
test('TREX - public (firefly)', async () => {
  const { api, cfg } = await newApiContext();
  const body = [{
    id: guid(),
    subject: 'iSentry Firefly Alert',
    data: {
      source: 'iSentry Firefly',
      ref: guid(),
      type: 'Trex',
      timestamp: isoTimestamp(),
      deviceIdList: ['116444'],
      data: {
        organisationId: [],
        reason: 'Trex',
        description: 'Trex',
        shortDescription: 'Trex',
        localId: guid(),
        priority: 'Unknown',
        cameraName: '116444',
        escalationActionName: '',
        escalationClassificationName: ''
      },
      imageList: [
        'https://wwwproof360coza.blob.core.windows.net/isentry-firefly-alert-images/128237_1688624021_2023-07-06-06-13-41_9.idat.jpeg'
      ],
      videoList: [
        'https://wwwproof360coza.blob.core.windows.net/isentry-firefly-alert-videos/128237_1688624021_2023-07-06-06-13-41_9.idat.mp4'
      ]
    },
    eventType: 'iSentry Firefly Event',
    dataVersion: '2.0',
    metadataVersion: '1',
    eventTime: isoTimestamp(),
    topic: cfg.isentryFireflyTopic
  }];

  const res = await api.post('', { data: body });
  expect(res.ok()).toBeTruthy();
});

/**
 * Mirrors "TREX_Private" request (uses env url & aeg-sas-key). Device & topic from env.
 */
test('TREX - private', async () => {
  const { api, cfg } = await newApiContext();
  const body = [{
    id: guid(),
    subject: 'iSentry Firefly Alert',
    data: {
      source: 'iSentry Firefly',
      ref: guid(),
      type: 'Trex',
      timestamp: isoTimestamp(),
      deviceIdList: [ process.env.CAMERA_ID_PRIVATE || '123352' ],
      data: {
        organisationId: [],
        reason: 'Trex',
        description: 'Trex',
        shortDescription: 'Trex',
        localId: guid(),
        priority: 'Unknown',
        cameraName: process.env.CAMERA_ID_PRIVATE || '123352',
        escalationActionName: '',
        escalationClassificationName: ''
      },
      imageList: [
        'https://wwwproof360coza.blob.core.windows.net/isentry-firefly-alert-images/128237_1688624021_2023-07-06-06-13-41_9.idat.jpeg'
      ],
      videoList: [
        'https://wwwproof360coza.blob.core.windows.net/isentry-firefly-alert-videos/128237_1688624021_2023-07-06-06-13-41_9.idat.mp4'
      ]
    },
    eventType: 'iSentry Firefly Event',
    dataVersion: '2.0',
    metadataVersion: '1',
    eventTime: isoTimestamp(),
    topic: cfg.isentryFireflyTopic
  }];

  const res = await api.post('', { data: body });
  expect(res.ok()).toBeTruthy();
});
