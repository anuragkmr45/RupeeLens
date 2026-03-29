import type {
  BootstrapConfigRequestQuery,
  BootstrapConfigResponse,
  BootstrapPlatform,
  CaptureDedupeConfig,
  ParserTemplateConfig,
  RolloutChannel,
} from '@upi-spend-tracker/contracts';
import { createIntegritySignature } from '@upi-spend-tracker/shared-utils';
import { Storage } from 'expo-sqlite/kv-store';
import * as Updates from 'expo-updates';
import { NativeModules, Platform } from 'react-native';

const BOOTSTRAP_CACHE_KEY = 'bootstrap_config_cache_v1';
const DEFAULT_APP_VERSION = '1.0.0';
const DEFAULT_RUNTIME_VERSION = 'expo-sdk-55-dev-client';

export type BootstrapConfigSource = 'cache' | 'fallback' | 'network';
export type BootstrapConfigStatus = 'fresh' | 'loading' | 'stale';

export interface BootstrapConfigState {
  config: BootstrapConfigResponse;
  fetchedAt: string | null;
  lastError?: string;
  message: string;
  source: BootstrapConfigSource;
  status: BootstrapConfigStatus;
}

interface CachedBootstrapConfigEnvelope {
  config: BootstrapConfigResponse;
  fetchedAt: string;
}

const VALID_CHANNELS: readonly RolloutChannel[] = ['internal', 'beta', 'production'];
const VALID_PLATFORMS: readonly BootstrapPlatform[] = ['android', 'ios'];

const FALLBACK_TEMPLATE: ParserTemplateConfig = {
  enabled: true,
  fields: {
    amount: '(?:rs\\.?|inr)?\\s?(?<amount>[\\d,]+(?:\\.\\d{1,2})?)',
    merchant: '(?:to|at)\\s(?<merchant>[A-Za-z0-9 &._-]+)',
    reference: '(?:ref|utr)[:\\s-]*(?<reference>[A-Za-z0-9-]{6,})',
  },
  sourceApps: ['google_pay', 'phonepe', 'paytm', 'bhim'],
  version: '1.0.0',
};

const FALLBACK_DEDUPE_CONFIG: CaptureDedupeConfig = {
  exactMatchWindowSeconds: 120,
  fuzzyMatchWindowSeconds: 300,
  merchantSimilarityThreshold: 0.88,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isRolloutChannel(value: unknown): value is RolloutChannel {
  return typeof value === 'string' && VALID_CHANNELS.includes(value as RolloutChannel);
}

function isBootstrapPlatform(value: unknown): value is BootstrapPlatform {
  return typeof value === 'string' && VALID_PLATFORMS.includes(value as BootstrapPlatform);
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'boolean');
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

function isParserTemplateConfig(value: unknown): value is ParserTemplateConfig {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.enabled === 'boolean' &&
    isStringRecord(value.fields) &&
    Array.isArray(value.sourceApps) &&
    value.sourceApps.every((sourceApp) => typeof sourceApp === 'string') &&
    typeof value.version === 'string'
  );
}

function isCaptureDedupeConfig(value: unknown): value is CaptureDedupeConfig {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.exactMatchWindowSeconds === 'number' &&
    value.exactMatchWindowSeconds > 0 &&
    typeof value.fuzzyMatchWindowSeconds === 'number' &&
    value.fuzzyMatchWindowSeconds > 0 &&
    typeof value.merchantSimilarityThreshold === 'number' &&
    value.merchantSimilarityThreshold > 0 &&
    value.merchantSimilarityThreshold <= 1
  );
}

function isBootstrapConfigResponse(value: unknown): value is BootstrapConfigResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.cacheTtlSeconds !== 'number' ||
    typeof value.configVersion !== 'string' ||
    !isCaptureDedupeConfig(value.dedupeConfig) ||
    !isBooleanRecord(value.featureFlags) ||
    typeof value.minSupportedVersion !== 'string' ||
    !isRolloutChannel(value.rolloutChannel) ||
    typeof value.signature !== 'string' ||
    typeof value.softUpgradeVersion !== 'string' ||
    !isRecord(value.parserConfig) ||
    typeof value.parserConfig.parserKillSwitch !== 'boolean' ||
    !isRecord(value.parserConfig.templates)
  ) {
    return false;
  }

  if (!Object.values(value.parserConfig.templates).every((template) => isParserTemplateConfig(template))) {
    return false;
  }

  if (value.copyOverrides !== undefined && !isStringRecord(value.copyOverrides)) {
    return false;
  }

  if (value.runtimeCompatibility !== undefined) {
    if (
      !isRecord(value.runtimeCompatibility) ||
      typeof value.runtimeCompatibility.compatible !== 'boolean' ||
      (value.runtimeCompatibility.reason !== undefined &&
        typeof value.runtimeCompatibility.reason !== 'string')
    ) {
      return false;
    }
  }

  return true;
}

function hasValidBootstrapSignature(config: BootstrapConfigResponse): boolean {
  const { signature, ...unsignedConfig } = config;
  return signature === createIntegritySignature(unsignedConfig);
}

function isCachedBootstrapConfigEnvelope(
  value: unknown,
): value is CachedBootstrapConfigEnvelope {
  return (
    isRecord(value) &&
    typeof value.fetchedAt === 'string' &&
    isBootstrapConfigResponse(value.config) &&
    hasValidBootstrapSignature(value.config)
  );
}

function resolveRolloutChannel(): RolloutChannel {
  const updatesChannel = Updates.channel;

  if (isRolloutChannel(updatesChannel)) {
    return updatesChannel;
  }

  const publicReleaseChannel = process.env.EXPO_PUBLIC_RELEASE_CHANNEL;

  if (isRolloutChannel(publicReleaseChannel)) {
    return publicReleaseChannel;
  }

  return __DEV__ ? 'beta' : 'production';
}

function resolveRuntimeVersion(): string {
  return typeof Updates.runtimeVersion === 'string' && Updates.runtimeVersion.trim().length > 0
    ? Updates.runtimeVersion.trim()
    : DEFAULT_RUNTIME_VERSION;
}

function getFeatureFlagsForChannel(channel: RolloutChannel): Record<string, boolean> {
  switch (channel) {
    case 'internal':
      return {
        budgets_enabled: false,
        notification_capture_enabled: true,
        search_enabled: true,
        showcase_enabled: true,
      };
    case 'beta':
      return {
        budgets_enabled: false,
        notification_capture_enabled: true,
        search_enabled: true,
        showcase_enabled: true,
      };
    case 'production':
    default:
      return {
        budgets_enabled: false,
        notification_capture_enabled: true,
        search_enabled: false,
        showcase_enabled: false,
      };
  }
}

function buildFallbackBootstrapConfig(channel: RolloutChannel): BootstrapConfigResponse {
  const responseWithoutSignature: Omit<BootstrapConfigResponse, 'signature'> = {
    cacheTtlSeconds: channel === 'internal' ? 300 : channel === 'beta' ? 600 : 900,
    configVersion: `fallback-${channel}-v1`,
    copyOverrides: {
      home_remote_config_status:
        'Using the built-in bootstrap fallback while the app refreshes feature flags and parser templates in the background.',
    },
    dedupeConfig: FALLBACK_DEDUPE_CONFIG,
    featureFlags: getFeatureFlagsForChannel(channel),
    minSupportedVersion: '0.0.0',
    parserConfig: {
      parserKillSwitch: false,
      templates: {
        generic_upi_v1: FALLBACK_TEMPLATE,
      },
    },
    rolloutChannel: channel,
    runtimeCompatibility: {
      compatible: true,
    },
    softUpgradeVersion: '0.1.0',
  };

  return {
    ...responseWithoutSignature,
    signature: createIntegritySignature(responseWithoutSignature),
  };
}

function buildBootstrapMessage(
  source: BootstrapConfigSource,
  status: BootstrapConfigStatus,
  config: BootstrapConfigResponse,
): string {
  if (status === 'loading') {
    return 'Loading cached bootstrap config. A background refresh starts immediately after launch.';
  }

  if (source === 'network') {
    return `Fresh ${config.rolloutChannel} bootstrap config loaded from the API. Feature flags and parser templates are now current for this build.`;
  }

  if (source === 'cache' && status === 'fresh') {
    return `Loaded cached ${config.rolloutChannel} bootstrap config instantly. A background refresh still runs to pick up newer flags or parser templates.`;
  }

  if (source === 'cache') {
    return `Using stale cached ${config.rolloutChannel} config while refresh retries. The last good flags and parser templates stay active until the API responds again.`;
  }

  return 'Using the built-in bootstrap fallback because no valid remote config is available yet. Refresh will keep retrying in the background.';
}

function buildBootstrapState(
  config: BootstrapConfigResponse,
  fetchedAt: string | null,
  source: BootstrapConfigSource,
  status: BootstrapConfigStatus,
  lastError?: string,
): BootstrapConfigState {
  return {
    config,
    fetchedAt,
    message: buildBootstrapMessage(source, status, config),
    source,
    status,
    ...(lastError ? { lastError } : {}),
  };
}

function getFallbackPlatform(): BootstrapPlatform {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

function getMetroHost(): string | null {
  const sourceCode = NativeModules.SourceCode as { scriptURL?: unknown } | undefined;
  const platformConstants = NativeModules.PlatformConstants as { serverHost?: unknown } | undefined;

  if (typeof sourceCode?.scriptURL === 'string') {
    try {
      return new URL(sourceCode.scriptURL).hostname;
    } catch {
      return null;
    }
  }

  if (typeof platformConstants?.serverHost === 'string' && platformConstants.serverHost.length > 0) {
    return platformConstants.serverHost.split(':')[0] ?? null;
  }

  return null;
}

export function getDefaultBootstrapConfigQuery(): BootstrapConfigRequestQuery {
  return {
    appVersion: DEFAULT_APP_VERSION,
    channel: resolveRolloutChannel(),
    platform: getFallbackPlatform(),
    runtimeVersion: resolveRuntimeVersion(),
  };
}

export function createInitialBootstrapConfigState(
  query = getDefaultBootstrapConfigQuery(),
): BootstrapConfigState {
  return buildBootstrapState(
    buildFallbackBootstrapConfig(query.channel ?? 'production'),
    null,
    'fallback',
    'loading',
  );
}

export async function hydrateBootstrapConfigCache(
  _query = getDefaultBootstrapConfigQuery(),
  now = Date.now(),
): Promise<BootstrapConfigState | null> {
  const storedValue = await Storage.getItem(BOOTSTRAP_CACHE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (!isCachedBootstrapConfigEnvelope(parsedValue)) {
      await Storage.removeItem(BOOTSTRAP_CACHE_KEY);
      return null;
    }

    const fetchedAtMs = new Date(parsedValue.fetchedAt).getTime();
    const isStale =
      Number.isNaN(fetchedAtMs) ||
      now - fetchedAtMs > parsedValue.config.cacheTtlSeconds * 1000;

    return buildBootstrapState(
      parsedValue.config,
      parsedValue.fetchedAt,
      'cache',
      isStale ? 'stale' : 'fresh',
    );
  } catch {
    await Storage.removeItem(BOOTSTRAP_CACHE_KEY);
    return null;
  }
}

export function resolveBootstrapBaseUrl(
  platform = getFallbackPlatform(),
): string {
  if (__DEV__) {
    const metroHost = getMetroHost();

    if (metroHost) {
      return `http://${metroHost}:3000`;
    }

    return platform === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  }

  return 'https://api.example.com';
}

export async function refreshBootstrapConfig(
  query = getDefaultBootstrapConfigQuery(),
  fetchImplementation: typeof globalThis.fetch | undefined = globalThis.fetch,
): Promise<BootstrapConfigState> {
  if (typeof fetchImplementation !== 'function') {
    throw new Error('Fetch API is unavailable in this runtime.');
  }

  const requestUrl = new URL('/v1/bootstrap/config', resolveBootstrapBaseUrl(query.platform));
  requestUrl.searchParams.set('platform', query.platform);
  requestUrl.searchParams.set('appVersion', query.appVersion);
  requestUrl.searchParams.set('runtimeVersion', query.runtimeVersion);

  if (query.channel) {
    requestUrl.searchParams.set('channel', query.channel);
  }

  const response = await fetchImplementation(requestUrl.toString(), {
    headers: {
      accept: 'application/json',
    },
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(`Bootstrap config request failed with ${response.status}.`);
  }

  if (!isBootstrapConfigResponse(payload)) {
    throw new Error('Bootstrap config response shape is invalid.');
  }

  if (!hasValidBootstrapSignature(payload)) {
    throw new Error('Bootstrap config signature check failed.');
  }

  const fetchedAt = new Date().toISOString();
  const envelope: CachedBootstrapConfigEnvelope = {
    config: payload,
    fetchedAt,
  };

  await Storage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(envelope));

  return buildBootstrapState(payload, fetchedAt, 'network', 'fresh');
}

export function buildBootstrapRefreshFailureState(
  currentState: BootstrapConfigState,
  error: unknown,
): BootstrapConfigState {
  const lastError = error instanceof Error ? error.message : 'Bootstrap refresh failed.';

  if (currentState.source === 'cache') {
    return buildBootstrapState(
      currentState.config,
      currentState.fetchedAt,
      'cache',
      'stale',
      lastError,
    );
  }

  return buildBootstrapState(
    currentState.config,
    currentState.fetchedAt,
    'fallback',
    'stale',
    lastError,
  );
}

export function isRemoteCapturePaused(config: BootstrapConfigResponse): boolean {
  return (
    !config.featureFlags.notification_capture_enabled ||
    config.parserConfig.parserKillSwitch ||
    config.runtimeCompatibility?.compatible === false
  );
}

export function getEnabledParserTemplateIds(config: BootstrapConfigResponse): string[] {
  return Object.entries(config.parserConfig.templates)
    .filter(([, template]) => template.enabled)
    .map(([templateId]) => templateId)
    .sort();
}

export function formatRolloutChannel(channel: RolloutChannel): string {
  switch (channel) {
    case 'internal':
      return 'Internal';
    case 'beta':
      return 'Beta';
    case 'production':
    default:
      return 'Production';
  }
}

export { BOOTSTRAP_CACHE_KEY, isBootstrapConfigResponse, isBootstrapPlatform };
