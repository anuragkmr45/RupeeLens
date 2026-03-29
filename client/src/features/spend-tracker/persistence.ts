import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Storage } from 'expo-sqlite/kv-store';

import {
  DEFAULT_BUDGET_ALERT_SETTINGS,
  normalizeBudgetAlertSettings,
  normalizeBudgetDefinitions,
  normalizeBudgetThresholdAlerts,
  normalizeMerchantAliases,
  normalizeMerchants,
  normalizeCategories,
  normalizeSpendRules,
  reconcileMerchantState,
  sortTransactionsByCapturedAtDesc,
  type BudgetAlertSettings,
  type BudgetDefinition,
  type BudgetThresholdAlert,
  type CategoryId,
  type CategoryOption,
  type MerchantAliasRecord,
  type MerchantRecord,
  type SpendRule,
  type Transaction,
  type TransactionHistoryEntry,
  type TransactionParserInfo,
  type MerchantMatchKind,
} from './domain';
import { applyMobileMigrations } from './db/migration-runner';

export type NotificationAccessState = 'not_started' | 'settings_opened';
export type SupportedSourceAppId =
  | 'bhim'
  | 'google_pay'
  | 'paytm'
  | 'phonepe';
export type BudgetCycleId =
  | 'billing_cycle'
  | 'calendar_month'
  | 'salary_cycle';
export type SyncMode = 'local_only' | 'sync_later';

export interface OnboardingPreferences {
  budgetCycleId: BudgetCycleId;
  selectedSourceAppIds: SupportedSourceAppId[];
  syncMode: SyncMode;
}

export interface PersistedSpendTrackerState {
  budgetAlertSettings?: BudgetAlertSettings;
  budgetAlerts?: BudgetThresholdAlert[];
  budgets?: BudgetDefinition[];
  categories: CategoryOption[];
  merchantAliases?: MerchantAliasRecord[];
  merchants?: MerchantRecord[];
  onboardingPreferences: OnboardingPreferences;
  notificationAccessState: NotificationAccessState;
  onboardingCompleted: boolean;
  privacyModeEnabled?: boolean;
  rules?: SpendRule[];
  transactions: Transaction[];
}

interface SettingRow {
  key: string;
  value: string;
}

interface CategoryRow {
  description: string;
  id: string;
  isDefault: number;
  label: string;
}

interface MerchantRow {
  id: string;
  label: string;
  normalizedLabel: string;
}

interface MerchantAliasRow {
  alias: string;
  confidenceBps: number;
  id: string;
  merchantId: string;
  normalizedAlias: string;
  source: string;
}

interface ClassificationRuleRow {
  amountBucket: string;
  autoApply: number;
  categoryId: string;
  createdAt: string;
  hourBucket: string;
  id: string;
  itemLabel: string;
  merchantId: string | null;
  merchantLabel: string;
  merchantNormalizedLabel: string;
  updatedAt: string;
  weekday: string;
}

interface BudgetRow {
  categoryId: string | null;
  createdAt: string;
  id: string;
  itemLabel: string | null;
  label: string;
  merchantId: string | null;
  merchantLabel: string | null;
  merchantNormalizedLabel: string | null;
  period: string;
  rollingWindowDays: number | null;
  scope: string;
  startsOnDay: number | null;
  targetMinor: number;
  updatedAt: string;
  weekStartsOn: number | null;
}

interface BudgetAlertRow {
  budgetId: string;
  budgetLabel: string;
  cycleEnd: string;
  cycleStart: string;
  deliveredAt: string;
  id: string;
  message: string;
  reviewedAt: string | null;
  spentMinor: number;
  status: string;
  targetMinor: number;
  thresholdPercent: number;
  thresholdState: string;
}

interface TransactionRow {
  amountMinor: number;
  capturedAt: string;
  id: string;
  merchant: string;
  merchantRaw: string | null;
  note: string | null;
  parserConfidenceBps: number | null;
  parserId: string | null;
  parserVersion: string | null;
  sourceApp: string;
  status: string;
}

interface TransactionItemRow {
  amountMinor: number;
  categoryId: string;
  id: string;
  label: string;
  sortOrder: number;
  transactionId: string;
}

interface TransactionHistoryRow {
  at: string;
  id: string;
  kind: string;
  sortOrder: number;
  summary: string;
  transactionId: string;
}

const DATABASE_NAME = 'spend-tracker.db';
const LEGACY_STORAGE_KEY = 'spend_tracker_demo_state_v1';
export const DEFAULT_ONBOARDING_PREFERENCES: OnboardingPreferences = {
  budgetCycleId: 'calendar_month',
  selectedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
  syncMode: 'local_only',
};
export const DEFAULT_PRIVACY_MODE_ENABLED = false;

let databasePromise: Promise<SQLiteDatabase> | null = null;
let schemaPromise: Promise<void> | null = null;

export async function clearStoredSpendTrackerState(): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM budget_threshold_alerts');
    await database.runAsync('DELETE FROM budgets');
    await database.runAsync('DELETE FROM transaction_history');
    await database.runAsync('DELETE FROM transaction_items');
    await database.runAsync('DELETE FROM transactions');
    await database.runAsync('DELETE FROM classification_rules');
    await database.runAsync('DELETE FROM merchant_aliases');
    await database.runAsync('DELETE FROM merchants');
    await database.runAsync('DELETE FROM categories');
    await database.runAsync('DELETE FROM settings');
  });

  await Storage.removeItem(LEGACY_STORAGE_KEY);
}

export async function loadStoredSpendTrackerState(): Promise<PersistedSpendTrackerState | null> {
  const database = await getDatabase();

  if (await hasStoredState(database)) {
    return readStateFromDatabase(database);
  }

  const legacyState = await readLegacyState();

  if (!legacyState) {
    return null;
  }

  await writeStateToDatabase(database, legacyState);
  await Storage.removeItem(LEGACY_STORAGE_KEY);

  return legacyState;
}

export async function saveStoredSpendTrackerState(
  state: PersistedSpendTrackerState,
): Promise<void> {
  const database = await getDatabase();
  await writeStateToDatabase(database, state);
}

async function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME);
  }

  const database = await databasePromise;

  if (!schemaPromise) {
    const schemaTask = applyMobileMigrations(database);
    schemaPromise = schemaTask.catch((error: unknown) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
  return database;
}

async function hasStoredState(database: SQLiteDatabase): Promise<boolean> {
  const budgetCountRow = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM budgets',
  );
  const budgetAlertCountRow = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM budget_threshold_alerts',
  );
  const transactionCountRow = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions',
  );
  const merchantCountRow = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM merchants',
  );
  const merchantAliasCountRow = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM merchant_aliases',
  );
  const ruleCountRow = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM classification_rules',
  );
  const categoryCountRow = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories',
  );
  const settingsCountRow = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM settings',
  );

  return (
    (budgetCountRow?.count ?? 0) > 0 ||
    (budgetAlertCountRow?.count ?? 0) > 0 ||
    (transactionCountRow?.count ?? 0) > 0 ||
    (merchantCountRow?.count ?? 0) > 0 ||
    (merchantAliasCountRow?.count ?? 0) > 0 ||
    (ruleCountRow?.count ?? 0) > 0 ||
    (categoryCountRow?.count ?? 0) > 0 ||
    (settingsCountRow?.count ?? 0) > 0
  );
}

async function writeStateToDatabase(
  database: SQLiteDatabase,
  state: PersistedSpendTrackerState,
): Promise<void> {
  const merchantDirectory = reconcileMerchantState(
    state.transactions,
    state.merchants,
    state.merchantAliases,
  );
  const normalizedBudgets = normalizeBudgetDefinitions(state.budgets);
  const normalizedBudgetAlerts = normalizeBudgetThresholdAlerts(state.budgetAlerts);
  const normalizedBudgetAlertSettings = normalizeBudgetAlertSettings(
    state.budgetAlertSettings,
  );
  const normalizedRules = normalizeSpendRules(state.rules);

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM budget_threshold_alerts');
    await database.runAsync('DELETE FROM budgets');
    await database.runAsync('DELETE FROM transaction_history');
    await database.runAsync('DELETE FROM transaction_items');
    await database.runAsync('DELETE FROM transactions');
    await database.runAsync('DELETE FROM classification_rules');
    await database.runAsync('DELETE FROM merchant_aliases');
    await database.runAsync('DELETE FROM merchants');
    await database.runAsync('DELETE FROM categories');
    await database.runAsync('DELETE FROM settings');

    for (const category of normalizeCategories(state.categories)) {
      await database.runAsync(
        `
          INSERT INTO categories (
            id,
            label,
            description,
            is_default
          ) VALUES (?, ?, ?, ?)
        `,
        category.id,
        category.label,
        category.description,
        category.isDefault ? 1 : 0,
      );
    }

    await database.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'notification_access_state',
      state.notificationAccessState,
    );
    await database.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'selected_source_app_ids',
      JSON.stringify(state.onboardingPreferences.selectedSourceAppIds),
    );
    await database.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'budget_cycle_id',
      state.onboardingPreferences.budgetCycleId,
    );
    await database.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'sync_mode',
      state.onboardingPreferences.syncMode,
    );
    await database.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'onboarding_completed',
      state.onboardingCompleted ? 'true' : 'false',
    );
    await database.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'privacy_mode_enabled',
      state.privacyModeEnabled ? 'true' : 'false',
    );
    await database.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'budget_alert_quiet_mode_enabled',
      normalizedBudgetAlertSettings.quietModeEnabled ? 'true' : 'false',
    );
    await database.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'budget_alert_quiet_hours_start_hour',
      normalizedBudgetAlertSettings.quietHoursStartHour.toString(),
    );
    await database.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'budget_alert_quiet_hours_end_hour',
      normalizedBudgetAlertSettings.quietHoursEndHour.toString(),
    );

    for (const budget of normalizedBudgets) {
      await database.runAsync(
        `
          INSERT INTO budgets (
            id,
            label,
            scope,
            period,
            target_minor,
            category_id,
            merchant_id,
            merchant_label,
            merchant_normalized_label,
            item_label,
            starts_on_day,
            week_starts_on,
            rolling_window_days,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        budget.id,
        budget.label,
        budget.scope,
        budget.period,
        budget.targetMinor,
        budget.categoryId ?? null,
        budget.merchantId ?? null,
        budget.merchantLabel ?? null,
        budget.merchantNormalizedLabel ?? null,
        budget.itemLabel ?? null,
        budget.startsOnDay ?? null,
        budget.weekStartsOn ?? null,
        budget.rollingWindowDays ?? null,
        budget.createdAt,
        budget.updatedAt,
      );
    }

    for (const budgetAlert of normalizedBudgetAlerts) {
      await database.runAsync(
        `
          INSERT INTO budget_threshold_alerts (
            id,
            budget_id,
            budget_label,
            threshold_percent,
            threshold_state,
            spent_minor,
            target_minor,
            cycle_start,
            cycle_end,
            delivered_at,
            reviewed_at,
            status,
            message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        budgetAlert.id,
        budgetAlert.budgetId,
        budgetAlert.budgetLabel,
        budgetAlert.thresholdPercent,
        budgetAlert.thresholdState,
        budgetAlert.spentMinor,
        budgetAlert.targetMinor,
        budgetAlert.cycleStart,
        budgetAlert.cycleEnd,
        budgetAlert.deliveredAt,
        budgetAlert.reviewedAt ?? null,
        budgetAlert.status,
        budgetAlert.message,
      );
    }

    for (const rule of normalizedRules) {
      await database.runAsync(
        `
          INSERT INTO classification_rules (
            id,
            merchant_id,
            merchant_label,
            merchant_normalized_label,
            amount_bucket,
            hour_bucket,
            weekday,
            category_id,
            item_label,
            auto_apply,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        rule.id,
        rule.merchantId,
        rule.merchantLabel,
        rule.merchantNormalizedLabel,
        rule.amountBucket,
        rule.hourBucket,
        rule.weekday,
        rule.categoryId,
        rule.itemLabel,
        rule.autoApply ? 1 : 0,
        rule.createdAt,
        rule.updatedAt,
      );
    }

    for (const merchant of merchantDirectory.merchants) {
      await database.runAsync(
        `
          INSERT INTO merchants (
            id,
            label,
            normalized_label
          ) VALUES (?, ?, ?)
        `,
        merchant.id,
        merchant.label,
        merchant.normalizedLabel,
      );
    }

    for (const merchantAlias of merchantDirectory.merchantAliases) {
      await database.runAsync(
        `
          INSERT INTO merchant_aliases (
            id,
            merchant_id,
            alias,
            normalized_alias,
            confidence_bps,
            source
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        merchantAlias.id,
        merchantAlias.merchantId,
        merchantAlias.alias,
        merchantAlias.normalizedAlias,
        merchantAlias.confidenceBps,
        merchantAlias.source,
      );
    }

    for (const transaction of merchantDirectory.transactions) {
      await database.runAsync(
        `
          INSERT INTO transactions (
            id,
            amount_minor,
            captured_at,
            merchant,
            merchant_raw,
            source_app,
            status,
            note,
            parser_id,
            parser_version,
            parser_confidence_bps
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        transaction.id,
        transaction.amountMinor,
        transaction.capturedAt,
        transaction.merchant,
        transaction.merchantRaw ?? transaction.merchant,
        transaction.sourceApp,
        transaction.status,
        transaction.note ?? '',
        transaction.parserInfo?.parserId ?? null,
        transaction.parserInfo?.parserVersion ?? null,
        transaction.parserInfo?.confidenceBps ?? null,
      );

      for (const [index, item] of transaction.items.entries()) {
        await database.runAsync(
          `
            INSERT INTO transaction_items (
              id,
              transaction_id,
              amount_minor,
              category_id,
              label,
              sort_order
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
          item.id,
          transaction.id,
          item.amountMinor,
          item.categoryId,
          item.label,
          index,
        );
      }

      for (const [index, historyEntry] of normalizeTransactionHistory(transaction).entries()) {
        await database.runAsync(
          `
            INSERT INTO transaction_history (
              id,
              transaction_id,
              event_at,
              event_kind,
              summary,
              sort_order
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
          historyEntry.id,
          transaction.id,
          historyEntry.at,
          historyEntry.kind,
          historyEntry.summary,
          index,
        );
      }
    }
  });
}

async function readStateFromDatabase(
  database: SQLiteDatabase,
): Promise<PersistedSpendTrackerState> {
  const [
    settingRows,
    categoryRows,
    budgetRows,
    budgetAlertRows,
    merchantRows,
    merchantAliasRows,
    ruleRows,
    transactionRows,
    itemRows,
    historyRows,
  ] = await Promise.all([
    database.getAllAsync<SettingRow>('SELECT key, value FROM settings'),
    database.getAllAsync<CategoryRow>(
      `
        SELECT
          id,
          label,
          description,
          is_default as isDefault
        FROM categories
        ORDER BY is_default DESC, label ASC, id ASC
      `,
    ),
    database.getAllAsync<BudgetRow>(
      `
        SELECT
          id,
          label,
          scope,
          period,
          target_minor as targetMinor,
          category_id as categoryId,
          merchant_id as merchantId,
          merchant_label as merchantLabel,
          merchant_normalized_label as merchantNormalizedLabel,
          item_label as itemLabel,
          starts_on_day as startsOnDay,
          week_starts_on as weekStartsOn,
          rolling_window_days as rollingWindowDays,
          created_at as createdAt,
          updated_at as updatedAt
        FROM budgets
        ORDER BY datetime(updated_at) DESC, id ASC
      `,
    ),
    database.getAllAsync<BudgetAlertRow>(
      `
        SELECT
          id,
          budget_id as budgetId,
          budget_label as budgetLabel,
          threshold_percent as thresholdPercent,
          threshold_state as thresholdState,
          spent_minor as spentMinor,
          target_minor as targetMinor,
          cycle_start as cycleStart,
          cycle_end as cycleEnd,
          delivered_at as deliveredAt,
          reviewed_at as reviewedAt,
          status,
          message
        FROM budget_threshold_alerts
        ORDER BY datetime(delivered_at) DESC, id ASC
      `,
    ),
    database.getAllAsync<MerchantRow>(
      `
        SELECT
          id,
          label,
          normalized_label as normalizedLabel
        FROM merchants
        ORDER BY label ASC, id ASC
      `,
    ),
    database.getAllAsync<MerchantAliasRow>(
      `
        SELECT
          id,
          merchant_id as merchantId,
          alias,
          normalized_alias as normalizedAlias,
          confidence_bps as confidenceBps,
          source
        FROM merchant_aliases
        ORDER BY alias ASC, id ASC
      `,
    ),
    database.getAllAsync<ClassificationRuleRow>(
      `
        SELECT
          id,
          merchant_id as merchantId,
          merchant_label as merchantLabel,
          merchant_normalized_label as merchantNormalizedLabel,
          amount_bucket as amountBucket,
          hour_bucket as hourBucket,
          weekday,
          category_id as categoryId,
          item_label as itemLabel,
          auto_apply as autoApply,
          created_at as createdAt,
          updated_at as updatedAt
        FROM classification_rules
        ORDER BY datetime(updated_at) DESC, id ASC
      `,
    ),
    database.getAllAsync<TransactionRow>(
      `
        SELECT
          id,
          amount_minor as amountMinor,
          captured_at as capturedAt,
          merchant,
          merchant_raw as merchantRaw,
          note,
          parser_id as parserId,
          parser_version as parserVersion,
          parser_confidence_bps as parserConfidenceBps,
          source_app as sourceApp,
          status
        FROM transactions
        ORDER BY datetime(captured_at) DESC, id DESC
      `,
    ),
    database.getAllAsync<TransactionItemRow>(
      `
        SELECT
          id,
          transaction_id as transactionId,
          amount_minor as amountMinor,
          category_id as categoryId,
          label,
          sort_order as sortOrder
        FROM transaction_items
        ORDER BY transaction_id ASC, sort_order ASC, id ASC
      `,
    ),
    database.getAllAsync<TransactionHistoryRow>(
      `
        SELECT
          id,
          transaction_id as transactionId,
          event_at as at,
          event_kind as kind,
          summary,
          sort_order as sortOrder
        FROM transaction_history
        ORDER BY transaction_id ASC, sort_order ASC, event_at ASC, id ASC
      `,
    ),
  ]);

  const settings = new Map(settingRows.map((row) => [row.key, row.value]));
  const storedNotificationAccessState = settings.get('notification_access_state');
  const storedSourceAppIds = parseSourceAppIds(settings.get('selected_source_app_ids'));
  const storedBudgetCycleId = settings.get('budget_cycle_id');
  const storedBudgetAlertQuietModeEnabled = settings.get('budget_alert_quiet_mode_enabled');
  const storedBudgetAlertQuietHoursStart = settings.get('budget_alert_quiet_hours_start_hour');
  const storedBudgetAlertQuietHoursEnd = settings.get('budget_alert_quiet_hours_end_hour');
  const storedPrivacyModeEnabled = settings.get('privacy_mode_enabled');
  const storedSyncMode = settings.get('sync_mode');
  const budgets = normalizeBudgetDefinitions(
    budgetRows.map((row) => ({
      categoryId: row.categoryId,
      createdAt: row.createdAt,
      id: row.id,
      itemLabel: row.itemLabel,
      label: row.label,
      merchantId: row.merchantId,
      merchantLabel: row.merchantLabel,
      merchantNormalizedLabel: row.merchantNormalizedLabel,
      period: row.period as BudgetDefinition['period'],
      rollingWindowDays: row.rollingWindowDays,
      scope: row.scope as BudgetDefinition['scope'],
      startsOnDay: row.startsOnDay,
      targetMinor: row.targetMinor,
      updatedAt: row.updatedAt,
      weekStartsOn: row.weekStartsOn,
    })),
  );
  const budgetAlerts = normalizeBudgetThresholdAlerts(
    budgetAlertRows.map((row) => ({
      budgetId: row.budgetId,
      budgetLabel: row.budgetLabel,
      cycleEnd: row.cycleEnd,
      cycleStart: row.cycleStart,
      deliveredAt: row.deliveredAt,
      id: row.id,
      message: row.message,
      reviewedAt: row.reviewedAt,
      spentMinor: row.spentMinor,
      status: row.status as BudgetThresholdAlert['status'],
      targetMinor: row.targetMinor,
      thresholdPercent: row.thresholdPercent as BudgetThresholdAlert['thresholdPercent'],
      thresholdState: row.thresholdState as BudgetThresholdAlert['thresholdState'],
    })),
  );
  const categories = normalizeCategories(
    categoryRows.map((row) => ({
      description: row.description,
      id: row.id,
      isDefault: row.isDefault === 1,
      label: row.label,
    })),
  );
  const validCategoryIds = new Set(categories.map((category) => category.id));
  const itemsByTransactionId = new Map<string, Transaction['items']>();
  const historyByTransactionId = new Map<string, TransactionHistoryEntry[]>();

  for (const row of itemRows) {
    if (!isCategoryId(row.categoryId)) {
      continue;
    }

    const currentItems = itemsByTransactionId.get(row.transactionId) ?? [];
    currentItems.push({
      amountMinor: row.amountMinor,
      categoryId: row.categoryId,
      id: row.id,
      label: row.label,
    });
    itemsByTransactionId.set(row.transactionId, currentItems);
  }

  for (const row of historyRows) {
    if (!isTransactionHistoryKind(row.kind)) {
      continue;
    }

    const currentHistory = historyByTransactionId.get(row.transactionId) ?? [];
    currentHistory.push({
      at: row.at,
      id: row.id,
      kind: row.kind,
      summary: row.summary,
    });
    historyByTransactionId.set(row.transactionId, currentHistory);
  }

  const rawTransactions = sortTransactionsByCapturedAtDesc(
    transactionRows
      .filter((row) => isTransactionStatus(row.status))
      .map((row) => ({
        amountMinor: row.amountMinor,
        capturedAt: row.capturedAt,
        history:
          historyByTransactionId.get(row.id) ??
          buildFallbackHistory({
            capturedAt: row.capturedAt,
            id: row.id,
            items: itemsByTransactionId.get(row.id) ?? [],
            merchant: row.merchant,
            sourceApp: row.sourceApp,
            status: row.status as Transaction['status'],
        }),
        id: row.id,
        items: itemsByTransactionId.get(row.id) ?? [],
        merchant: row.merchant,
        merchantRaw: row.merchantRaw ?? row.merchant,
        note: row.note ?? '',
        parserInfo: normalizeTransactionParserInfo(row),
        sourceApp: row.sourceApp,
        status: row.status as Transaction['status'],
      })),
  );
  const merchantDirectory = reconcileMerchantState(
    rawTransactions,
    normalizeMerchants(
      merchantRows.map((row) => ({
        id: row.id,
        label: row.label,
        normalizedLabel: row.normalizedLabel,
      })),
    ),
    normalizeMerchantAliases(
      merchantAliasRows.map((row) => ({
        alias: row.alias,
        confidenceBps: row.confidenceBps,
        id: row.id,
        merchantId: row.merchantId,
        normalizedAlias: row.normalizedAlias,
        source: row.source === 'merged' ? 'merged' : 'manual',
      })),
      normalizeMerchants(
        merchantRows.map((row) => ({
          id: row.id,
          label: row.label,
          normalizedLabel: row.normalizedLabel,
        })),
      ),
    ),
  );
  const rules = normalizeSpendRules(
    ruleRows.map((row) => ({
      amountBucket: row.amountBucket as SpendRule['amountBucket'],
      autoApply: row.autoApply === 1,
      categoryId: row.categoryId,
      createdAt: row.createdAt,
      hourBucket: row.hourBucket as SpendRule['hourBucket'],
      id: row.id,
      itemLabel: row.itemLabel,
      merchantId: row.merchantId,
      merchantLabel: row.merchantLabel,
      merchantNormalizedLabel: row.merchantNormalizedLabel,
      updatedAt: row.updatedAt,
      weekday: row.weekday as SpendRule['weekday'],
    })),
  ).filter((rule) => validCategoryIds.has(rule.categoryId));

  return {
    budgetAlertSettings: normalizeBudgetAlertSettings({
      quietHoursEndHour:
        storedBudgetAlertQuietHoursEnd !== undefined
          ? Number.parseInt(storedBudgetAlertQuietHoursEnd, 10)
          : DEFAULT_BUDGET_ALERT_SETTINGS.quietHoursEndHour,
      quietHoursStartHour:
        storedBudgetAlertQuietHoursStart !== undefined
          ? Number.parseInt(storedBudgetAlertQuietHoursStart, 10)
          : DEFAULT_BUDGET_ALERT_SETTINGS.quietHoursStartHour,
      quietModeEnabled: storedBudgetAlertQuietModeEnabled !== 'false',
    }),
    budgetAlerts,
    budgets,
    categories,
    merchantAliases: merchantDirectory.merchantAliases,
    merchants: merchantDirectory.merchants,
    onboardingPreferences: {
      budgetCycleId: isBudgetCycleId(storedBudgetCycleId)
        ? storedBudgetCycleId
        : DEFAULT_ONBOARDING_PREFERENCES.budgetCycleId,
      selectedSourceAppIds:
        storedSourceAppIds !== null
          ? storedSourceAppIds
          : DEFAULT_ONBOARDING_PREFERENCES.selectedSourceAppIds,
      syncMode: isSyncMode(storedSyncMode)
        ? storedSyncMode
        : DEFAULT_ONBOARDING_PREFERENCES.syncMode,
    },
    notificationAccessState: isNotificationAccessState(storedNotificationAccessState)
      ? storedNotificationAccessState
      : 'not_started',
    onboardingCompleted: settings.get('onboarding_completed') === 'true',
    privacyModeEnabled: storedPrivacyModeEnabled === 'true',
    rules,
    transactions: merchantDirectory.transactions,
  };
}

async function readLegacyState(): Promise<PersistedSpendTrackerState | null> {
  try {
    const storedValue = await Storage.getItem(LEGACY_STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!isPersistedSpendTrackerState(parsedValue)) {
      return null;
    }

    const candidate = parsedValue as Partial<PersistedSpendTrackerState>;
    const normalizedCategories = normalizeCategories(
      isCategoryList((candidate as { categories?: unknown }).categories)
        ? (candidate as { categories?: CategoryOption[] }).categories
        : undefined,
    );
    const merchantDirectory = reconcileMerchantState(
      candidate.transactions as Transaction[],
      isMerchantList((candidate as { merchants?: unknown }).merchants)
        ? (candidate as { merchants?: MerchantRecord[] }).merchants
        : undefined,
      isMerchantAliasList((candidate as { merchantAliases?: unknown }).merchantAliases)
        ? (candidate as { merchantAliases?: MerchantAliasRecord[] }).merchantAliases
        : undefined,
    );

    return {
      budgetAlertSettings: { ...DEFAULT_BUDGET_ALERT_SETTINGS },
      budgetAlerts: [],
      budgets: [],
      categories: normalizedCategories,
      merchantAliases: merchantDirectory.merchantAliases,
      merchants: merchantDirectory.merchants,
      onboardingPreferences: normalizeOnboardingPreferences(
        candidate.onboardingPreferences,
      ),
      notificationAccessState: candidate.notificationAccessState as NotificationAccessState,
      onboardingCompleted: candidate.onboardingCompleted as boolean,
      privacyModeEnabled:
        typeof candidate.privacyModeEnabled === 'boolean'
          ? candidate.privacyModeEnabled
          : DEFAULT_PRIVACY_MODE_ENABLED,
      rules:
        (candidate as { rules?: unknown }).rules !== undefined &&
        isSpendRuleList((candidate as { rules?: unknown }).rules)
          ? normalizeSpendRules((candidate as { rules?: SpendRule[] }).rules).filter((rule) =>
              normalizedCategories.some((category) => category.id === rule.categoryId),
            )
          : [],
      transactions: merchantDirectory.transactions,
    };
  } catch {
    return null;
  }
}

function isPersistedSpendTrackerState(
  value: unknown,
): value is PersistedSpendTrackerState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PersistedSpendTrackerState>;

  return (
    (candidate.budgetAlertSettings === undefined ||
      isBudgetAlertSettings(candidate.budgetAlertSettings)) &&
    (candidate.budgetAlerts === undefined || Array.isArray(candidate.budgetAlerts)) &&
    (candidate.budgets === undefined || Array.isArray(candidate.budgets)) &&
    (candidate.categories === undefined || isCategoryList(candidate.categories)) &&
    (candidate.merchants === undefined || isMerchantList(candidate.merchants)) &&
    (candidate.merchantAliases === undefined || isMerchantAliasList(candidate.merchantAliases)) &&
    (candidate.rules === undefined || isSpendRuleList(candidate.rules)) &&
    typeof candidate.onboardingCompleted === 'boolean' &&
    isNotificationAccessState(candidate.notificationAccessState) &&
    (candidate.privacyModeEnabled === undefined ||
      typeof candidate.privacyModeEnabled === 'boolean') &&
    (candidate.onboardingPreferences === undefined ||
      isOnboardingPreferences(candidate.onboardingPreferences)) &&
    isTransactionList(candidate.transactions)
  );
}

function isOnboardingPreferences(
  value: unknown,
): value is OnboardingPreferences {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<OnboardingPreferences>;

  return (
    isBudgetCycleId(candidate.budgetCycleId) &&
    isSyncMode(candidate.syncMode) &&
    Array.isArray(candidate.selectedSourceAppIds) &&
    candidate.selectedSourceAppIds.every((sourceAppId) => isSupportedSourceAppId(sourceAppId))
  );
}

function isBudgetAlertSettings(value: unknown): value is BudgetAlertSettings {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BudgetAlertSettings>;

  return (
    typeof candidate.quietModeEnabled === 'boolean' &&
    typeof candidate.quietHoursStartHour === 'number' &&
    typeof candidate.quietHoursEndHour === 'number'
  );
}

function isNotificationAccessState(
  value: unknown,
): value is NotificationAccessState {
  return value === 'not_started' || value === 'settings_opened';
}

function isSupportedSourceAppId(
  value: unknown,
): value is SupportedSourceAppId {
  return (
    value === 'bhim' ||
    value === 'google_pay' ||
    value === 'paytm' ||
    value === 'phonepe'
  );
}

function isBudgetCycleId(value: unknown): value is BudgetCycleId {
  return (
    value === 'billing_cycle' ||
    value === 'calendar_month' ||
    value === 'salary_cycle'
  );
}

function isSyncMode(value: unknown): value is SyncMode {
  return value === 'local_only' || value === 'sync_later';
}

function normalizeOnboardingPreferences(
  value: unknown,
): OnboardingPreferences {
  if (!isOnboardingPreferences(value)) {
    return { ...DEFAULT_ONBOARDING_PREFERENCES };
  }

  return {
    budgetCycleId: value.budgetCycleId,
    selectedSourceAppIds: [...value.selectedSourceAppIds],
    syncMode: value.syncMode,
  };
}

function parseSourceAppIds(
  value: string | undefined,
): SupportedSourceAppId[] | null {
  if (value === undefined) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return null;
    }

    return parsedValue.filter((sourceAppId): sourceAppId is SupportedSourceAppId =>
      isSupportedSourceAppId(sourceAppId),
    );
  } catch {
    return null;
  }
}

function normalizeTransactionParserInfo(
  row: Pick<TransactionRow, 'parserConfidenceBps' | 'parserId' | 'parserVersion' | 'sourceApp'>,
): TransactionParserInfo | null {
  if (row.parserId && row.parserVersion) {
    return {
      confidenceBps:
        typeof row.parserConfidenceBps === 'number' ? row.parserConfidenceBps : null,
      parserId: row.parserId,
      parserVersion: row.parserVersion,
    };
  }

  return inferParserInfoFromSourceApp(row.sourceApp);
}

function inferParserInfoFromSourceApp(sourceApp: string): TransactionParserInfo | null {
  switch (sourceApp) {
    case 'Google Pay':
      return {
        confidenceBps: 9800,
        parserId: 'gpay_upi_v1',
        parserVersion: '1.0.0',
      };
    case 'PhonePe':
      return {
        confidenceBps: 9700,
        parserId: 'phonepe_upi_v1',
        parserVersion: '1.0.0',
      };
    case 'Paytm':
      return {
        confidenceBps: 9650,
        parserId: 'paytm_upi_v1',
        parserVersion: '1.0.0',
      };
    default:
      return null;
  }
}

function normalizeTransactionHistory(transaction: Transaction): TransactionHistoryEntry[] {
  return transaction.history ?? buildFallbackHistory(transaction);
}

function buildFallbackHistory(
  transaction: Pick<Transaction, 'capturedAt' | 'id' | 'items' | 'merchant' | 'sourceApp' | 'status'>,
): TransactionHistoryEntry[] {
  const baseHistory: TransactionHistoryEntry[] = [
    {
      at: transaction.capturedAt,
      id: `${transaction.id}_history_source`,
      kind: transaction.sourceApp === 'Manual entry' ? 'manual_added' : 'captured',
      summary:
        transaction.sourceApp === 'Manual entry'
          ? `Manual spend stored for ${transaction.merchant}.`
          : `${transaction.sourceApp} capture stored for ${transaction.merchant}.`,
    },
  ];

  if (transaction.status === 'classified') {
    baseHistory.push({
      at: transaction.capturedAt,
      id: `${transaction.id}_history_classified_imported`,
      kind: 'classification_imported',
      summary: 'Imported an existing classified state into local history.',
    });
  } else if (transaction.status === 'partially_classified') {
    baseHistory.push({
      at: transaction.capturedAt,
      id: `${transaction.id}_history_partial_imported`,
      kind: 'classification_imported',
      summary: 'Imported an existing partial split state into local history.',
    });
  } else if (transaction.status === 'skipped') {
    baseHistory.push({
      at: transaction.capturedAt,
      id: `${transaction.id}_history_skipped_imported`,
      kind: 'skipped',
      summary: 'Imported an existing skipped state into local history.',
    });
  }

  return baseHistory;
}

function isTransactionList(value: unknown): value is Transaction[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((transaction) => {
    if (!transaction || typeof transaction !== 'object') {
      return false;
    }

    const candidate = transaction as Partial<Transaction>;

    return (
      typeof candidate.id === 'string' &&
      typeof candidate.amountMinor === 'number' &&
      typeof candidate.capturedAt === 'string' &&
      typeof candidate.merchant === 'string' &&
      (candidate.merchantRaw === undefined || typeof candidate.merchantRaw === 'string') &&
      (candidate.merchantId === undefined ||
        candidate.merchantId === null ||
        typeof candidate.merchantId === 'string') &&
      (candidate.merchantMatchKind === undefined ||
        candidate.merchantMatchKind === null ||
        isMerchantMatchKind(candidate.merchantMatchKind)) &&
      (candidate.merchantConfidenceBps === undefined ||
        candidate.merchantConfidenceBps === null ||
        typeof candidate.merchantConfidenceBps === 'number') &&
      typeof candidate.sourceApp === 'string' &&
      isTransactionStatus(candidate.status) &&
      (candidate.note === undefined || typeof candidate.note === 'string') &&
      (candidate.history === undefined ||
        (Array.isArray(candidate.history) &&
          candidate.history.every((historyEntry) => isTransactionHistoryEntry(historyEntry)))) &&
      Array.isArray(candidate.items) &&
      candidate.items.every((item) => isTransactionItem(item))
    );
  });
}

function isTransactionItem(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    amountMinor?: unknown;
    categoryId?: unknown;
    id?: unknown;
    label?: unknown;
  };

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.amountMinor === 'number' &&
    isCategoryId(candidate.categoryId)
  );
}

function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTransactionStatus(
  value: unknown,
): value is Transaction['status'] {
  return (
    value === 'classified' ||
    value === 'partially_classified' ||
    value === 'skipped' ||
    value === 'uncategorized'
  );
}

function isTransactionHistoryEntry(value: unknown): value is TransactionHistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<TransactionHistoryEntry>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.at === 'string' &&
    typeof candidate.summary === 'string' &&
    isTransactionHistoryKind(candidate.kind)
  );
}

function isTransactionHistoryKind(
  value: unknown,
): value is TransactionHistoryEntry['kind'] {
  return (
    value === 'captured' ||
    value === 'category_merged' ||
    value === 'classified' ||
    value === 'classification_imported' ||
    value === 'manual_added' ||
    value === 'merchant_alias_split' ||
    value === 'merchant_merged' ||
    value === 'note_updated' ||
    value === 'restored' ||
    value === 'skipped' ||
    value === 'split_saved'
  );
}

function isMerchantMatchKind(value: unknown): value is MerchantMatchKind {
  return value === 'alias' || value === 'deterministic';
}

function isMerchantList(value: unknown): value is MerchantRecord[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((merchant) => {
    if (!merchant || typeof merchant !== 'object') {
      return false;
    }

    const candidate = merchant as Partial<MerchantRecord>;

    return (
      typeof candidate.id === 'string' &&
      candidate.id.trim().length > 0 &&
      typeof candidate.label === 'string' &&
      candidate.label.trim().length > 0 &&
      typeof candidate.normalizedLabel === 'string' &&
      candidate.normalizedLabel.trim().length > 0
    );
  });
}

function isMerchantAliasList(value: unknown): value is MerchantAliasRecord[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((merchantAlias) => {
    if (!merchantAlias || typeof merchantAlias !== 'object') {
      return false;
    }

    const candidate = merchantAlias as Partial<MerchantAliasRecord>;

    return (
      typeof candidate.id === 'string' &&
      candidate.id.trim().length > 0 &&
      typeof candidate.alias === 'string' &&
      candidate.alias.trim().length > 0 &&
      typeof candidate.normalizedAlias === 'string' &&
      candidate.normalizedAlias.trim().length > 0 &&
      typeof candidate.merchantId === 'string' &&
      candidate.merchantId.trim().length > 0 &&
      typeof candidate.confidenceBps === 'number' &&
      (candidate.source === 'manual' || candidate.source === 'merged')
    );
  });
}

function isSpendRuleList(value: unknown): value is SpendRule[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((rule) => {
    if (!rule || typeof rule !== 'object') {
      return false;
    }

    const candidate = rule as Partial<SpendRule>;

    return (
      typeof candidate.id === 'string' &&
      candidate.id.trim().length > 0 &&
      typeof candidate.categoryId === 'string' &&
      candidate.categoryId.trim().length > 0 &&
      typeof candidate.itemLabel === 'string' &&
      typeof candidate.merchantLabel === 'string' &&
      typeof candidate.merchantNormalizedLabel === 'string' &&
      (candidate.merchantId === undefined ||
        candidate.merchantId === null ||
        typeof candidate.merchantId === 'string') &&
      typeof candidate.createdAt === 'string' &&
      typeof candidate.updatedAt === 'string' &&
      typeof candidate.autoApply === 'boolean'
    );
  });
}

function isCategoryList(value: unknown): value is CategoryOption[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((category) => {
    if (!category || typeof category !== 'object') {
      return false;
    }

    const candidate = category as Partial<CategoryOption>;

    return (
      typeof candidate.id === 'string' &&
      candidate.id.trim().length > 0 &&
      typeof candidate.label === 'string' &&
      candidate.label.trim().length > 0 &&
      typeof candidate.description === 'string'
    );
  });
}
