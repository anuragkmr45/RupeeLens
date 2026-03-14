import * as SQLite from 'expo-sqlite';

import {
  bootstrapSQLiteDatabase,
  configureSQLiteDatabase,
  type SQLiteBootstrapResult,
} from './core';
import {
  APP_DATABASE_NAME,
  clientDatabaseMigrations,
} from './manifest';
import { clientDatabaseSeeds } from './seeds';

let readinessPromise: Promise<SQLiteBootstrapResult> | null = null;

async function openAppDatabaseAsync() {
  const database = await SQLite.openDatabaseAsync(APP_DATABASE_NAME);

  await configureSQLiteDatabase(database);

  return database;
}

export function ensureAppDatabaseReady(): Promise<SQLiteBootstrapResult> {
  if (readinessPromise === null) {
    readinessPromise = openAppDatabaseAsync()
      .then((database) =>
        bootstrapSQLiteDatabase(
          database,
          clientDatabaseMigrations,
          clientDatabaseSeeds,
        ),
      )
      .catch((error: unknown) => {
        readinessPromise = null;
        throw error;
      });
  }

  return readinessPromise;
}

export function resetAppDatabaseReadinessForTests(): void {
  readinessPromise = null;
}

export {
  bootstrapSQLiteDatabase,
  configureSQLiteDatabase,
  listSQLiteTables,
  readSQLiteMetadata,
} from './core';
export {
  APP_DATABASE_NAME,
  clientDatabaseExpectedTables,
  clientDatabaseMigrations,
} from './manifest';
export { clientDatabaseSeeds } from './seeds';
export type { SQLiteBootstrapResult, SQLiteDatabaseAdapter } from './core';
