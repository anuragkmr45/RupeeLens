export interface MobileMigration {
  id: string;
  sql: string;
}

export const MOBILE_MIGRATION_TABLE = 'schema_migrations';
export const MOBILE_MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${MOBILE_MIGRATION_TABLE} (
    id TEXT PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
  );
`;
export const SETTINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;
export const TRANSACTIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    amount_minor INTEGER NOT NULL,
    captured_at TEXT NOT NULL,
    merchant TEXT NOT NULL,
    source_app TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('classified', 'uncategorized', 'skipped'))
  );
`;
export const TRANSACTION_ITEMS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS transaction_items (
    id TEXT PRIMARY KEY NOT NULL,
    transaction_id TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    category_id TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
  );
`;
export const TRANSACTION_ITEMS_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id
  ON transaction_items(transaction_id, sort_order);
`;

export const mobileMigrations: readonly MobileMigration[] = [
  {
    id: '001_create_settings_table',
    sql: SETTINGS_TABLE_SQL,
  },
  {
    id: '002_create_transactions_table',
    sql: TRANSACTIONS_TABLE_SQL,
  },
  {
    id: '003_create_transaction_items_table',
    sql: TRANSACTION_ITEMS_TABLE_SQL,
  },
  {
    id: '004_create_transaction_items_index',
    sql: TRANSACTION_ITEMS_INDEX_SQL,
  },
] as const;
