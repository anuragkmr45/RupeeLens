import { seededTransactions } from '../src/features/spend-tracker/domain';
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
    database.getFirstAsync
      .mockResolvedValueOnce({ count: 5 })
      .mockResolvedValueOnce({ count: 2 });
    database.getAllAsync
      .mockResolvedValueOnce([
        { key: 'selected_source_app_ids', value: '["google_pay","phonepe"]' },
        { key: 'budget_cycle_id', value: 'salary_cycle' },
        { key: 'sync_mode', value: 'sync_later' },
        { key: 'notification_access_state', value: 'settings_opened' },
        { key: 'onboarding_completed', value: 'true' },
      ])
      .mockResolvedValueOnce([
        {
          amountMinor: 29900,
          capturedAt: '2026-03-25T10:00:00+05:30',
          id: 'txn_manual_store',
          merchant: 'Corner Store',
          sourceApp: 'Manual entry',
          status: 'classified',
        },
        {
          amountMinor: 18000,
          capturedAt: '2026-03-25T09:12:00+05:30',
          id: 'txn_blue_tokai',
          merchant: 'Blue Tokai Roasters',
          sourceApp: 'Google Pay',
          status: 'skipped',
        },
      ])
      .mockResolvedValueOnce([
        {
          amountMinor: 29900,
          categoryId: 'groceries',
          id: 'txn_manual_store_item_1',
          label: 'Snacks',
          sortOrder: 0,
          transactionId: 'txn_manual_store',
        },
      ]);

    const { loadStoredSpendTrackerState } = loadPersistenceModule();

    await expect(loadStoredSpendTrackerState()).resolves.toEqual({
      onboardingPreferences: {
        budgetCycleId: 'salary_cycle',
        selectedSourceAppIds: ['google_pay', 'phonepe'],
        syncMode: 'sync_later',
      },
      notificationAccessState: 'settings_opened',
      onboardingCompleted: true,
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
          sourceApp: 'Manual entry',
          status: 'classified',
        },
        {
          amountMinor: 18000,
          capturedAt: '2026-03-25T09:12:00+05:30',
          id: 'txn_blue_tokai',
          items: [],
          merchant: 'Blue Tokai Roasters',
          sourceApp: 'Google Pay',
          status: 'skipped',
        },
      ],
    });
  });

  it('migrates legacy blob storage into SQLite tables on first load', async () => {
    const database = createDatabaseMock();
    const { openDatabaseAsync } = getExpoSqliteMock();
    const { Storage } = getKvStoreMock();

    openDatabaseAsync.mockResolvedValue(database);
    database.getFirstAsync
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 });
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
      onboardingPreferences: {
        budgetCycleId: 'calendar_month',
        selectedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
        syncMode: 'local_only',
      },
      notificationAccessState: 'not_started',
      onboardingCompleted: true,
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

  it('rewrites settings, transactions, and items on save', async () => {
    const database = createDatabaseMock();
    const { openDatabaseAsync } = getExpoSqliteMock();

    openDatabaseAsync.mockResolvedValue(database);

    const { saveStoredSpendTrackerState } = loadPersistenceModule();

    await saveStoredSpendTrackerState({
      onboardingPreferences: {
        budgetCycleId: 'billing_cycle',
        selectedSourceAppIds: ['bhim', 'paytm'],
        syncMode: 'local_only',
      },
      notificationAccessState: 'settings_opened',
      onboardingCompleted: true,
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
          sourceApp: 'Manual entry',
          status: 'skipped',
        },
      ],
    });

    expect(database.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(database.runAsync).toHaveBeenCalledWith('DELETE FROM transaction_items');
    expect(database.runAsync).toHaveBeenCalledWith('DELETE FROM transactions');
    expect(database.runAsync).toHaveBeenCalledWith('DELETE FROM settings');
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
      expect.stringContaining('INSERT INTO transactions'),
      'txn_manual_store',
      29900,
      '2026-03-25T10:00:00+05:30',
      'Corner Store',
      'Manual entry',
      'skipped',
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
  });
});
