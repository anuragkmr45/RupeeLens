import { describe, expect, it, vi } from 'vitest';

import { createHealthService } from './health.service.js';

describe('health service', () => {
  it('maps repository snapshots to the health contract response', () => {
    const repository = {
      readSnapshot: vi.fn(() => ({
        service: 'api' as const,
        status: 'healthy' as const,
        timestampUtc: '2026-03-26T00:00:00.000Z' as const,
      })),
    };

    const service = createHealthService(repository);

    expect(service.getHealthResponse()).toEqual({
      service: 'api',
      status: 'healthy',
      timestamp_utc: '2026-03-26T00:00:00.000Z',
    });
  });
});
