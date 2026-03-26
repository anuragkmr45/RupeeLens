import { describe, expect, it } from 'vitest';

import { getWorkerRuntimeConfig } from './env.js';

describe('getWorkerRuntimeConfig', () => {
  it('returns the default heartbeat interval when env is empty', () => {
    expect(getWorkerRuntimeConfig({})).toEqual({
      heartbeatIntervalMs: 60_000,
    });
  });

  it('uses valid overrides and falls back for invalid values', () => {
    expect(
      getWorkerRuntimeConfig({
        WORKER_HEARTBEAT_INTERVAL_MS: '15000',
      }),
    ).toEqual({
      heartbeatIntervalMs: 15_000,
    });

    expect(
      getWorkerRuntimeConfig({
        WORKER_HEARTBEAT_INTERVAL_MS: 'invalid',
      }),
    ).toEqual({
      heartbeatIntervalMs: 60_000,
    });
  });
});
