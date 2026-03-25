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

export interface Transaction {
  amountMinor: number;
  capturedAt: string;
  id: string;
  items: TransactionItem[];
  merchant: string;
  sourceApp: string;
  status: TransactionStatus;
}

export interface ClassificationDraft {
  categoryId: CategoryId | null;
  itemLabel: string;
}

export interface ManualEntryInput {
  amountMinor: number;
  capturedAt?: string;
  categoryId: CategoryId;
  itemLabel: string;
  merchant: string;
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

export type TransactionStatus = 'classified' | 'skipped' | 'uncategorized';

export type InboxStatusFilter = 'all' | 'needs_review' | 'skipped';
export type InboxAmountFilter = 'all' | 'under_250' | 'between_250_and_500' | 'over_500';
export type InboxAgeFilter = 'all' | 'today' | 'last_3_days' | 'older';

export interface InboxFilters {
  ageFilter: InboxAgeFilter;
  amountFilter: InboxAmountFilter;
  merchantQuery: string;
  sourceApp: string | 'all';
  statusFilter: InboxStatusFilter;
}

export interface InboxReviewItem {
  reviewStatus: Extract<TransactionStatus, 'skipped' | 'uncategorized'>;
  transaction: Transaction;
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

export const seededTransactions: Transaction[] = [
  {
    amountMinor: 18000,
    capturedAt: '2026-03-25T09:12:00+05:30',
    id: 'txn_blue_tokai',
    items: [],
    merchant: 'Blue Tokai Roasters',
    sourceApp: 'Google Pay',
    status: 'uncategorized',
  },
  {
    amountMinor: 64000,
    capturedAt: '2026-03-25T08:34:00+05:30',
    id: 'txn_blinkit',
    items: [],
    merchant: 'Blinkit',
    sourceApp: 'PhonePe',
    status: 'uncategorized',
  },
  {
    amountMinor: 32000,
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
  },
  {
    amountMinor: 21500,
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
  },
  {
    amountMinor: 42000,
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
  },
];

export function buildClassificationDraft(
  transaction: Transaction,
): ClassificationDraft {
  const firstItem = transaction.items[0];

  return {
    categoryId: firstItem?.categoryId ?? null,
    itemLabel: firstItem?.label ?? '',
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
  sourceApp = 'Manual entry',
  transactionId = `txn_manual_${Date.now()}`,
}: ManualEntryInput): Transaction {
  const normalizedMerchant = merchant.trim();
  const normalizedItemLabel = itemLabel.trim();

  return {
    amountMinor,
    capturedAt,
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
    sourceApp,
    status: 'classified',
  };
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
    .filter((transaction) => transaction.status === 'uncategorized');
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
      reviewStatus: transaction.status === 'skipped' ? 'skipped' : 'uncategorized',
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

export function getTransactionById(
  transactions: Transaction[],
  transactionId: string,
): Transaction | null {
  return transactions.find((transaction) => transaction.id === transactionId) ?? null;
}

export function classifyTransaction(
  transactions: Transaction[],
  transactionId: string,
  classification: ClassificationDraft,
): Transaction[] {
  if (!classification.categoryId || !classification.itemLabel.trim()) {
    return transactions;
  }

  const categoryId = classification.categoryId;
  const itemLabel = classification.itemLabel.trim();

  return transactions.map((transaction) => {
    if (transaction.id !== transactionId) {
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
      status: 'classified',
    };
  });
}

export function skipTransaction(
  transactions: Transaction[],
  transactionId: string,
): Transaction[] {
  return updateTransactionStatus(transactions, transactionId, 'skipped');
}

export function restoreSkippedTransaction(
  transactions: Transaction[],
  transactionId: string,
): Transaction[] {
  return updateTransactionStatus(transactions, transactionId, 'uncategorized');
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

    if (transaction.status === 'uncategorized') {
      inboxCount += 1;
      continue;
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
    return transaction.status === 'uncategorized' || transaction.status === 'skipped';
  }

  if (statusFilter === 'needs_review') {
    return transaction.status === 'uncategorized';
  }

  return transaction.status === 'skipped';
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
): Transaction[] {
  return transactions.map((transaction) =>
    transaction.id === transactionId ? { ...transaction, status } : transaction,
  );
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
