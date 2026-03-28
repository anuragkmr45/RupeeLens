import { describe, expect, it } from 'vitest';

import { getApiRuntimeConfig } from './env.js';

describe('getApiRuntimeConfig', () => {
  it('returns default host and port when env is empty', () => {
    expect(getApiRuntimeConfig({})).toEqual({
      host: '0.0.0.0',
      port: 3000,
      sessionStoreFile: expect.stringContaining('.local/sessions-store.json'),
      syncStoreFile: expect.stringContaining('.local/sync-store.json'),
    });
  });

  it('uses valid env overrides and ignores invalid ports', () => {
    expect(
      getApiRuntimeConfig({
        API_SESSION_STORE_FILE: './tmp/api-sessions.json',
        API_SYNC_STORE_FILE: './tmp/api-sync.json',
        HOST: '127.0.0.1',
        PORT: '3100',
      }),
    ).toEqual({
      host: '127.0.0.1',
      port: 3100,
      sessionStoreFile: expect.stringContaining('tmp/api-sessions.json'),
      syncStoreFile: expect.stringContaining('tmp/api-sync.json'),
    });

    expect(
      getApiRuntimeConfig({
        HOST: '127.0.0.1',
        PORT: 'not-a-port',
      }),
    ).toEqual({
      host: '127.0.0.1',
      port: 3000,
      sessionStoreFile: expect.stringContaining('.local/sessions-store.json'),
      syncStoreFile: expect.stringContaining('.local/sync-store.json'),
    });
  });
});
