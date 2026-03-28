import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';

describe('GET /v1/bootstrap/config', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the typed bootstrap config response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/bootstrap/config?platform=android&appVersion=0.2.0&runtimeVersion=sdk-55-shell&channel=internal',
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();

    expect(response.headers['cache-control']).toBe(
      'public, max-age=300, stale-while-revalidate=300',
    );
    expect(response.headers.etag).toBe(`"${payload.signature}"`);
    expect(response.headers.vary).toBe('Accept');
    expect(payload).toMatchObject({
      cacheTtlSeconds: 300,
      dedupeConfig: {
        exactMatchWindowSeconds: 90,
        fuzzyMatchWindowSeconds: 420,
        merchantSimilarityThreshold: 0.8,
      },
      featureFlags: expect.objectContaining({
        showcase_enabled: true,
      }),
      rolloutChannel: 'internal',
      signature: expect.any(String),
    });
  });

  it('returns runtime-incompatible config when the native runtime is unsupported', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/bootstrap/config?platform=android&appVersion=0.2.0&runtimeVersion=expo-sdk-54-go&channel=beta',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      parserConfig: {
        parserKillSwitch: true,
      },
      runtimeCompatibility: {
        compatible: false,
        reason: expect.stringContaining('expo-sdk-54-go'),
      },
    });
  });

  it('rejects invalid query values', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/bootstrap/config?platform=web&appVersion=&runtimeVersion=',
    });

    expect(response.statusCode).toBe(400);
  });
});
