import { useState } from 'react';
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

export function DesignSystemShowcaseScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [themeName, setThemeName] = useState<MobileUiThemeName>('light');
  const [merchant, setMerchant] = useState('Blue Tokai Roasters');
  const [itemLabel, setItemLabel] = useState('Cold brew');
  const theme = themeName === 'dark' ? darkTheme : lightTheme;

  return (
    <AppShell
      description="Shared tokens and UI primitives now live in one workspace package so future mobile tickets can compose screens instead of rebuilding buttons, cards, chips, and sheets inline."
      eyebrow="Design system"
      testID="design-system-showcase"
      themeName={themeName}
      title="Mobile UI primitives"
    >
      <View style={styles.stack}>
        <Card accentColor={theme.colors.accentSoft} tone="accent">
          <SectionHeader
            description="This screen exists to demonstrate every primitive required by SET-003 in one place."
            eyebrow="Showcase"
            title="Foundation preview"
          />
          <View style={styles.actionRow}>
            <Button label="Back to home" onPress={onBack} variant="secondary" />
            <Button
              label={themeName === 'light' ? 'Preview dark theme' : 'Preview light theme'}
              onPress={() => setThemeName((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))}
              variant="primary"
            />
          </View>
        </Card>

        <View style={styles.kpiGrid}>
          <KPIBlock
            caption="Spacing, radius, and semantic surfaces come from the shared package."
            label="Tokens"
            value="Live"
          />
          <KPIBlock
            caption="Buttons, cards, chips, and sheets now render from the same primitives."
            label="Primitives"
            value="9 components"
          />
        </View>

        <Card tone="warm">
          <SectionHeader
            description="TextField, Chip, and Button stay touch-safe and theme-aware."
            eyebrow="Inputs"
            title="Form controls"
          />
          <TextField
            autoCapitalize="words"
            label="Merchant"
            onChangeText={setMerchant}
            placeholder="Blue Tokai"
            value={merchant}
          />
          <TextField
            label="Item label"
            onChangeText={setItemLabel}
            placeholder="What did you buy?"
            value={itemLabel}
          />
          <View style={styles.chipRow}>
            <Chip label="Food & Drink" selected={true} />
            <Chip label="Needs review" tone="pending" />
            <Chip label="Ready" tone="ready" />
          </View>
          <View style={styles.actionRow}>
            <Button label="Open bottom sheet" onPress={() => setSheetVisible(true)} />
            <Button label="Secondary action" onPress={() => setItemLabel('')} variant="secondary" />
          </View>
        </Card>

        <Card tone="default">
          <SectionHeader
            description="ListItem handles primary rows, trailing content, and follow-up controls."
            eyebrow="Lists"
            title="Review queue building blocks"
          />
          <ListItem
            subtitle="Google Pay · 26 Mar · 09:12"
            title={merchant}
            trailing={<Text style={[styles.amountLabel, { color: theme.colors.ink }]}>Rs 430</Text>}
          >
            <View style={styles.chipRow}>
              <Chip label="Needs review" tone="pending" />
              <Chip label="Food & Drink" selected={true} />
            </View>
          </ListItem>
          <ListItem
            subtitle="Skip, restore, or open the bottom sheet from higher-level screens."
            title="Inbox action row"
            trailing={<Chip label="Ready" tone="ready" />}
          />
        </Card>

        <EmptyState
          description="EmptyState keeps first-run and zero-result copy consistent across onboarding, Home, and Inbox."
          title="Nothing left to review"
          actions={
            <View style={styles.actionRow}>
              <Button label="Reopen bottom sheet" onPress={() => setSheetVisible(true)} />
              <Button label="Back to home" onPress={onBack} variant="secondary" />
            </View>
          }
        />
      </View>

      <BottomSheet onDismiss={() => setSheetVisible(false)} visible={sheetVisible}>
        <View style={styles.sheetContent}>
          <SectionHeader
            description="BottomSheet is optimized for one-hand classify and quick edit surfaces."
            eyebrow="Bottom sheet"
            title="Quick classify preview"
          />
          <TextField
            label="Item"
            onChangeText={setItemLabel}
            placeholder="Cold brew"
            value={itemLabel}
          />
          <View style={styles.chipRow}>
            <Chip label="Food & Drink" selected={true} />
            <Chip label="Groceries" />
            <Chip label="Shopping" />
          </View>
          <View style={styles.actionRow}>
            <Button label="Save preview" onPress={() => setSheetVisible(false)} />
            <Button
              label="Close"
              onPress={() => setSheetVisible(false)}
              variant="secondary"
            />
          </View>
        </View>
      </BottomSheet>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    gap: designTokens.spacing.sm,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.xs,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.sm,
    justifyContent: 'space-between',
  },
  sheetContent: {
    gap: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.lg,
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.sm,
  },
  stack: {
    gap: designTokens.spacing.md,
  },
});
