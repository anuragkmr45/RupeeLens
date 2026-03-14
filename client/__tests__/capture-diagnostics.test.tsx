const mockGetAllowlistState = jest.fn();
const mockGetDiagnosticsSummary = jest.fn();
const mockGetPermissionStatus = jest.fn();
const mockGetSupportedSources = jest.fn();
const mockOpenNotificationListenerSettings = jest.fn();
const mockSetAllSourcesEnabled = jest.fn();
const mockSetSourceEnabled = jest.fn();

jest.mock('../src/lib/capture/module', () => ({
  notificationCaptureModule: {
    getAllowlistState: () => mockGetAllowlistState(),
    getDiagnosticsSummary: () => mockGetDiagnosticsSummary(),
    getPermissionStatus: () => mockGetPermissionStatus(),
    getSupportedSources: () => mockGetSupportedSources(),
    openNotificationListenerSettings: () =>
      mockOpenNotificationListenerSettings(),
    setAllSourcesEnabled: (enabled: boolean) => mockSetAllSourcesEnabled(enabled),
    setSourceEnabled: (packageName: string, enabled: boolean) =>
      mockSetSourceEnabled(packageName, enabled),
  },
}));

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { CaptureDiagnosticsCard } from '../src/components/CaptureDiagnosticsCard';
import { AppThemeProvider } from '../src/theme';

const supportedSources = [
  {
    displayName: 'Google Pay',
    enabledByDefault: false,
    packageName: 'com.google.android.apps.nbu.paisa.user',
  },
  {
    displayName: 'PhonePe',
    enabledByDefault: false,
    packageName: 'com.phonepe.app',
  },
];

const initialSummary = {
  allowlistedPackages: ['com.google.android.apps.nbu.paisa.user'],
  lastSnapshot: {
    appLabel: 'Google Pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    postedAtMillis: 1_710_374_400_000,
    snapshotId: 1,
  },
  permissionStatus: 'granted' as const,
  recentIgnoredCounts: {
    notAllowlisted: 2,
    unsupported: 1,
  },
};

describe('CaptureDiagnosticsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetPermissionStatus.mockResolvedValue('granted');
    mockGetSupportedSources.mockResolvedValue(supportedSources);
    mockGetAllowlistState.mockResolvedValue({
      'com.google.android.apps.nbu.paisa.user': true,
      'com.phonepe.app': false,
    });
    mockGetDiagnosticsSummary.mockResolvedValue(initialSummary);
    mockOpenNotificationListenerSettings.mockResolvedValue(undefined);
    mockSetAllSourcesEnabled.mockResolvedValue({
      'com.google.android.apps.nbu.paisa.user': true,
      'com.phonepe.app': true,
    });
    mockSetSourceEnabled.mockResolvedValue({
      'com.google.android.apps.nbu.paisa.user': true,
      'com.phonepe.app': true,
    });
  });

  it('renders permission state and the latest stored snapshot', async () => {
    const screen = render(
      <AppThemeProvider initialPreference="light">
        <CaptureDiagnosticsCard />
      </AppThemeProvider>,
    );

    expect(screen.getByText('Capture Diagnostics')).toBeTruthy();

    await waitFor(() =>
      expect(
        screen.getByText('Listener permission: granted. Allowlisted sources: 1.'),
      ).toBeTruthy(),
    );

    expect(
      screen.getByText(
        'Last stored snapshot: Google Pay (com.google.android.apps.nbu.paisa.user) at 2024-03-14T00:00:00.000Z.',
      ),
    ).toBeTruthy();
  });

  it('toggles a source through the mocked native module', async () => {
    mockGetDiagnosticsSummary
      .mockResolvedValueOnce(initialSummary)
      .mockResolvedValueOnce({
        ...initialSummary,
        allowlistedPackages: [
          'com.google.android.apps.nbu.paisa.user',
          'com.phonepe.app',
        ],
      });

    const screen = render(
      <AppThemeProvider initialPreference="light">
        <CaptureDiagnosticsCard />
      </AppThemeProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText('PhonePe')).toBeTruthy(),
    );

    fireEvent.press(screen.getByText('PhonePe'));

    await waitFor(() =>
      expect(mockSetSourceEnabled).toHaveBeenCalledWith('com.phonepe.app', true),
    );
  });
});
