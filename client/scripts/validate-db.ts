import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  bootstrapSQLiteDatabase,
  configureSQLiteDatabase,
  listSQLiteTables,
  readSQLiteMetadata,
  type SQLiteDatabaseAdapter,
} from '../src/lib/db/core';
import {
  APP_DATABASE_NAME,
  clientDatabaseExpectedTables,
  clientDatabaseMigrations,
} from '../src/lib/db/manifest';
import { clientDatabaseSeeds } from '../src/lib/db/seeds';

class NodeSqliteAdapter implements SQLiteDatabaseAdapter {
  readonly #database: DatabaseSync;

  constructor(path: string) {
    this.#database = new DatabaseSync(path);
  }

  async execAsync(sql: string): Promise<void> {
    this.#database.exec(sql);
  }

  async getAllAsync<T>(sql: string): Promise<T[]> {
    return this.#database.prepare(sql).all() as T[];
  }

  async getFirstAsync<T>(sql: string): Promise<T | null> {
    const row = this.#database.prepare(sql).get() as T | undefined;

    return row ?? null;
  }

  close(): void {
    this.#database.close();
  }
}

async function main(): Promise<void> {
  const databasePath = join(
    tmpdir(),
    `upi-spend-tracker-client-validate-${Date.now()}.sqlite`,
  );
  const database = new NodeSqliteAdapter(databasePath);

  try {
    await configureSQLiteDatabase(database);

    const firstPass = await bootstrapSQLiteDatabase(
      database,
      clientDatabaseMigrations,
      clientDatabaseSeeds,
    );
    const secondPass = await bootstrapSQLiteDatabase(
      database,
      clientDatabaseMigrations,
      clientDatabaseSeeds,
    );
    const metadata = await readSQLiteMetadata(database);
    const tableNames = await listSQLiteTables(database);

    for (const tableName of clientDatabaseExpectedTables) {
      if (!tableNames.includes(tableName)) {
        throw new Error(`missing expected client sqlite table: ${tableName}`);
      }
    }

    if (firstPass.manifestHash !== secondPass.manifestHash) {
      throw new Error('client sqlite manifest hash changed between validation passes');
    }

    if (metadata.get('migration_manifest_hash') !== firstPass.manifestHash) {
      throw new Error('client sqlite metadata does not match manifest hash');
    }

    if (metadata.get('seed_version') !== firstPass.latestSeedId) {
      throw new Error('client sqlite metadata does not match latest seed id');
    }

    console.info(
      JSON.stringify({
        database: APP_DATABASE_NAME,
        latestMigrationId: firstPass.latestMigrationId,
        latestSeedId: firstPass.latestSeedId,
        manifestHash: firstPass.manifestHash,
        tableCount: tableNames.length,
      }),
    );
  } finally {
    database.close();
    rmSync(databasePath, { force: true });
  }
}

void main();
