import {
  classifyTransaction,
  DEFAULT_INBOX_FILTERS,
  deleteTransaction,
  getInboxReviewTransactions,
  getPendingTransactions,
  restoreSkippedTransaction,
  seededTransactions,
  skipTransaction,
  summarizeDashboard,
  type Transaction,
} from '../src/features/spend-tracker/domain';

describe('spend-tracker dashboard summary', () => {
  it('calculates seeded dashboard KPIs, top items, and recent activity', () => {
    const summary = summarizeDashboard(seededTransactions, {
      budgetTargetMinor: 500000,
      cycleStartDay: 1,
      now: '2026-03-25T10:00:00+05:30',
    });

    expect(summary.totalSpendMinor).toBe(177500);
    expect(summary.inboxCount).toBe(2);
    expect(summary.topCategoryLabel).toBe('Groceries');
    expect(summary.topMerchantLabel).toBe('Blinkit');
    expect(summary.topItems.map((item) => item.label)).toEqual([
      'Weekly vegetables',
      'Metro card top-up',
      'Flat white and cookie',
    ]);
    expect(summary.recentActivity.map((transaction) => transaction.id)).toEqual([
      'txn_blue_tokai',
      'txn_blinkit',
      'txn_metro',
    ]);
    expect(summary.budgetUsedRatio).toBeCloseTo(0.355, 3);
  });

  it('filters the current period using the configured cycle start day', () => {
    const transactions: Transaction[] = [
      {
        amountMinor: 18000,
        capturedAt: '2026-03-24T18:30:00+05:30',
        id: 'txn_in_cycle',
        items: [
          {
            amountMinor: 18000,
            categoryId: 'food_drink',
            id: 'txn_in_cycle_item_1',
            label: 'Dinner',
          },
        ],
        merchant: 'Neighbourhood Cafe',
        sourceApp: 'PhonePe',
        status: 'classified',
      },
      {
        amountMinor: 9900,
        capturedAt: '2026-02-20T08:00:00+05:30',
        id: 'txn_previous_cycle',
        items: [
          {
            amountMinor: 9900,
            categoryId: 'transport',
            id: 'txn_previous_cycle_item_1',
            label: 'Auto ride',
          },
        ],
        merchant: 'Rapido',
        sourceApp: 'Google Pay',
        status: 'classified',
      },
    ];

    const summary = summarizeDashboard(transactions, {
      budgetTargetMinor: 100000,
      cycleStartDay: 26,
      now: '2026-03-25T10:00:00+05:30',
    });

    expect(summary.totalSpendMinor).toBe(18000);
    expect(summary.topItems.map((item) => item.label)).toEqual(['Dinner']);
    expect(summary.recentActivity.map((transaction) => transaction.id)).toEqual([
      'txn_in_cycle',
    ]);
  });

  it('filters inbox review items by status, merchant, source app, amount, and age', () => {
    const transactions: Transaction[] = [
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
        capturedAt: '2026-03-20T08:34:00+05:30',
        id: 'txn_blinkit',
        items: [],
        merchant: 'Blinkit',
        sourceApp: 'PhonePe',
        status: 'skipped',
      },
      {
        amountMinor: 30000,
        capturedAt: '2026-03-23T08:34:00+05:30',
        id: 'txn_pharmacy',
        items: [],
        merchant: 'Apollo Pharmacy',
        sourceApp: 'Paytm',
        status: 'uncategorized',
      },
    ];

    expect(
      getInboxReviewTransactions(
        transactions,
        {
          ...DEFAULT_INBOX_FILTERS,
          ageFilter: 'older',
          amountFilter: 'over_500',
          sourceApp: 'PhonePe',
          statusFilter: 'all',
        },
        '2026-03-25T10:00:00+05:30',
      ).map((item) => item.transaction.id),
    ).toEqual(['txn_blinkit']);

    expect(
      getInboxReviewTransactions(
        transactions,
        {
          ...DEFAULT_INBOX_FILTERS,
          ageFilter: 'last_3_days',
          amountFilter: 'between_250_and_500',
          merchantQuery: 'apollo',
        },
        '2026-03-25T10:00:00+05:30',
      ).map((item) => item.transaction.id),
    ).toEqual(['txn_pharmacy']);
  });

  it('supports classify, skip, restore, and delete inbox actions', () => {
    const classifiedTransactions = classifyTransaction(seededTransactions, 'txn_blue_tokai', {
      categoryId: 'food_drink',
      itemLabel: ' Cold brew ',
    });

    expect(
      classifiedTransactions.find((transaction) => transaction.id === 'txn_blue_tokai'),
    ).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            categoryId: 'food_drink',
            label: 'Cold brew',
          }),
        ],
        status: 'classified',
      }),
    );

    const skippedTransactions = skipTransaction(seededTransactions, 'txn_blue_tokai');
    expect(getPendingTransactions(skippedTransactions).map((transaction) => transaction.id)).toEqual([
      'txn_blinkit',
    ]);

    const restoredTransactions = restoreSkippedTransaction(
      skippedTransactions,
      'txn_blue_tokai',
    );
    expect(
      getPendingTransactions(restoredTransactions).map((transaction) => transaction.id),
    ).toEqual(['txn_blue_tokai', 'txn_blinkit']);

    expect(deleteTransaction(restoredTransactions, 'txn_blue_tokai')).toHaveLength(
      restoredTransactions.length - 1,
    );
  });
});
