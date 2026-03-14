import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppShell } from '../components/AppShell';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { KPIBlock } from '../components/KPIBlock';
import { ListItem } from '../components/ListItem';
import { SectionHeader } from '../components/SectionHeader';
import { TextField } from '../components/TextField';
import { useAppTheme, type ThemePreference } from '../theme';

const categoryOptions = ['Coffee', 'Groceries', 'Transport'] as const;
const themeOptions = ['system', 'light', 'dark'] as const satisfies readonly ThemePreference[];

const inboxRows = [
  {
    amount: '₹420',
    detail: 'Suggested category: Coffee',
    merchant: 'Third Wave Coffee',
    source: 'Inbox · 2m ago',
  },
  {
    amount: '₹1,280',
    detail: 'Suggested category: Groceries',
    merchant: 'Nature Basket',
    source: 'Inbox · 18m ago',
  },
] as const;

function PreviewBadge({ label }: { label: string }) {
  const { theme, tokens } = useAppTheme();

  const styles = StyleSheet.create({
    badge: {
      alignItems: 'center',
      backgroundColor: theme.colors.accentSoft,
      borderRadius: tokens.radii.pill,
      height: tokens.touchTargets.minimum,
      justifyContent: 'center',
      width: tokens.touchTargets.minimum,
    },
    label: {
      color: theme.colors.accentStrong,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.body,
      fontWeight: tokens.typography.fontWeight.bold,
      lineHeight: tokens.typography.lineHeight.body,
    },
  });

  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function DesignSystemShowcaseScreen() {
  const { theme, themeName, themePreference, setThemePreference, tokens } =
    useAppTheme();
  const [merchantName, setMerchantName] = useState('Third Wave Coffee');
  const [itemName, setItemName] = useState('Cold brew');
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categoryOptions)[number]>('Coffee');
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const styles = StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.body,
      lineHeight: tokens.typography.lineHeight.body,
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.md,
    },
    listStack: {
      gap: tokens.spacing.sm,
    },
    metadataText: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.caption,
      lineHeight: tokens.typography.lineHeight.caption,
    },
    sectionStack: {
      gap: tokens.spacing.lg,
    },
    sheetFooter: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      justifyContent: 'flex-end',
    },
    sheetStack: {
      gap: tokens.spacing.md,
    },
  });

  return (
    <AppShell testID="design-system-showcase">
      <Card
        footer={
          <Text style={styles.metadataText}>
            Active theme: {themeName}. Theme preference: {themePreference}.
            Tokens come from `packages/shared-utils`.
          </Text>
        }
        header={
          <SectionHeader
            eyebrow="SET-003"
            subtitle="A lightweight, mobile-first design system foundation for later product screens."
            title="Design System Showcase"
          />
        }
      >
        <View style={styles.sectionStack}>
          <Text style={styles.bodyText}>
            Shared spacing, typography, radius, elevation, icon size, motion,
            and semantic color tokens now power the client theme and primitives.
          </Text>
          <View style={styles.chipRow}>
            {themeOptions.map((option) => (
              <Chip
                key={option}
                label={option.charAt(0).toUpperCase() + option.slice(1)}
                onPress={() => setThemePreference(option)}
                selected={themePreference === option}
              />
            ))}
          </View>
          <View style={styles.buttonRow}>
            <Button onPress={() => setIsBottomSheetOpen(true)}>
              Preview Bottom Sheet
            </Button>
            <Button variant="secondary">Review Inbox</Button>
            <Button variant="ghost">Create Budget</Button>
          </View>
        </View>
      </Card>

      <Card
        header={
          <SectionHeader
            subtitle="KPIBlock and Card give later dashboard modules a shared visual rhythm."
            title="Overview Primitives"
          />
        }
      >
        <View style={styles.kpiGrid}>
          <KPIBlock
            label="Current cycle"
            supportingText="Tracks the active budget window"
            tone="accent"
            value="₹18,420"
          />
          <KPIBlock
            label="Uncategorized"
            supportingText="Items still waiting for classification"
            tone="warning"
            value="8"
          />
          <KPIBlock
            label="Rules applied"
            supportingText="Explicit user rules this week"
            tone="positive"
            value="14"
          />
        </View>
      </Card>

      <Card
        footer={
          <Text style={styles.metadataText}>
            Interactive controls keep a minimum touch target of{' '}
            {tokens.touchTargets.minimum}px.
          </Text>
        }
        header={
          <SectionHeader
            subtitle="TextField and Chip support the fast classification flows defined in the product spec."
            title="Input Flow"
          />
        }
      >
        <View style={styles.sectionStack}>
          <TextField
            helperText="Merchant preview pulled from the latest capture."
            label="Merchant"
            onChangeText={setMerchantName}
            placeholder="Enter merchant"
            testID="merchant-field"
            value={merchantName}
          />
          <View style={styles.chipRow}>
            {categoryOptions.map((option) => (
              <Chip
                key={option}
                label={option}
                onPress={() => setSelectedCategory(option)}
                selected={selectedCategory === option}
              />
            ))}
          </View>
        </View>
      </Card>

      <Card
        header={
          <SectionHeader
            subtitle="ListItem and EmptyState keep unfinished work scannable without turning the UI into a ledger dump."
            title="Inbox Building Blocks"
          />
        }
      >
        <View style={styles.sectionStack}>
          <View style={styles.listStack}>
            {inboxRows.map((row) => (
              <ListItem
                detail={row.detail}
                key={row.merchant}
                leading={<PreviewBadge label={row.merchant.charAt(0) || 'U'} />}
                subtitle={row.source}
                title={row.merchant}
                trailing={<Text style={styles.metadataText}>{row.amount}</Text>}
              />
            ))}
          </View>
          <EmptyState
            action={<Button variant="secondary">Add manual</Button>}
            description="Empty states should teach the next action and preserve trust when there is no data yet."
            title="No uncategorized items"
          />
        </View>
      </Card>

      <Card
        header={
          <SectionHeader
            action={
              <Button onPress={() => setIsBottomSheetOpen(true)} variant="ghost">
                Open
              </Button>
            }
            subtitle="BottomSheet is a controlled modal primitive for quick classify and later action flows."
            title="Modal Foundation"
          />
        }
      >
        <Text style={styles.bodyText}>
          The bottom sheet uses the same theme tokens and motion values as the
          rest of the showcase, without introducing any third-party UI kit.
        </Text>
      </Card>

      <BottomSheet
        footer={
          <View style={styles.sheetFooter}>
            <Button onPress={() => setIsBottomSheetOpen(false)} variant="ghost">
              Dismiss
            </Button>
            <Button onPress={() => setIsBottomSheetOpen(false)}>Save</Button>
          </View>
        }
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        testID="quick-classify-sheet"
        title="Quick classify preview"
      >
        <View style={styles.sheetStack}>
          <TextField
            helperText="Suggestions stay editable and never auto-save silently."
            label="Item name"
            onChangeText={setItemName}
            placeholder="Enter item"
            value={itemName}
          />
          <View style={styles.chipRow}>
            {categoryOptions.map((option) => (
              <Chip
                key={`sheet-${option}`}
                label={option}
                onPress={() => setSelectedCategory(option)}
                selected={selectedCategory === option}
              />
            ))}
          </View>
          <ListItem
            detail={`Suggested category: ${selectedCategory}`}
            leading={<PreviewBadge label="₹" />}
            subtitle="Captured from notification · just now"
            title={merchantName}
            trailing={<Text style={styles.metadataText}>₹420</Text>}
          />
        </View>
      </BottomSheet>
    </AppShell>
  );
}
