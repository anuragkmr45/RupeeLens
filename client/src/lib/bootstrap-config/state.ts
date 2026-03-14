import type { BootstrapConfigResponse } from '@upi-spend-tracker/contracts';

import type { BootstrapRuntimeMetadata } from './runtime';

export const bootstrapConfigStateSettingKey = 'remote_config.state';

export type BootstrapConfigSource = 'default' | 'cache' | 'network';

export interface StoredBootstrapConfigState {
  cachedAt: string;
  contentHash: string;
  expiresAt: string;
  response: BootstrapConfigResponse;
  signature: string;
}

export interface BootstrapConfigState {
  config: BootstrapConfigResponse;
  contentHash: string | null;
  isStale: boolean;
  lastError: string | null;
  lastRefreshAt: string | null;
  signature: string | null;
  source: BootstrapConfigSource;
}

export function createDefaultBootstrapConfig(
  runtimeMetadata: BootstrapRuntimeMetadata,
): BootstrapConfigResponse {
  return {
    cacheTtlSeconds: 300,
    configVersion: 'local-default-2026-03-14',
    copyOverrides: {
      configBanner: 'Using bundled fallback config',
    },
    featureFlags: {},
    minSupportedVersion: runtimeMetadata.appVersion,
    parserConfig: {
      globalKillSwitch: false,
      parserAssignments: {},
      parserTemplates: {},
    },
    rolloutChannel: runtimeMetadata.channel,
    runtimeCompatibility: {
      compatible: true,
    },
    softUpgradeVersion: runtimeMetadata.appVersion,
  };
}

export function createDefaultBootstrapConfigState(
  runtimeMetadata: BootstrapRuntimeMetadata,
  error: string | null = null,
): BootstrapConfigState {
  return {
    config: createDefaultBootstrapConfig(runtimeMetadata),
    contentHash: null,
    isStale: false,
    lastError: error,
    lastRefreshAt: null,
    signature: null,
    source: 'default',
  };
}
