// tests/api/public_voi.spec.js
import { test, expect } from '@playwright/test';
import { newApiContext, isoTimestamp, guid } from '../../utils/api.js';

/**
 * Mirrors "Public_VOI_Public_PTA"
 */
test('Public VOI - PTA (public)', async () => {
  const { api, cfg } = await newApiContext();
  const now = isoTimestamp();
  const body = [{
    data: {
      data: {
        cameraName: 'MCLN_Berea Str and Bourke Str_20.4_A',
        direction: 'forward',
        imageList: [],
        isSuperVOI: false,
        latitude: -26.124830,
        levelOfIncidence: {
          caseNumber: 'CAS 128/11/20',
          crimeType: 'Common Robbery',
          id: '05ce87af-55c0-477e-a148-73c708a859a6',
          isPublic: 1,
          level: 1,
          organizationId: Number(process.env.ORGANIZATION_ID || 100526),
          schedule: '',
          timeCreated: '2022-11-06T13:48:58.843Z'
        },
        longitude: 28.082690,
        organizationId: Number(process.env.ORGANIZATION_ID || 100526),
        plateId: process.env.PLATE_ID2 || 'TESTGP',
        timeCaptured: now,
        timeDispatched: now,
        voiSource: 'Public'
      },
      deviceIdList: [ process.env.DEVICE_ID_PUBLIC || '121467' ],
      ref: guid(),
      source: 'proof',
      timestamp: now,
      type: 'plate'
    },
    dataVersion: '2.0',
    eventTime: now,
    eventType: 'Vumacam.LPR.AlertDispatchedEvent',
    id: guid(),
    metadataVersion: '1',
    subject: cfg.topic,
    topic: cfg.topic
  }];

  const res = await api.post('', { data: body });
  expect(res.ok()).toBeTruthy();
});

/**
 * Mirrors "Public_VOI_Private_Cam"
 */
test('Public VOI - Private Cam', async () => {
  const { api, cfg } = await newApiContext();
  const now = isoTimestamp();
  const body = [{
    data: {
      data: {
        cameraName: 'LYNWRD_#70 Maldon Rd _01.1_A',
        direction: 'forward',
        imageList: [],
        isSuperVOI: false,
        latitude: -26.115837,
        levelOfIncidence: {
          caseNumber: 'CAS 128/11/20',
          crimeType: 'Common Robbery',
          id: '05ce87af-55c0-477e-a148-73c708a859a6',
          isPublic: 1,
          level: 1,
          organizationId: Number(process.env.ORGANIZATION_ID || 100526),
          schedule: '',
          timeCreated: '2022-11-06T13:48:58.843Z'
        },
        longitude: 28.08269,
        organizationId: Number(process.env.ORGANIZATION_ID || 100526),
        plateId: process.env.PLATE_ID || 'JH43DHGP',
        timeCaptured: now,
        timeDispatched: now,
        voiSource: 'Public'
      },
      deviceIdList: [ process.env.DEVICE_ID_PRIVATE || '127711' ],
      ref: guid(),
      source: 'proof',
      timestamp: now,
      type: 'plate'
    },
    dataVersion: '2.0',
    eventTime: now,
    eventType: 'Vumacam.LPR.AlertDispatchedEvent',
    id: guid(),
    metadataVersion: '1',
    subject: cfg.topic,
    topic: cfg.topic
  }];

  const res = await api.post('', { data: body });
  expect(res.ok()).toBeTruthy();
});
