import {
  appendSplitDraftRow,
  buildSplitDraft,
  classifyTransaction,
  createSplitDraftRow,
  DEFAULT_INBOX_FILTERS,
  DEFAULT_TIMELINE_FILTERS,
  deleteTransaction,
  getClassificationSuggestions,
  getInboxReviewTransactions,
  getPendingTransactions,
  getTimelineDayGroups,
  getTimelineTransactions,
  getTransactionStatusLabel,
  getUnresolvedAmountMinor,
  isClassificationReady,
  isSplitDraftReady,
  moveSplitDraftRow,
  removeSplitDraftRow,
  restoreSkippedTransaction,
  seededTransactions,
  skipTransaction,
  splitTransaction,
  summarizeSplitDraft,
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

  it('searches timeline transactions by merchant, item, category, source app, status, and date filters', () => {
    const transactions: Transaction[] = [
      ...seededTransactions,
      {
        amountMinor: 49900,
        capturedAt: '2026-02-10T10:00:00+05:30',
        id: 'txn_airtel',
        items: [
          {
            amountMinor: 49900,
            categoryId: 'bills',
            id: 'txn_airtel_item_1',
            label: 'Fiber bill',
          },
        ],
        merchant: 'Airtel Broadband',
        sourceApp: 'Google Pay',
        status: 'classified',
      },
    ];

    expect(
      getTimelineTransactions(
        transactions,
        {
          ...DEFAULT_TIMELINE_FILTERS,
          query: 'transport',
          statusFilter: 'classified',
        },
        '2026-03-25T10:00:00+05:30',
      ).map((transaction) => transaction.id),
    ).toEqual(['txn_metro']);

    expect(
      getTimelineTransactions(
        transactions,
        {
          ...DEFAULT_TIMELINE_FILTERS,
          amountFilter: 'over_500',
          query: 'phonepe',
          sourceApp: 'PhonePe',
        },
        '2026-03-25T10:00:00+05:30',
      ).map((transaction) => transaction.id),
    ).toEqual(['txn_blinkit']);

    expect(
      getTimelineTransactions(
        transactions,
        {
          ...DEFAULT_TIMELINE_FILTERS,
          dateFilter: 'older',
          query: 'fiber',
        },
        '2026-03-25T10:00:00+05:30',
      ).map((transaction) => transaction.id),
    ).toEqual(['txn_airtel']);
  });

  it('groups timeline results by day and exposes honest status helpers', () => {
    const timelineGroups = getTimelineDayGroups(
      seededTransactions,
      DEFAULT_TIMELINE_FILTERS,
      '2026-03-25T10:00:00+05:30',
    );

    expect(timelineGroups.map((group) => ({
      count: group.transactions.length,
      label: group.label,
    }))).toEqual([
      { count: 3, label: 'Today' },
      { count: 1, label: 'Yesterday' },
      { count: 1, label: 'Mar 23' },
    ]);

    expect(getTransactionStatusLabel('uncategorized')).toBe('Needs review');
    expect(getTransactionStatusLabel('partially_classified')).toBe('Partially classified');
    expect(getUnresolvedAmountMinor({
      amountMinor: 18_000,
      capturedAt: '2026-03-25T09:12:00+05:30',
      id: 'txn_partial',
      items: [
        {
          amountMinor: 12_000,
          categoryId: 'food_drink',
          id: 'txn_partial_item_1',
          label: 'Coffee',
        },
      ],
      merchant: 'Blue Tokai Roasters',
      sourceApp: 'Google Pay',
      status: 'partially_classified',
    })).toBe(6_000);
  });

  it('supports classify, skip, restore, and delete inbox actions', () => {
    const classifiedTransactions = classifyTransaction(seededTransactions, 'txn_blue_tokai', {
      categoryId: 'food_drink',
      itemLabel: ' Cold brew ',
      saveAsRule: false,
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

  it('builds explicit classify suggestions from local history and merchant heuristics', () => {
    const transactions: Transaction[] = [
      {
        amountMinor: 19000,
        capturedAt: '2026-03-22T09:00:00+05:30',
        id: 'txn_history_blue_tokai',
        items: [
          {
            amountMinor: 19000,
            categoryId: 'food_drink',
            id: 'txn_history_blue_tokai_item_1',
            label: 'Cold brew',
          },
        ],
        merchant: 'Blue Tokai Roasters',
        sourceApp: 'Google Pay',
        status: 'classified',
      },
      {
        amountMinor: 18000,
        capturedAt: '2026-03-25T09:12:00+05:30',
        id: 'txn_blue_tokai',
        items: [],
        merchant: 'Blue Tokai Roasters',
        sourceApp: 'Google Pay',
        status: 'uncategorized',
      },
    ];

    expect(
      getClassificationSuggestions(transactions, 'Blue Tokai Roasters', 'txn_blue_tokai'),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          categoryId: 'food_drink',
          itemLabel: 'Cold brew',
          reason: 'Used before for this merchant',
        }),
        expect.objectContaining({
          categoryId: 'food_drink',
          itemLabel: 'Coffee run',
        }),
      ]),
    );

    expect(
      getClassificationSuggestions(seededTransactions, 'Blinkit').map((suggestion) => suggestion.itemLabel),
    ).toContain('Groceries');
    expect(
      isClassificationReady({
        categoryId: 'food_drink',
        itemLabel: ' Coffee run ',
        saveAsRule: true,
      }),
    ).toBe(true);
  });

  it('supports split-row helpers and keeps partially classified transactions in Inbox', () => {
    const blueTokai = seededTransactions.find(
      (transaction) => transaction.id === 'txn_blue_tokai',
    );

    expect(blueTokai).toBeDefined();

    const initialDraft = buildSplitDraft(blueTokai!, {
      categoryId: 'food_drink',
      itemLabel: 'Cold brew',
    });
    const withSecondRow = appendSplitDraftRow(initialDraft);
    const firstRow = withSecondRow.rows[0]!;
    const reorderedDraft = moveSplitDraftRow(
      {
        ...withSecondRow,
        rows: [
          {
            ...firstRow,
            amountInput: '120',
            categoryId: 'food_drink',
            itemLabel: 'Cold brew',
          },
          {
            ...createSplitDraftRow({
              amountMinor: 60_00,
              categoryId: 'shopping',
              itemLabel: 'Beans',
              rowId: 'split_row_2',
            }),
          },
        ],
      },
      'split_row_2',
      'up',
    );
    const trimmedDraft = removeSplitDraftRow(reorderedDraft, reorderedDraft.rows[1]!.id);
    const splitSummary = summarizeSplitDraft(18_000, trimmedDraft);

    expect(splitSummary.readyRows).toEqual([
      expect.objectContaining({
        amountMinor: 6_000,
        categoryId: 'shopping',
        itemLabel: 'Beans',
      }),
    ]);
    expect(splitSummary.remainingMinor).toBe(12_000);
    expect(isSplitDraftReady(18_000, trimmedDraft)).toBe(true);

    const nextTransactions = splitTransaction(
      seededTransactions,
      'txn_blue_tokai',
      trimmedDraft,
    );

    expect(
      getInboxReviewTransactions(nextTransactions, {
        ...DEFAULT_INBOX_FILTERS,
        statusFilter: 'partially_classified',
      }).map((item) => ({
        id: item.transaction.id,
        reviewStatus: item.reviewStatus,
      })),
    ).toEqual([
      {
        id: 'txn_blue_tokai',
        reviewStatus: 'partially_classified',
      },
    ]);
  });

  it('rejects over-allocation and can save an explicit remainder', () => {
    const overAllocatedDraft = {
      remainderCategoryId: null,
      remainderDisposition: 'leave_unresolved' as const,
      rows: [
        createSplitDraftRow({
          amountMinor: 12_000,
          categoryId: 'food_drink',
          itemLabel: 'Coffee',
          rowId: 'row_1',
        }),
        createSplitDraftRow({
          amountMinor: 9_000,
          categoryId: 'shopping',
          itemLabel: 'Beans',
          rowId: 'row_2',
        }),
      ],
    };

    expect(summarizeSplitDraft(18_000, overAllocatedDraft).hasOverAllocation).toBe(true);
    expect(isSplitDraftReady(18_000, overAllocatedDraft)).toBe(false);

    const explicitRemainderDraft = {
      remainderCategoryId: 'food_drink' as const,
      remainderDisposition: 'tip' as const,
      rows: [
        createSplitDraftRow({
          amountMinor: 17_000,
          categoryId: 'food_drink',
          itemLabel: 'Dinner',
          rowId: 'row_1',
        }),
      ],
    };

    const nextTransactions = splitTransaction(
      seededTransactions,
      'txn_blue_tokai',
      explicitRemainderDraft,
    );

    expect(
      nextTransactions.find((transaction) => transaction.id === 'txn_blue_tokai'),
    ).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            amountMinor: 17_000,
            label: 'Dinner',
          }),
          expect.objectContaining({
            amountMinor: 1_000,
            categoryId: 'food_drink',
            label: 'Tip',
          }),
        ],
        status: 'classified',
      }),
    );
  });
});
