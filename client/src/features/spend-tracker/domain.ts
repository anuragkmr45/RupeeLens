export type CategoryId =
  | 'bills'
  | 'food_drink'
  | 'groceries'
  | 'shopping'
  | 'transport';

export interface CategoryOption {
  description: string;
  id: CategoryId;
  label: string;
}

export interface TransactionItem {
  amountMinor: number;
  categoryId: CategoryId;
  id: string;
  label: string;
}

export interface TransactionParserInfo {
  confidenceBps: number | null;
  parserId: string;
  parserVersion: string;
}

export type TransactionHistoryKind =
  | 'captured'
  | 'classified'
  | 'classification_imported'
  | 'manual_added'
  | 'note_updated'
  | 'restored'
  | 'skipped'
  | 'split_saved';

export interface TransactionHistoryEntry {
  at: string;
  id: string;
  kind: TransactionHistoryKind;
  summary: string;
}

export interface Transaction {
  amountMinor: number;
  capturedAt: string;
  history?: TransactionHistoryEntry[];
  id: string;
  items: TransactionItem[];
  merchant: string;
  note?: string;
  parserInfo?: TransactionParserInfo | null;
  sourceApp: string;
  status: TransactionStatus;
}

export interface ClassificationDraft {
  categoryId: CategoryId | null;
  itemLabel: string;
  saveAsRule: boolean;
}

export interface SplitDraftRow {
  amountInput: string;
  categoryId: CategoryId | null;
  id: string;
  itemLabel: string;
}

export type SplitRemainderDisposition =
  | 'leave_unresolved'
  | 'fees'
  | 'tax'
  | 'tip'
  | 'unknown';

export interface SplitDraft {
  remainderCategoryId: CategoryId | null;
  remainderDisposition: SplitRemainderDisposition;
  rows: SplitDraftRow[];
}

export interface SplitDraftSummary {
  allocatedMinor: number;
  hasInvalidRows: boolean;
  hasOverAllocation: boolean;
  readyRows: Array<{
    amountMinor: number;
    categoryId: CategoryId;
    id: string;
    itemLabel: string;
  }>;
  remainingMinor: number;
  signedRemainingMinor: number;
}

export interface ManualEntryInput {
  amountMinor: number;
  capturedAt?: string;
  categoryId: CategoryId;
  itemLabel: string;
  merchant: string;
  note?: string;
  sourceApp?: string;
  transactionId?: string;
}

export interface DashboardSummary {
  budgetRemainingMinor: number;
  budgetTargetMinor: number;
  budgetUsedRatio: number;
  classifiedCount: number;
  inboxCount: number;
  recentActivity: Transaction[];
  topCategoryLabel: string;
  topItems: TransactionItemSummary[];
  topMerchantLabel: string;
  totalSpendMinor: number;
}

export type TransactionStatus =
  | 'classified'
  | 'partially_classified'
  | 'skipped'
  | 'uncategorized';

export type InboxStatusFilter =
  | 'all'
  | 'needs_review'
  | 'partially_classified'
  | 'skipped';
export type InboxAmountFilter = 'all' | 'under_250' | 'between_250_and_500' | 'over_500';
export type InboxAgeFilter = 'all' | 'today' | 'last_3_days' | 'older';
export type TimelineStatusFilter = 'all' | TransactionStatus;
export type TimelineDateFilter = 'all' | 'today' | 'last_7_days' | 'last_30_days' | 'older';

export interface InboxFilters {
  ageFilter: InboxAgeFilter;
  amountFilter: InboxAmountFilter;
  merchantQuery: string;
  sourceApp: string | 'all';
  statusFilter: InboxStatusFilter;
}

export interface InboxReviewItem {
  reviewStatus: Exclude<TransactionStatus, 'classified'>;
  transaction: Transaction;
}

export interface TimelineFilters {
  amountFilter: InboxAmountFilter;
  dateFilter: TimelineDateFilter;
  query: string;
  sourceApp: string | 'all';
  statusFilter: TimelineStatusFilter;
}

export interface TimelineDayGroup {
  dayKey: string;
  label: string;
  transactions: Transaction[];
}

export interface ClassificationSuggestion {
  categoryId: CategoryId;
  id: string;
  itemLabel: string;
  reason: string;
}

export interface DashboardSummaryOptions {
  budgetTargetMinor: number;
  cycleStartDay: number;
  now?: string;
  recentActivityLimit?: number;
  topItemsLimit?: number;
}

export interface TransactionItemSummary {
  amountMinor: number;
  categoryLabel: string;
  label: string;
  merchant: string;
  transactionId: string;
}

export const DEFAULT_INBOX_FILTERS: InboxFilters = {
  ageFilter: 'all',
  amountFilter: 'all',
  merchantQuery: '',
  sourceApp: 'all',
  statusFilter: 'needs_review',
};

export const DEFAULT_TIMELINE_FILTERS: TimelineFilters = {
  amountFilter: 'all',
  dateFilter: 'all',
  query: '',
  sourceApp: 'all',
  statusFilter: 'all',
};

export const SPLIT_REMAINDER_OPTIONS: Array<{
  id: SplitRemainderDisposition;
  label: string;
}> = [
  { id: 'leave_unresolved', label: 'Leave in Inbox' },
  { id: 'tip', label: 'Tip' },
  { id: 'tax', label: 'Tax' },
  { id: 'fees', label: 'Fees' },
  { id: 'unknown', label: 'Unknown' },
];

export const categoryOptions: CategoryOption[] = [
  {
    description: 'Coffee, dining, snacks, and drinks.',
    id: 'food_drink',
    label: 'Food & Drink',
  },
  {
    description: 'Groceries and daily essentials.',
    id: 'groceries',
    label: 'Groceries',
  },
  {
    description: 'Metro, cab, and fuel spends.',
    id: 'transport',
    label: 'Transport',
  },
  {
    description: 'Electricity, mobile, and utility bills.',
    id: 'bills',
    label: 'Bills',
  },
  {
    description: 'Personal shopping and one-off purchases.',
    id: 'shopping',
    label: 'Shopping',
  },
];

function buildSeededParserInfo(
  sourceApp: Transaction['sourceApp'],
): TransactionParserInfo | null {
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

function buildSeededHistory(
  transaction: Pick<Transaction, 'capturedAt' | 'id' | 'items' | 'merchant' | 'sourceApp' | 'status'>,
): TransactionHistoryEntry[] {
  const baseEntries: TransactionHistoryEntry[] = [
    {
      at: transaction.capturedAt,
      id: `${transaction.id}_history_captured`,
      kind: 'captured',
      summary: `${transaction.sourceApp} capture stored for ${transaction.merchant}.`,
    },
  ];

  if (transaction.status === 'classified' && transaction.items.length > 0) {
    baseEntries.push({
      at: transaction.capturedAt,
      id: `${transaction.id}_history_classified`,
      kind: 'classified',
      summary: `Saved classification with ${transaction.items.length} item row${transaction.items.length === 1 ? '' : 's'}.`,
    });
  }

  return baseEntries;
}

export const seededTransactions: Transaction[] = [
  {
    amountMinor: 18000,
    capturedAt: '2026-03-25T09:12:00+05:30',
    history: buildSeededHistory({
      capturedAt: '2026-03-25T09:12:00+05:30',
      id: 'txn_blue_tokai',
      items: [],
      merchant: 'Blue Tokai Roasters',
      sourceApp: 'Google Pay',
      status: 'uncategorized',
    }),
    id: 'txn_blue_tokai',
    items: [],
    merchant: 'Blue Tokai Roasters',
    note: '',
    parserInfo: buildSeededParserInfo('Google Pay'),
    sourceApp: 'Google Pay',
    status: 'uncategorized',
  },
  {
    amountMinor: 64000,
    capturedAt: '2026-03-25T08:34:00+05:30',
    history: buildSeededHistory({
      capturedAt: '2026-03-25T08:34:00+05:30',
      id: 'txn_blinkit',
      items: [],
      merchant: 'Blinkit',
      sourceApp: 'PhonePe',
      status: 'uncategorized',
    }),
    id: 'txn_blinkit',
    items: [],
    merchant: 'Blinkit',
    note: '',
    parserInfo: buildSeededParserInfo('PhonePe'),
    sourceApp: 'PhonePe',
    status: 'uncategorized',
  },
  {
    amountMinor: 32000,
    capturedAt: '2026-03-25T07:48:00+05:30',
    history: buildSeededHistory({
      capturedAt: '2026-03-25T07:48:00+05:30',
      id: 'txn_metro',
      items: [
        {
          amountMinor: 32000,
          categoryId: 'transport',
          id: 'item_metro_1',
          label: 'Metro card top-up',
        },
      ],
      merchant: 'Bangalore Metro',
      sourceApp: 'Paytm',
      status: 'classified',
    }),
    id: 'txn_metro',
    items: [
      {
        amountMinor: 32000,
        categoryId: 'transport',
        id: 'item_metro_1',
        label: 'Metro card top-up',
      },
    ],
    merchant: 'Bangalore Metro',
    note: 'Used for weekday commute.',
    parserInfo: buildSeededParserInfo('Paytm'),
    sourceApp: 'Paytm',
    status: 'classified',
  },
  {
    amountMinor: 21500,
    capturedAt: '2026-03-24T18:30:00+05:30',
    history: buildSeededHistory({
      capturedAt: '2026-03-24T18:30:00+05:30',
      id: 'txn_third_wave',
      items: [
        {
          amountMinor: 21500,
          categoryId: 'food_drink',
          id: 'item_third_wave_1',
          label: 'Flat white and cookie',
        },
      ],
      merchant: 'Third Wave Coffee',
      sourceApp: 'Google Pay',
      status: 'classified',
    }),
    id: 'txn_third_wave',
    items: [
      {
        amountMinor: 21500,
        categoryId: 'food_drink',
        id: 'item_third_wave_1',
        label: 'Flat white and cookie',
      },
    ],
    merchant: 'Third Wave Coffee',
    note: '',
    parserInfo: buildSeededParserInfo('Google Pay'),
    sourceApp: 'Google Pay',
    status: 'classified',
  },
  {
    amountMinor: 42000,
    capturedAt: '2026-03-23T20:14:00+05:30',
    history: buildSeededHistory({
      capturedAt: '2026-03-23T20:14:00+05:30',
      id: 'txn_bigbasket',
      items: [
        {
          amountMinor: 42000,
          categoryId: 'groceries',
          id: 'item_bigbasket_1',
          label: 'Weekly vegetables',
        },
      ],
      merchant: 'BigBasket',
      sourceApp: 'PhonePe',
      status: 'classified',
    }),
    id: 'txn_bigbasket',
    items: [
      {
        amountMinor: 42000,
        categoryId: 'groceries',
        id: 'item_bigbasket_1',
        label: 'Weekly vegetables',
      },
    ],
    merchant: 'BigBasket',
    note: '',
    parserInfo: buildSeededParserInfo('PhonePe'),
    sourceApp: 'PhonePe',
    status: 'classified',
  },
];

export function buildClassificationDraft(
  transaction: Transaction,
): ClassificationDraft {
  const firstItem = transaction.items[0];

  return {
    categoryId: firstItem?.categoryId ?? null,
    itemLabel: firstItem?.label ?? '',
    saveAsRule: false,
  };
}

export function buildSplitDraft(
  transaction: Transaction,
  classificationDraft?: Pick<ClassificationDraft, 'categoryId' | 'itemLabel'> | null,
): SplitDraft {
  const seededRows =
    transaction.items.length > 0
      ? transaction.items.map((item, index) => ({
          amountInput: formatMinorForInput(item.amountMinor),
          categoryId: item.categoryId,
          id: item.id || `${transaction.id}_split_${index + 1}`,
          itemLabel: item.label,
        }))
      : [
          createSplitDraftRow({
            amountMinor: transaction.amountMinor,
            categoryId: classificationDraft?.categoryId ?? null,
            itemLabel: classificationDraft?.itemLabel ?? '',
            rowId: `${transaction.id}_split_1`,
          }),
        ];

  return {
    remainderCategoryId: null,
    remainderDisposition: 'leave_unresolved',
    rows: seededRows,
  };
}

export function formatCaptureMoment(capturedAt: string): string {
  const capturedDate = new Date(capturedAt);
  const month = MONTH_LABELS[capturedDate.getMonth()] ?? 'Date';
  const date = capturedDate.getDate();
  const hours24 = capturedDate.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = `${capturedDate.getMinutes()}`.padStart(2, '0');
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';

  return `${month} ${date}, ${hours12}:${minutes} ${meridiem}`;
}

export function formatCurrency(amountMinor: number): string {
  const amount = amountMinor / 100;
  const formattedAmount = Number.isInteger(amount)
    ? amount.toLocaleString('en-IN')
    : amount.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      });

  return `Rs ${formattedAmount}`;
}

export function parseCurrencyInputToMinor(value: string): number | null {
  const normalizedValue = value.replace(/,/g, '').trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return null;
  }

  const [wholePart, fractionalPart = ''] = normalizedValue.split('.');
  return Number(wholePart) * 100 + Number(fractionalPart.padEnd(2, '0'));
}

export function createManualTransaction({
  amountMinor,
  capturedAt = new Date().toISOString(),
  categoryId,
  itemLabel,
  merchant,
  note = '',
  sourceApp = 'Manual entry',
  transactionId = `txn_manual_${Date.now()}`,
}: ManualEntryInput): Transaction {
  const normalizedMerchant = merchant.trim();
  const normalizedItemLabel = itemLabel.trim();
  const normalizedNote = note.trim();

  return {
    amountMinor,
    capturedAt,
    history: [
      {
        at: capturedAt,
        id: `${transactionId}_history_manual_added`,
        kind: 'manual_added',
        summary: `Manual spend saved for ${normalizedMerchant}.`,
      },
      {
        at: capturedAt,
        id: `${transactionId}_history_classified`,
        kind: 'classified',
        summary: 'Manual entry saved with one classified item row.',
      },
    ],
    id: transactionId,
    items: [
      {
        amountMinor,
        categoryId,
        id: `${transactionId}_item_1`,
        label: normalizedItemLabel,
      },
    ],
    merchant: normalizedMerchant,
    note: normalizedNote,
    parserInfo: null,
    sourceApp,
    status: 'classified',
  };
}

export function createSplitDraftRow({
  amountMinor,
  categoryId = null,
  itemLabel = '',
  rowId = `split_row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
}: {
  amountMinor?: number;
  categoryId?: CategoryId | null;
  itemLabel?: string;
  rowId?: string;
} = {}): SplitDraftRow {
  return {
    amountInput:
      typeof amountMinor === 'number' && amountMinor > 0 ? formatMinorForInput(amountMinor) : '',
    categoryId,
    id: rowId,
    itemLabel,
  };
}

export function appendSplitDraftRow(splitDraft: SplitDraft): SplitDraft {
  return {
    ...splitDraft,
    rows: [...splitDraft.rows, createSplitDraftRow()],
  };
}

export function removeSplitDraftRow(
  splitDraft: SplitDraft,
  rowId: string,
): SplitDraft {
  const remainingRows = splitDraft.rows.filter((row) => row.id !== rowId);

  return {
    ...splitDraft,
    rows: remainingRows.length > 0 ? remainingRows : [createSplitDraftRow()],
  };
}

export function moveSplitDraftRow(
  splitDraft: SplitDraft,
  rowId: string,
  direction: 'down' | 'up',
): SplitDraft {
  const currentIndex = splitDraft.rows.findIndex((row) => row.id === rowId);

  if (currentIndex === -1) {
    return splitDraft;
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= splitDraft.rows.length) {
    return splitDraft;
  }

  const nextRows = [...splitDraft.rows];
  const [movedRow] = nextRows.splice(currentIndex, 1);

  if (!movedRow) {
    return splitDraft;
  }

  nextRows.splice(targetIndex, 0, movedRow);

  return {
    ...splitDraft,
    rows: nextRows,
  };
}

export function summarizeSplitDraft(
  totalAmountMinor: number,
  splitDraft: SplitDraft,
): SplitDraftSummary {
  let allocatedMinor = 0;
  let hasInvalidRows = false;
  const readyRows: SplitDraftSummary['readyRows'] = [];

  for (const row of splitDraft.rows) {
    const amountMinor = parseCurrencyInputToMinor(row.amountInput);
    const itemLabel = row.itemLabel.trim();
    const hasAnyContent =
      row.amountInput.trim().length > 0 ||
      itemLabel.length > 0 ||
      row.categoryId !== null;

    if (!hasAnyContent) {
      continue;
    }

    if (!row.categoryId || amountMinor === null || amountMinor <= 0 || itemLabel.length === 0) {
      hasInvalidRows = true;
      continue;
    }

    allocatedMinor += amountMinor;
    readyRows.push({
      amountMinor,
      categoryId: row.categoryId,
      id: row.id,
      itemLabel,
    });
  }

  const signedRemainingMinor = totalAmountMinor - allocatedMinor;

  return {
    allocatedMinor,
    hasInvalidRows,
    hasOverAllocation: signedRemainingMinor < 0,
    readyRows,
    remainingMinor: Math.max(signedRemainingMinor, 0),
    signedRemainingMinor,
  };
}

export function isSplitDraftReady(
  totalAmountMinor: number,
  splitDraft: SplitDraft,
): boolean {
  const summary = summarizeSplitDraft(totalAmountMinor, splitDraft);

  if (
    summary.readyRows.length === 0 ||
    summary.hasInvalidRows ||
    summary.hasOverAllocation
  ) {
    return false;
  }

  if (summary.remainingMinor === 0) {
    return true;
  }

  if (splitDraft.remainderDisposition === 'leave_unresolved') {
    return true;
  }

  return splitDraft.remainderCategoryId !== null;
}

export function splitTransaction(
  transactions: Transaction[],
  transactionId: string,
  splitDraft: SplitDraft,
): Transaction[] {
  return transactions.map((transaction) => {
    if (transaction.id !== transactionId) {
      return transaction;
    }

    if (!isSplitDraftReady(transaction.amountMinor, splitDraft)) {
      return transaction;
    }

    const summary = summarizeSplitDraft(transaction.amountMinor, splitDraft);
    const nextItems = summary.readyRows.map((row, index) => ({
      amountMinor: row.amountMinor,
      categoryId: row.categoryId,
      id: `${transaction.id}_item_${index + 1}`,
      label: row.itemLabel,
    }));

    if (
      summary.remainingMinor > 0 &&
      splitDraft.remainderDisposition !== 'leave_unresolved' &&
      splitDraft.remainderCategoryId
    ) {
      nextItems.push({
        amountMinor: summary.remainingMinor,
        categoryId: splitDraft.remainderCategoryId,
        id: `${transaction.id}_item_${nextItems.length + 1}`,
        label: getRemainderLabel(splitDraft.remainderDisposition),
      });
    }

    return {
      ...transaction,
      history: appendTransactionHistoryEntry(
        transaction.history,
        createHistoryEntry(
          transaction.id,
          summary.remainingMinor > 0 &&
            splitDraft.remainderDisposition === 'leave_unresolved'
            ? 'split_saved'
            : 'classified',
          summary.remainingMinor > 0 &&
            splitDraft.remainderDisposition === 'leave_unresolved'
            ? `Saved ${nextItems.length} split rows and left ${formatCurrency(summary.remainingMinor)} unresolved.`
            : `Saved ${nextItems.length} split rows and fully resolved the payment.`,
        ),
      ),
      items: nextItems,
      status:
        summary.remainingMinor > 0 &&
        splitDraft.remainderDisposition === 'leave_unresolved'
          ? 'partially_classified'
          : 'classified',
    };
  });
}

export function sortTransactionsByCapturedAtDesc(
  transactions: Transaction[],
): Transaction[] {
  return [...transactions].sort(
    (left, right) =>
      new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime(),
  );
}

export function getPendingTransactions(
  transactions: Transaction[],
): Transaction[] {
  return sortTransactionsByCapturedAtDesc(transactions)
    .filter(
      (transaction) =>
        transaction.status === 'uncategorized' ||
        transaction.status === 'partially_classified',
    );
}

export function getInboxReviewTransactions(
  transactions: Transaction[],
  filters: InboxFilters,
  now = new Date().toISOString(),
): InboxReviewItem[] {
  return sortTransactionsByCapturedAtDesc(transactions)
    .filter((transaction) => transaction.status !== 'classified')
    .filter((transaction) => matchesInboxStatusFilter(transaction, filters.statusFilter))
    .filter((transaction) => matchesSourceAppFilter(transaction, filters.sourceApp))
    .filter((transaction) => matchesMerchantFilter(transaction, filters.merchantQuery))
    .filter((transaction) => matchesAmountFilter(transaction, filters.amountFilter))
    .filter((transaction) => matchesAgeFilter(transaction, filters.ageFilter, now))
    .map((transaction) => ({
      reviewStatus:
        transaction.status === 'skipped'
          ? 'skipped'
          : transaction.status === 'partially_classified'
            ? 'partially_classified'
            : 'uncategorized',
      transaction,
    }));
}

export function getInboxSourceAppOptions(transactions: Transaction[]): string[] {
  return [...new Set(
    transactions
      .filter((transaction) => transaction.status !== 'classified')
      .map((transaction) => transaction.sourceApp),
  )].sort((left, right) => left.localeCompare(right));
}

export function getTimelineTransactions(
  transactions: Transaction[],
  filters: TimelineFilters,
  now = new Date().toISOString(),
): Transaction[] {
  return sortTransactionsByCapturedAtDesc(transactions)
    .filter((transaction) => matchesTimelineStatusFilter(transaction, filters.statusFilter))
    .filter((transaction) => matchesSourceAppFilter(transaction, filters.sourceApp))
    .filter((transaction) => matchesAmountFilter(transaction, filters.amountFilter))
    .filter((transaction) => matchesTimelineDateFilter(transaction, filters.dateFilter, now))
    .filter((transaction) => matchesTimelineQuery(transaction, filters.query));
}

export function getTimelineSourceAppOptions(transactions: Transaction[]): string[] {
  return [...new Set(transactions.map((transaction) => transaction.sourceApp))].sort(
    (left, right) => left.localeCompare(right),
  );
}

export function getTimelineDayGroups(
  transactions: Transaction[],
  filters: TimelineFilters,
  now = new Date().toISOString(),
): TimelineDayGroup[] {
  const groupedTransactions = new Map<string, Transaction[]>();
  const filteredTransactions = getTimelineTransactions(transactions, filters, now);

  for (const transaction of filteredTransactions) {
    const dayKey = transaction.capturedAt.slice(0, 10);
    const existingGroup = groupedTransactions.get(dayKey) ?? [];

    groupedTransactions.set(dayKey, [...existingGroup, transaction]);
  }

  return [...groupedTransactions.entries()].map(([dayKey, dayTransactions]) => ({
    dayKey,
    label: formatTimelineDayLabel(dayKey, now),
    transactions: dayTransactions,
  }));
}

export function getTransactionById(
  transactions: Transaction[],
  transactionId: string,
): Transaction | null {
  return transactions.find((transaction) => transaction.id === transactionId) ?? null;
}

export function getTransactionStatusLabel(status: TransactionStatus): string {
  switch (status) {
    case 'classified':
      return 'Classified';
    case 'partially_classified':
      return 'Partially classified';
    case 'skipped':
      return 'Skipped';
    case 'uncategorized':
    default:
      return 'Needs review';
  }
}

export function getUnresolvedAmountMinor(transaction: Transaction): number {
  return Math.max(
    transaction.amountMinor - transaction.items.reduce((sum, item) => sum + item.amountMinor, 0),
    0,
  );
}

export function getClassificationSuggestions(
  transactions: Transaction[],
  merchant: string,
  currentTransactionId?: string,
): ClassificationSuggestion[] {
  const suggestions = new Map<string, ClassificationSuggestion>();
  const normalizedMerchant = merchant.trim().toLowerCase();

  for (const transaction of transactions) {
    if (
      transaction.id === currentTransactionId ||
      transaction.status !== 'classified' ||
      transaction.items.length === 0
    ) {
      continue;
    }

    const normalizedTransactionMerchant = transaction.merchant.trim().toLowerCase();

    if (
      normalizedMerchant.length === 0 ||
      normalizedTransactionMerchant !== normalizedMerchant
    ) {
      continue;
    }

    const firstItem = transaction.items[0];

    if (!firstItem) {
      continue;
    }

    const suggestionKey = `${firstItem.categoryId}:${firstItem.label.toLowerCase()}`;

    suggestions.set(suggestionKey, {
      categoryId: firstItem.categoryId,
      id: `history_${transaction.id}`,
      itemLabel: firstItem.label,
      reason: 'Used before for this merchant',
    });
  }

  for (const suggestion of getMerchantKeywordSuggestions(normalizedMerchant)) {
    const suggestionKey = `${suggestion.categoryId}:${suggestion.itemLabel.toLowerCase()}`;

    if (!suggestions.has(suggestionKey)) {
      suggestions.set(suggestionKey, suggestion);
    }
  }

  return [...suggestions.values()].slice(0, 3);
}

export function isClassificationReady(classification: ClassificationDraft): boolean {
  return Boolean(classification.categoryId) && classification.itemLabel.trim().length > 0;
}

export function classifyTransaction(
  transactions: Transaction[],
  transactionId: string,
  classification: ClassificationDraft,
): Transaction[] {
  const categoryId = classification.categoryId;
  const itemLabel = classification.itemLabel.trim();

  if (!categoryId || itemLabel.length === 0) {
    return transactions;
  }

  return transactions.map((transaction) => {
    if (transaction.id !== transactionId) {
      return transaction;
    }

    return {
      ...transaction,
      history: appendTransactionHistoryEntry(
        transaction.history,
        createHistoryEntry(
          transaction.id,
          'classified',
          `Saved classification as ${getCategoryLabel(categoryId)} with item "${itemLabel}".`,
        ),
      ),
      items: [
        {
          amountMinor: transaction.amountMinor,
          categoryId,
          id: `${transaction.id}_item_1`,
          label: itemLabel,
        },
      ],
      status: 'classified',
    };
  });
}

export function skipTransaction(
  transactions: Transaction[],
  transactionId: string,
): Transaction[] {
  return updateTransactionStatus(
    transactions,
    transactionId,
    'skipped',
    'Marked this transaction to review later.',
  );
}

export function restoreSkippedTransaction(
  transactions: Transaction[],
  transactionId: string,
): Transaction[] {
  return updateTransactionStatus(
    transactions,
    transactionId,
    'uncategorized',
    'Moved this transaction back into needs review.',
  );
}

export function updateTransactionNote(
  transactions: Transaction[],
  transactionId: string,
  note: string,
): Transaction[] {
  const normalizedNote = note.trim();

  return transactions.map((transaction) => {
    if (transaction.id !== transactionId || (transaction.note ?? '') === normalizedNote) {
      return transaction;
    }

    return {
      ...transaction,
      history: appendTransactionHistoryEntry(
        transaction.history,
        createHistoryEntry(
          transaction.id,
          'note_updated',
          normalizedNote.length > 0
            ? 'Saved a local note on this transaction.'
            : 'Cleared the local note on this transaction.',
        ),
      ),
      note: normalizedNote,
    };
  });
}

export function deleteTransaction(
  transactions: Transaction[],
  transactionId: string,
): Transaction[] {
  return transactions.filter((transaction) => transaction.id !== transactionId);
}

export function summarizeDashboard(
  transactions: Transaction[],
  options: DashboardSummaryOptions,
): DashboardSummary {
  const periodTransactions = getCurrentCycleTransactions(
    transactions,
    options.cycleStartDay,
    options.now,
  );
  const merchantSpend = new Map<string, number>();
  const categorySpend = new Map<CategoryId, number>();
  const itemSummaries: TransactionItemSummary[] = [];
  const budgetTargetMinor = Math.max(options.budgetTargetMinor, 1);
  const recentActivityLimit = options.recentActivityLimit ?? 3;
  const topItemsLimit = options.topItemsLimit ?? 3;

  let classifiedCount = 0;
  let inboxCount = 0;
  let totalSpendMinor = 0;

  for (const transaction of periodTransactions) {
    totalSpendMinor += transaction.amountMinor;
    merchantSpend.set(
      transaction.merchant,
      (merchantSpend.get(transaction.merchant) ?? 0) + transaction.amountMinor,
    );

    if (
      transaction.status === 'uncategorized' ||
      transaction.status === 'partially_classified'
    ) {
      inboxCount += 1;
      if (transaction.status === 'uncategorized') {
        continue;
      }
    }

    if (transaction.status === 'skipped') {
      continue;
    }

    classifiedCount += 1;

    for (const item of transaction.items) {
      categorySpend.set(
        item.categoryId,
        (categorySpend.get(item.categoryId) ?? 0) + item.amountMinor,
      );
      itemSummaries.push({
        amountMinor: item.amountMinor,
        categoryLabel:
          categoryOptions.find((category) => category.id === item.categoryId)?.label ??
          'Needs data',
        label: item.label,
        merchant: transaction.merchant,
        transactionId: transaction.id,
      });
    }
  }

  return {
    budgetRemainingMinor: Math.max(budgetTargetMinor - totalSpendMinor, 0),
    budgetTargetMinor,
    budgetUsedRatio: Math.min(totalSpendMinor / budgetTargetMinor, 1),
    classifiedCount,
    inboxCount,
    recentActivity: sortTransactionsByCapturedAtDesc(periodTransactions).slice(0, recentActivityLimit),
    topCategoryLabel: getTopCategoryLabel(categorySpend),
    topItems: itemSummaries
      .sort((left, right) => right.amountMinor - left.amountMinor)
      .slice(0, topItemsLimit),
    topMerchantLabel: getTopMerchantLabel(merchantSpend),
    totalSpendMinor,
  };
}

function getCurrentCycleTransactions(
  transactions: Transaction[],
  cycleStartDay: number,
  now?: string,
): Transaction[] {
  const sortedTransactions = sortTransactionsByCapturedAtDesc(transactions);
  const anchorDate = new Date(
    now ?? sortedTransactions[0]?.capturedAt ?? new Date().toISOString(),
  );
  const { cycleEnd, cycleStart } = getCycleWindow(anchorDate, cycleStartDay);

  return sortedTransactions.filter((transaction) => {
    const capturedAt = new Date(transaction.capturedAt);

    return capturedAt >= cycleStart && capturedAt < cycleEnd;
  });
}

function matchesInboxStatusFilter(
  transaction: Transaction,
  statusFilter: InboxStatusFilter,
): boolean {
  if (statusFilter === 'all') {
    return transaction.status !== 'classified';
  }

  if (statusFilter === 'needs_review') {
    return (
      transaction.status === 'uncategorized' ||
      transaction.status === 'partially_classified'
    );
  }

  if (statusFilter === 'partially_classified') {
    return transaction.status === 'partially_classified';
  }

  return transaction.status === 'skipped';
}

function matchesTimelineStatusFilter(
  transaction: Transaction,
  statusFilter: TimelineStatusFilter,
): boolean {
  return statusFilter === 'all' || transaction.status === statusFilter;
}

function getMerchantKeywordSuggestions(
  normalizedMerchant: string,
): ClassificationSuggestion[] {
  const merchantSuggestionTemplates = [
    {
      categoryId: 'food_drink' as const,
      itemLabel: 'Coffee run',
      keywords: ['cafe', 'chai', 'coffee', 'tokai'],
      reason: 'Merchant looks like food or drink',
    },
    {
      categoryId: 'groceries' as const,
      itemLabel: 'Groceries',
      keywords: ['basket', 'blinkit', 'fresh', 'grocery', 'mart'],
      reason: 'Merchant looks like groceries',
    },
    {
      categoryId: 'transport' as const,
      itemLabel: 'Commute',
      keywords: ['fuel', 'metro', 'ola', 'rapido', 'uber'],
      reason: 'Merchant looks like transport',
    },
    {
      categoryId: 'bills' as const,
      itemLabel: 'Monthly bill',
      keywords: ['bill', 'broadband', 'electric', 'utility'],
      reason: 'Merchant looks like a bill or utility',
    },
    {
      categoryId: 'shopping' as const,
      itemLabel: 'Shopping',
      keywords: ['amazon', 'mall', 'shop', 'store'],
      reason: 'Merchant looks like shopping',
    },
  ];

  return merchantSuggestionTemplates
    .filter((template) =>
      template.keywords.some((keyword) => normalizedMerchant.includes(keyword)),
    )
    .map((template, index) => ({
      categoryId: template.categoryId,
      id: `heuristic_${template.categoryId}_${index}`,
      itemLabel: template.itemLabel,
      reason: template.reason,
    }));
}

function matchesSourceAppFilter(
  transaction: Transaction,
  sourceAppFilter: InboxFilters['sourceApp'],
): boolean {
  return sourceAppFilter === 'all' || transaction.sourceApp === sourceAppFilter;
}

function matchesMerchantFilter(
  transaction: Transaction,
  merchantQuery: string,
): boolean {
  const normalizedQuery = merchantQuery.trim().toLowerCase();

  return (
    normalizedQuery.length === 0 ||
    transaction.merchant.toLowerCase().includes(normalizedQuery)
  );
}

function matchesTimelineQuery(
  transaction: Transaction,
  query: string,
): boolean {
  const normalizedTokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (normalizedTokens.length === 0) {
    return true;
  }

  const searchHaystacks = [
    transaction.merchant,
    transaction.note ?? '',
    transaction.sourceApp,
    getTransactionStatusLabel(transaction.status),
    ...transaction.items.map((item) => item.label),
    ...transaction.items.map((item) => getCategoryLabel(item.categoryId)),
  ].map((value) => value.toLowerCase());

  return normalizedTokens.every((token) =>
    searchHaystacks.some((haystack) => haystack.includes(token)),
  );
}

function matchesAmountFilter(
  transaction: Transaction,
  amountFilter: InboxAmountFilter,
): boolean {
  switch (amountFilter) {
    case 'under_250':
      return transaction.amountMinor < 25000;
    case 'between_250_and_500':
      return transaction.amountMinor >= 25000 && transaction.amountMinor <= 50000;
    case 'over_500':
      return transaction.amountMinor > 50000;
    case 'all':
    default:
      return true;
  }
}

function matchesAgeFilter(
  transaction: Transaction,
  ageFilter: InboxAgeFilter,
  now: string,
): boolean {
  if (ageFilter === 'all') {
    return true;
  }

  const transactionDate = new Date(transaction.capturedAt);
  const referenceDate = new Date(now);
  const todayStart = getStartOfDay(referenceDate);
  const threeDaysAgoStart = new Date(todayStart);

  threeDaysAgoStart.setDate(threeDaysAgoStart.getDate() - 3);

  if (ageFilter === 'today') {
    return transactionDate >= todayStart;
  }

  if (ageFilter === 'last_3_days') {
    return transactionDate >= threeDaysAgoStart && transactionDate < todayStart;
  }

  return transactionDate < threeDaysAgoStart;
}

function matchesTimelineDateFilter(
  transaction: Transaction,
  dateFilter: TimelineDateFilter,
  now: string,
): boolean {
  if (dateFilter === 'all') {
    return true;
  }

  const transactionDate = new Date(transaction.capturedAt);
  const referenceDate = new Date(now);
  const todayStart = getStartOfDay(referenceDate);

  if (dateFilter === 'today') {
    return transactionDate >= todayStart;
  }

  const sevenDaysAgoStart = new Date(todayStart);
  sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 6);

  if (dateFilter === 'last_7_days') {
    return transactionDate >= sevenDaysAgoStart;
  }

  const thirtyDaysAgoStart = new Date(todayStart);
  thirtyDaysAgoStart.setDate(thirtyDaysAgoStart.getDate() - 29);

  if (dateFilter === 'last_30_days') {
    return transactionDate >= thirtyDaysAgoStart;
  }

  return transactionDate < thirtyDaysAgoStart;
}

function getCycleWindow(
  anchorDate: Date,
  cycleStartDay: number,
): { cycleEnd: Date; cycleStart: Date } {
  let cycleStart = buildCycleAnchor(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    cycleStartDay,
  );

  if (anchorDate < cycleStart) {
    cycleStart = buildCycleAnchor(
      anchorDate.getFullYear(),
      anchorDate.getMonth() - 1,
      cycleStartDay,
    );
  }

  return {
    cycleEnd: buildCycleAnchor(
      cycleStart.getFullYear(),
      cycleStart.getMonth() + 1,
      cycleStartDay,
    ),
    cycleStart,
  };
}

function buildCycleAnchor(
  year: number,
  monthIndex: number,
  cycleStartDay: number,
): Date {
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();

  return new Date(
    year,
    monthIndex,
    Math.min(cycleStartDay, lastDayOfMonth),
    0,
    0,
    0,
    0,
  );
}

function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function updateTransactionStatus(
  transactions: Transaction[],
  transactionId: string,
  status: Extract<TransactionStatus, 'skipped' | 'uncategorized'>,
  summary: string,
): Transaction[] {
  return transactions.map((transaction) =>
    transaction.id === transactionId
      ? {
          ...transaction,
          history: appendTransactionHistoryEntry(
            transaction.history,
            createHistoryEntry(
              transaction.id,
              status === 'skipped' ? 'skipped' : 'restored',
              summary,
            ),
          ),
          status,
        }
      : transaction,
  );
}

function formatMinorForInput(amountMinor: number): string {
  const whole = Math.trunc(amountMinor / 100);
  const fractional = Math.abs(amountMinor % 100);

  return fractional === 0
    ? `${whole}`
    : `${whole}.${`${fractional}`.padStart(2, '0')}`;
}

function getRemainderLabel(
  remainderDisposition: Exclude<SplitRemainderDisposition, 'leave_unresolved'>,
): string {
  switch (remainderDisposition) {
    case 'tip':
      return 'Tip';
    case 'tax':
      return 'Tax';
    case 'fees':
      return 'Fees';
    case 'unknown':
    default:
      return 'Unknown remainder';
  }
}

function getTopCategoryLabel(categorySpend: Map<CategoryId, number>): string {
  let topCategoryId: CategoryId | null = null;
  let topCategorySpend = -1;

  for (const [categoryId, spendMinor] of categorySpend.entries()) {
    if (spendMinor > topCategorySpend) {
      topCategoryId = categoryId;
      topCategorySpend = spendMinor;
    }
  }

  if (topCategoryId === null) {
    return 'Needs data';
  }

  return (
    categoryOptions.find((category) => category.id === topCategoryId)?.label ??
    'Needs data'
  );
}

function getTopMerchantLabel(merchantSpend: Map<string, number>): string {
  let topMerchantLabel = 'Needs data';
  let topMerchantSpend = -1;

  for (const [merchantLabel, spendMinor] of merchantSpend.entries()) {
    if (spendMinor > topMerchantSpend) {
      topMerchantLabel = merchantLabel;
      topMerchantSpend = spendMinor;
    }
  }

  return topMerchantLabel;
}

function appendTransactionHistoryEntry(
  history: Transaction['history'],
  nextEntry: TransactionHistoryEntry,
): TransactionHistoryEntry[] {
  return [...(history ?? []), nextEntry];
}

function createHistoryEntry(
  transactionId: string,
  kind: TransactionHistoryKind,
  summary: string,
  at = new Date().toISOString(),
): TransactionHistoryEntry {
  return {
    at,
    id: `${transactionId}_${kind}_${Date.parse(at) || Date.now()}`,
    kind,
    summary,
  };
}

function getCategoryLabel(categoryId: CategoryId): string {
  return (
    categoryOptions.find((category) => category.id === categoryId)?.label ??
    'Needs category'
  );
}

function formatTimelineDayLabel(dayKey: string, now: string): string {
  const dayDate = new Date(`${dayKey}T00:00:00`);
  const referenceDate = new Date(now);
  const todayStart = getStartOfDay(referenceDate);
  const yesterdayStart = new Date(todayStart);

  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (dayDate.getTime() === todayStart.getTime()) {
    return 'Today';
  }

  if (dayDate.getTime() === yesterdayStart.getTime()) {
    return 'Yesterday';
  }

  const month = MONTH_LABELS[dayDate.getMonth()] ?? 'Date';

  if (dayDate.getFullYear() === referenceDate.getFullYear()) {
    return `${month} ${dayDate.getDate()}`;
  }

  return `${month} ${dayDate.getDate()}, ${dayDate.getFullYear()}`;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
