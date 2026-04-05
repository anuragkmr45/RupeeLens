import {
  act,
  fireEvent,
  render,
  waitFor,
  type RenderAPI,
} from '@testing-library/react-native';
import { Alert, AppState, Linking, Share } from 'react-native';

import App from '../App';
import {
  DEFAULT_BUDGET_ALERT_SETTINGS,
  getDefaultCategories,
  seededTransactions,
  type Transaction,
} from '../src/features/spend-tracker/domain';
import type {
  NativeCaptureDedupeConfig,
  NativeCaptureEventRecord,
  NativeCaptureDiagnostics,
  NativeCaptureReplyRecord,
} from '../src/features/android-capture/native-capture';
import type { BootstrapConfigState } from '../src/features/bootstrap-config/runtime-config';
import {
  DEFAULT_ONBOARDING_PREFERENCES,
  loadStoredSpendTrackerState,
  saveStoredSpendTrackerState,
} from '../src/features/spend-tracker/persistence';
import {
  createInitialSyncState,
  type PersistedSyncState,
} from '../src/features/sync/domain';
import {
  loadStoredSyncCredentials,
  saveStoredSyncCredentials,
  loadStoredSyncState,
  saveStoredSyncState,
} from '../src/features/sync/persistence';
import type { StoredSyncCredentials } from '../src/features/sync/session';

jest.mock('../src/lib/platform-capabilities', () => ({
  getPlatformCapabilities: jest.fn(() => ({
    platform: 'android',
    prefersBottomPrimaryNavigation: false,
    supportsNativeCaptureDiagnostics: true,
    supportsNativeNotificationCapture: true,
  })),
}));

jest.mock('../src/features/spend-tracker/persistence', () => ({
  DEFAULT_ONBOARDING_PREFERENCES: {
    budgetCycleId: 'calendar_month',
    selectedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
    syncMode: 'local_only',
  },
  clearStoredSpendTrackerState: jest.fn().mockResolvedValue(undefined),
  loadStoredSpendTrackerState: jest.fn().mockResolvedValue(null),
  saveStoredSpendTrackerState: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/features/sync/persistence', () => ({
  clearStoredSyncCredentials: jest.fn().mockResolvedValue(undefined),
  clearStoredSyncState: jest.fn().mockResolvedValue(undefined),
  loadStoredSyncCredentials: jest.fn().mockResolvedValue(null),
  loadStoredSyncState: jest.fn().mockResolvedValue({
    conflicts: [],
    deviceId: 'device_local_test',
    entityVersions: [],
    lastCursor: null,
    lastErrorMessage: null,
    lastStatus: 'idle',
    lastSyncAttemptAt: null,
    lastSyncSuccessAt: null,
    outbox: [],
  }),
  saveStoredSyncCredentials: jest.fn().mockResolvedValue(undefined),
  saveStoredSyncState: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/features/sync/runtime', () => ({
  probeSyncReachability: jest.fn().mockResolvedValue({
    checkedAt: '2026-03-30T10:00:00.000Z',
    isExpensive: false,
    status: 'online',
  }),
  runSyncCycle: jest.fn(async ({ syncState }) => syncState),
}));

jest.mock('../src/features/sync/session', () => ({
  buildDefaultSyncDeviceName: jest.fn(() => 'Android device'),
  consumeSyncPairingCode: jest.fn(),
  createGuestSyncSession: jest.fn(),
  createSyncPairingCode: jest.fn(),
  ensureFreshSyncCredentials: jest.fn(async ({ credentials }) => credentials),
}));

jest.mock('../src/features/telemetry/runtime', () => ({
  enqueueTelemetryEvent: jest.fn().mockResolvedValue(1),
  flushTelemetryEvents: jest.fn().mockResolvedValue({
    acceptedCount: 0,
    duplicateCount: 0,
    remainingCount: 0,
  }),
  installGlobalTelemetryErrorHandler: jest.fn(() => jest.fn()),
}));

jest.mock('expo-file-system/legacy', () => ({
  EncodingType: {
    UTF8: 'utf8',
  },
  cacheDirectory: 'file:///mock-cache/',
  documentDirectory: 'file:///mock-documents/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/features/bootstrap-config/runtime-config', () => ({
  buildBootstrapRefreshFailureState: jest.fn((currentState, error) => ({
    ...currentState,
    lastError:
      error instanceof Error ? error.message : 'Bootstrap refresh failed.',
    message: 'Using stale cached config while refresh retries.',
    status: 'stale',
  })),
  createInitialBootstrapConfigState: jest.fn(() => ({
    config: {
      cacheTtlSeconds: 600,
      configVersion: 'bootstrap-beta-fallback',
      copyOverrides: {
        home_remote_config_status: 'Using fallback config.',
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
      signature: 'test-signature',
      softUpgradeVersion: '0.1.0',
    },
    fetchedAt: null,
    message: 'Loading cached bootstrap config.',
    source: 'fallback',
    status: 'loading',
  })),
  formatRolloutChannel: jest.fn((channel: string) =>
    channel === 'beta'
      ? 'Beta'
      : channel === 'internal'
        ? 'Internal'
        : 'Production',
  ),
  getDefaultBootstrapConfigQuery: jest.fn(() => ({
    appVersion: '1.0.0',
    channel: 'beta',
    platform: 'android',
    runtimeVersion: 'expo-sdk-55-dev-client',
  })),
  getEnabledParserTemplateIds: jest.fn((config) =>
    Object.entries(config.parserConfig.templates)
      .filter(([, template]) => (template as { enabled: boolean }).enabled)
      .map(([templateId]) => templateId),
  ),
  hydrateBootstrapConfigCache: jest.fn().mockResolvedValue({
    config: {
      cacheTtlSeconds: 600,
      configVersion: 'bootstrap-beta-cached',
      copyOverrides: {
        home_remote_config_status: 'Cached config ready.',
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
      signature: 'test-signature',
      softUpgradeVersion: '0.1.0',
    },
    fetchedAt: '2026-03-26T10:00:00.000Z',
    message:
      'Loaded cached beta bootstrap config instantly. A background refresh still runs to pick up newer flags or parser templates.',
    source: 'cache',
    status: 'fresh',
  }),
  isRemoteCapturePaused: jest.fn(
    (config) =>
      !config.featureFlags.notification_capture_enabled ||
      config.parserConfig.parserKillSwitch ||
      config.runtimeCompatibility?.compatible === false,
  ),
  refreshBootstrapConfig: jest.fn().mockResolvedValue({
    config: {
      cacheTtlSeconds: 300,
      configVersion: 'bootstrap-beta-network',
      copyOverrides: {
        home_remote_config_status: 'Fresh network config.',
      },
      dedupeConfig: {
        exactMatchWindowSeconds: 90,
        fuzzyMatchWindowSeconds: 420,
        merchantSimilarityThreshold: 0.8,
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
          experimental_upi_v2: {
            enabled: true,
            fields: {
              amount: 'amount',
              merchant: 'merchant',
            },
            sourceApps: ['google_pay', 'phonepe'],
            version: '2.0.0',
          },
        },
      },
      rolloutChannel: 'beta',
      runtimeCompatibility: {
        compatible: true,
      },
      signature: 'test-signature',
      softUpgradeVersion: '0.1.0',
    },
    fetchedAt: '2026-03-26T10:02:00.000Z',
    message:
      'Fresh beta bootstrap config loaded from the API. Feature flags and parser templates are now current for this build.',
    source: 'network',
    status: 'fresh',
  }),
}));

jest.mock('../src/features/android-capture/native-capture', () => ({
  clearStoredCaptureSnapshots: jest.fn().mockResolvedValue({
    allowedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
    dedupeConfig: {
      exactMatchWindowSeconds: 120,
      fuzzyMatchWindowSeconds: 300,
      merchantSimilarityThreshold: 0.88,
    },
    exactDuplicateCount: 0,
    fuzzyDuplicateCount: 0,
    lastCapture: null,
    lastDedupeDecision: null,
    listenerPermissionGranted: false,
    recentCaptureLog: [],
    recentParseFailures: [],
    serviceAvailable: true,
    storedSnapshotCount: 0,
    supportedParsers: [],
  }),
  DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS: {
    allowedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
    dedupeConfig: {
      exactMatchWindowSeconds: 120,
      fuzzyMatchWindowSeconds: 300,
      merchantSimilarityThreshold: 0.88,
    },
    exactDuplicateCount: 0,
    fuzzyDuplicateCount: 0,
    lastCapture: null,
    lastDedupeDecision: null,
    listenerPermissionGranted: false,
    recentCaptureLog: [],
    recentParseFailures: [],
    serviceAvailable: true,
    storedSnapshotCount: 0,
    supportedParsers: [],
  },
  getNativeCaptureEvent: jest.fn().mockResolvedValue(null),
  getNativeCaptureDiagnostics: jest.fn().mockResolvedValue({
    allowedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
    dedupeConfig: {
      exactMatchWindowSeconds: 120,
      fuzzyMatchWindowSeconds: 300,
      merchantSimilarityThreshold: 0.88,
    },
    exactDuplicateCount: 0,
    fuzzyDuplicateCount: 0,
    lastCapture: null,
    lastDedupeDecision: null,
    listenerPermissionGranted: false,
    recentCaptureLog: [],
    recentParseFailures: [],
    serviceAvailable: true,
    storedSnapshotCount: 0,
    supportedParsers: [],
  }),
  getPendingNativeCaptureEvents: jest.fn().mockResolvedValue([]),
  markNativeCaptureImportFailed: jest.fn().mockResolvedValue(undefined),
  markNativeCaptureImported: jest.fn().mockResolvedValue(undefined),
  setNativeCaptureDedupeConfig: jest.fn().mockResolvedValue({
    allowedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
    dedupeConfig: {
      exactMatchWindowSeconds: 120,
      fuzzyMatchWindowSeconds: 300,
      merchantSimilarityThreshold: 0.88,
    },
    exactDuplicateCount: 0,
    fuzzyDuplicateCount: 0,
    lastCapture: null,
    lastDedupeDecision: null,
    listenerPermissionGranted: false,
    recentCaptureLog: [],
    recentParseFailures: [],
    serviceAvailable: true,
    storedSnapshotCount: 0,
    supportedParsers: [],
  }),
  setAllowedSourceApps: jest.fn().mockResolvedValue({
    allowedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
    dedupeConfig: {
      exactMatchWindowSeconds: 120,
      fuzzyMatchWindowSeconds: 300,
      merchantSimilarityThreshold: 0.88,
    },
    exactDuplicateCount: 0,
    fuzzyDuplicateCount: 0,
    lastCapture: null,
    lastDedupeDecision: null,
    listenerPermissionGranted: false,
    recentCaptureLog: [],
    recentParseFailures: [],
    serviceAvailable: true,
    storedSnapshotCount: 0,
    supportedParsers: [],
  }),
  setNativeCapturePrivacyModeEnabled: jest.fn().mockResolvedValue({
    allowedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
    dedupeConfig: {
      exactMatchWindowSeconds: 120,
      fuzzyMatchWindowSeconds: 300,
      merchantSimilarityThreshold: 0.88,
    },
    exactDuplicateCount: 0,
    fuzzyDuplicateCount: 0,
    lastCapture: null,
    lastDedupeDecision: null,
    listenerPermissionGranted: false,
    recentCaptureLog: [],
    recentParseFailures: [],
    serviceAvailable: true,
    storedSnapshotCount: 0,
    supportedParsers: [],
  }),
  subscribeToPendingCaptureEvents: jest.fn(() => jest.fn()),
}));

const mockedLoadStoredSpendTrackerState =
  loadStoredSpendTrackerState as jest.MockedFunction<
    typeof loadStoredSpendTrackerState
  >;
const mockedSaveStoredSpendTrackerState =
  saveStoredSpendTrackerState as jest.MockedFunction<
    typeof saveStoredSpendTrackerState
  >;
const mockedLoadStoredSyncState = loadStoredSyncState as jest.MockedFunction<
  typeof loadStoredSyncState
>;
const mockedLoadStoredSyncCredentials =
  loadStoredSyncCredentials as jest.MockedFunction<
    typeof loadStoredSyncCredentials
  >;
const mockedSaveStoredSyncCredentials =
  saveStoredSyncCredentials as jest.MockedFunction<
    typeof saveStoredSyncCredentials
  >;
const mockedSaveStoredSyncState = saveStoredSyncState as jest.MockedFunction<
  typeof saveStoredSyncState
>;
const mockedSyncSessionModule = jest.requireMock(
  '../src/features/sync/session',
) as {
  consumeSyncPairingCode: jest.Mock<Promise<StoredSyncCredentials>, [unknown]>;
  createGuestSyncSession: jest.Mock<Promise<StoredSyncCredentials>, [unknown]>;
  createSyncPairingCode: jest.Mock<
    Promise<{ expiresAt: string; pairingCode: string }>,
    [unknown]
  >;
  ensureFreshSyncCredentials: jest.Mock<
    Promise<StoredSyncCredentials>,
    [
      {
        credentials: StoredSyncCredentials;
        fetchImplementation?: typeof globalThis.fetch;
        now?: string;
      },
    ]
  >;
};
const mockedBootstrapConfigModule = jest.requireMock(
  '../src/features/bootstrap-config/runtime-config',
) as {
  hydrateBootstrapConfigCache: jest.Mock<
    Promise<BootstrapConfigState | null>,
    []
  >;
  refreshBootstrapConfig: jest.Mock<Promise<BootstrapConfigState>, []>;
};
const mockedNativeCaptureModule = jest.requireMock(
  '../src/features/android-capture/native-capture',
) as {
  getNativeCaptureEvent: jest.Mock<
    Promise<NativeCaptureEventRecord | null>,
    [number]
  >;
  getNativeCaptureDiagnostics: jest.Mock<Promise<NativeCaptureDiagnostics>, []>;
  getPendingNativeCaptureEvents: jest.Mock<
    Promise<NativeCaptureEventRecord[]>,
    [number?]
  >;
  markNativeCaptureImportFailed: jest.Mock<Promise<void>, [number, string]>;
  markNativeCaptureImported: jest.Mock<Promise<void>, [number, string]>;
  setNativeCaptureDedupeConfig: jest.Mock<
    Promise<NativeCaptureDiagnostics>,
    [NativeCaptureDedupeConfig]
  >;
  setAllowedSourceApps: jest.Mock<
    Promise<NativeCaptureDiagnostics>,
    [string[]]
  >;
  setNativeCapturePrivacyModeEnabled: jest.Mock<
    Promise<NativeCaptureDiagnostics>,
    [boolean]
  >;
  subscribeToPendingCaptureEvents: jest.Mock<
    () => void,
    [(captureEventId: number | null) => void]
  >;
};
const mockedFileSystem = jest.requireMock('expo-file-system/legacy') as {
  writeAsStringAsync: jest.Mock<
    Promise<void>,
    [string, string, { encoding: string }]
  >;
};
const mockedPlatformCapabilitiesModule = jest.requireMock(
  '../src/lib/platform-capabilities',
) as {
  getPlatformCapabilities: jest.Mock<
    {
      platform: 'android' | 'ios';
      prefersBottomPrimaryNavigation: boolean;
      supportsNativeCaptureDiagnostics: boolean;
      supportsNativeNotificationCapture: boolean;
    },
    []
  >;
};
const mockedTelemetryModule = jest.requireMock(
  '../src/features/telemetry/runtime',
) as {
  enqueueTelemetryEvent: jest.Mock<Promise<number>, [unknown]>;
  flushTelemetryEvents: jest.Mock<
    Promise<{
      acceptedCount: number;
      duplicateCount: number;
      remainingCount: number;
    }>,
    [unknown]
  >;
  installGlobalTelemetryErrorHandler: jest.Mock<
    () => void,
    [(error: unknown, isFatal: boolean) => void]
  >;
};

function buildMockBootstrapState(
  overrides: Partial<BootstrapConfigState> = {},
): BootstrapConfigState {
  return {
    config: {
      cacheTtlSeconds: 600,
      configVersion: 'bootstrap-beta-test',
      copyOverrides: {
        home_remote_config_status: 'Test config',
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
      signature: 'test-signature',
      softUpgradeVersion: '0.1.0',
    },
    fetchedAt: '2026-03-26T10:00:00.000Z',
    message: 'Loaded cached beta bootstrap config instantly.',
    source: 'cache',
    status: 'fresh',
    ...overrides,
  };
}

function buildMockPlatformCapabilities(
  overrides: Partial<
    ReturnType<typeof mockedPlatformCapabilitiesModule.getPlatformCapabilities>
  > = {},
) {
  return {
    platform: 'android' as const,
    prefersBottomPrimaryNavigation: false,
    supportsNativeCaptureDiagnostics: true,
    supportsNativeNotificationCapture: true,
    ...overrides,
  };
}

function buildMockCaptureDiagnostics(
  overrides: Partial<NativeCaptureDiagnostics> = {},
): NativeCaptureDiagnostics {
  return {
    allowedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
    dedupeConfig: {
      exactMatchWindowSeconds: 120,
      fuzzyMatchWindowSeconds: 300,
      merchantSimilarityThreshold: 0.88,
    },
    exactDuplicateCount: 0,
    fuzzyDuplicateCount: 0,
    lastCapture: null,
    lastDedupeDecision: null,
    listenerPermissionGranted: false,
    recentCaptureLog: [],
    recentParseFailures: [],
    serviceAvailable: true,
    storedSnapshotCount: 0,
    supportedParsers: [],
    ...overrides,
  };
}

function buildMockNativeCaptureEvent(
  overrides: Partial<NativeCaptureEventRecord> = {},
  replyOverrides: Partial<NativeCaptureReplyRecord>[] = [],
): NativeCaptureEventRecord {
  return {
    captureEventId: 401,
    captureState: 'captured',
    capturedAtMs: new Date('2026-03-30T08:40:00.000Z').getTime(),
    merchantRaw: 'Native Chai Stall',
    notificationKey: 'capture-native-401',
    parsedAmountMinor: 18900,
    parsedTimestampMs: new Date('2026-03-30T08:38:00.000Z').getTime(),
    parserInfo: {
      confidenceBps: 9800,
      parserId: 'gpay_upi_v1',
      parserVersion: '1.0.0',
    },
    replies: replyOverrides.map((replyOverride, index) => ({
      actionType: 'direct_reply',
      captureEventId: 401,
      createdAtMs: new Date('2026-03-30T08:41:00.000Z').getTime() + index,
      itemLabel: 'Morning chai',
      replyId: index + 1,
      replyText: 'Morning chai',
      ...replyOverride,
    })),
    sourceAppId: 'google_pay',
    syncState: 'pending_import',
    ...overrides,
  };
}

function buildHighVolumeInboxTransactions(
  totalTransactions = 1_000,
): Transaction[] {
  return [
    {
      amountMinor: 79900,
      capturedAt: '2026-03-18T09:12:00+05:30',
      id: 'txn_target_inbox_scale',
      items: [],
      merchant: 'Target Merchant',
      sourceApp: 'Google Pay',
      status: 'uncategorized',
    },
    ...Array.from({ length: totalTransactions - 1 }, (_, index) => ({
      amountMinor: 19900,
      capturedAt: '2026-03-29T08:34:00+05:30',
      id: `txn_inbox_scale_${index + 1}`,
      items: [],
      merchant: `Merchant ${String(index + 1).padStart(4, '0')}`,
      sourceApp: 'PhonePe',
      status: 'uncategorized' as const,
    })),
  ];
}

async function flushVirtualizedListTimers(): Promise<void> {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
}

async function renderApp(): Promise<RenderAPI> {
  const screen = render(<App />);

  await act(async () => {
    await Promise.resolve();
  });

  return screen;
}

function buildDefaultCategories() {
  return getDefaultCategories();
}

function buildStoredState(
  overrides: Partial<
    NonNullable<Awaited<ReturnType<typeof loadStoredSpendTrackerState>>>
  > = {},
) {
  return {
    budgetAlertSettings: DEFAULT_BUDGET_ALERT_SETTINGS,
    budgetAlerts: [],
    budgets: [],
    categories: buildDefaultCategories(),
    merchantAliases: [],
    merchants: [],
    onboardingCompleted: true,
    onboardingPreferences: DEFAULT_ONBOARDING_PREFERENCES,
    notificationAccessState: 'settings_opened' as const,
    privacyModeEnabled: false,
    rules: [],
    transactions: [],
    ...overrides,
  };
}

function buildStoredSyncState(
  overrides: Partial<PersistedSyncState> = {},
): PersistedSyncState {
  return {
    ...createInitialSyncState('2026-03-30T09:55:00.000Z'),
    deviceId: 'device_local_test',
    ...overrides,
  };
}

function buildStoredSyncCredentials(
  overrides: Partial<StoredSyncCredentials> = {},
): StoredSyncCredentials {
  return {
    accessToken: 'access-token-1',
    accessTokenExpiresAt: '2026-03-30T11:00:00.000Z',
    apiBaseUrl: 'http://localhost:3000',
    deviceId: 'device_remote_1',
    refreshToken: 'refresh-token-1',
    userId: 'user_remote_1',
    ...overrides,
  };
}

type EnsureFreshSyncCredentialsArgs = Parameters<
  typeof mockedSyncSessionModule.ensureFreshSyncCredentials
>[0];

describe('App', () => {
  let originalConsoleWarn: typeof console.warn;

  beforeEach(() => {
    originalConsoleWarn = console.warn;
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation((message, ...args) => {
      if (
        typeof message === 'string' &&
        message.includes('SafeAreaView has been deprecated')
      ) {
        return;
      }

      originalConsoleWarn(message, ...args);
    });
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    jest
      .spyOn(Linking, 'addEventListener')
      .mockImplementation(
        () =>
          ({ remove: jest.fn() }) as unknown as ReturnType<
            typeof Linking.addEventListener
          >,
      );
    mockedLoadStoredSpendTrackerState.mockResolvedValue(null);
    mockedSaveStoredSpendTrackerState.mockResolvedValue(undefined);
    mockedLoadStoredSyncCredentials.mockResolvedValue(null);
    mockedSaveStoredSyncCredentials.mockResolvedValue(undefined);
    mockedLoadStoredSyncState.mockResolvedValue(buildStoredSyncState());
    mockedSaveStoredSyncState.mockResolvedValue(undefined);
    mockedSyncSessionModule.consumeSyncPairingCode.mockResolvedValue(
      buildStoredSyncCredentials({
        deviceId: 'device_remote_2',
      }),
    );
    mockedSyncSessionModule.createGuestSyncSession.mockResolvedValue(
      buildStoredSyncCredentials(),
    );
    mockedSyncSessionModule.createSyncPairingCode.mockResolvedValue({
      expiresAt: '2026-03-30T12:00:00.000Z',
      pairingCode: 'ABCD1234',
    });
    mockedSyncSessionModule.ensureFreshSyncCredentials.mockImplementation(
      async ({ credentials }: EnsureFreshSyncCredentialsArgs) => credentials,
    );
    mockedNativeCaptureModule.getNativeCaptureDiagnostics.mockResolvedValue(
      buildMockCaptureDiagnostics(),
    );
    mockedNativeCaptureModule.getNativeCaptureEvent.mockResolvedValue(null);
    mockedNativeCaptureModule.getPendingNativeCaptureEvents.mockResolvedValue(
      [],
    );
    mockedNativeCaptureModule.markNativeCaptureImportFailed.mockResolvedValue(
      undefined,
    );
    mockedNativeCaptureModule.markNativeCaptureImported.mockResolvedValue(
      undefined,
    );
    mockedNativeCaptureModule.setNativeCaptureDedupeConfig.mockImplementation(
      async (dedupeConfig) => {
        const diagnostics =
          await mockedNativeCaptureModule.getNativeCaptureDiagnostics();

        return {
          ...diagnostics,
          dedupeConfig,
        };
      },
    );
    mockedNativeCaptureModule.setAllowedSourceApps.mockImplementation(
      async (sourceAppIds) => {
        const diagnostics =
          await mockedNativeCaptureModule.getNativeCaptureDiagnostics();

        return {
          ...diagnostics,
          allowedSourceAppIds:
            sourceAppIds as NativeCaptureDiagnostics['allowedSourceAppIds'],
        };
      },
    );
    mockedNativeCaptureModule.setNativeCapturePrivacyModeEnabled.mockImplementation(
      async () => mockedNativeCaptureModule.getNativeCaptureDiagnostics(),
    );
    mockedNativeCaptureModule.subscribeToPendingCaptureEvents.mockReturnValue(
      jest.fn(),
    );
    mockedBootstrapConfigModule.hydrateBootstrapConfigCache.mockResolvedValue(
      buildMockBootstrapState(),
    );
    mockedBootstrapConfigModule.refreshBootstrapConfig.mockResolvedValue(
      buildMockBootstrapState({
        config: {
          ...buildMockBootstrapState().config,
          configVersion: 'bootstrap-beta-network',
          parserConfig: {
            parserKillSwitch: false,
            templates: {
              ...buildMockBootstrapState().config.parserConfig.templates,
              experimental_upi_v2: {
                enabled: true,
                fields: {
                  amount: 'amount',
                  merchant: 'merchant',
                },
                sourceApps: ['google_pay', 'phonepe'],
                version: '2.0.0',
              },
            },
          },
        },
        message: 'Fresh beta bootstrap config loaded from the API.',
        source: 'network',
      }),
    );
    mockedTelemetryModule.enqueueTelemetryEvent.mockResolvedValue(1);
    mockedTelemetryModule.flushTelemetryEvents.mockResolvedValue({
      acceptedCount: 0,
      duplicateCount: 0,
      remainingCount: 0,
    });
    mockedTelemetryModule.installGlobalTelemetryErrorHandler.mockReturnValue(
      jest.fn(),
    );
    mockedPlatformCapabilitiesModule.getPlatformCapabilities.mockReturnValue(
      buildMockPlatformCapabilities(),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the hydration screen before onboarding resumes', async () => {
    const screen = render(<App />);

    expect(screen.getByText('UPI Spend Tracker')).toBeTruthy();
    expect(
      screen.getByText('Restoring saved state on this device'),
    ).toBeTruthy();

    await act(async () => {
      await Promise.resolve();
    });

    expect(await screen.findByText('Source apps')).toBeTruthy();
    expect(screen.getByText('Budget cycle')).toBeTruthy();
    expect(await screen.findByText('Continue in local-only mode')).toBeTruthy();
  });

  it('records onboarding completion and local-only permission denial telemetry events', async () => {
    const screen = render(<App />);

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    await waitFor(() => {
      expect(mockedTelemetryModule.enqueueTelemetryEvent).toHaveBeenCalled();
    });

    const eventNames =
      mockedTelemetryModule.enqueueTelemetryEvent.mock.calls.map(
        ([event]) => (event as { eventName: string }).eventName,
      );

    expect(eventNames).toContain('onboarding_completed');
    expect(eventNames).toContain('notification_permission_denied');
  });

  it('hydrates a previously completed local session', async () => {
    mockedLoadStoredSpendTrackerState.mockResolvedValue({
      categories: buildDefaultCategories(),
      onboardingPreferences: DEFAULT_ONBOARDING_PREFERENCES,
      notificationAccessState: 'settings_opened',
      onboardingCompleted: true,
      transactions: seededTransactions.map((transaction) =>
        transaction.id === 'txn_blue_tokai'
          ? {
              ...transaction,
              items: [
                {
                  amountMinor: transaction.amountMinor,
                  categoryId: 'food_drink',
                  id: 'txn_blue_tokai_item_1',
                  label: 'Cold brew',
                },
              ],
              status: 'classified',
            }
          : transaction,
      ),
    });

    const screen = await renderApp();

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
    expect(screen.getByText('Remote bootstrap config')).toBeTruthy();
    expect(screen.getByText('Android capture diagnostics')).toBeTruthy();
    expect(screen.getByText('Sync queue')).toBeTruthy();
    expect(screen.getByText('Budget progress')).toBeTruthy();
    expect(screen.getByText(/Projected spend:/)).toBeTruthy();
    expect(screen.getByText('Top items')).toBeTruthy();
    expect(screen.getByText('Create budget')).toBeTruthy();
    expect(screen.getByText('1 pending')).toBeTruthy();
    expect(
      screen.getByText('Settings opened, permission still pending'),
    ).toBeTruthy();
  });

  it('shows the local sync queue honestly when sync mode is enabled before pairing exists', async () => {
    mockedLoadStoredSpendTrackerState.mockResolvedValue(
      buildStoredState({
        onboardingPreferences: {
          budgetCycleId: 'calendar_month',
          selectedSourceAppIds: ['google_pay', 'phonepe'],
          syncMode: 'sync_later',
        },
      }),
    );
    mockedLoadStoredSyncState.mockResolvedValue(
      buildStoredSyncState({
        lastStatus: 'pending',
        outbox: [
          {
            attemptCount: 0,
            createdAt: '2026-03-30T10:00:00.000Z',
            entityId: 'txn_local_1',
            entityType: 'transaction',
            entityVersion: 1,
            lastAttemptAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            nextRetryAt: null,
            occurredAt: '2026-03-30T10:00:00.000Z',
            opId: 'transaction_txn_local_1_v1',
            opType: 'upsert',
            payload: {
              amountMinor: 18900,
              merchant: 'Native Chai Stall',
              status: 'uncategorized',
            },
            status: 'pending',
          },
        ],
      }),
    );

    const screen = await renderApp();

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
    expect(screen.getByText('Sync queue')).toBeTruthy();
    expect(screen.getByText('Status: Waiting for pairing')).toBeTruthy();
    expect(screen.getByText('Queued writes: 1 · Ready now: 1')).toBeTruthy();

    await waitFor(() =>
      expect(mockedSaveStoredSyncState).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device_local_test',
          outbox: [
            expect.objectContaining({
              entityId: 'txn_local_1',
              entityType: 'transaction',
            }),
          ],
        }),
      ),
    );
  });

  it('creates a client sync session from Settings and persists the credentials locally', async () => {
    mockedLoadStoredSpendTrackerState.mockResolvedValue(
      buildStoredState({
        onboardingPreferences: {
          budgetCycleId: 'calendar_month',
          selectedSourceAppIds: ['google_pay', 'phonepe'],
          syncMode: 'sync_later',
        },
      }),
    );
    mockedLoadStoredSyncState.mockResolvedValue(
      buildStoredSyncState({
        outbox: [
          {
            attemptCount: 0,
            createdAt: '2026-03-30T10:00:00.000Z',
            entityId: 'txn_local_1',
            entityType: 'transaction',
            entityVersion: 1,
            lastAttemptAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            nextRetryAt: null,
            occurredAt: '2026-03-30T10:00:00.000Z',
            opId: 'transaction_txn_local_1_v1',
            opType: 'upsert',
            payload: {
              amountMinor: 18900,
              merchant: 'Native Chai Stall',
              status: 'uncategorized',
            },
            status: 'pending',
          },
        ],
      }),
    );

    const screen = await renderApp();

    fireEvent.press(
      await screen.findByRole('button', { name: 'Open settings' }),
    );
    fireEvent.press(
      await screen.findByRole('button', { name: 'Create sync session' }),
    );

    await waitFor(() =>
      expect(
        mockedSyncSessionModule.createGuestSyncSession,
      ).toHaveBeenCalledWith({
        deviceName: 'Android device',
      }),
    );
    await waitFor(() =>
      expect(mockedSaveStoredSyncCredentials).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'access-token-1',
          deviceId: 'device_remote_1',
          refreshToken: 'refresh-token-1',
        }),
      ),
    );

    expect(await screen.findByText('Status: Queued locally')).toBeTruthy();
  });

  it('shows a pairing code from Settings when sync credentials already exist', async () => {
    mockedLoadStoredSpendTrackerState.mockResolvedValue(
      buildStoredState({
        onboardingPreferences: {
          budgetCycleId: 'calendar_month',
          selectedSourceAppIds: ['google_pay', 'phonepe'],
          syncMode: 'sync_later',
        },
      }),
    );
    mockedLoadStoredSyncCredentials.mockResolvedValue(
      buildStoredSyncCredentials(),
    );

    const screen = await renderApp();

    fireEvent.press(
      await screen.findByRole('button', { name: 'Open settings' }),
    );
    fireEvent.press(
      await screen.findByRole('button', { name: 'Generate pairing code' }),
    );

    await waitFor(() =>
      expect(
        mockedSyncSessionModule.createSyncPairingCode,
      ).toHaveBeenCalledWith({
        credentials: buildStoredSyncCredentials(),
      }),
    );

    expect(await screen.findByText('Pairing code: ABCD1234')).toBeTruthy();
  });

  it('opens the design system showcase from Home', async () => {
    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'View UI showcase' }));

    expect(await screen.findByText('Mobile UI primitives')).toBeTruthy();
    expect(screen.getByText('Foundation preview')).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: 'Back to home' }).length,
    ).toBeGreaterThan(0);
  });

  it('creates a local budget from the budgets screen when the rollout flag is enabled', async () => {
    const bootstrapStateWithBudgets = buildMockBootstrapState({
      config: {
        ...buildMockBootstrapState().config,
        featureFlags: {
          ...buildMockBootstrapState().config.featureFlags,
          budgets_enabled: true,
        },
      },
    });

    mockedBootstrapConfigModule.hydrateBootstrapConfigCache.mockResolvedValue(
      bootstrapStateWithBudgets,
    );
    mockedBootstrapConfigModule.refreshBootstrapConfig.mockResolvedValue(
      bootstrapStateWithBudgets,
    );

    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Create budget' }));

    expect(await screen.findByText('Local budget setup')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('2500'), '2500');
    fireEvent.press(screen.getByRole('button', { name: 'Create budget' }));

    expect(await screen.findByText('Saved budgets')).toBeTruthy();
    expect(screen.getByText('Overall budget')).toBeTruthy();
    expect(screen.getByText(/Target:/)).toBeTruthy();
    expect(screen.getAllByText(/2,500/).length).toBeGreaterThan(0);

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
          budgets: [
            expect.objectContaining({
              label: 'Overall budget',
              period: 'monthly',
              scope: 'overall',
              targetMinor: 250000,
            }),
          ],
        }),
      ),
    );
  });

  it('opens local insights from Home and shows prior-period rollups', async () => {
    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Insights' }));

    expect(
      await screen.findByText('See where the current cycle is moving'),
    ).toBeTruthy();
    expect(screen.getByText('Trend cards')).toBeTruthy();
    expect(screen.getByText('Category rollup')).toBeTruthy();
    expect(screen.getByText('Merchant rollup')).toBeTruthy();
    expect(screen.getByText('Time-of-day trend')).toBeTruthy();
    expect(screen.getByText('Day-of-week trend')).toBeTruthy();
  });

  it('shows stale remote-config fallback details and disables remotely paused actions', async () => {
    mockedBootstrapConfigModule.hydrateBootstrapConfigCache.mockResolvedValue(
      buildMockBootstrapState({
        config: {
          ...buildMockBootstrapState().config,
          featureFlags: {
            budgets_enabled: false,
            notification_capture_enabled: false,
            search_enabled: false,
            showcase_enabled: false,
          },
          parserConfig: {
            parserKillSwitch: true,
            templates: buildMockBootstrapState().config.parserConfig.templates,
          },
          runtimeCompatibility: {
            compatible: false,
            reason: 'Upgrade required to at least 1.1.0.',
          },
        },
        lastError: 'Network request failed',
        message:
          'Using stale cached beta config while refresh retries. The last good flags and parser templates stay active until the API responds again.',
        source: 'cache',
        status: 'stale',
      }),
    );
    mockedBootstrapConfigModule.refreshBootstrapConfig.mockRejectedValue(
      new Error('Network request failed'),
    );

    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    expect(await screen.findByText('Remote bootstrap config')).toBeTruthy();
    expect(screen.getByText('Stale cached config')).toBeTruthy();
    expect(
      screen.getByText('Last refresh issue: Network request failed'),
    ).toBeTruthy();
    expect(screen.getByText('Capture paused remotely')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'View UI showcase' }).props
        .accessibilityState?.disabled,
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Search' }).props.accessibilityState
        ?.disabled,
    ).toBe(true);
  });

  it('resumes a partially completed onboarding flow with saved choices', async () => {
    mockedLoadStoredSpendTrackerState.mockResolvedValue({
      categories: buildDefaultCategories(),
      onboardingPreferences: {
        budgetCycleId: 'salary_cycle',
        selectedSourceAppIds: ['bhim'],
        syncMode: 'sync_later',
      },
      notificationAccessState: 'settings_opened',
      onboardingCompleted: false,
      transactions: seededTransactions,
    });

    const screen = await renderApp();

    expect(await screen.findByText('Source apps')).toBeTruthy();
    expect(
      screen.getByText('Settings opened, permission still pending'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'BHIM' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salary cycle' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Prepare for sync later' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Finish setup' })).toBeTruthy();
  });

  it('syncs the onboarding source-app selection into the native allowlist', async () => {
    const screen = await renderApp();

    expect(await screen.findByText('Source apps')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Deselect all' }));
    fireEvent.press(screen.getByRole('button', { name: 'BHIM' }));

    await waitFor(() =>
      expect(
        mockedNativeCaptureModule.setAllowedSourceApps,
      ).toHaveBeenLastCalledWith(['bhim']),
    );
    expect(screen.getByText('Native allowlist: BHIM')).toBeTruthy();
  });

  it('shows native capture diagnostics from the Android bridge', async () => {
    const diagnostics = buildMockCaptureDiagnostics({
      allowedSourceAppIds: ['google_pay'],
      exactDuplicateCount: 2,
      fuzzyDuplicateCount: 1,
      lastCapture: {
        capturedAtMs: new Date('2026-03-26T09:45:00.000Z').getTime(),
        packageName: 'com.google.android.apps.nbu.paisa.user',
        preview: 'title=Paid Rs 299 text=To Corner Store',
        sourceAppId: 'google_pay',
      },
      lastDedupeDecision: {
        amountMinor: 29900,
        dedupeKind: 'exact_duplicate',
        dedupedAtMs: new Date('2026-03-26T09:47:00.000Z').getTime(),
        duplicateCount: 3,
        merchantRaw: 'Corner Store',
        sourceAppId: 'google_pay',
      },
      listenerPermissionGranted: true,
      recentParseFailures: [
        {
          captureEventId: 91,
          capturedAtMs: new Date('2026-03-26T10:00:00.000Z').getTime(),
          failureReasonCode: 'unsupported_notification_format',
          parserTrace: 'google_pay_v1:unsupported_notification_format',
          sourceAppId: 'google_pay',
        },
      ],
      storedSnapshotCount: 3,
      supportedParsers: [
        {
          parserId: 'google_pay_v1',
          parserVersion: '1.0.0',
          sourceAppIds: ['google_pay'],
        },
      ],
    });

    mockedNativeCaptureModule.getNativeCaptureDiagnostics.mockResolvedValue(
      diagnostics,
    );
    mockedNativeCaptureModule.setNativeCaptureDedupeConfig.mockResolvedValue(
      diagnostics,
    );
    mockedNativeCaptureModule.setAllowedSourceApps.mockResolvedValue(
      diagnostics,
    );

    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    expect(await screen.findByText('Android capture diagnostics')).toBeTruthy();
    expect(screen.getByText('Listener permission: granted')).toBeTruthy();
    expect(screen.getByText('Allowed source apps: Google Pay')).toBeTruthy();
    expect(screen.getByText('Stored raw captures: 3')).toBeTruthy();
    expect(
      screen.getByText('Suppressed duplicates: 2 exact, 1 fuzzy'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Dedupe config: 120s exact · 300s fuzzy · threshold 0.88',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Supported parsers: 1')).toBeTruthy();
    expect(screen.getByText('Recent parse failures: 1')).toBeTruthy();
    expect(screen.getByText(/Last dedupe: Exact duplicate/)).toBeTruthy();
  });

  it('renders the iPhone shell as manual/local-only without Android diagnostics', async () => {
    mockedPlatformCapabilitiesModule.getPlatformCapabilities.mockReturnValue(
      buildMockPlatformCapabilities({
        platform: 'ios',
        prefersBottomPrimaryNavigation: true,
        supportsNativeCaptureDiagnostics: false,
        supportsNativeNotificationCapture: false,
      }),
    );

    const screen = await renderApp();

    expect(await screen.findByText('iPhone capture mode')).toBeTruthy();
    expect(screen.getByText('Manual review only on iPhone')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Open app settings' }),
    ).toBeTruthy();

    fireEvent.press(screen.getByText('Continue in local-only mode'));

    expect(await screen.findByText('iPhone capture mode')).toBeTruthy();
    expect(screen.queryByText('Android capture diagnostics')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Open support details' }),
    ).toBeTruthy();
  });

  it('opens the diagnostics screen from Home and shows parser and failure details', async () => {
    const diagnostics = buildMockCaptureDiagnostics({
      allowedSourceAppIds: ['google_pay', 'phonepe'],
      listenerPermissionGranted: true,
      recentCaptureLog: [
        {
          captureEventId: 77,
          captureState: 'captured',
          capturedAtMs: new Date('2026-03-26T10:15:00.000Z').getTime(),
          parseStatus: 'success',
          parserId: 'google_pay_v1',
          parserVersion: '1.0.0',
          sourceAppId: 'google_pay',
          totalDuplicateCount: 0,
        },
      ],
      recentParseFailures: [
        {
          captureEventId: 88,
          capturedAtMs: new Date('2026-03-26T10:20:00.000Z').getTime(),
          failureReasonCode: 'merchant_not_found',
          parserTrace: 'generic_upi_v1:merchant_not_found',
          sourceAppId: 'phonepe',
        },
      ],
      supportedParsers: [
        {
          parserId: 'google_pay_v1',
          parserVersion: '1.0.0',
          sourceAppIds: ['google_pay'],
        },
        {
          parserId: 'generic_upi_v1',
          parserVersion: '1.0.0',
          sourceAppIds: ['google_pay', 'phonepe'],
        },
      ],
    });

    mockedNativeCaptureModule.getNativeCaptureDiagnostics.mockResolvedValue(
      diagnostics,
    );
    mockedNativeCaptureModule.setNativeCaptureDedupeConfig.mockResolvedValue(
      diagnostics,
    );
    mockedNativeCaptureModule.setAllowedSourceApps.mockResolvedValue(
      diagnostics,
    );

    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    fireEvent.press(screen.getByRole('button', { name: 'Open diagnostics' }));

    expect(
      await screen.findByText('Support-ready native capture status'),
    ).toBeTruthy();
    expect(
      screen.getByText('Native google_pay_v1 v1.0.0 · Google Pay'),
    ).toBeTruthy();
    expect(
      screen.getByText('Native generic_upi_v1 v1.0.0 · Google Pay, PhonePe'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Reason: merchant_not_found · Trace: generic_upi_v1:merchant_not_found/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('success · captured · google_pay_v1 v1.0.0'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Share redacted bundle' }),
    ).toBeTruthy();
  });

  it('opens Settings, persists local preferences, and exposes export and diagnostics entrypoints', async () => {
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as Awaited<
        ReturnType<typeof Share.share>
      >);

    try {
      const screen = await renderApp();

      fireEvent.press(await screen.findByText('Continue in local-only mode'));
      fireEvent.press(screen.getAllByRole('button', { name: 'Settings' })[0]!);

      expect(
        await screen.findByText('Capture, privacy, and support controls'),
      ).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'BHIM' }));
      fireEvent.press(screen.getByRole('button', { name: 'Salary cycle' }));
      fireEvent.press(
        screen.getByRole('button', { name: 'Prepare for sync later' }),
      );
      fireEvent.press(screen.getByRole('button', { name: 'Mask previews' }));

      await waitFor(() =>
        expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
          expect.objectContaining({
            onboardingPreferences: {
              budgetCycleId: 'salary_cycle',
              selectedSourceAppIds: expect.arrayContaining(['bhim']),
              syncMode: 'sync_later',
            },
            privacyModeEnabled: true,
          }),
        ),
      );

      fireEvent.press(screen.getByRole('button', { name: 'Transactions CSV' }));
      await waitFor(() =>
        expect(mockedFileSystem.writeAsStringAsync).toHaveBeenCalledWith(
          expect.stringContaining('upi-spend-tracker-transactions-'),
          expect.stringContaining('transaction_id'),
          expect.objectContaining({ encoding: 'utf8' }),
        ),
      );
      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Transactions CSV',
          url: expect.stringContaining('upi-spend-tracker-transactions-'),
        }),
      );

      fireEvent.press(
        screen.getByRole('button', { name: 'Export local backup' }),
      );
      await waitFor(() =>
        expect(mockedFileSystem.writeAsStringAsync).toHaveBeenCalledTimes(2),
      );
      expect(mockedFileSystem.writeAsStringAsync.mock.calls[1]?.[0]).toContain(
        'upi-spend-tracker-local-backup-',
      );
      expect(mockedFileSystem.writeAsStringAsync.mock.calls[1]?.[1]).toContain(
        '"schema_version": "local_backup_v1"',
      );

      fireEvent.press(screen.getByRole('button', { name: 'Restore backup' }));
      expect(alertSpy).toHaveBeenCalledWith(
        'Restore stays future-safe for now',
        expect.stringContaining('guarded next-step entrypoint'),
      );

      fireEvent.press(screen.getByRole('button', { name: 'Open diagnostics' }));
      expect(
        await screen.findByText('Support-ready native capture status'),
      ).toBeTruthy();
    } finally {
      alertSpy.mockRestore();
      shareSpy.mockRestore();
    }
  });

  it('shows a privacy cover while the app is inactive when privacy mode is enabled', async () => {
    let appStateListener: ((nextAppState: string) => void) | null = null;
    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, listener) => {
        appStateListener = listener as (nextAppState: string) => void;
        return { remove: jest.fn() } as ReturnType<
          typeof AppState.addEventListener
        >;
      });

    try {
      const screen = await renderApp();

      fireEvent.press(await screen.findByText('Continue in local-only mode'));
      fireEvent.press(screen.getAllByRole('button', { name: 'Settings' })[0]!);
      fireEvent.press(screen.getByRole('button', { name: 'Mask previews' }));

      expect(appStateListener).not.toBeNull();

      await act(async () => {
        appStateListener?.('background');
      });

      expect(
        await screen.findByText('Content hidden for app previews'),
      ).toBeTruthy();

      await act(async () => {
        appStateListener?.('active');
      });

      await waitFor(() =>
        expect(
          screen.queryByText('Content hidden for app previews'),
        ).toBeNull(),
      );
    } finally {
      addEventListenerSpy.mockRestore();
    }
  });

  it('syncs bootstrap dedupe config into the native module', async () => {
    await renderApp();

    await waitFor(() =>
      expect(
        mockedNativeCaptureModule.setNativeCaptureDedupeConfig,
      ).toHaveBeenCalledWith({
        exactMatchWindowSeconds: 120,
        fuzzyMatchWindowSeconds: 300,
        merchantSimilarityThreshold: 0.88,
      }),
    );
  });

  it('persists onboarding preferences before onboarding is completed', async () => {
    const screen = await renderApp();

    expect(await screen.findByText('Source apps')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Deselect all' }));
    fireEvent.press(screen.getByRole('button', { name: 'BHIM' }));
    fireEvent.press(screen.getByRole('button', { name: 'Salary cycle' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Prepare for sync later' }),
    );

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categories: buildDefaultCategories(),
          onboardingCompleted: false,
          onboardingPreferences: {
            budgetCycleId: 'salary_cycle',
            selectedSourceAppIds: ['bhim'],
            syncMode: 'sync_later',
          },
          notificationAccessState: 'not_started',
          transactions: seededTransactions,
        }),
      ),
    );
  });

  it('classifies an inbox item and persists the updated session', async () => {
    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
    expect(screen.getByText('Rs 1,775')).toBeTruthy();
    expect(screen.getByText('2 pending')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Inbox' }));

    expect(screen.getByText('Inbox for unresolved spend')).toBeTruthy();
    expect(screen.getByText('Blue Tokai Roasters')).toBeTruthy();

    fireEvent.press(
      screen.getByRole('button', { name: 'Classify Blue Tokai Roasters' }),
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('What did you buy?'),
      'Cold brew',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Save classification' }),
    );

    expect(screen.queryByText('Blue Tokai Roasters')).toBeNull();
    expect(screen.getByText('Blinkit')).toBeTruthy();

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categories: buildDefaultCategories(),
          notificationAccessState: 'not_started',
          onboardingCompleted: true,
          onboardingPreferences: DEFAULT_ONBOARDING_PREFERENCES,
          transactions: expect.arrayContaining([
            expect.objectContaining({
              id: 'txn_blue_tokai',
              items: [
                expect.objectContaining({
                  categoryId: 'food_drink',
                  label: 'Cold brew',
                }),
              ],
              status: 'classified',
            }),
          ]),
        }),
      ),
    );
  });

  it('filters, skips, revisits, and deletes inbox items locally', async () => {
    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    fireEvent.press(screen.getByRole('button', { name: 'Inbox' }));

    expect(await screen.findByText('Inbox for unresolved spend')).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText('Filter by merchant'),
      'blue',
    );
    expect(screen.getByText('Blue Tokai Roasters')).toBeTruthy();
    expect(screen.queryByText('Blinkit')).toBeNull();

    fireEvent.changeText(screen.getByPlaceholderText('Filter by merchant'), '');
    fireEvent.press(screen.getByRole('button', { name: 'Google Pay' }));
    expect(screen.getByText('Blue Tokai Roasters')).toBeTruthy();
    expect(screen.queryByText('Blinkit')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Skip Blue Tokai Roasters for now' }),
    );

    expect(screen.queryByText('Blue Tokai Roasters')).toBeNull();
    expect(screen.getByText('Blinkit')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Skipped' }));
    expect(await screen.findByText('Blue Tokai Roasters')).toBeTruthy();
    fireEvent.press(
      screen.getByRole('button', { name: 'Review Blue Tokai Roasters again' }),
    );

    expect(screen.queryByText('Blue Tokai Roasters')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Needs review' }));
    expect(await screen.findByText('Blue Tokai Roasters')).toBeTruthy();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Delete Blue Tokai Roasters locally',
      }),
    );
    expect(screen.queryByText('Blue Tokai Roasters')).toBeNull();

    await waitFor(() => {
      const lastSavedState =
        mockedSaveStoredSpendTrackerState.mock.calls.at(-1)?.[0];
      expect(lastSavedState).toBeDefined();
      expect(
        lastSavedState?.transactions.find(
          (transaction) => transaction.id === 'txn_blue_tokai',
        ),
      ).toBeUndefined();
    });
  });

  it('keeps the inbox usable with 1000 local items and all filter types', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-29T12:00:00+05:30'));
    mockedLoadStoredSpendTrackerState.mockResolvedValue({
      categories: buildDefaultCategories(),
      onboardingPreferences: DEFAULT_ONBOARDING_PREFERENCES,
      notificationAccessState: 'settings_opened',
      onboardingCompleted: true,
      transactions: buildHighVolumeInboxTransactions(),
    });

    try {
      const screen = await renderApp();

      await flushVirtualizedListTimers();
      fireEvent.press(await screen.findByRole('button', { name: 'Inbox' }));
      await flushVirtualizedListTimers();

      expect(
        await screen.findByText('Showing 1000 of 1000 unresolved items'),
      ).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'Google Pay' }));
      await flushVirtualizedListTimers();
      expect(
        screen.getByText('Showing 1 of 1000 unresolved items'),
      ).toBeTruthy();
      expect(screen.getByText('Target Merchant')).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
      await flushVirtualizedListTimers();
      fireEvent.press(screen.getByRole('button', { name: 'Over Rs 500' }));
      await flushVirtualizedListTimers();
      expect(
        screen.getByText('Showing 1 of 1000 unresolved items'),
      ).toBeTruthy();
      expect(screen.getByText('Target Merchant')).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
      await flushVirtualizedListTimers();
      fireEvent.press(screen.getByRole('button', { name: 'Older' }));
      await flushVirtualizedListTimers();
      expect(
        screen.getByText('Showing 1 of 1000 unresolved items'),
      ).toBeTruthy();
      expect(screen.getByText('Target Merchant')).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
      await flushVirtualizedListTimers();
      fireEvent.changeText(
        screen.getByPlaceholderText('Filter by merchant'),
        'Target',
      );
      await flushVirtualizedListTimers();
      expect(
        screen.getByText('Showing 1 of 1000 unresolved items'),
      ).toBeTruthy();
      expect(screen.getByText('Target Merchant')).toBeTruthy();
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('uses explicit quick-classify suggestions and persists reusable rules', async () => {
    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    fireEvent.press(screen.getByRole('button', { name: 'Inbox' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Classify Blue Tokai Roasters' }),
    );

    expect(await screen.findByText('Quick classify sheet')).toBeTruthy();
    expect(await screen.findByText('Suggested values')).toBeTruthy();
    fireEvent.press(
      screen.getByRole('button', { name: 'Coffee run suggestion' }),
    );
    expect(screen.getByDisplayValue('Coffee run')).toBeTruthy();

    fireEvent.press(
      screen.getByRole('button', { name: 'Save as reusable rule' }),
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Auto-apply this rule' }),
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Save classification' }),
    );

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
          rules: [
            expect.objectContaining({
              autoApply: true,
              categoryId: 'food_drink',
              itemLabel: 'Coffee run',
            }),
          ],
          transactions: expect.arrayContaining([
            expect.objectContaining({
              id: 'txn_blue_tokai',
              items: [
                expect.objectContaining({
                  categoryId: 'food_drink',
                  label: 'Coffee run',
                }),
              ],
              status: 'classified',
            }),
          ]),
        }),
      ),
    );
  });

  it('creates a custom category and uses it like a first-class classify option', async () => {
    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    fireEvent.press(screen.getByRole('button', { name: 'Manage categories' }));

    expect(
      await screen.findByText(
        'Manage the labels used across your local spend data',
      ),
    ).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText('Weekend treats'),
      'Weekend Treats',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(
        'Short note shown while choosing this category',
      ),
      'Cafe orders and local treats.',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Create category' }));

    expect(await screen.findByText('Weekend Treats')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Back to home' }));
    fireEvent.press(screen.getByRole('button', { name: 'Inbox' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Classify Blue Tokai Roasters' }),
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('What did you buy?'),
      'Cold brew',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Weekend Treats' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Save classification' }),
    );

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
          categories: expect.arrayContaining([
            expect.objectContaining({
              description: 'Cafe orders and local treats.',
              id: 'custom_weekend_treats',
              isDefault: false,
              label: 'Weekend Treats',
            }),
          ]),
          transactions: expect.arrayContaining([
            expect.objectContaining({
              id: 'txn_blue_tokai',
              items: [
                expect.objectContaining({
                  categoryId: 'custom_weekend_treats',
                  label: 'Cold brew',
                }),
              ],
              status: 'classified',
            }),
          ]),
        }),
      ),
    );
  });

  it('reviews a merchant merge suggestion and saves the resulting alias locally', async () => {
    const mergeAlertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(
        (
          _title: string,
          _message?: string,
          buttons?: Parameters<typeof Alert.alert>[2],
        ) => {
          const mergeButton = buttons?.find(
            (button) => button.text === 'Merge',
          );
          mergeButton?.onPress?.();
        },
      );

    mockedLoadStoredSpendTrackerState.mockResolvedValue({
      categories: buildDefaultCategories(),
      onboardingPreferences: DEFAULT_ONBOARDING_PREFERENCES,
      notificationAccessState: 'settings_opened',
      onboardingCompleted: true,
      transactions: [
        {
          amountMinor: 19000,
          capturedAt: '2026-03-20T09:00:00+05:30',
          id: 'txn_roasters_1',
          items: [
            {
              amountMinor: 19000,
              categoryId: 'food_drink',
              id: 'txn_roasters_1_item_1',
              label: 'Cold brew',
            },
          ],
          merchant: 'Blue Tokai Roasters',
          sourceApp: 'Google Pay',
          status: 'classified',
        },
        {
          amountMinor: 21000,
          capturedAt: '2026-03-21T09:00:00+05:30',
          id: 'txn_roasters_2',
          items: [
            {
              amountMinor: 21000,
              categoryId: 'food_drink',
              id: 'txn_roasters_2_item_1',
              label: 'Pour over',
            },
          ],
          merchant: 'Blue Tokai Roasters',
          sourceApp: 'Google Pay',
          status: 'classified',
        },
        {
          amountMinor: 18000,
          capturedAt: '2026-03-22T09:00:00+05:30',
          id: 'txn_roaster_variant',
          items: [
            {
              amountMinor: 18000,
              categoryId: 'food_drink',
              id: 'txn_roaster_variant_item_1',
              label: 'Cappuccino',
            },
          ],
          merchant: 'Blue Tokai Roaster',
          sourceApp: 'Google Pay',
          status: 'classified',
        },
      ],
    });

    try {
      const screen = await renderApp();

      expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Manage merchants' }));

      expect(
        await screen.findByText('Normalize repeated merchant variants locally'),
      ).toBeTruthy();
      expect(
        screen.getByText('Blue Tokai Roaster → Blue Tokai Roasters'),
      ).toBeTruthy();

      fireEvent.press(
        screen.getByRole('button', {
          name: 'Merge Blue Tokai Roaster into Blue Tokai Roasters',
        }),
      );

      await waitFor(() =>
        expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
          expect.objectContaining({
            merchantAliases: expect.arrayContaining([
              expect.objectContaining({
                alias: 'Blue Tokai Roaster',
                source: 'merged',
              }),
            ]),
            merchants: expect.arrayContaining([
              expect.objectContaining({
                label: 'Blue Tokai Roasters',
              }),
            ]),
            transactions: expect.arrayContaining([
              expect.objectContaining({
                id: 'txn_roaster_variant',
                merchant: 'Blue Tokai Roasters',
                history: expect.arrayContaining([
                  expect.objectContaining({
                    kind: 'merchant_merged',
                  }),
                ]),
              }),
            ]),
          }),
        ),
      );
    } finally {
      mergeAlertSpy.mockRestore();
    }
  });

  it('saves a partial split and keeps the transaction visible in Inbox', async () => {
    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    fireEvent.press(screen.getByRole('button', { name: 'Inbox' }));
    fireEvent.press(
      screen.getByRole('button', { name: 'Split Blue Tokai Roasters now' }),
    );

    expect(
      await screen.findByText('Break one payment into meaningful parts'),
    ).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText('Amount for item 1'),
      '120',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('What did item 1 cover?'),
      'Cold brew',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save partial split' }));

    expect(await screen.findByText('Blue Tokai Roasters')).toBeTruthy();
    expect(screen.getByText('Partially classified')).toBeTruthy();
    expect(screen.getByText(/still needs a remainder decision/)).toBeTruthy();

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
          transactions: expect.arrayContaining([
            expect.objectContaining({
              id: 'txn_blue_tokai',
              items: [
                expect.objectContaining({
                  amountMinor: 12000,
                  categoryId: 'food_drink',
                  label: 'Cold brew',
                }),
              ],
              status: 'partially_classified',
            }),
          ]),
        }),
      ),
    );
  });

  it('adds a manual spend and persists the updated session', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-29T12:00:00+05:30'));

    try {
      const screen = await renderApp();

      fireEvent.press(await screen.findByText('Continue in local-only mode'));

      expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
      fireEvent.press(
        screen.getAllByRole('button', { name: 'Add manual spend' })[0]!,
      );

      expect(
        await screen.findByText('Capture a spend even without a notification'),
      ).toBeTruthy();

      fireEvent.changeText(screen.getByPlaceholderText('180 or 180.50'), '299');
      fireEvent.changeText(
        screen.getByPlaceholderText('Where did you spend?'),
        'Corner Store',
      );
      fireEvent.changeText(
        screen.getByPlaceholderText('What did you buy?'),
        'Snacks',
      );
      fireEvent.press(screen.getByRole('button', { name: 'Groceries' }));
      fireEvent.press(
        screen.getByRole('button', { name: 'Save manual spend' }),
      );

      expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
      expect(screen.getByText('Rs 2,074')).toBeTruthy();

      await waitFor(() =>
        expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
          expect.objectContaining({
            onboardingCompleted: true,
            onboardingPreferences: DEFAULT_ONBOARDING_PREFERENCES,
            transactions: expect.arrayContaining([
              expect.objectContaining({
                merchant: 'Corner Store',
                sourceApp: 'Manual entry',
                status: 'classified',
                items: [
                  expect.objectContaining({
                    categoryId: 'groceries',
                    label: 'Snacks',
                  }),
                ],
              }),
            ]),
          }),
        ),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('opens timeline search, shows local transaction detail, and edits a transaction from detail', async () => {
    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Search' }));

    expect(
      await screen.findByText('Search local history and audit what changed'),
    ).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText('Merchant, item, or category'),
      'transport',
    );

    expect(screen.getByText('Showing 1 of 5 local transactions')).toBeTruthy();
    expect(screen.getByText('Bangalore Metro')).toBeTruthy();
    expect(screen.queryByText('Blinkit')).toBeNull();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Open transaction details for Bangalore Metro',
      }),
    );

    expect(
      await screen.findByText('Inspect the local record before changing it'),
    ).toBeTruthy();
    expect(screen.getByText('Parser: paytm_upi_v1')).toBeTruthy();
    expect(screen.getByText('Classification history')).toBeTruthy();

    fireEvent.press(
      screen.getByRole('button', { name: 'Edit classification' }),
    );
    expect(await screen.findByText('Quick classify sheet')).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText('What did you buy?'),
      'Metro day pass',
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Save classification' }),
    );

    expect(
      await screen.findByText('Inspect the local record before changing it'),
    ).toBeTruthy();
    expect(screen.getByText('Metro day pass')).toBeTruthy();

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
          transactions: expect.arrayContaining([
            expect.objectContaining({
              id: 'txn_metro',
              items: [
                expect.objectContaining({
                  categoryId: 'transport',
                  label: 'Metro day pass',
                }),
              ],
              status: 'classified',
            }),
          ]),
        }),
      ),
    );
  });

  it('confirms before deleting a transaction from detail and returns to timeline', async () => {
    const deleteAlertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(
        (
          _title: string,
          _message?: string,
          buttons?: Parameters<typeof Alert.alert>[2],
        ) => {
          const destructiveButton = buttons?.find(
            (button) => button.style === 'destructive',
          );
          destructiveButton?.onPress?.();
        },
      );

    try {
      const screen = await renderApp();

      fireEvent.press(await screen.findByText('Continue in local-only mode'));
      fireEvent.press(screen.getByRole('button', { name: 'Search' }));
      fireEvent.changeText(
        screen.getByPlaceholderText('Merchant, item, or category'),
        'blue',
      );
      fireEvent.press(
        screen.getByRole('button', {
          name: 'Open transaction details for Blue Tokai Roasters',
        }),
      );

      expect(
        await screen.findByText('Inspect the local record before changing it'),
      ).toBeTruthy();

      fireEvent.press(
        screen.getByRole('button', { name: 'Delete transaction locally' }),
      );

      expect(deleteAlertSpy).toHaveBeenCalledWith(
        'Delete transaction locally?',
        expect.stringContaining('Blue Tokai Roasters will be removed'),
        expect.any(Array),
      );
      expect(
        await screen.findByText('Search local history and audit what changed'),
      ).toBeTruthy();
      expect(screen.queryByText('Blue Tokai Roasters')).toBeNull();
    } finally {
      deleteAlertSpy.mockRestore();
    }
  });

  it('saves a local note from transaction detail and makes it searchable in timeline', async () => {
    const screen = await renderApp();

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    fireEvent.press(screen.getByRole('button', { name: 'Search' }));
    fireEvent.changeText(
      screen.getByPlaceholderText('Merchant, item, or category'),
      'blue',
    );
    fireEvent.press(
      screen.getByRole('button', {
        name: 'Open transaction details for Blue Tokai Roasters',
      }),
    );

    expect(await screen.findByText('Local note')).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText(
        'Add a local note for search and detail context',
      ),
      'Shared cafe catch-up',
    );
    fireEvent.press(screen.getByRole('button', { name: 'Save note' }));
    fireEvent.press(screen.getByRole('button', { name: 'Back to timeline' }));

    fireEvent.changeText(
      screen.getByPlaceholderText('Merchant, item, or category'),
      'catch-up',
    );

    expect(
      await screen.findByText('Showing 1 of 5 local transactions'),
    ).toBeTruthy();
    expect(screen.getByText('Blue Tokai Roasters')).toBeTruthy();

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
          transactions: expect.arrayContaining([
            expect.objectContaining({
              id: 'txn_blue_tokai',
              note: 'Shared cafe catch-up',
            }),
          ]),
        }),
      ),
    );
  });

  it('imports pending native captures on launch and marks them imported locally', async () => {
    mockedLoadStoredSpendTrackerState.mockResolvedValue(buildStoredState());
    mockedNativeCaptureModule.getPendingNativeCaptureEvents.mockResolvedValue([
      buildMockNativeCaptureEvent(),
    ]);

    await renderApp();

    await waitFor(() =>
      expect(
        mockedNativeCaptureModule.markNativeCaptureImported,
      ).toHaveBeenCalledWith(401, 'txn_capture_401'),
    );

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
          transactions: expect.arrayContaining([
            expect.objectContaining({
              id: 'txn_capture_401',
              merchant: 'Native Chai Stall',
              parserInfo: expect.objectContaining({
                parserId: 'gpay_upi_v1',
                parserVersion: '1.0.0',
              }),
              sourceApp: 'Google Pay',
              status: 'uncategorized',
            }),
          ]),
        }),
      ),
    );
  });

  it('routes capture-action deep links into classify with reply seed', async () => {
    mockedLoadStoredSpendTrackerState.mockResolvedValue(buildStoredState());
    mockedNativeCaptureModule.getNativeCaptureEvent.mockResolvedValue(
      buildMockNativeCaptureEvent(
        {
          captureState: 'replied',
        },
        [
          {
            actionType: 'direct_reply',
            itemLabel: 'Morning chai',
            replyText: 'Morning chai',
          },
        ],
      ),
    );
    jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue(
        'upispendtracker://capture-action?route=classify&captureEventId=401',
      );

    const screen = await renderApp();

    expect(
      await screen.findByText('Turn this payment into a usable spend'),
    ).toBeTruthy();
    expect(screen.getByDisplayValue('Morning chai')).toBeTruthy();
    expect(
      mockedNativeCaptureModule.markNativeCaptureImported,
    ).toHaveBeenCalledWith(401, 'txn_capture_401');
  });
});
