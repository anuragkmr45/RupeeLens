import type { HealthResponse } from './health.js';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';
import { describe, expect, it } from 'vitest';

describe('health contract', () => {
  it('supports the SET-001 health response shape', () => {
    const response: HealthResponse = {
      service: 'api',
      status: 'healthy',
      timestamp_utc: '2026-03-13T00:00:00.000Z' as IsoUtcDateTimeString,
    };

    expect(response.status).toBe('healthy');
  });
});
