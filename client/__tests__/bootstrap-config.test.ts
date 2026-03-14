import { ed25519 } from '@noble/curves/ed25519.js';
jest.mock('../src/lib/db', () => ({
  getAppDatabaseAsync: jest.fn(),
  readJsonSetting: jest.fn(),
  upsertJsonSetting: jest.fn(),
}));

import type { BootstrapConfigResponse } from '@upi-spend-tracker/contracts';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  getBootstrapContentHash,
  signEd25519Payload,
} from '@upi-spend-tracker/shared-utils';
import {
  readJsonSetting,
  upsertJsonSetting,
} from '../src/lib/db';
import type { BootstrapRuntimeMetadata } from '../src/lib/bootstrap-config';
import {
  createDefaultBootstrapConfigState,
  loadBootstrapConfigState,
  refreshBootstrapConfigState,
} from '../src/lib/bootstrap-config';

const testPrivateKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const testPublicKey = bytesToBase64Url(
  ed25519.getPublicKey(base64UrlToBytes(testPrivateKey)),
);

const runtimeMetadata: BootstrapRuntimeMetadata = {
  apiBaseUrl: 'http://127.0.0.1:3000',
  appVersion: '1.0.0',
  channel: 'internal',
  platform: 'android',
  publicKey: testPublicKey,
  runtimeVersion: '1.0.0',
};

const bootstrapResponse: BootstrapConfigResponse = {
  cacheTtlSeconds: 300,
  configVersion: 'dev-2026-03-14',
  copyOverrides: {
    configBanner: 'Remote config foundation active (dev)',
  },
  featureFlags: {
    'feature.capture_android_listener': true,
    'feature.remote_parser_config': true,
  },
  minSupportedVersion: '1.0.0',
  parserConfig: {
    globalKillSwitch: false,
    parserAssignments: {
      'upi.generic': {
        enabled: true,
        templateId: 'upi-generic-v1',
      },
    },
    parserTemplates: {
      'upi-generic-v1': {
        amountPattern: 'INR\\s?(\\d+)',
      },
    },
  },
  rolloutChannel: 'internal',
  runtimeCompatibility: {
    compatible: true,
  },
  softUpgradeVersion: '1.1.0',
};

const mockedReadJsonSetting = jest.mocked(readJsonSetting);
const mockedUpsertJsonSetting = jest.mocked(upsertJsonSetting);
const fakeDatabase = {} as never;
const responseHash = getBootstrapContentHash(bootstrapResponse);

describe('bootstrap config service', () => {
  beforeEach(() => {
    mockedReadJsonSetting.mockReset();
    mockedUpsertJsonSetting.mockReset();
  });

  it('returns a default state when no cached config exists', async () => {
    mockedReadJsonSetting.mockResolvedValue(null);

    const state = await loadBootstrapConfigState(runtimeMetadata, fakeDatabase);

    expect(state.source).toBe('default');
    expect(state.config.rolloutChannel).toBe('internal');
  });

  it('loads cached config immediately before refresh', async () => {
    mockedReadJsonSetting.mockResolvedValue({
      cachedAt: '2026-03-14T00:00:00.000Z',
      contentHash: 'cached-hash',
      expiresAt: '2126-03-14T00:00:00.000Z',
      response: bootstrapResponse,
      signature: 'cached-signature',
    });

    const state = await loadBootstrapConfigState(runtimeMetadata, fakeDatabase);

    expect(state.source).toBe('cache');
    expect(state.config.configVersion).toBe('dev-2026-03-14');
    expect(state.isStale).toBe(false);
  });

  it('refreshes successfully and persists the validated response', async () => {
    const signature = signEd25519Payload(bootstrapResponse, testPrivateKey);

    const state = await refreshBootstrapConfigState(
      runtimeMetadata,
      createDefaultBootstrapConfigState(runtimeMetadata),
      {
        database: fakeDatabase,
        fetchImplementation: async () => ({
          headers: {
            get(name: string) {
              const lower = name.toLowerCase();

              if (lower === 'x-bootstrap-content-hash') {
                return responseHash;
              }

              if (lower === 'x-bootstrap-signature') {
                return signature;
              }

              return null;
            },
          },
          json: async () => bootstrapResponse,
          ok: true,
          status: 200,
        }),
      },
    );

    expect(state.source).toBe('network');
    expect(state.lastError).toBeNull();
    expect(mockedUpsertJsonSetting).toHaveBeenCalledTimes(1);
  });

  it('keeps the prior state and marks the fallback stale on invalid signatures', async () => {
    const currentState = createDefaultBootstrapConfigState(runtimeMetadata);

    const state = await refreshBootstrapConfigState(runtimeMetadata, currentState, {
      database: fakeDatabase,
      fetchImplementation: async () => ({
        headers: {
          get(name: string) {
            if (name.toLowerCase() === 'x-bootstrap-content-hash') {
              return responseHash;
            }

            if (name.toLowerCase() === 'x-bootstrap-signature') {
              return 'invalid-signature';
            }

            return null;
          },
        },
        json: async () => bootstrapResponse,
        ok: true,
        status: 200,
      }),
    });

    expect(state.source).toBe('default');
    expect(state.isStale).toBe(true);
    expect(state.lastError).toMatch(/signature/i);
  });

  it('keeps the prior state on network loss', async () => {
    const currentState = createDefaultBootstrapConfigState(runtimeMetadata);

    const state = await refreshBootstrapConfigState(runtimeMetadata, currentState, {
      database: fakeDatabase,
      fetchImplementation: async () => {
        throw new Error('network unavailable');
      },
    });

    expect(state.source).toBe('default');
    expect(state.isStale).toBe(true);
    expect(state.lastError).toMatch(/network unavailable/i);
  });
});
