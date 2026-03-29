import {
  getUnresolvedAmountMinor,
  sortTransactionsByCapturedAtDesc,
  summarizeBudgets,
  summarizeCategoryUsage,
  type BudgetDefinition,
  type BudgetSummary,
  type CategoryOption,
  type MerchantAliasRecord,
  type MerchantRecord,
  type SpendRule,
  type Transaction,
} from '../spend-tracker/domain';
import type {
  BudgetAlertSettings,
  BudgetThresholdAlert,
} from '../spend-tracker/domain';
import type {
  NotificationAccessState,
  OnboardingPreferences,
  PersistedSpendTrackerState,
} from '../spend-tracker/persistence';

export type CsvExportKind = 'budgets' | 'categories' | 'items' | 'transactions';

interface ExportArtifactBase {
  contents: string;
  fileName: string;
  mimeType: string;
  title: string;
}

export interface CsvExportArtifact extends ExportArtifactBase {
  columns: readonly string[];
  kind: CsvExportKind;
}

export interface LocalBackupArtifact extends ExportArtifactBase {
  schemaVersion: string;
}

export interface LocalExportOptions {
  now?: string;
}

export const LOCAL_BACKUP_SCHEMA_VERSION = 'local_backup_v1';
const REDACTED_TEXT = '[redacted]';
const REDACTED_CUSTOM_CATEGORY = '[redacted custom category]';
const REDACTED_CUSTOM_BUDGET = '[redacted budget]';

export const CSV_EXPORT_SCHEMAS = {
  budgets: [
    'budget_id',
    'privacy_redacted',
    'label',
    'scope',
    'period',
    'target_minor',
    'spent_minor',
    'remaining_minor',
    'projected_spend_minor',
    'threshold_state',
    'cycle_start_utc',
    'cycle_end_utc',
    'matched_transaction_count',
    'matched_item_count',
    'category_id',
    'category_label',
    'merchant_id',
    'merchant_label',
    'item_label',
    'starts_on_day',
    'week_starts_on',
    'rolling_window_days',
    'created_at_utc',
    'updated_at_utc',
  ],
  categories: [
    'category_id',
    'privacy_redacted',
    'label',
    'description',
    'is_default',
    'transaction_count',
    'item_count',
  ],
  items: [
    'item_id',
    'transaction_id',
    'privacy_redacted',
    'captured_at_utc',
    'source_app_id',
    'transaction_status',
    'merchant_display',
    'category_id',
    'category_label',
    'item_label',
    'amount_minor',
    'sort_order',
  ],
  transactions: [
    'transaction_id',
    'privacy_redacted',
    'captured_at_utc',
    'source_app_id',
    'status',
    'amount_minor',
    'item_count',
    'classified_amount_minor',
    'unresolved_amount_minor',
    'merchant_display',
    'merchant_raw',
    'merchant_id',
    'merchant_match_kind',
    'merchant_confidence_bps',
    'note',
    'parser_id',
    'parser_version',
    'parser_confidence_bps',
    'history_entry_count',
  ],
} as const satisfies Record<CsvExportKind, readonly string[]>;

type CsvRow = Record<string, boolean | number | string | null | undefined>;

interface ExportSnapshot {
  budgetAlertSettings: BudgetAlertSettings;
  budgetAlerts: BudgetThresholdAlert[];
  budgets: BudgetDefinition[];
  categories: CategoryOption[];
  merchantAliases: MerchantAliasRecord[];
  merchants: MerchantRecord[];
  notificationAccessState: NotificationAccessState;
  onboardingCompleted: boolean;
  onboardingPreferences: OnboardingPreferences;
  privacyModeEnabled: boolean;
  rules: SpendRule[];
  transactions: Transaction[];
}

interface LocalBackupEnvelope {
  exported_at_utc: string;
  export_type: 'local_backup';
  privacy_mode_enabled: boolean;
  schema_version: typeof LOCAL_BACKUP_SCHEMA_VERSION;
  state: ExportSnapshot;
}

export function buildCsvExportArtifact(
  kind: CsvExportKind,
  state: PersistedSpendTrackerState,
  options: LocalExportOptions = {},
): CsvExportArtifact {
  const snapshot = normalizeExportSnapshot(state);
  const exportedAt = normalizeExportTimestamp(options.now);
  const columns = CSV_EXPORT_SCHEMAS[kind];
  const rows = buildCsvRows(kind, snapshot, exportedAt);

  return {
    columns,
    contents: buildCsv(columns, rows),
    fileName: buildFileName(`upi-spend-tracker-${kind}`, 'csv', exportedAt),
    kind,
    mimeType: 'text/csv',
    title: getCsvExportTitle(kind),
  };
}

export function buildLocalBackupArtifact(
  state: PersistedSpendTrackerState,
  options: LocalExportOptions = {},
): LocalBackupArtifact {
  const snapshot = normalizeExportSnapshot(state);
  const exportedAt = normalizeExportTimestamp(options.now);
  const backupEnvelope: LocalBackupEnvelope = {
    exported_at_utc: exportedAt,
    export_type: 'local_backup',
    privacy_mode_enabled: snapshot.privacyModeEnabled,
    schema_version: LOCAL_BACKUP_SCHEMA_VERSION,
    state: snapshot,
  };

  return {
    contents: `${JSON.stringify(backupEnvelope, null, 2)}\n`,
    fileName: buildFileName('upi-spend-tracker-local-backup', 'json', exportedAt),
    mimeType: 'application/json',
    schemaVersion: LOCAL_BACKUP_SCHEMA_VERSION,
    title: 'Local backup JSON',
  };
}

function normalizeExportSnapshot(state: PersistedSpendTrackerState): ExportSnapshot {
  return {
    budgetAlertSettings: state.budgetAlertSettings ?? {
      quietHoursEndHour: 8,
      quietHoursStartHour: 22,
      quietModeEnabled: true,
    },
    budgetAlerts: [...(state.budgetAlerts ?? [])].sort(
      (left, right) =>
        new Date(right.deliveredAt).getTime() - new Date(left.deliveredAt).getTime(),
    ),
    budgets: [...(state.budgets ?? [])].sort(
      (left, right) =>
        left.label.localeCompare(right.label) || left.id.localeCompare(right.id),
    ),
    categories: [...state.categories].sort(
      (left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id),
    ),
    merchantAliases: [...(state.merchantAliases ?? [])].sort(
      (left, right) => left.alias.localeCompare(right.alias) || left.id.localeCompare(right.id),
    ),
    merchants: [...(state.merchants ?? [])].sort(
      (left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id),
    ),
    notificationAccessState: state.notificationAccessState,
    onboardingCompleted: state.onboardingCompleted,
    onboardingPreferences: {
      ...state.onboardingPreferences,
      selectedSourceAppIds: [...state.onboardingPreferences.selectedSourceAppIds].sort(),
    },
    privacyModeEnabled: state.privacyModeEnabled ?? false,
    rules: [...(state.rules ?? [])].sort(
      (left, right) =>
        left.updatedAt.localeCompare(right.updatedAt) || left.id.localeCompare(right.id),
    ),
    transactions: sortTransactionsByCapturedAtDesc(state.transactions),
  };
}

function buildCsvRows(
  kind: CsvExportKind,
  snapshot: ExportSnapshot,
  exportedAt: string,
): CsvRow[] {
  switch (kind) {
    case 'transactions':
      return buildTransactionsRows(snapshot);
    case 'items':
      return buildItemRows(snapshot);
    case 'categories':
      return buildCategoryRows(snapshot);
    case 'budgets':
      return buildBudgetRows(snapshot, exportedAt);
  }
}

function buildTransactionsRows(snapshot: ExportSnapshot): CsvRow[] {
  return snapshot.transactions.map((transaction) => {
    const classifiedAmountMinor = transaction.items.reduce(
      (sum, item) => sum + item.amountMinor,
      0,
    );

    return {
      amount_minor: transaction.amountMinor,
      captured_at_utc: normalizeTimestamp(transaction.capturedAt),
      classified_amount_minor: classifiedAmountMinor,
      history_entry_count: transaction.history?.length ?? 0,
      item_count: transaction.items.length,
      merchant_confidence_bps: transaction.merchantConfidenceBps ?? '',
      merchant_display: redactValue(transaction.merchant, snapshot.privacyModeEnabled),
      merchant_id: transaction.merchantId ?? '',
      merchant_match_kind: transaction.merchantMatchKind ?? '',
      merchant_raw: redactOptionalValue(transaction.merchantRaw, snapshot.privacyModeEnabled),
      note: redactOptionalValue(transaction.note, snapshot.privacyModeEnabled),
      parser_confidence_bps: transaction.parserInfo?.confidenceBps ?? '',
      parser_id: transaction.parserInfo?.parserId ?? '',
      parser_version: transaction.parserInfo?.parserVersion ?? '',
      privacy_redacted: snapshot.privacyModeEnabled,
      source_app_id: normalizeSourceAppId(transaction.sourceApp),
      status: transaction.status,
      transaction_id: transaction.id,
      unresolved_amount_minor: getUnresolvedAmountMinor(transaction),
    };
  });
}

function buildItemRows(snapshot: ExportSnapshot): CsvRow[] {
  return snapshot.transactions.flatMap((transaction) =>
    transaction.items.map((item, index) => ({
      amount_minor: item.amountMinor,
      captured_at_utc: normalizeTimestamp(transaction.capturedAt),
      category_id: item.categoryId,
      category_label: getCategoryExportLabel(
        snapshot.categories,
        item.categoryId,
        snapshot.privacyModeEnabled,
      ),
      item_id: item.id,
      item_label: redactValue(item.label, snapshot.privacyModeEnabled),
      merchant_display: redactValue(transaction.merchant, snapshot.privacyModeEnabled),
      privacy_redacted: snapshot.privacyModeEnabled,
      sort_order: index + 1,
      source_app_id: normalizeSourceAppId(transaction.sourceApp),
      transaction_id: transaction.id,
      transaction_status: transaction.status,
    })),
  );
}

function buildCategoryRows(snapshot: ExportSnapshot): CsvRow[] {
  return summarizeCategoryUsage(snapshot.categories, snapshot.transactions).map((summary) => ({
    category_id: summary.category.id,
    description: getCategoryExportDescription(summary.category, snapshot.privacyModeEnabled),
    is_default: summary.category.isDefault,
    item_count: summary.itemCount,
    label: getCategoryExportLabelByCategory(summary.category, snapshot.privacyModeEnabled),
    privacy_redacted: snapshot.privacyModeEnabled && !summary.category.isDefault,
    transaction_count: summary.transactionCount,
  }));
}

function buildBudgetRows(snapshot: ExportSnapshot, exportedAt: string): CsvRow[] {
  const summaries = summarizeBudgets(snapshot.transactions, snapshot.budgets, exportedAt).sort(
    (left, right) =>
      left.budget.label.localeCompare(right.budget.label) ||
      left.budget.id.localeCompare(right.budget.id),
  );

  return summaries.map((summary) => buildBudgetRow(summary, snapshot));
}

function buildBudgetRow(summary: BudgetSummary, snapshot: ExportSnapshot): CsvRow {
  const budget = summary.budget;

  return {
    budget_id: budget.id,
    category_id: budget.categoryId ?? '',
    category_label: budget.categoryId
      ? getCategoryExportLabel(snapshot.categories, budget.categoryId, snapshot.privacyModeEnabled)
      : '',
    created_at_utc: normalizeTimestamp(budget.createdAt),
    cycle_end_utc: normalizeTimestamp(summary.cycleEnd),
    cycle_start_utc: normalizeTimestamp(summary.cycleStart),
    item_label: redactOptionalValue(budget.itemLabel, snapshot.privacyModeEnabled, REDACTED_CUSTOM_BUDGET),
    label: redactValue(budget.label, snapshot.privacyModeEnabled, REDACTED_CUSTOM_BUDGET),
    matched_item_count: summary.matchedItemCount,
    matched_transaction_count: summary.matchedTransactionCount,
    merchant_id: budget.merchantId ?? '',
    merchant_label: redactOptionalValue(
      budget.merchantLabel,
      snapshot.privacyModeEnabled,
      REDACTED_TEXT,
    ),
    period: budget.period,
    privacy_redacted: snapshot.privacyModeEnabled,
    projected_spend_minor: summary.projectedSpendMinor,
    remaining_minor: summary.remainingMinor,
    rolling_window_days: budget.rollingWindowDays ?? '',
    scope: budget.scope,
    spent_minor: summary.spentMinor,
    starts_on_day: budget.startsOnDay ?? '',
    target_minor: budget.targetMinor,
    threshold_state: summary.thresholdState,
    updated_at_utc: normalizeTimestamp(budget.updatedAt),
    week_starts_on: budget.weekStartsOn ?? '',
  };
}

function getCsvExportTitle(kind: CsvExportKind): string {
  switch (kind) {
    case 'transactions':
      return 'Transactions CSV';
    case 'items':
      return 'Items CSV';
    case 'categories':
      return 'Categories CSV';
    case 'budgets':
      return 'Budgets CSV';
  }
}

function buildCsv(columns: readonly string[], rows: CsvRow[]): string {
  const lines = [columns.join(',')];

  for (const row of rows) {
    lines.push(columns.map((column) => formatCsvCell(row[column])).join(','));
  }

  return `${lines.join('\n')}\n`;
}

function formatCsvCell(value: CsvRow[string]): string {
  if (value === null || value === undefined) {
    return '';
  }

  const serializedValue =
    typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);

  if (
    serializedValue.includes(',') ||
    serializedValue.includes('"') ||
    serializedValue.includes('\n')
  ) {
    return `"${serializedValue.replaceAll('"', '""')}"`;
  }

  return serializedValue;
}

function normalizeExportTimestamp(now?: string): string {
  return normalizeTimestamp(now ?? new Date().toISOString());
}

function normalizeTimestamp(value: string): string {
  return new Date(value).toISOString();
}

function buildFileName(baseName: string, extension: 'csv' | 'json', exportedAt: string): string {
  const compactTimestamp = exportedAt.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `${baseName}-${compactTimestamp}.${extension}`;
}

function redactValue(
  value: string,
  privacyModeEnabled: boolean,
  placeholder = REDACTED_TEXT,
): string {
  return privacyModeEnabled ? placeholder : value;
}

function redactOptionalValue(
  value: string | null | undefined,
  privacyModeEnabled: boolean,
  placeholder = REDACTED_TEXT,
): string {
  if (!value) {
    return '';
  }

  return redactValue(value, privacyModeEnabled, placeholder);
}

function normalizeSourceAppId(sourceApp: string): string {
  return sourceApp.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function getCategoryExportLabel(
  categories: CategoryOption[],
  categoryId: string,
  privacyModeEnabled: boolean,
): string {
  const category = categories.find((candidate) => candidate.id === categoryId);

  if (!category) {
    return '';
  }

  return getCategoryExportLabelByCategory(category, privacyModeEnabled);
}

function getCategoryExportLabelByCategory(
  category: CategoryOption,
  privacyModeEnabled: boolean,
): string {
  if (privacyModeEnabled && !category.isDefault) {
    return REDACTED_CUSTOM_CATEGORY;
  }

  return category.label;
}

function getCategoryExportDescription(
  category: CategoryOption,
  privacyModeEnabled: boolean,
): string {
  if (privacyModeEnabled && !category.isDefault) {
    return REDACTED_CUSTOM_CATEGORY;
  }

  return category.description;
}
