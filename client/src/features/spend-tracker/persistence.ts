import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Storage } from 'expo-sqlite/kv-store';

import {
  sortTransactionsByCapturedAtDesc,
  type CategoryId,
  type Transaction,
  type TransactionHistoryEntry,
  type TransactionParserInfo,
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
  onboardingPreferences: OnboardingPreferences;
  notificationAccessState: NotificationAccessState;
  onboardingCompleted: boolean;
  transactions: Transaction[];
}

interface SettingRow {
  key: string;
  value: string;
}

interface TransactionRow {
  amountMinor: number;
  capturedAt: string;
  id: string;
  merchant: string;
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

let databasePromise: Promise<SQLiteDatabase> | null = null;
let schemaPromise: Promise<void> | null = null;

export async function clearStoredSpendTrackerState(): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM transaction_history');
    await database.runAsync('DELETE FROM transaction_items');
    await database.runAsync('DELETE FROM transactions');
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
  const transactionCountRow = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions',
  );
  const settingsCountRow = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM settings',
  );

  return (transactionCountRow?.count ?? 0) > 0 || (settingsCountRow?.count ?? 0) > 0;
}

async function writeStateToDatabase(
  database: SQLiteDatabase,
  state: PersistedSpendTrackerState,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM transaction_history');
    await database.runAsync('DELETE FROM transaction_items');
    await database.runAsync('DELETE FROM transactions');
    await database.runAsync('DELETE FROM settings');

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

    for (const transaction of state.transactions) {
      await database.runAsync(
        `
          INSERT INTO transactions (
            id,
            amount_minor,
            captured_at,
            merchant,
            source_app,
            status,
            note,
            parser_id,
            parser_version,
            parser_confidence_bps
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        transaction.id,
        transaction.amountMinor,
        transaction.capturedAt,
        transaction.merchant,
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
  const [settingRows, transactionRows, itemRows, historyRows] = await Promise.all([
    database.getAllAsync<SettingRow>('SELECT key, value FROM settings'),
    database.getAllAsync<TransactionRow>(
      `
        SELECT
          id,
          amount_minor as amountMinor,
          captured_at as capturedAt,
          merchant,
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
  const storedSyncMode = settings.get('sync_mode');
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

  const transactions = sortTransactionsByCapturedAtDesc(
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
        note: row.note ?? '',
        parserInfo: normalizeTransactionParserInfo(row),
        sourceApp: row.sourceApp,
        status: row.status as Transaction['status'],
      })),
  );

  return {
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
    transactions,
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

    return {
      onboardingPreferences: normalizeOnboardingPreferences(
        candidate.onboardingPreferences,
      ),
      notificationAccessState: candidate.notificationAccessState as NotificationAccessState,
      onboardingCompleted: candidate.onboardingCompleted as boolean,
      transactions: candidate.transactions as Transaction[],
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
    typeof candidate.onboardingCompleted === 'boolean' &&
    isNotificationAccessState(candidate.notificationAccessState) &&
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
  return (
    value === 'bills' ||
    value === 'food_drink' ||
    value === 'groceries' ||
    value === 'shopping' ||
    value === 'transport'
  );
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
    value === 'classified' ||
    value === 'classification_imported' ||
    value === 'manual_added' ||
    value === 'note_updated' ||
    value === 'restored' ||
    value === 'skipped' ||
    value === 'split_saved'
  );
}
