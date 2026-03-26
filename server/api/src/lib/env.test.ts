import { describe, expect, it } from 'vitest';

import { getApiRuntimeConfig } from './env.js';

describe('getApiRuntimeConfig', () => {
  it('returns default host and port when env is empty', () => {
    expect(getApiRuntimeConfig({})).toEqual({
      host: '0.0.0.0',
      port: 3000,
    });
  });

  it('uses valid env overrides and ignores invalid ports', () => {
    expect(
      getApiRuntimeConfig({
        HOST: '127.0.0.1',
        PORT: '3100',
      }),
    ).toEqual({
      host: '127.0.0.1',
      port: 3100,
    });

    expect(
      getApiRuntimeConfig({
        HOST: '127.0.0.1',
        PORT: 'not-a-port',
      }),
    ).toEqual({
      host: '127.0.0.1',
      port: 3000,
    });
  });
});
