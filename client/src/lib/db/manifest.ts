import type { SqlStatementManifestEntry } from '@upi-spend-tracker/shared-utils';

export const APP_DATABASE_NAME = 'upi-spend-tracker.db';

export const clientDatabaseExpectedTables = [
  'schema_migrations',
  'schema_metadata',
  'settings',
  'categories',
  'merchants',
  'merchant_aliases',
  'transactions',
  'transaction_items',
  'rules',
  'budgets',
  'budget_scopes',
  'outbox_operations',
  'sync_state',
  'audit_events',
] as const;

export const clientDatabaseMigrations = [
  {
    id: '0001_initial_client_schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        record_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        normalized_name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'user',
        record_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS merchant_aliases (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
        alias_raw TEXT NOT NULL,
        alias_normalized TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL DEFAULT 'user',
        record_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        merchant_id TEXT REFERENCES merchants(id),
        source_app TEXT,
        status TEXT NOT NULL,
        currency_code TEXT NOT NULL DEFAULT 'INR',
        total_minor INTEGER NOT NULL,
        remainder_minor INTEGER NOT NULL DEFAULT 0,
        remainder_type TEXT,
        paid_at TEXT NOT NULL,
        captured_at TEXT,
        raw_merchant TEXT,
        parser_version TEXT,
        parser_confidence REAL,
        note TEXT,
        record_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS transaction_items (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        category_id TEXT REFERENCES categories(id),
        merchant_id TEXT REFERENCES merchants(id),
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        line_total_minor INTEGER NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        record_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        scope_type TEXT NOT NULL,
        match_json TEXT NOT NULL,
        outcome_json TEXT NOT NULL,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 0,
        record_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        scope_type TEXT NOT NULL,
        amount_minor INTEGER NOT NULL,
        cycle_type TEXT NOT NULL,
        anchor_day INTEGER,
        timezone TEXT NOT NULL DEFAULT 'UTC',
        threshold_json TEXT NOT NULL DEFAULT '[]',
        is_enabled INTEGER NOT NULL DEFAULT 1,
        record_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS budget_scopes (
        id TEXT PRIMARY KEY,
        budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        record_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS outbox_operations (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_attempted_at TEXT,
        next_attempt_at TEXT,
        error_message TEXT,
        record_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS sync_state (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
      'CREATE INDEX IF NOT EXISTS transactions_paid_at_idx ON transactions (paid_at);',
      'CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions (status);',
      'CREATE INDEX IF NOT EXISTS transaction_items_transaction_id_idx ON transaction_items (transaction_id);',
      'CREATE INDEX IF NOT EXISTS merchant_aliases_merchant_id_idx ON merchant_aliases (merchant_id);',
      'CREATE INDEX IF NOT EXISTS outbox_operations_status_next_attempt_idx ON outbox_operations (status, next_attempt_at);',
      'CREATE INDEX IF NOT EXISTS budgets_cycle_type_idx ON budgets (cycle_type);',
    ],
  },
] as const satisfies readonly SqlStatementManifestEntry[];
