import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  buildClassificationDraft,
  categoryOptions,
  formatCaptureMoment,
  formatCurrency,
  getPendingTransactions,
  getTransactionById,
  seededTransactions,
  summarizeDashboard,
  type CategoryId,
  type ClassificationDraft,
  type DashboardSummary,
  type Transaction,
} from '../features/spend-tracker/domain';
import {
  clearStoredSpendTrackerState,
  loadStoredSpendTrackerState,
  saveStoredSpendTrackerState,
  type NotificationAccessState,
} from '../features/spend-tracker/persistence';
import { APP_COPY } from '../lib/app-info';
import { colors } from '../theme/colors';

type Screen = 'classify' | 'home' | 'inbox' | 'onboarding';

const EMPTY_DRAFT: ClassificationDraft = {
  categoryId: null,
  itemLabel: '',
};

export function SpendTrackerApp() {
  const [isHydrating, setIsHydrating] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [notificationAccessState, setNotificationAccessState] =
    useState<NotificationAccessState>('not_started');
  const [transactions, setTransactions] = useState<Transaction[]>(seededTransactions);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClassificationDraft>(EMPTY_DRAFT);

  const pendingTransactions = getPendingTransactions(transactions);
  const summary = summarizeDashboard(transactions);
  const activeTransaction = activeTransactionId
    ? getTransactionById(transactions, activeTransactionId)
    : null;

  useEffect(() => {
    let isMounted = true;

    async function hydrateLocalState() {
      const storedState = await loadStoredSpendTrackerState();

      if (!isMounted) {
        return;
      }

      if (storedState) {
        setNotificationAccessState(storedState.notificationAccessState);
        setOnboardingCompleted(storedState.onboardingCompleted);
        setTransactions(storedState.transactions);
        setScreen(storedState.onboardingCompleted ? 'home' : 'onboarding');
      }

      setIsHydrating(false);
    }

    void hydrateLocalState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void saveStoredSpendTrackerState({
      notificationAccessState,
      onboardingCompleted,
      transactions,
    });
  }, [isHydrating, notificationAccessState, onboardingCompleted, transactions]);

  async function handleOpenNotificationAccess() {
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
      } else {
        await Linking.openSettings();
      }

      setNotificationAccessState('settings_opened');
    } catch {
      Alert.alert(
        'Unable to open settings',
        'Open the system settings manually and allow notification access for UPI Spend Tracker.',
      );
    }
  }

  function handleStartClassification(transactionId: string) {
    const transaction = getTransactionById(transactions, transactionId);

    if (!transaction) {
      return;
    }

    setActiveTransactionId(transaction.id);
    setDraft(buildClassificationDraft(transaction));
    setScreen('classify');
  }

  function handleSaveClassification() {
    if (!activeTransactionId || !draft.categoryId || !draft.itemLabel.trim()) {
      return;
    }

    const categoryId = draft.categoryId;
    const itemLabel = draft.itemLabel.trim();

    const nextTransactions = transactions.map((transaction) => {
      if (transaction.id !== activeTransactionId) {
        return transaction;
      }

      return {
        ...transaction,
        items: [
          {
            amountMinor: transaction.amountMinor,
            categoryId,
            id: `${transaction.id}_item_1`,
            label: itemLabel,
          },
        ],
        status: 'classified' as const,
      };
    });

    setTransactions(nextTransactions);
    setActiveTransactionId(null);
    setDraft({ ...EMPTY_DRAFT });
    setScreen(getPendingTransactions(nextTransactions).length > 0 ? 'inbox' : 'home');
  }

  function handleCancelClassification() {
    setActiveTransactionId(null);
    setDraft({ ...EMPTY_DRAFT });
    setScreen('inbox');
  }

  async function handleResetDemoData() {
    setActiveTransactionId(null);
    setDraft({ ...EMPTY_DRAFT });
    setNotificationAccessState('not_started');
    setOnboardingCompleted(false);
    setTransactions(seededTransactions);
    setScreen('onboarding');

    try {
      await clearStoredSpendTrackerState();
    } catch {
      Alert.alert(
        'Unable to reset local data',
        'Close and reopen the app if the local demo state does not reset cleanly.',
      );
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.heroGlowPrimary} />
      <View style={styles.heroGlowSecondary} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{APP_COPY.stage}</Text>
          <Text style={styles.title}>{APP_COPY.title}</Text>
          <Text style={styles.subtitle}>{APP_COPY.subtitle}</Text>
        </View>

        {isHydrating ? (
          <HydrationScreen />
        ) : null}

        {!isHydrating && screen === 'onboarding' ? (
          <OnboardingScreen
            notificationAccessState={notificationAccessState}
            onContinue={() => {
              setOnboardingCompleted(true);
              setScreen('home');
            }}
            onOpenNotificationAccess={handleOpenNotificationAccess}
          />
        ) : null}

        {!isHydrating && screen === 'home' ? (
          <HomeScreen
            nextPendingTransaction={pendingTransactions[0] ?? null}
            notificationAccessState={notificationAccessState}
            onOpenInbox={() => setScreen('inbox')}
            onOpenNotificationAccess={handleOpenNotificationAccess}
            onResetDemoData={handleResetDemoData}
            onSelectTab={setScreen}
            onStartClassification={handleStartClassification}
            summary={summary}
          />
        ) : null}

        {!isHydrating && screen === 'inbox' ? (
          <InboxScreen
            onOpenHome={() => setScreen('home')}
            onSelectTab={setScreen}
            onStartClassification={handleStartClassification}
            pendingTransactions={pendingTransactions}
          />
        ) : null}

        {!isHydrating && screen === 'classify' && activeTransaction ? (
          <ClassifyScreen
            draft={draft}
            onCancel={handleCancelClassification}
            onChangeItemLabel={(itemLabel) =>
              setDraft((currentDraft) => ({ ...currentDraft, itemLabel }))
            }
            onSave={handleSaveClassification}
            onSelectCategory={(categoryId) =>
              setDraft((currentDraft) => ({ ...currentDraft, categoryId }))
            }
            transaction={activeTransaction}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function HydrationScreen() {
  return (
    <SectionCard accentColor={colors.heroGlowSecondary}>
      <Text style={styles.sectionEyebrow}>Local session</Text>
      <Text style={styles.cardTitle}>Restoring saved state on this device</Text>
      <Text style={styles.bodyCopy}>
        Reading the last onboarding and classification state from local SQLite-backed storage.
      </Text>
    </SectionCard>
  );
}

function OnboardingScreen({
  notificationAccessState,
  onContinue,
  onOpenNotificationAccess,
}: {
  notificationAccessState: NotificationAccessState;
  onContinue: () => void;
  onOpenNotificationAccess: () => Promise<void>;
}) {
  const isAndroid = Platform.OS === 'android';

  return (
    <View style={styles.stack}>
      <SectionCard accentColor={colors.accentSoft}>
        <Text style={styles.sectionEyebrow}>Onboarding</Text>
        <Text style={styles.sectionTitle}>Capture each UPI payment while it is fresh.</Text>
        <Text style={styles.bodyCopy}>
          Start with notification access on Android, then review spends from a local-first inbox.
        </Text>
        <StatusChip
          label={
            notificationAccessState === 'settings_opened'
              ? 'Settings opened'
              : 'Not set up'
          }
          tone={
            notificationAccessState === 'settings_opened' ? 'ready' : 'pending'
          }
        />
      </SectionCard>

      <View style={styles.infoStack}>
        <SectionCard accentColor={colors.panelWarm}>
          <Text style={styles.cardTitle}>What the app will do</Text>
          <Text style={styles.bodyCopy}>
            Detect supported payment notifications, turn them into spend events, and keep the first
            review loop fast.
          </Text>
        </SectionCard>

        <SectionCard accentColor={colors.successSoft}>
          <Text style={styles.cardTitle}>Privacy posture</Text>
          <Text style={styles.bodyCopy}>
            This shell stays local-only. Sync, exports, and background capture still arrive in later
            tickets.
          </Text>
        </SectionCard>
      </View>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Setup right now</Text>
        <Text style={styles.bodyCopy}>
          {isAndroid
            ? 'Open Android notification access, enable the app, then return here to continue with the first dashboard shell.'
            : 'Open iOS app settings, then return here. iOS remains shell-only and does not support notification capture in v1.'}
        </Text>
        <View style={styles.actionRow}>
          <ActionButton
            label={isAndroid ? 'Open notification access' : 'Open app settings'}
            onPress={onOpenNotificationAccess}
            tone="primary"
          />
          <ActionButton
            label="Continue in local-only mode"
            onPress={onContinue}
            tone="secondary"
          />
        </View>
      </SectionCard>
    </View>
  );
}

function HomeScreen({
  nextPendingTransaction,
  notificationAccessState,
  onOpenInbox,
  onOpenNotificationAccess,
  onResetDemoData,
  onSelectTab,
  onStartClassification,
  summary,
}: {
  nextPendingTransaction: Transaction | null;
  notificationAccessState: NotificationAccessState;
  onOpenInbox: () => void;
  onOpenNotificationAccess: () => Promise<void>;
  onResetDemoData: () => Promise<void>;
  onSelectTab: (screen: Screen) => void;
  onStartClassification: (transactionId: string) => void;
  summary: DashboardSummary;
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.tabs}>
        <TabButton isActive={true} label="Home" onPress={() => onSelectTab('home')} />
        <TabButton isActive={false} label="Inbox" onPress={() => onSelectTab('inbox')} />
      </View>

      <SectionCard accentColor={colors.accentSoft}>
        <Text style={styles.sectionEyebrow}>Today</Text>
        <Text style={styles.sectionTitle}>Current cycle at a glance</Text>
        <Text style={styles.bodyCopy}>
          This seeded local session now covers the core review loop: totals on Home, uncategorized
          work in Inbox, and a quick classify path inside the app.
        </Text>
      </SectionCard>

      <View style={styles.metricGrid}>
        <MetricCard label="Total spend" value={formatCurrency(summary.totalSpendMinor)} />
        <MetricCard label="Inbox" value={`${summary.inboxCount} pending`} />
        <MetricCard label="Top category" value={summary.topCategoryLabel} />
        <MetricCard label="Top merchant" value={summary.topMerchantLabel} />
      </View>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>Next to review</Text>
        {nextPendingTransaction ? (
          <>
            <Text style={styles.bodyCopy}>
              {nextPendingTransaction.merchant} for{' '}
              {formatCurrency(nextPendingTransaction.amountMinor)} from{' '}
              {nextPendingTransaction.sourceApp} at{' '}
              {formatCaptureMoment(nextPendingTransaction.capturedAt)} is still waiting in the Inbox.
            </Text>
            <View style={styles.actionRow}>
              <ActionButton
                label="Classify next"
                onPress={() => onStartClassification(nextPendingTransaction.id)}
                tone="primary"
              />
              <ActionButton label="Open inbox" onPress={onOpenInbox} tone="secondary" />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.bodyCopy}>
              You are caught up for this session. New uncategorized spends will appear here once the
              capture pipeline and local persistence land.
            </Text>
            <ActionButton label="Open inbox" onPress={onOpenInbox} tone="secondary" />
          </>
        )}
      </SectionCard>

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Local loop status</Text>
        <Text style={styles.bodyCopy}>
          {summary.classifiedCount} transactions already carry user meaning. Changes now persist on
          this device and survive app restarts until the demo state is reset.
        </Text>
        <StatusChip
          label={
            notificationAccessState === 'settings_opened'
              ? 'Notification settings opened'
              : 'Notification access not confirmed'
          }
          tone={
            notificationAccessState === 'settings_opened' ? 'ready' : 'pending'
          }
        />
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Scope right now</Text>
        <Text style={styles.bodyCopy}>
          Android system settings can already be opened from the app, and the demo persists locally
          with SQLite-backed storage. Real permission checks, native capture import, and full local
          domain tables remain separate implementation steps.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton
            label="Review notification access"
            onPress={onOpenNotificationAccess}
            tone="secondary"
          />
          <ActionButton label="Reset demo data" onPress={onResetDemoData} tone="secondary" />
        </View>
      </SectionCard>
    </View>
  );
}

function InboxScreen({
  onOpenHome,
  onSelectTab,
  onStartClassification,
  pendingTransactions,
}: {
  onOpenHome: () => void;
  onSelectTab: (screen: Screen) => void;
  onStartClassification: (transactionId: string) => void;
  pendingTransactions: Transaction[];
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.tabs}>
        <TabButton isActive={false} label="Home" onPress={() => onSelectTab('home')} />
        <TabButton isActive={true} label="Inbox" onPress={() => onSelectTab('inbox')} />
      </View>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.sectionEyebrow}>Inbox</Text>
        <Text style={styles.sectionTitle}>
          {pendingTransactions.length > 0 ? 'Classify what you skipped' : 'Inbox is empty'}
        </Text>
        <Text style={styles.bodyCopy}>
          {pendingTransactions.length > 0
            ? 'Every uncategorized payment stays here until the user adds meaning. Changes should show up immediately in the dashboard.'
            : 'The current session has no uncategorized transactions left. Future captured or manually added spends will show up here.'}
        </Text>
      </SectionCard>

      {pendingTransactions.length > 0 ? (
        <View style={styles.listStack}>
          {pendingTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              onStartClassification={onStartClassification}
              transaction={transaction}
            />
          ))}
        </View>
      ) : (
        <SectionCard accentColor={colors.successSoft}>
          <Text style={styles.cardTitle}>All caught up</Text>
          <Text style={styles.bodyCopy}>
            Return to Home to review the updated totals and top-spend signals for this session.
          </Text>
          <ActionButton label="Back to home" onPress={onOpenHome} tone="secondary" />
        </SectionCard>
      )}
    </View>
  );
}

function ClassifyScreen({
  draft,
  onCancel,
  onChangeItemLabel,
  onSave,
  onSelectCategory,
  transaction,
}: {
  draft: ClassificationDraft;
  onCancel: () => void;
  onChangeItemLabel: (itemLabel: string) => void;
  onSave: () => void;
  onSelectCategory: (categoryId: CategoryId) => void;
  transaction: Transaction;
}) {
  const saveDisabled = !draft.categoryId || !draft.itemLabel.trim();

  return (
    <View style={styles.stack}>
      <SectionCard accentColor={colors.accentSoft}>
        <Text style={styles.sectionEyebrow}>Quick classify</Text>
        <Text style={styles.sectionTitle}>Turn this payment into a usable spend</Text>
        <Text style={styles.bodyCopy}>
          This stand-in app flow mirrors the real v1 job: add a label, pick a category, and save the
          spend without leaving the local session.
        </Text>
      </SectionCard>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>{transaction.merchant}</Text>
        <Text style={styles.amountLabel}>{formatCurrency(transaction.amountMinor)}</Text>
        <Text style={styles.bodyCopy}>
          {transaction.sourceApp} captured at {formatCaptureMoment(transaction.capturedAt)}
        </Text>
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.fieldLabel}>Item label</Text>
        <TextInput
          onChangeText={onChangeItemLabel}
          placeholder="What did you buy?"
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
          value={draft.itemLabel}
        />

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {categoryOptions.map((category) => (
            <CategoryChip
              isActive={draft.categoryId === category.id}
              key={category.id}
              label={category.label}
              onPress={() => onSelectCategory(category.id)}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Save behavior</Text>
        <Text style={styles.bodyCopy}>
          Saving removes the payment from Inbox and recalculates Home immediately. Persistence still
          belongs to a later local DB ticket.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton label="Back to inbox" onPress={onCancel} tone="secondary" />
          <ActionButton
            disabled={saveDisabled}
            label="Save classification"
            onPress={onSave}
            tone="primary"
          />
        </View>
      </SectionCard>
    </View>
  );
}

function SectionCard({
  accentColor,
  children,
}: {
  accentColor: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={[styles.sectionAccent, { backgroundColor: accentColor }]} />
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: 'pending' | 'ready';
}) {
  return (
    <View
      style={[
        styles.statusChip,
        tone === 'ready' ? styles.statusChipReady : styles.statusChipPending,
      ]}
    >
      <Text style={styles.statusChipText}>{label}</Text>
    </View>
  );
}

function ActionButton({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
  tone,
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
  tone: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
        disabled ? styles.buttonDisabled : null,
        pressed ? styles.buttonPressed : null,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          tone === 'primary' ? styles.buttonLabelPrimary : styles.buttonLabelSecondary,
          disabled ? styles.buttonLabelDisabled : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TabButton({
  isActive,
  label,
  onPress,
}: {
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.tabButton,
        isActive ? styles.tabButtonActive : styles.tabButtonInactive,
      ]}
    >
      <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : styles.tabLabelInactive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function CategoryChip({
  isActive,
  label,
  onPress,
}: {
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.categoryChip,
        isActive ? styles.categoryChipActive : styles.categoryChipIdle,
      ]}
    >
      <Text
        style={[
          styles.categoryChipLabel,
          isActive ? styles.categoryChipLabelActive : styles.categoryChipLabelIdle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TransactionCard({
  onStartClassification,
  transaction,
}: {
  onStartClassification: (transactionId: string) => void;
  transaction: Transaction;
}) {
  return (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionCopy}>
          <Text style={styles.transactionTitle}>{transaction.merchant}</Text>
          <Text style={styles.transactionMeta}>
            {transaction.sourceApp} | {formatCaptureMoment(transaction.capturedAt)}
          </Text>
        </View>
        <Text style={styles.transactionAmount}>{formatCurrency(transaction.amountMinor)}</Text>
      </View>

      <Text style={styles.bodyCopy}>No item or category has been saved for this payment yet.</Text>

      <ActionButton
        accessibilityLabel={`Classify ${transaction.merchant}`}
        label="Classify"
        onPress={() => onStartClassification(transaction.id)}
        tone="primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    gap: 12,
    marginTop: 8,
  },
  amountLabel: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  bodyCopy: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    alignItems: 'center',
    borderRadius: 18,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  buttonLabelDisabled: {
    color: colors.inkMuted,
  },
  buttonLabelPrimary: {
    color: colors.panel,
  },
  buttonLabelSecondary: {
    color: colors.accentText,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonPrimary: {
    backgroundColor: colors.accentStrong,
  },
  buttonSecondary: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.edgeStrong,
    borderWidth: 1,
  },
  categoryChip: {
    borderRadius: 999,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  categoryChipActive: {
    backgroundColor: colors.accentStrong,
  },
  categoryChipIdle: {
    backgroundColor: colors.panel,
    borderColor: colors.edgeStrong,
    borderWidth: 1,
  },
  categoryChipLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoryChipLabelActive: {
    color: colors.panel,
  },
  categoryChipLabelIdle: {
    color: colors.accentText,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  eyebrow: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  header: {
    gap: 12,
  },
  input: {
    backgroundColor: colors.panel,
    borderColor: colors.edgeStrong,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroGlowPrimary: {
    backgroundColor: colors.heroGlowPrimary,
    borderRadius: 180,
    height: 240,
    left: -60,
    position: 'absolute',
    top: -40,
    width: 240,
  },
  heroGlowSecondary: {
    backgroundColor: colors.heroGlowSecondary,
    borderRadius: 220,
    height: 280,
    position: 'absolute',
    right: -90,
    top: 120,
    width: 280,
  },
  infoStack: {
    gap: 12,
  },
  listStack: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: colors.panel,
    borderColor: colors.edge,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    minHeight: 120,
    padding: 18,
    width: '48%',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  screen: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 72,
  },
  sectionAccent: {
    borderRadius: 20,
    height: 76,
    width: 76,
  },
  sectionBody: {
    gap: 12,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.edge,
    borderRadius: 30,
    borderWidth: 1,
    gap: 18,
    padding: 18,
  },
  sectionEyebrow: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  stack: {
    gap: 16,
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipPending: {
    backgroundColor: colors.warningSoft,
  },
  statusChipReady: {
    backgroundColor: colors.successSoft,
  },
  statusChipText: {
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 620,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 999,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  tabButtonActive: {
    backgroundColor: colors.accentStrong,
  },
  tabButtonInactive: {
    backgroundColor: colors.panel,
    borderColor: colors.edgeStrong,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: colors.panel,
  },
  tabLabelInactive: {
    color: colors.accentText,
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
  },
  transactionAmount: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  transactionCard: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.edge,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  transactionCopy: {
    flex: 1,
    gap: 4,
  },
  transactionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  transactionMeta: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  transactionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  title: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
