import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { applyMobileMigrations } from '../spend-tracker/db/migration-runner';
import {
  createInitialSyncState,
  type PersistedSyncState,
  type SyncConflictQueueEntry,
  type SyncEntityVersionRecord,
  type SyncOutboxEntry,
} from './domain';

const DATABASE_NAME = 'spend-tracker.db';

interface SyncSettingRow {
  key: string;
  value: string;
}

interface SyncEntityVersionRow {
  entityId: string;
  entityType: SyncEntityVersionRecord['entityType'];
  version: number;
}

interface SyncOutboxRow {
  attemptCount: number;
  createdAt: string;
  entityId: string;
  entityType: SyncOutboxEntry['entityType'];
  entityVersion: number;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  nextRetryAt: string | null;
  occurredAt: string;
  opId: string;
  opType: SyncOutboxEntry['opType'];
  payloadJson: string;
  status: SyncOutboxEntry['status'];
}

interface SyncConflictRow {
  clientVersion: number;
  conflictReason: string;
  detectedAt: string;
  entityId: string;
  entityType: SyncConflictQueueEntry['entityType'];
  id: string;
  opId: string;
  serverStateJson: string;
  serverVersion: number;
  source: SyncConflictQueueEntry['source'];
}

let databasePromise: Promise<SQLiteDatabase> | null = null;
let schemaPromise: Promise<void> | null = null;

export async function loadStoredSyncState(): Promise<PersistedSyncState> {
  const database = await getDatabase();
  const [settingRows, entityVersionRows, outboxRows, conflictRows] = await Promise.all([
    database.getAllAsync<SyncSettingRow>('SELECT key, value FROM sync_settings'),
    database.getAllAsync<SyncEntityVersionRow>(
      `
        SELECT
          entity_type as entityType,
          entity_id as entityId,
          version
        FROM sync_entity_versions
        ORDER BY entity_type ASC, entity_id ASC
      `,
    ),
    database.getAllAsync<SyncOutboxRow>(
      `
        SELECT
          op_id as opId,
          entity_type as entityType,
          entity_id as entityId,
          entity_version as entityVersion,
          op_type as opType,
          payload_json as payloadJson,
          occurred_at as occurredAt,
          created_at as createdAt,
          status,
          attempt_count as attemptCount,
          last_attempt_at as lastAttemptAt,
          last_error_code as lastErrorCode,
          last_error_message as lastErrorMessage,
          next_retry_at as nextRetryAt
        FROM sync_outbox
        ORDER BY occurred_at ASC, entity_type ASC, entity_id ASC, entity_version ASC
      `,
    ),
    database.getAllAsync<SyncConflictRow>(
      `
        SELECT
          id,
          source,
          op_id as opId,
          entity_type as entityType,
          entity_id as entityId,
          client_version as clientVersion,
          server_version as serverVersion,
          conflict_reason as conflictReason,
          detected_at as detectedAt,
          server_state_json as serverStateJson
        FROM sync_conflicts
        ORDER BY detected_at DESC, entity_type ASC, entity_id ASC
      `,
    ),
  ]);
  const defaultSyncState = createInitialSyncState();
  const syncSettings = new Map(settingRows.map((row) => [row.key, row.value]));

  return {
    conflicts: conflictRows.map((row) => ({
      clientVersion: row.clientVersion,
      conflictReason: row.conflictReason,
      detectedAt: row.detectedAt,
      entityId: row.entityId,
      entityType: row.entityType,
      id: row.id,
      opId: row.opId,
      serverState: parseJsonRecord(row.serverStateJson),
      serverVersion: row.serverVersion,
      source: row.source,
    })),
    deviceId: syncSettings.get('device_id') ?? defaultSyncState.deviceId,
    entityVersions: entityVersionRows.map((row) => ({
      entityId: row.entityId,
      entityType: row.entityType,
      version: row.version,
    })),
    lastCursor: normalizeOptionalString(syncSettings.get('last_cursor') ?? null),
    lastErrorMessage: normalizeOptionalString(syncSettings.get('last_error_message') ?? null),
    lastStatus: parseLastStatus(syncSettings.get('last_status')) ?? defaultSyncState.lastStatus,
    lastSyncAttemptAt: normalizeOptionalString(syncSettings.get('last_sync_attempt_at') ?? null),
    lastSyncSuccessAt: normalizeOptionalString(syncSettings.get('last_sync_success_at') ?? null),
    outbox: outboxRows.map((row) => ({
      attemptCount: row.attemptCount,
      createdAt: row.createdAt,
      entityId: row.entityId,
      entityType: row.entityType,
      entityVersion: row.entityVersion,
      lastAttemptAt: normalizeOptionalString(row.lastAttemptAt),
      lastErrorCode: normalizeOptionalString(row.lastErrorCode),
      lastErrorMessage: normalizeOptionalString(row.lastErrorMessage),
      nextRetryAt: normalizeOptionalString(row.nextRetryAt),
      occurredAt: row.occurredAt,
      opId: row.opId,
      opType: row.opType,
      payload: parseJsonRecord(row.payloadJson),
      status: row.status,
    })),
  };
}

export async function saveStoredSyncState(
  syncState: PersistedSyncState,
): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM sync_conflicts');
    await database.runAsync('DELETE FROM sync_outbox');
    await database.runAsync('DELETE FROM sync_entity_versions');
    await database.runAsync('DELETE FROM sync_settings');

    await writeSyncSetting(database, 'device_id', syncState.deviceId);
    await writeSyncSetting(database, 'last_cursor', syncState.lastCursor);
    await writeSyncSetting(database, 'last_error_message', syncState.lastErrorMessage);
    await writeSyncSetting(database, 'last_status', syncState.lastStatus);
    await writeSyncSetting(database, 'last_sync_attempt_at', syncState.lastSyncAttemptAt);
    await writeSyncSetting(database, 'last_sync_success_at', syncState.lastSyncSuccessAt);

    for (const entityVersion of syncState.entityVersions) {
      await database.runAsync(
        `
          INSERT INTO sync_entity_versions (
            entity_type,
            entity_id,
            version
          ) VALUES (?, ?, ?)
        `,
        entityVersion.entityType,
        entityVersion.entityId,
        entityVersion.version,
      );
    }

    for (const outboxEntry of syncState.outbox) {
      await database.runAsync(
        `
          INSERT INTO sync_outbox (
            op_id,
            entity_type,
            entity_id,
            entity_version,
            op_type,
            payload_json,
            occurred_at,
            created_at,
            status,
            attempt_count,
            last_attempt_at,
            last_error_code,
            last_error_message,
            next_retry_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        outboxEntry.opId,
        outboxEntry.entityType,
        outboxEntry.entityId,
        outboxEntry.entityVersion,
        outboxEntry.opType,
        JSON.stringify(outboxEntry.payload),
        outboxEntry.occurredAt,
        outboxEntry.createdAt,
        outboxEntry.status,
        outboxEntry.attemptCount,
        outboxEntry.lastAttemptAt ?? null,
        outboxEntry.lastErrorCode ?? null,
        outboxEntry.lastErrorMessage ?? null,
        outboxEntry.nextRetryAt ?? null,
      );
    }

    for (const conflict of syncState.conflicts) {
      await database.runAsync(
        `
          INSERT INTO sync_conflicts (
            id,
            source,
            op_id,
            entity_type,
            entity_id,
            client_version,
            server_version,
            conflict_reason,
            detected_at,
            server_state_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        conflict.id,
        conflict.source,
        conflict.opId,
        conflict.entityType,
        conflict.entityId,
        conflict.clientVersion,
        conflict.serverVersion,
        conflict.conflictReason,
        conflict.detectedAt,
        JSON.stringify(conflict.serverState),
      );
    }
  });
}

export async function clearStoredSyncState(): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM sync_conflicts');
    await database.runAsync('DELETE FROM sync_outbox');
    await database.runAsync('DELETE FROM sync_entity_versions');
    await database.runAsync('DELETE FROM sync_settings');
  });
}

async function writeSyncSetting(
  database: SQLiteDatabase,
  key: string,
  value: string | null,
) {
  if (!value) {
    return;
  }

  await database.runAsync(
    'INSERT INTO sync_settings (key, value) VALUES (?, ?)',
    key,
    value,
  );
}

async function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME);
  }

  const database = await databasePromise;

  if (!schemaPromise) {
    const schemaTask = applyMobileMigrations(database);
    schemaPromise = schemaTask.catch((error: unknown) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
  return database;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseJsonRecord(value: string): Record<string, unknown> {
  try {
    const parsedValue = JSON.parse(value) as unknown;

    return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
      ? (parsedValue as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseLastStatus(
  value: string | undefined,
): PersistedSyncState['lastStatus'] | null {
  switch (value) {
    case 'conflict':
    case 'failed':
    case 'idle':
    case 'local_only_paused':
    case 'offline':
    case 'pending':
    case 'retry_scheduled':
    case 'succeeded':
    case 'syncing':
    case 'waiting_for_pairing':
      return value;
    default:
      return null;
  }
}
