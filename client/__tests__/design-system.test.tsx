import renderer from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';

import {
  AppShell,
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  KPIBlock,
  ListItem,
  SectionHeader,
  TextField,
  darkTheme,
  designTokens,
  lightTheme,
  type MobileUiThemeName,
} from '@upi-spend-tracker/mobile-ui';

function PrimitiveHarness({
  sheetVisible,
  themeName,
}: {
  sheetVisible: boolean;
  themeName: MobileUiThemeName;
}) {
  const theme = themeName === 'dark' ? darkTheme : lightTheme;

  return (
    <AppShell
      description="Shared tokens and primitives preview."
      eyebrow="Snapshot"
      themeName={themeName}
      title="Mobile UI"
    >
      <Card accentColor={theme.colors.accentSoft} tone="accent">
        <SectionHeader
          description="Card plus header primitives."
          eyebrow="Foundation"
          title="Composable surfaces"
        />
        <Button label="Primary action" onPress={() => undefined} />
      </Card>

      <View style={styles.kpiGrid}>
        <KPIBlock
          caption="Shared semantic metrics."
          label="Tokens"
          value="Live"
        />
        <KPIBlock
          caption="Shared components."
          label="Primitives"
          value="Ready"
        />
      </View>

      <Card tone="warm">
        <TextField
          autoCapitalize="words"
          label="Merchant"
          onChangeText={() => undefined}
          placeholder="Blue Tokai"
          value="Blue Tokai Roasters"
        />
        <View style={styles.row}>
          <Chip label="Food & Drink" selected={true} />
          <Chip label="Needs review" tone="pending" />
          <Chip label="Ready" tone="ready" />
        </View>
      </Card>

      <ListItem
        subtitle="Google Pay · 26 Mar · 09:12"
        title="Blue Tokai Roasters"
        trailing={
          <Text style={[styles.amountLabel, { color: theme.colors.ink }]}>
            Rs 430
          </Text>
        }
      >
        <View style={styles.row}>
          <Button label="Classify" onPress={() => undefined} />
          <Button label="Skip" onPress={() => undefined} variant="secondary" />
        </View>
      </ListItem>

      <EmptyState
        description="Empty states should stay visually consistent."
        title="Nothing left to review"
        actions={
          <View style={styles.row}>
            <Button
              label="Back to home"
              onPress={() => undefined}
              variant="secondary"
            />
            <Button label="Add spend" onPress={() => undefined} />
          </View>
        }
      />

      <BottomSheet onDismiss={() => undefined} visible={sheetVisible}>
        <View style={styles.sheetContent}>
          <SectionHeader
            description="Sheet content uses the same primitives."
            eyebrow="Bottom sheet"
            title="Quick classify"
          />
          <TextField
            label="Item"
            onChangeText={() => undefined}
            placeholder="Cold brew"
            value="Cold brew"
          />
        </View>
      </BottomSheet>
    </AppShell>
  );
}

describe('mobile-ui primitives', () => {
  let originalConsoleWarn: typeof console.warn;

  beforeEach(() => {
    originalConsoleWarn = console.warn;
    jest.spyOn(console, 'warn').mockImplementation((message, ...args) => {
      if (
        typeof message === 'string' &&
        message.includes('SafeAreaView has been deprecated')
      ) {
        return;
      }

      originalConsoleWarn(message, ...args);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('matches the light theme snapshot', () => {
    let root: renderer.ReactTestRenderer;

    renderer.act(() => {
      root = renderer.create(
        <PrimitiveHarness sheetVisible={false} themeName="light" />,
      );
    });

    expect(root!.toJSON()).toMatchSnapshot();

    renderer.act(() => {
      root!.unmount();
    });
  });

  it('matches the dark theme sheet snapshot', () => {
    let root: renderer.ReactTestRenderer;

    renderer.act(() => {
      root = renderer.create(
        <PrimitiveHarness sheetVisible={true} themeName="dark" />,
      );
    });

    expect(root!.toJSON()).toMatchSnapshot();

    renderer.act(() => {
      root!.unmount();
    });
  });
});

const styles = StyleSheet.create({
  amountLabel: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.xs,
  },
  sheetContent: {
    gap: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.lg,
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.sm,
  },
});
