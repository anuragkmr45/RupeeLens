import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import {
  AppState,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  KPIBlock,
  ListItem,
  SectionHeader,
  TextField,
} from '@upi-spend-tracker/mobile-ui';

import {
  DEFAULT_BUDGET_ALERT_SETTINGS,
  addCustomCategory,
  applyAutoClassificationRules,
  appendSplitDraftRow,
  buildClassificationDraft,
  buildSplitDraft,
  canDeleteCategory,
  classifyTransaction,
  createSplitDraftRow,
  getClassificationSuggestions,
  getDefaultCategories,
  createManualTransaction,
  DEFAULT_INBOX_FILTERS,
  DEFAULT_TIMELINE_FILTERS,
  deleteCustomCategory,
  deleteRulesForCategory,
  deleteTransaction,
  formatCaptureMoment,
  formatCurrency,
  getPendingBudgetAlerts,
  getInboxReviewTransactions,
  getInboxSourceAppOptions,
  getMerchantReviewCandidates,
  getPendingTransactions,
  markBudgetAlertsReviewed,
  getTimelineDayGroups,
  getTimelineSourceAppOptions,
  getTimelineTransactions,
  getTransactionById,
  getTransactionStatusLabel,
  getUnresolvedAmountMinor,
  isClassificationReady,
  isSplitDraftReady,
  mergeCategories,
  mergeRuleCategories,
  mergeRuleMerchants,
  moveSplitDraftRow,
  parseCurrencyInputToMinor,
  reconcileMerchantState,
  removeSplitDraftRow,
  restoreSkippedTransaction,
  saveClassificationRule,
  seededMerchantAliases,
  seededMerchants,
  seededTransactions,
  skipTransaction,
  splitTransaction,
  SPLIT_REMAINDER_OPTIONS,
  sortTransactionsByCapturedAtDesc,
  splitMerchantAlias,
  summarizeInsights,
  summarizeCategoryUsage,
  summarizeBudgets,
  summarizeSplitDraft,
  summarizeDashboard,
  summarizeMerchantUsage,
  mergeMerchants,
  normalizeBudgetDefinitions,
  type CategoryId,
  type CategoryOption,
  type CategoryUsageSummary,
  type BudgetAlertSettings,
  type BudgetDefinition,
  type BudgetPeriod,
  type BudgetScope,
  type BudgetSummary,
  type BudgetThresholdAlert,
  type ClassificationDraft,
  type ClassificationSuggestion,
  type DashboardSummary,
  type InsightRow,
  type InsightSection,
  type InsightsReport,
  type InboxFilters,
  type InboxReviewItem,
  type MerchantAliasRecord,
  type MerchantId,
  type MerchantReviewCandidate,
  type MerchantUsageSummary,
  type MerchantRecord,
  scheduleBudgetThresholdAlerts,
  type SplitDraft,
  type SplitRemainderDisposition,
  type SpendRule,
  type TimelineDayGroup,
  type TimelineFilters,
  type Transaction,
  type TransactionHistoryEntry,
  type TransactionParserInfo,
  updateTransactionNote,
  updateCustomCategory,
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
import {
  clearStoredCaptureSnapshots,
  DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS,
  getNativeCaptureDiagnostics,
  setNativeCaptureDedupeConfig,
  setAllowedSourceApps,
  type NativeCaptureDiagnostics,
} from '../features/android-capture/native-capture';
import {
  buildBootstrapRefreshFailureState,
  createInitialBootstrapConfigState,
  formatRolloutChannel,
  getDefaultBootstrapConfigQuery,
  getEnabledParserTemplateIds,
  hydrateBootstrapConfigCache,
  isRemoteCapturePaused,
  refreshBootstrapConfig,
  type BootstrapConfigState,
} from '../features/bootstrap-config/runtime-config';
import { APP_COPY } from '../lib/app-info';
import { colors } from '../theme/colors';
import { DesignSystemShowcaseScreen } from './DesignSystemShowcaseScreen';

type Screen =
  | 'budgets'
  | 'categories'
  | 'classify'
  | 'detail'
  | 'home'
  | 'inbox'
  | 'insights'
  | 'manual'
  | 'merchants'
  | 'onboarding'
  | 'showcase'
  | 'split'
  | 'timeline';
type PrimaryScreen = 'home' | 'inbox' | 'timeline';
type ScreenReturnTarget = 'detail' | PrimaryScreen;
type SplitReturnScreen = 'classify' | 'detail' | 'inbox';
type BudgetScreenIntent = 'browse' | 'create';

const EMPTY_DRAFT: ClassificationDraft = {
  autoApplyRule: false,
  categoryId: null,
  itemLabel: '',
  saveAsRule: false,
};

const EMPTY_SPLIT_DRAFT: SplitDraft = {
  remainderCategoryId: null,
  remainderDisposition: 'leave_unresolved',
  rows: [createSplitDraftRow({ rowId: 'split_empty_row_1' })],
};

interface ManualEntryDraft {
  autoApplyRule: boolean;
  amountInput: string;
  capturedAt: string;
  categoryId: CategoryId | null;
  itemLabel: string;
  merchant: string;
  saveAsRule: boolean;
}

interface BudgetDraft {
  categoryId: CategoryId | null;
  itemLabel: string;
  label: string;
  merchantId: MerchantId | null;
  period: BudgetPeriod;
  rollingWindowDaysInput: string;
  scope: BudgetScope;
  startsOnDayInput: string;
  targetInput: string;
  weekStartsOn: number;
}

interface CategoryDraft {
  description: string;
  label: string;
}

const EMPTY_MANUAL_ENTRY_DRAFT: ManualEntryDraft = {
  autoApplyRule: false,
  amountInput: '',
  capturedAt: '',
  categoryId: null,
  itemLabel: '',
  merchant: '',
  saveAsRule: false,
};

const EMPTY_CATEGORY_DRAFT: CategoryDraft = {
  description: '',
  label: '',
};

const EMPTY_BUDGET_DRAFT: BudgetDraft = {
  categoryId: null,
  itemLabel: '',
  label: '',
  merchantId: null,
  period: 'monthly',
  rollingWindowDaysInput: '30',
  scope: 'overall',
  startsOnDayInput: '1',
  targetInput: '',
  weekStartsOn: 1,
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
const BUDGET_SCOPE_OPTIONS: Array<{ id: BudgetScope; label: string }> = [
  { id: 'overall', label: 'Overall' },
  { id: 'category', label: 'Category' },
  { id: 'merchant', label: 'Merchant' },
  { id: 'item', label: 'Item' },
];
const BUDGET_PERIOD_OPTIONS: Array<{ id: BudgetPeriod; label: string }> = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'rolling', label: 'Rolling' },
  { id: 'custom', label: 'Custom' },
];
const WEEKDAY_OPTIONS: Array<{ id: number; label: string }> = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

export function SpendTrackerApp() {
  const [isHydrating, setIsHydrating] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [onboardingPreferences, setOnboardingPreferences] = useState<OnboardingPreferences>(
    DEFAULT_ONBOARDING_PREFERENCES,
  );
  const [budgets, setBudgets] = useState<BudgetDefinition[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetThresholdAlert[]>([]);
  const [budgetAlertSettings, setBudgetAlertSettings] = useState<BudgetAlertSettings>(
    DEFAULT_BUDGET_ALERT_SETTINGS,
  );
  const [budgetScreenIntent, setBudgetScreenIntent] = useState<BudgetScreenIntent>('browse');
  const [categories, setCategories] = useState<CategoryOption[]>(getDefaultCategories());
  const [merchants, setMerchants] = useState<MerchantRecord[]>(seededMerchants);
  const [merchantAliases, setMerchantAliases] =
    useState<MerchantAliasRecord[]>(seededMerchantAliases);
  const [rules, setRules] = useState<SpendRule[]>([]);
  const [notificationAccessState, setNotificationAccessState] =
    useState<NotificationAccessState>('not_started');
  const [transactions, setTransactions] = useState<Transaction[]>(seededTransactions);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClassificationDraft>(EMPTY_DRAFT);
  const [splitDraft, setSplitDraft] = useState<SplitDraft>(EMPTY_SPLIT_DRAFT);
  const [manualDraft, setManualDraft] =
    useState<ManualEntryDraft>(EMPTY_MANUAL_ENTRY_DRAFT);
  const [inboxFilters, setInboxFilters] = useState<InboxFilters>(DEFAULT_INBOX_FILTERS);
  const [timelineFilters, setTimelineFilters] =
    useState<TimelineFilters>(DEFAULT_TIMELINE_FILTERS);
  const [detailTransactionId, setDetailTransactionId] = useState<string | null>(null);
  const [detailReturnScreen, setDetailReturnScreen] = useState<PrimaryScreen>('timeline');
  const [detailNoteDraft, setDetailNoteDraft] = useState('');
  const [classifyReturnScreen, setClassifyReturnScreen] =
    useState<ScreenReturnTarget | null>(null);
  const [manualReturnScreen, setManualReturnScreen] = useState<PrimaryScreen>('home');
  const [splitReturnScreen, setSplitReturnScreen] =
    useState<SplitReturnScreen>('inbox');
  const [captureDiagnostics, setCaptureDiagnostics] = useState<NativeCaptureDiagnostics>(
    DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS,
  );
  const [bootstrapState, setBootstrapState] = useState<BootstrapConfigState>(
    createInitialBootstrapConfigState(),
  );

  const pendingTransactions = getPendingTransactions(transactions);
  const allReviewTransactions = getInboxReviewTransactions(transactions, {
    ...DEFAULT_INBOX_FILTERS,
    statusFilter: 'all',
  });
  const filteredReviewTransactions = getInboxReviewTransactions(transactions, inboxFilters);
  const inboxSourceAppOptions = getInboxSourceAppOptions(transactions);
  const timelineTransactions = getTimelineTransactions(
    transactions,
    timelineFilters,
    undefined,
    categories,
  );
  const timelineDayGroups = getTimelineDayGroups(
    transactions,
    timelineFilters,
    undefined,
    categories,
  );
  const timelineSourceAppOptions = getTimelineSourceAppOptions(transactions);
  const merchantUsage = summarizeMerchantUsage(merchants, merchantAliases, transactions);
  const merchantReviewCandidates = getMerchantReviewCandidates(merchants, transactions);
  const budgetSummaries = summarizeBudgets(transactions, budgets);
  const pendingBudgetAlerts = getPendingBudgetAlerts(budgetAlerts);
  const summary = summarizeDashboard(
    transactions,
    {
      budgets,
      budgetTargetMinor: DASHBOARD_BUDGET_TARGET_MINOR,
      cycleStartDay: getBudgetCycleStartDay(onboardingPreferences.budgetCycleId),
    },
    categories,
  );
  const insightsReport =
    screen === 'insights'
      ? summarizeInsights(
          transactions,
          {
            cycleStartDay: getBudgetCycleStartDay(onboardingPreferences.budgetCycleId),
          },
          categories,
        )
      : null;
  const categoryUsage = summarizeCategoryUsage(categories, transactions);
  const activeTransaction = activeTransactionId
    ? getTransactionById(transactions, activeTransactionId)
    : null;
  const detailTransaction = detailTransactionId
    ? getTransactionById(transactions, detailTransactionId)
    : null;
  const activeTransactionSuggestions = activeTransaction
    ? getClassificationSuggestions(
        transactions,
        {
          amountMinor: activeTransaction.amountMinor,
          capturedAt: activeTransaction.capturedAt,
          currentTransactionId: activeTransaction.id,
          merchant: activeTransaction.merchantRaw ?? activeTransaction.merchant,
          merchantId: activeTransaction.merchantId,
        },
        rules,
        merchants,
        merchantAliases,
      )
    : [];
  const splitSummary = activeTransaction
    ? summarizeSplitDraft(activeTransaction.amountMinor, splitDraft)
    : null;
  const manualAmountMinor = parseCurrencyInputToMinor(manualDraft.amountInput);
  const manualEntrySuggestions = getClassificationSuggestions(
    transactions,
    {
      amountMinor: manualAmountMinor,
      capturedAt: manualDraft.capturedAt || undefined,
      merchant: manualDraft.merchant,
    },
    rules,
    merchants,
    merchantAliases,
  );
  const capturePausedRemotely = isRemoteCapturePaused(bootstrapState.config);

  useEffect(() => {
    let isMounted = true;

    async function hydrateLocalState() {
      const storedState = await loadStoredSpendTrackerState();

      if (!isMounted) {
        return;
      }

      if (storedState) {
        const merchantDirectory = reconcileMerchantState(
          storedState.transactions,
          storedState.merchants,
          storedState.merchantAliases,
        );

        setCategories(storedState.categories);
        setBudgets(storedState.budgets ?? []);
        setBudgetAlerts(storedState.budgetAlerts ?? []);
        setBudgetAlertSettings(
          storedState.budgetAlertSettings ?? DEFAULT_BUDGET_ALERT_SETTINGS,
        );
        setOnboardingPreferences(storedState.onboardingPreferences);
        setNotificationAccessState(storedState.notificationAccessState);
        setOnboardingCompleted(storedState.onboardingCompleted);
        setMerchants(merchantDirectory.merchants);
        setMerchantAliases(merchantDirectory.merchantAliases);
        setRules(storedState.rules ?? []);
        setTransactions(merchantDirectory.transactions);
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
    let isMounted = true;

    async function refreshDiagnostics() {
      const diagnostics = await getNativeCaptureDiagnostics();

      if (!isMounted) {
        return;
      }

      setCaptureDiagnostics(diagnostics);
    }

    void refreshDiagnostics();

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        void refreshDiagnostics();
      }
    });

    return () => {
      isMounted = false;
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    let isMounted = true;

    async function syncAllowedApps() {
      const diagnostics = await setAllowedSourceApps(
        onboardingPreferences.selectedSourceAppIds,
      );

      if (!isMounted) {
        return;
      }

      setCaptureDiagnostics(diagnostics);
    }

    void syncAllowedApps();

    return () => {
      isMounted = false;
    };
  }, [isHydrating, onboardingPreferences.selectedSourceAppIds]);

  useEffect(() => {
    let isMounted = true;

    async function syncNativeDedupeConfig() {
      const diagnostics = await setNativeCaptureDedupeConfig(bootstrapState.config.dedupeConfig);

      if (!isMounted) {
        return;
      }

      setCaptureDiagnostics(diagnostics);
    }

    void syncNativeDedupeConfig();

    return () => {
      isMounted = false;
    };
  }, [
    bootstrapState.config.dedupeConfig.exactMatchWindowSeconds,
    bootstrapState.config.dedupeConfig.fuzzyMatchWindowSeconds,
    bootstrapState.config.dedupeConfig.merchantSimilarityThreshold,
  ]);

  useEffect(() => {
    let isMounted = true;

    async function syncBootstrapConfig() {
      const query = getDefaultBootstrapConfigQuery();
      const cachedBootstrapState = await hydrateBootstrapConfigCache(query);

      if (!isMounted) {
        return;
      }

      if (cachedBootstrapState) {
        setBootstrapState(cachedBootstrapState);
      }

      try {
        const refreshedBootstrapState = await refreshBootstrapConfig(query);

        if (!isMounted) {
          return;
        }

        setBootstrapState(refreshedBootstrapState);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setBootstrapState((currentState) =>
          buildBootstrapRefreshFailureState(currentState, error),
        );
      }
    }

    void syncBootstrapConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    setBudgetAlerts((currentAlerts) => {
      const nextAlerts = scheduleBudgetThresholdAlerts(
        transactions,
        budgets,
        currentAlerts,
        budgetAlertSettings,
      );

      return JSON.stringify(currentAlerts) === JSON.stringify(nextAlerts)
        ? currentAlerts
        : nextAlerts;
    });
  }, [budgets, budgetAlertSettings, isHydrating, transactions]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void saveStoredSpendTrackerState({
      budgetAlertSettings,
      budgetAlerts,
      budgets,
      categories,
      merchantAliases,
      merchants,
      onboardingPreferences,
      notificationAccessState,
      onboardingCompleted,
      rules,
      transactions,
    });
  }, [
    budgetAlertSettings,
    budgetAlerts,
    budgets,
    categories,
    isHydrating,
    merchantAliases,
    merchants,
    notificationAccessState,
    onboardingCompleted,
    onboardingPreferences,
    rules,
    transactions,
  ]);

  function applyMerchantDirectoryState(
    nextTransactions: Transaction[],
    nextMerchants: MerchantRecord[] = merchants,
    nextMerchantAliases: MerchantAliasRecord[] = merchantAliases,
  ) {
    const merchantDirectory = reconcileMerchantState(
      nextTransactions,
      nextMerchants,
      nextMerchantAliases,
    );

    setTransactions(merchantDirectory.transactions);
    setMerchants(merchantDirectory.merchants);
    setMerchantAliases(merchantDirectory.merchantAliases);

    return merchantDirectory;
  }

  async function handleOpenNotificationAccess() {
    if (capturePausedRemotely) {
      Alert.alert(
        'Capture paused by remote config',
        bootstrapState.config.runtimeCompatibility?.reason ??
          'The current bootstrap config disabled notification capture or parser execution. Manual add stays available while the app waits for a newer config.',
      );
      return;
    }

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

  async function handleRefreshCaptureDiagnostics() {
    setCaptureDiagnostics(await getNativeCaptureDiagnostics());
  }

  function getPostReviewScreen(nextTransactions: Transaction[]): PrimaryScreen {
    return getInboxReviewTransactions(nextTransactions, {
      ...DEFAULT_INBOX_FILTERS,
      statusFilter: 'all',
    }).length > 0
      ? 'inbox'
      : 'home';
  }

  function handleStartClassification(
    transactionId: string,
    returnScreen: ScreenReturnTarget | null = null,
  ) {
    const transaction = getTransactionById(transactions, transactionId);

    if (!transaction) {
      return;
    }

    setActiveTransactionId(transaction.id);
    setClassifyReturnScreen(returnScreen);
    setDraft(buildClassificationDraft(transaction));
    setSplitDraft(EMPTY_SPLIT_DRAFT);
    setScreen('classify');
  }

  function handleSaveClassification() {
    if (!activeTransactionId || !activeTransaction || !isClassificationReady(draft)) {
      return;
    }

    let nextRules = rules;

    if (draft.saveAsRule) {
      nextRules = saveClassificationRule(
        rules,
        {
          amountMinor: activeTransaction.amountMinor,
          capturedAt: activeTransaction.capturedAt,
          merchant: activeTransaction.merchantRaw ?? activeTransaction.merchant,
          merchantId: activeTransaction.merchantId,
        },
        draft,
        {
          autoApply: draft.autoApplyRule,
          merchantAliases,
          merchants,
        },
      );
    }

    let nextTransactions = classifyTransaction(
      transactions,
      activeTransactionId,
      draft,
      categories,
    );

    if (draft.saveAsRule && draft.autoApplyRule) {
      nextTransactions = applyAutoClassificationRules(
        nextTransactions,
        nextRules,
        merchants,
        merchantAliases,
        categories,
      );
    }

    const merchantDirectory = applyMerchantDirectoryState(nextTransactions);

    setRules(nextRules);
    setActiveTransactionId(null);
    setClassifyReturnScreen(null);
    setDraft({ ...EMPTY_DRAFT });
    setSplitDraft(EMPTY_SPLIT_DRAFT);

    if (classifyReturnScreen) {
      setScreen(classifyReturnScreen);
      return;
    }

    setScreen(getPostReviewScreen(merchantDirectory.transactions));
  }

  function handleCancelClassification() {
    setActiveTransactionId(null);
    const nextScreen = classifyReturnScreen ?? 'inbox';

    setClassifyReturnScreen(null);
    setDraft({ ...EMPTY_DRAFT });
    setSplitDraft(EMPTY_SPLIT_DRAFT);
    setScreen(nextScreen);
  }

  function handleToggleSaveAsRule() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      autoApplyRule: currentDraft.saveAsRule ? false : currentDraft.autoApplyRule,
      saveAsRule: !currentDraft.saveAsRule,
    }));
  }

  function handleToggleAutoApplyRule() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      autoApplyRule: !currentDraft.autoApplyRule,
      saveAsRule: true,
    }));
  }

  function handleApplyClassificationSuggestion(suggestion: ClassificationSuggestion) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      categoryId: suggestion.categoryId,
      itemLabel: suggestion.itemLabel,
    }));
  }

  function handleSkipFromClassification() {
    if (!activeTransactionId) {
      return;
    }

    applyMerchantDirectoryState(
      skipTransaction(transactions, activeTransactionId),
    );
    setActiveTransactionId(null);
    setClassifyReturnScreen(null);
    setDraft({ ...EMPTY_DRAFT });
    setSplitDraft(EMPTY_SPLIT_DRAFT);
    setScreen('inbox');
  }

  function handleOpenManualEntry(returnScreen: PrimaryScreen) {
    setManualReturnScreen(returnScreen);
    setManualDraft({
      ...EMPTY_MANUAL_ENTRY_DRAFT,
      capturedAt: new Date().toISOString(),
    });
    setScreen('manual');
  }

  function handleOpenBudgets(intent: BudgetScreenIntent = 'browse') {
    setBudgetScreenIntent(intent);
    setBudgetAlerts((currentAlerts) => markBudgetAlertsReviewed(currentAlerts));
    setScreen('budgets');
  }

  function handleOpenTimeline() {
    setScreen('timeline');
  }

  function handleOpenInsights() {
    setScreen('insights');
  }

  function handleOpenMerchants() {
    setScreen('merchants');
  }

  function handleOpenCategories() {
    setScreen('categories');
  }

  function handleUpdateTimelineFilters(nextFilters: Partial<TimelineFilters>) {
    setTimelineFilters((currentFilters) => ({
      ...currentFilters,
      ...nextFilters,
    }));
  }

  function handleClearTimelineFilters() {
    setTimelineFilters({ ...DEFAULT_TIMELINE_FILTERS });
  }

  function handleCreateCategory(nextDraft: CategoryDraft) {
    setCategories((currentCategories) => addCustomCategory(currentCategories, nextDraft));
  }

  function handleUpdateCategory(categoryId: CategoryId, nextDraft: CategoryDraft) {
    setCategories((currentCategories) =>
      updateCustomCategory(currentCategories, categoryId, nextDraft),
    );
  }

  function handleDeleteCategory(categoryId: CategoryId) {
    if (!canDeleteCategory(categories, transactions, categoryId)) {
      return;
    }

    setCategories((currentCategories) => deleteCustomCategory(currentCategories, categoryId));
    setRules((currentRules) => deleteRulesForCategory(currentRules, categoryId));
  }

  function handleMergeCategory(sourceCategoryId: CategoryId, targetCategoryId: CategoryId) {
    const mergedState = mergeCategories(
      categories,
      transactions,
      sourceCategoryId,
      targetCategoryId,
    );

    setCategories(mergedState.categories);
    setTransactions(mergedState.transactions);
    setRules((currentRules) => mergeRuleCategories(currentRules, sourceCategoryId, targetCategoryId));
  }

  function handleOpenTransactionDetail(
    transactionId: string,
    returnScreen: PrimaryScreen = 'timeline',
  ) {
    const transaction = getTransactionById(transactions, transactionId);

    if (!transaction) {
      return;
    }

    setDetailTransactionId(transactionId);
    setDetailReturnScreen(returnScreen);
    setDetailNoteDraft(transaction.note ?? '');
    setScreen('detail');
  }

  function handleCloseTransactionDetail() {
    setDetailTransactionId(null);
    setDetailNoteDraft('');
    setScreen(detailReturnScreen);
  }

  function handleOpenDetailClassification() {
    if (!detailTransactionId) {
      return;
    }

    handleStartClassification(detailTransactionId, 'detail');
  }

  function handleOpenSplitFromDetail() {
    if (!detailTransactionId) {
      return;
    }

    handleStartSplit(detailTransactionId, 'detail');
  }

  function handleConfirmDeleteTransaction(transactionId: string, returnScreen: PrimaryScreen) {
    const transaction = getTransactionById(transactions, transactionId);

    if (!transaction) {
      return;
    }

    Alert.alert(
      'Delete transaction locally?',
      `${transaction.merchant} will be removed from the local timeline and dashboard on this device.`,
      [
        {
          style: 'cancel',
          text: 'Cancel',
        },
        {
          style: 'destructive',
          text: 'Delete',
          onPress: () => {
            applyMerchantDirectoryState(deleteTransaction(transactions, transactionId));

            if (detailTransactionId === transactionId) {
              setDetailTransactionId(null);
              setDetailNoteDraft('');
              setScreen(returnScreen);
            }
          },
        },
      ],
    );
  }

  function handleSaveDetailNote() {
    if (!detailTransactionId) {
      return;
    }

    const normalizedNote = detailNoteDraft.trim();

    applyMerchantDirectoryState(
      updateTransactionNote(transactions, detailTransactionId, normalizedNote),
    );
    setDetailNoteDraft(normalizedNote);
  }

  function handleStartSplit(
    transactionId: string,
    returnScreen: SplitReturnScreen,
    classificationSeed?: Pick<ClassificationDraft, 'categoryId' | 'itemLabel'> | null,
  ) {
    const transaction = getTransactionById(transactions, transactionId);

    if (!transaction) {
      return;
    }

    setActiveTransactionId(transaction.id);
    setSplitReturnScreen(returnScreen);
    setSplitDraft(buildSplitDraft(transaction, classificationSeed));
    setScreen('split');
  }

  function handleOpenSplitFromClassification() {
    if (!activeTransactionId) {
      return;
    }

    handleStartSplit(activeTransactionId, 'classify', draft);
  }

  function handleOpenSplitFromInbox(transactionId: string) {
    handleStartSplit(transactionId, 'inbox');
  }

  function handleUpdateSplitRow(
    rowId: string,
    nextRowPatch: Partial<SplitDraft['rows'][number]>,
  ) {
    setSplitDraft((currentDraft) => ({
      ...currentDraft,
      rows: currentDraft.rows.map((row) =>
        row.id === rowId ? { ...row, ...nextRowPatch } : row,
      ),
    }));
  }

  function handleAddSplitRow() {
    setSplitDraft((currentDraft) => appendSplitDraftRow(currentDraft));
  }

  function handleRemoveSplitRow(rowId: string) {
    setSplitDraft((currentDraft) => removeSplitDraftRow(currentDraft, rowId));
  }

  function handleMoveSplitRow(rowId: string, direction: 'down' | 'up') {
    setSplitDraft((currentDraft) => moveSplitDraftRow(currentDraft, rowId, direction));
  }

  function handleSelectRemainderDisposition(
    remainderDisposition: SplitRemainderDisposition,
  ) {
    setSplitDraft((currentDraft) => ({
      ...currentDraft,
      remainderCategoryId:
        remainderDisposition === 'leave_unresolved'
          ? null
          : currentDraft.remainderCategoryId,
      remainderDisposition,
    }));
  }

  function handleSelectRemainderCategory(categoryId: CategoryId) {
    setSplitDraft((currentDraft) => ({
      ...currentDraft,
      remainderCategoryId: categoryId,
    }));
  }

  function handleCancelSplit() {
    setSplitDraft(EMPTY_SPLIT_DRAFT);

    if (splitReturnScreen === 'classify' && activeTransactionId) {
      setScreen('classify');
      return;
    }

    if (splitReturnScreen === 'detail' && detailTransactionId) {
      setActiveTransactionId(null);
      setScreen('detail');
      return;
    }

    setActiveTransactionId(null);
    setDraft({ ...EMPTY_DRAFT });
    setScreen('inbox');
  }

  function handleSaveSplit() {
    if (!activeTransactionId || !activeTransaction) {
      return;
    }

    if (!isSplitDraftReady(activeTransaction.amountMinor, splitDraft)) {
      return;
    }

    const nextTransactions = splitTransaction(transactions, activeTransactionId, splitDraft);
    const merchantDirectory = applyMerchantDirectoryState(nextTransactions);

    setActiveTransactionId(null);
    setDraft({ ...EMPTY_DRAFT });
    setSplitDraft(EMPTY_SPLIT_DRAFT);

    if (splitReturnScreen === 'detail' && detailTransactionId) {
      setScreen('detail');
      return;
    }

    setScreen(getPostReviewScreen(merchantDirectory.transactions));
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
    const categoryId = manualDraft.categoryId;
    const itemLabel = manualDraft.itemLabel.trim();
    const capturedAt = manualDraft.capturedAt || new Date().toISOString();
    const merchant = manualDraft.merchant.trim();

    if (
      !manualAmountMinor ||
      manualAmountMinor <= 0 ||
      !categoryId ||
      !isClassificationReady({
        autoApplyRule: false,
        categoryId,
        itemLabel,
        saveAsRule: false,
      }) ||
      !merchant
    ) {
      return;
    }

    let nextRules = rules;

    if (manualDraft.saveAsRule) {
      nextRules = saveClassificationRule(
        rules,
        {
          amountMinor: manualAmountMinor,
          capturedAt,
          merchant,
        },
        manualDraft,
        {
          autoApply: manualDraft.autoApplyRule,
          merchantAliases,
          merchants,
        },
      );
    }

    let nextTransactions = sortTransactionsByCapturedAtDesc([
      createManualTransaction({
        amountMinor: manualAmountMinor,
        capturedAt,
        categoryId,
        itemLabel,
        merchant,
      }),
      ...transactions,
    ]);

    if (manualDraft.saveAsRule && manualDraft.autoApplyRule) {
      nextTransactions = applyAutoClassificationRules(
        nextTransactions,
        nextRules,
        merchants,
        merchantAliases,
        categories,
      );
    }

    applyMerchantDirectoryState(nextTransactions);
    setRules(nextRules);
    setManualDraft({ ...EMPTY_MANUAL_ENTRY_DRAFT });
    setScreen(manualReturnScreen === 'timeline' ? 'timeline' : 'home');
  }

  function handleCancelManualEntry() {
    setManualDraft({ ...EMPTY_MANUAL_ENTRY_DRAFT });
    setScreen(manualReturnScreen);
  }

  function handleApplyManualSuggestion(suggestion: ClassificationSuggestion) {
    setManualDraft((currentDraft) => ({
      ...currentDraft,
      categoryId: suggestion.categoryId,
      itemLabel: suggestion.itemLabel,
    }));
  }

  function handleToggleManualSaveAsRule() {
    setManualDraft((currentDraft) => ({
      ...currentDraft,
      autoApplyRule: currentDraft.saveAsRule ? false : currentDraft.autoApplyRule,
      saveAsRule: !currentDraft.saveAsRule,
    }));
  }

  function handleToggleManualAutoApplyRule() {
    setManualDraft((currentDraft) => ({
      ...currentDraft,
      autoApplyRule: !currentDraft.autoApplyRule,
      saveAsRule: true,
    }));
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
    applyMerchantDirectoryState(
      skipTransaction(transactions, transactionId),
    );
  }

  function handleRestoreSkippedInboxTransaction(transactionId: string) {
    applyMerchantDirectoryState(
      restoreSkippedTransaction(transactions, transactionId),
    );
  }

  function handleDeleteInboxTransaction(transactionId: string) {
    applyMerchantDirectoryState(
      deleteTransaction(transactions, transactionId),
    );
  }

  function handleMergeMerchant(sourceMerchantId: string, targetMerchantId: string) {
    const merchantDirectory = mergeMerchants(
      merchants,
      merchantAliases,
      transactions,
      sourceMerchantId,
      targetMerchantId,
    );

    setMerchants(merchantDirectory.merchants);
    setMerchantAliases(merchantDirectory.merchantAliases);
    setTransactions(merchantDirectory.transactions);
    setRules((currentRules) =>
      mergeRuleMerchants(
        currentRules,
        sourceMerchantId,
        targetMerchantId,
        merchantDirectory.merchants,
      ),
    );
  }

  function handleSplitMerchantAlias(aliasId: string) {
    const merchantDirectory = splitMerchantAlias(
      merchants,
      merchantAliases,
      transactions,
      aliasId,
    );

    setMerchants(merchantDirectory.merchants);
    setMerchantAliases(merchantDirectory.merchantAliases);
    setTransactions(merchantDirectory.transactions);
  }

  async function handleResetDemoData() {
    setActiveTransactionId(null);
    setDetailTransactionId(null);
    setDetailNoteDraft('');
    setDraft({ ...EMPTY_DRAFT });
    setSplitDraft(EMPTY_SPLIT_DRAFT);
    setInboxFilters({ ...DEFAULT_INBOX_FILTERS });
    setTimelineFilters({ ...DEFAULT_TIMELINE_FILTERS });
    setManualDraft({ ...EMPTY_MANUAL_ENTRY_DRAFT });
    setBudgets([]);
    setBudgetAlerts([]);
    setBudgetAlertSettings(DEFAULT_BUDGET_ALERT_SETTINGS);
    setBudgetScreenIntent('browse');
    setOnboardingPreferences(DEFAULT_ONBOARDING_PREFERENCES);
    setNotificationAccessState('not_started');
    setOnboardingCompleted(false);
    setCategories(getDefaultCategories());
    setMerchants(seededMerchants);
    setMerchantAliases(seededMerchantAliases);
    setRules([]);
    setTransactions(seededTransactions);
    setScreen('onboarding');

    try {
      await clearStoredSpendTrackerState();
      setCaptureDiagnostics(await clearStoredCaptureSnapshots());
    } catch {
      Alert.alert(
        'Unable to reset local data',
        'Close and reopen the app if the local demo state does not reset cleanly.',
      );
    }
  }

  if (!isHydrating && screen === 'showcase') {
    return (
      <View style={styles.screen}>
        <StatusBar style="auto" />
        <DesignSystemShowcaseScreen onBack={() => setScreen('home')} />
      </View>
    );
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
            onStartSplit={handleOpenSplitFromInbox}
            onUpdateFilters={handleUpdateInboxFilters}
          />
        ) : !isHydrating && screen === 'timeline' ? (
          <TimelineScreen
            allTransactionsCount={transactions.length}
            categories={categories}
            filteredTransactionsCount={timelineTransactions.length}
            filters={timelineFilters}
            hasActiveFilters={hasActiveTimelineFilters(timelineFilters)}
            onClearFilters={handleClearTimelineFilters}
            onOpenHome={() => setScreen('home')}
            onOpenInbox={() => setScreen('inbox')}
            onOpenManualEntry={() => handleOpenManualEntry('timeline')}
            onOpenTransaction={handleOpenTransactionDetail}
            onSelectTab={(nextScreen) => setScreen(nextScreen)}
            onUpdateFilters={handleUpdateTimelineFilters}
            timelineDayGroups={timelineDayGroups}
            timelineSourceAppOptions={timelineSourceAppOptions}
          />
        ) : !isHydrating && screen === 'insights' && insightsReport ? (
          <InsightsScreen
            budgetCycleLabel={getBudgetCycleLabel(onboardingPreferences.budgetCycleId)}
            onBack={() => setScreen('home')}
            onOpenTimeline={handleOpenTimeline}
            onSelectTab={(nextScreen) => setScreen(nextScreen)}
            report={insightsReport}
          />
        ) : !isHydrating && screen === 'categories' ? (
          <CategoryManagementScreen
            categories={categories}
            categoryUsage={categoryUsage}
            onBack={() => setScreen('home')}
            onCreateCategory={handleCreateCategory}
            onDeleteCategory={handleDeleteCategory}
            onMergeCategory={handleMergeCategory}
            onUpdateCategory={handleUpdateCategory}
          />
        ) : !isHydrating && screen === 'budgets' ? (
          <BudgetManagementScreen
            budgetAlertSettings={budgetAlertSettings}
            budgetAlerts={budgetAlerts}
            budgetSummaries={budgetSummaries}
            budgets={budgets}
            categories={categories}
            initialIntent={budgetScreenIntent}
            merchants={merchants}
            onBack={() => setScreen('home')}
            onCreateBudget={(budget) =>
              setBudgets((currentBudgets) =>
                normalizeBudgetDefinitions([...currentBudgets, budget]),
              )
            }
            onDeleteBudget={(budgetId) =>
              setBudgets((currentBudgets) =>
                currentBudgets.filter((budget) => budget.id !== budgetId),
              )
            }
            onUpdateBudget={(nextBudget) =>
              setBudgets((currentBudgets) =>
                normalizeBudgetDefinitions(
                  currentBudgets.map((budget) =>
                    budget.id === nextBudget.id ? nextBudget : budget,
                  ),
                ),
              )
            }
            onUpdateBudgetAlertSettings={setBudgetAlertSettings}
          />
        ) : !isHydrating && screen === 'merchants' ? (
          <MerchantManagementScreen
            merchantAliases={merchantAliases}
            merchantReviewCandidates={merchantReviewCandidates}
            merchantUsage={merchantUsage}
            onBack={() => setScreen('home')}
            onMergeMerchant={handleMergeMerchant}
            onSplitMerchantAlias={handleSplitMerchantAlias}
          />
        ) : !isHydrating && screen === 'detail' && detailTransaction ? (
          <TransactionDetailScreen
            categories={categories}
            noteDraft={detailNoteDraft}
            onBack={handleCloseTransactionDetail}
            onChangeNote={setDetailNoteDraft}
            onDelete={() =>
              handleConfirmDeleteTransaction(detailTransaction.id, detailReturnScreen)
            }
            onOpenClassification={handleOpenDetailClassification}
            onOpenSplit={handleOpenSplitFromDetail}
            onSaveNote={handleSaveDetailNote}
            transaction={detailTransaction}
          />
        ) : !isHydrating && screen === 'classify' && activeTransaction ? (
          <ClassifyScreen
            categories={categories}
            draft={draft}
            onApplySuggestion={handleApplyClassificationSuggestion}
            onCancel={handleCancelClassification}
            onChangeItemLabel={(itemLabel) =>
              setDraft((currentDraft) => ({ ...currentDraft, itemLabel }))
            }
            onOpenSplit={handleOpenSplitFromClassification}
            onSave={handleSaveClassification}
            onSelectCategory={(categoryId) =>
              setDraft((currentDraft) => ({ ...currentDraft, categoryId }))
            }
            onSkip={handleSkipFromClassification}
            onToggleAutoApplyRule={handleToggleAutoApplyRule}
            onToggleSaveAsRule={handleToggleSaveAsRule}
            suggestions={activeTransactionSuggestions}
            transaction={activeTransaction}
          />
        ) : !isHydrating && screen === 'split' && activeTransaction && splitSummary ? (
          <SplitItemsScreen
            categories={categories}
            onAddRow={handleAddSplitRow}
            onCancel={handleCancelSplit}
            onMoveRow={handleMoveSplitRow}
            onRemoveRow={handleRemoveSplitRow}
            onSave={handleSaveSplit}
            onSelectRemainderCategory={handleSelectRemainderCategory}
            onSelectRemainderDisposition={handleSelectRemainderDisposition}
            onUpdateRow={handleUpdateSplitRow}
            splitDraft={splitDraft}
            splitSummary={splitSummary}
            transaction={activeTransaction}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {isHydrating ? (
              <HydrationScreen />
            ) : null}

            {!isHydrating && screen === 'onboarding' ? (
              <OnboardingScreen
                bootstrapState={bootstrapState}
                captureDiagnostics={captureDiagnostics}
                onboardingPreferences={onboardingPreferences}
                notificationAccessState={notificationAccessState}
                onContinue={() => {
                  setOnboardingCompleted(true);
                  setScreen('home');
                }}
                onClearSourceApps={handleClearSourceApps}
                onOpenNotificationAccess={handleOpenNotificationAccess}
                onRefreshCaptureDiagnostics={handleRefreshCaptureDiagnostics}
                onSelectAllSourceApps={handleSelectAllSourceApps}
                onSelectBudgetCycle={handleSelectBudgetCycle}
                onSelectSyncMode={handleSelectSyncMode}
                onToggleSourceApp={handleToggleSourceAppSelection}
              />
            ) : null}

            {!isHydrating && screen === 'home' ? (
              <HomeScreen
                bootstrapState={bootstrapState}
                budgetCount={budgets.length}
                pendingBudgetAlerts={pendingBudgetAlerts}
                categories={categories}
                captureDiagnostics={captureDiagnostics}
                merchantReviewCandidateCount={merchantReviewCandidates.length}
                merchantUsageCount={merchantUsage.length}
                nextPendingTransaction={pendingTransactions[0] ?? null}
                notificationAccessState={notificationAccessState}
                onboardingPreferences={onboardingPreferences}
                onCreateBudget={() => handleOpenBudgets('create')}
                onOpenBudgets={() => handleOpenBudgets('browse')}
                onOpenCategories={handleOpenCategories}
                onOpenInbox={() => setScreen('inbox')}
                onOpenInsights={handleOpenInsights}
                onOpenManualEntry={() => handleOpenManualEntry('home')}
                onOpenMerchants={handleOpenMerchants}
                onOpenNotificationAccess={handleOpenNotificationAccess}
                onRefreshCaptureDiagnostics={handleRefreshCaptureDiagnostics}
                onOpenTimeline={handleOpenTimeline}
                onOpenShowcase={() => setScreen('showcase')}
                onResetDemoData={handleResetDemoData}
                onSelectTab={(nextScreen) => setScreen(nextScreen)}
                onStartClassification={(transactionId) =>
                  handleStartClassification(transactionId, 'home')
                }
                summary={summary}
              />
            ) : null}

            {!isHydrating && screen === 'manual' ? (
              <ManualEntryScreen
                amountMinor={manualAmountMinor}
                categories={categories}
                draft={manualDraft}
                onApplySuggestion={handleApplyManualSuggestion}
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
                onToggleAutoApplyRule={handleToggleManualAutoApplyRule}
                onToggleSaveAsRule={handleToggleManualSaveAsRule}
                suggestions={manualEntrySuggestions}
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
      <SectionHeader
        description="Reading the last onboarding choices, notification setup state, and saved transactions from local SQLite tables."
        eyebrow="Local session"
        title="Restoring saved state on this device"
      />
    </SectionCard>
  );
}

function OnboardingScreen({
  bootstrapState,
  captureDiagnostics,
  onboardingPreferences,
  notificationAccessState,
  onContinue,
  onClearSourceApps,
  onOpenNotificationAccess,
  onRefreshCaptureDiagnostics,
  onSelectAllSourceApps,
  onSelectBudgetCycle,
  onSelectSyncMode,
  onToggleSourceApp,
}: {
  bootstrapState: BootstrapConfigState;
  captureDiagnostics: NativeCaptureDiagnostics;
  onboardingPreferences: OnboardingPreferences;
  notificationAccessState: NotificationAccessState;
  onContinue: () => void;
  onClearSourceApps: () => void;
  onOpenNotificationAccess: () => Promise<void>;
  onRefreshCaptureDiagnostics: () => Promise<void>;
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
  const capturePausedRemotely = isRemoteCapturePaused(bootstrapState.config);
  const listenerPermissionGranted = captureDiagnostics.listenerPermissionGranted;
  const completionCount = [
    listenerPermissionGranted || capturePausedRemotely,
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
          {capturePausedRemotely
            ? bootstrapState.config.runtimeCompatibility?.reason ??
              'Remote config currently pauses notification capture. Keep the local review loop running with manual add while refresh retries.'
            : listenerPermissionGranted
              ? 'Android now reports notification-listener access as granted for this app. Allowed source apps below will drive native filtering.'
            : isAndroid
              ? 'Notification access is needed before Android can hand UPI payment alerts to the app. Open the system screen, grant access, then return here and retry the permission check.'
              : 'Open iOS app settings, then return here. iOS remains shell-only and does not support notification capture in v1.'}
        </Text>
        <StatusChip
          label={
            capturePausedRemotely
              ? 'Capture paused remotely'
              : listenerPermissionGranted
                ? 'Permission granted'
                : notificationAccessState === 'settings_opened'
                  ? 'Settings opened, permission still pending'
              : 'Still needs review'
          }
          tone={
            capturePausedRemotely || listenerPermissionGranted
              ? 'ready'
              : 'pending'
          }
        />
        <View style={styles.helperStack}>
          <Text style={styles.helperCopy}>
            Native service: {captureDiagnostics.serviceAvailable ? 'available in this Android build' : 'not available'}
          </Text>
          <Text style={styles.helperCopy}>
            Stored raw captures: {captureDiagnostics.storedSnapshotCount}
          </Text>
        </View>
        <View style={styles.actionRow}>
          <ActionButton
            disabled={capturePausedRemotely}
            label={isAndroid ? 'Open notification access' : 'Open app settings'}
            onPress={onOpenNotificationAccess}
            tone="primary"
          />
          {isAndroid ? (
            <ActionButton
              label="Retry permission check"
              onPress={onRefreshCaptureDiagnostics}
              tone="secondary"
            />
          ) : null}
        </View>
      </SectionCard>

      <BootstrapConfigStatusCard bootstrapState={bootstrapState} />

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>Source apps</Text>
        <Text style={styles.bodyCopy}>
          Choose which payment apps should be allowed for capture. On Android these choices now
          sync into the native allowlist and block unsupported packages from being stored.
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
        <Text style={styles.helperCopy}>
          Native allowlist: {formatSourceAppSummary(captureDiagnostics.allowedSourceAppIds)}
        </Text>
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
  bootstrapState,
  budgetCount,
  pendingBudgetAlerts,
  categories,
  captureDiagnostics,
  merchantReviewCandidateCount,
  merchantUsageCount,
  nextPendingTransaction,
  notificationAccessState,
  onboardingPreferences,
  onCreateBudget,
  onOpenBudgets,
  onOpenCategories,
  onOpenInbox,
  onOpenInsights,
  onOpenManualEntry,
  onOpenMerchants,
  onOpenNotificationAccess,
  onRefreshCaptureDiagnostics,
  onOpenTimeline,
  onOpenShowcase,
  onResetDemoData,
  onSelectTab,
  onStartClassification,
  summary,
}: {
  bootstrapState: BootstrapConfigState;
  budgetCount: number;
  pendingBudgetAlerts: BudgetThresholdAlert[];
  categories: CategoryOption[];
  captureDiagnostics: NativeCaptureDiagnostics;
  merchantReviewCandidateCount: number;
  merchantUsageCount: number;
  nextPendingTransaction: Transaction | null;
  notificationAccessState: NotificationAccessState;
  onboardingPreferences: OnboardingPreferences;
  onCreateBudget: () => void;
  onOpenBudgets: () => void;
  onOpenCategories: () => void;
  onOpenInbox: () => void;
  onOpenInsights: () => void;
  onOpenManualEntry: () => void;
  onOpenMerchants: () => void;
  onOpenNotificationAccess: () => Promise<void>;
  onRefreshCaptureDiagnostics: () => Promise<void>;
  onOpenTimeline: () => void;
  onOpenShowcase: () => void;
  onResetDemoData: () => Promise<void>;
  onSelectTab: (screen: PrimaryScreen) => void;
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
  const capturePausedRemotely = isRemoteCapturePaused(bootstrapState.config);
  const listenerPermissionGranted = captureDiagnostics.listenerPermissionGranted;
  const budgetsEnabled = bootstrapState.config.featureFlags.budgets_enabled;
  const searchEnabled = bootstrapState.config.featureFlags.search_enabled;
  const showcaseEnabled = bootstrapState.config.featureFlags.showcase_enabled;

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

      <BootstrapConfigStatusCard bootstrapState={bootstrapState} />

      <View style={styles.metricGrid}>
        <MetricCard label="Total spend" value={formatCurrency(summary.totalSpendMinor)} />
        <MetricCard label="Inbox" value={`${summary.inboxCount} pending`} />
        <MetricCard label="Top category" value={summary.topCategoryLabel} />
        <MetricCard label="Top merchant" value={summary.topMerchantLabel} />
      </View>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>Budget progress</Text>
        <Text style={styles.bodyCopy}>
          Current period: {getBudgetCycleLabel(onboardingPreferences.budgetCycleId)}. Home now uses
          the canonical local budget engine for cycle math, projections, and threshold state, and
          the Budgets screen now owns local setup, edits, and threshold review.
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
          <Text style={styles.helperCopy}>Budget: {summary.budgetLabel}</Text>
          <Text style={styles.helperCopy}>{budgetUsedPercent}% of the current-cycle target used</Text>
          <Text style={styles.helperCopy}>
            {budgetOverrunMinor > 0
              ? `${formatCurrency(budgetOverrunMinor)} over the current target`
              : `${formatCurrency(summary.budgetRemainingMinor)} remaining in the current target`}
          </Text>
          <Text style={styles.helperCopy}>
            Projected spend: {formatCurrency(summary.budgetProjectedSpendMinor)} · Status:{' '}
            {getBudgetThresholdStateLabel(summary.budgetThresholdState)}
          </Text>
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <Text style={styles.bodyCopy}>
          Manual add and Inbox are live now. Budget creation, search, and showcase access follow
          the active remote flags so staged rollout does not require a native release. Categories,
          merchants, and local insights are all derived on device and reused across classify,
          split, manual add, timeline, and detail.
        </Text>
        <View style={styles.helperStack}>
          <Text style={styles.helperCopy}>
            Budgets: {budgetsEnabled ? 'enabled for this channel' : 'disabled remotely'}
          </Text>
          <Text style={styles.helperCopy}>
            Saved budgets: {budgetCount} · Pending alert review: {pendingBudgetAlerts.length}
          </Text>
          <Text style={styles.helperCopy}>
            Search: {searchEnabled ? 'enabled for this channel' : 'disabled remotely'}
          </Text>
          <Text style={styles.helperCopy}>
            Insights: local rollups compare the current cycle with the prior one
          </Text>
          <Text style={styles.helperCopy}>
            Categories: {categories.length} available in this local profile
          </Text>
          <Text style={styles.helperCopy}>
            Merchants: {merchantUsageCount} tracked locally · {merchantReviewCandidateCount} review
            suggestion{merchantReviewCandidateCount === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={styles.actionRow}>
          <ActionButton label="Add manual spend" onPress={onOpenManualEntry} tone="primary" />
          <ActionButton label="Review inbox" onPress={onOpenInbox} tone="secondary" />
          <ActionButton label="Manage categories" onPress={onOpenCategories} tone="secondary" />
          <ActionButton label="Manage merchants" onPress={onOpenMerchants} tone="secondary" />
          <ActionButton
            disabled={!budgetsEnabled}
            label="Create budget"
            onPress={onCreateBudget}
            tone="secondary"
          />
          <ActionButton
            disabled={!searchEnabled}
            label="Search"
            onPress={onOpenTimeline}
            tone="secondary"
          />
          <ActionButton label="Insights" onPress={onOpenInsights} tone="secondary" />
        </View>
      </SectionCard>

      {budgetsEnabled && pendingBudgetAlerts.length > 0 ? (
        <SectionCard accentColor={colors.heroGlowSecondary}>
          <Text style={styles.cardTitle}>Budget alerts</Text>
          <Text style={styles.bodyCopy}>
            {pendingBudgetAlerts[0]?.status === 'quieted'
              ? 'Quiet hours held local budget alerts here instead of showing an intrusive banner. Review them when you are ready.'
              : 'A local budget threshold was crossed in this cycle. Review it in Budgets before the next threshold piles on.'}
          </Text>
          <View style={styles.helperStack}>
            {pendingBudgetAlerts.slice(0, 3).map((alert) => (
              <Text key={alert.id} style={styles.helperCopy}>
                {alert.budgetLabel}: {alert.thresholdPercent}% · {formatCurrency(alert.spentMinor)} of{' '}
                {formatCurrency(alert.targetMinor)}
              </Text>
            ))}
          </View>
          <View style={styles.actionRow}>
            <ActionButton label="Review budgets" onPress={onOpenBudgets} tone="primary" />
          </View>
        </SectionCard>
      ) : null}

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
            capturePausedRemotely
              ? 'Capture paused remotely'
              : listenerPermissionGranted
                ? 'Notification access granted'
                : notificationAccessState === 'settings_opened'
                  ? 'Settings opened, permission still pending'
              : 'Notification access not confirmed'
          }
          tone={
            capturePausedRemotely || listenerPermissionGranted
              ? 'ready'
              : 'pending'
          }
        />
      </SectionCard>

      <CaptureDiagnosticsCard
        captureDiagnostics={captureDiagnostics}
        onOpenNotificationAccess={onOpenNotificationAccess}
        onRefreshCaptureDiagnostics={onRefreshCaptureDiagnostics}
      />

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Scope right now</Text>
        <Text style={styles.bodyCopy}>
          Android system settings can already be opened from the app, and Home plus Inbox now read
          from local SQLite-backed spend tables. Remote config now controls parser kill switches and
          staged feature rollout, while real permission checks and native capture import remain
          separate implementation steps.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton
            disabled={capturePausedRemotely}
            label="Review notification access"
            onPress={onOpenNotificationAccess}
            tone="secondary"
          />
          <ActionButton label="Add manual spend" onPress={onOpenManualEntry} tone="secondary" />
          <ActionButton
            disabled={!showcaseEnabled}
            label="View UI showcase"
            onPress={onOpenShowcase}
            tone="secondary"
          />
          <ActionButton label="Reset demo data" onPress={onResetDemoData} tone="secondary" />
        </View>
      </SectionCard>
    </View>
  );
}

function BudgetManagementScreen({
  budgetAlertSettings,
  budgetAlerts,
  budgetSummaries,
  budgets,
  categories,
  initialIntent,
  merchants,
  onBack,
  onCreateBudget,
  onDeleteBudget,
  onUpdateBudget,
  onUpdateBudgetAlertSettings,
}: {
  budgetAlertSettings: BudgetAlertSettings;
  budgetAlerts: BudgetThresholdAlert[];
  budgetSummaries: BudgetSummary[];
  budgets: BudgetDefinition[];
  categories: CategoryOption[];
  initialIntent: BudgetScreenIntent;
  merchants: MerchantRecord[];
  onBack: () => void;
  onCreateBudget: (budget: BudgetDefinition) => void;
  onDeleteBudget: (budgetId: string) => void;
  onUpdateBudget: (budget: BudgetDefinition) => void;
  onUpdateBudgetAlertSettings: (settings: BudgetAlertSettings) => void;
}) {
  const [draft, setDraft] = useState<BudgetDraft>(EMPTY_BUDGET_DRAFT);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(
    initialIntent === 'create' || budgets.length === 0,
  );
  const budgetSummaryById = new Map(
    budgetSummaries.map((budgetSummary) => [budgetSummary.budget.id, budgetSummary]),
  );
  const pendingAlerts = getPendingBudgetAlerts(budgetAlerts);

  useEffect(() => {
    if (initialIntent === 'create') {
      setDraft(EMPTY_BUDGET_DRAFT);
      setEditingBudgetId(null);
      setIsComposerOpen(true);
      return;
    }

    if (budgets.length === 0) {
      setDraft(EMPTY_BUDGET_DRAFT);
      setEditingBudgetId(null);
      setIsComposerOpen(true);
    }
  }, [budgets.length, initialIntent]);

  function handleStartCreateBudget() {
    setDraft(EMPTY_BUDGET_DRAFT);
    setEditingBudgetId(null);
    setIsComposerOpen(true);
  }

  function handleStartEditBudget(budget: BudgetDefinition) {
    setDraft(createBudgetDraftFromBudget(budget));
    setEditingBudgetId(budget.id);
    setIsComposerOpen(true);
  }

  function handleCancelBudgetComposer() {
    setDraft(EMPTY_BUDGET_DRAFT);
    setEditingBudgetId(null);
    setIsComposerOpen(false);
  }

  function handleSaveBudget() {
    const nextBudget = buildBudgetDefinitionFromDraft(
      draft,
      budgets,
      categories,
      merchants,
      editingBudgetId,
    );

    if (!nextBudget) {
      Alert.alert(
        'Finish the budget details',
        'Add a target amount and the required scope details so the budget can be saved locally.',
      );
      return;
    }

    if (editingBudgetId) {
      onUpdateBudget(nextBudget);
    } else {
      onCreateBudget(nextBudget);
    }

    setDraft(EMPTY_BUDGET_DRAFT);
    setEditingBudgetId(null);
    setIsComposerOpen(false);
  }

  function handleConfirmDeleteBudget(budget: BudgetDefinition) {
    Alert.alert(
      'Delete budget locally?',
      `${budget.label} will be removed from this device, but prior threshold alerts stay in the local history list.`,
      [
        {
          style: 'cancel',
          text: 'Cancel',
        },
        {
          style: 'destructive',
          text: 'Delete',
          onPress: () => {
            onDeleteBudget(budget.id);

            if (editingBudgetId === budget.id) {
              handleCancelBudgetComposer();
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.stack}>
      <View style={styles.tabs}>
        <TabButton isActive={false} label="Home" onPress={onBack} />
        <TabButton isActive={true} label="Budgets" onPress={() => undefined} />
      </View>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.sectionEyebrow}>Budgets</Text>
        <Text style={styles.sectionTitle}>Local budget setup</Text>
        <Text style={styles.bodyCopy}>
          Create overall, category, merchant, or item budgets on this device. Threshold alerts are
          scheduled locally from the same canonical budget engine that powers Home.
        </Text>
        <View style={styles.helperStack}>
          <Text style={styles.helperCopy}>{budgets.length} saved budget{budgets.length === 1 ? '' : 's'}</Text>
          <Text style={styles.helperCopy}>
            {pendingAlerts.length} alert{pendingAlerts.length === 1 ? '' : 's'} waiting for review
          </Text>
        </View>
        <View style={styles.actionRow}>
          <ActionButton label="Back to Home" onPress={onBack} tone="secondary" />
          <ActionButton label="New budget" onPress={handleStartCreateBudget} tone="primary" />
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.heroGlowSecondary}>
        <Text style={styles.cardTitle}>Threshold alert quiet mode</Text>
        <Text style={styles.bodyCopy}>
          Quiet mode keeps threshold alerts in this screen instead of surfacing them as an intrusive
          banner during late hours. The local alert log still records each threshold crossing once
          per cycle.
        </Text>
        <View style={styles.chipWrap}>
          <Chip
            label="Quiet hours on"
            onPress={() =>
              onUpdateBudgetAlertSettings({
                ...budgetAlertSettings,
                quietModeEnabled: true,
              })
            }
            selected={budgetAlertSettings.quietModeEnabled}
          />
          <Chip
            label="Quiet hours off"
            onPress={() =>
              onUpdateBudgetAlertSettings({
                ...budgetAlertSettings,
                quietModeEnabled: false,
              })
            }
            selected={!budgetAlertSettings.quietModeEnabled}
          />
        </View>
        <Text style={styles.helperCopy}>
          Quiet hours: {formatHourLabel(budgetAlertSettings.quietHoursStartHour)} to{' '}
          {formatHourLabel(budgetAlertSettings.quietHoursEndHour)}
        </Text>
      </SectionCard>

      {isComposerOpen ? (
        <SectionCard accentColor={colors.panel}>
          <Text style={styles.cardTitle}>
            {editingBudgetId ? 'Edit budget' : 'Create budget'}
          </Text>
          <Text style={styles.bodyCopy}>
            Keep it fast: amount first, then scope and cycle. The label is optional because the app
            can derive one from the selected scope.
          </Text>
          <TextField
            keyboardType="numeric"
            label="Target amount"
            onChangeText={(targetInput) => setDraft((currentDraft) => ({ ...currentDraft, targetInput }))}
            placeholder="2500"
            value={draft.targetInput}
          />
          <TextField
            label="Label"
            onChangeText={(label) => setDraft((currentDraft) => ({ ...currentDraft, label }))}
            placeholder="Groceries for this month"
            value={draft.label}
          />
          <Text style={styles.fieldLabel}>Scope</Text>
          <View style={styles.chipWrap}>
            {BUDGET_SCOPE_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                onPress={() =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    categoryId: option.id === 'category' ? currentDraft.categoryId : null,
                    itemLabel: option.id === 'item' ? currentDraft.itemLabel : '',
                    merchantId: option.id === 'merchant' ? currentDraft.merchantId : null,
                    scope: option.id,
                  }))
                }
                selected={draft.scope === option.id}
              />
            ))}
          </View>

          {draft.scope === 'category' ? (
            <>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipWrap}>
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.label}
                    onPress={() =>
                      setDraft((currentDraft) => ({ ...currentDraft, categoryId: category.id }))
                    }
                    selected={draft.categoryId === category.id}
                  />
                ))}
              </View>
            </>
          ) : null}

          {draft.scope === 'merchant' ? (
            merchants.length > 0 ? (
              <>
                <Text style={styles.fieldLabel}>Merchant</Text>
                <View style={styles.chipWrap}>
                  {merchants.map((merchant) => (
                    <Chip
                      key={merchant.id}
                      label={merchant.label}
                      onPress={() =>
                        setDraft((currentDraft) => ({ ...currentDraft, merchantId: merchant.id }))
                      }
                      selected={draft.merchantId === merchant.id}
                    />
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.helperCopy}>
                Save or classify a few transactions first so merchants appear here.
              </Text>
            )
          ) : null}

          {draft.scope === 'item' ? (
            <TextField
              label="Item label"
              onChangeText={(itemLabel) =>
                setDraft((currentDraft) => ({ ...currentDraft, itemLabel }))
              }
              placeholder="Flat white"
              value={draft.itemLabel}
            />
          ) : null}

          <Text style={styles.fieldLabel}>Cycle</Text>
          <View style={styles.chipWrap}>
            {BUDGET_PERIOD_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                onPress={() =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    period: option.id,
                  }))
                }
                selected={draft.period === option.id}
              />
            ))}
          </View>

          {draft.period === 'weekly' ? (
            <>
              <Text style={styles.fieldLabel}>Week starts on</Text>
              <View style={styles.chipWrap}>
                {WEEKDAY_OPTIONS.map((weekday) => (
                  <Chip
                    key={weekday.id}
                    label={weekday.label}
                    onPress={() =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        weekStartsOn: weekday.id,
                      }))
                    }
                    selected={draft.weekStartsOn === weekday.id}
                  />
                ))}
              </View>
            </>
          ) : null}

          {draft.period === 'rolling' ? (
            <TextField
              keyboardType="numeric"
              label="Rolling window days"
              onChangeText={(rollingWindowDaysInput) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  rollingWindowDaysInput,
                }))
              }
              placeholder="30"
              value={draft.rollingWindowDaysInput}
            />
          ) : null}

          {draft.period === 'custom' ? (
            <TextField
              keyboardType="numeric"
              label="Cycle starts on day"
              onChangeText={(startsOnDayInput) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  startsOnDayInput,
                }))
              }
              placeholder="26"
              value={draft.startsOnDayInput}
            />
          ) : null}

          <View style={styles.actionRow}>
            <ActionButton
              label={editingBudgetId ? 'Save budget' : 'Create budget'}
              onPress={handleSaveBudget}
              tone="primary"
            />
            <ActionButton label="Cancel" onPress={handleCancelBudgetComposer} tone="secondary" />
          </View>
        </SectionCard>
      ) : null}

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>Threshold alerts</Text>
        {budgetAlerts.length > 0 ? (
          <View style={styles.listStack}>
            {budgetAlerts.slice(0, 8).map((budgetAlert) => (
              <ListItem
                key={budgetAlert.id}
                subtitle={`${formatCurrency(budgetAlert.spentMinor)} of ${formatCurrency(budgetAlert.targetMinor)} · ${formatBudgetAlertStatusLabel(budgetAlert.status)}`}
                title={`${budgetAlert.budgetLabel} · ${budgetAlert.thresholdPercent}%`}
                trailing={
                  <Chip
                    label={getBudgetThresholdStateLabel(budgetAlert.thresholdState)}
                    tone={budgetAlert.status === 'reviewed' ? 'default' : 'pending'}
                  />
                }
              >
                <Text style={styles.helperCopy}>{budgetAlert.message}</Text>
              </ListItem>
            ))}
          </View>
        ) : (
          <EmptyState
            description="Alerts appear here after a saved budget crosses 50%, 80%, or 100% in a cycle."
            title="No local budget alerts yet"
          />
        )}
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Saved budgets</Text>
        {budgets.length > 0 ? (
          <View style={styles.listStack}>
            {budgets.map((budget) => {
              const budgetSummary = budgetSummaryById.get(budget.id) ?? null;

              return (
                <ListItem
                  key={budget.id}
                  subtitle={`${formatBudgetScopeLabel(budget.scope)} · ${formatBudgetPeriodLabel(budget)}`}
                  title={budget.label}
                  trailing={
                    budgetSummary ? (
                      <Chip
                        label={getBudgetThresholdStateLabel(budgetSummary.thresholdState)}
                        tone={budgetSummary.thresholdState === 'over_budget' ? 'pending' : 'ready'}
                      />
                    ) : undefined
                  }
                >
                  <View style={styles.helperStack}>
                    <Text style={styles.helperCopy}>
                      Target: {formatCurrency(budget.targetMinor)}
                    </Text>
                    {budgetSummary ? (
                      <>
                        <Text style={styles.helperCopy}>
                          Spent: {formatCurrency(budgetSummary.spentMinor)} · Remaining:{' '}
                          {formatCurrency(budgetSummary.remainingMinor)}
                        </Text>
                        <Text style={styles.helperCopy}>
                          Projected: {formatCurrency(budgetSummary.projectedSpendMinor)} · Matched transactions:{' '}
                          {budgetSummary.matchedTransactionCount}
                        </Text>
                      </>
                    ) : null}
                  </View>
                  <View style={styles.actionRow}>
                    <ActionButton
                      label="Edit"
                      onPress={() => handleStartEditBudget(budget)}
                      tone="secondary"
                    />
                    <ActionButton
                      label="Delete"
                      onPress={() => handleConfirmDeleteBudget(budget)}
                      tone="secondary"
                    />
                  </View>
                </ListItem>
              );
            })}
          </View>
        ) : (
          <EmptyState
            actions={
              <ActionButton label="Create first budget" onPress={handleStartCreateBudget} tone="primary" />
            }
            description="Create an overall, category, merchant, or item budget to start local threshold tracking."
            title="No budgets saved yet"
          />
        )}
      </SectionCard>
    </View>
  );
}

function BootstrapConfigStatusCard({
  bootstrapState,
}: {
  bootstrapState: BootstrapConfigState;
}) {
  const enabledTemplateIds = getEnabledParserTemplateIds(bootstrapState.config);
  const runtimeReason = bootstrapState.config.runtimeCompatibility?.reason;
  const featureSummary = [
    `Capture ${bootstrapState.config.featureFlags.notification_capture_enabled ? 'on' : 'off'}`,
    `Search ${bootstrapState.config.featureFlags.search_enabled ? 'on' : 'off'}`,
    `Showcase ${bootstrapState.config.featureFlags.showcase_enabled ? 'on' : 'off'}`,
  ].join(' · ');

  return (
    <SectionCard
      accentColor={bootstrapState.status === 'fresh' ? colors.successSoft : colors.panelWarm}
    >
      <Text style={styles.cardTitle}>Remote bootstrap config</Text>
      <Text style={styles.bodyCopy}>{bootstrapState.message}</Text>
      <View style={styles.helperStack}>
        <Text style={styles.helperCopy}>
          Channel: {formatRolloutChannel(bootstrapState.config.rolloutChannel)} · Version:{' '}
          {bootstrapState.config.configVersion}
        </Text>
        {bootstrapState.config.copyOverrides?.home_remote_config_status ? (
          <Text style={styles.helperCopy}>
            {bootstrapState.config.copyOverrides.home_remote_config_status}
          </Text>
        ) : null}
        <Text style={styles.helperCopy}>
          Parser templates:{' '}
          {enabledTemplateIds.length > 0 ? enabledTemplateIds.join(', ') : 'all templates disabled'}
        </Text>
        <Text style={styles.helperCopy}>Flags: {featureSummary}</Text>
        {runtimeReason ? <Text style={styles.helperCopy}>{runtimeReason}</Text> : null}
        {bootstrapState.lastError ? (
          <Text style={styles.helperCopy}>Last refresh issue: {bootstrapState.lastError}</Text>
        ) : null}
      </View>
      <StatusChip
        label={getBootstrapStatusLabel(bootstrapState)}
        tone={bootstrapState.status === 'fresh' ? 'ready' : 'pending'}
      />
    </SectionCard>
  );
}

function CaptureDiagnosticsCard({
  captureDiagnostics,
  onOpenNotificationAccess,
  onRefreshCaptureDiagnostics,
}: {
  captureDiagnostics: NativeCaptureDiagnostics;
  onOpenNotificationAccess: () => Promise<void>;
  onRefreshCaptureDiagnostics: () => Promise<void>;
}) {
  return (
    <SectionCard accentColor={colors.panelWarm}>
      <Text style={styles.cardTitle}>Android capture diagnostics</Text>
      <Text style={styles.bodyCopy}>
        This native status now comes from the Android listener service and raw snapshot store, not
        just the local onboarding checklist.
      </Text>
      <View style={styles.helperStack}>
        <Text style={styles.helperCopy}>
          Listener permission:{' '}
          {captureDiagnostics.listenerPermissionGranted ? 'granted' : 'not granted yet'}
        </Text>
        <Text style={styles.helperCopy}>
          Allowed source apps: {formatSourceAppSummary(captureDiagnostics.allowedSourceAppIds)}
        </Text>
        <Text style={styles.helperCopy}>
          Stored raw captures: {captureDiagnostics.storedSnapshotCount}
        </Text>
        <Text style={styles.helperCopy}>
          Suppressed duplicates: {captureDiagnostics.exactDuplicateCount} exact,{' '}
          {captureDiagnostics.fuzzyDuplicateCount} fuzzy
        </Text>
        <Text style={styles.helperCopy}>
          Dedupe config: {formatNativeDedupeConfig(captureDiagnostics)}
        </Text>
        <Text style={styles.helperCopy}>
          Last capture:{' '}
          {captureDiagnostics.lastCapture
            ? `${getSourceAppLabel(captureDiagnostics.lastCapture.sourceAppId)} · ${formatNativeCaptureMoment(captureDiagnostics.lastCapture.capturedAtMs)}`
            : 'No allowlisted notifications stored yet'}
        </Text>
        {captureDiagnostics.lastCapture ? (
          <Text style={styles.helperCopy}>
            Snapshot preview: {captureDiagnostics.lastCapture.preview}
          </Text>
        ) : null}
        {captureDiagnostics.lastDedupeDecision ? (
          <Text style={styles.helperCopy}>
            Last dedupe: {formatDedupeKindLabel(captureDiagnostics.lastDedupeDecision.dedupeKind)}{' '}
            · {getSourceAppLabel(captureDiagnostics.lastDedupeDecision.sourceAppId)} ·{' '}
            {formatCurrency(captureDiagnostics.lastDedupeDecision.amountMinor)} ·{' '}
            {captureDiagnostics.lastDedupeDecision.merchantRaw} · duplicate #
            {captureDiagnostics.lastDedupeDecision.duplicateCount} ·{' '}
            {formatNativeCaptureMoment(captureDiagnostics.lastDedupeDecision.dedupedAtMs)}
            {captureDiagnostics.lastDedupeDecision.similarityScore !== undefined
              ? ` · similarity ${captureDiagnostics.lastDedupeDecision.similarityScore.toFixed(2)}`
              : ''}
          </Text>
        ) : null}
      </View>
      <View style={styles.actionRow}>
        <ActionButton
          label="Refresh diagnostics"
          onPress={onRefreshCaptureDiagnostics}
          tone="secondary"
        />
        <ActionButton
          label="Review notification access"
          onPress={onOpenNotificationAccess}
          tone="secondary"
        />
      </View>
    </SectionCard>
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
  onStartSplit,
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
  onSelectTab: (screen: PrimaryScreen) => void;
  onSkipTransaction: (transactionId: string) => void;
  onStartClassification: (transactionId: string) => void;
  onStartSplit: (transactionId: string) => void;
  onUpdateFilters: (nextFilters: Partial<InboxFilters>) => void;
}) {
  const statusHeadline =
    filteredReviewTransactions.length > 0
      ? filters.statusFilter === 'partially_classified'
        ? 'Continue split items'
        : filters.statusFilter === 'skipped'
        ? 'Revisit what you skipped'
        : 'Inbox for unresolved spend'
      : allReviewCount > 0 && hasActiveFilters
        ? 'No items match these filters'
        : 'Inbox is empty';
  const statusBody =
    filteredReviewTransactions.length > 0
      ? filters.statusFilter === 'partially_classified'
        ? 'These payments already have some saved rows. Finish the split or leave the remainder unresolved so they stay visible until review is complete.'
        : 'Use filters to narrow the queue, split multi-part spends, skip noisy items for later, or classify directly into the local dashboard.'
      : allReviewCount > 0 && hasActiveFilters
        ? 'Clear or relax the active filters to bring hidden review items back into view.'
        : 'The current session has no unresolved local transactions left. Future captured payments will show up here, while manual spends save directly as classified records.';

  return (
    <FlatList
      contentContainerStyle={styles.inboxListContent}
      data={filteredReviewTransactions}
      initialNumToRender={12}
      ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => item.transaction.id}
      ListEmptyComponent={
        <EmptyState
          description={
            hasActiveFilters
              ? 'The local Inbox still has saved items, but none match the current filter stack.'
              : 'Return to Home to review the updated totals and top-spend signals for this session.'
          }
          title={hasActiveFilters ? 'No matching items' : 'All caught up'}
          actions={
            <View style={styles.actionRow}>
              {hasActiveFilters ? (
                <ActionButton label="Clear filters" onPress={onClearFilters} tone="primary" />
              ) : (
                <ActionButton label="Add manual spend" onPress={onOpenManualEntry} tone="primary" />
              )}
              <ActionButton label="Back to home" onPress={onOpenHome} tone="secondary" />
            </View>
          }
        />
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
                Partially classified transactions stay in this queue until their remainder is resolved.
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
              <TextField
                label="Merchant"
                onChangeText={(merchantQuery) => onUpdateFilters({ merchantQuery })}
                placeholder="Filter by merchant"
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
                    isActive={filters.statusFilter === 'partially_classified'}
                    label="Partially split"
                    onPress={() => onUpdateFilters({ statusFilter: 'partially_classified' })}
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
      maxToRenderPerBatch={16}
      removeClippedSubviews={true}
      renderItem={({ item }) => (
        <TransactionCard
          onDelete={() => onDeleteTransaction(item.transaction.id)}
          onRestore={() => onRestoreTransaction(item.transaction.id)}
          onSkip={() => onSkipTransaction(item.transaction.id)}
          onStartClassification={onStartClassification}
          onStartSplit={onStartSplit}
          reviewItem={item}
        />
      )}
      showsVerticalScrollIndicator={false}
      updateCellsBatchingPeriod={50}
      windowSize={7}
    />
  );
}

function InsightsScreen({
  budgetCycleLabel,
  onBack,
  onOpenTimeline,
  onSelectTab,
  report,
}: {
  budgetCycleLabel: string;
  onBack: () => void;
  onOpenTimeline: () => void;
  onSelectTab: (screen: PrimaryScreen) => void;
  report: InsightsReport;
}) {
  const topCategory = getInsightSectionTopRow(report.sections, 'category');
  const topMerchant = getInsightSectionTopRow(report.sections, 'merchant');
  const topTimeOfDay = getInsightSectionTopRow(report.sections, 'time_of_day');
  const topWeekday = getInsightSectionTopRow(report.sections, 'day_of_week');

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.stack}>
        <View style={styles.tabs}>
          <TabButton isActive={false} label="Home" onPress={() => onSelectTab('home')} />
          <TabButton isActive={false} label="Inbox" onPress={() => onSelectTab('inbox')} />
          <TabButton isActive={false} label="Timeline" onPress={() => onSelectTab('timeline')} />
        </View>

        <SectionCard accentColor={colors.accentSoft}>
          <Text style={styles.sectionEyebrow}>Insights</Text>
          <Text style={styles.sectionTitle}>See where the current cycle is moving</Text>
          <Text style={styles.bodyCopy}>
            These rollups stay on device. The current {budgetCycleLabel.toLowerCase()} is compared
            against the immediately prior cycle using the same local transaction set.
          </Text>
          <View style={styles.helperStack}>
            <Text style={styles.helperCopy}>
              Current: {formatInsightDateRange(report.comparison.currentCycleStart, report.comparison.currentCycleEnd)}
            </Text>
            <Text style={styles.helperCopy}>
              Prior: {formatInsightDateRange(report.comparison.priorCycleStart, report.comparison.priorCycleEnd)}
            </Text>
          </View>
          <View style={styles.actionRow}>
            <ActionButton label="Back to home" onPress={onBack} tone="secondary" />
            <ActionButton label="Search timeline" onPress={onOpenTimeline} tone="secondary" />
          </View>
        </SectionCard>

        <View style={styles.metricGrid}>
          <MetricCard
            label="Current spend"
            value={formatCurrency(report.comparison.currentSpendMinor)}
          />
          <MetricCard
            label="Prior spend"
            value={formatCurrency(report.comparison.priorSpendMinor)}
          />
          <MetricCard
            label="Delta"
            value={formatInsightDeltaCompact(report.comparison.deltaMinor)}
          />
          <MetricCard
            label="Current txns"
            value={`${report.comparison.currentTransactionCount}`}
          />
        </View>

        <SectionCard accentColor={colors.panelWarm}>
          <Text style={styles.cardTitle}>Trend cards</Text>
          <Text style={styles.bodyCopy}>
            Quick local signals for the strongest spending shifts in this cycle versus the one
            before it.
          </Text>
          <View style={styles.metricGrid}>
            <MetricCard
              label="Top category"
              value={topCategory ? topCategory.label : 'No data yet'}
            />
            <MetricCard
              label="Top merchant"
              value={topMerchant ? topMerchant.label : 'No data yet'}
            />
            <MetricCard
              label="Peak time"
              value={topTimeOfDay ? topTimeOfDay.label : 'No data yet'}
            />
            <MetricCard
              label="Peak day"
              value={topWeekday ? topWeekday.label : 'No data yet'}
            />
          </View>
          <View style={styles.helperStack}>
            <Text style={styles.helperCopy}>
              Overall change: {formatInsightDelta(report.comparison.deltaMinor)}
            </Text>
            <Text style={styles.helperCopy}>
              Prior-cycle comparison:{' '}
              {report.comparison.deltaRatio === null
                ? 'No prior-cycle baseline yet'
                : `${Math.round(report.comparison.deltaRatio * 100)}% vs prior`}
            </Text>
          </View>
        </SectionCard>

        {report.sections.map((section) => (
          <InsightSectionCard key={section.dimension} section={section} />
        ))}
      </View>
    </ScrollView>
  );
}

function InsightSectionCard({ section }: { section: InsightSection }) {
  return (
    <SectionCard accentColor={colors.panel}>
      <Text style={styles.cardTitle}>{section.title}</Text>
      <Text style={styles.bodyCopy}>{section.description}</Text>
      <View style={styles.helperStack}>
        <Text style={styles.helperCopy}>
          Current: {formatCurrency(section.currentTotalMinor)} · Prior:{' '}
          {formatCurrency(section.priorTotalMinor)}
        </Text>
        <Text style={styles.helperCopy}>
          {section.totalRowCount > section.rows.length
            ? `Showing top ${section.rows.length} of ${section.totalRowCount} local buckets.`
            : `${section.totalRowCount} local bucket${section.totalRowCount === 1 ? '' : 's'} in this view.`}
        </Text>
      </View>

      {section.rows.length > 0 ? (
        <View style={styles.listStack}>
          {section.rows.map((row) => (
            <ListItem
              key={row.id}
              subtitle={`${formatInsightShare(row.shareRatio)} of current spend · ${row.currentMatchCount} match${row.currentMatchCount === 1 ? '' : 'es'}`}
              title={row.label}
              trailing={<Text style={styles.transactionAmount}>{formatCurrency(row.currentAmountMinor)}</Text>}
            >
              <View style={styles.helperStack}>
                <Text style={styles.helperCopy}>
                  Prior: {formatCurrency(row.priorAmountMinor)} · {formatInsightDelta(row.deltaMinor)}
                </Text>
                <Chip
                  label={getInsightTrendLabel(row)}
                  tone={getInsightTrendTone(row)}
                />
              </View>
            </ListItem>
          ))}
        </View>
      ) : (
        <EmptyState
          description="Classify or add more local spends to unlock this rollup."
          title="No local data yet"
        />
      )}
    </SectionCard>
  );
}

function TimelineScreen({
  allTransactionsCount,
  categories,
  filteredTransactionsCount,
  filters,
  hasActiveFilters,
  onClearFilters,
  onOpenHome,
  onOpenInbox,
  onOpenManualEntry,
  onOpenTransaction,
  onSelectTab,
  onUpdateFilters,
  timelineDayGroups,
  timelineSourceAppOptions,
}: {
  allTransactionsCount: number;
  categories: CategoryOption[];
  filteredTransactionsCount: number;
  filters: TimelineFilters;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onOpenHome: () => void;
  onOpenInbox: () => void;
  onOpenManualEntry: () => void;
  onOpenTransaction: (transactionId: string, returnScreen?: PrimaryScreen) => void;
  onSelectTab: (screen: PrimaryScreen) => void;
  onUpdateFilters: (nextFilters: Partial<TimelineFilters>) => void;
  timelineDayGroups: TimelineDayGroup[];
  timelineSourceAppOptions: string[];
}) {
  return (
    <FlatList
      contentContainerStyle={styles.inboxListContent}
      data={timelineDayGroups}
      initialNumToRender={8}
      ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(group) => group.dayKey}
      ListEmptyComponent={
        <EmptyState
          description={
            hasActiveFilters
              ? 'Clear or relax the active search filters to bring hidden transactions back into the local timeline.'
              : 'Add a manual spend or classify Inbox items to populate the historical timeline.'
          }
          title={hasActiveFilters ? 'No matching transactions' : 'No saved history yet'}
          actions={
            <View style={styles.actionRow}>
              {hasActiveFilters ? (
                <ActionButton label="Clear filters" onPress={onClearFilters} tone="primary" />
              ) : (
                <ActionButton label="Add manual spend" onPress={onOpenManualEntry} tone="primary" />
              )}
              <ActionButton label="Back to home" onPress={onOpenHome} tone="secondary" />
            </View>
          }
        />
      }
      ListHeaderComponent={
        <View style={styles.inboxHeaderStack}>
          <View style={styles.tabs}>
            <TabButton isActive={false} label="Home" onPress={() => onSelectTab('home')} />
            <TabButton isActive={false} label="Inbox" onPress={() => onSelectTab('inbox')} />
            <TabButton isActive={true} label="Timeline" onPress={() => onSelectTab('timeline')} />
          </View>

          <SectionCard accentColor={colors.successSoft}>
            <Text style={styles.sectionEyebrow}>Timeline</Text>
            <Text style={styles.sectionTitle}>Search local history and audit what changed</Text>
            <Text style={styles.bodyCopy}>
              Search stays local and scans merchant names, item labels, and saved categories. Open
              any row to inspect the current local state and correct mistakes.
            </Text>
            <View style={styles.helperStack}>
              <Text style={styles.helperCopy}>
                Showing {filteredTransactionsCount} of {allTransactionsCount} local transactions
              </Text>
              <Text style={styles.helperCopy}>
                Parser context, saved notes, and audit history come straight from the local
                transaction records shown here.
              </Text>
            </View>
            <View style={styles.actionRow}>
              <ActionButton label="Add manual spend" onPress={onOpenManualEntry} tone="secondary" />
              <ActionButton label="Open inbox" onPress={onOpenInbox} tone="secondary" />
            </View>
          </SectionCard>

          <SectionCard accentColor={colors.panel}>
            <Text style={styles.cardTitle}>Search and filters</Text>
            <Text style={styles.bodyCopy}>
              Narrow history by merchant, item, category, status, source app, amount, or date.
            </Text>

            <View style={styles.fieldStack}>
              <TextField
                label="Search local history"
                onChangeText={(query) => onUpdateFilters({ query })}
                placeholder="Merchant, item, or category"
                value={filters.query}
              />
            </View>

            <View style={styles.filterStack}>
              <View style={styles.fieldStack}>
                <Text style={styles.fieldLabel}>Status</Text>
                <View style={styles.categoryGrid}>
                  <CategoryChip
                    isActive={filters.statusFilter === 'all'}
                    label="All statuses"
                    onPress={() => onUpdateFilters({ statusFilter: 'all' })}
                  />
                  <CategoryChip
                    isActive={filters.statusFilter === 'classified'}
                    label="Classified"
                    onPress={() => onUpdateFilters({ statusFilter: 'classified' })}
                  />
                  <CategoryChip
                    isActive={filters.statusFilter === 'uncategorized'}
                    label="Needs review"
                    onPress={() => onUpdateFilters({ statusFilter: 'uncategorized' })}
                  />
                  <CategoryChip
                    isActive={filters.statusFilter === 'partially_classified'}
                    label="Partial"
                    onPress={() => onUpdateFilters({ statusFilter: 'partially_classified' })}
                  />
                  <CategoryChip
                    isActive={filters.statusFilter === 'skipped'}
                    label="Skipped"
                    onPress={() => onUpdateFilters({ statusFilter: 'skipped' })}
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
                  {timelineSourceAppOptions.map((sourceApp) => (
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
                <Text style={styles.fieldLabel}>Date</Text>
                <View style={styles.categoryGrid}>
                  <CategoryChip
                    isActive={filters.dateFilter === 'all'}
                    label="Any time"
                    onPress={() => onUpdateFilters({ dateFilter: 'all' })}
                  />
                  <CategoryChip
                    isActive={filters.dateFilter === 'today'}
                    label="Today"
                    onPress={() => onUpdateFilters({ dateFilter: 'today' })}
                  />
                  <CategoryChip
                    isActive={filters.dateFilter === 'last_7_days'}
                    label="Last 7 days"
                    onPress={() => onUpdateFilters({ dateFilter: 'last_7_days' })}
                  />
                  <CategoryChip
                    isActive={filters.dateFilter === 'last_30_days'}
                    label="Last 30 days"
                    onPress={() => onUpdateFilters({ dateFilter: 'last_30_days' })}
                  />
                  <CategoryChip
                    isActive={filters.dateFilter === 'older'}
                    label="Older"
                    onPress={() => onUpdateFilters({ dateFilter: 'older' })}
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
        <SectionCard accentColor={colors.panelWarm}>
          <Text style={styles.cardTitle}>{item.label}</Text>
          <View style={styles.timelineGroupStack}>
            {item.transactions.map((transaction) => (
              <TimelineTransactionRow
                categories={categories}
                key={transaction.id}
                onPress={() => onOpenTransaction(transaction.id, 'timeline')}
                transaction={transaction}
              />
            ))}
          </View>
        </SectionCard>
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}

function TimelineTransactionRow({
  categories,
  onPress,
  transaction,
}: {
  categories: CategoryOption[];
  onPress: () => void;
  transaction: Transaction;
}) {
  const itemSummary =
    transaction.items.length > 0
      ? transaction.items
          .map((item) => `${item.label} · ${getCategoryLabel(item.categoryId, categories)}`)
          .join(', ')
      : 'No saved items yet';

  return (
    <ListItem
      accessibilityLabel={`Open transaction details for ${transaction.merchant}`}
      onPress={onPress}
      subtitle={`${transaction.sourceApp} · ${formatCaptureMoment(transaction.capturedAt)}`}
      title={transaction.merchant}
      trailing={<Text style={styles.transactionAmount}>{formatCurrency(transaction.amountMinor)}</Text>}
    >
      <StatusChip label={getTransactionStatusLabel(transaction.status)} tone={getStatusTone(transaction.status)} />
      <Text style={styles.bodyCopy}>{itemSummary}</Text>
    </ListItem>
  );
}

function CategoryManagementScreen({
  categories,
  categoryUsage,
  onBack,
  onCreateCategory,
  onDeleteCategory,
  onMergeCategory,
  onUpdateCategory,
}: {
  categories: CategoryOption[];
  categoryUsage: CategoryUsageSummary[];
  onBack: () => void;
  onCreateCategory: (draft: CategoryDraft) => void;
  onDeleteCategory: (categoryId: CategoryId) => void;
  onMergeCategory: (sourceCategoryId: CategoryId, targetCategoryId: CategoryId) => void;
  onUpdateCategory: (categoryId: CategoryId, draft: CategoryDraft) => void;
}) {
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY_CATEGORY_DRAFT);
  const [editingCategoryId, setEditingCategoryId] = useState<CategoryId | null>(null);
  const [mergeSourceCategoryId, setMergeSourceCategoryId] = useState<CategoryId | null>(null);
  const [mergeTargetCategoryId, setMergeTargetCategoryId] = useState<CategoryId | null>(null);

  const defaultCategoryUsage = categoryUsage.filter(({ category }) => category.isDefault);
  const customCategoryUsage = categoryUsage.filter(({ category }) => !category.isDefault);
  const normalizedLabel = draft.label.trim().toLowerCase();
  const hasDuplicateLabel =
    normalizedLabel.length > 0 &&
    categories.some(
      (category) =>
        category.label.trim().toLowerCase() === normalizedLabel &&
        category.id !== editingCategoryId,
    );
  const saveDisabled = draft.label.trim().length === 0 || hasDuplicateLabel;
  const mergeTargets = mergeSourceCategoryId
    ? categories.filter((category) => category.id !== mergeSourceCategoryId)
    : [];

  function resetEditor() {
    setDraft(EMPTY_CATEGORY_DRAFT);
    setEditingCategoryId(null);
  }

  function handleStartCreate() {
    resetEditor();
  }

  function handleStartEdit(category: CategoryOption) {
    setDraft({
      description: category.description,
      label: category.label,
    });
    setEditingCategoryId(category.id);
    setMergeSourceCategoryId(null);
    setMergeTargetCategoryId(null);
  }

  function handleSaveCategory() {
    if (saveDisabled) {
      return;
    }

    if (editingCategoryId) {
      onUpdateCategory(editingCategoryId, draft);
    } else {
      onCreateCategory(draft);
    }

    resetEditor();
  }

  function handleDelete(categorySummary: CategoryUsageSummary) {
    if (categorySummary.itemCount > 0) {
      Alert.alert(
        'Merge before deleting',
        'This category is still used on saved transaction rows. Merge it into another category to preserve history first.',
      );
      return;
    }

    Alert.alert(
      'Delete custom category?',
      `${categorySummary.category.label} will be removed from the local category list on this device.`,
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Delete',
          onPress: () => {
            onDeleteCategory(categorySummary.category.id);

            if (editingCategoryId === categorySummary.category.id) {
              resetEditor();
            }
          },
        },
      ],
    );
  }

  function handleConfirmMerge() {
    if (!mergeSourceCategoryId || !mergeTargetCategoryId) {
      return;
    }

    const sourceCategory = categories.find((category) => category.id === mergeSourceCategoryId);
    const targetCategory = categories.find((category) => category.id === mergeTargetCategoryId);

    if (!sourceCategory || !targetCategory) {
      return;
    }

    Alert.alert(
      'Merge category locally?',
      `${sourceCategory.label} will be folded into ${targetCategory.label}. Existing transaction rows will keep their meaning through the merged target category.`,
      [
        { style: 'cancel', text: 'Cancel' },
        {
          text: 'Merge',
          onPress: () => {
            onMergeCategory(sourceCategory.id, targetCategory.id);
            setMergeSourceCategoryId(null);
            setMergeTargetCategoryId(null);

            if (editingCategoryId === sourceCategory.id) {
              resetEditor();
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard accentColor={colors.accentSoft}>
        <Text style={styles.sectionEyebrow}>Categories</Text>
        <Text style={styles.sectionTitle}>Manage the labels used across your local spend data</Text>
        <Text style={styles.bodyCopy}>
          Seeded defaults ship on first launch. Custom categories now behave like first-class
          options in quick classify, split items, manual add, dashboard summaries, and Timeline.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton label="Back to home" onPress={onBack} tone="secondary" />
          <ActionButton label="Add custom category" onPress={handleStartCreate} tone="primary" />
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>
          {editingCategoryId ? 'Edit custom category' : 'Create a custom category'}
        </Text>
        <Text style={styles.bodyCopy}>
          Custom categories are local-first. Merge them when you want to preserve existing
          transaction history while consolidating labels.
        </Text>
        <View style={styles.inputStack}>
          <TextField
            autoCapitalize="words"
            label="Category label"
            onChangeText={(label) => setDraft((currentDraft) => ({ ...currentDraft, label }))}
            placeholder="Weekend treats"
            value={draft.label}
          />
          <TextField
            label="Description"
            multiline={true}
            onChangeText={(description) =>
              setDraft((currentDraft) => ({ ...currentDraft, description }))
            }
            placeholder="Short note shown while choosing this category"
            value={draft.description}
          />
        </View>
        {hasDuplicateLabel ? (
          <Text style={styles.helperCopy}>
            That label already exists. Choose a different name before saving.
          </Text>
        ) : null}
        <View style={styles.actionRow}>
          <ActionButton label="Clear draft" onPress={resetEditor} tone="secondary" />
          <ActionButton
            disabled={saveDisabled}
            label={editingCategoryId ? 'Save changes' : 'Create category'}
            onPress={handleSaveCategory}
            tone="primary"
          />
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Seeded defaults</Text>
        <Text style={styles.bodyCopy}>
          These defaults anchor the first classification experience and remain available even if the
          user never creates a custom category.
        </Text>
        <View style={styles.listStack}>
          {defaultCategoryUsage.map((summary) => (
            <View key={summary.category.id} style={styles.summaryRow}>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryPrimary}>{summary.category.label}</Text>
                <Text style={styles.summarySecondary}>{summary.category.description}</Text>
              </View>
              <Text style={styles.helperCopy}>{summary.itemCount} rows</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Custom categories</Text>
        <Text style={styles.bodyCopy}>
          Edit custom labels directly. Delete only when unused, or merge into another category to
          preserve historical transaction rows.
        </Text>
        {customCategoryUsage.length > 0 ? (
          <View style={styles.listStack}>
            {customCategoryUsage.map((summary) => (
              <View key={summary.category.id} style={styles.summaryCard}>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryPrimary}>{summary.category.label}</Text>
                  <Text style={styles.summarySecondary}>{summary.category.description}</Text>
                  <Text style={styles.helperCopy}>
                    {summary.itemCount} item rows across {summary.transactionCount} transaction
                    {summary.transactionCount === 1 ? '' : 's'}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <ActionButton
                    label="Edit"
                    onPress={() => handleStartEdit(summary.category)}
                    tone="secondary"
                  />
                  <ActionButton
                    label="Merge"
                    onPress={() => {
                      setMergeSourceCategoryId(summary.category.id);
                      setMergeTargetCategoryId(null);
                    }}
                    tone="secondary"
                  />
                  <ActionButton
                    disabled={summary.itemCount > 0}
                    label="Delete"
                    onPress={() => handleDelete(summary)}
                    tone="secondary"
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            description="Create a custom category to reflect the way this device owner actually spends."
            title="No custom categories yet"
            actions={
              <View style={styles.actionRow}>
                <ActionButton
                  label="Create custom category"
                  onPress={handleStartCreate}
                  tone="primary"
                />
              </View>
            }
          />
        )}
      </SectionCard>

      {mergeSourceCategoryId ? (
        <SectionCard accentColor={colors.panelWarm}>
          <Text style={styles.cardTitle}>Merge category</Text>
          <Text style={styles.bodyCopy}>
            Pick the target category that should keep the historical rows currently using the source
            category.
          </Text>
          <View style={styles.categoryGrid}>
            {mergeTargets.map((category) => (
              <CategoryChip
                isActive={mergeTargetCategoryId === category.id}
                key={category.id}
                label={category.label}
                onPress={() => setMergeTargetCategoryId(category.id)}
              />
            ))}
          </View>
          <View style={styles.actionRow}>
            <ActionButton
              label="Cancel merge"
              onPress={() => {
                setMergeSourceCategoryId(null);
                setMergeTargetCategoryId(null);
              }}
              tone="secondary"
            />
            <ActionButton
              disabled={!mergeTargetCategoryId}
              label="Merge into target"
              onPress={handleConfirmMerge}
              tone="primary"
            />
          </View>
        </SectionCard>
      ) : null}
    </ScrollView>
  );
}

function MerchantManagementScreen({
  merchantAliases,
  merchantReviewCandidates,
  merchantUsage,
  onBack,
  onMergeMerchant,
  onSplitMerchantAlias,
}: {
  merchantAliases: MerchantAliasRecord[];
  merchantReviewCandidates: MerchantReviewCandidate[];
  merchantUsage: MerchantUsageSummary[];
  onBack: () => void;
  onMergeMerchant: (sourceMerchantId: string, targetMerchantId: string) => void;
  onSplitMerchantAlias: (aliasId: string) => void;
}) {
  const [mergeSourceMerchantId, setMergeSourceMerchantId] = useState<string | null>(null);
  const [mergeTargetMerchantId, setMergeTargetMerchantId] = useState<string | null>(null);
  const mergeTargets = mergeSourceMerchantId
    ? merchantUsage.filter(({ merchant }) => merchant.id !== mergeSourceMerchantId)
    : [];

  function resetManualMerge() {
    setMergeSourceMerchantId(null);
    setMergeTargetMerchantId(null);
  }

  function confirmMerge(sourceMerchantId: string, targetMerchantId: string) {
    const sourceMerchant = merchantUsage.find(
      ({ merchant }) => merchant.id === sourceMerchantId,
    )?.merchant;
    const targetMerchant = merchantUsage.find(
      ({ merchant }) => merchant.id === targetMerchantId,
    )?.merchant;

    if (!sourceMerchant || !targetMerchant) {
      return;
    }

    Alert.alert(
      'Merge merchants locally?',
      `${sourceMerchant.label} will map into ${targetMerchant.label}. Future matching variants will reuse the target merchant through a saved alias on this device.`,
      [
        { style: 'cancel', text: 'Cancel' },
        {
          text: 'Merge',
          onPress: () => {
            onMergeMerchant(sourceMerchant.id, targetMerchant.id);
            resetManualMerge();
          },
        },
      ],
    );
  }

  function confirmAliasSplit(aliasId: string, aliasLabel: string) {
    Alert.alert(
      'Split alias back out?',
      `${aliasLabel} will become its own standalone merchant again, and future local matches will stop folding into the current canonical merchant.`,
      [
        { style: 'cancel', text: 'Cancel' },
        {
          text: 'Split alias',
          onPress: () => onSplitMerchantAlias(aliasId),
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard accentColor={colors.accentSoft}>
        <Text style={styles.sectionEyebrow}>Merchants</Text>
        <Text style={styles.sectionTitle}>Normalize repeated merchant variants locally</Text>
        <Text style={styles.bodyCopy}>
          Deterministic matches already fold repeated variants into one canonical merchant. This
          screen lets the user review likely merges, create future aliases through explicit
          corrections, and split an alias back out when a merge was too aggressive.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton label="Back to home" onPress={onBack} tone="secondary" />
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>Likely merges to review</Text>
        <Text style={styles.bodyCopy}>
          These are suggestions only. Low-confidence or ambiguous matches are not auto-applied.
        </Text>
        {merchantReviewCandidates.length > 0 ? (
          <View style={styles.listStack}>
            {merchantReviewCandidates.map((candidate) => (
              <View key={candidate.sourceMerchantId} style={styles.summaryCard}>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryPrimary}>
                    {candidate.sourceMerchantLabel} → {candidate.targetMerchantLabel}
                  </Text>
                  <Text style={styles.summarySecondary}>
                    Confidence {formatMerchantConfidence(candidate.confidenceBps)}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <ActionButton
                    accessibilityLabel={`Merge ${candidate.sourceMerchantLabel} into ${candidate.targetMerchantLabel}`}
                    label="Merge and create alias"
                    onPress={() =>
                      confirmMerge(
                        candidate.sourceMerchantId,
                        candidate.targetMerchantId,
                      )
                    }
                    tone="primary"
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            description="The current local merchant directory does not have any high-confidence review suggestions right now."
            title="No review suggestions"
          />
        )}
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Manual merge</Text>
        <Text style={styles.bodyCopy}>
          Pick the source merchant that should be folded into another canonical label. This also
          creates a saved alias for future local matches.
        </Text>
        <View style={styles.fieldStack}>
          <Text style={styles.fieldLabel}>Merge from</Text>
          <View style={styles.categoryGrid}>
            {merchantUsage.map(({ merchant, transactionCount }) => (
              <CategoryChip
                isActive={mergeSourceMerchantId === merchant.id}
                key={merchant.id}
                label={`${merchant.label} (${transactionCount})`}
                onPress={() => {
                  setMergeSourceMerchantId(merchant.id);
                  setMergeTargetMerchantId(null);
                }}
              />
            ))}
          </View>
        </View>

        {mergeSourceMerchantId ? (
          <View style={styles.fieldStack}>
            <Text style={styles.fieldLabel}>Merge into</Text>
            <View style={styles.categoryGrid}>
              {mergeTargets.map(({ merchant, transactionCount }) => (
                <CategoryChip
                  isActive={mergeTargetMerchantId === merchant.id}
                  key={merchant.id}
                  label={`${merchant.label} (${transactionCount})`}
                  onPress={() => setMergeTargetMerchantId(merchant.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <ActionButton label="Clear merge" onPress={resetManualMerge} tone="secondary" />
          <ActionButton
            disabled={!mergeSourceMerchantId || !mergeTargetMerchantId}
            label="Merge selected merchants"
            onPress={() => {
              if (mergeSourceMerchantId && mergeTargetMerchantId) {
                confirmMerge(mergeSourceMerchantId, mergeTargetMerchantId);
              }
            }}
            tone="primary"
          />
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Merchant directory</Text>
        <Text style={styles.bodyCopy}>
          Canonical merchant labels, saved aliases, and the number of local transactions currently
          mapped into each merchant.
        </Text>
        {merchantUsage.length > 0 ? (
          <View style={styles.listStack}>
            {merchantUsage.map((summary) => {
              const aliases = merchantAliases.filter(
                (merchantAlias) => merchantAlias.merchantId === summary.merchant.id,
              );

              return (
                <View key={summary.merchant.id} style={styles.summaryCard}>
                  <View style={styles.summaryCopy}>
                    <Text style={styles.summaryPrimary}>{summary.merchant.label}</Text>
                    <Text style={styles.summarySecondary}>
                      {summary.transactionCount} transaction
                      {summary.transactionCount === 1 ? '' : 's'} · {aliases.length} alias
                      {aliases.length === 1 ? '' : 'es'}
                    </Text>
                  </View>

                  {aliases.length > 0 ? (
                    <View style={styles.aliasStack}>
                      {aliases.map((alias) => (
                        <View key={alias.id} style={styles.aliasRow}>
                          <View style={styles.summaryCopy}>
                            <Text style={styles.summaryPrimary}>{alias.alias}</Text>
                            <Text style={styles.summarySecondary}>
                              {alias.source === 'merged' ? 'Merged alias' : 'Manual alias'} ·{' '}
                              {formatMerchantConfidence(alias.confidenceBps)}
                            </Text>
                          </View>
                          <ActionButton
                            accessibilityLabel={`Split alias ${alias.alias}`}
                            label="Split alias"
                            onPress={() => confirmAliasSplit(alias.id, alias.alias)}
                            tone="secondary"
                          />
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.helperCopy}>
                      No saved aliases yet for this merchant.
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            description="Merchants will appear here after local transactions or captures are normalized."
            title="No merchants yet"
          />
        )}
      </SectionCard>
    </ScrollView>
  );
}

function TransactionDetailScreen({
  categories,
  noteDraft,
  onBack,
  onChangeNote,
  onDelete,
  onOpenClassification,
  onOpenSplit,
  onSaveNote,
  transaction,
}: {
  categories: CategoryOption[];
  noteDraft: string;
  onBack: () => void;
  onChangeNote: (note: string) => void;
  onDelete: () => void;
  onOpenClassification: () => void;
  onOpenSplit: () => void;
  onSaveNote: () => void;
  transaction: Transaction;
}) {
  const unresolvedAmountMinor = getUnresolvedAmountMinor(transaction);
  const shouldEditSplit =
    transaction.items.length > 1 || transaction.status === 'partially_classified';
  const primaryActionLabel = shouldEditSplit
    ? 'Edit split items'
    : transaction.status === 'classified'
      ? 'Edit classification'
      : 'Classify transaction';
  const parserSummary = formatParserInfo(transaction.parserInfo ?? null);
  const classificationHistory = (transaction.history ?? []).filter((entry) =>
    entry.kind === 'classified' ||
    entry.kind === 'classification_imported' ||
    entry.kind === 'split_saved',
  );
  const noteDirty = noteDraft.trim() !== (transaction.note ?? '');

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard accentColor={colors.accentSoft}>
        <Text style={styles.sectionEyebrow}>Transaction detail</Text>
        <Text style={styles.sectionTitle}>Inspect the local record before changing it</Text>
        <Text style={styles.bodyCopy}>
          This screen shows the current local transaction state. Parser and audit metadata appear
          only when the record actually carries them.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton label="Back to timeline" onPress={onBack} tone="secondary" />
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>{transaction.merchant}</Text>
        <Text style={styles.amountLabel}>{formatCurrency(transaction.amountMinor)}</Text>
        <Text style={styles.bodyCopy}>
          {transaction.sourceApp} · {formatCaptureMoment(transaction.capturedAt)}
        </Text>
        <StatusChip label={getTransactionStatusLabel(transaction.status)} tone={getStatusTone(transaction.status)} />
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Items and classification</Text>
        {transaction.items.length > 0 ? (
          <View style={styles.detailItemStack}>
            {transaction.items.map((item) => (
                <View key={item.id} style={styles.detailItemRow}>
                  <View style={styles.summaryCopy}>
                    <Text style={styles.summaryPrimary}>{item.label}</Text>
                    <Text style={styles.summarySecondary}>
                      {getCategoryLabel(item.categoryId, categories)}
                    </Text>
                  </View>
                  <Text style={styles.summaryAmount}>{formatCurrency(item.amountMinor)}</Text>
                </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyCopy}>
            No saved item rows yet. This payment still needs classification before it can leave the
            review loop.
          </Text>
        )}
        {unresolvedAmountMinor > 0 && transaction.status === 'partially_classified' ? (
          <Text style={styles.helperCopy}>
            {formatCurrency(unresolvedAmountMinor)} still remains unresolved, so this transaction
            stays visible in Inbox until the split is finished or the remainder is saved.
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Source and parser context</Text>
        <View style={styles.helperStack}>
          <Text style={styles.helperCopy}>Normalized merchant: {transaction.merchant}</Text>
          <Text style={styles.helperCopy}>
            Raw merchant:{' '}
            {transaction.merchantRaw && transaction.merchantRaw.length > 0
              ? transaction.merchantRaw
              : transaction.merchant}
          </Text>
          {transaction.merchantMatchKind ? (
            <Text style={styles.helperCopy}>
              Merchant match: {formatMerchantMatchKind(transaction.merchantMatchKind)}
            </Text>
          ) : null}
          {typeof transaction.merchantConfidenceBps === 'number' ? (
            <Text style={styles.helperCopy}>
              Merchant confidence: {formatMerchantConfidence(transaction.merchantConfidenceBps)}
            </Text>
          ) : null}
          <Text style={styles.helperCopy}>Source app: {transaction.sourceApp}</Text>
          <Text style={styles.helperCopy}>
            Local status: {getTransactionStatusLabel(transaction.status)}
          </Text>
          <Text style={styles.helperCopy}>Local record ID: {transaction.id}</Text>
          <Text style={styles.helperCopy}>Parser: {parserSummary.label}</Text>
          {parserSummary.version ? (
            <Text style={styles.helperCopy}>Parser version: {parserSummary.version}</Text>
          ) : null}
          {parserSummary.confidence ? (
            <Text style={styles.helperCopy}>Confidence: {parserSummary.confidence}</Text>
          ) : null}
          {parserSummary.note ? <Text style={styles.helperCopy}>{parserSummary.note}</Text> : null}
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Local note</Text>
        <Text style={styles.bodyCopy}>
          Notes are stored on-device and included in Timeline search so the user can annotate why a
          payment mattered or how it should be reviewed later.
        </Text>
        <View style={styles.fieldStack}>
          <TextField
            label="Note"
            multiline={true}
            onChangeText={onChangeNote}
            placeholder="Add a local note for search and detail context"
            value={noteDraft}
          />
        </View>
        <View style={styles.actionRow}>
          <ActionButton
            disabled={!noteDirty}
            label="Save note"
            onPress={onSaveNote}
            tone="secondary"
          />
        </View>
      </SectionCard>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>Classification history</Text>
        {classificationHistory.length > 0 ? (
          <View style={styles.historyStack}>
            {classificationHistory.map((entry) => (
              <HistoryEventRow key={entry.id} entry={entry} />
            ))}
          </View>
        ) : (
          <Text style={styles.bodyCopy}>
            No classification events are stored yet for this transaction.
          </Text>
        )}
      </SectionCard>

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Audit history</Text>
        {(transaction.history ?? []).length > 0 ? (
          <View style={styles.historyStack}>
            {(transaction.history ?? []).map((entry) => (
              <HistoryEventRow key={entry.id} entry={entry} />
            ))}
          </View>
        ) : (
          <Text style={styles.helperCopy}>
            No audit events are stored yet for this transaction.
          </Text>
        )}
      </SectionCard>

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Actions</Text>
        <Text style={styles.bodyCopy}>
          Edit the current local classification, reopen split items when one payment needs multiple
          rows, or delete the record with confirmation.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton
            label={primaryActionLabel}
            onPress={shouldEditSplit ? onOpenSplit : onOpenClassification}
            tone="primary"
          />
          {!shouldEditSplit ? (
            <ActionButton label="Split items" onPress={onOpenSplit} tone="secondary" />
          ) : null}
          <ActionButton label="Delete transaction locally" onPress={onDelete} tone="secondary" />
        </View>
      </SectionCard>
    </ScrollView>
  );
}

function HistoryEventRow({
  entry,
}: {
  entry: TransactionHistoryEntry;
}) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryPrimary}>{getHistoryEventLabel(entry.kind)}</Text>
        <Text style={styles.summarySecondary}>{entry.summary}</Text>
      </View>
      <Text style={styles.historyTimestamp}>{formatCaptureMoment(entry.at)}</Text>
    </View>
  );
}

function ClassifyScreen({
  categories,
  draft,
  onApplySuggestion,
  onCancel,
  onChangeItemLabel,
  onOpenSplit,
  onSave,
  onSelectCategory,
  onSkip,
  onToggleAutoApplyRule,
  onToggleSaveAsRule,
  suggestions,
  transaction,
}: {
  categories: CategoryOption[];
  draft: ClassificationDraft;
  onApplySuggestion: (suggestion: ClassificationSuggestion) => void;
  onCancel: () => void;
  onChangeItemLabel: (itemLabel: string) => void;
  onOpenSplit: () => void;
  onSave: () => void;
  onSelectCategory: (categoryId: CategoryId) => void;
  onSkip: () => void;
  onToggleAutoApplyRule: () => void;
  onToggleSaveAsRule: () => void;
  suggestions: ClassificationSuggestion[];
  transaction: Transaction;
}) {
  const saveDisabled = !isClassificationReady(draft);

  return (
    <BottomSheet onDismiss={onCancel}>
      <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sectionEyebrow}>Quick classify sheet</Text>
          <Text style={styles.cardTitle}>Turn this payment into a usable spend</Text>
          <Text style={styles.bodyCopy}>
            Common cases should take two taps here: choose a suggestion, then save. The full edit
            path still stays available inside the sheet.
          </Text>
        </View>

        <SectionCard accentColor={colors.panelWarm}>
          <Text style={styles.cardTitle}>{transaction.merchant}</Text>
          <Text style={styles.amountLabel}>{formatCurrency(transaction.amountMinor)}</Text>
          <Text style={styles.bodyCopy}>
            {transaction.sourceApp} captured at {formatCaptureMoment(transaction.capturedAt)}
          </Text>
        </SectionCard>

        <ClassificationFieldsCard
          categories={categories}
          categoryId={draft.categoryId}
          description="Suggestions stay explicit and editable. Tap one to fill both the item label and category in one move."
          emptyStateCopy="Suggestions will appear here when the merchant or local history gives us a confident starting point."
          itemLabel={draft.itemLabel}
          onApplySuggestion={onApplySuggestion}
          onChangeItemLabel={onChangeItemLabel}
          onSelectCategory={onSelectCategory}
          suggestions={suggestions}
          title="Suggested values"
        />

        <SectionCard accentColor={colors.successSoft}>
          <Text style={styles.cardTitle}>Save behavior</Text>
          <Text style={styles.bodyCopy}>
            Saving removes the payment from Inbox, recalculates Home immediately, and writes the
            updated transaction back into local SQLite tables. Split opens a full-screen editor
            when one payment needs to become multiple items first.
          </Text>
          <RuleIntentToggle
            accessibilityLabel="Save as reusable rule"
            description="Store this merchant, amount bucket, and timing pattern as an explicit local rule."
            isActive={draft.saveAsRule}
            label="Save as reusable rule"
            onPress={onToggleSaveAsRule}
          />
          {draft.saveAsRule ? (
            <RuleIntentToggle
              accessibilityLabel="Auto-apply this rule"
              description="Future uncategorized captures that match this saved rule can be classified automatically."
              isActive={draft.autoApplyRule}
              label="Auto-apply matching captures"
              onPress={onToggleAutoApplyRule}
            />
          ) : null}
          <View style={styles.actionRow}>
            <ActionButton label="Back to inbox" onPress={onCancel} tone="secondary" />
            <ActionButton label="Skip for now" onPress={onSkip} tone="secondary" />
            <ActionButton label="Split items" onPress={onOpenSplit} tone="secondary" />
            <ActionButton
              disabled={saveDisabled}
              label="Save classification"
              onPress={onSave}
              tone="primary"
            />
          </View>
        </SectionCard>
      </ScrollView>
    </BottomSheet>
  );
}

function SplitItemsScreen({
  categories,
  onAddRow,
  onCancel,
  onMoveRow,
  onRemoveRow,
  onSave,
  onSelectRemainderCategory,
  onSelectRemainderDisposition,
  onUpdateRow,
  splitDraft,
  splitSummary,
  transaction,
}: {
  categories: CategoryOption[];
  onAddRow: () => void;
  onCancel: () => void;
  onMoveRow: (rowId: string, direction: 'down' | 'up') => void;
  onRemoveRow: (rowId: string) => void;
  onSave: () => void;
  onSelectRemainderCategory: (categoryId: CategoryId) => void;
  onSelectRemainderDisposition: (remainderDisposition: SplitRemainderDisposition) => void;
  onUpdateRow: (
    rowId: string,
    nextRowPatch: Partial<SplitDraft['rows'][number]>,
  ) => void;
  splitDraft: SplitDraft;
  splitSummary: ReturnType<typeof summarizeSplitDraft>;
  transaction: Transaction;
}) {
  const saveDisabled = !isSplitDraftReady(transaction.amountMinor, splitDraft);
  const hasRemainingAmount = splitSummary.remainingMinor > 0;
  const hasOverAllocation = splitSummary.signedRemainingMinor < 0;
  const requiresRemainderCategory =
    hasRemainingAmount &&
    splitDraft.remainderDisposition !== 'leave_unresolved' &&
    !splitDraft.remainderCategoryId;
  const saveLabel =
    hasRemainingAmount && splitDraft.remainderDisposition === 'leave_unresolved'
      ? 'Save partial split'
      : 'Save split';

  let summaryCopy =
    'Saving writes these rows into the local transaction and updates Home immediately.';

  if (hasOverAllocation) {
    summaryCopy = `Reduce the rows by ${formatCurrency(
      Math.abs(splitSummary.signedRemainingMinor),
    )} before saving.`;
  } else if (hasRemainingAmount && splitDraft.remainderDisposition === 'leave_unresolved') {
    summaryCopy = `${formatCurrency(
      splitSummary.remainingMinor,
    )} will stay unresolved, so this payment remains visible in Inbox as partially classified.`;
  } else if (hasRemainingAmount && requiresRemainderCategory) {
    summaryCopy = 'Choose a category for the remainder before saving this split.';
  } else if (hasRemainingAmount) {
    summaryCopy = `${formatCurrency(
      splitSummary.remainingMinor,
    )} will be saved as ${getSplitRemainderLabel(
      splitDraft.remainderDisposition,
    ).toLowerCase()}.`;
  } else if (splitSummary.readyRows.length > 0) {
    summaryCopy = 'This payment is fully allocated and ready to leave the Inbox.';
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <SectionCard accentColor={colors.accentSoft}>
        <Text style={styles.sectionEyebrow}>Split items</Text>
        <Text style={styles.sectionTitle}>Break one payment into meaningful parts</Text>
        <Text style={styles.bodyCopy}>
          Use rows when one UPI payment maps to groceries plus fees, shared items, or any other
          multi-part spend that should not stay as one flat label.
        </Text>
      </SectionCard>

      <SectionCard accentColor={colors.panelWarm}>
        <Text style={styles.cardTitle}>{transaction.merchant}</Text>
        <Text style={styles.amountLabel}>{formatCurrency(transaction.amountMinor)}</Text>
        <Text style={styles.bodyCopy}>
          {transaction.sourceApp} captured at {formatCaptureMoment(transaction.capturedAt)}
        </Text>
        {transaction.items.length > 0 ? (
          <Text style={styles.helperCopy}>
            Existing rows: {transaction.items.map((item) => item.label).join(', ')}
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard accentColor={hasOverAllocation ? colors.panelWarm : colors.successSoft}>
        <Text style={styles.cardTitle}>Running total</Text>
        <View style={styles.metricGrid}>
          <MetricCard
            label="Allocated"
            value={formatCurrency(splitSummary.allocatedMinor)}
          />
          <MetricCard
            label={hasOverAllocation ? 'Over by' : 'Remaining'}
            value={formatCurrency(
              hasOverAllocation
                ? Math.abs(splitSummary.signedRemainingMinor)
                : splitSummary.remainingMinor,
            )}
          />
        </View>
        <Text style={styles.bodyCopy}>{summaryCopy}</Text>
        {splitSummary.hasInvalidRows ? (
          <Text style={styles.helperCopy}>
            Rows only count after amount, item label, and category are all filled.
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Split rows</Text>
        <Text style={styles.bodyCopy}>
          Add, reorder, or remove rows until the payment matches what actually happened.
        </Text>
        <View style={styles.splitRowStack}>
          {splitDraft.rows.map((row, index) => (
            <SplitRowCard
              categories={categories}
              index={index}
              key={row.id}
              onMoveRow={onMoveRow}
              onRemoveRow={onRemoveRow}
              onUpdateRow={onUpdateRow}
              row={row}
              totalRows={splitDraft.rows.length}
            />
          ))}
        </View>
        <View style={styles.actionRow}>
          <ActionButton label="Add another row" onPress={onAddRow} tone="secondary" />
        </View>
      </SectionCard>

      {hasRemainingAmount ? (
        <SectionCard accentColor={colors.panelWarm}>
          <Text style={styles.cardTitle}>Remainder handling</Text>
          <Text style={styles.bodyCopy}>
            Decide whether the leftover {formatCurrency(splitSummary.remainingMinor)} should stay in
            Inbox or be saved now as tip, tax, fees, or an unknown remainder.
          </Text>
          <View style={styles.categoryGrid}>
            {SPLIT_REMAINDER_OPTIONS.map((option) => (
              <CategoryChip
                isActive={splitDraft.remainderDisposition === option.id}
                key={option.id}
                label={option.label}
                onPress={() => onSelectRemainderDisposition(option.id)}
              />
            ))}
          </View>

          {splitDraft.remainderDisposition !== 'leave_unresolved' ? (
            <View style={styles.fieldStack}>
              <Text style={styles.fieldLabel}>Remainder category</Text>
              <View style={styles.categoryGrid}>
                {categories.map((category) => (
                  <CategoryChip
                    isActive={splitDraft.remainderCategoryId === category.id}
                    key={category.id}
                    label={category.label}
                    onPress={() => onSelectRemainderCategory(category.id)}
                  />
                ))}
              </View>
              {requiresRemainderCategory ? (
                <Text style={styles.helperCopy}>
                  Pick a category so the explicit remainder can save with the rest of the split.
                </Text>
              ) : null}
            </View>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Save split</Text>
        <Text style={styles.bodyCopy}>
          Full splits leave Inbox. Partial saves keep the transaction visible until the unresolved
          remainder is reviewed later.
        </Text>
        <View style={styles.actionRow}>
          <ActionButton label="Back" onPress={onCancel} tone="secondary" />
          <ActionButton
            disabled={saveDisabled}
            label={saveLabel}
            onPress={onSave}
            tone="primary"
          />
        </View>
      </SectionCard>
    </ScrollView>
  );
}

function SplitRowCard({
  categories,
  index,
  onMoveRow,
  onRemoveRow,
  onUpdateRow,
  row,
  totalRows,
}: {
  categories: CategoryOption[];
  index: number;
  onMoveRow: (rowId: string, direction: 'down' | 'up') => void;
  onRemoveRow: (rowId: string) => void;
  onUpdateRow: (
    rowId: string,
    nextRowPatch: Partial<SplitDraft['rows'][number]>,
  ) => void;
  row: SplitDraft['rows'][number];
  totalRows: number;
}) {
  return (
    <View style={styles.splitRowCard}>
      <View style={styles.splitRowHeader}>
        <Text style={styles.fieldLabel}>Item {index + 1}</Text>
        <Text style={styles.helperCopy}>
          {row.categoryId ? getCategoryLabel(row.categoryId, categories) : 'Category still needed'}
        </Text>
      </View>

      <View style={styles.inputStack}>
        <TextField
          keyboardType="decimal-pad"
          label="Amount"
          onChangeText={(amountInput) => onUpdateRow(row.id, { amountInput })}
          placeholder={`Amount for item ${index + 1}`}
          value={row.amountInput}
        />
        <TextField
          autoCapitalize="sentences"
          label="Item label"
          onChangeText={(itemLabel) => onUpdateRow(row.id, { itemLabel })}
          placeholder={`What did item ${index + 1} cover?`}
          value={row.itemLabel}
        />
      </View>

      <View style={styles.fieldStack}>
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <CategoryChip
              isActive={row.categoryId === category.id}
              key={category.id}
              label={category.label}
              onPress={() => onUpdateRow(row.id, { categoryId: category.id })}
            />
          ))}
        </View>
      </View>

      <View style={styles.actionRow}>
        <ActionButton
          disabled={index === 0}
          label="Move up"
          onPress={() => onMoveRow(row.id, 'up')}
          tone="secondary"
        />
        <ActionButton
          disabled={index === totalRows - 1}
          label="Move down"
          onPress={() => onMoveRow(row.id, 'down')}
          tone="secondary"
        />
        <ActionButton
          label={totalRows === 1 ? 'Clear row' : 'Remove row'}
          onPress={() => onRemoveRow(row.id)}
          tone="secondary"
        />
      </View>
    </View>
  );
}

function ManualEntryScreen({
  amountMinor,
  categories,
  draft,
  onApplySuggestion,
  onCancel,
  onChangeAmount,
  onChangeItemLabel,
  onChangeMerchant,
  onSave,
  onSelectCategory,
  onToggleAutoApplyRule,
  onToggleSaveAsRule,
  suggestions,
}: {
  amountMinor: number | null;
  categories: CategoryOption[];
  draft: ManualEntryDraft;
  onApplySuggestion: (suggestion: ClassificationSuggestion) => void;
  onCancel: () => void;
  onChangeAmount: (amountInput: string) => void;
  onChangeItemLabel: (itemLabel: string) => void;
  onChangeMerchant: (merchant: string) => void;
  onSave: () => void;
  onSelectCategory: (categoryId: CategoryId) => void;
  onToggleAutoApplyRule: () => void;
  onToggleSaveAsRule: () => void;
  suggestions: ClassificationSuggestion[];
}) {
  const saveDisabled =
    !amountMinor ||
    amountMinor <= 0 ||
    !isClassificationReady({
      autoApplyRule: false,
      categoryId: draft.categoryId,
      itemLabel: draft.itemLabel,
      saveAsRule: false,
    }) ||
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
          <TextField
            keyboardType="decimal-pad"
            label="Amount"
            onChangeText={onChangeAmount}
            placeholder="180 or 180.50"
            value={draft.amountInput}
          />

          <TextField
            autoCapitalize="words"
            label="Merchant"
            onChangeText={onChangeMerchant}
            placeholder="Where did you spend?"
            value={draft.merchant}
          />
        </View>
      </SectionCard>

      <ClassificationFieldsCard
        categories={categories}
        categoryId={draft.categoryId}
        description="Manual add now reuses the same item-label and category primitives as quick classify, with saved rules appearing before history or merchant heuristics."
        emptyStateCopy="Start with the merchant name to unlock local suggestions, or type the item manually."
        itemLabel={draft.itemLabel}
        onApplySuggestion={onApplySuggestion}
        onChangeItemLabel={onChangeItemLabel}
        onSelectCategory={onSelectCategory}
        suggestions={suggestions}
        title="Classify this spend"
      />

      <SectionCard accentColor={colors.panel}>
        <Text style={styles.cardTitle}>Rule behavior</Text>
        <Text style={styles.bodyCopy}>
          Save this combination as an explicit local rule if the same merchant, amount range, and
          timing pattern keeps repeating.
        </Text>
        <RuleIntentToggle
          accessibilityLabel="Save manual rule"
          description="This keeps a reusable local rule on-device for future suggestions."
          isActive={draft.saveAsRule}
          label="Save as reusable rule"
          onPress={onToggleSaveAsRule}
        />
        {draft.saveAsRule ? (
          <RuleIntentToggle
            accessibilityLabel="Auto-apply manual rule"
            description="Matching uncategorized captures can classify themselves from this explicit rule."
            isActive={draft.autoApplyRule}
            label="Auto-apply matching captures"
            onPress={onToggleAutoApplyRule}
          />
        ) : null}
      </SectionCard>

      <SectionCard accentColor={colors.successSoft}>
        <Text style={styles.cardTitle}>Preview</Text>
        <Text style={styles.amountLabel}>
          {amountMinor && amountMinor > 0 ? formatCurrency(amountMinor) : 'Enter a valid amount'}
        </Text>
        <Text style={styles.bodyCopy}>
          Saving creates a classified local transaction immediately, updates Home totals, and uses
          the same item-label and category validation rules as captured spends.
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

function ClassificationFieldsCard({
  categories,
  categoryId,
  description,
  emptyStateCopy,
  itemLabel,
  onApplySuggestion,
  onChangeItemLabel,
  onSelectCategory,
  suggestions,
  title,
}: {
  categories: CategoryOption[];
  categoryId: CategoryId | null;
  description: string;
  emptyStateCopy: string;
  itemLabel: string;
  onApplySuggestion: (suggestion: ClassificationSuggestion) => void;
  onChangeItemLabel: (itemLabel: string) => void;
  onSelectCategory: (categoryId: CategoryId) => void;
  suggestions: ClassificationSuggestion[];
  title: string;
}) {
  return (
    <SectionCard accentColor={colors.panel}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.bodyCopy}>{description}</Text>

      <View style={styles.fieldStack}>
        <Text style={styles.fieldLabel}>Suggestions</Text>
        {suggestions.length > 0 ? (
          <View style={styles.suggestionStack}>
            {suggestions.map((suggestion) => (
              <SuggestionCard
                categories={categories}
                key={suggestion.id}
                onPress={() => onApplySuggestion(suggestion)}
                suggestion={suggestion}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.helperCopy}>{emptyStateCopy}</Text>
        )}
      </View>

      <View style={styles.fieldStack}>
        <TextField
          label="Item label"
          onChangeText={onChangeItemLabel}
          placeholder="What did you buy?"
          value={itemLabel}
        />
      </View>

      <View style={styles.fieldStack}>
        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map((category) => (
            <CategoryChip
              isActive={categoryId === category.id}
              key={category.id}
              label={category.label}
              onPress={() => onSelectCategory(category.id)}
            />
          ))}
        </View>
      </View>
    </SectionCard>
  );
}

function SuggestionCard({
  categories,
  onPress,
  suggestion,
}: {
  categories: CategoryOption[];
  onPress: () => void;
  suggestion: ClassificationSuggestion;
}) {
  return (
    <Pressable
      accessibilityLabel={`${suggestion.itemLabel} suggestion`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.suggestionCard}
    >
      <Text style={styles.suggestionTitle}>{suggestion.itemLabel}</Text>
      <Text style={styles.suggestionMeta}>
        {getCategoryLabel(suggestion.categoryId, categories)} · {suggestion.reason}
      </Text>
      <Text style={styles.helperCopy}>
        {suggestion.explanation.join(' · ')}
        {suggestion.autoApply ? ' · Auto-apply enabled' : ''}
      </Text>
    </Pressable>
  );
}

function RuleIntentToggle({
  accessibilityLabel,
  description,
  isActive,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  description: string;
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.ruleToggle}
    >
      <View style={[styles.ruleToggleIndicator, isActive ? styles.ruleToggleIndicatorActive : null]}>
        {isActive ? <View style={styles.ruleToggleIndicatorDot} /> : null}
      </View>
      <View style={styles.ruleToggleCopy}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.helperCopy}>{description}</Text>
      </View>
    </Pressable>
  );
}

function SectionCard({
  accentColor,
  children,
}: {
  accentColor: string;
  children: ReactNode;
}) {
  return <Card accentColor={accentColor}>{children}</Card>;
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCardShell}>
      <KPIBlock label={label} value={value} />
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
  return <Chip label={label} tone={tone} />;
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
  const buttonAccessibilityProps = accessibilityLabel ? { accessibilityLabel } : {};

  return (
    <Button
      {...buttonAccessibilityProps}
      disabled={disabled}
      label={label}
      onPress={onPress}
      variant={tone === 'primary' ? 'primary' : 'secondary'}
    />
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
  return <Chip label={label} onPress={onPress} selected={isActive} />;
}

function TransactionCard({
  onDelete,
  onRestore,
  onSkip,
  onStartClassification,
  onStartSplit,
  reviewItem,
}: {
  onDelete: () => void;
  onRestore: () => void;
  onSkip: () => void;
  onStartClassification: (transactionId: string) => void;
  onStartSplit: (transactionId: string) => void;
  reviewItem: InboxReviewItem;
}) {
  const { reviewStatus, transaction } = reviewItem;
  const hasSavedItemPreview = transaction.items[0]?.label?.trim().length;
  const unresolvedRemainderMinor = getUnresolvedAmountMinor(transaction);

  return (
    <ListItem
      subtitle={`${transaction.sourceApp} | ${formatCaptureMoment(transaction.capturedAt)}`}
      title={transaction.merchant}
      trailing={<Text style={styles.transactionAmount}>{formatCurrency(transaction.amountMinor)}</Text>}
    >
      <StatusChip
        label={
          reviewStatus === 'skipped'
            ? 'Skipped'
            : reviewStatus === 'partially_classified'
              ? 'Partially classified'
              : 'Needs review'
        }
        tone={reviewStatus === 'uncategorized' ? 'ready' : 'pending'}
      />

      <Text style={styles.bodyCopy}>
        {reviewStatus === 'skipped'
          ? 'This payment was deferred locally. Move it back into needs review or classify it directly when you are ready.'
          : reviewStatus === 'partially_classified'
            ? `${formatCurrency(
                Math.max(unresolvedRemainderMinor, 0),
              )} still needs a remainder decision. Continue the split or open classify to adjust the saved rows.`
            : 'No item or category has been saved for this payment yet. Classify it now, split it into rows, or skip it without losing the original capture.'}
      </Text>

      {hasSavedItemPreview ? (
        <Text style={styles.helperCopy}>Saved preview: {transaction.items[0]?.label}</Text>
      ) : null}

      <View style={styles.actionRow}>
        {reviewStatus === 'skipped' ? (
          <>
            <ActionButton
              accessibilityLabel={`Classify ${transaction.merchant}`}
              label="Classify"
              onPress={() => onStartClassification(transaction.id)}
              tone="primary"
            />
            <ActionButton
              accessibilityLabel={`Review ${transaction.merchant} again`}
              label="Move to needs review"
              onPress={onRestore}
              tone="secondary"
            />
          </>
        ) : reviewStatus === 'partially_classified' ? (
          <>
            <ActionButton
              accessibilityLabel={`Continue split ${transaction.merchant}`}
              label="Continue split"
              onPress={() => onStartSplit(transaction.id)}
              tone="primary"
            />
            <ActionButton
              accessibilityLabel={`Classify ${transaction.merchant}`}
              label="Open classify"
              onPress={() => onStartClassification(transaction.id)}
              tone="secondary"
            />
          </>
        ) : (
          <>
            <ActionButton
              accessibilityLabel={`Classify ${transaction.merchant}`}
              label="Classify"
              onPress={() => onStartClassification(transaction.id)}
              tone="primary"
            />
            <ActionButton
              accessibilityLabel={`Split ${transaction.merchant} now`}
              label="Split items"
              onPress={() => onStartSplit(transaction.id)}
              tone="secondary"
            />
            <ActionButton
              accessibilityLabel={`Skip ${transaction.merchant} for now`}
              label="Skip for now"
              onPress={onSkip}
              tone="secondary"
            />
          </>
        )}
        <ActionButton
          accessibilityLabel={`Delete ${transaction.merchant} locally`}
          label="Delete locally"
          onPress={onDelete}
          tone="secondary"
        />
      </View>
    </ListItem>
  );
}

function createBudgetDraftFromBudget(budget: BudgetDefinition): BudgetDraft {
  return {
    categoryId: budget.categoryId ?? null,
    itemLabel: budget.itemLabel ?? '',
    label: budget.label,
    merchantId: budget.merchantId ?? null,
    period: budget.period,
    rollingWindowDaysInput: `${budget.rollingWindowDays ?? 30}`,
    scope: budget.scope,
    startsOnDayInput: `${budget.startsOnDay ?? 1}`,
    targetInput: `${budget.targetMinor / 100}`,
    weekStartsOn: budget.weekStartsOn ?? 1,
  };
}

function buildBudgetDefinitionFromDraft(
  draft: BudgetDraft,
  budgets: BudgetDefinition[],
  categories: CategoryOption[],
  merchants: MerchantRecord[],
  editingBudgetId: string | null,
): BudgetDefinition | null {
  const targetMinor = parseCurrencyInputToMinor(draft.targetInput);

  if (targetMinor === null || targetMinor <= 0) {
    return null;
  }

  const currentTimestamp = new Date().toISOString();
  const existingBudget = editingBudgetId
    ? budgets.find((budget) => budget.id === editingBudgetId) ?? null
    : null;
  const selectedMerchant =
    draft.scope === 'merchant'
      ? merchants.find((merchant) => merchant.id === draft.merchantId) ?? null
      : null;
  const nextBudget: BudgetDefinition = {
    createdAt: existingBudget?.createdAt ?? currentTimestamp,
    id:
      existingBudget?.id ??
      buildBudgetId(
        buildBudgetLabelFromDraft(draft, categories, merchants),
        budgets,
      ),
    label:
      draft.label.trim().length > 0
        ? draft.label.trim()
        : buildBudgetLabelFromDraft(draft, categories, merchants),
    period: draft.period,
    scope: draft.scope,
    targetMinor,
    updatedAt: currentTimestamp,
  };

  if (draft.scope === 'category') {
    if (!draft.categoryId) {
      return null;
    }

    nextBudget.categoryId = draft.categoryId;
  }

  if (draft.scope === 'merchant') {
    if (!selectedMerchant) {
      return null;
    }

    nextBudget.merchantId = selectedMerchant.id;
    nextBudget.merchantLabel = selectedMerchant.label;
    nextBudget.merchantNormalizedLabel = selectedMerchant.normalizedLabel;
  }

  if (draft.scope === 'item') {
    const normalizedItemLabel = draft.itemLabel.trim();

    if (normalizedItemLabel.length === 0) {
      return null;
    }

    nextBudget.itemLabel = normalizedItemLabel;
  }

  if (draft.period === 'weekly') {
    nextBudget.weekStartsOn = draft.weekStartsOn;
  }

  if (draft.period === 'rolling') {
    const rollingWindowDays = Number.parseInt(draft.rollingWindowDaysInput, 10);

    if (!Number.isFinite(rollingWindowDays)) {
      return null;
    }

    nextBudget.rollingWindowDays = rollingWindowDays;
  }

  if (draft.period === 'custom') {
    const startsOnDay = Number.parseInt(draft.startsOnDayInput, 10);

    if (!Number.isFinite(startsOnDay)) {
      return null;
    }

    nextBudget.startsOnDay = startsOnDay;
  }

  return normalizeBudgetDefinitions([nextBudget])[0] ?? null;
}

function buildBudgetLabelFromDraft(
  draft: BudgetDraft,
  categories: CategoryOption[],
  merchants: MerchantRecord[],
): string {
  if (draft.label.trim().length > 0) {
    return draft.label.trim();
  }

  switch (draft.scope) {
    case 'category':
      return `${getCategoryLabel(draft.categoryId ?? 'misc', categories)} budget`;
    case 'merchant':
      return `${
        merchants.find((merchant) => merchant.id === draft.merchantId)?.label ?? 'Merchant'
      } budget`;
    case 'item':
      return `${draft.itemLabel.trim() || 'Item'} budget`;
    case 'overall':
    default:
      return 'Overall budget';
  }
}

function buildBudgetId(label: string, budgets: BudgetDefinition[]): string {
  const baseSlug =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'budget';
  const prefix = `budget_${baseSlug}`;
  const existingIds = new Set(budgets.map((budget) => budget.id));

  if (!existingIds.has(prefix)) {
    return prefix;
  }

  let suffix = 2;

  while (existingIds.has(`${prefix}_${suffix}`)) {
    suffix += 1;
  }

  return `${prefix}_${suffix}`;
}

function formatBudgetScopeLabel(scope: BudgetScope): string {
  switch (scope) {
    case 'category':
      return 'Category';
    case 'merchant':
      return 'Merchant';
    case 'item':
      return 'Item';
    case 'overall':
    default:
      return 'Overall';
  }
}

function formatBudgetPeriodLabel(budget: BudgetDefinition): string {
  switch (budget.period) {
    case 'weekly':
      return `Weekly · ${WEEKDAY_OPTIONS.find((option) => option.id === (budget.weekStartsOn ?? 1))?.label ?? 'Mon'}`;
    case 'rolling':
      return `Rolling · ${budget.rollingWindowDays ?? 30} days`;
    case 'custom':
      return `Custom · day ${budget.startsOnDay ?? 1}`;
    case 'monthly':
    default:
      return 'Monthly';
  }
}

function formatBudgetAlertStatusLabel(status: BudgetThresholdAlert['status']): string {
  switch (status) {
    case 'quieted':
      return 'Queued quietly';
    case 'reviewed':
      return 'Reviewed';
    case 'active':
    default:
      return 'Needs review';
  }
}

function formatHourLabel(hour: number): string {
  if (hour === 0) {
    return '12 AM';
  }

  if (hour === 12) {
    return '12 PM';
  }

  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

function getSourceAppLabel(sourceAppId: SupportedSourceAppId): string {
  return (
    SOURCE_APP_OPTIONS.find((sourceApp) => sourceApp.id === sourceAppId)?.label ??
    'Unsupported app'
  );
}

function formatSourceAppSummary(sourceAppIds: SupportedSourceAppId[]): string {
  if (sourceAppIds.length === 0) {
    return 'None selected';
  }

  return sourceAppIds.map((sourceAppId) => getSourceAppLabel(sourceAppId)).join(', ');
}

function getBudgetCycleLabel(budgetCycleId: BudgetCycleId): string {
  return (
    BUDGET_CYCLE_OPTIONS.find((option) => option.id === budgetCycleId)?.label ??
    'Calendar month'
  );
}

function getBudgetThresholdStateLabel(
  thresholdState: DashboardSummary['budgetThresholdState'],
): string {
  switch (thresholdState) {
    case 'warning':
      return 'Watch closely';
    case 'at_risk':
      return 'At risk';
    case 'over_budget':
      return 'Over budget';
    case 'on_track':
    default:
      return 'On track';
  }
}

function getInsightSectionTopRow(
  sections: InsightSection[],
  dimension: InsightSection['dimension'],
): InsightRow | null {
  return sections.find((section) => section.dimension === dimension)?.rows[0] ?? null;
}

function formatInsightDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const inclusiveEndDate = new Date(endDate.getTime() - 1);

  return `${formatInsightDate(startDate)} to ${formatInsightDate(inclusiveEndDate)}`;
}

function formatInsightDate(date: Date): string {
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabel = monthLabels[date.getMonth()] ?? 'Date';

  return `${monthLabel} ${date.getDate()}`;
}

function formatInsightDelta(deltaMinor: number): string {
  if (deltaMinor === 0) {
    return 'Flat vs prior';
  }

  return `${deltaMinor > 0 ? '+' : '-'}${formatCurrency(Math.abs(deltaMinor))} vs prior`;
}

function formatInsightDeltaCompact(deltaMinor: number): string {
  if (deltaMinor === 0) {
    return 'Flat';
  }

  return `${deltaMinor > 0 ? '+' : '-'}${formatCurrency(Math.abs(deltaMinor))}`;
}

function formatInsightShare(shareRatio: number): string {
  return `${Math.round(shareRatio * 100)}%`;
}

function getInsightTrendLabel(row: InsightRow): string {
  switch (row.trend) {
    case 'up':
      return row.priorAmountMinor === 0 ? 'New this cycle' : 'Up vs prior';
    case 'down':
      return 'Down vs prior';
    case 'flat':
    default:
      return 'Flat vs prior';
  }
}

function getInsightTrendTone(row: InsightRow): 'default' | 'pending' | 'ready' {
  switch (row.trend) {
    case 'up':
      return 'ready';
    case 'down':
      return 'pending';
    case 'flat':
    default:
      return 'default';
  }
}

function formatNativeCaptureMoment(capturedAtMs: number): string {
  return formatCaptureMoment(new Date(capturedAtMs).toISOString());
}

function formatDedupeKindLabel(dedupeKind: 'exact_duplicate' | 'fuzzy_duplicate'): string {
  return dedupeKind === 'exact_duplicate' ? 'Exact duplicate' : 'Fuzzy duplicate';
}

function formatNativeDedupeConfig(captureDiagnostics: NativeCaptureDiagnostics): string {
  return `${captureDiagnostics.dedupeConfig.exactMatchWindowSeconds}s exact · ${captureDiagnostics.dedupeConfig.fuzzyMatchWindowSeconds}s fuzzy · threshold ${captureDiagnostics.dedupeConfig.merchantSimilarityThreshold.toFixed(2)}`;
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

function getCategoryLabel(
  categoryId: CategoryId,
  categories: CategoryOption[],
): string {
  return (
    categories.find((category) => category.id === categoryId)?.label ??
    'Needs category'
  );
}

function getHistoryEventLabel(kind: TransactionHistoryEntry['kind']): string {
  switch (kind) {
    case 'captured':
      return 'Captured';
    case 'category_merged':
      return 'Category merged';
    case 'classified':
      return 'Classified';
    case 'classification_imported':
      return 'Imported state';
    case 'manual_added':
      return 'Manual add';
    case 'merchant_alias_split':
      return 'Alias split';
    case 'merchant_merged':
      return 'Merchant merged';
    case 'note_updated':
      return 'Note updated';
    case 'restored':
      return 'Moved back to review';
    case 'skipped':
      return 'Skipped';
    case 'split_saved':
      return 'Split saved';
    default:
      return 'History event';
  }
}

function formatParserInfo(
  parserInfo: TransactionParserInfo | null,
): { confidence: string | null; label: string; note: string | null; version: string | null } {
  if (!parserInfo) {
    return {
      confidence: null,
      label: 'Not available on this local record',
      note: 'Manual entries and older local records may not carry parser metadata yet.',
      version: null,
    };
  }

  return {
    confidence:
      typeof parserInfo.confidenceBps === 'number'
        ? `${(parserInfo.confidenceBps / 100).toFixed(0)}%`
        : null,
    label: parserInfo.parserId,
    note: null,
    version: parserInfo.parserVersion,
  };
}

function formatMerchantMatchKind(matchKind: 'alias' | 'deterministic'): string {
  return matchKind === 'alias' ? 'Alias match' : 'Deterministic match';
}

function formatMerchantConfidence(confidenceBps: number): string {
  return `${(confidenceBps / 100).toFixed(0)}%`;
}

function getStatusTone(status: Transaction['status']): 'pending' | 'ready' {
  return status === 'classified' ? 'ready' : 'pending';
}

function getSplitRemainderLabel(
  remainderDisposition: SplitRemainderDisposition,
): string {
  return (
    SPLIT_REMAINDER_OPTIONS.find((option) => option.id === remainderDisposition)?.label ??
    'Unknown'
  );
}

function getBootstrapStatusLabel(bootstrapState: BootstrapConfigState): string {
  if (bootstrapState.status === 'loading') {
    return 'Bootstrap refresh queued';
  }

  if (bootstrapState.source === 'network') {
    return 'Fresh from API';
  }

  if (bootstrapState.source === 'cache' && bootstrapState.status === 'fresh') {
    return 'Using cached config';
  }

  if (bootstrapState.source === 'cache') {
    return 'Stale cached config';
  }

  return 'Fallback config active';
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

function hasActiveTimelineFilters(filters: TimelineFilters): boolean {
  return (
    filters.amountFilter !== DEFAULT_TIMELINE_FILTERS.amountFilter ||
    filters.dateFilter !== DEFAULT_TIMELINE_FILTERS.dateFilter ||
    filters.query.trim().length > 0 ||
    filters.sourceApp !== DEFAULT_TIMELINE_FILTERS.sourceApp ||
    filters.statusFilter !== DEFAULT_TIMELINE_FILTERS.statusFilter
  );
}

const styles = StyleSheet.create({
  actionRow: {
    gap: 12,
    marginTop: 8,
  },
  aliasRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  aliasStack: {
    gap: 10,
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
  chipWrap: {
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
  historyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  historyStack: {
    gap: 12,
  },
  historyTimestamp: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 120,
    textAlign: 'right',
  },
  detailItemRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  detailItemStack: {
    gap: 12,
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
  metricCardShell: {
    width: '48%',
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
  ruleToggle: {
    alignItems: 'flex-start',
    backgroundColor: colors.panel,
    borderColor: colors.edgeStrong,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ruleToggleCopy: {
    flex: 1,
    gap: 2,
  },
  ruleToggleIndicator: {
    alignItems: 'center',
    borderColor: colors.edgeStrong,
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    marginTop: 2,
    width: 24,
  },
  ruleToggleIndicatorActive: {
    borderColor: colors.accentStrong,
  },
  ruleToggleIndicatorDot: {
    backgroundColor: colors.accentStrong,
    borderRadius: 999,
    height: 12,
    width: 12,
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
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 31, 24, 0.18)',
    borderRadius: 28,
  },
  sheetCard: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.edge,
    borderRadius: 30,
    borderWidth: 1,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  sheetContent: {
    gap: 16,
    padding: 18,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.edgeStrong,
    borderRadius: 999,
    height: 6,
    marginTop: 12,
    width: 64,
  },
  sheetHeader: {
    gap: 8,
  },
  sheetScene: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
    position: 'relative',
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
  splitRowCard: {
    backgroundColor: colors.panel,
    borderColor: colors.edgeStrong,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  splitRowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  splitRowStack: {
    gap: 16,
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
  suggestionCard: {
    backgroundColor: colors.panel,
    borderColor: colors.edgeStrong,
    borderRadius: 22,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionMeta: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionStack: {
    gap: 10,
  },
  suggestionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
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
  summaryCard: {
    backgroundColor: colors.panel,
    borderColor: colors.edgeStrong,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 16,
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
  timelineGroupStack: {
    gap: 12,
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
