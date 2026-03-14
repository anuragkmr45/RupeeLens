jest.mock('../src/lib/bootstrap-config', () => ({
  useBootstrapConfig: () => ({
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
  }),
}));

jest.mock('../src/lib/capture', () => ({
  useCaptureDiagnostics: () => ({
    allowlistState: {
      'com.google.android.apps.nbu.paisa.user': true,
      'com.phonepe.app': false,
      'in.org.npci.upiapp': false,
      'net.one97.paytm': false,
    },
    error: null,
    loading: false,
    openNotificationListenerSettings: jest.fn(),
    refresh: jest.fn(),
    setAllSourcesEnabled: jest.fn(),
    setSourceEnabled: jest.fn(),
    summary: {
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
    },
    supportedSources: [
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
      {
        displayName: 'Paytm',
        enabledByDefault: false,
        packageName: 'net.one97.paytm',
      },
      {
        displayName: 'BHIM',
        enabledByDefault: false,
        packageName: 'in.org.npci.upiapp',
      },
    ],
  }),
}));

import { fireEvent, render } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

import { DesignSystemShowcaseScreen } from '../src/app/DesignSystemShowcaseScreen';
import { BottomSheet } from '../src/components/BottomSheet';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { EmptyState } from '../src/components/EmptyState';
import { KPIBlock } from '../src/components/KPIBlock';
import { ListItem } from '../src/components/ListItem';
import { SectionHeader } from '../src/components/SectionHeader';
import { TextField } from '../src/components/TextField';
import { AppThemeProvider, type ThemePreference } from '../src/theme';

function ThemeWrapper({
  children,
  initialPreference,
}: PropsWithChildren<{ initialPreference: ThemePreference }>) {
  return (
    <AppThemeProvider initialPreference={initialPreference}>
      {children}
    </AppThemeProvider>
  );
}

function PrimitivePreview() {
  return (
    <View style={{ gap: 12 }}>
      <Card
        footer={<Button variant="ghost">Ghost action</Button>}
        header={
          <SectionHeader
            eyebrow="Preview"
            subtitle="Representative primitive snapshot"
            title="Primitive Gallery"
          />
        }
      >
        <KPIBlock label="Total" supportingText="Shared metric block" value="₹420" />
        <TextField
          helperText="Helper text"
          label="Merchant"
          onChangeText={() => undefined}
          value="Third Wave Coffee"
        />
        <Chip label="Coffee" selected />
        <ListItem
          detail="Suggested category: Coffee"
          subtitle="Inbox · just now"
          title="Third Wave Coffee"
          trailing={<Text>₹420</Text>}
        />
        <EmptyState
          action={<Button variant="secondary">Add manual</Button>}
          description="No transactions left to classify."
          title="All clear"
        />
      </Card>
      <BottomSheet isOpen onClose={() => undefined} title="Open sheet">
        <Text>Sheet content</Text>
      </BottomSheet>
    </View>
  );
}

describe('design system primitives', () => {
  it('matches the light snapshot', () => {
    const screen = render(
      <ThemeWrapper initialPreference="light">
        <PrimitivePreview />
      </ThemeWrapper>,
    );

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('matches the dark snapshot', () => {
    const screen = render(
      <ThemeWrapper initialPreference="dark">
        <PrimitivePreview />
      </ThemeWrapper>,
    );

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('opens the controlled bottom sheet from the showcase screen', () => {
    const screen = render(
      <ThemeWrapper initialPreference="light">
        <DesignSystemShowcaseScreen />
      </ThemeWrapper>,
    );

    expect(screen.queryByText('Quick classify preview')).toBeNull();

    fireEvent.press(screen.getByText('Preview Bottom Sheet'));

    expect(screen.getByText('Quick classify preview')).toBeTruthy();
    expect(screen.getByText('Captured from notification · just now')).toBeTruthy();
    expect(screen.getByText('Remote Config Foundation')).toBeTruthy();
    expect(screen.getByText('Capture Diagnostics')).toBeTruthy();
  });
});
