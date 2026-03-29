import { createInitialSyncState } from '../src/features/sync/domain';

interface SyncPersistenceModule {
  clearStoredSyncState: () => Promise<void>;
  loadStoredSyncState: () => Promise<ReturnType<typeof createInitialSyncState>>;
  saveStoredSyncState: (syncState: ReturnType<typeof createInitialSyncState>) => Promise<void>;
}

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('../src/features/spend-tracker/db/migration-runner', () => ({
  applyMobileMigrations: jest.fn().mockResolvedValue(undefined),
}));

interface DatabaseMock {
  getAllAsync: jest.Mock<Promise<unknown[]>, [string]>;
  runAsync: jest.Mock<Promise<void>, [string, ...unknown[]]>;
  withTransactionAsync: jest.Mock<Promise<void>, [() => Promise<void>]>;
}

function createDatabaseMock(): DatabaseMock {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
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

function loadSyncPersistenceModule(): SyncPersistenceModule {
  let loadedModule: SyncPersistenceModule | null = null;

  jest.isolateModules(() => {
    loadedModule = jest.requireActual(
      '../src/features/sync/persistence'
    ) as SyncPersistenceModule;
  });

  if (!loadedModule) {
    throw new Error('Unable to load sync persistence module');
  }

  return loadedModule;
}

describe('sync persistence', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('loads the persisted sync queue from normalized SQLite tables', async () => {
    const database = createDatabaseMock();
    const { openDatabaseAsync } = getExpoSqliteMock();

    openDatabaseAsync.mockResolvedValue(database);
    database.getAllAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT key, value FROM sync_settings')) {
        return [
          { key: 'device_id', value: 'device_local_1' },
          { key: 'last_cursor', value: 'cursor_42' },
          { key: 'last_status', value: 'retry_scheduled' },
          { key: 'last_error_message', value: 'network down' },
          { key: 'last_sync_attempt_at', value: '2026-03-30T10:01:00.000Z' },
          { key: 'last_sync_success_at', value: '2026-03-30T09:58:00.000Z' },
        ];
      }

      if (sql.includes('FROM sync_entity_versions')) {
        return [
          {
            entityId: 'txn_local_1',
            entityType: 'transaction',
            version: 3,
          },
        ];
      }

      if (sql.includes('FROM sync_outbox')) {
        return [
          {
            attemptCount: 2,
            createdAt: '2026-03-30T10:00:00.000Z',
            entityId: 'txn_local_1',
            entityType: 'transaction',
            entityVersion: 3,
            lastAttemptAt: '2026-03-30T10:01:00.000Z',
            lastErrorCode: 'sync_request_failed',
            lastErrorMessage: 'network down',
            nextRetryAt: '2026-03-30T10:03:00.000Z',
            occurredAt: '2026-03-30T10:00:00.000Z',
            opId: 'transaction_txn_local_1_v3',
            opType: 'upsert',
            payloadJson: '{"merchant":"Native Chai Stall","status":"uncategorized"}',
            status: 'retry_scheduled',
          },
        ];
      }

      if (sql.includes('FROM sync_conflicts')) {
        return [
          {
            clientVersion: 3,
            conflictReason: 'version_mismatch',
            detectedAt: '2026-03-30T10:02:00.000Z',
            entityId: 'txn_local_1',
            entityType: 'transaction',
            id: 'push_transaction_txn_local_1_v4',
            opId: 'push_transaction_txn_local_1_4',
            serverStateJson: '{"merchant":"Native Chai Stall","status":"classified"}',
            serverVersion: 4,
            source: 'push',
          },
        ];
      }

      return [];
    });

    const { loadStoredSyncState } = loadSyncPersistenceModule();

    await expect(loadStoredSyncState()).resolves.toEqual({
      conflicts: [
        {
          clientVersion: 3,
          conflictReason: 'version_mismatch',
          detectedAt: '2026-03-30T10:02:00.000Z',
          entityId: 'txn_local_1',
          entityType: 'transaction',
          id: 'push_transaction_txn_local_1_v4',
          opId: 'push_transaction_txn_local_1_4',
          serverState: {
            merchant: 'Native Chai Stall',
            status: 'classified',
          },
          serverVersion: 4,
          source: 'push',
        },
      ],
      deviceId: 'device_local_1',
      entityVersions: [
        {
          entityId: 'txn_local_1',
          entityType: 'transaction',
          version: 3,
        },
      ],
      lastCursor: 'cursor_42',
      lastErrorMessage: 'network down',
      lastStatus: 'retry_scheduled',
      lastSyncAttemptAt: '2026-03-30T10:01:00.000Z',
      lastSyncSuccessAt: '2026-03-30T09:58:00.000Z',
      outbox: [
        {
          attemptCount: 2,
          createdAt: '2026-03-30T10:00:00.000Z',
          entityId: 'txn_local_1',
          entityType: 'transaction',
          entityVersion: 3,
          lastAttemptAt: '2026-03-30T10:01:00.000Z',
          lastErrorCode: 'sync_request_failed',
          lastErrorMessage: 'network down',
          nextRetryAt: '2026-03-30T10:03:00.000Z',
          occurredAt: '2026-03-30T10:00:00.000Z',
          opId: 'transaction_txn_local_1_v3',
          opType: 'upsert',
          payload: {
            merchant: 'Native Chai Stall',
            status: 'uncategorized',
          },
          status: 'retry_scheduled',
        },
      ],
    });
  });

  it('saves and clears the persisted sync queue in SQLite tables', async () => {
    const database = createDatabaseMock();
    const { openDatabaseAsync } = getExpoSqliteMock();
    const syncState = createInitialSyncState('2026-03-30T09:55:00.000Z');

    openDatabaseAsync.mockResolvedValue(database);
    syncState.lastStatus = 'pending';
    syncState.entityVersions = [
      {
        entityId: 'txn_local_1',
        entityType: 'transaction',
        version: 1,
      },
    ];
    syncState.outbox = [
      {
        attemptCount: 0,
        createdAt: '2026-03-30T10:00:00.000Z',
        entityId: 'txn_local_1',
        entityType: 'transaction',
        entityVersion: 1,
        lastAttemptAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        nextRetryAt: null,
        occurredAt: '2026-03-30T10:00:00.000Z',
        opId: 'transaction_txn_local_1_v1',
        opType: 'upsert',
        payload: {
          merchant: 'Native Chai Stall',
          status: 'uncategorized',
        },
        status: 'pending',
      },
    ];
    syncState.conflicts = [
      {
        clientVersion: 1,
        conflictReason: 'remote_change_pending_review',
        detectedAt: '2026-03-30T10:05:00.000Z',
        entityId: 'txn_local_1',
        entityType: 'transaction',
        id: 'pull_transaction_txn_local_1_v2',
        opId: 'pull_transaction_txn_local_1_2',
        serverState: {
          merchant: 'Native Chai Stall',
          status: 'classified',
        },
        serverVersion: 2,
        source: 'pull',
      },
    ];

    const {
      clearStoredSyncState,
      saveStoredSyncState,
    } = loadSyncPersistenceModule();

    await saveStoredSyncState(syncState);

    expect(database.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(database.runAsync).toHaveBeenCalledWith('DELETE FROM sync_conflicts');
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sync_settings (key, value) VALUES (?, ?)'),
      'device_id',
      syncState.deviceId,
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sync_entity_versions'),
      'transaction',
      'txn_local_1',
      1,
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sync_outbox'),
      'transaction_txn_local_1_v1',
      'transaction',
      'txn_local_1',
      1,
      'upsert',
      '{"merchant":"Native Chai Stall","status":"uncategorized"}',
      '2026-03-30T10:00:00.000Z',
      '2026-03-30T10:00:00.000Z',
      'pending',
      0,
      null,
      null,
      null,
      null,
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sync_conflicts'),
      'pull_transaction_txn_local_1_v2',
      'pull',
      'pull_transaction_txn_local_1_2',
      'transaction',
      'txn_local_1',
      1,
      2,
      'remote_change_pending_review',
      '2026-03-30T10:05:00.000Z',
      '{"merchant":"Native Chai Stall","status":"classified"}',
    );

    database.runAsync.mockClear();

    await clearStoredSyncState();

    expect(database.withTransactionAsync).toHaveBeenCalledTimes(2);
    expect(database.runAsync.mock.calls).toEqual([
      ['DELETE FROM sync_conflicts'],
      ['DELETE FROM sync_outbox'],
      ['DELETE FROM sync_entity_versions'],
      ['DELETE FROM sync_settings'],
    ]);
  });
});
