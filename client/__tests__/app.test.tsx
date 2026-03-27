import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import App from '../App';
import { seededTransactions, type Transaction } from '../src/features/spend-tracker/domain';
import type {
  NativeCaptureDedupeConfig,
  NativeCaptureDiagnostics,
} from '../src/features/android-capture/native-capture';
import type { BootstrapConfigState } from '../src/features/bootstrap-config/runtime-config';
import {
  DEFAULT_ONBOARDING_PREFERENCES,
  loadStoredSpendTrackerState,
  saveStoredSpendTrackerState,
} from '../src/features/spend-tracker/persistence';

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

jest.mock('../src/features/bootstrap-config/runtime-config', () => ({
  buildBootstrapRefreshFailureState: jest.fn((currentState, error) => ({
    ...currentState,
    lastError: error instanceof Error ? error.message : 'Bootstrap refresh failed.',
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
    channel === 'beta' ? 'Beta' : channel === 'internal' ? 'Internal' : 'Production',
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
  isRemoteCapturePaused: jest.fn((config) =>
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
    serviceAvailable: true,
    storedSnapshotCount: 0,
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
    serviceAvailable: true,
    storedSnapshotCount: 0,
  },
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
    serviceAvailable: true,
    storedSnapshotCount: 0,
  }),
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
    serviceAvailable: true,
    storedSnapshotCount: 0,
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
    serviceAvailable: true,
    storedSnapshotCount: 0,
  }),
}));

const mockedLoadStoredSpendTrackerState =
  loadStoredSpendTrackerState as jest.MockedFunction<typeof loadStoredSpendTrackerState>;
const mockedSaveStoredSpendTrackerState =
  saveStoredSpendTrackerState as jest.MockedFunction<typeof saveStoredSpendTrackerState>;
const mockedBootstrapConfigModule = jest.requireMock(
  '../src/features/bootstrap-config/runtime-config'
) as {
  hydrateBootstrapConfigCache: jest.Mock<Promise<BootstrapConfigState | null>, []>;
  refreshBootstrapConfig: jest.Mock<Promise<BootstrapConfigState>, []>;
};
const mockedNativeCaptureModule = jest.requireMock(
  '../src/features/android-capture/native-capture'
) as {
  getNativeCaptureDiagnostics: jest.Mock<Promise<NativeCaptureDiagnostics>, []>;
  setNativeCaptureDedupeConfig: jest.Mock<
    Promise<NativeCaptureDiagnostics>,
    [NativeCaptureDedupeConfig]
  >;
  setAllowedSourceApps: jest.Mock<Promise<NativeCaptureDiagnostics>, [string[]]>;
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
    serviceAvailable: true,
    storedSnapshotCount: 0,
    ...overrides,
  };
}

function buildHighVolumeInboxTransactions(totalTransactions = 1_000): Transaction[] {
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
      capturedAt: '2026-03-25T08:34:00+05:30',
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

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadStoredSpendTrackerState.mockResolvedValue(null);
    mockedSaveStoredSpendTrackerState.mockResolvedValue(undefined);
    mockedNativeCaptureModule.getNativeCaptureDiagnostics.mockResolvedValue(
      buildMockCaptureDiagnostics(),
    );
    mockedNativeCaptureModule.setNativeCaptureDedupeConfig.mockImplementation(async (dedupeConfig) =>
      buildMockCaptureDiagnostics({
        dedupeConfig,
      }),
    );
    mockedNativeCaptureModule.setAllowedSourceApps.mockImplementation(async (sourceAppIds) =>
      buildMockCaptureDiagnostics({
        allowedSourceAppIds: sourceAppIds as NativeCaptureDiagnostics['allowedSourceAppIds'],
      }),
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
  });

  it('shows the hydration screen before onboarding resumes', async () => {
    const screen = render(<App />);

    expect(screen.getByText('UPI Spend Tracker')).toBeTruthy();
    expect(screen.getByText('Restoring saved state on this device')).toBeTruthy();
    expect(await screen.findByText('Source apps')).toBeTruthy();
    expect(screen.getByText('Budget cycle')).toBeTruthy();
    expect(await screen.findByText('Continue in local-only mode')).toBeTruthy();
  });

  it('hydrates a previously completed local session', async () => {
    mockedLoadStoredSpendTrackerState.mockResolvedValue({
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

    const screen = render(<App />);

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
    expect(screen.getByText('Remote bootstrap config')).toBeTruthy();
    expect(screen.getByText('Android capture diagnostics')).toBeTruthy();
    expect(screen.getByText('Budget progress')).toBeTruthy();
    expect(screen.getByText('Top items')).toBeTruthy();
    expect(screen.getByText('Create budget')).toBeTruthy();
    expect(screen.getByText('1 pending')).toBeTruthy();
    expect(screen.getByText('Settings opened, permission still pending')).toBeTruthy();
  });

  it('opens the design system showcase from Home', async () => {
    const screen = render(<App />);

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'View UI showcase' }));

    expect(await screen.findByText('Mobile UI primitives')).toBeTruthy();
    expect(screen.getByText('Foundation preview')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Back to home' }).length).toBeGreaterThan(0);
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

    const screen = render(<App />);

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    expect(await screen.findByText('Remote bootstrap config')).toBeTruthy();
    expect(screen.getByText('Stale cached config')).toBeTruthy();
    expect(screen.getByText('Last refresh issue: Network request failed')).toBeTruthy();
    expect(screen.getByText('Capture paused remotely')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'View UI showcase' }).props.accessibilityState?.disabled,
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Search' }).props.accessibilityState?.disabled,
    ).toBe(true);
  });

  it('resumes a partially completed onboarding flow with saved choices', async () => {
    mockedLoadStoredSpendTrackerState.mockResolvedValue({
      onboardingPreferences: {
        budgetCycleId: 'salary_cycle',
        selectedSourceAppIds: ['bhim'],
        syncMode: 'sync_later',
      },
      notificationAccessState: 'settings_opened',
      onboardingCompleted: false,
      transactions: seededTransactions,
    });

    const screen = render(<App />);

    expect(await screen.findByText('Source apps')).toBeTruthy();
    expect(screen.getByText('Settings opened, permission still pending')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'BHIM' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salary cycle' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Prepare for sync later' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Finish setup' })).toBeTruthy();
  });

  it('syncs the onboarding source-app selection into the native allowlist', async () => {
    const screen = render(<App />);

    expect(await screen.findByText('Source apps')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Deselect all' }));
    fireEvent.press(screen.getByRole('button', { name: 'BHIM' }));

    await waitFor(() =>
      expect(mockedNativeCaptureModule.setAllowedSourceApps).toHaveBeenLastCalledWith(['bhim']),
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
      storedSnapshotCount: 3,
    });

    mockedNativeCaptureModule.getNativeCaptureDiagnostics.mockResolvedValue(diagnostics);
    mockedNativeCaptureModule.setNativeCaptureDedupeConfig.mockResolvedValue(diagnostics);
    mockedNativeCaptureModule.setAllowedSourceApps.mockResolvedValue(diagnostics);

    const screen = render(<App />);

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    expect(await screen.findByText('Android capture diagnostics')).toBeTruthy();
    expect(screen.getByText('Listener permission: granted')).toBeTruthy();
    expect(screen.getByText('Allowed source apps: Google Pay')).toBeTruthy();
    expect(screen.getByText('Stored raw captures: 3')).toBeTruthy();
    expect(screen.getByText('Suppressed duplicates: 2 exact, 1 fuzzy')).toBeTruthy();
    expect(
      screen.getByText('Dedupe config: 120s exact · 300s fuzzy · threshold 0.88'),
    ).toBeTruthy();
    expect(
      screen.getByText('Snapshot preview: title=Paid Rs 299 text=To Corner Store'),
    ).toBeTruthy();
    expect(screen.getByText(/Last dedupe: Exact duplicate/)).toBeTruthy();
  });

  it('syncs bootstrap dedupe config into the native module', async () => {
    render(<App />);

    await waitFor(() =>
      expect(mockedNativeCaptureModule.setNativeCaptureDedupeConfig).toHaveBeenCalledWith({
        exactMatchWindowSeconds: 120,
        fuzzyMatchWindowSeconds: 300,
        merchantSimilarityThreshold: 0.88,
      }),
    );
  });

  it('persists onboarding preferences before onboarding is completed', async () => {
    const screen = render(<App />);

    expect(await screen.findByText('Source apps')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Deselect all' }));
    fireEvent.press(screen.getByRole('button', { name: 'BHIM' }));
    fireEvent.press(screen.getByRole('button', { name: 'Salary cycle' }));
    fireEvent.press(screen.getByRole('button', { name: 'Prepare for sync later' }));

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
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
    const screen = render(<App />);

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
    expect(screen.getByText('Rs 1,775')).toBeTruthy();
    expect(screen.getByText('2 pending')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Inbox' }));

    expect(screen.getByText('Inbox for unresolved spend')).toBeTruthy();
    expect(screen.getByText('Blue Tokai Roasters')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Classify Blue Tokai Roasters' }));
    fireEvent.changeText(screen.getByPlaceholderText('What did you buy?'), 'Cold brew');
    fireEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save classification' }));

    expect(screen.queryByText('Blue Tokai Roasters')).toBeNull();
    expect(screen.getByText('Blinkit')).toBeTruthy();

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
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
    const screen = render(<App />);

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    fireEvent.press(screen.getByRole('button', { name: 'Inbox' }));

    expect(await screen.findByText('Inbox for unresolved spend')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Filter by merchant'), 'blue');
    expect(screen.getByText('Blue Tokai Roasters')).toBeTruthy();
    expect(screen.queryByText('Blinkit')).toBeNull();

    fireEvent.changeText(screen.getByPlaceholderText('Filter by merchant'), '');
    fireEvent.press(screen.getByRole('button', { name: 'Google Pay' }));
    expect(screen.getByText('Blue Tokai Roasters')).toBeTruthy();
    expect(screen.queryByText('Blinkit')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.press(screen.getByRole('button', { name: 'Skip Blue Tokai Roasters for now' }));

    expect(screen.queryByText('Blue Tokai Roasters')).toBeNull();
    expect(screen.getByText('Blinkit')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Skipped' }));
    expect(await screen.findByText('Blue Tokai Roasters')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Review Blue Tokai Roasters again' }));

    expect(screen.queryByText('Blue Tokai Roasters')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Needs review' }));
    expect(await screen.findByText('Blue Tokai Roasters')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Delete Blue Tokai Roasters locally' }));
    expect(screen.queryByText('Blue Tokai Roasters')).toBeNull();

    await waitFor(() => {
      const lastSavedState = mockedSaveStoredSpendTrackerState.mock.calls.at(-1)?.[0];
      expect(lastSavedState).toBeDefined();
      expect(
        lastSavedState?.transactions.find((transaction) => transaction.id === 'txn_blue_tokai'),
      ).toBeUndefined();
    });
  });

  it('keeps the inbox usable with 1000 local items and all filter types', async () => {
    jest.useFakeTimers();
    mockedLoadStoredSpendTrackerState.mockResolvedValue({
      onboardingPreferences: DEFAULT_ONBOARDING_PREFERENCES,
      notificationAccessState: 'settings_opened',
      onboardingCompleted: true,
      transactions: buildHighVolumeInboxTransactions(),
    });

    try {
      const screen = render(<App />);

      await flushVirtualizedListTimers();
      fireEvent.press(await screen.findByRole('button', { name: 'Inbox' }));
      await flushVirtualizedListTimers();

      expect(await screen.findByText('Showing 1000 of 1000 unresolved items')).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'Google Pay' }));
      await flushVirtualizedListTimers();
      expect(screen.getByText('Showing 1 of 1000 unresolved items')).toBeTruthy();
      expect(screen.getByText('Target Merchant')).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
      await flushVirtualizedListTimers();
      fireEvent.press(screen.getByRole('button', { name: 'Over Rs 500' }));
      await flushVirtualizedListTimers();
      expect(screen.getByText('Showing 1 of 1000 unresolved items')).toBeTruthy();
      expect(screen.getByText('Target Merchant')).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
      await flushVirtualizedListTimers();
      fireEvent.press(screen.getByRole('button', { name: 'Older' }));
      await flushVirtualizedListTimers();
      expect(screen.getByText('Showing 1 of 1000 unresolved items')).toBeTruthy();
      expect(screen.getByText('Target Merchant')).toBeTruthy();

      fireEvent.press(screen.getByRole('button', { name: 'Clear filters' }));
      await flushVirtualizedListTimers();
      fireEvent.changeText(screen.getByPlaceholderText('Filter by merchant'), 'Target');
      await flushVirtualizedListTimers();
      expect(screen.getByText('Showing 1 of 1000 unresolved items')).toBeTruthy();
      expect(screen.getByText('Target Merchant')).toBeTruthy();
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('uses explicit quick-classify suggestions and rule-intent toggle', async () => {
    const screen = render(<App />);

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    fireEvent.press(screen.getByRole('button', { name: 'Inbox' }));
    fireEvent.press(screen.getByRole('button', { name: 'Classify Blue Tokai Roasters' }));

    expect(await screen.findByText('Quick classify sheet')).toBeTruthy();
    expect(await screen.findByText('Suggested values')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Coffee run suggestion' }));
    expect(screen.getByDisplayValue('Coffee run')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Save as rule later' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save classification' }));

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
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

  it('saves a partial split and keeps the transaction visible in Inbox', async () => {
    const screen = render(<App />);

    fireEvent.press(await screen.findByText('Continue in local-only mode'));
    fireEvent.press(screen.getByRole('button', { name: 'Inbox' }));
    fireEvent.press(screen.getByRole('button', { name: 'Split Blue Tokai Roasters now' }));

    expect(await screen.findByText('Break one payment into meaningful parts')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Amount for item 1'), '120');
    fireEvent.changeText(screen.getByPlaceholderText('What did item 1 cover?'), 'Cold brew');
    fireEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save partial split' }));

    expect(await screen.findByText('Blue Tokai Roasters')).toBeTruthy();
    expect(screen.getByText('Partially classified')).toBeTruthy();
    expect(
      screen.getByText(/still needs a remainder decision/),
    ).toBeTruthy();

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
    const screen = render(<App />);

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
    fireEvent.press(screen.getAllByRole('button', { name: 'Add manual spend' })[0]!);

    expect(
      await screen.findByText('Capture a spend even without a notification'),
    ).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('180 or 180.50'), '299');
    fireEvent.changeText(screen.getByPlaceholderText('Where did you spend?'), 'Corner Store');
    fireEvent.changeText(screen.getByPlaceholderText('What did you buy?'), 'Snacks');
    fireEvent.press(screen.getByRole('button', { name: 'Groceries' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save manual spend' }));

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
  });
});
