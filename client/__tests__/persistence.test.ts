import { getDefaultCategories, seededTransactions } from '../src/features/spend-tracker/domain';
import type * as PersistenceModule from '../src/features/spend-tracker/persistence';

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

interface DatabaseMock {
  execAsync: jest.Mock<Promise<void>, [string]>;
  getAllAsync: jest.Mock<Promise<unknown[]>, [string]>;
  getFirstAsync: jest.Mock<Promise<{ count: number } | null>, [string]>;
  runAsync: jest.Mock<Promise<void>, [string, ...unknown[]]>;
  withTransactionAsync: jest.Mock<Promise<void>, [() => Promise<void>]>;
}

function includesSql(sql: string, snippet: string): boolean {
  return sql.replace(/\s+/g, ' ').includes(snippet);
}

function createDatabaseMock(): DatabaseMock {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
    runAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => {
      await task();
    }),
  };
}

function getExpoSqliteMock() {
  return jest.requireMock('expo-sqlite') as {
    openDatabaseAsync: jest.Mock<Promise<DatabaseMock>, [string]>;
  };
}

function getKvStoreMock() {
  return jest.requireMock('expo-sqlite/kv-store') as {
    Storage: {
      getItem: jest.Mock<Promise<string | null>, [string]>;
      removeItem: jest.Mock<Promise<void>, [string]>;
    };
  };
}

function loadPersistenceModule(): typeof PersistenceModule {
  let loadedModule: typeof PersistenceModule | null = null;

  jest.isolateModules(() => {
    loadedModule = jest.requireActual(
      '../src/features/spend-tracker/persistence'
    ) as typeof PersistenceModule;
  });

  if (!loadedModule) {
    throw new Error('Unable to load persistence module');
  }

  return loadedModule;
}

describe('spend-tracker persistence', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('loads spend-tracker state from normalized SQLite tables', async () => {
    const database = createDatabaseMock();
    const { openDatabaseAsync } = getExpoSqliteMock();

    openDatabaseAsync.mockResolvedValue(database);
    database.getFirstAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, 'SELECT COUNT(*) as count FROM schema_migrations')) {
        return { count: 4 };
      }

      if (includesSql(sql, 'SELECT COUNT(*) as count FROM transactions')) {
        return { count: 5 };
      }

      if (includesSql(sql, 'SELECT COUNT(*) as count FROM settings')) {
        return { count: 2 };
      }

      if (includesSql(sql, 'SELECT COUNT(*) as count FROM classification_rules')) {
        return { count: 1 };
      }

      if (includesSql(sql, 'SELECT COUNT(*) as count FROM categories')) {
        return { count: 12 };
      }

      return null;
    });
    database.getAllAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, 'SELECT id FROM schema_migrations ORDER BY id ASC')) {
        return [
          { id: '001_create_settings_table' },
          { id: '002_create_transactions_table' },
          { id: '003_create_transaction_items_table' },
          { id: '004_create_transaction_items_index' },
        ];
      }

      if (includesSql(sql, 'SELECT key, value FROM settings')) {
        return [
          { key: 'selected_source_app_ids', value: '["google_pay","phonepe"]' },
          { key: 'budget_cycle_id', value: 'salary_cycle' },
          { key: 'sync_mode', value: 'sync_later' },
          { key: 'notification_access_state', value: 'settings_opened' },
          { key: 'onboarding_completed', value: 'true' },
        ];
      }

      if (includesSql(sql, 'FROM categories')) {
        return getDefaultCategories().map((category) => ({
          description: category.description,
          id: category.id,
          isDefault: category.isDefault ? 1 : 0,
          label: category.label,
        }));
      }

      if (includesSql(sql, 'FROM classification_rules')) {
        return [
          {
            amountBucket: 'under_250',
            autoApply: 1,
            categoryId: 'food_drink',
            createdAt: '2026-03-25T09:15:00+05:30',
            hourBucket: 'morning',
            id: 'rule_blue_tokai_under_250_morning_tuesday',
            itemLabel: 'Morning coffee',
            merchantId: 'merchant_blue_tokai_roasters',
            merchantLabel: 'Blue Tokai Roasters',
            merchantNormalizedLabel: 'blue tokai roasters',
            updatedAt: '2026-03-25T09:15:00+05:30',
            weekday: 'tuesday',
          },
        ];
      }

      if (includesSql(sql, 'FROM transactions')) {
        return [
          {
            amountMinor: 29900,
            capturedAt: '2026-03-25T10:00:00+05:30',
            id: 'txn_manual_store',
            merchant: 'Corner Store',
            merchantRaw: 'Corner Store',
            sourceApp: 'Manual entry',
            status: 'classified',
          },
          {
            amountMinor: 18000,
            capturedAt: '2026-03-25T09:12:00+05:30',
            id: 'txn_blue_tokai',
            merchant: 'Blue Tokai Roasters',
            merchantRaw: 'Blue Tokai Roasters',
            sourceApp: 'Google Pay',
            status: 'skipped',
          },
        ];
      }

      if (includesSql(sql, 'FROM transaction_items')) {
        return [
          {
            amountMinor: 29900,
            categoryId: 'groceries',
            id: 'txn_manual_store_item_1',
            label: 'Snacks',
            sortOrder: 0,
            transactionId: 'txn_manual_store',
          },
        ];
      }

      return [];
    });

    const { loadStoredSpendTrackerState } = loadPersistenceModule();

    await expect(loadStoredSpendTrackerState()).resolves.toEqual({
      categories: getDefaultCategories(),
      merchantAliases: [],
      merchants: expect.arrayContaining([
        expect.objectContaining({ label: 'Blue Tokai Roasters' }),
        expect.objectContaining({ label: 'Corner Store' }),
      ]),
      onboardingPreferences: {
        budgetCycleId: 'salary_cycle',
        selectedSourceAppIds: ['google_pay', 'phonepe'],
        syncMode: 'sync_later',
      },
      notificationAccessState: 'settings_opened',
      onboardingCompleted: true,
      rules: [
        expect.objectContaining({
          autoApply: true,
          categoryId: 'food_drink',
          itemLabel: 'Morning coffee',
        }),
      ],
      transactions: [
        expect.objectContaining({
          id: 'txn_manual_store',
          items: [
            expect.objectContaining({
              categoryId: 'groceries',
              label: 'Snacks',
            }),
          ],
          note: '',
          parserInfo: null,
          status: 'classified',
        }),
        expect.objectContaining({
          id: 'txn_blue_tokai',
          items: [],
          note: '',
          parserInfo: {
            confidenceBps: 9800,
            parserId: 'gpay_upi_v1',
            parserVersion: '1.0.0',
          },
          status: 'skipped',
        }),
      ],
    });
  });

  it('migrates legacy blob storage into SQLite tables on first load', async () => {
    const database = createDatabaseMock();
    const { openDatabaseAsync } = getExpoSqliteMock();
    const { Storage } = getKvStoreMock();

    openDatabaseAsync.mockResolvedValue(database);
    database.getFirstAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, 'SELECT COUNT(*) as count FROM schema_migrations')) {
        return { count: 0 };
      }

      if (includesSql(sql, 'SELECT COUNT(*) as count FROM transactions')) {
        return { count: 0 };
      }

      if (includesSql(sql, 'SELECT COUNT(*) as count FROM settings')) {
        return { count: 0 };
      }

      return null;
    });
    database.getAllAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, "FROM sqlite_master WHERE type = 'table'")) {
        return [];
      }

      if (includesSql(sql, 'SELECT id FROM schema_migrations ORDER BY id ASC')) {
        return [];
      }

      return [];
    });
    Storage.getItem.mockResolvedValue(
      JSON.stringify({
        notificationAccessState: 'not_started',
        onboardingCompleted: true,
        transactions: seededTransactions,
      }),
    );
    Storage.removeItem.mockResolvedValue(undefined);

    const { loadStoredSpendTrackerState } = loadPersistenceModule();

    await expect(loadStoredSpendTrackerState()).resolves.toEqual({
      categories: getDefaultCategories(),
      merchantAliases: [],
      merchants: expect.arrayContaining([
        expect.objectContaining({ label: 'Bangalore Metro' }),
        expect.objectContaining({ label: 'Bigbasket' }),
        expect.objectContaining({ label: 'Blinkit' }),
        expect.objectContaining({ label: 'Blue Tokai Roasters' }),
        expect.objectContaining({ label: 'Third Wave Coffee' }),
      ]),
      onboardingPreferences: {
        budgetCycleId: 'calendar_month',
        selectedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
        syncMode: 'local_only',
      },
      notificationAccessState: 'not_started',
      onboardingCompleted: true,
      rules: [],
      transactions: seededTransactions,
    });

    expect(database.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(database.runAsync).toHaveBeenCalledWith(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'onboarding_completed',
      'true',
    );
    expect(Storage.removeItem).toHaveBeenCalledWith('spend_tracker_demo_state_v1');
  });

  it('preserves partially classified transactions from SQLite tables', async () => {
    const database = createDatabaseMock();
    const { openDatabaseAsync } = getExpoSqliteMock();

    openDatabaseAsync.mockResolvedValue(database);
    database.getFirstAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, 'SELECT COUNT(*) as count FROM schema_migrations')) {
        return { count: 4 };
      }

      if (includesSql(sql, 'SELECT COUNT(*) as count FROM transactions')) {
        return { count: 1 };
      }

      if (includesSql(sql, 'SELECT COUNT(*) as count FROM settings')) {
        return { count: 1 };
      }

      if (includesSql(sql, 'SELECT COUNT(*) as count FROM categories')) {
        return { count: 12 };
      }

      return null;
    });
    database.getAllAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, 'SELECT id FROM schema_migrations ORDER BY id ASC')) {
        return [
          { id: '001_create_settings_table' },
          { id: '002_create_transactions_table' },
          { id: '003_create_transaction_items_table' },
          { id: '004_create_transaction_items_index' },
        ];
      }

      if (includesSql(sql, 'SELECT key, value FROM settings')) {
        return [{ key: 'onboarding_completed', value: 'true' }];
      }

      if (includesSql(sql, 'FROM categories')) {
        return getDefaultCategories().map((category) => ({
          description: category.description,
          id: category.id,
          isDefault: category.isDefault ? 1 : 0,
          label: category.label,
        }));
      }

      if (includesSql(sql, 'FROM transactions')) {
        return [
          {
            amountMinor: 18000,
            capturedAt: '2026-03-25T09:12:00+05:30',
            id: 'txn_blue_tokai',
            merchant: 'Blue Tokai Roasters',
            merchantRaw: 'Blue Tokai Roasters',
            sourceApp: 'Google Pay',
            status: 'partially_classified',
          },
        ];
      }

      if (includesSql(sql, 'FROM transaction_items')) {
        return [
          {
            amountMinor: 12000,
            categoryId: 'food_drink',
            id: 'txn_blue_tokai_item_1',
            label: 'Cold brew',
            sortOrder: 0,
            transactionId: 'txn_blue_tokai',
          },
        ];
      }

      return [];
    });

    const { loadStoredSpendTrackerState } = loadPersistenceModule();
    const state = await loadStoredSpendTrackerState();

    expect(state?.categories).toEqual(getDefaultCategories());
    expect(state?.transactions).toEqual([
      expect.objectContaining({
        id: 'txn_blue_tokai',
        items: [
          expect.objectContaining({
            amountMinor: 12000,
            label: 'Cold brew',
          }),
        ],
        status: 'partially_classified',
      }),
    ]);
  });

  it('rewrites settings, transactions, and items on save', async () => {
    const database = createDatabaseMock();
    const { openDatabaseAsync } = getExpoSqliteMock();

    openDatabaseAsync.mockResolvedValue(database);
    database.getFirstAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, 'SELECT COUNT(*) as count FROM schema_migrations')) {
        return { count: 0 };
      }

      return null;
    });
    database.getAllAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, "FROM sqlite_master WHERE type = 'table'")) {
        return [];
      }

      if (includesSql(sql, 'SELECT id FROM schema_migrations ORDER BY id ASC')) {
        return [];
      }

      return [];
    });

    const { saveStoredSpendTrackerState } = loadPersistenceModule();

    await saveStoredSpendTrackerState({
      categories: getDefaultCategories(),
      onboardingPreferences: {
        budgetCycleId: 'billing_cycle',
        selectedSourceAppIds: ['bhim', 'paytm'],
        syncMode: 'local_only',
      },
      merchantAliases: [
        {
          alias: 'Corner Stores',
          confidenceBps: 10000,
          id: 'merchant_corner_store_corner_stores',
          merchantId: 'merchant_corner_store',
          normalizedAlias: 'corner stores',
          source: 'manual',
        },
      ],
      merchants: [
        {
          id: 'merchant_corner_store',
          label: 'Corner Store',
          normalizedLabel: 'corner store',
        },
      ],
      notificationAccessState: 'settings_opened',
      onboardingCompleted: true,
      rules: [
        {
          amountBucket: 'under_250',
          autoApply: true,
          categoryId: 'groceries',
          createdAt: '2026-03-25T10:05:00+05:30',
          hourBucket: 'morning',
          id: 'rule_corner_store_under_250_morning_tuesday',
          itemLabel: 'Snack refill',
          merchantId: 'merchant_corner_store',
          merchantLabel: 'Corner Store',
          merchantNormalizedLabel: 'corner store',
          updatedAt: '2026-03-25T10:05:00+05:30',
          weekday: 'tuesday',
        },
      ],
      transactions: [
        {
          amountMinor: 29900,
          capturedAt: '2026-03-25T10:00:00+05:30',
          id: 'txn_manual_store',
          items: [
            {
              amountMinor: 29900,
              categoryId: 'groceries',
              id: 'txn_manual_store_item_1',
              label: 'Snacks',
            },
          ],
          merchant: 'Corner Store',
          merchantRaw: 'Corner Stores',
          sourceApp: 'Manual entry',
          status: 'partially_classified',
        },
      ],
    });

    expect(database.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(database.runAsync).toHaveBeenCalledWith('DELETE FROM transaction_items');
    expect(database.runAsync).toHaveBeenCalledWith('DELETE FROM transactions');
    expect(database.runAsync).toHaveBeenCalledWith('DELETE FROM classification_rules');
    expect(database.runAsync).toHaveBeenCalledWith('DELETE FROM categories');
    expect(database.runAsync).toHaveBeenCalledWith('DELETE FROM settings');
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO categories'),
      'food_drink',
      'Food & Drink',
      'Coffee, dining, snacks, and drinks.',
      1,
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'selected_source_app_ids',
      '["bhim","paytm"]',
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'budget_cycle_id',
      'billing_cycle',
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      'INSERT INTO settings (key, value) VALUES (?, ?)',
      'sync_mode',
      'local_only',
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO classification_rules'),
      'rule_corner_store_under_250_morning_tuesday',
      'merchant_corner_store',
      'Corner Store',
      'corner store',
      'under_250',
      'morning',
      'tuesday',
      'groceries',
      'Snack refill',
      1,
      '2026-03-25T10:05:00+05:30',
      '2026-03-25T10:05:00+05:30',
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO merchants'),
      'merchant_corner_store',
      'Corner Store',
      'corner store',
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO merchant_aliases'),
      'merchant_corner_store_corner_stores',
      'merchant_corner_store',
      'Corner Stores',
      'corner stores',
      10000,
      'manual',
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO transactions'),
      'txn_manual_store',
      29900,
      '2026-03-25T10:00:00+05:30',
      'Corner Store',
      'Corner Stores',
      'Manual entry',
      'partially_classified',
      '',
      null,
      null,
      null,
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO transaction_items'),
      'txn_manual_store_item_1',
      'txn_manual_store',
      29900,
      'groceries',
      'Snacks',
      0,
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO transaction_history'),
      'txn_manual_store_history_source',
      'txn_manual_store',
      '2026-03-25T10:00:00+05:30',
      'manual_added',
      'Manual spend stored for Corner Store.',
      0,
    );
  });
});
