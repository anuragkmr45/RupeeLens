import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { applyMobileMigrations } from './migration-runner';

const DATABASE_NAME = 'spend-tracker.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;
let schemaPromise: Promise<void> | null = null;
let databaseWriteQueue: Promise<void> = Promise.resolve();

export async function getSpendTrackerDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME);
  }

  const database = await databasePromise;

  if (!schemaPromise) {
    const migrationTask = applyMobileMigrations(database);
    schemaPromise = migrationTask.catch((error: unknown) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
  return database;
}

export function runSpendTrackerDatabaseWrite<T>(
  operation: (database: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const nextTask = databaseWriteQueue.then(
    () => getSpendTrackerDatabase().then(operation),
    () => getSpendTrackerDatabase().then(operation),
  );

  databaseWriteQueue = nextTask.then(
    () => undefined,
    () => undefined,
  );

  return nextTask;
}

export function resetSpendTrackerDatabaseBootstrapForTests(): void {
  databasePromise = null;
  schemaPromise = null;
  databaseWriteQueue = Promise.resolve();
}
