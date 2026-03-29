import type {
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from '@upi-spend-tracker/contracts';

import { resolveBootstrapBaseUrl } from '../bootstrap-config/runtime-config';
import {
  cloneSyncState,
  computeSyncRetryDelayMs,
  createSyncConflictQueueEntry,
  getReadyOutboxEntries,
  type PersistedSyncState,
  type SyncNetworkState,
  type SyncOutboxEntry,
  upsertConflictQueueEntry,
} from './domain';

const DEFAULT_SYNC_BATCH_SIZE = 25;
const MAX_PULL_LIMIT = 250;

export interface SyncCredentials {
  accessToken: string;
  apiBaseUrl?: string | null;
  deviceId: string;
}

export async function probeSyncReachability(
  fetchImplementation: typeof globalThis.fetch | undefined = globalThis.fetch,
  baseUrl = resolveBootstrapBaseUrl('android'),
): Promise<SyncNetworkState> {
  const checkedAt = new Date().toISOString();

  if (typeof fetchImplementation !== 'function') {
    return {
      checkedAt,
      isExpensive: false,
      status: 'unknown',
    };
  }

  try {
    const response = await fetchImplementation(new URL('/health', baseUrl).toString(), {
      headers: {
        accept: 'application/json',
      },
      method: 'GET',
    });

    return {
      checkedAt,
      isExpensive: false,
      status: response.ok ? 'online' : 'offline',
    };
  } catch {
    return {
      checkedAt,
      isExpensive: false,
      status: 'offline',
    };
  }
}

export async function runSyncCycle({
  allowExpensiveNetwork = false,
  batchSize = DEFAULT_SYNC_BATCH_SIZE,
  credentials,
  fetchImplementation = globalThis.fetch,
  networkState,
  now = new Date().toISOString(),
  syncState,
}: {
  allowExpensiveNetwork?: boolean;
  batchSize?: number;
  credentials: SyncCredentials | null;
  fetchImplementation?: typeof globalThis.fetch;
  networkState: SyncNetworkState;
  now?: string;
  syncState: PersistedSyncState;
}): Promise<PersistedSyncState> {
  const nextSyncState = cloneSyncState(syncState);

  if (nextSyncState.outbox.length === 0) {
    return {
      ...nextSyncState,
      lastErrorMessage: null,
      lastStatus: nextSyncState.conflicts.length > 0 ? 'conflict' : 'idle',
    };
  }

  if (!credentials?.accessToken) {
    return {
      ...nextSyncState,
      lastErrorMessage: null,
      lastStatus: 'waiting_for_pairing',
    };
  }

  if (networkState.status === 'offline' || (networkState.isExpensive && !allowExpensiveNetwork)) {
    return {
      ...nextSyncState,
      lastErrorMessage: null,
      lastStatus: 'offline',
    };
  }

  const readyEntries = getReadyOutboxEntries(
    nextSyncState.outbox,
    nextSyncState.conflicts,
    now,
  );

  if (readyEntries.length === 0) {
    return {
      ...nextSyncState,
      lastStatus: nextSyncState.conflicts.length > 0 ? 'conflict' : 'retry_scheduled',
    };
  }

  if (typeof fetchImplementation !== 'function') {
    return scheduleRetry(nextSyncState, readyEntries.slice(0, batchSize), {
      errorCode: 'fetch_unavailable',
      errorMessage: 'Fetch API is unavailable in this runtime.',
      now,
    });
  }

  const batchEntries = readyEntries.slice(0, batchSize);
  const baseUrl = credentials.apiBaseUrl?.trim() || resolveBootstrapBaseUrl('android');

  nextSyncState.lastErrorMessage = null;
  nextSyncState.lastStatus = 'syncing';
  nextSyncState.lastSyncAttemptAt = now;

  try {
    const pushResponse = await pushSyncBatch({
      baseUrl,
      batchEntries,
      credentials,
      currentCursor: nextSyncState.lastCursor,
      fetchImplementation,
    });

    let updatedSyncState = applyPushResponse({
      now,
      pushResponse,
      syncState: nextSyncState,
    });

    if (
      pushResponse.accepted.length > 0 &&
      (pushResponse.conflicts ?? []).length === 0 &&
      pushResponse.rejected.length === 0
    ) {
      const pullResponse = await pullSyncChanges({
        baseUrl,
        credentials,
        cursor: updatedSyncState.lastCursor,
        fetchImplementation,
      });

      updatedSyncState = applyPullResponse({
        now,
        pullResponse,
        syncState: updatedSyncState,
      });
    }

    return finalizeSuccessfulCycle(updatedSyncState, now);
  } catch (error) {
    return scheduleRetry(nextSyncState, batchEntries, {
      errorCode: 'sync_request_failed',
      errorMessage:
        error instanceof Error
          ? error.message
          : 'The sync request failed before the queue could be updated.',
      now,
    });
  }
}

async function pushSyncBatch({
  baseUrl,
  batchEntries,
  credentials,
  currentCursor,
  fetchImplementation,
}: {
  baseUrl: string;
  batchEntries: SyncOutboxEntry[];
  credentials: SyncCredentials;
  currentCursor: string | null;
  fetchImplementation: typeof globalThis.fetch;
}): Promise<SyncPushResponse> {
  const requestBody: SyncPushRequest = {
    deviceId: credentials.deviceId,
    operations: batchEntries.map((entry) => ({
      entityId: entry.entityId,
      entityType: entry.entityType,
      entityVersion: entry.entityVersion,
      occurredAt:
        entry.occurredAt as NonNullable<SyncPushRequest['operations'][number]['occurredAt']>,
      opId: entry.opId,
      opType: entry.opType,
      payload: { ...entry.payload },
    })),
    ...(currentCursor ? { baseCursor: currentCursor } : {}),
  };
  const response = await fetchImplementation(new URL('/v1/sync/push', baseUrl).toString(), {
    body: JSON.stringify(requestBody),
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${credentials.accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': createBatchIdempotencyKey(batchEntries),
    },
    method: 'POST',
  });
  const payload = (await response.json()) as Partial<SyncPushResponse>;

  if (!response.ok || !isSyncPushResponse(payload)) {
    throw new Error(`Sync push failed with ${response.status}.`);
  }

  return payload;
}

async function pullSyncChanges({
  baseUrl,
  credentials,
  cursor,
  fetchImplementation,
}: {
  baseUrl: string;
  credentials: SyncCredentials;
  cursor: string | null;
  fetchImplementation: typeof globalThis.fetch;
}): Promise<SyncPullResponse> {
  const requestUrl = new URL('/v1/sync/pull', baseUrl);

  if (cursor) {
    requestUrl.searchParams.set('cursor', cursor);
  }

  requestUrl.searchParams.set('limit', String(MAX_PULL_LIMIT));

  const response = await fetchImplementation(requestUrl.toString(), {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${credentials.accessToken}`,
    },
    method: 'GET',
  });
  const payload = (await response.json()) as Partial<SyncPullResponse>;

  if (!response.ok || !isSyncPullResponse(payload)) {
    throw new Error(`Sync pull failed with ${response.status}.`);
  }

  return payload;
}

function applyPushResponse({
  now,
  pushResponse,
  syncState,
}: {
  now: string;
  pushResponse: SyncPushResponse;
  syncState: PersistedSyncState;
}): PersistedSyncState {
  const nextSyncState = cloneSyncState(syncState);
  const acceptedOpIds = new Set(pushResponse.accepted.map((record) => record.opId));
  const rejectedByOpId = new Map(pushResponse.rejected.map((record) => [record.opId, record]));
  const conflictsByEntityKey = new Map(
    (pushResponse.conflicts ?? []).map((record) => [
      `${record.entityType}:${record.entityId}`,
      record,
    ]),
  );

  nextSyncState.outbox = nextSyncState.outbox
    .map((entry) => {
      if (acceptedOpIds.has(entry.opId)) {
        return null;
      }

      const rejectedRecord = rejectedByOpId.get(entry.opId);

      if (rejectedRecord) {
        return {
          ...entry,
          lastAttemptAt: now,
          lastErrorCode: rejectedRecord.code,
          lastErrorMessage: rejectedRecord.message,
          nextRetryAt: null,
          status: 'blocked' as const,
        };
      }

      const conflictingRecord = conflictsByEntityKey.get(`${entry.entityType}:${entry.entityId}`);

      if (
        conflictingRecord &&
        conflictingRecord.clientVersion === entry.entityVersion
      ) {
        return {
          ...entry,
          lastAttemptAt: now,
          lastErrorCode: 'conflict',
          lastErrorMessage: conflictingRecord.conflictReason ?? 'Version mismatch',
          nextRetryAt: null,
          status: 'conflict' as const,
        };
      }

      return entry;
    })
    .filter((entry): entry is SyncOutboxEntry => Boolean(entry))
    .sort(compareOutboxEntries);

  for (const conflictRecord of pushResponse.conflicts ?? []) {
    nextSyncState.conflicts = upsertConflictQueueEntry(
      nextSyncState.conflicts,
      createSyncConflictQueueEntry({
        clientVersion: conflictRecord.clientVersion,
        conflictReason: conflictRecord.conflictReason ?? 'version_mismatch',
        detectedAt: now,
        entityId: conflictRecord.entityId,
        entityType: conflictRecord.entityType,
        opId: `push_${conflictRecord.entityType}_${conflictRecord.entityId}_${conflictRecord.serverVersion}`,
        serverState: { ...conflictRecord.serverState },
        serverVersion: conflictRecord.serverVersion,
        source: 'push',
      }),
    );
  }

  nextSyncState.lastCursor = pushResponse.newCursor;

  if ((pushResponse.conflicts ?? []).length > 0) {
    nextSyncState.lastStatus = 'conflict';
    return nextSyncState;
  }

  if (pushResponse.rejected.length > 0) {
    nextSyncState.lastErrorMessage = pushResponse.rejected[0]?.message ?? 'One or more sync operations were rejected.';
    nextSyncState.lastStatus = 'failed';
    return nextSyncState;
  }

  return nextSyncState;
}

function applyPullResponse({
  now,
  pullResponse,
  syncState,
}: {
  now: string;
  pullResponse: SyncPullResponse;
  syncState: PersistedSyncState;
}): PersistedSyncState {
  const nextSyncState = cloneSyncState(syncState);
  const localVersionMap = new Map(
    nextSyncState.entityVersions.map((record) => [`${record.entityType}:${record.entityId}`, record.version]),
  );

  nextSyncState.lastCursor = pullResponse.cursor;

  for (const change of pullResponse.changes) {
    const entityKey = `${change.entityType}:${change.entityId}`;
    const localVersion = localVersionMap.get(entityKey) ?? 0;

    if (change.version <= localVersion) {
      continue;
    }

    nextSyncState.conflicts = upsertConflictQueueEntry(
      nextSyncState.conflicts,
      createSyncConflictQueueEntry({
        clientVersion: localVersion,
        conflictReason:
          change.changeType === 'delete'
            ? 'remote_delete_pending_review'
            : 'remote_change_pending_review',
        detectedAt: now,
        entityId: change.entityId,
        entityType: change.entityType,
        opId: `pull_${change.entityType}_${change.entityId}_${change.version}`,
        serverState: { ...change.data },
        serverVersion: change.version,
        source: 'pull',
      }),
    );
  }

  if (nextSyncState.conflicts.length > 0) {
    nextSyncState.lastStatus = 'conflict';
  }

  return nextSyncState;
}

function finalizeSuccessfulCycle(
  syncState: PersistedSyncState,
  now: string,
): PersistedSyncState {
  if (syncState.conflicts.length > 0) {
    return {
      ...syncState,
      lastSyncSuccessAt: now,
      lastStatus: 'conflict',
    };
  }

  return {
    ...syncState,
    lastErrorMessage: null,
    lastStatus: syncState.outbox.length > 0 ? 'pending' : 'succeeded',
    lastSyncSuccessAt: now,
  };
}

function scheduleRetry(
  syncState: PersistedSyncState,
  batchEntries: SyncOutboxEntry[],
  {
    errorCode,
    errorMessage,
    now,
  }: {
    errorCode: string;
    errorMessage: string;
    now: string;
  },
): PersistedSyncState {
  const nextSyncState = cloneSyncState(syncState);
  const batchOpIds = new Set(batchEntries.map((entry) => entry.opId));
  const jitterSeed = batchEntries.map((entry) => entry.opId).join('|');
  const attemptCount = Math.max(...batchEntries.map((entry) => entry.attemptCount), 0) + 1;
  const retryDelayMs = computeSyncRetryDelayMs(attemptCount, jitterSeed);
  const nextRetryAt = addMillisecondsToIso(now, retryDelayMs);

  nextSyncState.lastErrorMessage = errorMessage;
  nextSyncState.lastStatus = 'retry_scheduled';
  nextSyncState.outbox = nextSyncState.outbox.map((entry) =>
    batchOpIds.has(entry.opId)
      ? {
          ...entry,
          attemptCount: entry.attemptCount + 1,
          lastAttemptAt: now,
          lastErrorCode: errorCode,
          lastErrorMessage: errorMessage,
          nextRetryAt,
          status: 'retry_scheduled',
        }
      : entry,
  );

  return nextSyncState;
}

function createBatchIdempotencyKey(batchEntries: SyncOutboxEntry[]): string {
  return `mobile_sync_${batchEntries
    .map((entry) => `${entry.opId}_${entry.entityVersion}`)
    .join('__')}`;
}

function addMillisecondsToIso(value: string, deltaMs: number): string {
  return new Date(new Date(value).getTime() + deltaMs).toISOString();
}

function isSyncPushResponse(value: Partial<SyncPushResponse>): value is SyncPushResponse {
  return (
    Array.isArray(value.accepted) &&
    Array.isArray(value.rejected) &&
    typeof value.newCursor === 'string'
  );
}

function isSyncPullResponse(value: Partial<SyncPullResponse>): value is SyncPullResponse {
  return (
    Array.isArray(value.changes) &&
    typeof value.cursor === 'string' &&
    typeof value.hasMore === 'boolean'
  );
}

function compareOutboxEntries(left: SyncOutboxEntry, right: SyncOutboxEntry): number {
  return (
    left.occurredAt.localeCompare(right.occurredAt) ||
    `${left.entityType}:${left.entityId}`.localeCompare(`${right.entityType}:${right.entityId}`) ||
    left.entityVersion - right.entityVersion
  );
}
