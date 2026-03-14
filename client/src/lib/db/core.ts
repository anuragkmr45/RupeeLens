import {
  assertOrderedSqlManifest,
  getLatestSqlManifestEntryId,
  getSqlManifestHash,
  type SqlStatementManifestEntry,
} from '@upi-spend-tracker/shared-utils';

const migrationMetadataKey = 'migration_manifest_hash';
const seedVersionMetadataKey = 'seed_version';

export interface SqliteMetadataRow {
  key: string;
  updated_at: string;
  value: string;
}

export interface SqliteMigrationRow {
  checksum: string;
  id: string;
}

export interface SqliteTableRow {
  name: string;
}

export interface SQLiteDatabaseAdapter {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T>(sql: string): Promise<T[]>;
  getFirstAsync<T>(sql: string): Promise<T | null | undefined>;
  withExclusiveTransactionAsync?(task: () => Promise<void>): Promise<void>;
}

export interface SQLiteBootstrapResult {
  latestMigrationId: string | null;
  latestSeedId: string | null;
  manifestHash: string;
  seedVersion: string | null;
}

function sqlStringLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function withTransaction(
  database: SQLiteDatabaseAdapter,
  task: () => Promise<void>,
): Promise<void> {
  if (typeof database.withExclusiveTransactionAsync === 'function') {
    await database.withExclusiveTransactionAsync(async () => {
      await task();
    });
    return;
  }

  await database.execAsync('BEGIN IMMEDIATE;');

  try {
    await task();
    await database.execAsync('COMMIT;');
  } catch (error) {
    await database.execAsync('ROLLBACK;');
    throw error;
  }
}

async function ensureMetadataTables(database: SQLiteDatabaseAdapter): Promise<void> {
  await database.execAsync(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );`);
  await database.execAsync(`CREATE TABLE IF NOT EXISTS schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`);
}

async function readAppliedMigrations(
  database: SQLiteDatabaseAdapter,
): Promise<Map<string, string>> {
  const rows = await database.getAllAsync<SqliteMigrationRow>(
    'SELECT id, checksum FROM schema_migrations ORDER BY id;',
  );

  return new Map(rows.map((row) => [row.id, row.checksum]));
}

async function readMetadata(
  database: SQLiteDatabaseAdapter,
): Promise<Map<string, string>> {
  const rows = await database.getAllAsync<SqliteMetadataRow>(
    'SELECT key, value, updated_at FROM schema_metadata;',
  );

  return new Map(rows.map((row) => [row.key, row.value]));
}

async function upsertMetadata(
  database: SQLiteDatabaseAdapter,
  key: string,
  value: string,
): Promise<void> {
  const now = new Date().toISOString();

  await database.execAsync(`INSERT INTO schema_metadata (
    key,
    value,
    updated_at
  ) VALUES (
    ${sqlStringLiteral(key)},
    ${sqlStringLiteral(value)},
    ${sqlStringLiteral(now)}
  )
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = excluded.updated_at;`);
}

async function applyPendingMigrations(
  database: SQLiteDatabaseAdapter,
  migrations: readonly SqlStatementManifestEntry[],
): Promise<string> {
  assertOrderedSqlManifest(migrations, 'client sqlite migrations');

  const manifestHash = getSqlManifestHash(migrations);
  const appliedMigrations = await readAppliedMigrations(database);
  const manifestIds = new Set(migrations.map((migration) => migration.id));

  for (const appliedId of appliedMigrations.keys()) {
    if (!manifestIds.has(appliedId)) {
      throw new Error(
        `database contains migration ${appliedId} that is missing from the current manifest`,
      );
    }
  }

  for (const migration of migrations) {
    const checksum = getSqlManifestHash([migration]);
    const appliedChecksum = appliedMigrations.get(migration.id);

    if (appliedChecksum) {
      if (appliedChecksum !== checksum) {
        throw new Error(
          `checksum mismatch for client migration ${migration.id}: expected ${checksum}, found ${appliedChecksum}`,
        );
      }

      continue;
    }

    await withTransaction(database, async () => {
      for (const statement of migration.statements) {
        await database.execAsync(statement);
      }

      await database.execAsync(`INSERT INTO schema_migrations (
        id,
        checksum,
        applied_at
      ) VALUES (
        ${sqlStringLiteral(migration.id)},
        ${sqlStringLiteral(checksum)},
        ${sqlStringLiteral(new Date().toISOString())}
      );`);
    });
  }

  await upsertMetadata(database, migrationMetadataKey, manifestHash);

  return manifestHash;
}

async function runSeeds(
  database: SQLiteDatabaseAdapter,
  seeds: readonly SqlStatementManifestEntry[],
): Promise<string | null> {
  assertOrderedSqlManifest(seeds, 'client sqlite seeds');

  if (seeds.length === 0) {
    await upsertMetadata(database, seedVersionMetadataKey, '');
    return null;
  }

  for (const seed of seeds) {
    await withTransaction(database, async () => {
      for (const statement of seed.statements) {
        await database.execAsync(statement);
      }
    });
  }

  const latestSeedId = getLatestSqlManifestEntryId(seeds);

  await upsertMetadata(database, seedVersionMetadataKey, latestSeedId ?? '');

  return latestSeedId;
}

export async function configureSQLiteDatabase(
  database: SQLiteDatabaseAdapter,
): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await database.execAsync('PRAGMA journal_mode = WAL;');
}

export async function bootstrapSQLiteDatabase(
  database: SQLiteDatabaseAdapter,
  migrations: readonly SqlStatementManifestEntry[],
  seeds: readonly SqlStatementManifestEntry[],
): Promise<SQLiteBootstrapResult> {
  await ensureMetadataTables(database);

  const manifestHash = await applyPendingMigrations(database, migrations);
  const latestSeedId = await runSeeds(database, seeds);
  const metadata = await readMetadata(database);

  const storedManifestHash = metadata.get(migrationMetadataKey);

  if (storedManifestHash !== manifestHash) {
    throw new Error(
      `client sqlite manifest hash mismatch: expected ${manifestHash}, found ${storedManifestHash ?? 'missing'}`,
    );
  }

  return {
    latestMigrationId: getLatestSqlManifestEntryId(migrations),
    latestSeedId,
    manifestHash,
    seedVersion: metadata.get(seedVersionMetadataKey) ?? null,
  };
}

export async function listSQLiteTables(
  database: SQLiteDatabaseAdapter,
): Promise<string[]> {
  const rows = await database.getAllAsync<SqliteTableRow>(`SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name;`);

  return rows.map((row) => row.name);
}

export async function readSQLiteMetadata(
  database: SQLiteDatabaseAdapter,
): Promise<Map<string, string>> {
  return readMetadata(database);
}
