import type { BootstrapConfigResponse } from '@upi-spend-tracker/contracts';

import {
  BOOTSTRAP_CACHE_KEY,
  buildBootstrapRefreshFailureState,
  createInitialBootstrapConfigState,
  getDefaultBootstrapConfigQuery,
  hydrateBootstrapConfigCache,
  refreshBootstrapConfig,
} from '../src/features/bootstrap-config/runtime-config';
import { createIntegritySignature } from '@upi-spend-tracker/shared-utils';

jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItem: jest.fn(),
    removeItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

function getKvStoreMock() {
  return jest.requireMock('expo-sqlite/kv-store') as {
    Storage: {
      getItem: jest.Mock<Promise<string | null>, [string]>;
      removeItem: jest.Mock<Promise<void>, [string]>;
      setItem: jest.Mock<Promise<void>, [string, string]>;
    };
  };
}

function signConfig(
  config: Omit<BootstrapConfigResponse, 'signature'>,
): BootstrapConfigResponse {
  return {
    ...config,
    signature: createIntegritySignature(config),
  };
}

function buildConfig(overrides: Partial<BootstrapConfigResponse> = {}): BootstrapConfigResponse {
  const baseConfig: Omit<BootstrapConfigResponse, 'signature'> = {
    cacheTtlSeconds: 600,
    configVersion: 'bootstrap-android-beta-stub',
    copyOverrides: {
      home_remote_config_status: 'Remote config is current.',
    },
    dedupeConfig: {
      exactMatchWindowSeconds: 120,
      fuzzyMatchWindowSeconds: 300,
      merchantSimilarityThreshold: 0.88,
    },
    featureFlags: {
      budgets_enabled: false,
      notification_capture_enabled: true,
      search_enabled: true,
      showcase_enabled: true,
    },
    minSupportedVersion: '0.0.0',
    parserConfig: {
      parserKillSwitch: false,
      templates: {
        generic_upi_v1: {
          enabled: true,
          fields: {
            amount: 'amount',
            merchant: 'merchant',
          },
          sourceApps: ['google_pay'],
          version: '1.0.0',
        },
      },
    },
    rolloutChannel: 'beta',
    runtimeCompatibility: {
      compatible: true,
    },
    softUpgradeVersion: '0.1.0',
  };

  return signConfig({
    ...baseConfig,
    ...overrides,
  });
}

describe('bootstrap config runtime cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hydrates a fresh cached config instantly', async () => {
    const { Storage } = getKvStoreMock();
    const config = buildConfig();

    Storage.getItem.mockResolvedValue(
      JSON.stringify({
        config,
        fetchedAt: '2026-03-26T09:00:00.000Z',
      }),
    );

    await expect(
      hydrateBootstrapConfigCache(getDefaultBootstrapConfigQuery(), Date.parse('2026-03-26T09:05:00.000Z')),
    ).resolves.toMatchObject({
      config: expect.objectContaining({
        configVersion: 'bootstrap-android-beta-stub',
      }),
      fetchedAt: '2026-03-26T09:00:00.000Z',
      source: 'cache',
      status: 'fresh',
    });
  });

  it('drops cached config when the stored signature is invalid', async () => {
    const { Storage } = getKvStoreMock();
    const config = {
      ...buildConfig(),
      signature: 'invalid-signature',
    };

    Storage.getItem.mockResolvedValue(
      JSON.stringify({
        config,
        fetchedAt: '2026-03-26T09:00:00.000Z',
      }),
    );
    Storage.removeItem.mockResolvedValue(undefined);

    await expect(hydrateBootstrapConfigCache()).resolves.toBeNull();
    expect(Storage.removeItem).toHaveBeenCalledWith(BOOTSTRAP_CACHE_KEY);
  });

  it('stores a validated network refresh result', async () => {
    const { Storage } = getKvStoreMock();
    const config = buildConfig({
      configVersion: 'bootstrap-android-beta-network',
      rolloutChannel: 'beta',
    });

    Storage.setItem.mockResolvedValue(undefined);

    const snapshot = await refreshBootstrapConfig(
      getDefaultBootstrapConfigQuery(),
      jest.fn().mockResolvedValue({
        json: async () => config,
        ok: true,
        status: 200,
      }) as unknown as typeof fetch,
    );

    expect(snapshot.source).toBe('network');
    expect(snapshot.status).toBe('fresh');
    expect(Storage.setItem).toHaveBeenCalledWith(
      BOOTSTRAP_CACHE_KEY,
      expect.stringContaining('bootstrap-android-beta-network'),
    );
  });

  it('requests the bootstrap endpoint with version-aware query params', async () => {
    const { Storage } = getKvStoreMock();
    const config = buildConfig({
      configVersion: 'bootstrap-ios-internal-network',
      rolloutChannel: 'internal',
      runtimeCompatibility: {
        compatible: false,
        reason: 'Runtime expo-sdk-54-go is unsupported for ios.',
      },
    });
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => config,
      ok: true,
      status: 200,
    });

    Storage.setItem.mockResolvedValue(undefined);

    await refreshBootstrapConfig(
      {
        appVersion: '1.2.3',
        channel: 'internal',
        platform: 'ios',
        runtimeVersion: 'expo-sdk-54-go',
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/v1/bootstrap/config?platform=ios&appVersion=1.2.3&runtimeVersion=expo-sdk-54-go&channel=internal',
      ),
      expect.objectContaining({
        headers: {
          accept: 'application/json',
        },
      }),
    );
  });

  it('keeps the last cache observable when refresh fails', () => {
    const cachedState = {
      ...createInitialBootstrapConfigState(),
      config: buildConfig({
        configVersion: 'bootstrap-android-beta-cached',
      }),
      fetchedAt: '2026-03-26T09:00:00.000Z',
      message: 'Loaded cached beta bootstrap config instantly.',
      source: 'cache' as const,
      status: 'fresh' as const,
    };

    expect(
      buildBootstrapRefreshFailureState(cachedState, new Error('Network request failed')),
    ).toMatchObject({
      lastError: 'Network request failed',
      source: 'cache',
      status: 'stale',
    });
  });
});
