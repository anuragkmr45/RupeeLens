jest.mock('../src/features/bootstrap-config/runtime-config', () => ({
  getDefaultBootstrapConfigQuery: jest.fn(() => ({
    appVersion: '1.0.0',
    channel: 'beta',
    platform: 'android',
    runtimeVersion: 'expo-sdk-55-dev-client',
  })),
  resolveBootstrapBaseUrl: jest.fn(() => 'http://localhost:3000'),
}));

import {
  consumeSyncPairingCode,
  createGuestSyncSession,
  createSyncPairingCode,
  ensureFreshSyncCredentials,
  type StoredSyncCredentials,
} from '../src/features/sync/session';

function createSessionResponse(overrides: Record<string, unknown> = {}) {
  return {
    accessToken: 'access-token-1',
    deviceId: 'device_remote_1',
    expiresInSeconds: 900,
    refreshToken: 'refresh-token-1',
    syncMode: 'cloud_sync',
    userId: 'user_remote_1',
    ...overrides,
  };
}

describe('sync session client', () => {
  it('creates a guest sync session from the existing sessions API', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue({
      json: async () => createSessionResponse(),
      ok: true,
      status: 201,
    });

    const credentials = await createGuestSyncSession({
      deviceName: 'Pixel 9 Pro',
      fetchImplementation: fetchImplementation as unknown as typeof globalThis.fetch,
    });

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'http://localhost:3000/v1/sessions/guest',
    );
    expect(
      JSON.parse((fetchImplementation.mock.calls[0]?.[1] as { body: string }).body),
    ).toMatchObject({
      appVersion: '1.0.0',
      deviceName: 'Pixel 9 Pro',
      platform: 'android',
      runtimeVersion: 'expo-sdk-55-dev-client',
    });
    expect(credentials).toEqual(
      expect.objectContaining({
        accessToken: 'access-token-1',
        apiBaseUrl: 'http://localhost:3000',
        deviceId: 'device_remote_1',
        refreshToken: 'refresh-token-1',
        userId: 'user_remote_1',
      }),
    );
    expect(credentials.accessTokenExpiresAt).toEqual(expect.any(String));
  });

  it('normalizes pairing codes before consuming them', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue({
      json: async () => createSessionResponse({ deviceId: 'device_secondary_1' }),
      ok: true,
      status: 200,
    });

    await consumeSyncPairingCode({
      deviceName: 'Secondary Android',
      fetchImplementation: fetchImplementation as unknown as typeof globalThis.fetch,
      pairingCode: ' abcd1234 ',
    });

    expect(
      JSON.parse((fetchImplementation.mock.calls[0]?.[1] as { body: string }).body),
    ).toMatchObject({
      deviceName: 'Secondary Android',
      pairingCode: 'ABCD1234',
      platform: 'android',
    });
  });

  it('refreshes expiring sync credentials before the runtime uses them', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue({
      json: async () =>
        createSessionResponse({
          accessToken: 'access-token-2',
          refreshToken: 'refresh-token-2',
        }),
      ok: true,
      status: 200,
    });
    const credentials: StoredSyncCredentials = {
      accessToken: 'access-token-1',
      accessTokenExpiresAt: '2026-03-30T10:00:30.000Z',
      apiBaseUrl: 'http://localhost:3000',
      deviceId: 'device_remote_1',
      refreshToken: 'refresh-token-1',
      userId: 'user_remote_1',
    };

    const refreshedCredentials = await ensureFreshSyncCredentials({
      credentials,
      fetchImplementation: fetchImplementation as unknown as typeof globalThis.fetch,
      now: '2026-03-30T10:00:00.000Z',
    });

    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'http://localhost:3000/v1/sessions/refresh',
    );
    expect(
      JSON.parse((fetchImplementation.mock.calls[0]?.[1] as { body: string }).body),
    ).toEqual({
      refreshToken: 'refresh-token-1',
    });
    expect(refreshedCredentials).toEqual(
      expect.objectContaining({
        accessToken: 'access-token-2',
        refreshToken: 'refresh-token-2',
      }),
    );
  });

  it('requests pairing codes with the stored bearer token', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue({
      json: async () => ({
        expiresAt: '2026-03-30T12:00:00.000Z',
        pairingCode: 'ABCD1234',
      }),
      ok: true,
      status: 201,
    });
    const credentials: StoredSyncCredentials = {
      accessToken: 'access-token-1',
      accessTokenExpiresAt: '2026-03-30T11:00:00.000Z',
      apiBaseUrl: 'http://localhost:3000',
      deviceId: 'device_remote_1',
      refreshToken: 'refresh-token-1',
      userId: 'user_remote_1',
    };

    await expect(
      createSyncPairingCode({
        credentials,
        fetchImplementation: fetchImplementation as unknown as typeof globalThis.fetch,
      }),
    ).resolves.toEqual({
      expiresAt: '2026-03-30T12:00:00.000Z',
      pairingCode: 'ABCD1234',
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://localhost:3000/v1/device-pairings',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer access-token-1',
        }),
        method: 'POST',
      }),
    );
  });
});
