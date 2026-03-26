import { createHash } from 'node:crypto';

import { PGlite } from '@electric-sql/pglite';
import initSqlJs from 'sql.js';

import {
  MOBILE_MIGRATION_TABLE,
  mobileMigrations,
} from '../../client/src/features/spend-tracker/db/migrations.ts';
import { applyMobileMigrations } from '../../client/src/features/spend-tracker/db/migration-runner.ts';
import {
  SERVER_MIGRATION_TABLE,
  serverMigrations,
} from '../../server/api/src/db/migrations.ts';
import { applyServerMigrations } from '../../server/api/src/db/migration-runner.ts';

interface SqlJsQueryResult {
  columns: string[];
  values: unknown[][];
}

type SqlJsDatabase = InstanceType<
  Awaited<ReturnType<typeof initSqlJs>>['Database']
>;

const FIXED_MIGRATION_TIMESTAMP = '2026-03-26T00:00:00.000Z';

async function main(): Promise<void> {
  validateManifest('mobile', mobileMigrations);
  validateManifest('server', serverMigrations);

  await validateMobileMigrations();
  await validateServerMigrations();
}

function validateManifest(
  target: 'mobile' | 'server',
  migrations: readonly { id: string; sql: string }[],
): void {
  const migrationIds = migrations.map((migration) => migration.id);
  const sortedMigrationIds = [...migrationIds].sort();

  if (migrationIds.length !== new Set(migrationIds).size) {
    throw new Error(`${target} migrations contain duplicate ids`);
  }

  if (JSON.stringify(migrationIds) !== JSON.stringify(sortedMigrationIds)) {
    throw new Error(`${target} migrations are not ordered by id`);
  }

  const schemaHash = createHash('sha256')
    .update(JSON.stringify(migrations))
    .digest('hex');

  console.info(`${target} migration schema hash: ${schemaHash}`);
}

async function validateMobileMigrations(): Promise<void> {
  const SQL = await initSqlJs({});
  const database = new SQL.Database();
  const mobileDatabase = createSqlJsMobileDatabase(database);

  try {
    await applyMobileMigrations(mobileDatabase, {
      now: () => FIXED_MIGRATION_TIMESTAMP,
    });
    await applyMobileMigrations(mobileDatabase, {
      now: () => FIXED_MIGRATION_TIMESTAMP,
    });

    const appliedMigrationIds = await mobileDatabase.getAllAsync<{ id: string }>(
      `SELECT id FROM ${MOBILE_MIGRATION_TABLE} ORDER BY id ASC`,
    );

    if (appliedMigrationIds.length !== mobileMigrations.length) {
      throw new Error('mobile migrations did not fully apply from empty state');
    }

    const tableRows = await mobileDatabase.getAllAsync<{ name: string }>(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('settings', 'transactions', 'transaction_items')
        ORDER BY name ASC
      `,
    );

    if (tableRows.length !== 3) {
      throw new Error('mobile migrations did not create the expected tables');
    }

    const legacyDatabase = new SQL.Database();
    const legacyMobileDatabase = createSqlJsMobileDatabase(legacyDatabase);

    try {
      legacyDatabase.exec(`
        CREATE TABLE settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );

        CREATE TABLE transactions (
          id TEXT PRIMARY KEY NOT NULL,
          amount_minor INTEGER NOT NULL,
          captured_at TEXT NOT NULL,
          merchant TEXT NOT NULL,
          source_app TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('classified', 'uncategorized'))
        );

        CREATE TABLE transaction_items (
          id TEXT PRIMARY KEY NOT NULL,
          transaction_id TEXT NOT NULL,
          amount_minor INTEGER NOT NULL,
          category_id TEXT NOT NULL,
          label TEXT NOT NULL,
          sort_order INTEGER NOT NULL
        );
      `);

      await applyMobileMigrations(legacyMobileDatabase, {
        now: () => FIXED_MIGRATION_TIMESTAMP,
      });

      const legacyTransactionSql = await legacyMobileDatabase.getFirstAsync<{ sql: string }>(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'transactions'",
      );

      if (!legacyTransactionSql?.sql?.includes("'skipped'")) {
        throw new Error('mobile legacy adoption path did not upgrade the transaction schema');
      }
    } finally {
      legacyDatabase.close();
    }

    console.info('mobile migrations validated');
  } finally {
    database.close();
  }
}

async function validateServerMigrations(): Promise<void> {
  const database = new PGlite();

  try {
    const serverDatabase = {
      exec(sql: string) {
        return database.exec(sql);
      },
      async queryRows<T>(sql: string): Promise<T[]> {
        const result = await database.query<T>(sql);
        return result.rows;
      },
    };

    await applyServerMigrations(serverDatabase, {
      now: () => FIXED_MIGRATION_TIMESTAMP,
    });
    await applyServerMigrations(serverDatabase, {
      now: () => FIXED_MIGRATION_TIMESTAMP,
    });

    const appliedMigrationIds = await serverDatabase.queryRows<{ id: string }>(
      `SELECT id FROM ${SERVER_MIGRATION_TABLE} ORDER BY id ASC`,
    );

    if (appliedMigrationIds.length !== serverMigrations.length) {
      throw new Error('server migrations did not fully apply from empty state');
    }

    const appMetadataRows = await serverDatabase.queryRows<{ key: string }>(
      "SELECT key FROM app_metadata WHERE key = 'seed_strategy'",
    );

    if (appMetadataRows.length !== 1) {
      throw new Error('server migrations did not seed the baseline app metadata row');
    }

    console.info('server migrations validated');
  } finally {
    await database.close();
  }
}

function createSqlJsMobileDatabase(database: SqlJsDatabase) {
  return {
    async execAsync(sql: string): Promise<void> {
      database.exec(sql);
    },
    async getAllAsync<T>(sql: string): Promise<T[]> {
      return mapSqlJsRows<T>(database.exec(sql));
    },
    async getFirstAsync<T>(sql: string): Promise<T | null> {
      return mapSqlJsRows<T>(database.exec(sql))[0] ?? null;
    },
    async runAsync(sql: string, ...params: unknown[]): Promise<void> {
      database.run(sql, params);
    },
  };
}

function mapSqlJsRows<T>(results: SqlJsQueryResult[]): T[] {
  const firstResult = results[0];

  if (!firstResult) {
    return [];
  }

  return firstResult.values.map((valueRow) => {
    const row = Object.fromEntries(
      firstResult.columns.map((column, index) => [column, valueRow[index]]),
    );

    return row as T;
  });
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
