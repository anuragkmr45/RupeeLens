import type {
  SyncPullResponse,
  SyncPushResponse,
} from '@upi-spend-tracker/contracts';

import {
  createInitialSyncNetworkState,
  createInitialSyncState,
  type PersistedSyncState,
  type SyncOutboxEntry,
} from '../src/features/sync/domain';
import {
  probeSyncReachability,
  runSyncCycle,
  type SyncCredentials,
} from '../src/features/sync/runtime';

function createOutboxEntry(overrides: Partial<SyncOutboxEntry> = {}): SyncOutboxEntry {
  return {
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
      amountMinor: 42000,
      merchant: 'Blue Tokai',
      status: 'classified',
    },
    status: 'pending',
    ...overrides,
  };
}

function createSyncState(outbox: SyncOutboxEntry[]): PersistedSyncState {
  const syncState = createInitialSyncState('2026-03-30T09:55:00.000Z');
  syncState.outbox = outbox;
  syncState.entityVersions = [
    {
      entityId: 'txn_local_1',
      entityType: 'transaction',
      version: 1,
    },
  ];

  return syncState;
}

function createCredentials(): SyncCredentials {
  return {
    accessToken: 'access-token',
    apiBaseUrl: 'http://localhost:3000',
    deviceId: 'device_local_1',
  };
}

describe('sync runtime', () => {
  it('probes reachability against the health route', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue({
      json: async () => ({ status: 'ok' }),
      ok: true,
      status: 200,
    });

    await expect(
      probeSyncReachability(
        fetchImplementation as unknown as typeof globalThis.fetch,
        'http://localhost:3000',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'online',
      }),
    );

    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://localhost:3000/health',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('schedules exponential retry when the sync request fails', async () => {
    const fetchImplementation = jest.fn().mockRejectedValue(new Error('network down'));

    const syncState = await runSyncCycle({
      credentials: createCredentials(),
      fetchImplementation: fetchImplementation as unknown as typeof globalThis.fetch,
      networkState: {
        checkedAt: '2026-03-30T10:01:00.000Z',
        isExpensive: false,
        status: 'online',
      },
      now: '2026-03-30T10:01:00.000Z',
      syncState: createSyncState([createOutboxEntry()]),
    });

    expect(syncState.lastStatus).toBe('retry_scheduled');
    expect(syncState.lastErrorMessage).toBe('network down');
    expect(syncState.outbox).toEqual([
      expect.objectContaining({
        attemptCount: 1,
        lastErrorCode: 'sync_request_failed',
        nextRetryAt: expect.any(String),
        status: 'retry_scheduled',
      }),
    ]);
  });

  it('removes accepted operations and advances the cursor after a successful push and pull', async () => {
    const fetchImplementation = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () =>
          ({
            accepted: [
              {
                entityId: 'txn_local_1',
                entityType: 'transaction',
                opId: 'transaction_txn_local_1_v1',
                serverVersion: 1,
                status: 'accepted',
              },
            ],
            conflicts: [],
            newCursor: 'cursor_1',
            rejected: [],
          } satisfies SyncPushResponse),
        ok: true,
        status: 200,
      })
      .mockResolvedValueOnce({
        json: async () =>
          ({
            changes: [],
            cursor: 'cursor_2',
            hasMore: false,
          } satisfies SyncPullResponse),
        ok: true,
        status: 200,
      });

    const syncState = await runSyncCycle({
      credentials: createCredentials(),
      fetchImplementation: fetchImplementation as unknown as typeof globalThis.fetch,
      networkState: {
        checkedAt: '2026-03-30T10:01:00.000Z',
        isExpensive: false,
        status: 'online',
      },
      now: '2026-03-30T10:01:00.000Z',
      syncState: createSyncState([createOutboxEntry()]),
    });

    expect(syncState.outbox).toEqual([]);
    expect(syncState.lastCursor).toBe('cursor_2');
    expect(syncState.lastStatus).toBe('succeeded');
    expect(syncState.lastSyncSuccessAt).toBe('2026-03-30T10:01:00.000Z');
  });

  it('moves conflicting operations into the conflict queue without dropping local data', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue({
      json: async () =>
        ({
          accepted: [],
          conflicts: [
            {
              clientVersion: 1,
              conflictReason: 'version_mismatch',
              entityId: 'txn_local_1',
              entityType: 'transaction',
              serverState: {
                merchant: 'Blue Tokai',
                status: 'classified',
              },
              serverVersion: 2,
            },
          ],
          newCursor: 'cursor_1',
          rejected: [],
        } satisfies SyncPushResponse),
      ok: true,
      status: 200,
    });

    const syncState = await runSyncCycle({
      credentials: createCredentials(),
      fetchImplementation: fetchImplementation as unknown as typeof globalThis.fetch,
      networkState: {
        checkedAt: '2026-03-30T10:01:00.000Z',
        isExpensive: false,
        status: 'online',
      },
      now: '2026-03-30T10:01:00.000Z',
      syncState: createSyncState([createOutboxEntry()]),
    });

    expect(syncState.lastStatus).toBe('conflict');
    expect(syncState.outbox).toEqual([
      expect.objectContaining({
        lastErrorCode: 'conflict',
        status: 'conflict',
      }),
    ]);
    expect(syncState.conflicts).toEqual([
      expect.objectContaining({
        conflictReason: 'version_mismatch',
        entityId: 'txn_local_1',
        entityType: 'transaction',
        source: 'push',
      }),
    ]);
  });

  it('limits sync batches by payload size as well as entry count on slow networks', async () => {
    const secondEntry = createOutboxEntry({
      entityId: 'txn_local_2',
      entityVersion: 2,
      opId: 'transaction_txn_local_2_v2',
      payload: {
        amountMinor: 61000,
        merchant: 'Blue Tokai',
        notes: 'x'.repeat(200),
        status: 'classified',
      },
    });
    const fetchImplementation = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () =>
          ({
            accepted: [
              {
                entityId: 'txn_local_1',
                entityType: 'transaction',
                opId: 'transaction_txn_local_1_v1',
                serverVersion: 1,
                status: 'accepted',
              },
            ],
            conflicts: [],
            newCursor: 'cursor_1',
            rejected: [],
          } satisfies SyncPushResponse),
        ok: true,
        status: 200,
      })
      .mockResolvedValueOnce({
        json: async () =>
          ({
            changes: [],
            cursor: 'cursor_2',
            hasMore: false,
          } satisfies SyncPullResponse),
        ok: true,
        status: 200,
      });

    const syncState = await runSyncCycle({
      credentials: createCredentials(),
      fetchImplementation: fetchImplementation as unknown as typeof globalThis.fetch,
      maxPushPayloadBytes: 260,
      networkState: {
        checkedAt: '2026-03-30T10:01:00.000Z',
        isExpensive: false,
        status: 'online',
      },
      now: '2026-03-30T10:01:00.000Z',
      syncState: createSyncState([createOutboxEntry(), secondEntry]),
    });

    const pushRequest = JSON.parse(
      String((fetchImplementation.mock.calls[0]?.[1] as { body: string }).body),
    ) as { operations: Array<{ opId: string }> };

    expect(pushRequest.operations).toEqual([
      expect.objectContaining({
        opId: 'transaction_txn_local_1_v1',
      }),
    ]);
    expect(syncState.lastStatus).toBe('pending');
    expect(syncState.outbox).toEqual([
      expect.objectContaining({
        entityId: 'txn_local_2',
        opId: 'transaction_txn_local_2_v2',
        status: 'pending',
      }),
    ]);
  });

  it('waits for pairing when credentials are unavailable', async () => {
    const syncState = await runSyncCycle({
      credentials: null,
      networkState: createInitialSyncNetworkState(),
      now: '2026-03-30T10:01:00.000Z',
      syncState: createSyncState([createOutboxEntry()]),
    });

    expect(syncState.lastStatus).toBe('waiting_for_pairing');
    expect(syncState.outbox).toHaveLength(1);
  });
});
