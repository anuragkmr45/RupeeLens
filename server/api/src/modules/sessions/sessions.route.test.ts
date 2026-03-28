import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';

describe('sessions routes', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
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
});
