import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import type {
  EntityChange,
  OperationAck,
  SyncEntityType,
  SyncOperationType,
  SyncPushResponse,
} from '@upi-spend-tracker/contracts';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

export interface StoredSyncEntity {
  data: Record<string, unknown>;
  entityId: string;
  entityType: SyncEntityType;
  updatedAt: IsoUtcDateTimeString;
  userId: string;
  version: number;
}

export interface StoredEntityChange extends EntityChange {
  cursor: string;
  userId: string;
}

export interface StoredIdempotencyRecord {
  createdAt: IsoUtcDateTimeString;
  deviceId: string;
  idempotencyKey: string;
  requestDigest: string;
  response: SyncPushResponse;
  userId: string;
}

export interface StoredAppliedOperation extends OperationAck {
  userId: string;
}

export interface StoreEntityChangeInput {
  changeType: SyncOperationType;
  data: Record<string, unknown>;
  entityId: string;
  entityType: SyncEntityType;
  updatedAt: IsoUtcDateTimeString;
  userId: string;
  version: number;
}

export interface CreateSyncRepositoryOptions {
  syncStoreFile: string;
}

export interface ListEntityChangesResult {
  changes: StoredEntityChange[];
  hasMore: boolean;
  latestCursor: string;
}

export interface SyncRepository {
  close(): void;
  findAppliedOperation(userId: string, opId: string): StoredAppliedOperation | null;
  findEntity(
    userId: string,
    entityType: SyncEntityType,
    entityId: string,
  ): StoredSyncEntity | null;
  findIdempotencyRecord(
    userId: string,
    deviceId: string,
    idempotencyKey: string,
  ): StoredIdempotencyRecord | null;
  getLatestCursor(userId: string): string;
  listEntityChanges(userId: string, afterCursor: string | null, limit: number): ListEntityChangesResult;
  saveAppliedOperation(record: StoredAppliedOperation): void;
  saveEntity(record: StoredSyncEntity): void;
  saveEntityChange(input: StoreEntityChangeInput): StoredEntityChange;
  saveIdempotencyRecord(record: StoredIdempotencyRecord): void;
}

interface SerializedSyncRepositoryState {
  appliedOperations: StoredAppliedOperation[];
  changes: StoredEntityChange[];
  cursorCounters: Record<string, number>;
  entities: StoredSyncEntity[];
  idempotencyRecords: StoredIdempotencyRecord[];
  version: 1;
}

const SYNC_STORE_VERSION = 1;

function cloneStoredSyncEntity(record: StoredSyncEntity): StoredSyncEntity {
  return {
    ...record,
    data: { ...record.data },
  };
}

function cloneStoredEntityChange(record: StoredEntityChange): StoredEntityChange {
  return {
    ...record,
    data: { ...record.data },
  };
}

function cloneStoredIdempotencyRecord(record: StoredIdempotencyRecord): StoredIdempotencyRecord {
  return {
    ...record,
    response: cloneSyncPushResponse(record.response),
  };
}

function cloneStoredAppliedOperation(record: StoredAppliedOperation): StoredAppliedOperation {
  return { ...record };
}

function cloneSyncPushResponse(response: SyncPushResponse): SyncPushResponse {
  return {
    accepted: response.accepted.map((record) => ({ ...record })),
    ...(response.conflicts
      ? {
          conflicts: response.conflicts.map((record) => ({
            ...record,
            serverState: { ...record.serverState },
          })),
        }
      : {}),
    newCursor: response.newCursor,
    rejected: response.rejected.map((record) => ({
      code: record.code,
      message: record.message,
      opId: record.opId,
      ...(record.fieldErrors
        ? {
            fieldErrors: record.fieldErrors.map((fieldError) => ({ ...fieldError })),
          }
        : {}),
    })),
  };
}

function loadState(syncStoreFile: string): SerializedSyncRepositoryState {
  try {
    const parsed = JSON.parse(readFileSync(syncStoreFile, 'utf8')) as Partial<SerializedSyncRepositoryState>;

    if (parsed.version !== SYNC_STORE_VERSION) {
      throw new Error(`Unsupported sync store version in ${syncStoreFile}: ${String(parsed.version)}`);
    }

    return {
      appliedOperations: Array.isArray(parsed.appliedOperations) ? parsed.appliedOperations : [],
      changes: Array.isArray(parsed.changes) ? parsed.changes : [],
      cursorCounters: parsed.cursorCounters ?? {},
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      idempotencyRecords: Array.isArray(parsed.idempotencyRecords) ? parsed.idempotencyRecords : [],
      version: SYNC_STORE_VERSION,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        appliedOperations: [],
        changes: [],
        cursorCounters: {},
        entities: [],
        idempotencyRecords: [],
        version: SYNC_STORE_VERSION,
      };
    }

    throw error;
  }
}

function writeState(syncStoreFile: string, state: SerializedSyncRepositoryState): void {
  mkdirSync(path.dirname(syncStoreFile), {
    recursive: true,
  });

  const tempFile = `${syncStoreFile}.${process.pid}.tmp`;

  try {
    writeFileSync(tempFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    renameSync(tempFile, syncStoreFile);
  } catch (error) {
    try {
      unlinkSync(tempFile);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw cleanupError;
      }
    }

    throw error;
  }
}

export function createSyncRepository({
  syncStoreFile,
}: CreateSyncRepositoryOptions): SyncRepository {
  const initialState = loadState(syncStoreFile);
  const entityKey = (userId: string, entityType: SyncEntityType, entityId: string) =>
    `${userId}:${entityType}:${entityId}`;
  const idempotencyKey = (userId: string, deviceId: string, key: string) =>
    `${userId}:${deviceId}:${key}`;
  const appliedOperationKey = (userId: string, opId: string) => `${userId}:${opId}`;
  const entities = new Map(
    initialState.entities.map((record) => [
      entityKey(record.userId, record.entityType, record.entityId),
      cloneStoredSyncEntity(record),
    ]),
  );
  const changes = initialState.changes.map(cloneStoredEntityChange);
  const idempotencyRecords = new Map(
    initialState.idempotencyRecords.map((record) => [
      idempotencyKey(record.userId, record.deviceId, record.idempotencyKey),
      cloneStoredIdempotencyRecord(record),
    ]),
  );
  const appliedOperations = new Map(
    initialState.appliedOperations.map((record) => [
      appliedOperationKey(record.userId, record.opId),
      cloneStoredAppliedOperation(record),
    ]),
  );
  const cursorCounters = new Map(
    Object.entries(initialState.cursorCounters).map(([userId, cursor]) => [userId, Number(cursor)]),
  );

  function persist(): void {
    writeState(syncStoreFile, {
      appliedOperations: [...appliedOperations.values()].map(cloneStoredAppliedOperation),
      changes: changes.map(cloneStoredEntityChange),
      cursorCounters: Object.fromEntries(cursorCounters),
      entities: [...entities.values()].map(cloneStoredSyncEntity),
      idempotencyRecords: [...idempotencyRecords.values()].map(cloneStoredIdempotencyRecord),
      version: SYNC_STORE_VERSION,
    });
  }

  return {
    close() {},
    findAppliedOperation(userId, opId) {
      const record = appliedOperations.get(appliedOperationKey(userId, opId));
      return record ? cloneStoredAppliedOperation(record) : null;
    },
    findEntity(userId, entityType, entityId) {
      const record = entities.get(entityKey(userId, entityType, entityId));
      return record ? cloneStoredSyncEntity(record) : null;
    },
    findIdempotencyRecord(userId, deviceId, key) {
      const record = idempotencyRecords.get(idempotencyKey(userId, deviceId, key));
      return record ? cloneStoredIdempotencyRecord(record) : null;
    },
    getLatestCursor(userId) {
      return String(cursorCounters.get(userId) ?? 0);
    },
    listEntityChanges(userId, afterCursor, limit) {
      const afterCursorNumber = afterCursor ? Number(afterCursor) : 0;
      const userChanges = changes
        .filter((change) => change.userId === userId && Number(change.cursor) > afterCursorNumber)
        .sort((left, right) => Number(left.cursor) - Number(right.cursor));
      const window = userChanges.slice(0, limit);

      return {
        changes: window.map(cloneStoredEntityChange),
        hasMore: userChanges.length > limit,
        latestCursor: String(cursorCounters.get(userId) ?? 0),
      };
    },
    saveAppliedOperation(record) {
      appliedOperations.set(
        appliedOperationKey(record.userId, record.opId),
        cloneStoredAppliedOperation(record),
      );
      persist();
    },
    saveEntity(record) {
      entities.set(
        entityKey(record.userId, record.entityType, record.entityId),
        cloneStoredSyncEntity(record),
      );
      persist();
    },
    saveEntityChange(input) {
      const nextCursor = (cursorCounters.get(input.userId) ?? 0) + 1;
      const record: StoredEntityChange = {
        ...input,
        cursor: String(nextCursor),
      };

      cursorCounters.set(input.userId, nextCursor);
      changes.push(cloneStoredEntityChange(record));
      persist();

      return record;
    },
    saveIdempotencyRecord(record) {
      idempotencyRecords.set(
        idempotencyKey(record.userId, record.deviceId, record.idempotencyKey),
        cloneStoredIdempotencyRecord(record),
      );
      persist();
    },
  };
}
