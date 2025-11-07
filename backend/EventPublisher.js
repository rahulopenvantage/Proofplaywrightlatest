// Publish alerts directly to Event Grid (no Postman flows)
import { newApiContext, isoTimestamp, guid } from '../utils/api.js';

function hasApiEnv() {
  const env = (process.env.ENVIRONMENT || 'uat').toLowerCase();
  const url = env === 'dev' ? process.env.DEV_URL : process.env.UAT_URL;
  const key = env === 'dev' ? process.env.DEV_SASKEY : process.env.UAT_SASKEY;
  return Boolean(url && key);
}

export class EventPublisher {
  async #ctx() {
    if (!hasApiEnv()) {
      console.log('[EventPublisher] API env not configured (URL/SASKEY). Skipping event publishing.');
      return null;
    }
    const { api, cfg } = await newApiContext();
    return { api, cfg };
  }

  // TREX - public (Firefly) - Uses separate endpoint from Postman collection
  async trexPublic() {
    // TREX Public uses a hardcoded endpoint in the Postman collection
    const trexUrl = process.env.TREX_PUBLIC_URL || 'https://staging-vum-eventgriddomain-licenseplatereads-san.southafricanorth-1.eventgrid.azure.net/api/events';
    const trexKey = process.env.TREX_PUBLIC_SASKEY || 'tC6Idyj77Y/pKBBT/kBgEzHG4NTxWOecsG1SP+rZRNQ=';
    
    if (!trexUrl || !trexKey) {
      console.log('[EventPublisher] TREX Public env not configured (TREX_PUBLIC_URL/TREX_PUBLIC_SASKEY). Skipping.');
      return { skipped: true };
    }

    const { api: _, cfg } = await this.#ctx() || { cfg: {} };
    
    // Create separate API context for TREX endpoint
    const { request } = await import('@playwright/test');
    const trexApi = await request.newContext({
      baseURL: trexUrl,
      extraHTTPHeaders: {
        'aeg-sas-key': trexKey
      }
    });

    // Match Postman TREX body exactly
    const deviceId = process.env.TREX_DEVICE_ID || '116444';
    const cameraName = process.env.TREX_CAMERA_NAME || '116444';
    const imageUrl = process.env.TREX_IMAGE_URL || 'https://wwwproof360coza.blob.core.windows.net/isentry-firefly-alert-images/128237_1688624021_2023-07-06-06-13-41_9.idat.jpeg';
    const videoUrl = process.env.TREX_VIDEO_URL || 'https://wwwproof360coza.blob.core.windows.net/isentry-firefly-alert-videos/128237_1688624021_2023-07-06-06-13-41_9.idat.mp4';
    
    const body = [{
      id: guid(),
      subject: 'iSentry Firefly Alert',
      data: {
        source: 'iSentry Firefly',
        ref: guid(),
        type: 'Trex',
        timestamp: isoTimestamp(),
        deviceIdList: [deviceId],
        data: {
          organisationId: [],
          reason: 'Trex',
          description: 'Trex',
          shortDescription: 'Trex',
          localId: guid(),
          priority: 'Unknown',
          cameraName: cameraName,
          escalationActionName: '',
          escalationClassificationName: ''
        },
        imageList: [imageUrl],
        videoList: [videoUrl]
      },
      eventType: 'iSentry Firefly Event',
      dataVersion: '2.0',
      metadataVersion: '1',
      eventTime: isoTimestamp(),
      topic: cfg.isentryFireflyTopic || process.env.UAT_ISENTRY_FIREFLY_TOPIC
    }];
    
    const res = await trexApi.post('', { data: body });
    await trexApi.dispose(); // Clean up the API context
    return { ok: res.ok(), status: res.status() };
  }

  // TREX - private (camera from env)
  async trexPrivate() {
    const ctx = await this.#ctx();
    if (!ctx) return { skipped: true };
    const { api, cfg } = ctx;
    
    // Match Postman collection exactly - TREX Private uses different device/camera IDs
    const deviceId = process.env.TREX_PRIVATE_DEVICE_ID || '123363';
    const cameraId = process.env.TREX_PRIVATE_CAMERA_ID || '123352';
    const imageUrl = process.env.TREX_IMAGE_URL || 'https://wwwproof360coza.blob.core.windows.net/isentry-firefly-alert-images/128237_1688624021_2023-07-06-06-13-41_9.idat.jpeg';
    const videoUrl = process.env.TREX_VIDEO_URL || 'https://wwwproof360coza.blob.core.windows.net/isentry-firefly-alert-videos/128237_1688624021_2023-07-06-06-13-41_9.idat.mp4';
    
    const body = [{
      id: guid(),
      subject: 'iSentry Firefly Alert',
      data: {
        source: 'iSentry Firefly',
        ref: guid(),
        type: 'Trex',
        timestamp: isoTimestamp(),
        deviceIdList: [deviceId],
        data: {
          organisationId: [],
          reason: 'Trex',
          description: 'Trex',
          shortDescription: 'Trex',
          localId: guid(),
          priority: 'Unknown',
          cameraName: cameraId,
          escalationActionName: '',
          escalationClassificationName: ''
        },
        imageList: [imageUrl],
        videoList: [videoUrl]
      },
      eventType: 'iSentry Firefly Event',
      dataVersion: '2.0',
      metadataVersion: '1',
      eventTime: isoTimestamp(),
      topic: cfg.isentryFireflyTopic
    }];
    const res = await api.post('', { data: body });
    return { ok: res.ok(), status: res.status() };
  }

  // Unusual Behaviour
  async unusualBehaviour() {
    const ctx = await this.#ctx();
    if (!ctx) return { skipped: true };
    const { api, cfg } = ctx;
    const now = isoTimestamp();
    
    // Use environment variables for configurable parts, with timestamp for uniqueness
    const baseDeviceId = process.env.UB_DEVICE_ID || '7B2951D9-59AA-4651-87D4-3D27B0B9C0B9';
    const timestamp = Date.now();
    const deviceId = `${baseDeviceId}-${timestamp}`;
    const cameraName = process.env.UB_CAMERA_NAME || 'Vicp_Opposite 25 Leighton Rd_9.2_T';
    
    const body = [{
      id: guid(),
      subject: 'iSentry API',
      data: {
        source: 'iSentry API',
        ref: guid(),
        type: 'Unusual Behaviour',
        timestamp: now,
        deviceIdList: [deviceId],
        data: {
          organisationId: '',
          reason: 'Unusual Behaviour',
          localId: '88e87751-23bf-4f12-b3d5-fc4905a2a23e',
          priority: 'HIGH',
          cameraName: cameraName,
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
                MSCameraID: deviceId,
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
    return { ok: res.ok(), status: res.status() };
  }

  // Public LPR (VOI)
  async publicLpr() {
    const ctx = await this.#ctx();
    if (!ctx) return { skipped: true };
    const { api, cfg } = ctx;
    const now = isoTimestamp();
    const orgId = Number(process.env.ORGANIZATION_ID || 100526);
    const plateId = process.env.PLATE_ID2 || 'TESTGP';
    const deviceId = process.env.PUBLIC_LPR_DEVICE_ID || '121467';
    const body = [{
      data: {
        data: {
          cameraName: process.env.PUBLIC_LPR_CAMERA_NAME || 'MCLN_Berea Str and Bourke Str_20.4_A',
          direction: 'forward',
          imageList: [],
          isSuperVOI: false,
          latitude: Number(process.env.PUBLIC_LPR_LATITUDE || -26.124830),
          levelOfIncidence: {
            caseNumber: process.env.PUBLIC_LPR_CASE_NUMBER || 'CAS 128/11/20',
            crimeType: process.env.PUBLIC_LPR_CRIME_TYPE || 'Common Robbery',
            id: process.env.PUBLIC_LPR_LEVEL_ID || '05ce87af-55c0-477e-a148-73c708a859a6',
            isPublic: 1,
            level: 1,
            organizationId: orgId,
            schedule: '',
            timeCreated: process.env.PUBLIC_LPR_TIME_CREATED || '2022-11-06T13:48:58.843Z'
          },
          longitude: Number(process.env.PUBLIC_LPR_LONGITUDE || 28.082690),
          organizationId: orgId,
          plateId,
          timeCaptured: now,
          timeDispatched: now,
          voiSource: 'Public'
        },
        deviceIdList: [deviceId],
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
    return { ok: res.ok(), status: res.status() };
  }
}

export default EventPublisher;
