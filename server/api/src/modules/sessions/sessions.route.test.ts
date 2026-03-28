import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';

describe('sessions routes', () => {
  let sessionStoreFile = '';
  let app = buildApp();

  beforeAll(async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-api-sessions-'));
    sessionStoreFile = path.join(tempDir, 'sessions-store.json');
    app = buildApp({
      sessionStoreFile,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    if (sessionStoreFile) {
      await rm(path.dirname(sessionStoreFile), {
        force: true,
        recursive: true,
      });
    }
  });

  it('creates guest sessions and refreshes tokens', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      payload: {
        appVersion: '0.1.0',
        deviceName: 'Pixel 9',
        platform: 'android',
        runtimeVersion: 'sdk-55',
      },
      url: '/v1/sessions/guest',
    });

    expect(createResponse.statusCode).toBe(201);
    const createdSession = createResponse.json();
    expect(createdSession).toMatchObject({
      accessToken: expect.stringContaining('st_access_'),
      deviceId: expect.any(String),
      expiresInSeconds: 900,
      refreshToken: expect.stringContaining('st_refresh_'),
      syncMode: 'cloud_sync',
      userId: expect.any(String),
    });

    const refreshResponse = await app.inject({
      method: 'POST',
      payload: {
        refreshToken: createdSession.refreshToken,
      },
      url: '/v1/sessions/refresh',
    });

    expect(refreshResponse.statusCode).toBe(200);
    expect(refreshResponse.json()).toMatchObject({
      deviceId: createdSession.deviceId,
      refreshToken: expect.any(String),
      userId: createdSession.userId,
    });
  });

  it('registers devices and handles pairing success plus replay protection', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      payload: {
        deviceName: 'Trusted Pixel',
        platform: 'android',
      },
      url: '/v1/sessions/guest',
    });
    const session = createResponse.json();

    const registerResponse = await app.inject({
      headers: {
        authorization: `Bearer ${session.accessToken}`,
      },
      method: 'POST',
      payload: {
        appVersion: '0.1.1',
        deviceName: 'Trusted Pixel Updated',
        notificationCaptureEnabled: true,
        platform: 'android',
        runtimeVersion: 'sdk-55',
        supportedPackages: ['com.google.android.apps.nbu.paisa.user'],
      },
      url: '/v1/devices/register',
    });

    expect(registerResponse.statusCode).toBe(200);
    expect(registerResponse.json()).toMatchObject({
      deviceName: 'Trusted Pixel Updated',
      id: session.deviceId,
      notificationCaptureEnabled: true,
      supportedPackages: ['com.google.android.apps.nbu.paisa.user'],
    });

    const pairingResponse = await app.inject({
      headers: {
        authorization: `Bearer ${session.accessToken}`,
      },
      method: 'POST',
      url: '/v1/device-pairings',
    });

    expect(pairingResponse.statusCode).toBe(201);
    const pairingCode = pairingResponse.json();
    expect(pairingCode).toMatchObject({
      expiresAt: expect.any(String),
      pairingCode: expect.stringMatching(/^[A-Z0-9]{8}$/),
    });

    const consumeResponse = await app.inject({
      method: 'POST',
      payload: {
        deviceName: 'Secondary iPhone',
        pairingCode: pairingCode.pairingCode,
        platform: 'ios',
      },
      url: '/v1/device-pairings/consume',
    });

    expect(consumeResponse.statusCode).toBe(200);
    expect(consumeResponse.json()).toMatchObject({
      deviceId: expect.any(String),
      userId: session.userId,
    });

    const replayResponse = await app.inject({
      method: 'POST',
      payload: {
        deviceName: 'Replay Device',
        pairingCode: pairingCode.pairingCode,
        platform: 'android',
      },
      url: '/v1/device-pairings/consume',
    });

    expect(replayResponse.statusCode).toBe(409);
  });

  it('rejects invalid or unauthorized session operations', async () => {
    const invalidRefreshResponse = await app.inject({
      method: 'POST',
      payload: {
        refreshToken: 'missing_refresh_token',
      },
      url: '/v1/sessions/refresh',
    });
    const invalidRegisterResponse = await app.inject({
      method: 'POST',
      payload: {
        deviceName: 'No auth device',
        platform: 'android',
      },
      url: '/v1/devices/register',
    });
    const invalidCreateResponse = await app.inject({
      method: 'POST',
      payload: {
        deviceName: '',
        platform: 'web',
      },
      url: '/v1/sessions/guest',
    });

    expect(invalidRefreshResponse.statusCode).toBe(401);
    expect(invalidRegisterResponse.statusCode).toBe(401);
    expect(invalidCreateResponse.statusCode).toBe(400);
  });

  it('persists refresh tokens and pairing codes across app restart', async () => {
    const restartTempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-api-restart-'));
    const restartSessionStoreFile = path.join(restartTempDir, 'sessions-store.json');
    const firstApp = buildApp({
      sessionStoreFile: restartSessionStoreFile,
    });

    await firstApp.ready();

    try {
      const createResponse = await firstApp.inject({
        method: 'POST',
        payload: {
          deviceName: 'Primary Android',
          platform: 'android',
        },
        url: '/v1/sessions/guest',
      });
      const session = createResponse.json();

      const pairingResponse = await firstApp.inject({
        headers: {
          authorization: `Bearer ${session.accessToken}`,
        },
        method: 'POST',
        url: '/v1/device-pairings',
      });
      const pairingCode = pairingResponse.json();

      await firstApp.close();

      const secondApp = buildApp({
        sessionStoreFile: restartSessionStoreFile,
      });

      await secondApp.ready();

      try {
        const refreshResponse = await secondApp.inject({
          method: 'POST',
          payload: {
            refreshToken: session.refreshToken,
          },
          url: '/v1/sessions/refresh',
        });
        const consumeResponse = await secondApp.inject({
          method: 'POST',
          payload: {
            deviceName: 'Secondary iPhone',
            pairingCode: pairingCode.pairingCode,
            platform: 'ios',
          },
          url: '/v1/device-pairings/consume',
        });

        expect(refreshResponse.statusCode).toBe(200);
        expect(refreshResponse.json()).toMatchObject({
          deviceId: session.deviceId,
          userId: session.userId,
        });
        expect(consumeResponse.statusCode).toBe(200);
        expect(consumeResponse.json()).toMatchObject({
          userId: session.userId,
        });
      } finally {
        await secondApp.close();
      }
    } finally {
      await rm(restartTempDir, {
        force: true,
        recursive: true,
      });
    }
  });
});
