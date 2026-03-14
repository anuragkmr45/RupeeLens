import {
  BOOTSTRAP_CONTENT_HASH_HEADER,
  BOOTSTRAP_SIGNATURE_HEADER,
} from '@upi-spend-tracker/contracts';
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

  it('returns a signed bootstrap config response', async () => {
    const response = await app.inject({
      method: 'GET',
      query: {
        appVersion: '1.0.0',
        channel: 'internal',
        platform: 'android',
        runtimeVersion: '1.0.0',
      },
      url: '/v1/bootstrap/config',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers[BOOTSTRAP_CONTENT_HASH_HEADER]).toBeTruthy();
    expect(response.headers[BOOTSTRAP_SIGNATURE_HEADER]).toBeTruthy();
    expect(response.json()).toMatchObject({
      configVersion: 'test-2026-03-14',
      rolloutChannel: 'internal',
    });
  });

  it('rejects invalid requests with a 400', async () => {
    const response = await app.inject({
      method: 'GET',
      query: {
        appVersion: '1.0.0',
        platform: 'android',
      },
      url: '/v1/bootstrap/config',
    });

    expect(response.statusCode).toBe(400);
  });
});
