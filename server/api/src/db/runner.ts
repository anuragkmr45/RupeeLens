import { Client } from 'pg';
import {
  assertOrderedSqlManifest,
  getLatestSqlManifestEntryId,
  getSqlManifestHash,
  type SqlStatementManifestEntry,
} from '@upi-spend-tracker/shared-utils';

import { getServerDatabaseUrl } from './config.js';

const migrationMetadataKey = 'migration_manifest_hash';
const seedVersionMetadataKey = 'seed_version';

interface AppliedMigrationRow {
  checksum: string;
  id: string;
}

interface MetadataRow {
  key: string;
  value: string;
}

interface TableRow {
  tablename: string;
}

async function ensureMetadataTables(client: Client): Promise<void> {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);
  await client.query(`CREATE TABLE IF NOT EXISTS schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);
}

async function readAppliedMigrations(client: Client): Promise<Map<string, string>> {
  const result = await client.query<AppliedMigrationRow>(
    'SELECT id, checksum FROM schema_migrations ORDER BY id;',
  );

  return new Map(result.rows.map((row) => [row.id, row.checksum]));
}

export async function readServerMetadata(client: Client): Promise<Map<string, string>> {
  const result = await client.query<MetadataRow>(
    'SELECT key, value FROM schema_metadata;',
  );

  return new Map(result.rows.map((row) => [row.key, row.value]));
}

export async function listServerTables(client: Client): Promise<string[]> {
  const result = await client.query<TableRow>(`SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;`);

  return result.rows.map((row) => row.tablename);
}

async function upsertMetadata(
  client: Client,
  key: string,
  value: string,
): Promise<void> {
  await client.query(
    `INSERT INTO schema_metadata (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT(key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = EXCLUDED.updated_at;`,
    [key, value],
  );
}

export async function connectServerDatabase(
  connectionString = getServerDatabaseUrl(),
): Promise<Client> {
  const client = new Client({
    connectionString,
  });

  await client.connect();

  return client;
}

export async function waitForServerDatabase(
  connectionString = getServerDatabaseUrl(),
  attempts = 20,
  delayMs = 1000,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = new Client({
      connectionString,
    });

    try {
      await client.connect();
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }

  throw new Error(
    `postgres did not become ready after ${attempts} attempts: ${String(lastError)}`,
  );
}

export async function resetServerDatabase(client: Client): Promise<void> {
  await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
  await client.query('CREATE SCHEMA public;');
}

export async function applyServerMigrations(
  client: Client,
  migrations: readonly SqlStatementManifestEntry[],
): Promise<string> {
  assertOrderedSqlManifest(migrations, 'server postgres migrations');
  await ensureMetadataTables(client);

  const manifestHash = getSqlManifestHash(migrations);
  const appliedMigrations = await readAppliedMigrations(client);
  const manifestIds = new Set(migrations.map((migration) => migration.id));

  for (const appliedId of appliedMigrations.keys()) {
    if (!manifestIds.has(appliedId)) {
      throw new Error(
        `database contains migration ${appliedId} that is missing from the server manifest`,
      );
    }
  }

  for (const migration of migrations) {
    const checksum = getSqlManifestHash([migration]);
    const appliedChecksum = appliedMigrations.get(migration.id);

    if (appliedChecksum) {
      if (appliedChecksum !== checksum) {
        throw new Error(
          `checksum mismatch for server migration ${migration.id}: expected ${checksum}, found ${appliedChecksum}`,
        );
      }

      continue;
    }

    await client.query('BEGIN;');

    try {
      for (const statement of migration.statements) {
        await client.query(statement);
      }

      await client.query(
        `INSERT INTO schema_migrations (id, checksum, applied_at)
         VALUES ($1, $2, NOW());`,
        [migration.id, checksum],
      );
      await client.query('COMMIT;');
    } catch (error) {
      await client.query('ROLLBACK;');
      throw error;
    }
  }

  await upsertMetadata(client, migrationMetadataKey, manifestHash);

  return manifestHash;
}

export async function runServerSeeds(
  client: Client,
  seeds: readonly SqlStatementManifestEntry[],
): Promise<string | null> {
  assertOrderedSqlManifest(seeds, 'server postgres seeds');

  if (seeds.length === 0) {
    await upsertMetadata(client, seedVersionMetadataKey, '');
    return null;
  }

  for (const seed of seeds) {
    await client.query('BEGIN;');

    try {
      for (const statement of seed.statements) {
        await client.query(statement);
      }

      await client.query('COMMIT;');
    } catch (error) {
      await client.query('ROLLBACK;');
      throw error;
    }
  }

  const latestSeedId = getLatestSqlManifestEntryId(seeds);

  await upsertMetadata(client, seedVersionMetadataKey, latestSeedId ?? '');

  return latestSeedId;
}
