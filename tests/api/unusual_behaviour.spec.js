// tests/api/unusual_behaviour.spec.js
import { test, expect } from '@playwright/test';
import { newApiContext, isoTimestamp, guid } from '../../utils/api.js';

/**
 * Mirrors "Unusual Behaviour - WVRD_9th Ave and JG Strydom Rd_62"
 * Payload trimmed to representative structure but keeps required fields.
 */
test('Unusual Behaviour event', async () => {
  const { api, cfg } = await newApiContext();
  const now = isoTimestamp();
  const eventGridId = guid();

  const body = [{
    id: eventGridId,
    subject: 'iSentry API',
    data: {
      source: 'iSentry API',
      ref: guid(),
      type: 'Unusual Behaviour',
      timestamp: now,
      deviceIdList: ['7B2951D9-59AA-4651-87D4-3D27B0B9C0B9'],
      data: {
        organisationId: '',
        reason: 'Unusual Behaviour',
        localId: guid(),
        priority: 'HIGH',
        cameraName: 'Vicp_Opposite 25 Leighton Rd_9.2_T',
        timeZone: 'Day',
        frames: [
          {
            Number: 0,
            ActionApplied: 0,
            MasterFrame: false,
            AlertFrame: {
              ImagePixelFormat: 137224,
              Number: 0,
              FrameNumber: 130527,
              HighRes: true,
              FrameID: guid(),
              iSentryServerID: guid(),
              MSCameraID: '7B2951D9-59AA-4651-87D4-3D27B0B9C0B9',
              Timestamp: Date.now(),
              TimestampUTC: now,
              CameraID: 1496,
              FrameImageType: 0,
              Width: 384,
              Height: 288,
              Bounding_Box_Inclusion_Percentage: 2,
              Facial_Inflation_Percentage: 15,
              TrackingID: '00000000-0000-0000-0000-000000000000',
              Created: now,
              ImageURL: 'https://wwwproof360coza.blob.core.windows.net/isentry/e11001f382d14138a9040a7a3d8a9a5a.jpg'
            }
          }
        ],
        alertIdInt: 267
      },
      imageList: [
        'https://wwwproof360coza.blob.core.windows.net/isentry/e11001f382d14138a9040a7a3d8a9a5a.jpg'
      ],
      videoList: []
    },
    eventType: 'iSentry Event',
    dataVersion: '4.0',
    metadataVersion: '1',
    eventTime: now,
    topic: cfg.isentryTopic
  }];

  const res = await api.post('', { data: body });
  expect(res.ok()).toBeTruthy();
});
