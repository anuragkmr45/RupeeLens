import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getSpendTrackerDatabase,
  runSpendTrackerDatabaseWrite,
} from '../spend-tracker/db/shared-database';
import {
  createInitialSyncState,
  type PersistedSyncState,
  type SyncConflictQueueEntry,
  type SyncEntityVersionRecord,
  type SyncOutboxEntry,
} from './domain';
import {
  clearStoredSyncSecrets,
  loadStoredSyncSecrets,
  saveStoredSyncSecrets,
} from './secure-storage';
import type { StoredSyncCredentials } from './session';
import { sanitizeTrustedApiBaseUrl } from './transport-policy';

const SYNC_STATE_SETTING_KEYS = [
  'device_id',
  'last_cursor',
  'last_error_message',
  'last_status',
  'last_sync_attempt_at',
  'last_sync_success_at',
] as const;
const SYNC_CREDENTIAL_LEGACY_SECRET_SETTING_KEYS = [
  'credential_access_token',
  'credential_access_token_expires_at',
  'credential_refresh_token',
] as const;
const SYNC_CREDENTIAL_METADATA_SETTING_KEYS = [
  'credential_api_base_url',
  'credential_device_id',
  'credential_user_id',
] as const;

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
  await runSpendTrackerDatabaseWrite(async (database) => {
    await database.withTransactionAsync(async () => {
      await database.runAsync('DELETE FROM sync_conflicts');
      await database.runAsync('DELETE FROM sync_outbox');
      await database.runAsync('DELETE FROM sync_entity_versions');
      await deleteSyncSettings(database, SYNC_STATE_SETTING_KEYS);

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
  });
}

export async function loadStoredSyncCredentials(): Promise<StoredSyncCredentials | null> {
  const database = await getDatabase();
  const settingRows = await database.getAllAsync<SyncSettingRow>(
    'SELECT key, value FROM sync_settings',
  );
  const syncSettings = new Map(settingRows.map((row) => [row.key, row.value]));
  const deviceId = normalizeOptionalString(syncSettings.get('credential_device_id') ?? null);
  const userId = normalizeOptionalString(syncSettings.get('credential_user_id') ?? null);
  let secureSecrets = await loadStoredSyncSecrets();

  if (!secureSecrets) {
    const legacyAccessToken = normalizeOptionalString(
      syncSettings.get('credential_access_token') ?? null,
    );
    const legacyAccessTokenExpiresAt = normalizeOptionalString(
      syncSettings.get('credential_access_token_expires_at') ?? null,
    );
    const legacyRefreshToken = normalizeOptionalString(
      syncSettings.get('credential_refresh_token') ?? null,
    );

    if (legacyAccessToken && legacyAccessTokenExpiresAt && legacyRefreshToken) {
      secureSecrets = {
        accessToken: legacyAccessToken,
        accessTokenExpiresAt: legacyAccessTokenExpiresAt,
        refreshToken: legacyRefreshToken,
      };
      await saveStoredSyncSecrets(secureSecrets);
      await runSpendTrackerDatabaseWrite(async (writeDatabase) => {
        await deleteSyncSettings(
          writeDatabase,
          SYNC_CREDENTIAL_LEGACY_SECRET_SETTING_KEYS,
        );
      });
    }
  }

  if (!secureSecrets || !deviceId || !userId) {
    return null;
  }

  return {
    accessToken: secureSecrets.accessToken,
    accessTokenExpiresAt: secureSecrets.accessTokenExpiresAt,
    apiBaseUrl: sanitizeTrustedApiBaseUrl(
      normalizeOptionalString(syncSettings.get('credential_api_base_url') ?? null),
    ),
    deviceId,
    refreshToken: secureSecrets.refreshToken,
    userId,
  };
}

export async function saveStoredSyncCredentials(
  credentials: StoredSyncCredentials | null,
): Promise<void> {
  await saveStoredSyncSecrets(
    credentials
      ? {
          accessToken: credentials.accessToken,
          accessTokenExpiresAt: credentials.accessTokenExpiresAt,
          refreshToken: credentials.refreshToken,
        }
      : null,
  );

  await runSpendTrackerDatabaseWrite(async (database) => {
    await database.withTransactionAsync(async () => {
      await deleteSyncSettings(database, SYNC_CREDENTIAL_METADATA_SETTING_KEYS);
      await deleteSyncSettings(
        database,
        SYNC_CREDENTIAL_LEGACY_SECRET_SETTING_KEYS,
      );

      if (!credentials) {
        return;
      }

      await writeSyncSetting(
        database,
        'credential_api_base_url',
        sanitizeTrustedApiBaseUrl(credentials.apiBaseUrl ?? null),
      );
      await writeSyncSetting(database, 'credential_device_id', credentials.deviceId);
      await writeSyncSetting(database, 'credential_user_id', credentials.userId);
    });
  });
}

export async function clearStoredSyncCredentials(): Promise<void> {
  await clearStoredSyncSecrets();
  await runSpendTrackerDatabaseWrite(async (database) => {
    await database.withTransactionAsync(async () => {
      await deleteSyncSettings(database, SYNC_CREDENTIAL_METADATA_SETTING_KEYS);
      await deleteSyncSettings(
        database,
        SYNC_CREDENTIAL_LEGACY_SECRET_SETTING_KEYS,
      );
    });
  });
}

export async function clearStoredSyncState(): Promise<void> {
  await runSpendTrackerDatabaseWrite(async (database) => {
    await database.withTransactionAsync(async () => {
      await database.runAsync('DELETE FROM sync_conflicts');
      await database.runAsync('DELETE FROM sync_outbox');
      await database.runAsync('DELETE FROM sync_entity_versions');
      await deleteSyncSettings(database, SYNC_STATE_SETTING_KEYS);
    });
  });
}

async function deleteSyncSettings(
  database: SQLiteDatabase,
  keys: readonly string[],
) {
  for (const key of keys) {
    await database.runAsync('DELETE FROM sync_settings WHERE key = ?', key);
  }
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
  return getSpendTrackerDatabase();
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
