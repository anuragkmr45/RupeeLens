import { describe, expect, it } from 'vitest';

import { getApiRuntimeConfig } from './env.js';

describe('getApiRuntimeConfig', () => {
  it('returns default host and port when env is empty', () => {
    expect(getApiRuntimeConfig({})).toEqual({
      domainStoreFile: expect.stringContaining('.local/domain-store.json'),
      host: '0.0.0.0',
      port: 3000,
      sessionStoreFile: expect.stringContaining('.local/sessions-store.json'),
      syncStoreFile: expect.stringContaining('.local/sync-store.json'),
      telemetryStoreFile: expect.stringContaining('.local/telemetry-store.json'),
    });
  });

  it('uses valid env overrides and ignores invalid ports', () => {
    expect(
      getApiRuntimeConfig({
        API_DOMAIN_STORE_FILE: './tmp/api-domain.json',
        API_SESSION_STORE_FILE: './tmp/api-sessions.json',
        API_SYNC_STORE_FILE: './tmp/api-sync.json',
        API_TELEMETRY_STORE_FILE: './tmp/api-telemetry.json',
        HOST: '127.0.0.1',
        PORT: '3100',
      }),
    ).toEqual({
      domainStoreFile: expect.stringContaining('tmp/api-domain.json'),
      host: '127.0.0.1',
      port: 3100,
      sessionStoreFile: expect.stringContaining('tmp/api-sessions.json'),
      syncStoreFile: expect.stringContaining('tmp/api-sync.json'),
      telemetryStoreFile: expect.stringContaining('tmp/api-telemetry.json'),
    });

    expect(
      getApiRuntimeConfig({
        HOST: '127.0.0.1',
        PORT: 'not-a-port',
      }),
    ).toEqual({
      domainStoreFile: expect.stringContaining('.local/domain-store.json'),
      host: '127.0.0.1',
      port: 3000,
      sessionStoreFile: expect.stringContaining('.local/sessions-store.json'),
      syncStoreFile: expect.stringContaining('.local/sync-store.json'),
      telemetryStoreFile: expect.stringContaining('.local/telemetry-store.json'),
    });
  });
});
