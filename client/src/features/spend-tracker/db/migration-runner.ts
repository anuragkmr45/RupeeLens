import {
  CLASSIFICATION_RULES_MERCHANT_INDEX_SQL,
  CLASSIFICATION_RULES_TABLE_SQL,
  CATEGORIES_LABEL_INDEX_SQL,
  CATEGORIES_TABLE_SQL,
  DEFAULT_CATEGORIES_SEED_SQL,
  MERCHANT_ALIASES_MERCHANT_ID_INDEX_SQL,
  MERCHANT_ALIASES_TABLE_SQL,
  MERCHANTS_TABLE_SQL,
  MOBILE_MIGRATION_TABLE,
  MOBILE_MIGRATION_TABLE_SQL,
  SETTINGS_TABLE_SQL,
  TRANSACTION_HISTORY_INDEX_SQL,
  TRANSACTION_HISTORY_SEED_SQL,
  TRANSACTION_HISTORY_TABLE_SQL,
  TRANSACTION_ITEMS_INDEX_SQL,
  TRANSACTION_ITEMS_TABLE_SQL,
  TRANSACTIONS_TABLE_SQL,
  TRANSACTIONS_V2_REBUILD_SQL,
  TRANSACTIONS_V3_ADD_MERCHANT_RAW_SQL,
  mobileMigrations,
} from './migrations';

export interface MobileMigrationDatabase {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T = unknown>(sql: string): Promise<T[]>;
  getFirstAsync<T = unknown>(sql: string): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
}

interface SqliteTableRow {
  name: string;
  sql: string | null;
}

interface AppliedMigrationRow {
  id: string;
}

interface CountRow {
  count: number;
}

export interface ApplyMobileMigrationsOptions {
  now?: () => string;
}

export async function applyMobileMigrations(
  database: MobileMigrationDatabase,
  { now = () => new Date().toISOString() }: ApplyMobileMigrationsOptions = {},
): Promise<void> {
  await database.execAsync(`
    PRAGMA foreign_keys = ON;
    ${MOBILE_MIGRATION_TABLE_SQL}
  `);

  await adoptLegacySchema(database, now);

  const appliedMigrationRows = await database.getAllAsync<AppliedMigrationRow>(
    `SELECT id FROM ${MOBILE_MIGRATION_TABLE} ORDER BY id ASC`,
  );
  const appliedMigrationIds = new Set(appliedMigrationRows.map((row) => row.id));

  for (const migration of mobileMigrations) {
    if (appliedMigrationIds.has(migration.id)) {
      continue;
    }

    await database.execAsync(migration.sql);
    await recordMobileMigration(database, migration.id, now);
  }
}

async function adoptLegacySchema(
  database: MobileMigrationDatabase,
  now: () => string,
): Promise<void> {
  const appliedMigrationCount = await database.getFirstAsync<CountRow>(
    `SELECT COUNT(*) as count FROM ${MOBILE_MIGRATION_TABLE}`,
  );

  if ((appliedMigrationCount?.count ?? 0) > 0) {
    return;
  }

  const existingTables = await database.getAllAsync<SqliteTableRow>(
    `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'table'
        AND name IN ('categories', 'merchant_aliases', 'merchants', 'settings', 'transactions', 'transaction_items')
      ORDER BY name ASC
    `,
  );

  if (existingTables.length === 0) {
    return;
  }

  const transactionsTableSql =
    existingTables.find((table) => table.name === 'transactions')?.sql ?? null;
  const needsMerchantRawUpgrade =
    !transactionsTableSql || !transactionsTableSql.includes('merchant_raw TEXT');

  if (
    transactionsTableSql &&
    (!transactionsTableSql.includes("'partially_classified'") ||
      !transactionsTableSql.includes('note TEXT') ||
      !transactionsTableSql.includes('parser_id TEXT'))
  ) {
    await database.execAsync(TRANSACTIONS_V2_REBUILD_SQL);
  }

  await database.execAsync(`
    PRAGMA foreign_keys = ON;
    ${SETTINGS_TABLE_SQL}
    ${TRANSACTIONS_TABLE_SQL}
    ${TRANSACTION_ITEMS_TABLE_SQL}
    ${TRANSACTION_ITEMS_INDEX_SQL}
    ${TRANSACTION_HISTORY_TABLE_SQL}
    ${TRANSACTION_HISTORY_SEED_SQL}
    ${TRANSACTION_HISTORY_INDEX_SQL}
    ${CATEGORIES_TABLE_SQL}
    ${DEFAULT_CATEGORIES_SEED_SQL}
    ${CATEGORIES_LABEL_INDEX_SQL}
    ${MERCHANTS_TABLE_SQL}
    ${MERCHANT_ALIASES_TABLE_SQL}
    ${MERCHANT_ALIASES_MERCHANT_ID_INDEX_SQL}
    ${CLASSIFICATION_RULES_TABLE_SQL}
    ${CLASSIFICATION_RULES_MERCHANT_INDEX_SQL}
  `);

  if (needsMerchantRawUpgrade) {
    await database.execAsync(TRANSACTIONS_V3_ADD_MERCHANT_RAW_SQL);
  }

  for (const migration of mobileMigrations) {
    await recordMobileMigration(database, migration.id, now);
  }
}

async function recordMobileMigration(
  database: MobileMigrationDatabase,
  migrationId: string,
  now: () => string,
): Promise<void> {
  await database.runAsync(
    `INSERT OR IGNORE INTO ${MOBILE_MIGRATION_TABLE} (id, applied_at) VALUES (?, ?)`,
    migrationId,
    now(),
  );
}
