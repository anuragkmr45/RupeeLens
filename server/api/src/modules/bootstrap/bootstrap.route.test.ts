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
    expect(response.json()).toMatchObject({
      cacheTtlSeconds: 300,
      featureFlags: expect.objectContaining({
        showcase_enabled: true,
      }),
      rolloutChannel: 'internal',
      signature: expect.any(String),
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
