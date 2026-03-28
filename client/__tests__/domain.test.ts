import {
  addCustomCategory,
  applyAutoClassificationRules,
  appendSplitDraftRow,
  buildSplitDraft,
  canDeleteCategory,
  classifyTransaction,
  createSplitDraftRow,
  DEFAULT_BUDGET_ALERT_SETTINGS,
  DEFAULT_INBOX_FILTERS,
  DEFAULT_TIMELINE_FILTERS,
  deleteTransaction,
  deleteCustomCategory,
  getClassificationSuggestions,
  getDefaultCategories,
  getInboxReviewTransactions,
  getMerchantReviewCandidates,
  getPendingTransactions,
  getTimelineDayGroups,
  getTimelineTransactions,
  getTransactionStatusLabel,
  getUnresolvedAmountMinor,
  isClassificationReady,
  isSplitDraftReady,
  mergeCategories,
  mergeRuleCategories,
  mergeRuleMerchants,
  mergeMerchants,
  moveSplitDraftRow,
  markBudgetAlertsReviewed,
  reconcileMerchantState,
  removeSplitDraftRow,
  restoreSkippedTransaction,
  saveClassificationRule,
  scheduleBudgetThresholdAlerts,
  seededTransactions,
  skipTransaction,
  splitMerchantAlias,
  splitTransaction,
  summarizeBudgets,
  summarizeInsights,
  summarizeCategoryUsage,
  summarizeSplitDraft,
  summarizeDashboard,
  type BudgetDefinition,
  updateCustomCategory,
  type SpendRule,
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

  it('summarizes monthly, weekly, rolling, and custom budgets with canonical local math', () => {
    const transactions: Transaction[] = [
      {
        amountMinor: 42000,
        capturedAt: '2026-04-29T09:30:00+05:30',
        id: 'txn_blinkit_recent',
        items: [
          {
            amountMinor: 42000,
            categoryId: 'groceries',
            id: 'txn_blinkit_recent_item_1',
            label: 'Fresh groceries',
          },
        ],
        merchant: 'Blinkit',
        sourceApp: 'PhonePe',
        status: 'classified',
      },
      {
        amountMinor: 22000,
        capturedAt: '2026-04-28T08:00:00+05:30',
        id: 'txn_commute_weekly',
        items: [
          {
            amountMinor: 22000,
            categoryId: 'transport',
            id: 'txn_commute_weekly_item_1',
            label: 'Metro recharge',
          },
        ],
        merchant: 'Bangalore Metro',
        sourceApp: 'Paytm',
        status: 'classified',
      },
      {
        amountMinor: 18000,
        capturedAt: '2026-04-27T09:15:00+05:30',
        id: 'txn_coffee_salary_cycle',
        items: [
          {
            amountMinor: 18000,
            categoryId: 'food_drink',
            id: 'txn_coffee_salary_cycle_item_1',
            label: 'Flat white',
          },
        ],
        merchant: 'Blue Tokai Roasters',
        sourceApp: 'Google Pay',
        status: 'classified',
      },
      {
        amountMinor: 30000,
        capturedAt: '2026-04-01T18:10:00+05:30',
        id: 'txn_monthly_bill',
        items: [
          {
            amountMinor: 30000,
            categoryId: 'bills',
            id: 'txn_monthly_bill_item_1',
            label: 'Internet bill',
          },
        ],
        merchant: 'Airtel Broadband',
        sourceApp: 'Google Pay',
        status: 'classified',
      },
      {
        amountMinor: 50000,
        capturedAt: '2026-04-22T20:00:00+05:30',
        id: 'txn_blinkit_old',
        items: [
          {
            amountMinor: 50000,
            categoryId: 'groceries',
            id: 'txn_blinkit_old_item_1',
            label: 'Bulk pantry',
          },
        ],
        merchant: 'Blinkit',
        sourceApp: 'PhonePe',
        status: 'classified',
      },
      {
        amountMinor: 16000,
        capturedAt: '2026-03-29T09:00:00+05:30',
        id: 'txn_previous_salary_cycle',
        items: [
          {
            amountMinor: 16000,
            categoryId: 'food_drink',
            id: 'txn_previous_salary_cycle_item_1',
            label: 'Flat white',
          },
        ],
        merchant: 'Blue Tokai Roasters',
        sourceApp: 'Google Pay',
        status: 'classified',
      },
    ];
    const budgets: BudgetDefinition[] = [
      {
        createdAt: '2026-04-01T00:00:00+05:30',
        id: 'budget_monthly_overall',
        label: 'Monthly household',
        period: 'monthly',
        scope: 'overall',
        targetMinor: 200000,
        updatedAt: '2026-04-01T00:00:00+05:30',
      },
      {
        categoryId: 'transport',
        createdAt: '2026-04-01T00:00:00+05:30',
        id: 'budget_weekly_transport',
        label: 'Weekly commute',
        period: 'weekly',
        scope: 'category',
        targetMinor: 60000,
        updatedAt: '2026-04-01T00:00:00+05:30',
        weekStartsOn: 1,
      },
      {
        createdAt: '2026-04-01T00:00:00+05:30',
        id: 'budget_rolling_blinkit',
        label: 'Blinkit rolling',
        merchantLabel: 'Blinkit',
        merchantNormalizedLabel: 'blinkit',
        period: 'rolling',
        rollingWindowDays: 7,
        scope: 'merchant',
        targetMinor: 100000,
        updatedAt: '2026-04-01T00:00:00+05:30',
      },
      {
        createdAt: '2026-04-01T00:00:00+05:30',
        id: 'budget_salary_cycle_coffee',
        itemLabel: 'Flat white',
        label: 'Salary-cycle coffee',
        period: 'custom',
        scope: 'item',
        startsOnDay: 26,
        targetMinor: 50000,
        updatedAt: '2026-04-01T00:00:00+05:30',
      },
    ];

    const summaries = summarizeBudgets(
      transactions,
      budgets,
      '2026-04-30T10:00:00+05:30',
    );

    const monthlySummary = summaries.find(
      (summary) => summary.budget.id === 'budget_monthly_overall',
    );
    const weeklySummary = summaries.find(
      (summary) => summary.budget.id === 'budget_weekly_transport',
    );
    const rollingSummary = summaries.find(
      (summary) => summary.budget.id === 'budget_rolling_blinkit',
    );
    const customSummary = summaries.find(
      (summary) => summary.budget.id === 'budget_salary_cycle_coffee',
    );

    expect(monthlySummary).toEqual(
      expect.objectContaining({
        spentMinor: 162000,
        thresholdState: 'warning',
      }),
    );
    expect(new Date(monthlySummary?.cycleStart ?? '').toISOString()).toBe(
      new Date('2026-04-01T00:00:00+05:30').toISOString(),
    );
    expect(new Date(monthlySummary?.cycleEnd ?? '').toISOString()).toBe(
      new Date('2026-05-01T00:00:00+05:30').toISOString(),
    );

    expect(weeklySummary).toEqual(
      expect.objectContaining({
        matchedItemCount: 1,
        spentMinor: 22000,
        thresholdState: 'on_track',
      }),
    );
    expect(new Date(weeklySummary?.cycleStart ?? '').toISOString()).toBe(
      new Date('2026-04-27T00:00:00+05:30').toISOString(),
    );

    expect(rollingSummary).toEqual(
      expect.objectContaining({
        matchedTransactionCount: 1,
        spentMinor: 42000,
        thresholdState: 'on_track',
      }),
    );
    expect(new Date(rollingSummary?.cycleStart ?? '').toISOString()).toBe(
      new Date('2026-04-24T00:00:00+05:30').toISOString(),
    );

    expect(customSummary).toEqual(
      expect.objectContaining({
        matchedItemCount: 1,
        spentMinor: 18000,
        thresholdState: 'at_risk',
      }),
    );
    expect(new Date(customSummary?.cycleStart ?? '').toISOString()).toBe(
      new Date('2026-04-26T00:00:00+05:30').toISOString(),
    );
  });

  it('uses the canonical budget engine for dashboard budget progress', () => {
    const budgets: BudgetDefinition[] = [
      {
        createdAt: '2026-03-01T00:00:00+05:30',
        id: 'budget_overall_salary_cycle',
        label: 'Salary-cycle plan',
        period: 'custom',
        scope: 'overall',
        startsOnDay: 26,
        targetMinor: 150000,
        updatedAt: '2026-03-01T00:00:00+05:30',
      },
    ];
    const budgetSummary = summarizeBudgets(
      seededTransactions,
      budgets,
      '2026-03-25T10:00:00+05:30',
    )[0];
    const dashboardSummary = summarizeDashboard(
      seededTransactions,
      {
        budgetTargetMinor: 500000,
        budgets,
        cycleStartDay: 1,
        now: '2026-03-25T10:00:00+05:30',
      },
      getDefaultCategories(),
    );

    expect(dashboardSummary.budgetLabel).toBe('Salary-cycle plan');
    expect(dashboardSummary.budgetProjectedSpendMinor).toBe(
      budgetSummary?.projectedSpendMinor,
    );
    expect(dashboardSummary.budgetTargetMinor).toBe(budgetSummary?.budget.targetMinor);
    expect(dashboardSummary.budgetThresholdState).toBe(budgetSummary?.thresholdState);
    expect(dashboardSummary.budgetRemainingMinor).toBe(budgetSummary?.remainingMinor);
  });

  it('updates category budget progress immediately after classification changes', () => {
    const categoryBudget: BudgetDefinition[] = [
      {
        categoryId: 'food_drink',
        createdAt: '2026-03-01T00:00:00+05:30',
        id: 'budget_food_drink_monthly',
        label: 'Coffee and snacks',
        period: 'monthly',
        scope: 'category',
        targetMinor: 50000,
        updatedAt: '2026-03-01T00:00:00+05:30',
      },
    ];
    const beforeClassification = summarizeBudgets(
      seededTransactions,
      categoryBudget,
      '2026-03-25T10:00:00+05:30',
    )[0];
    const afterClassificationTransactions = classifyTransaction(
      seededTransactions,
      'txn_blue_tokai',
      {
        autoApplyRule: false,
        categoryId: 'food_drink',
        itemLabel: 'Cold brew',
        saveAsRule: false,
      },
      getDefaultCategories(),
    );
    const afterClassification = summarizeBudgets(
      afterClassificationTransactions,
      categoryBudget,
      '2026-03-25T10:00:00+05:30',
    )[0];

    expect(beforeClassification?.spentMinor).toBe(21500);
    expect(afterClassification?.spentMinor).toBe(39500);
    expect(afterClassification?.matchedItemCount).toBeGreaterThan(
      beforeClassification?.matchedItemCount ?? 0,
    );
  });

  it('schedules budget threshold alerts once per cycle and respects quiet mode', () => {
    const budget: BudgetDefinition[] = [
      {
        createdAt: '2026-04-01T00:00:00+05:30',
        id: 'budget_household_monthly',
        label: 'Household budget',
        period: 'monthly',
        scope: 'overall',
        targetMinor: 100000,
        updatedAt: '2026-04-01T00:00:00+05:30',
      },
    ];
    const firstPassTransactions: Transaction[] = [
      {
        amountMinor: 85000,
        capturedAt: '2026-04-29T21:00:00+05:30',
        id: 'txn_threshold_crossing',
        items: [
          {
            amountMinor: 85000,
            categoryId: 'groceries',
            id: 'txn_threshold_crossing_item_1',
            label: 'Groceries',
          },
        ],
        merchant: 'Blinkit',
        sourceApp: 'PhonePe',
        status: 'classified',
      },
    ];

    const quietAlerts = scheduleBudgetThresholdAlerts(
      firstPassTransactions,
      budget,
      [],
      DEFAULT_BUDGET_ALERT_SETTINGS,
      '2026-04-29T23:15:00+05:30',
    );

    expect(quietAlerts.map((alert) => alert.thresholdPercent).sort()).toEqual([50, 80]);
    expect(quietAlerts.every((alert) => alert.status === 'quieted')).toBe(true);

    const repeatedQuietAlerts = scheduleBudgetThresholdAlerts(
      firstPassTransactions,
      budget,
      quietAlerts,
      DEFAULT_BUDGET_ALERT_SETTINGS,
      '2026-04-29T23:30:00+05:30',
    );

    expect(repeatedQuietAlerts).toHaveLength(2);

    const overBudgetTransactions: Transaction[] = [
      ...firstPassTransactions,
      {
        amountMinor: 30000,
        capturedAt: '2026-04-30T09:00:00+05:30',
        id: 'txn_over_budget',
        items: [
          {
            amountMinor: 30000,
            categoryId: 'groceries',
            id: 'txn_over_budget_item_1',
            label: 'Household top-up',
          },
        ],
        merchant: 'Bigbasket',
        sourceApp: 'Google Pay',
        status: 'classified',
      },
    ];
    const daytimeAlerts = scheduleBudgetThresholdAlerts(
      overBudgetTransactions,
      budget,
      repeatedQuietAlerts,
      DEFAULT_BUDGET_ALERT_SETTINGS,
      '2026-04-30T09:05:00+05:30',
    );

    expect(
      daytimeAlerts.map((alert) => alert.thresholdPercent).sort((left, right) => left - right),
    ).toEqual([50, 80, 100]);
    expect(daytimeAlerts.filter((alert) => alert.status === 'active')).toHaveLength(3);

    const reviewedAlerts = markBudgetAlertsReviewed(
      daytimeAlerts,
      '2026-04-30T09:10:00+05:30',
    );

    expect(reviewedAlerts.every((alert) => alert.status === 'reviewed')).toBe(true);
    expect(reviewedAlerts.every((alert) => alert.reviewedAt === '2026-04-30T09:10:00+05:30')).toBe(true);
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
        history: [],
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
        note: 'Paid before the due date.',
        parserInfo: {
          confidenceBps: 9600,
          parserId: 'gpay_upi_v1',
          parserVersion: '1.0.0',
        },
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

    expect(
      getTimelineTransactions(
        transactions,
        {
          ...DEFAULT_TIMELINE_FILTERS,
          query: 'due date',
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
      autoApplyRule: false,
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
      getClassificationSuggestions(transactions, {
        amountMinor: 18_000,
        capturedAt: '2026-03-25T09:12:00+05:30',
        currentTransactionId: 'txn_blue_tokai',
        merchant: 'Blue Tokai Roasters',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          explanation: expect.arrayContaining([expect.stringMatching(/^merchant/)]),
          categoryId: 'food_drink',
          itemLabel: 'Cold brew',
          source: 'history',
        }),
        expect.objectContaining({
          categoryId: 'food_drink',
          itemLabel: 'Coffee run',
          source: 'heuristic',
        }),
      ]),
    );

    expect(
      getClassificationSuggestions(seededTransactions, {
        amountMinor: 64_000,
        capturedAt: '2026-03-25T07:50:00+05:30',
        merchant: 'Blinkit',
      }).map((suggestion) => suggestion.itemLabel),
    ).toContain('Groceries');
    expect(
      isClassificationReady({
        autoApplyRule: false,
        categoryId: 'food_drink',
        itemLabel: ' Coffee run ',
        saveAsRule: true,
      }),
    ).toBe(true);
  });

  it('ranks repeated confirmed history above one-off matches and explains the top factors', () => {
    const suggestions = getClassificationSuggestions(
      [
        {
          amountMinor: 18_000,
          capturedAt: '2026-04-06T09:05:00+05:30',
          id: 'txn_flat_white_1',
          items: [
            {
              amountMinor: 18_000,
              categoryId: 'food_drink',
              id: 'txn_flat_white_1_item_1',
              label: 'Flat white',
            },
          ],
          merchant: 'Blue Tokai Roasters',
          sourceApp: 'Google Pay',
          status: 'classified',
        },
        {
          amountMinor: 18_200,
          capturedAt: '2026-04-03T09:10:00+05:30',
          id: 'txn_flat_white_2',
          items: [
            {
              amountMinor: 18_200,
              categoryId: 'food_drink',
              id: 'txn_flat_white_2_item_1',
              label: 'Flat white',
            },
          ],
          merchant: 'Blue Tokai Roasters',
          sourceApp: 'Google Pay',
          status: 'classified',
        },
        {
          amountMinor: 17_900,
          capturedAt: '2026-03-31T09:00:00+05:30',
          id: 'txn_flat_white_3',
          items: [
            {
              amountMinor: 17_900,
              categoryId: 'food_drink',
              id: 'txn_flat_white_3_item_1',
              label: 'Flat white',
            },
          ],
          merchant: 'Blue Tokai Roasters',
          sourceApp: 'Google Pay',
          status: 'classified',
        },
        {
          amountMinor: 18_100,
          capturedAt: '2026-04-05T09:00:00+05:30',
          id: 'txn_cold_brew_1',
          items: [
            {
              amountMinor: 18_100,
              categoryId: 'food_drink',
              id: 'txn_cold_brew_1_item_1',
              label: 'Cold brew',
            },
          ],
          merchant: 'Blue Tokai Roasters',
          sourceApp: 'Google Pay',
          status: 'classified',
        },
      ],
      {
        amountMinor: 18_050,
        capturedAt: '2026-04-08T09:20:00+05:30',
        merchant: 'Blue Tokai Roasters',
      },
    );

    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        autoApply: false,
        itemLabel: 'Flat white',
        reason: expect.stringContaining('Weighted local history favored'),
        source: 'history',
      }),
    );
    expect(suggestions[0]?.explanation).toEqual(
      expect.arrayContaining([
        '3 confirmations',
        expect.stringMatching(/^merchant/),
        expect.stringMatching(/^recent within /),
      ]),
    );
    expect(suggestions.find((suggestion) => suggestion.itemLabel === 'Cold brew')?.score).toBeLessThan(
      suggestions[0]?.score ?? 0,
    );
  });

  it('uses recency to break ties between equally repeated local history candidates', () => {
    const suggestions = getClassificationSuggestions(
      [
        {
          amountMinor: 64_000,
          capturedAt: '2026-04-21T08:35:00+05:30',
          id: 'txn_recent_pantry_1',
          items: [
            {
              amountMinor: 64_000,
              categoryId: 'groceries',
              id: 'txn_recent_pantry_1_item_1',
              label: 'Office pantry',
            },
          ],
          merchant: 'Blinkit',
          sourceApp: 'PhonePe',
          status: 'classified',
        },
        {
          amountMinor: 64_500,
          capturedAt: '2026-04-14T08:30:00+05:30',
          id: 'txn_recent_pantry_2',
          items: [
            {
              amountMinor: 64_500,
              categoryId: 'groceries',
              id: 'txn_recent_pantry_2_item_1',
              label: 'Office pantry',
            },
          ],
          merchant: 'Blinkit',
          sourceApp: 'PhonePe',
          status: 'classified',
        },
        {
          amountMinor: 64_000,
          capturedAt: '2026-02-24T08:40:00+05:30',
          id: 'txn_old_veg_1',
          items: [
            {
              amountMinor: 64_000,
              categoryId: 'groceries',
              id: 'txn_old_veg_1_item_1',
              label: 'Weekly vegetables',
            },
          ],
          merchant: 'Blinkit',
          sourceApp: 'PhonePe',
          status: 'classified',
        },
        {
          amountMinor: 63_500,
          capturedAt: '2026-02-17T08:20:00+05:30',
          id: 'txn_old_veg_2',
          items: [
            {
              amountMinor: 63_500,
              categoryId: 'groceries',
              id: 'txn_old_veg_2_item_1',
              label: 'Weekly vegetables',
            },
          ],
          merchant: 'Blinkit',
          sourceApp: 'PhonePe',
          status: 'classified',
        },
      ],
      {
        amountMinor: 64_200,
        capturedAt: '2026-04-28T08:42:00+05:30',
        merchant: 'Blinkit',
      },
    );

    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        itemLabel: 'Office pantry',
        source: 'history',
      }),
    );
    expect(suggestions[0]?.explanation).toEqual(
      expect.arrayContaining([expect.stringMatching(/^recent within /)]),
    );
    expect(
      suggestions.find((suggestion) => suggestion.itemLabel === 'Weekly vegetables')?.score,
    ).toBeLessThan(suggestions[0]?.score ?? 0);
  });

  it('prioritizes explicit saved rules and only auto-applies user-approved matches', () => {
    const savedRules = saveClassificationRule(
      [],
      {
        amountMinor: 18_000,
        capturedAt: '2026-03-25T09:12:00+05:30',
        merchant: 'Blue Tokai Roasters',
      },
      {
        categoryId: 'food_drink',
        itemLabel: 'Morning coffee',
      },
      {
        autoApply: true,
        now: '2026-03-25T09:15:00+05:30',
      },
    );
    const updatedRules = saveClassificationRule(
      savedRules,
      {
        amountMinor: 18_100,
        capturedAt: '2026-04-01T09:05:00+05:30',
        merchant: 'Blue Tokai Roasters',
      },
      {
        categoryId: 'food_drink',
        itemLabel: 'Flat white',
      },
      {
        autoApply: false,
        now: '2026-04-01T09:15:00+05:30',
      },
    );

    expect(updatedRules).toHaveLength(1);
    expect(updatedRules[0]).toEqual(
      expect.objectContaining({
        autoApply: false,
        categoryId: 'food_drink',
        itemLabel: 'Flat white',
      }),
    );

    const suggestions = getClassificationSuggestions(
      [
        {
          amountMinor: 17_900,
          capturedAt: '2026-03-18T09:10:00+05:30',
          id: 'txn_history_rule_candidate',
          items: [
            {
              amountMinor: 17_900,
              categoryId: 'food_drink',
              id: 'txn_history_rule_candidate_item_1',
              label: 'Cold brew',
            },
          ],
          merchant: 'Blue Tokai Roasters',
          sourceApp: 'Google Pay',
          status: 'classified',
        },
      ],
      {
        amountMinor: 18_050,
        capturedAt: '2026-04-08T09:20:00+05:30',
        merchant: 'Blue Tokai Roasters',
      },
      updatedRules,
    );

    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        autoApply: false,
        itemLabel: 'Flat white',
        source: 'rule',
      }),
    );

    const autoApplyRules = saveClassificationRule(
      [],
      {
        amountMinor: 18_000,
        capturedAt: '2026-03-25T09:12:00+05:30',
        merchant: 'Blue Tokai Roasters',
      },
      {
        categoryId: 'food_drink',
        itemLabel: 'Morning coffee',
      },
      {
        autoApply: true,
        now: '2026-03-25T09:15:00+05:30',
      },
    );

    const autoAppliedTransactions = applyAutoClassificationRules(
      [
        {
          amountMinor: 18_100,
          capturedAt: '2026-04-08T09:20:00+05:30',
          id: 'txn_rule_match',
          items: [],
          merchant: 'Blue Tokai Roasters',
          sourceApp: 'Google Pay',
          status: 'uncategorized',
        },
        {
          amountMinor: 18_100,
          capturedAt: '2026-04-08T21:20:00+05:30',
          id: 'txn_rule_miss',
          items: [],
          merchant: 'Blue Tokai Roasters',
          sourceApp: 'Google Pay',
          status: 'uncategorized',
        },
      ],
      autoApplyRules,
      [],
      [],
      getDefaultCategories(),
    );

    expect(autoAppliedTransactions).toEqual([
      expect.objectContaining({
        id: 'txn_rule_match',
        items: [
          expect.objectContaining({
            categoryId: 'food_drink',
            label: 'Morning coffee',
          }),
        ],
        status: 'classified',
      }),
      expect.objectContaining({
        id: 'txn_rule_miss',
        items: [],
        status: 'uncategorized',
      }),
    ]);
  });

  it('updates saved rules when categories or merchants merge', () => {
    const rules: SpendRule[] = [
      {
        amountBucket: 'under_250',
        autoApply: true,
        categoryId: 'food_drink',
        createdAt: '2026-03-25T09:15:00+05:30',
        hourBucket: 'morning',
        id: 'rule_blue_tokai_under_250_morning_tuesday',
        itemLabel: 'Morning coffee',
        merchantId: 'merchant_blue_tokai',
        merchantLabel: 'Blue Tokai Roasters',
        merchantNormalizedLabel: 'blue tokai roasters',
        updatedAt: '2026-03-25T09:15:00+05:30',
        weekday: 'tuesday',
      },
    ];

    expect(
      mergeRuleCategories(rules, 'food_drink', 'groceries', '2026-03-26T09:00:00+05:30'),
    ).toEqual([
      expect.objectContaining({
        categoryId: 'groceries',
        updatedAt: '2026-03-26T09:00:00+05:30',
      }),
    ]);

    expect(
      mergeRuleMerchants(
        rules,
        'merchant_blue_tokai',
        'merchant_blue_tokai_main',
        [
          {
            id: 'merchant_blue_tokai_main',
            label: 'Blue Tokai',
            normalizedLabel: 'blue tokai',
          },
        ],
        '2026-03-26T09:05:00+05:30',
      ),
    ).toEqual([
      expect.objectContaining({
        merchantId: 'merchant_blue_tokai_main',
        merchantLabel: 'Blue Tokai',
        merchantNormalizedLabel: 'blue tokai',
      }),
    ]);
  });

  it('normalizes repeated merchant variants into one canonical merchant when deterministic rules allow it', () => {
    const merchantDirectory = reconcileMerchantState([
      {
        amountMinor: 25000,
        capturedAt: '2026-03-25T09:12:00+05:30',
        id: 'txn_acme_1',
        items: [],
        merchant: 'Acme Payments Pvt Ltd Store',
        sourceApp: 'Google Pay',
        status: 'uncategorized',
      },
      {
        amountMinor: 26000,
        capturedAt: '2026-03-25T10:12:00+05:30',
        id: 'txn_acme_2',
        items: [],
        merchant: 'ACME Store',
        sourceApp: 'PhonePe',
        status: 'uncategorized',
      },
    ]);

    expect(merchantDirectory.merchants).toEqual([
      expect.objectContaining({
        label: 'Acme Store',
        normalizedLabel: 'acme store',
      }),
    ]);
    expect(merchantDirectory.transactions.map((transaction) => transaction.merchant)).toEqual([
      'Acme Store',
      'Acme Store',
    ]);
    expect(
      merchantDirectory.transactions.map((transaction) => transaction.merchantRaw),
    ).toEqual(['Acme Payments Pvt Ltd Store', 'ACME Store']);
  });

  it('surfaces merchant review candidates without auto-merging lower-confidence variants', () => {
    const merchantDirectory = reconcileMerchantState([
      {
        amountMinor: 19000,
        capturedAt: '2026-03-20T09:00:00+05:30',
        id: 'txn_roasters_1',
        items: [],
        merchant: 'Blue Tokai Roasters',
        sourceApp: 'Google Pay',
        status: 'uncategorized',
      },
      {
        amountMinor: 21000,
        capturedAt: '2026-03-21T09:00:00+05:30',
        id: 'txn_roasters_2',
        items: [],
        merchant: 'Blue Tokai Roasters',
        sourceApp: 'Google Pay',
        status: 'uncategorized',
      },
      {
        amountMinor: 18000,
        capturedAt: '2026-03-22T09:00:00+05:30',
        id: 'txn_roaster_variant',
        items: [],
        merchant: 'Blue Tokai Roaster',
        sourceApp: 'Google Pay',
        status: 'uncategorized',
      },
    ]);

    expect(merchantDirectory.transactions.map((transaction) => transaction.merchant)).toEqual([
      'Blue Tokai Roasters',
      'Blue Tokai Roasters',
      'Blue Tokai Roaster',
    ]);
    expect(getMerchantReviewCandidates(merchantDirectory.merchants, merchantDirectory.transactions)).toEqual([
      expect.objectContaining({
        sourceMerchantLabel: 'Blue Tokai Roaster',
        targetMerchantLabel: 'Blue Tokai Roasters',
      }),
    ]);
  });

  it('creates merchant aliases from explicit merges and can split them back out later', () => {
    const merchantDirectory = reconcileMerchantState([
      {
        amountMinor: 19000,
        capturedAt: '2026-03-20T09:00:00+05:30',
        id: 'txn_roasters_1',
        items: [
          {
            amountMinor: 19000,
            categoryId: 'food_drink',
            id: 'txn_roasters_1_item_1',
            label: 'Cold brew',
          },
        ],
        merchant: 'Blue Tokai Roasters',
        sourceApp: 'Google Pay',
        status: 'classified',
      },
      {
        amountMinor: 18000,
        capturedAt: '2026-03-22T09:00:00+05:30',
        id: 'txn_roaster_variant',
        items: [
          {
            amountMinor: 18000,
            categoryId: 'food_drink',
            id: 'txn_roaster_variant_item_1',
            label: 'Cappuccino',
          },
        ],
        merchant: 'Blue Tokai Roaster',
        sourceApp: 'Google Pay',
        status: 'classified',
      },
    ]);
    const sourceMerchant = merchantDirectory.merchants.find(
      (merchant) => merchant.label === 'Blue Tokai Roaster',
    );
    const targetMerchant = merchantDirectory.merchants.find(
      (merchant) => merchant.label === 'Blue Tokai Roasters',
    );

    expect(sourceMerchant).toBeDefined();
    expect(targetMerchant).toBeDefined();

    const mergedDirectory = mergeMerchants(
      merchantDirectory.merchants,
      merchantDirectory.merchantAliases,
      merchantDirectory.transactions,
      sourceMerchant!.id,
      targetMerchant!.id,
    );

    expect(mergedDirectory.merchantAliases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          alias: 'Blue Tokai Roaster',
          merchantId: targetMerchant!.id,
          source: 'merged',
        }),
      ]),
    );
    expect(
      mergedDirectory.transactions.find((transaction) => transaction.id === 'txn_roaster_variant'),
    ).toEqual(
      expect.objectContaining({
        history: expect.arrayContaining([
          expect.objectContaining({
            kind: 'merchant_merged',
          }),
        ]),
        merchant: 'Blue Tokai Roasters',
      }),
    );
    expect(
      getClassificationSuggestions(
        mergedDirectory.transactions,
        {
          amountMinor: 18_000,
          capturedAt: '2026-03-25T09:12:00+05:30',
          merchant: 'Blue Tokai Roaster',
        },
        [],
        mergedDirectory.merchants,
        mergedDirectory.merchantAliases,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemLabel: 'Cold brew',
          source: 'history',
        }),
      ]),
    );

    const mergedAlias = mergedDirectory.merchantAliases.find(
      (merchantAlias) => merchantAlias.alias === 'Blue Tokai Roaster',
    );

    expect(mergedAlias).toBeDefined();

    const splitDirectory = splitMerchantAlias(
      mergedDirectory.merchants,
      mergedDirectory.merchantAliases,
      mergedDirectory.transactions,
      mergedAlias!.id,
    );

    expect(splitDirectory.merchants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Blue Tokai Roaster',
        }),
      ]),
    );
    expect(
      splitDirectory.transactions.find((transaction) => transaction.id === 'txn_roaster_variant'),
    ).toEqual(
      expect.objectContaining({
        history: expect.arrayContaining([
          expect.objectContaining({
            kind: 'merchant_alias_split',
          }),
        ]),
        merchant: 'Blue Tokai Roaster',
      }),
    );
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

  it('supports category CRUD and keeps custom categories first-class in search and summaries', () => {
    const withCustomCategory = addCustomCategory(getDefaultCategories(), {
      description: 'Cafe orders and local treats.',
      label: 'Weekend Treats',
    });
    const updatedCategories = updateCustomCategory(withCustomCategory, 'custom_weekend_treats', {
      description: 'Cafe orders, desserts, and local treats.',
      label: 'Weekend Treats',
    });
    const classifiedTransactions = classifyTransaction(
      seededTransactions,
      'txn_blue_tokai',
      {
        autoApplyRule: false,
        categoryId: 'custom_weekend_treats',
        itemLabel: 'Cold brew',
        saveAsRule: false,
      },
      updatedCategories,
    );
    const customCategoryTransactions = classifiedTransactions.filter(
      (transaction) => transaction.id === 'txn_blue_tokai',
    );

    expect(
      summarizeDashboard(
        customCategoryTransactions,
        {
          budgetTargetMinor: 500000,
          cycleStartDay: 1,
          now: '2026-03-25T10:00:00+05:30',
        },
        updatedCategories,
      ).topCategoryLabel,
    ).toBe('Weekend Treats');
    expect(
      getTimelineTransactions(
        classifiedTransactions,
        {
          ...DEFAULT_TIMELINE_FILTERS,
          query: 'weekend',
        },
        '2026-03-25T10:00:00+05:30',
        updatedCategories,
      ).map((transaction) => transaction.id),
    ).toContain('txn_blue_tokai');
    expect(deleteCustomCategory(updatedCategories, 'custom_weekend_treats')).toEqual(
      getDefaultCategories(),
    );
  });

  it('summarizes category usage and preserves historical rows when merging categories', () => {
    const categories = addCustomCategory(getDefaultCategories(), {
      description: 'Local snacks and cafe add-ons.',
      label: 'Weekend Treats',
    });
    const transactions = classifyTransaction(
      seededTransactions,
      'txn_blue_tokai',
      {
        autoApplyRule: false,
        categoryId: 'custom_weekend_treats',
        itemLabel: 'Cold brew',
        saveAsRule: false,
      },
      categories,
    );
    const usage = summarizeCategoryUsage(categories, transactions);

    expect(
      usage.find((summary) => summary.category.id === 'custom_weekend_treats'),
    ).toEqual(
      expect.objectContaining({
        itemCount: 1,
        transactionCount: 1,
      }),
    );
    expect(canDeleteCategory(categories, transactions, 'custom_weekend_treats')).toBe(false);

    const merged = mergeCategories(
      categories,
      transactions,
      'custom_weekend_treats',
      'food_drink',
    );

    expect(
      merged.categories.find((category) => category.id === 'custom_weekend_treats'),
    ).toBeUndefined();
    expect(
      merged.transactions.find((transaction) => transaction.id === 'txn_blue_tokai'),
    ).toEqual(
      expect.objectContaining({
        history: expect.arrayContaining([
          expect.objectContaining({
            kind: 'category_merged',
            summary: expect.stringContaining('Weekend Treats'),
          }),
        ]),
        items: [
          expect.objectContaining({
            categoryId: 'food_drink',
            label: 'Cold brew',
          }),
        ],
      }),
    );
  });

  it('builds local insights with prior-period comparison across all report dimensions', () => {
    const transactions: Transaction[] = [
      {
        amountMinor: 45_000,
        capturedAt: '2026-03-22T09:10:00+05:30',
        id: 'txn_current_groceries',
        items: [
          {
            amountMinor: 45_000,
            categoryId: 'groceries',
            id: 'txn_current_groceries_item_1',
            label: 'Weekly groceries',
          },
        ],
        merchant: 'Blinkit',
        sourceApp: 'PhonePe',
        status: 'classified',
      },
      {
        amountMinor: 18_000,
        capturedAt: '2026-03-20T20:15:00+05:30',
        id: 'txn_current_dinner',
        items: [
          {
            amountMinor: 18_000,
            categoryId: 'food_drink',
            id: 'txn_current_dinner_item_1',
            label: 'Dinner',
          },
        ],
        merchant: 'Pizza Bakery',
        sourceApp: 'Google Pay',
        status: 'classified',
      },
      {
        amountMinor: 9_500,
        capturedAt: '2026-03-19T07:45:00+05:30',
        id: 'txn_current_unreviewed',
        items: [],
        merchant: 'Unknown Merchant',
        sourceApp: 'Google Pay',
        status: 'uncategorized',
      },
      {
        amountMinor: 30_000,
        capturedAt: '2026-02-18T09:00:00+05:30',
        id: 'txn_prior_groceries',
        items: [
          {
            amountMinor: 30_000,
            categoryId: 'groceries',
            id: 'txn_prior_groceries_item_1',
            label: 'Weekly groceries',
          },
        ],
        merchant: 'Blinkit',
        sourceApp: 'PhonePe',
        status: 'classified',
      },
      {
        amountMinor: 11_000,
        capturedAt: '2026-02-16T20:00:00+05:30',
        id: 'txn_prior_transport',
        items: [
          {
            amountMinor: 11_000,
            categoryId: 'transport',
            id: 'txn_prior_transport_item_1',
            label: 'Metro recharge',
          },
        ],
        merchant: 'Metro Card',
        sourceApp: 'Paytm',
        status: 'classified',
      },
    ];

    const report = summarizeInsights(
      transactions,
      {
        cycleStartDay: 1,
        now: '2026-03-25T10:00:00+05:30',
      },
      getDefaultCategories(),
    );

    expect(report.comparison.currentSpendMinor).toBe(72_500);
    expect(report.comparison.priorSpendMinor).toBe(41_000);
    expect(report.comparison.deltaMinor).toBe(31_500);
    expect(report.sections).toHaveLength(5);

    const categorySection = report.sections.find(
      (section) => section.dimension === 'category',
    );
    const merchantSection = report.sections.find(
      (section) => section.dimension === 'merchant',
    );
    const timeOfDaySection = report.sections.find(
      (section) => section.dimension === 'time_of_day',
    );
    const dayOfWeekSection = report.sections.find(
      (section) => section.dimension === 'day_of_week',
    );

    expect(categorySection?.rows[0]).toEqual(
      expect.objectContaining({
        currentAmountMinor: 45_000,
        deltaMinor: 15_000,
        label: 'Groceries',
        priorAmountMinor: 30_000,
        trend: 'up',
      }),
    );
    expect(categorySection?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentAmountMinor: 9_500,
          label: 'Needs review',
        }),
      ]),
    );
    expect(merchantSection?.rows[0]).toEqual(
      expect.objectContaining({
        currentAmountMinor: 45_000,
        label: 'Blinkit',
      }),
    );
    expect(timeOfDaySection?.rows.map((row) => row.label)).toEqual([
      'Morning',
      'Afternoon',
      'Evening',
      'Night',
    ]);
    expect(dayOfWeekSection?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentAmountMinor: 18_000,
        }),
      ]),
    );
  });

  it('renders optimized local insights for 10k transactions within the expected budget', () => {
    const transactions: Transaction[] = Array.from({ length: 10_000 }, (_, index) => {
      const isCurrentCycle = index < 5_000;
      const dayOffset = index % 28;
      const categoryId = index % 3 === 0 ? 'groceries' : index % 3 === 1 ? 'food_drink' : 'transport';
      const merchant =
        index % 4 === 0
          ? 'Blinkit'
          : index % 4 === 1
            ? 'Blue Tokai'
            : index % 4 === 2
              ? 'Metro Card'
              : 'Big Basket';

      return {
        amountMinor: 5_000 + ((index % 7) * 1_000),
        capturedAt: isCurrentCycle
          ? `2026-03-${String((dayOffset % 28) + 1).padStart(2, '0')}T0${index % 9}:15:00+05:30`
          : `2026-02-${String((dayOffset % 28) + 1).padStart(2, '0')}T1${index % 8}:45:00+05:30`,
        id: `txn_insight_scale_${index}`,
        items: [
          {
            amountMinor: 5_000 + ((index % 7) * 1_000),
            categoryId,
            id: `txn_insight_scale_${index}_item_1`,
            label:
              categoryId === 'groceries'
                ? 'Daily groceries'
                : categoryId === 'food_drink'
                  ? 'Coffee break'
                  : 'Metro recharge',
          },
        ],
        merchant,
        sourceApp: index % 2 === 0 ? 'PhonePe' : 'Google Pay',
        status: 'classified',
      };
    });

    const startedAt = performance.now();
    const report = summarizeInsights(
      transactions,
      {
        cycleStartDay: 1,
        maxRowsPerSection: 5,
        now: '2026-03-28T10:00:00+05:30',
      },
      getDefaultCategories(),
    );
    const elapsedMs = performance.now() - startedAt;

    expect(report.comparison.currentTransactionCount).toBe(5_000);
    expect(report.comparison.priorTransactionCount).toBe(5_000);
    expect(
      report.sections.find((section) => section.dimension === 'item')?.rows.length,
    ).toBeLessThanOrEqual(5);
    expect(
      report.sections.find((section) => section.dimension === 'category')?.rows.length,
    ).toBeLessThanOrEqual(5);
    expect(
      report.sections.find((section) => section.dimension === 'merchant')?.rows.length,
    ).toBeLessThanOrEqual(5);
    expect(
      report.sections.find((section) => section.dimension === 'time_of_day')?.rows.length,
    ).toBe(4);
    expect(
      report.sections.find((section) => section.dimension === 'day_of_week')?.rows.length,
    ).toBe(7);
    expect(elapsedMs).toBeLessThan(750);
  });
});
