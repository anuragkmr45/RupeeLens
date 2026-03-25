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
  status: 'classified' | 'uncategorized';
}

export interface ClassificationDraft {
  categoryId: CategoryId | null;
  itemLabel: string;
}

export interface DashboardSummary {
  classifiedCount: number;
  inboxCount: number;
  topCategoryLabel: string;
  topMerchantLabel: string;
  totalSpendMinor: number;
}

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

export function getPendingTransactions(
  transactions: Transaction[],
): Transaction[] {
  return transactions
    .filter((transaction) => transaction.status === 'uncategorized')
    .sort(
      (left, right) =>
        new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime(),
    );
}

export function getTransactionById(
  transactions: Transaction[],
  transactionId: string,
): Transaction | null {
  return transactions.find((transaction) => transaction.id === transactionId) ?? null;
}

export function summarizeDashboard(
  transactions: Transaction[],
): DashboardSummary {
  const merchantSpend = new Map<string, number>();
  const categorySpend = new Map<CategoryId, number>();

  let classifiedCount = 0;
  let inboxCount = 0;
  let totalSpendMinor = 0;

  for (const transaction of transactions) {
    totalSpendMinor += transaction.amountMinor;
    merchantSpend.set(
      transaction.merchant,
      (merchantSpend.get(transaction.merchant) ?? 0) + transaction.amountMinor,
    );

    if (transaction.status === 'uncategorized') {
      inboxCount += 1;
      continue;
    }

    classifiedCount += 1;

    for (const item of transaction.items) {
      categorySpend.set(
        item.categoryId,
        (categorySpend.get(item.categoryId) ?? 0) + item.amountMinor,
      );
    }
  }

  return {
    classifiedCount,
    inboxCount,
    topCategoryLabel: getTopCategoryLabel(categorySpend),
    topMerchantLabel: getTopMerchantLabel(merchantSpend),
    totalSpendMinor,
  };
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
