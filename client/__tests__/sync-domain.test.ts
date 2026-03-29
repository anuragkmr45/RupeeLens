import {
  DEFAULT_BUDGET_ALERT_SETTINGS,
  getDefaultCategories,
  seededMerchantAliases,
  seededMerchants,
  seededTransactions,
  type Transaction,
} from '../src/features/spend-tracker/domain';
import type { PersistedSpendTrackerState } from '../src/features/spend-tracker/persistence';
import {
  buildSyncQueueSummary,
  computeSyncRetryDelayMs,
  createInitialSyncNetworkState,
  createInitialSyncState,
  getReadyOutboxEntries,
  queueSyncOperationsFromStateDiff,
} from '../src/features/sync/domain';

function cloneTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.map((transaction) => ({
    ...transaction,
    ...(transaction.history
      ? {
          history: transaction.history.map((entry) => ({ ...entry })),
        }
      : {}),
    items: transaction.items.map((item) => ({ ...item })),
  }));
}

function createSpendState(syncMode: PersistedSpendTrackerState['onboardingPreferences']['syncMode']): PersistedSpendTrackerState {
  return {
    budgetAlertSettings: DEFAULT_BUDGET_ALERT_SETTINGS,
    budgetAlerts: [],
    budgets: [],
    categories: getDefaultCategories(),
    merchantAliases: seededMerchantAliases.map((merchantAlias) => ({ ...merchantAlias })),
    merchants: seededMerchants.map((merchant) => ({ ...merchant })),
    onboardingPreferences: {
      budgetCycleId: 'calendar_month',
      selectedSourceAppIds: ['google_pay', 'phonepe', 'paytm'],
      syncMode,
    },
    notificationAccessState: 'not_started',
    onboardingCompleted: true,
    privacyModeEnabled: false,
    rules: [],
    transactions: cloneTransactions(seededTransactions.slice(0, 2)),
  };
}

describe('sync domain', () => {
  it('queues a full baseline when sync mode is enabled after local-only use', () => {
    const previousState = createSpendState('local_only');
    const nextState = createSpendState('sync_later');

    const syncState = queueSyncOperationsFromStateDiff({
      currentSyncState: createInitialSyncState('2026-03-30T10:00:00.000Z'),
      nextState,
      now: '2026-03-30T10:05:00.000Z',
      previousState,
    });

    expect(syncState.outbox.length).toBeGreaterThan(0);
    expect(syncState.outbox).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'transaction',
          opType: 'upsert',
          status: 'pending',
        }),
        expect.objectContaining({
          entityType: 'category',
          opType: 'upsert',
          status: 'pending',
        }),
      ]),
    );
    expect(syncState.lastStatus).toBe('pending');
  });

  it('skips queue creation when local-only mode stays enabled', () => {
    const previousState = createSpendState('local_only');
    const nextState = createSpendState('local_only');
    nextState.transactions = nextState.transactions.map((transaction, index) =>
      index === 0
        ? {
            ...transaction,
            note: 'Local edit that should never leave the device',
          }
        : transaction,
    );

    const syncState = queueSyncOperationsFromStateDiff({
      currentSyncState: createInitialSyncState('2026-03-30T10:00:00.000Z'),
      nextState,
      now: '2026-03-30T10:05:00.000Z',
      previousState,
    });

    expect(syncState.outbox).toEqual([]);
    expect(syncState.lastStatus).toBe('idle');
  });

  it('queues incremental transaction updates once sync mode is enabled', () => {
    const previousState = createSpendState('sync_later');
    const nextState = createSpendState('sync_later');
    nextState.transactions = nextState.transactions.map((transaction, index) =>
      index === 0
        ? {
            ...transaction,
            note: 'Added from the detail screen',
          }
        : transaction,
    );

    const syncState = queueSyncOperationsFromStateDiff({
      currentSyncState: createInitialSyncState('2026-03-30T10:00:00.000Z'),
      nextState,
      now: '2026-03-30T10:05:00.000Z',
      previousState,
    });

    expect(syncState.outbox).toEqual([
      expect.objectContaining({
        entityType: 'transaction',
        opType: 'upsert',
        payload: expect.objectContaining({
          note: 'Added from the detail screen',
        }),
      }),
    ]);
    expect(syncState.entityVersions).toEqual([
      expect.objectContaining({
        entityId: previousState.transactions[0]?.id,
        entityType: 'transaction',
        version: 1,
      }),
    ]);
  });

  it('uses exponential backoff with deterministic jitter', () => {
    const firstDelayMs = computeSyncRetryDelayMs(1, 'txn_1');
    const secondDelayMs = computeSyncRetryDelayMs(2, 'txn_1');
    const sameSecondDelayMs = computeSyncRetryDelayMs(2, 'txn_1');

    expect(firstDelayMs).toBeGreaterThanOrEqual(5_000);
    expect(secondDelayMs).toBeGreaterThan(firstDelayMs);
    expect(sameSecondDelayMs).toBe(secondDelayMs);
  });

  it('excludes conflicted entities from the ready queue and summarizes the blocker honestly', () => {
    const previousState = createSpendState('sync_later');
    const nextState = createSpendState('sync_later');
    nextState.transactions = nextState.transactions.map((transaction, index) =>
      index === 0
        ? {
            ...transaction,
            note: 'Pending cloud conflict',
          }
        : transaction,
    );

    const syncState = queueSyncOperationsFromStateDiff({
      currentSyncState: createInitialSyncState('2026-03-30T10:00:00.000Z'),
      nextState,
      now: '2026-03-30T10:05:00.000Z',
      previousState,
    });

    syncState.conflicts = [
      {
        clientVersion: 1,
        conflictReason: 'version_mismatch',
        detectedAt: '2026-03-30T10:06:00.000Z',
        entityId: nextState.transactions[0]?.id ?? 'txn_1',
        entityType: 'transaction',
        id: 'push_transaction_txn_1_v2',
        opId: 'push_transaction_txn_1_2',
        serverState: {
          merchant: nextState.transactions[0]?.merchant ?? 'Merchant',
        },
        serverVersion: 2,
        source: 'push',
      },
    ];

    expect(getReadyOutboxEntries(syncState.outbox, syncState.conflicts)).toEqual([]);

    expect(
      buildSyncQueueSummary({
        hasSyncCredentials: true,
        networkState: createInitialSyncNetworkState(),
        syncMode: 'sync_later',
        syncState,
      }),
    ).toEqual(
      expect.objectContaining({
        conflictCount: 1,
        statusLabel: 'Conflicts need review',
        tone: 'pending',
      }),
    );
  });
});
