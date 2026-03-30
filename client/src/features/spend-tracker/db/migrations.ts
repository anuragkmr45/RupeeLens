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
export const SYNC_SETTINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sync_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;
export const CATEGORIES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0, 1))
  );
`;
export const CATEGORIES_LABEL_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_categories_label
  ON categories(label);
`;
export const DEFAULT_CATEGORIES_SEED_SQL = `
  INSERT OR IGNORE INTO categories (id, label, description, is_default) VALUES
    ('bills', 'Bills', 'Electricity, mobile, and utility bills.', 1),
    ('education', 'Education', 'School fees, tuition, books, and classes.', 1),
    ('entertainment', 'Entertainment', 'Movies, games, streaming, and fun spends.', 1),
    ('food_drink', 'Food & Drink', 'Coffee, dining, snacks, and drinks.', 1),
    ('groceries', 'Groceries', 'Groceries and daily essentials.', 1),
    ('healthcare', 'Healthcare', 'Medicines, clinics, tests, and wellness.', 1),
    ('household', 'Household', 'Home supplies, repairs, and recurring essentials.', 1),
    ('misc', 'Miscellaneous', 'Everything that does not fit a stronger default yet.', 1),
    ('personal_care', 'Personal Care', 'Salon, grooming, skincare, and toiletries.', 1),
    ('shopping', 'Shopping', 'Personal shopping and one-off purchases.', 1),
    ('transport', 'Transport', 'Metro, cab, fuel, and commute spends.', 1),
    ('travel', 'Travel', 'Flights, hotels, and long-distance travel.', 1);
`;
export const MERCHANTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY NOT NULL,
    label TEXT NOT NULL,
    normalized_label TEXT NOT NULL UNIQUE
  );
`;
export const MERCHANT_ALIASES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS merchant_aliases (
    id TEXT PRIMARY KEY NOT NULL,
    merchant_id TEXT NOT NULL,
    alias TEXT NOT NULL,
    normalized_alias TEXT NOT NULL UNIQUE,
    confidence_bps INTEGER NOT NULL,
    source TEXT NOT NULL CHECK(source IN ('manual', 'merged')),
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
  );
`;
export const MERCHANT_ALIASES_MERCHANT_ID_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_merchant_aliases_merchant_id
  ON merchant_aliases(merchant_id, alias);
`;
export const CLASSIFICATION_RULES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS classification_rules (
    id TEXT PRIMARY KEY NOT NULL,
    merchant_id TEXT,
    merchant_label TEXT NOT NULL,
    merchant_normalized_label TEXT NOT NULL,
    amount_bucket TEXT NOT NULL CHECK(amount_bucket IN ('any', 'under_250', 'between_250_and_500', 'between_500_and_1000', 'over_1000')),
    hour_bucket TEXT NOT NULL CHECK(hour_bucket IN ('any', 'morning', 'afternoon', 'evening', 'night')),
    weekday TEXT NOT NULL CHECK(weekday IN ('any', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
    category_id TEXT NOT NULL,
    item_label TEXT NOT NULL,
    auto_apply INTEGER NOT NULL DEFAULT 0 CHECK(auto_apply IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
export const CLASSIFICATION_RULES_MERCHANT_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_classification_rules_merchant_normalized_label
  ON classification_rules(merchant_normalized_label, updated_at DESC);
`;
export const BUDGETS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY NOT NULL,
    label TEXT NOT NULL,
    scope TEXT NOT NULL CHECK(scope IN ('overall', 'category', 'merchant', 'item')),
    period TEXT NOT NULL CHECK(period IN ('monthly', 'weekly', 'rolling', 'custom')),
    target_minor INTEGER NOT NULL CHECK(target_minor > 0),
    category_id TEXT,
    merchant_id TEXT,
    merchant_label TEXT,
    merchant_normalized_label TEXT,
    item_label TEXT,
    starts_on_day INTEGER,
    week_starts_on INTEGER,
    rolling_window_days INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
export const BUDGET_THRESHOLD_ALERTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS budget_threshold_alerts (
    id TEXT PRIMARY KEY NOT NULL,
    budget_id TEXT NOT NULL,
    budget_label TEXT NOT NULL,
    threshold_percent INTEGER NOT NULL CHECK(threshold_percent IN (50, 80, 100)),
    threshold_state TEXT NOT NULL CHECK(threshold_state IN ('on_track', 'warning', 'at_risk', 'over_budget')),
    spent_minor INTEGER NOT NULL CHECK(spent_minor >= 0),
    target_minor INTEGER NOT NULL CHECK(target_minor > 0),
    cycle_start TEXT NOT NULL,
    cycle_end TEXT NOT NULL,
    delivered_at TEXT NOT NULL,
    reviewed_at TEXT,
    status TEXT NOT NULL CHECK(status IN ('active', 'quieted', 'reviewed')),
    message TEXT NOT NULL
  );
`;
export const BUDGET_THRESHOLD_ALERTS_STATUS_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_budget_threshold_alerts_status_delivered_at
  ON budget_threshold_alerts(status, delivered_at DESC);
`;
export const SYNC_ENTITY_VERSIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sync_entity_versions (
    entity_type TEXT NOT NULL CHECK(entity_type IN ('transaction', 'transaction_item', 'category', 'merchant', 'merchant_alias', 'rule', 'budget', 'budget_scope')),
    entity_id TEXT NOT NULL,
    version INTEGER NOT NULL CHECK(version >= 0),
    PRIMARY KEY (entity_type, entity_id)
  );
`;
export const SYNC_OUTBOX_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sync_outbox (
    op_id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('transaction', 'transaction_item', 'category', 'merchant', 'merchant_alias', 'rule', 'budget', 'budget_scope')),
    entity_id TEXT NOT NULL,
    entity_version INTEGER NOT NULL CHECK(entity_version >= 1),
    op_type TEXT NOT NULL CHECK(op_type IN ('upsert', 'delete')),
    payload_json TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'retry_scheduled', 'conflict', 'blocked')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
    last_attempt_at TEXT,
    last_error_code TEXT,
    last_error_message TEXT,
    next_retry_at TEXT
  );
`;
export const SYNC_OUTBOX_STATUS_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_sync_outbox_status
  ON sync_outbox(status, next_retry_at, occurred_at);
`;
export const SYNC_OUTBOX_ENTITY_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity
  ON sync_outbox(entity_type, entity_id, entity_version);
`;
export const SYNC_CONFLICTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sync_conflicts (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL CHECK(source IN ('push', 'pull')),
    op_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('transaction', 'transaction_item', 'category', 'merchant', 'merchant_alias', 'rule', 'budget', 'budget_scope')),
    entity_id TEXT NOT NULL,
    client_version INTEGER NOT NULL CHECK(client_version >= 0),
    server_version INTEGER NOT NULL CHECK(server_version >= 1),
    conflict_reason TEXT NOT NULL,
    detected_at TEXT NOT NULL,
    server_state_json TEXT NOT NULL
  );
`;
export const SYNC_CONFLICTS_ENTITY_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity
  ON sync_conflicts(entity_type, entity_id, detected_at DESC);
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
export const TRANSACTIONS_CAPTURED_AT_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_transactions_captured_at
  ON transactions(captured_at DESC, id DESC);
`;
export const TRANSACTIONS_STATUS_SOURCE_APP_CAPTURED_AT_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_transactions_status_source_app_captured_at
  ON transactions(status, source_app, captured_at DESC);
`;
export const TRANSACTIONS_V3_ADD_MERCHANT_RAW_SQL = `
  ALTER TABLE transactions
  ADD COLUMN merchant_raw TEXT NOT NULL DEFAULT '';

  UPDATE transactions
  SET merchant_raw = merchant
  WHERE merchant_raw = '';
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
  {
    id: '009_create_categories_table',
    sql: CATEGORIES_TABLE_SQL,
  },
  {
    id: '010_seed_default_categories',
    sql: DEFAULT_CATEGORIES_SEED_SQL,
  },
  {
    id: '011_create_categories_label_index',
    sql: CATEGORIES_LABEL_INDEX_SQL,
  },
  {
    id: '012_create_merchants_table',
    sql: MERCHANTS_TABLE_SQL,
  },
  {
    id: '013_create_merchant_aliases_table',
    sql: MERCHANT_ALIASES_TABLE_SQL,
  },
  {
    id: '014_create_merchant_aliases_merchant_id_index',
    sql: MERCHANT_ALIASES_MERCHANT_ID_INDEX_SQL,
  },
  {
    id: '015_add_transaction_merchant_raw',
    sql: TRANSACTIONS_V3_ADD_MERCHANT_RAW_SQL,
  },
  {
    id: '016_create_classification_rules_table',
    sql: CLASSIFICATION_RULES_TABLE_SQL,
  },
  {
    id: '017_create_classification_rules_merchant_index',
    sql: CLASSIFICATION_RULES_MERCHANT_INDEX_SQL,
  },
  {
    id: '018_create_budgets_table',
    sql: BUDGETS_TABLE_SQL,
  },
  {
    id: '019_create_budget_threshold_alerts_table',
    sql: BUDGET_THRESHOLD_ALERTS_TABLE_SQL,
  },
  {
    id: '020_create_sync_settings_table',
    sql: SYNC_SETTINGS_TABLE_SQL,
  },
  {
    id: '021_create_sync_entity_versions_table',
    sql: SYNC_ENTITY_VERSIONS_TABLE_SQL,
  },
  {
    id: '022_create_sync_outbox_table',
    sql: SYNC_OUTBOX_TABLE_SQL,
  },
  {
    id: '023_create_sync_outbox_indexes',
    sql: `
      ${SYNC_OUTBOX_STATUS_INDEX_SQL}
      ${SYNC_OUTBOX_ENTITY_INDEX_SQL}
    `,
  },
  {
    id: '024_create_sync_conflicts_table',
    sql: SYNC_CONFLICTS_TABLE_SQL,
  },
  {
    id: '025_create_sync_conflicts_entity_index',
    sql: SYNC_CONFLICTS_ENTITY_INDEX_SQL,
  },
  {
    id: '026_create_budget_threshold_alerts_status_index',
    sql: BUDGET_THRESHOLD_ALERTS_STATUS_INDEX_SQL,
  },
  {
    id: '027_create_transactions_captured_at_index',
    sql: TRANSACTIONS_CAPTURED_AT_INDEX_SQL,
  },
  {
    id: '028_create_transactions_status_source_app_captured_at_index',
    sql: TRANSACTIONS_STATUS_SOURCE_APP_CAPTURED_AT_INDEX_SQL,
  },
] as const;
