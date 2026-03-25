import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
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
  classifyTransaction,
  createManualTransaction,
  DEFAULT_INBOX_FILTERS,
  deleteTransaction,
  formatCaptureMoment,
  formatCurrency,
  getInboxReviewTransactions,
  getInboxSourceAppOptions,
  getPendingTransactions,
  getTransactionById,
  parseCurrencyInputToMinor,
  restoreSkippedTransaction,
  seededTransactions,
  skipTransaction,
  sortTransactionsByCapturedAtDesc,
  summarizeDashboard,
  type CategoryId,
  type ClassificationDraft,
  type DashboardSummary,
  type InboxFilters,
  type InboxReviewItem,
  type Transaction,
} from '../features/spend-tracker/domain';
import {
  clearStoredSpendTrackerState,
  DEFAULT_ONBOARDING_PREFERENCES,
  loadStoredSpendTrackerState,
  saveStoredSpendTrackerState,
  type BudgetCycleId,
  type NotificationAccessState,
  type OnboardingPreferences,
  type SupportedSourceAppId,
  type SyncMode,
} from '../features/spend-tracker/persistence';
import { APP_COPY } from '../lib/app-info';
import { colors } from '../theme/colors';

type Screen = 'classify' | 'home' | 'inbox' | 'manual' | 'onboarding';
type TabScreen = 'home' | 'inbox';

const EMPTY_DRAFT: ClassificationDraft = {
  categoryId: null,
  itemLabel: '',
};

interface ManualEntryDraft {
  amountInput: string;
  categoryId: CategoryId | null;
  itemLabel: string;
  merchant: string;
}

const EMPTY_MANUAL_ENTRY_DRAFT: ManualEntryDraft = {
  amountInput: '',
  categoryId: null,
  itemLabel: '',
  merchant: '',
};

interface SourceAppOption {
  id: SupportedSourceAppId;
  label: string;
}

interface PreferenceOption<T extends string> {
  description: string;
  id: T;
  label: string;
}

const SOURCE_APP_OPTIONS: SourceAppOption[] = [
  { id: 'google_pay', label: 'Google Pay' },
  { id: 'phonepe', label: 'PhonePe' },
  { id: 'paytm', label: 'Paytm' },
  { id: 'bhim', label: 'BHIM' },
];

const BUDGET_CYCLE_OPTIONS: PreferenceOption<BudgetCycleId>[] = [
  {
    description: 'Track spend from the 1st to the last day of each month.',
    id: 'calendar_month',
    label: 'Calendar month',
  },
  {
    description: 'Use a salary-style cycle that resets on the 26th.',
    id: 'salary_cycle',
    label: 'Salary cycle',
  },
  {
    description: 'Use a billing-style cycle that resets on the 5th.',
    id: 'billing_cycle',
    label: 'Billing cycle',
  },
];

const SYNC_MODE_OPTIONS: PreferenceOption<SyncMode>[] = [
  {
    description: 'Keep everything on this device. No account or pairing required.',
    id: 'local_only',
    label: 'Local-only for now',
  },
  {
    description: 'Save the preference now. The app still runs local-first until sync ships.',
    id: 'sync_later',
    label: 'Prepare for sync later',
  },
];

const DASHBOARD_BUDGET_TARGET_MINOR = 500000;

export function SpendTrackerApp() {
  const [isHydrating, setIsHydrating] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [onboardingPreferences, setOnboardingPreferences] = useState<OnboardingPreferences>(
    DEFAULT_ONBOARDING_PREFERENCES,
  );
  const [notificationAccessState, setNotificationAccessState] =
    useState<NotificationAccessState>('not_started');
  const [transactions, setTransactions] = useState<Transaction[]>(seededTransactions);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClassificationDraft>(EMPTY_DRAFT);
  const [manualDraft, setManualDraft] =
    useState<ManualEntryDraft>(EMPTY_MANUAL_ENTRY_DRAFT);
  const [inboxFilters, setInboxFilters] = useState<InboxFilters>(DEFAULT_INBOX_FILTERS);
  const [manualReturnScreen, setManualReturnScreen] = useState<TabScreen>('home');

  const pendingTransactions = getPendingTransactions(transactions);
  const allReviewTransactions = getInboxReviewTransactions(transactions, {
    ...DEFAULT_INBOX_FILTERS,
    statusFilter: 'all',
  });
  const filteredReviewTransactions = getInboxReviewTransactions(transactions, inboxFilters);
  const inboxSourceAppOptions = getInboxSourceAppOptions(transactions);
  const summary = summarizeDashboard(transactions, {
    budgetTargetMinor: DASHBOARD_BUDGET_TARGET_MINOR,
    cycleStartDay: getBudgetCycleStartDay(onboardingPreferences.budgetCycleId),
  });
  const activeTransaction = activeTransactionId
    ? getTransactionById(transactions, activeTransactionId)
    : null;
  const manualAmountMinor = parseCurrencyInputToMinor(manualDraft.amountInput);

  useEffect(() => {
    let isMounted = true;

    async function hydrateLocalState() {
      const storedState = await loadStoredSpendTrackerState();

      if (!isMounted) {
        return;
      }

      if (storedState) {
        setOnboardingPreferences(storedState.onboardingPreferences);
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
      onboardingPreferences,
      notificationAccessState,
      onboardingCompleted,
      transactions,
    });
  }, [
    isHydrating,
    notificationAccessState,
    onboardingCompleted,
    onboardingPreferences,
    transactions,
  ]);

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

    const nextTransactions = classifyTransaction(transactions, activeTransactionId, draft);

    setTransactions(nextTransactions);
    setActiveTransactionId(null);
    setDraft({ ...EMPTY_DRAFT });
    setScreen(
      getInboxReviewTransactions(nextTransactions, {
        ...DEFAULT_INBOX_FILTERS,
        statusFilter: 'all',
      }).length > 0
        ? 'inbox'
        : 'home',
    );
  }

  function handleCancelClassification() {
    setActiveTransactionId(null);
    setDraft({ ...EMPTY_DRAFT });
    setScreen('inbox');
  }

  function handleOpenManualEntry(returnScreen: TabScreen) {
    setManualReturnScreen(returnScreen);
    setManualDraft({ ...EMPTY_MANUAL_ENTRY_DRAFT });
    setScreen('manual');
  }

  function handleOpenBudgetPlaceholder() {
    Alert.alert(
      'Budgets come next',
      'Home now shows current-cycle budget progress, but budget creation and editing still land in a later ticket.',
    );
  }

  function handleOpenSearchPlaceholder() {
    Alert.alert(
      'Search comes next',
      'Search and full-history browsing are still queued behind the current dashboard and Inbox work.',
    );
  }

  function handleToggleSourceAppSelection(sourceAppId: SupportedSourceAppId) {
    setOnboardingPreferences((currentPreferences) => {
      const nextSelection = currentPreferences.selectedSourceAppIds.includes(sourceAppId)
        ? currentPreferences.selectedSourceAppIds.filter((id) => id !== sourceAppId)
        : [...currentPreferences.selectedSourceAppIds, sourceAppId];

      return {
        ...currentPreferences,
        selectedSourceAppIds: SOURCE_APP_OPTIONS
          .map((option) => option.id)
          .filter((id) => nextSelection.includes(id)),
      };
    });
  }

  function handleSelectAllSourceApps() {
    setOnboardingPreferences((currentPreferences) => ({
      ...currentPreferences,
      selectedSourceAppIds: SOURCE_APP_OPTIONS.map((option) => option.id),
    }));
  }

  function handleClearSourceApps() {
    setOnboardingPreferences((currentPreferences) => ({
      ...currentPreferences,
      selectedSourceAppIds: [],
    }));
  }

  function handleSelectBudgetCycle(budgetCycleId: BudgetCycleId) {
    setOnboardingPreferences((currentPreferences) => ({
      ...currentPreferences,
      budgetCycleId,
    }));
  }

  function handleSelectSyncMode(syncMode: SyncMode) {
    setOnboardingPreferences((currentPreferences) => ({
      ...currentPreferences,
      syncMode,
    }));
  }

  function handleSaveManualEntry() {
    if (
      !manualAmountMinor ||
      manualAmountMinor <= 0 ||
      !manualDraft.categoryId ||
      !manualDraft.itemLabel.trim() ||
      !manualDraft.merchant.trim()
    ) {
      return;
    }

    const nextTransactions = sortTransactionsByCapturedAtDesc([
      createManualTransaction({
        amountMinor: manualAmountMinor,
        categoryId: manualDraft.categoryId,
        itemLabel: manualDraft.itemLabel,
        merchant: manualDraft.merchant,
      }),
      ...transactions,
    ]);

    setTransactions(nextTransactions);
    setManualDraft({ ...EMPTY_MANUAL_ENTRY_DRAFT });
    setScreen('home');
  }

  function handleCancelManualEntry() {
    setManualDraft({ ...EMPTY_MANUAL_ENTRY_DRAFT });
    setScreen(manualReturnScreen);
  }

  function handleUpdateInboxFilters(nextFilters: Partial<InboxFilters>) {
    setInboxFilters((currentFilters) => ({
      ...currentFilters,
      ...nextFilters,
    }));
  }

  function handleClearInboxFilters() {
    setInboxFilters({ ...DEFAULT_INBOX_FILTERS });
  }

  function handleSkipInboxTransaction(transactionId: string) {
    setTransactions((currentTransactions) =>
      skipTransaction(currentTransactions, transactionId),
    );
  }

  function handleRestoreSkippedInboxTransaction(transactionId: string) {
    setTransactions((currentTransactions) =>
      restoreSkippedTransaction(currentTransactions, transactionId),
    );
  }

  function handleDeleteInboxTransaction(transactionId: string) {
    setTransactions((currentTransactions) =>
      deleteTransaction(currentTransactions, transactionId),
    );
  }

  async function handleResetDemoData() {
    setActiveTransactionId(null);
    setDraft({ ...EMPTY_DRAFT });
    setInboxFilters({ ...DEFAULT_INBOX_FILTERS });
    setManualDraft({ ...EMPTY_MANUAL_ENTRY_DRAFT });
    setOnboardingPreferences(DEFAULT_ONBOARDING_PREFERENCES);
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
      <View style={styles.screenContent}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{APP_COPY.stage}</Text>
          <Text style={styles.title}>{APP_COPY.title}</Text>
          <Text style={styles.subtitle}>{APP_COPY.subtitle}</Text>
        </View>

        {!isHydrating && screen === 'inbox' ? (
          <InboxScreen
            allReviewCount={allReviewTransactions.length}
            filters={inboxFilters}
            filteredReviewTransactions={filteredReviewTransactions}
            hasActiveFilters={hasActiveInboxFilters(inboxFilters)}
            inboxSourceAppOptions={inboxSourceAppOptions}
            onClearFilters={handleClearInboxFilters}
            onDeleteTransaction={handleDeleteInboxTransaction}
            onOpenHome={() => setScreen('home')}
            onOpenManualEntry={() => handleOpenManualEntry('inbox')}
            onRestoreTransaction={handleRestoreSkippedInboxTransaction}
            onSelectTab={(nextScreen) => setScreen(nextScreen)}
            onSkipTransaction={handleSkipInboxTransaction}
            onStartClassification={handleStartClassification}
            onUpdateFilters={handleUpdateInboxFilters}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {isHydrating ? (
              <HydrationScreen />
            ) : null}

            {!isHydrating && screen === 'onboarding' ? (
              <OnboardingScreen
                onboardingPreferences={onboardingPreferences}
                notificationAccessState={notificationAccessState}
                onContinue={() => {
                  setOnboardingCompleted(true);
                  setScreen('home');
                }}
                onClearSourceApps={handleClearSourceApps}
                onOpenNotificationAccess={handleOpenNotificationAccess}
                onSelectAllSourceApps={handleSelectAllSourceApps}
                onSelectBudgetCycle={handleSelectBudgetCycle}
                onSelectSyncMode={handleSelectSyncMode}
                onToggleSourceApp={handleToggleSourceAppSelection}
              />
            ) : null}

            {!isHydrating && screen === 'home' ? (
              <HomeScreen
                nextPendingTransaction={pendingTransactions[0] ?? null}
                notificationAccessState={notificationAccessState}
                onboardingPreferences={onboardingPreferences}
                onOpenBudgetPlaceholder={handleOpenBudgetPlaceholder}
                onOpenInbox={() => setScreen('inbox')}
                onOpenManualEntry={() => handleOpenManualEntry('home')}
                onOpenNotificationAccess={handleOpenNotificationAccess}
                onOpenSearchPlaceholder={handleOpenSearchPlaceholder}
                onResetDemoData={handleResetDemoData}
                onSelectTab={(nextScreen) => setScreen(nextScreen)}
                onStartClassification={handleStartClassification}
                summary={summary}
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

            {!isHydrating && screen === 'manual' ? (
              <ManualEntryScreen
                amountMinor={manualAmountMinor}
                draft={manualDraft}
                onCancel={handleCancelManualEntry}
                onChangeAmount={(amountInput) =>
                  setManualDraft((currentDraft) => ({ ...currentDraft, amountInput }))
                }
                onChangeItemLabel={(itemLabel) =>
                  setManualDraft((currentDraft) => ({ ...currentDraft, itemLabel }))
                }
                onChangeMerchant={(merchant) =>
                  setManualDraft((currentDraft) => ({ ...currentDraft, merchant }))
                }
                onSave={handleSaveManualEntry}
                onSelectCategory={(categoryId) =>
                  setManualDraft((currentDraft) => ({ ...currentDraft, categoryId }))
                }
              />
            ) : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function HydrationScreen() {
  return (
    <SectionCard accentColor={colors.heroGlowSecondary}>
      <Text style={styles.sectionEyebrow}>Local session</Text>
      <Text style={styles.cardTitle}>Restoring saved state on this device</Text>
      <Text style={styles.bodyCopy}>
        Reading the last onboarding choices, notification setup state, and saved transactions from
        local SQLite tables.
      </Text>
    </SectionCard>
  );
}

function OnboardingScreen({
  onboardingPreferences,
  notificationAccessState,
  onContinue,
  onClearSourceApps,
  onOpenNotificationAccess,
  onSelectAllSourceApps,
  onSelectBudgetCycle,
  onSelectSyncMode,
  onToggleSourceApp,
}: {
  onboardingPreferences: OnboardingPreferences;
  notificationAccessState: NotificationAccessState;
  onContinue: () => void;
  onClearSourceApps: () => void;
  onOpenNotificationAccess: () => Promise<void>;
  onSelectAllSourceApps: () => void;
  onSelectBudgetCycle: (budgetCycleId: BudgetCycleId) => void;
  onSelectSyncMode: (syncMode: SyncMode) => void;
  onToggleSourceApp: (sourceAppId: SupportedSourceAppId) => void;
}) {
  const isAndroid = Platform.OS === 'android';
  const selectedSourceAppsSummary =
    onboardingPreferences.selectedSourceAppIds.length > 0
      ? onboardingPreferences.selectedSourceAppIds
          .map((sourceAppId) => getSourceAppLabel(sourceAppId))
          .join(', ')
      : 'No source apps selected yet';
  const selectedBudgetCycleLabel = getBudgetCycleLabel(
    onboardingPreferences.budgetCycleId,
  );
  const selectedSyncModeLabel = getSyncModeLabel(onboardingPreferences.syncMode);
  const completionCount = [
    notificationAccessState === 'settings_opened',
    onboardingPreferences.selectedSourceAppIds.length > 0,
    true,
    true,
  ].filter(Boolean).length;
  const finishLabel =
    onboardingPreferences.syncMode === 'local_only'
      ? 'Continue in local-only mode'
      : 'Finish setup';

  return (
    <View style={styles.stack}>
      <SectionCard accentColor={colors.accentSoft}>
        <Text style={styles.sectionEyebrow}>Onboarding</Text>
        <Text style={styles.sectionTitle}>Capture each UPI payment while it is fresh.</Text>
        <Text style={styles.bodyCopy}>
          Start with notification access on Android, choose your source apps and budget cycle, then
          keep the first review loop local-first.
        </Text>
        <StatusChip
          label={`${completionCount} of 4 setup choices saved`}
          tone={completionCount >= 3 ? 'ready' : 'pending'}
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
            Raw notification review, classification, and manual add stay on-device today. Sync and
            native capture still arrive in later tickets.
          </Text>
        </SectionCard>
      </View>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Notification access</Text>
        <Text style={styles.bodyCopy}>
          {isAndroid
            ? 'Notification access is needed before Android can hand UPI payment alerts to the app. Open the system screen, review the permission, then return here to finish setup.'
            : 'Open iOS app settings, then return here. iOS remains shell-only and does not support notification capture in v1.'}
        </Text>
        <StatusChip
          label={
            notificationAccessState === 'settings_opened'
              ? 'Settings opened'
              : 'Still needs review'
          }
          tone={notificationAccessState === 'settings_opened' ? 'ready' : 'pending'}
        />
        <View style={styles.actionRow}>
          <ActionButton
            label={isAndroid ? 'Open notification access' : 'Open app settings'}
            onPress={onOpenNotificationAccess}
            tone="primary"
          />
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>Source apps</Text>
        <Text style={styles.bodyCopy}>
          Choose which payment apps to prepare for capture later. These are saved as local
          onboarding preferences today and do not yet control Android-native filtering.
        </Text>
        <StatusChip
          label={
            onboardingPreferences.selectedSourceAppIds.length > 0
              ? `${onboardingPreferences.selectedSourceAppIds.length} apps selected`
              : 'No apps selected'
          }
          tone={
            onboardingPreferences.selectedSourceAppIds.length > 0 ? 'ready' : 'pending'
          }
        />
        <View style={styles.actionRow}>
          <ActionButton
            label="Select all supported apps"
            onPress={onSelectAllSourceApps}
            tone="secondary"
          />
          <ActionButton label="Deselect all" onPress={onClearSourceApps} tone="secondary" />
        </View>
        <View style={styles.categoryGrid}>
          {SOURCE_APP_OPTIONS.map((sourceApp) => (
            <CategoryChip
              isActive={onboardingPreferences.selectedSourceAppIds.includes(sourceApp.id)}
              key={sourceApp.id}
              label={sourceApp.label}
              onPress={() => onToggleSourceApp(sourceApp.id)}
            />
          ))}
        </View>
        <Text style={styles.helperCopy}>{selectedSourceAppsSummary}</Text>
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Budget cycle</Text>
        <Text style={styles.bodyCopy}>
          Pick the cycle that should anchor Home totals and future budget tracking.
        </Text>
        <View style={styles.optionStack}>
          {BUDGET_CYCLE_OPTIONS.map((option) => (
            <PreferenceCard
              description={option.description}
              isActive={onboardingPreferences.budgetCycleId === option.id}
              key={option.id}
              label={option.label}
              onPress={() => onSelectBudgetCycle(option.id)}
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Sync preference</Text>
        <Text style={styles.bodyCopy}>
          Both paths stay local today. This choice simply records whether the user wants to stay
          device-only or prepare for sync once pairing ships.
        </Text>
        <View style={styles.optionStack}>
          {SYNC_MODE_OPTIONS.map((option) => (
            <PreferenceCard
              description={option.description}
              isActive={onboardingPreferences.syncMode === option.id}
              key={option.id}
              label={option.label}
              onPress={() => onSelectSyncMode(option.id)}
            />
          ))}
        </View>
        {onboardingPreferences.syncMode === 'sync_later' ? (
          <View style={styles.actionRow}>
            <ActionButton
              label="Skip sync for now"
              onPress={() => onSelectSyncMode('local_only')}
              tone="secondary"
            />
          </View>
        ) : null}
      </SectionCard>

      <SectionCard accentColor={colors.heroGlowSecondary}>
        <Text style={styles.cardTitle}>Finish setup</Text>
        <Text style={styles.bodyCopy}>
          Source apps: {selectedSourceAppsSummary}. Budget cycle: {selectedBudgetCycleLabel}. Sync
          mode: {selectedSyncModeLabel}.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton label={finishLabel} onPress={onContinue} tone="primary" />
        </View>
      </SectionCard>
    </View>
  );
}

function HomeScreen({
  nextPendingTransaction,
  notificationAccessState,
  onboardingPreferences,
  onOpenBudgetPlaceholder,
  onOpenInbox,
  onOpenManualEntry,
  onOpenNotificationAccess,
  onOpenSearchPlaceholder,
  onResetDemoData,
  onSelectTab,
  onStartClassification,
  summary,
}: {
  nextPendingTransaction: Transaction | null;
  notificationAccessState: NotificationAccessState;
  onboardingPreferences: OnboardingPreferences;
  onOpenBudgetPlaceholder: () => void;
  onOpenInbox: () => void;
  onOpenManualEntry: () => void;
  onOpenNotificationAccess: () => Promise<void>;
  onOpenSearchPlaceholder: () => void;
  onResetDemoData: () => Promise<void>;
  onSelectTab: (screen: TabScreen) => void;
  onStartClassification: (transactionId: string) => void;
  summary: DashboardSummary;
}) {
  const selectedSourceAppsSummary =
    onboardingPreferences.selectedSourceAppIds.length > 0
      ? onboardingPreferences.selectedSourceAppIds
          .map((sourceAppId) => getSourceAppLabel(sourceAppId))
          .join(', ')
      : 'None selected';
  const budgetUsedPercent = Math.round(summary.budgetUsedRatio * 100);
  const budgetOverrunMinor = Math.max(
    summary.totalSpendMinor - summary.budgetTargetMinor,
    0,
  );

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
          This local-first shell now covers the core review loop: cycle-aware totals on Home,
          uncategorized work in Inbox, quick classify, and manual spend entry without leaving the
          device.
        </Text>
      </SectionCard>

      <View style={styles.metricGrid}>
        <MetricCard label="Total spend" value={formatCurrency(summary.totalSpendMinor)} />
        <MetricCard label="Inbox" value={`${summary.inboxCount} pending`} />
        <MetricCard label="Top category" value={summary.topCategoryLabel} />
        <MetricCard label="Top merchant" value={summary.topMerchantLabel} />
      </View>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>Budget progress</Text>
        <Text style={styles.bodyCopy}>
          Current period: {getBudgetCycleLabel(onboardingPreferences.budgetCycleId)}. The Home
          summary uses the saved cycle choice and a local demo target until the real budget engine
          lands.
        </Text>
        <Text style={styles.amountLabel}>
          {formatCurrency(summary.totalSpendMinor)} of {formatCurrency(summary.budgetTargetMinor)}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(summary.budgetUsedRatio * 100, 0)}%` },
            ]}
          />
        </View>
        <View style={styles.helperStack}>
          <Text style={styles.helperCopy}>{budgetUsedPercent}% of the current-cycle target used</Text>
          <Text style={styles.helperCopy}>
            {budgetOverrunMinor > 0
              ? `${formatCurrency(budgetOverrunMinor)} over the current target`
              : `${formatCurrency(summary.budgetRemainingMinor)} remaining in the current target`}
          </Text>
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <Text style={styles.bodyCopy}>
          Manual add and Inbox are live now. Budget creation and search are honest placeholders for
          the next dashboard passes.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton label="Add manual spend" onPress={onOpenManualEntry} tone="primary" />
          <ActionButton label="Review inbox" onPress={onOpenInbox} tone="secondary" />
          <ActionButton label="Create budget" onPress={onOpenBudgetPlaceholder} tone="secondary" />
          <ActionButton label="Search" onPress={onOpenSearchPlaceholder} tone="secondary" />
        </View>
      </SectionCard>

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
              <ActionButton label="Add manual spend" onPress={onOpenManualEntry} tone="secondary" />
              <ActionButton label="Open inbox" onPress={onOpenInbox} tone="secondary" />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.bodyCopy}>
              You are caught up for this session. Add a manual spend now, or wait for native capture
              import to bring new uncategorized payments into Inbox later.
            </Text>
            <View style={styles.actionRow}>
              <ActionButton label="Add manual spend" onPress={onOpenManualEntry} tone="primary" />
              <ActionButton label="Open inbox" onPress={onOpenInbox} tone="secondary" />
            </View>
          </>
        )}
      </SectionCard>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>Top items</Text>
        {summary.topItems.length > 0 ? (
          <View style={styles.listStack}>
            {summary.topItems.map((item) => (
              <View key={item.transactionId + item.label} style={styles.summaryRow}>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryPrimary}>{item.label}</Text>
                  <Text style={styles.summarySecondary}>
                    {item.merchant} · {item.categoryLabel}
                  </Text>
                </View>
                <Text style={styles.summaryAmount}>{formatCurrency(item.amountMinor)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyCopy}>
            Classify a few spends in Inbox to unlock item-level patterns for the current cycle.
          </Text>
        )}
      </SectionCard>

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Recent activity</Text>
        {summary.recentActivity.length > 0 ? (
          <View style={styles.listStack}>
            {summary.recentActivity.map((transaction) => (
              <View key={transaction.id} style={styles.summaryRow}>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryPrimary}>{transaction.merchant}</Text>
                  <Text style={styles.summarySecondary}>
                    {transaction.items[0]?.label ?? 'Needs classification'} ·{' '}
                    {formatCaptureMoment(transaction.capturedAt)}
                  </Text>
                </View>
                <Text style={styles.summaryAmount}>{formatCurrency(transaction.amountMinor)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyCopy}>
            Add a manual spend or classify Inbox items to build a recent-activity preview.
          </Text>
        )}
      </SectionCard>

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Local loop status</Text>
        <Text style={styles.bodyCopy}>
          {summary.classifiedCount} transactions already carry user meaning. Classified spends and
          manual entries now persist in local SQLite tables and survive app restarts until the demo
          state is reset.
        </Text>
        <View style={styles.helperStack}>
          <Text style={styles.helperCopy}>Source apps: {selectedSourceAppsSummary}</Text>
          <Text style={styles.helperCopy}>
            Budget cycle: {getBudgetCycleLabel(onboardingPreferences.budgetCycleId)}
          </Text>
          <Text style={styles.helperCopy}>
            Sync mode: {getSyncModeLabel(onboardingPreferences.syncMode)}
          </Text>
        </View>
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
          Android system settings can already be opened from the app, and Home plus Inbox now read
          from local SQLite-backed spend tables. Real permission checks and native capture import
          remain separate implementation steps.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton
            label="Review notification access"
            onPress={onOpenNotificationAccess}
            tone="secondary"
          />
          <ActionButton label="Add manual spend" onPress={onOpenManualEntry} tone="secondary" />
          <ActionButton label="Reset demo data" onPress={onResetDemoData} tone="secondary" />
        </View>
      </SectionCard>
    </View>
  );
}

function InboxScreen({
  allReviewCount,
  filteredReviewTransactions,
  filters,
  hasActiveFilters,
  inboxSourceAppOptions,
  onClearFilters,
  onDeleteTransaction,
  onOpenHome,
  onOpenManualEntry,
  onRestoreTransaction,
  onSelectTab,
  onSkipTransaction,
  onStartClassification,
  onUpdateFilters,
}: {
  allReviewCount: number;
  filteredReviewTransactions: InboxReviewItem[];
  filters: InboxFilters;
  hasActiveFilters: boolean;
  inboxSourceAppOptions: string[];
  onClearFilters: () => void;
  onDeleteTransaction: (transactionId: string) => void;
  onOpenHome: () => void;
  onOpenManualEntry: () => void;
  onRestoreTransaction: (transactionId: string) => void;
  onSelectTab: (screen: TabScreen) => void;
  onSkipTransaction: (transactionId: string) => void;
  onStartClassification: (transactionId: string) => void;
  onUpdateFilters: (nextFilters: Partial<InboxFilters>) => void;
}) {
  const statusHeadline =
    filteredReviewTransactions.length > 0
      ? filters.statusFilter === 'skipped'
        ? 'Revisit what you skipped'
        : 'Inbox for unresolved spend'
      : allReviewCount > 0 && hasActiveFilters
        ? 'No items match these filters'
        : 'Inbox is empty';
  const statusBody =
    filteredReviewTransactions.length > 0
      ? 'Use filters to narrow the queue, skip noisy items for later, or classify directly into the local dashboard.'
      : allReviewCount > 0 && hasActiveFilters
        ? 'Clear or relax the active filters to bring hidden review items back into view.'
        : 'The current session has no unresolved local transactions left. Future captured payments will show up here, while manual spends save directly as classified records.';

  return (
    <FlatList
      contentContainerStyle={styles.inboxListContent}
      data={filteredReviewTransactions}
      ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
      keyExtractor={(item) => item.transaction.id}
      ListEmptyComponent={
        <SectionCard accentColor={hasActiveFilters ? colors.panelWarm : colors.successSoft}>
          <Text style={styles.cardTitle}>
            {hasActiveFilters ? 'No matching items' : 'All caught up'}
          </Text>
          <Text style={styles.bodyCopy}>
            {hasActiveFilters
              ? 'The local Inbox still has saved items, but none match the current filter stack.'
              : 'Return to Home to review the updated totals and top-spend signals for this session.'}
          </Text>
          <View style={styles.actionRow}>
            {hasActiveFilters ? (
              <ActionButton label="Clear filters" onPress={onClearFilters} tone="primary" />
            ) : (
              <ActionButton label="Add manual spend" onPress={onOpenManualEntry} tone="primary" />
            )}
            <ActionButton label="Back to home" onPress={onOpenHome} tone="secondary" />
          </View>
        </SectionCard>
      }
      ListHeaderComponent={
        <View style={styles.inboxHeaderStack}>
          <View style={styles.tabs}>
            <TabButton isActive={false} label="Home" onPress={() => onSelectTab('home')} />
            <TabButton isActive={true} label="Inbox" onPress={() => onSelectTab('inbox')} />
          </View>

          <SectionCard accentColor={colors.panelWarm}>
            <Text style={styles.sectionEyebrow}>Inbox</Text>
            <Text style={styles.sectionTitle}>{statusHeadline}</Text>
            <Text style={styles.bodyCopy}>{statusBody}</Text>
            <View style={styles.helperStack}>
              <Text style={styles.helperCopy}>
                Showing {filteredReviewTransactions.length} of {allReviewCount} unresolved items
              </Text>
              <Text style={styles.helperCopy}>
                Split flows, conflict handling, and rule creation remain later-ticket work.
              </Text>
            </View>
            <View style={styles.actionRow}>
              <ActionButton label="Add manual spend" onPress={onOpenManualEntry} tone="secondary" />
              <ActionButton label="Back to home" onPress={onOpenHome} tone="secondary" />
            </View>
          </SectionCard>

          <SectionCard accentColor={colors.panel}>
            <Text style={styles.cardTitle}>Filters</Text>
            <Text style={styles.bodyCopy}>
              Narrow the local queue by status, merchant, source app, amount, or age without
              needing network access.
            </Text>

            <View style={styles.fieldStack}>
              <Text style={styles.fieldLabel}>Merchant</Text>
              <TextInput
                onChangeText={(merchantQuery) => onUpdateFilters({ merchantQuery })}
                placeholder="Filter by merchant"
                placeholderTextColor={colors.inkMuted}
                style={styles.input}
                value={filters.merchantQuery}
              />
            </View>

            <View style={styles.filterStack}>
              <View style={styles.fieldStack}>
                <Text style={styles.fieldLabel}>Status</Text>
                <View style={styles.categoryGrid}>
                  <CategoryChip
                    isActive={filters.statusFilter === 'needs_review'}
                    label="Needs review"
                    onPress={() => onUpdateFilters({ statusFilter: 'needs_review' })}
                  />
                  <CategoryChip
                    isActive={filters.statusFilter === 'skipped'}
                    label="Skipped"
                    onPress={() => onUpdateFilters({ statusFilter: 'skipped' })}
                  />
                  <CategoryChip
                    isActive={filters.statusFilter === 'all'}
                    label="All open items"
                    onPress={() => onUpdateFilters({ statusFilter: 'all' })}
                  />
                </View>
              </View>

              <View style={styles.fieldStack}>
                <Text style={styles.fieldLabel}>Source app</Text>
                <View style={styles.categoryGrid}>
                  <CategoryChip
                    isActive={filters.sourceApp === 'all'}
                    label="All sources"
                    onPress={() => onUpdateFilters({ sourceApp: 'all' })}
                  />
                  {inboxSourceAppOptions.map((sourceApp) => (
                    <CategoryChip
                      isActive={filters.sourceApp === sourceApp}
                      key={sourceApp}
                      label={sourceApp}
                      onPress={() => onUpdateFilters({ sourceApp })}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.fieldStack}>
                <Text style={styles.fieldLabel}>Amount</Text>
                <View style={styles.categoryGrid}>
                  <CategoryChip
                    isActive={filters.amountFilter === 'all'}
                    label="Any amount"
                    onPress={() => onUpdateFilters({ amountFilter: 'all' })}
                  />
                  <CategoryChip
                    isActive={filters.amountFilter === 'under_250'}
                    label="Under Rs 250"
                    onPress={() => onUpdateFilters({ amountFilter: 'under_250' })}
                  />
                  <CategoryChip
                    isActive={filters.amountFilter === 'between_250_and_500'}
                    label="Rs 250 to 500"
                    onPress={() => onUpdateFilters({ amountFilter: 'between_250_and_500' })}
                  />
                  <CategoryChip
                    isActive={filters.amountFilter === 'over_500'}
                    label="Over Rs 500"
                    onPress={() => onUpdateFilters({ amountFilter: 'over_500' })}
                  />
                </View>
              </View>

              <View style={styles.fieldStack}>
                <Text style={styles.fieldLabel}>Age</Text>
                <View style={styles.categoryGrid}>
                  <CategoryChip
                    isActive={filters.ageFilter === 'all'}
                    label="Any age"
                    onPress={() => onUpdateFilters({ ageFilter: 'all' })}
                  />
                  <CategoryChip
                    isActive={filters.ageFilter === 'today'}
                    label="Today"
                    onPress={() => onUpdateFilters({ ageFilter: 'today' })}
                  />
                  <CategoryChip
                    isActive={filters.ageFilter === 'last_3_days'}
                    label="Last 3 days"
                    onPress={() => onUpdateFilters({ ageFilter: 'last_3_days' })}
                  />
                  <CategoryChip
                    isActive={filters.ageFilter === 'older'}
                    label="Older"
                    onPress={() => onUpdateFilters({ ageFilter: 'older' })}
                  />
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <ActionButton label="Clear filters" onPress={onClearFilters} tone="secondary" />
            </View>
          </SectionCard>
        </View>
      }
      renderItem={({ item }) => (
        <TransactionCard
          onDelete={() => onDeleteTransaction(item.transaction.id)}
          onRestore={() => onRestoreTransaction(item.transaction.id)}
          onSkip={() => onSkipTransaction(item.transaction.id)}
          onStartClassification={onStartClassification}
          reviewItem={item}
        />
      )}
      showsVerticalScrollIndicator={false}
    />
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
          Saving removes the payment from Inbox, recalculates Home immediately, and writes the
          updated transaction back into local SQLite tables.
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

function ManualEntryScreen({
  amountMinor,
  draft,
  onCancel,
  onChangeAmount,
  onChangeItemLabel,
  onChangeMerchant,
  onSave,
  onSelectCategory,
}: {
  amountMinor: number | null;
  draft: ManualEntryDraft;
  onCancel: () => void;
  onChangeAmount: (amountInput: string) => void;
  onChangeItemLabel: (itemLabel: string) => void;
  onChangeMerchant: (merchant: string) => void;
  onSave: () => void;
  onSelectCategory: (categoryId: CategoryId) => void;
}) {
  const saveDisabled =
    !amountMinor ||
    amountMinor <= 0 ||
    !draft.categoryId ||
    !draft.itemLabel.trim() ||
    !draft.merchant.trim();

  return (
    <View style={styles.stack}>
      <SectionCard accentColor={colors.accentSoft}>
        <Text style={styles.sectionEyebrow}>Manual add</Text>
        <Text style={styles.sectionTitle}>Capture a spend even without a notification</Text>
        <Text style={styles.bodyCopy}>
          This is the fallback path for denied notification access, missed captures, or cashless
          spends the user wants logged immediately.
        </Text>
      </SectionCard>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>Spend details</Text>
        <View style={styles.inputStack}>
          <View style={styles.fieldStack}>
            <Text style={styles.fieldLabel}>Amount</Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={onChangeAmount}
              placeholder="180 or 180.50"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              value={draft.amountInput}
            />
          </View>

          <View style={styles.fieldStack}>
            <Text style={styles.fieldLabel}>Merchant</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={onChangeMerchant}
              placeholder="Where did you spend?"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              value={draft.merchant}
            />
          </View>

          <View style={styles.fieldStack}>
            <Text style={styles.fieldLabel}>Item label</Text>
            <TextInput
              onChangeText={onChangeItemLabel}
              placeholder="What did you buy?"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              value={draft.itemLabel}
            />
          </View>
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
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
        <Text style={styles.cardTitle}>Preview</Text>
        <Text style={styles.amountLabel}>
          {amountMinor && amountMinor > 0 ? formatCurrency(amountMinor) : 'Enter a valid amount'}
        </Text>
        <Text style={styles.bodyCopy}>
          Saving creates a classified local transaction immediately, updates Home totals, and keeps
          Inbox focused on uncategorized captures.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton label="Back" onPress={onCancel} tone="secondary" />
          <ActionButton
            disabled={saveDisabled}
            label="Save manual spend"
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

function PreferenceCard({
  description,
  isActive,
  label,
  onPress,
}: {
  description: string;
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
        styles.preferenceCard,
        isActive ? styles.preferenceCardActive : styles.preferenceCardIdle,
      ]}
    >
      <Text
        style={[
          styles.preferenceLabel,
          isActive ? styles.preferenceLabelActive : styles.preferenceLabelIdle,
        ]}
      >
        {label}
      </Text>
      <Text style={styles.preferenceDescription}>{description}</Text>
    </Pressable>
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
  onDelete,
  onRestore,
  onSkip,
  onStartClassification,
  reviewItem,
}: {
  onDelete: () => void;
  onRestore: () => void;
  onSkip: () => void;
  onStartClassification: (transactionId: string) => void;
  reviewItem: InboxReviewItem;
}) {
  const { reviewStatus, transaction } = reviewItem;
  const hasSavedItemPreview = transaction.items[0]?.label?.trim().length;

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

      <StatusChip
        label={reviewStatus === 'skipped' ? 'Skipped' : 'Needs review'}
        tone={reviewStatus === 'skipped' ? 'pending' : 'ready'}
      />

      <Text style={styles.bodyCopy}>
        {reviewStatus === 'skipped'
          ? 'This payment was deferred locally. Move it back into needs review or classify it directly when you are ready.'
          : 'No item or category has been saved for this payment yet. Classify it now, or skip it without losing the original capture.'}
      </Text>

      {hasSavedItemPreview ? (
        <Text style={styles.helperCopy}>Saved preview: {transaction.items[0]?.label}</Text>
      ) : null}

      <View style={styles.actionRow}>
        <ActionButton
          accessibilityLabel={`Classify ${transaction.merchant}`}
          label="Classify"
          onPress={() => onStartClassification(transaction.id)}
          tone="primary"
        />
        {reviewStatus === 'skipped' ? (
          <ActionButton
            accessibilityLabel={`Review ${transaction.merchant} again`}
            label="Move to needs review"
            onPress={onRestore}
            tone="secondary"
          />
        ) : (
          <ActionButton
            accessibilityLabel={`Skip ${transaction.merchant} for now`}
            label="Skip for now"
            onPress={onSkip}
            tone="secondary"
          />
        )}
        <ActionButton
          accessibilityLabel={`Delete ${transaction.merchant} locally`}
          label="Delete locally"
          onPress={onDelete}
          tone="secondary"
        />
      </View>
    </View>
  );
}

function getSourceAppLabel(sourceAppId: SupportedSourceAppId): string {
  return (
    SOURCE_APP_OPTIONS.find((sourceApp) => sourceApp.id === sourceAppId)?.label ??
    'Unsupported app'
  );
}

function getBudgetCycleLabel(budgetCycleId: BudgetCycleId): string {
  return (
    BUDGET_CYCLE_OPTIONS.find((option) => option.id === budgetCycleId)?.label ??
    'Calendar month'
  );
}

function getBudgetCycleStartDay(budgetCycleId: BudgetCycleId): number {
  switch (budgetCycleId) {
    case 'salary_cycle':
      return 26;
    case 'billing_cycle':
      return 5;
    case 'calendar_month':
    default:
      return 1;
  }
}

function getSyncModeLabel(syncMode: SyncMode): string {
  return SYNC_MODE_OPTIONS.find((option) => option.id === syncMode)?.label ?? 'Local-only for now';
}

function hasActiveInboxFilters(filters: InboxFilters): boolean {
  return (
    filters.ageFilter !== DEFAULT_INBOX_FILTERS.ageFilter ||
    filters.amountFilter !== DEFAULT_INBOX_FILTERS.amountFilter ||
    filters.merchantQuery.trim().length > 0 ||
    filters.sourceApp !== DEFAULT_INBOX_FILTERS.sourceApp ||
    filters.statusFilter !== DEFAULT_INBOX_FILTERS.statusFilter
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
    marginBottom: 20,
  },
  helperCopy: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  helperStack: {
    gap: 4,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  fieldStack: {
    gap: 8,
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
  inboxHeaderStack: {
    gap: 16,
    paddingBottom: 16,
  },
  inboxListContent: {
    paddingBottom: 40,
  },
  inputStack: {
    gap: 14,
  },
  filterStack: {
    gap: 16,
  },
  listStack: {
    gap: 12,
  },
  listSeparator: {
    height: 12,
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
  optionStack: {
    gap: 12,
  },
  progressFill: {
    backgroundColor: colors.accentStrong,
    borderRadius: 999,
    height: '100%',
  },
  progressTrack: {
    backgroundColor: colors.canvas,
    borderRadius: 999,
    height: 14,
    overflow: 'hidden',
  },
  preferenceCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  preferenceCardActive: {
    backgroundColor: colors.panel,
    borderColor: colors.accentStrong,
  },
  preferenceCardIdle: {
    backgroundColor: colors.canvas,
    borderColor: colors.edgeStrong,
  },
  preferenceDescription: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  preferenceLabelActive: {
    color: colors.accentText,
  },
  preferenceLabelIdle: {
    color: colors.ink,
  },
  screen: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
  },
  scrollContent: {
    gap: 20,
    paddingBottom: 40,
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
  summaryAmount: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  summaryPrimary: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  summaryRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  summarySecondary: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 18,
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
});
