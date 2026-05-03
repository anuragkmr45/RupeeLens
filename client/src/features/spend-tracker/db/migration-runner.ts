import {
  BUDGETS_TABLE_SQL,
  BUDGET_THRESHOLD_ALERTS_TABLE_SQL,
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
  SYNC_CONFLICTS_ENTITY_INDEX_SQL,
  SYNC_CONFLICTS_TABLE_SQL,
  SYNC_ENTITY_VERSIONS_TABLE_SQL,
  SYNC_OUTBOX_ENTITY_INDEX_SQL,
  SYNC_OUTBOX_STATUS_INDEX_SQL,
  SYNC_OUTBOX_TABLE_SQL,
  SYNC_SETTINGS_TABLE_SQL,
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

interface ExclusiveTransactionDatabase extends MobileMigrationDatabase {
  withExclusiveTransactionAsync(
    task: (transaction: MobileMigrationDatabase) => Promise<void>,
  ): Promise<void>;
}

interface SqliteTableRow {
  name: string;
  sql: string | null;
}

interface AppliedMigrationRow {
  id: string;
}

interface TableColumnRow {
  name: string;
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
  if (supportsExclusiveTransaction(database)) {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await applyMobileMigrationsInternal(transaction, now);
    });
    return;
  }

  await applyMobileMigrationsInternal(database, now);
}

async function applyMobileMigrationsInternal(
  database: MobileMigrationDatabase,
  now: () => string,
): Promise<void> {
  await executeSqlScript(
    database,
    `
    PRAGMA foreign_keys = ON;
    ${MOBILE_MIGRATION_TABLE_SQL}
  `,
  );

  await adoptLegacySchema(database, now);

  const appliedMigrationRows = await database.getAllAsync<AppliedMigrationRow>(
    `SELECT id FROM ${MOBILE_MIGRATION_TABLE} ORDER BY id ASC`,
  );
  const appliedMigrationIds = new Set(appliedMigrationRows.map((row) => row.id));

  for (const migration of mobileMigrations) {
    if (appliedMigrationIds.has(migration.id)) {
      continue;
    }

    if (
      migration.id === '015_add_transaction_merchant_raw' &&
      (await tableHasColumn(database, 'transactions', 'merchant_raw'))
    ) {
      await recordMobileMigration(database, migration.id, now);
      continue;
    }

    await executeSqlScript(database, migration.sql);
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

  if (
    transactionsTableSql &&
    (!transactionsTableSql.includes("'partially_classified'") ||
      !transactionsTableSql.includes('note TEXT') ||
      !transactionsTableSql.includes('parser_id TEXT'))
  ) {
    await executeSqlScript(database, TRANSACTIONS_V2_REBUILD_SQL);
  }

  await executeSqlScript(
    database,
    `
    PRAGMA foreign_keys = ON;
    ${SETTINGS_TABLE_SQL}
    ${SYNC_SETTINGS_TABLE_SQL}
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
    ${BUDGETS_TABLE_SQL}
    ${BUDGET_THRESHOLD_ALERTS_TABLE_SQL}
    ${SYNC_ENTITY_VERSIONS_TABLE_SQL}
    ${SYNC_OUTBOX_TABLE_SQL}
    ${SYNC_OUTBOX_STATUS_INDEX_SQL}
    ${SYNC_OUTBOX_ENTITY_INDEX_SQL}
    ${SYNC_CONFLICTS_TABLE_SQL}
    ${SYNC_CONFLICTS_ENTITY_INDEX_SQL}
  `,
  );

  if (!(await tableHasColumn(database, 'transactions', 'merchant_raw'))) {
    await executeSqlScript(database, TRANSACTIONS_V3_ADD_MERCHANT_RAW_SQL);
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

async function tableHasColumn(
  database: MobileMigrationDatabase,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const columns = await database.getAllAsync<TableColumnRow>(
    `PRAGMA table_info(${tableName})`,
  );

  return columns.some((column) => column.name === columnName);
}

async function executeSqlScript(
  database: MobileMigrationDatabase,
  sqlScript: string,
): Promise<void> {
  const statements = sqlScript
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await database.execAsync(`${statement};`);
  }
}

function supportsExclusiveTransaction(
  database: MobileMigrationDatabase,
): database is ExclusiveTransactionDatabase {
  return 'withExclusiveTransactionAsync' in database;
}
