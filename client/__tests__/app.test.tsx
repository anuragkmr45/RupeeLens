jest.mock('../src/lib/db', () => ({
  ensureAppDatabaseReady: jest.fn().mockResolvedValue({
    latestMigrationId: '0001_initial_client_schema',
    latestSeedId: '0001_default_categories_and_settings',
    manifestHash: 'test-hash',
    seedVersion: '0001_default_categories_and_settings',
  }),
}));

jest.mock('../src/lib/bootstrap-config', () => {
  const bootstrapHookState = {
    config: {
      cacheTtlSeconds: 300,
      configVersion: 'dev-2026-03-14',
      copyOverrides: {
        configBanner: 'Remote config foundation active (dev)',
      },
      featureFlags: {
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
    },
    contentHash: 'test-hash',
    isFeatureEnabled: (flagKey: string) =>
      flagKey === 'feature.remote_parser_config',
    isParserEnabled: (parserId: string) => parserId === 'upi.generic',
    isStale: false,
    lastError: null,
    lastRefreshAt: '2026-03-14T00:00:00.000Z',
    signature: 'test-signature',
    source: 'cache' as const,
  };
  const runtimeMetadata = {
    apiBaseUrl: 'http://127.0.0.1:3000',
    appVersion: '1.0.0',
    channel: 'internal',
    platform: 'android',
    publicKey: 'test-public-key',
    runtimeVersion: '1.0.0',
  };

  return {
    BootstrapConfigProvider: ({ children }: { children: unknown }) => children,
    createDefaultBootstrapConfigState: () => ({
      ...bootstrapHookState,
      isFeatureEnabled: undefined,
      isParserEnabled: undefined,
    }),
    getBootstrapRuntimeMetadata: jest.fn(() => runtimeMetadata),
    loadBootstrapConfigStateFromDatabase: jest
      .fn()
      .mockResolvedValue(bootstrapHookState),
    useBootstrapConfig: () => bootstrapHookState,
  };
});

import { render } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('renders the design system showcase after the database is ready', async () => {
    const screen = render(<App />);

    expect(await screen.findByText('Design System Showcase')).toBeTruthy();
    expect(await screen.findByText('Current cycle')).toBeTruthy();
    expect(await screen.findByText('Remote Config Foundation')).toBeTruthy();
  });
});
