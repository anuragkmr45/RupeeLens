import Fastify from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createHealthModule } from './health.module.js';

describe('health module', () => {
  const app = Fastify({
    logger: false,
  });

  beforeAll(async () => {
    createHealthModule({
      now: () => '2026-03-26T00:00:00.000Z',
    }).register(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('bootstraps the health route through the module factory', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: 'api',
      status: 'healthy',
      timestamp_utc: '2026-03-26T00:00:00.000Z',
    });
  });
});
