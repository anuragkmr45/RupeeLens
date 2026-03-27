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
    status TEXT NOT NULL CHECK(status IN ('classified', 'partially_classified', 'uncategorized', 'skipped')),
    note TEXT NOT NULL DEFAULT '',
    parser_id TEXT,
    parser_version TEXT,
    parser_confidence_bps INTEGER
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
export const TRANSACTION_HISTORY_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS transaction_history (
    id TEXT PRIMARY KEY NOT NULL,
    transaction_id TEXT NOT NULL,
    event_at TEXT NOT NULL,
    event_kind TEXT NOT NULL,
    summary TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
  );
`;
export const TRANSACTION_HISTORY_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_transaction_history_transaction_id
  ON transaction_history(transaction_id, event_at, sort_order);
`;
export const TRANSACTIONS_LEGACY_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    amount_minor INTEGER NOT NULL,
    captured_at TEXT NOT NULL,
    merchant TEXT NOT NULL,
    source_app TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('classified', 'uncategorized', 'skipped'))
  );
`;
export const TRANSACTIONS_V2_REBUILD_SQL = `
  PRAGMA foreign_keys = OFF;

  ALTER TABLE transaction_items RENAME TO transaction_items_legacy;
  ALTER TABLE transactions RENAME TO transactions_legacy;

  ${TRANSACTIONS_TABLE_SQL}
  ${TRANSACTION_ITEMS_TABLE_SQL}

  INSERT INTO transactions (
    id,
    amount_minor,
    captured_at,
    merchant,
    source_app,
    status,
    note,
    parser_id,
    parser_version,
    parser_confidence_bps
  )
  SELECT
    id,
    amount_minor,
    captured_at,
    merchant,
    source_app,
    CASE
      WHEN status IN ('classified', 'partially_classified', 'skipped', 'uncategorized')
        THEN status
      ELSE 'uncategorized'
    END,
    '',
    CASE source_app
      WHEN 'Google Pay' THEN 'gpay_upi_v1'
      WHEN 'PhonePe' THEN 'phonepe_upi_v1'
      WHEN 'Paytm' THEN 'paytm_upi_v1'
      ELSE NULL
    END,
    CASE source_app
      WHEN 'Google Pay' THEN '1.0.0'
      WHEN 'PhonePe' THEN '1.0.0'
      WHEN 'Paytm' THEN '1.0.0'
      ELSE NULL
    END,
    CASE source_app
      WHEN 'Google Pay' THEN 9800
      WHEN 'PhonePe' THEN 9700
      WHEN 'Paytm' THEN 9650
      ELSE NULL
    END
  FROM transactions_legacy;

  INSERT INTO transaction_items (
    id,
    transaction_id,
    amount_minor,
    category_id,
    label,
    sort_order
  )
  SELECT
    id,
    transaction_id,
    amount_minor,
    category_id,
    label,
    sort_order
  FROM transaction_items_legacy;

  DROP TABLE transaction_items_legacy;
  DROP TABLE transactions_legacy;

  ${TRANSACTION_ITEMS_INDEX_SQL}

  PRAGMA foreign_keys = ON;
`;
export const TRANSACTION_HISTORY_SEED_SQL = `
  INSERT INTO transaction_history (
    id,
    transaction_id,
    event_at,
    event_kind,
    summary,
    sort_order
  )
  SELECT
    id || '_history_source',
    id,
    captured_at,
    CASE
      WHEN source_app = 'Manual entry' THEN 'manual_added'
      ELSE 'captured'
    END,
    CASE
      WHEN source_app = 'Manual entry'
        THEN 'Existing manual transaction adopted into local history.'
      ELSE source_app || ' capture adopted into local history.'
    END,
    0
  FROM transactions;

  INSERT INTO transaction_history (
    id,
    transaction_id,
    event_at,
    event_kind,
    summary,
    sort_order
  )
  SELECT
    id || '_history_state',
    id,
    captured_at,
    CASE
      WHEN status = 'partially_classified' THEN 'classification_imported'
      WHEN status = 'classified' THEN 'classification_imported'
      WHEN status = 'skipped' THEN 'skipped'
      ELSE 'classification_imported'
    END,
    CASE
      WHEN status = 'classified'
        THEN 'Imported an existing classified transaction state into local history.'
      WHEN status = 'partially_classified'
        THEN 'Imported an existing partial split state into local history.'
      WHEN status = 'skipped'
        THEN 'Imported an existing skipped state into local history.'
      ELSE 'Imported an existing unresolved state into local history.'
    END,
    1
  FROM transactions
  WHERE status != 'uncategorized' OR source_app = 'Manual entry';
`;

export const mobileMigrations: readonly MobileMigration[] = [
  {
    id: '001_create_settings_table',
    sql: SETTINGS_TABLE_SQL,
  },
  {
    id: '002_create_transactions_table',
    sql: TRANSACTIONS_LEGACY_TABLE_SQL,
  },
  {
    id: '003_create_transaction_items_table',
    sql: TRANSACTION_ITEMS_TABLE_SQL,
  },
  {
    id: '004_create_transaction_items_index',
    sql: TRANSACTION_ITEMS_INDEX_SQL,
  },
  {
    id: '005_upgrade_transactions_for_history_and_parser_metadata',
    sql: TRANSACTIONS_V2_REBUILD_SQL,
  },
  {
    id: '006_create_transaction_history_table',
    sql: TRANSACTION_HISTORY_TABLE_SQL,
  },
  {
    id: '007_seed_transaction_history_for_existing_rows',
    sql: TRANSACTION_HISTORY_SEED_SQL,
  },
  {
    id: '008_create_transaction_history_index',
    sql: TRANSACTION_HISTORY_INDEX_SQL,
  },
] as const;
