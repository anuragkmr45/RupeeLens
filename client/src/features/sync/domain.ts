import type {
  SyncEntityType,
  SyncOperationType,
} from '@upi-spend-tracker/contracts';

import type { PersistedSpendTrackerState, SyncMode } from '../spend-tracker/persistence';

export type SyncOverallStatus =
  | 'conflict'
  | 'failed'
  | 'idle'
  | 'local_only_paused'
  | 'offline'
  | 'pending'
  | 'retry_scheduled'
  | 'succeeded'
  | 'syncing'
  | 'waiting_for_pairing';

export type SyncOutboxStatus =
  | 'blocked'
  | 'conflict'
  | 'pending'
  | 'retry_scheduled';

export type SyncNetworkStatus = 'offline' | 'online' | 'unknown';

export interface SyncEntityVersionRecord {
  entityId: string;
  entityType: SyncEntityType;
  version: number;
}

export interface SyncOutboxEntry {
  attemptCount: number;
  createdAt: string;
  entityId: string;
  entityType: SyncEntityType;
  entityVersion: number;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  nextRetryAt: string | null;
  occurredAt: string;
  opId: string;
  opType: SyncOperationType;
  payload: Record<string, unknown>;
  status: SyncOutboxStatus;
}

export interface SyncConflictQueueEntry {
  clientVersion: number;
  conflictReason: string;
  detectedAt: string;
  entityId: string;
  entityType: SyncEntityType;
  id: string;
  opId: string;
  serverState: Record<string, unknown>;
  serverVersion: number;
  source: 'pull' | 'push';
}

export interface PersistedSyncState {
  conflicts: SyncConflictQueueEntry[];
  deviceId: string;
  entityVersions: SyncEntityVersionRecord[];
  lastCursor: string | null;
  lastErrorMessage: string | null;
  lastStatus: SyncOverallStatus;
  lastSyncAttemptAt: string | null;
  lastSyncSuccessAt: string | null;
  outbox: SyncOutboxEntry[];
}

export interface SyncNetworkState {
  checkedAt: string | null;
  isExpensive: boolean;
  status: SyncNetworkStatus;
}

export interface SyncQueueSummary {
  conflictCount: number;
  detail: string;
  lastStatus: SyncOverallStatus;
  nextRetryAt: string | null;
  pendingCount: number;
  readyCount: number;
  statusLabel: string;
  tone: 'pending' | 'ready';
}

interface SerializedSyncEntity {
  entityId: string;
  entityType: SyncEntityType;
  payload: Record<string, unknown>;
}

const DEFAULT_BACKOFF_BASE_MS = 5_000;
const DEFAULT_BACKOFF_CAP_MS = 5 * 60_000;

export function createInitialSyncState(
  now = new Date().toISOString(),
): PersistedSyncState {
  return {
    conflicts: [],
    deviceId: createSyncDeviceId(now),
    entityVersions: [],
    lastCursor: null,
    lastErrorMessage: null,
    lastStatus: 'idle',
    lastSyncAttemptAt: null,
    lastSyncSuccessAt: null,
    outbox: [],
  };
}

export function createInitialSyncNetworkState(): SyncNetworkState {
  return {
    checkedAt: null,
    isExpensive: false,
    status: 'unknown',
  };
}

export function queueSyncOperationsFromStateDiff({
  currentSyncState,
  nextState,
  now = new Date().toISOString(),
  previousState,
}: {
  currentSyncState: PersistedSyncState;
  nextState: PersistedSpendTrackerState;
  now?: string;
  previousState: PersistedSpendTrackerState;
}): PersistedSyncState {
  if (nextState.onboardingPreferences.syncMode === 'local_only') {
    return {
      ...currentSyncState,
      lastStatus: currentSyncState.outbox.length > 0 ? 'local_only_paused' : 'idle',
      ...(currentSyncState.lastErrorMessage
        ? { lastErrorMessage: null }
        : {}),
    };
  }

  const previousEntities =
    previousState.onboardingPreferences.syncMode === 'local_only'
      ? []
      : serializeSpendTrackerStateForSync(previousState);
  const nextEntities = serializeSpendTrackerStateForSync(nextState);
  const nextSyncState = cloneSyncState(currentSyncState);
  const entityVersionMap = new Map(
    nextSyncState.entityVersions.map((record) => [getEntityKey(record), record.version]),
  );
  const diffs = diffSerializedEntities(previousEntities, nextEntities);

  if (diffs.length === 0) {
    return {
      ...nextSyncState,
      lastStatus: getNextIdleLikeStatus(nextSyncState),
      ...(nextSyncState.lastErrorMessage ? { lastErrorMessage: null } : {}),
    };
  }

  const nextOutboxEntries = diffs.map((diff) => {
    const entityKey = `${diff.entityType}:${diff.entityId}`;
    const nextVersion = (entityVersionMap.get(entityKey) ?? 0) + 1;
    entityVersionMap.set(entityKey, nextVersion);

    return {
      attemptCount: 0,
      createdAt: now,
      entityId: diff.entityId,
      entityType: diff.entityType,
      entityVersion: nextVersion,
      lastAttemptAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      nextRetryAt: null,
      occurredAt: now,
      opId: createOutboxOperationId(diff.entityType, diff.entityId, nextVersion, now),
      opType: diff.opType,
      payload: diff.payload,
      status: 'pending' as const,
    };
  });

  return {
    ...nextSyncState,
    entityVersions: [...entityVersionMap.entries()]
      .map(([entityKey, version]) => {
        const [entityType, entityId] = splitEntityKey(entityKey);

        return {
          entityId,
          entityType,
          version,
        };
      })
      .sort(compareEntityVersions),
    lastErrorMessage: null,
    lastStatus: nextSyncState.conflicts.length > 0 ? 'conflict' : 'pending',
    outbox: [...nextSyncState.outbox, ...nextOutboxEntries].sort(compareOutboxEntries),
  };
}

export function createSyncConflictQueueEntry({
  clientVersion,
  conflictReason,
  detectedAt,
  entityId,
  entityType,
  opId,
  serverState,
  serverVersion,
  source,
}: {
  clientVersion: number;
  conflictReason: string;
  detectedAt: string;
  entityId: string;
  entityType: SyncEntityType;
  opId: string;
  serverState: Record<string, unknown>;
  serverVersion: number;
  source: 'pull' | 'push';
}): SyncConflictQueueEntry {
  return {
    clientVersion,
    conflictReason,
    detectedAt,
    entityId,
    entityType,
    id: createConflictId(source, entityType, entityId, serverVersion),
    opId,
    serverState,
    serverVersion,
    source,
  };
}

export function upsertConflictQueueEntry(
  conflicts: SyncConflictQueueEntry[],
  nextConflict: SyncConflictQueueEntry,
): SyncConflictQueueEntry[] {
  const existingConflictIndex = conflicts.findIndex((conflict) => conflict.id === nextConflict.id);

  if (existingConflictIndex === -1) {
    return [...conflicts, nextConflict].sort(compareConflicts);
  }

  const nextConflicts = [...conflicts];
  nextConflicts[existingConflictIndex] = nextConflict;
  return nextConflicts.sort(compareConflicts);
}

export function computeSyncRetryDelayMs(
  attemptCount: number,
  jitterSeed: string,
  baseDelayMs = DEFAULT_BACKOFF_BASE_MS,
  capDelayMs = DEFAULT_BACKOFF_CAP_MS,
): number {
  const exponent = Math.max(0, attemptCount - 1);
  const uncappedDelayMs = baseDelayMs * 2 ** exponent;
  const cappedDelayMs = Math.min(capDelayMs, uncappedDelayMs);
  const deterministicJitterMs = Math.floor(cappedDelayMs * 0.2 * hashRatio(jitterSeed));

  return cappedDelayMs + deterministicJitterMs;
}

export function getNextRetryAt(outbox: SyncOutboxEntry[]): string | null {
  return outbox
    .map((entry) => entry.nextRetryAt)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .sort((left, right) => left.localeCompare(right))[0] ?? null;
}

export function getReadyOutboxEntries(
  outbox: SyncOutboxEntry[],
  conflicts: SyncConflictQueueEntry[],
  now = new Date().toISOString(),
): SyncOutboxEntry[] {
  const conflictedEntityKeys = new Set(
    conflicts.map((conflict) => `${conflict.entityType}:${conflict.entityId}`),
  );

  return outbox.filter((entry) => {
    if (entry.status === 'blocked' || entry.status === 'conflict') {
      return false;
    }

    if (conflictedEntityKeys.has(`${entry.entityType}:${entry.entityId}`)) {
      return false;
    }

    if (!entry.nextRetryAt) {
      return true;
    }

    return entry.nextRetryAt <= now;
  });
}

export function buildSyncQueueSummary({
  hasSyncCredentials,
  networkState,
  syncMode,
  syncState,
}: {
  hasSyncCredentials: boolean;
  networkState: SyncNetworkState;
  syncMode: SyncMode;
  syncState: PersistedSyncState;
}): SyncQueueSummary {
  const conflictCount = syncState.conflicts.length;
  const pendingCount = syncState.outbox.length;
  const readyCount = getReadyOutboxEntries(
    syncState.outbox,
    syncState.conflicts,
  ).length;
  const nextRetryAt = getNextRetryAt(syncState.outbox);

  if (syncMode === 'local_only') {
    return {
      conflictCount,
      detail:
        pendingCount > 0
          ? `${pendingCount} queued write${pendingCount === 1 ? '' : 's'} stay paused until sync mode is enabled again.`
          : 'Local-only mode keeps every write on this device and never attempts cloud sync.',
      lastStatus: 'local_only_paused',
      nextRetryAt,
      pendingCount,
      readyCount,
      statusLabel: 'Cloud sync paused',
      tone: 'pending',
    };
  }

  if (conflictCount > 0) {
    return {
      conflictCount,
      detail:
        pendingCount > 0
          ? `${conflictCount} conflict${conflictCount === 1 ? '' : 's'} need review before ${pendingCount} queued write${pendingCount === 1 ? '' : 's'} can finish syncing.`
          : `${conflictCount} conflict${conflictCount === 1 ? '' : 's'} need review before remote changes can be trusted locally.`,
      lastStatus: 'conflict',
      nextRetryAt,
      pendingCount,
      readyCount,
      statusLabel: 'Conflicts need review',
      tone: 'pending',
    };
  }

  if (pendingCount === 0) {
    return {
      conflictCount,
      detail:
        syncState.lastSyncSuccessAt
          ? `No queued writes remain. The last successful sync checkpoint was ${formatSyncMoment(syncState.lastSyncSuccessAt)}.`
          : 'No queued writes remain on this device right now.',
      lastStatus: syncState.lastStatus === 'failed' ? 'failed' : 'idle',
      nextRetryAt,
      pendingCount,
      readyCount,
      statusLabel: 'Outbox is clear',
      tone: 'ready',
    };
  }

  if (!hasSyncCredentials) {
    return {
      conflictCount,
      detail: `${pendingCount} queued write${pendingCount === 1 ? '' : 's'} are safe locally. Pairing or session setup still has to land before cloud sync can start.`,
      lastStatus: 'waiting_for_pairing',
      nextRetryAt,
      pendingCount,
      readyCount,
      statusLabel: 'Waiting for pairing',
      tone: 'pending',
    };
  }

  if (networkState.status === 'offline') {
    return {
      conflictCount,
      detail: `${pendingCount} queued write${pendingCount === 1 ? '' : 's'} will retry once the network returns. Nothing is blocked from the local workflow.`,
      lastStatus: 'offline',
      nextRetryAt,
      pendingCount,
      readyCount,
      statusLabel: 'Offline, queue retained',
      tone: 'pending',
    };
  }

  if (nextRetryAt) {
    return {
      conflictCount,
      detail: `${pendingCount} queued write${pendingCount === 1 ? '' : 's'} are waiting for the next retry window at ${formatSyncMoment(nextRetryAt)}.`,
      lastStatus: 'retry_scheduled',
      nextRetryAt,
      pendingCount,
      readyCount,
      statusLabel: 'Retry scheduled',
      tone: 'pending',
    };
  }

  if (readyCount > 0) {
    return {
      conflictCount,
      detail: `${readyCount} queued write${readyCount === 1 ? '' : 's'} are ready for the next sync pass while the app stays active.`,
      lastStatus: 'pending',
      nextRetryAt,
      pendingCount,
      readyCount,
      statusLabel: 'Queued locally',
      tone: 'pending',
    };
  }

  return {
    conflictCount,
    detail: `${pendingCount} queued write${pendingCount === 1 ? '' : 's'} are waiting for the current sync constraints to clear.`,
    lastStatus: syncState.lastStatus,
    nextRetryAt,
    pendingCount,
    readyCount,
    statusLabel: 'Queue retained',
    tone: 'pending',
  };
}

export function cloneSyncState(syncState: PersistedSyncState): PersistedSyncState {
  return {
    conflicts: syncState.conflicts.map((conflict) => ({
      ...conflict,
      serverState: { ...conflict.serverState },
    })),
    deviceId: syncState.deviceId,
    entityVersions: syncState.entityVersions.map((record) => ({ ...record })),
    lastCursor: syncState.lastCursor,
    lastErrorMessage: syncState.lastErrorMessage,
    lastStatus: syncState.lastStatus,
    lastSyncAttemptAt: syncState.lastSyncAttemptAt,
    lastSyncSuccessAt: syncState.lastSyncSuccessAt,
    outbox: syncState.outbox.map((entry) => ({
      ...entry,
      payload: { ...entry.payload },
    })),
  };
}

function serializeSpendTrackerStateForSync(
  state: PersistedSpendTrackerState,
): SerializedSyncEntity[] {
  const serializedEntities: SerializedSyncEntity[] = [];

  for (const category of state.categories) {
    serializedEntities.push({
      entityId: category.id,
      entityType: 'category',
      payload: {
        description: category.description,
        id: category.id,
        isDefault: category.isDefault,
        label: category.label,
      },
    });
  }

  for (const merchant of state.merchants ?? []) {
    serializedEntities.push({
      entityId: merchant.id,
      entityType: 'merchant',
      payload: {
        id: merchant.id,
        label: merchant.label,
        normalizedLabel: merchant.normalizedLabel,
      },
    });
  }

  for (const merchantAlias of state.merchantAliases ?? []) {
    serializedEntities.push({
      entityId: merchantAlias.id,
      entityType: 'merchant_alias',
      payload: {
        alias: merchantAlias.alias,
        confidenceBps: merchantAlias.confidenceBps,
        id: merchantAlias.id,
        merchantId: merchantAlias.merchantId,
        normalizedAlias: merchantAlias.normalizedAlias,
        source: merchantAlias.source,
      },
    });
  }

  for (const rule of state.rules ?? []) {
    serializedEntities.push({
      entityId: rule.id,
      entityType: 'rule',
      payload: {
        amountBucket: rule.amountBucket,
        autoApply: rule.autoApply,
        categoryId: rule.categoryId,
        createdAt: rule.createdAt,
        hourBucket: rule.hourBucket,
        id: rule.id,
        itemLabel: rule.itemLabel,
        merchantId: rule.merchantId,
        merchantLabel: rule.merchantLabel,
        merchantNormalizedLabel: rule.merchantNormalizedLabel,
        updatedAt: rule.updatedAt,
        weekday: rule.weekday,
      },
    });
  }

  for (const budget of state.budgets ?? []) {
    serializedEntities.push({
      entityId: budget.id,
      entityType: 'budget',
      payload: {
        categoryId: budget.categoryId ?? null,
        createdAt: budget.createdAt,
        id: budget.id,
        itemLabel: budget.itemLabel ?? null,
        label: budget.label,
        merchantId: budget.merchantId ?? null,
        merchantLabel: budget.merchantLabel ?? null,
        merchantNormalizedLabel: budget.merchantNormalizedLabel ?? null,
        period: budget.period,
        rollingWindowDays: budget.rollingWindowDays ?? null,
        scope: budget.scope,
        startsOnDay: budget.startsOnDay ?? null,
        targetMinor: budget.targetMinor,
        updatedAt: budget.updatedAt,
        weekStartsOn: budget.weekStartsOn ?? null,
      },
    });
  }

  for (const transaction of state.transactions) {
    serializedEntities.push({
      entityId: transaction.id,
      entityType: 'transaction',
      payload: {
        amountMinor: transaction.amountMinor,
        capturedAt: transaction.capturedAt,
        history: (transaction.history ?? []).map((entry) => ({
          at: entry.at,
          id: entry.id,
          kind: entry.kind,
          summary: entry.summary,
        })),
        id: transaction.id,
        merchant: transaction.merchant,
        merchantConfidenceBps: transaction.merchantConfidenceBps ?? null,
        merchantId: transaction.merchantId ?? null,
        merchantMatchKind: transaction.merchantMatchKind ?? null,
        merchantRaw: transaction.merchantRaw ?? transaction.merchant,
        note: transaction.note ?? '',
        parserInfo: transaction.parserInfo
          ? {
              confidenceBps: transaction.parserInfo.confidenceBps,
              parserId: transaction.parserInfo.parserId,
              parserVersion: transaction.parserInfo.parserVersion,
            }
          : null,
        sourceApp: transaction.sourceApp,
        status: transaction.status,
      },
    });

    transaction.items.forEach((item, index) => {
      serializedEntities.push({
        entityId: item.id,
        entityType: 'transaction_item',
        payload: {
          amountMinor: item.amountMinor,
          categoryId: item.categoryId,
          id: item.id,
          label: item.label,
          sortOrder: index,
          transactionId: transaction.id,
        },
      });
    });
  }

  return serializedEntities.sort(compareSerializedEntities);
}

function diffSerializedEntities(
  previousEntities: SerializedSyncEntity[],
  nextEntities: SerializedSyncEntity[],
): Array<SerializedSyncEntity & { opType: SyncOperationType }> {
  const previousEntityMap = new Map(
    previousEntities.map((entity) => [getEntityKey(entity), entity]),
  );
  const nextEntityMap = new Map(
    nextEntities.map((entity) => [getEntityKey(entity), entity]),
  );
  const allEntityKeys = [...new Set([...previousEntityMap.keys(), ...nextEntityMap.keys()])].sort();
  const diffs: Array<SerializedSyncEntity & { opType: SyncOperationType }> = [];

  for (const entityKey of allEntityKeys) {
    const previousEntity = previousEntityMap.get(entityKey) ?? null;
    const nextEntity = nextEntityMap.get(entityKey) ?? null;

    if (!previousEntity && nextEntity) {
      diffs.push({
        ...nextEntity,
        opType: 'upsert',
      });
      continue;
    }

    if (previousEntity && !nextEntity) {
      diffs.push({
        entityId: previousEntity.entityId,
        entityType: previousEntity.entityType,
        opType: 'delete',
        payload: {},
      });
      continue;
    }

    if (previousEntity && nextEntity && !arePayloadsEqual(previousEntity.payload, nextEntity.payload)) {
      diffs.push({
        ...nextEntity,
        opType: 'upsert',
      });
    }
  }

  return diffs;
}

function arePayloadsEqual(
  leftPayload: Record<string, unknown>,
  rightPayload: Record<string, unknown>,
): boolean {
  return JSON.stringify(leftPayload) === JSON.stringify(rightPayload);
}

function getNextIdleLikeStatus(syncState: PersistedSyncState): SyncOverallStatus {
  if (syncState.conflicts.length > 0) {
    return 'conflict';
  }

  if (syncState.outbox.some((entry) => entry.nextRetryAt)) {
    return 'retry_scheduled';
  }

  return syncState.outbox.length > 0 ? 'pending' : 'idle';
}

function createSyncDeviceId(now: string): string {
  const compactTime = now.replace(/[^0-9]/g, '').slice(0, 14);
  return `device_${compactTime}_${Math.random().toString(36).slice(2, 10)}`;
}

function createOutboxOperationId(
  entityType: SyncEntityType,
  entityId: string,
  entityVersion: number,
  now: string,
): string {
  return `${entityType}_${entityId}_v${entityVersion}_${hashString(`${entityType}:${entityId}:${entityVersion}:${now}`)}`;
}

function createConflictId(
  source: 'pull' | 'push',
  entityType: SyncEntityType,
  entityId: string,
  serverVersion: number,
): string {
  return `${source}_${entityType}_${entityId}_v${serverVersion}`;
}

function getEntityKey(entity: Pick<SerializedSyncEntity, 'entityId' | 'entityType'>): string {
  return `${entity.entityType}:${entity.entityId}`;
}

function splitEntityKey(entityKey: string): [SyncEntityType, string] {
  const separatorIndex = entityKey.indexOf(':');
  return [
    entityKey.slice(0, separatorIndex) as SyncEntityType,
    entityKey.slice(separatorIndex + 1),
  ];
}

function compareSerializedEntities(left: SerializedSyncEntity, right: SerializedSyncEntity): number {
  return `${left.entityType}:${left.entityId}`.localeCompare(`${right.entityType}:${right.entityId}`);
}

function compareEntityVersions(
  left: SyncEntityVersionRecord,
  right: SyncEntityVersionRecord,
): number {
  return `${left.entityType}:${left.entityId}`.localeCompare(`${right.entityType}:${right.entityId}`);
}

function compareOutboxEntries(left: SyncOutboxEntry, right: SyncOutboxEntry): number {
  return (
    left.occurredAt.localeCompare(right.occurredAt) ||
    `${left.entityType}:${left.entityId}`.localeCompare(`${right.entityType}:${right.entityId}`) ||
    left.entityVersion - right.entityVersion
  );
}

function compareConflicts(
  left: SyncConflictQueueEntry,
  right: SyncConflictQueueEntry,
): number {
  return (
    right.detectedAt.localeCompare(left.detectedAt) ||
    `${left.entityType}:${left.entityId}`.localeCompare(`${right.entityType}:${right.entityId}`)
  );
}

function formatSyncMoment(value: string): string {
  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return value;
  }

  return parsedValue.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function hashString(value: string): string {
  return Math.abs(hashNumber(value)).toString(36);
}

function hashRatio(value: string): number {
  return (Math.abs(hashNumber(value)) % 10_000) / 10_000;
}

function hashNumber(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return hash;
}
