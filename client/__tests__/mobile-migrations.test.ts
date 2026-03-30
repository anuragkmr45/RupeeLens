import {
  applyMobileMigrations,
  type MobileMigrationDatabase,
} from '../src/features/spend-tracker/db/migration-runner';

type DatabaseMock = MobileMigrationDatabase & {
  execAsync: jest.Mock<Promise<void>, [string]>;
  getAllAsync: jest.MockedFunction<MobileMigrationDatabase['getAllAsync']>;
  getFirstAsync: jest.MockedFunction<MobileMigrationDatabase['getFirstAsync']>;
  runAsync: jest.MockedFunction<MobileMigrationDatabase['runAsync']>;
};

function includesSql(sql: string, snippet: string): boolean {
  return sql.replace(/\s+/g, ' ').includes(snippet);
}

function createDatabaseMock(): DatabaseMock {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn(async () => []) as unknown as jest.MockedFunction<
      MobileMigrationDatabase['getAllAsync']
    >,
    getFirstAsync: jest.fn(async () => null) as unknown as jest.MockedFunction<
      MobileMigrationDatabase['getFirstAsync']
    >,
    runAsync: jest.fn(async () => undefined) as unknown as jest.MockedFunction<
      MobileMigrationDatabase['runAsync']
    >,
  };
}

describe('mobile migration runner', () => {
  it('applies ordered migrations to an empty database and records version history', async () => {
    const database = createDatabaseMock();

    database.getFirstAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, 'SELECT COUNT(*) as count FROM schema_migrations')) {
        return { count: 0 };
      }

      return null;
    });
    database.getAllAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, "FROM sqlite_master WHERE type = 'table'")) {
        return [];
      }

      if (includesSql(sql, 'SELECT id FROM schema_migrations ORDER BY id ASC')) {
        return [];
      }

      return [];
    });

    await applyMobileMigrations(database, {
      now: () => '2026-03-26T00:00:00.000Z',
    });

    expect(database.execAsync).toHaveBeenCalledTimes(29);
    expect(database.runAsync).toHaveBeenCalledTimes(28);
    expect(database.runAsync).toHaveBeenCalledWith(
      'INSERT OR IGNORE INTO schema_migrations (id, applied_at) VALUES (?, ?)',
      '001_create_settings_table',
      '2026-03-26T00:00:00.000Z',
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      'INSERT OR IGNORE INTO schema_migrations (id, applied_at) VALUES (?, ?)',
      '019_create_budget_threshold_alerts_table',
      '2026-03-26T00:00:00.000Z',
    );
    expect(database.runAsync).toHaveBeenCalledWith(
      'INSERT OR IGNORE INTO schema_migrations (id, applied_at) VALUES (?, ?)',
      '028_create_transactions_status_source_app_captured_at_index',
      '2026-03-26T00:00:00.000Z',
    );
  });

  it('adopts a legacy schema without migration metadata before recording all migrations', async () => {
    const database = createDatabaseMock();

    database.getFirstAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, 'SELECT COUNT(*) as count FROM schema_migrations')) {
        return { count: 0 };
      }

      return null;
    });
    database.getAllAsync.mockImplementation(async (sql: string) => {
      if (includesSql(sql, "FROM sqlite_master WHERE type = 'table'")) {
        return [
          { name: 'settings', sql: 'CREATE TABLE settings (key TEXT, value TEXT)' },
          {
            name: 'transactions',
            sql: 'CREATE TABLE transactions (id TEXT PRIMARY KEY, status TEXT CHECK(status IN (\'classified\', \'uncategorized\')))',
          },
          {
            name: 'transaction_items',
            sql: 'CREATE TABLE transaction_items (id TEXT PRIMARY KEY, transaction_id TEXT)',
          },
        ];
      }

      if (includesSql(sql, 'SELECT id FROM schema_migrations ORDER BY id ASC')) {
        return [
          { id: '001_create_settings_table' },
          { id: '002_create_transactions_table' },
          { id: '003_create_transaction_items_table' },
          { id: '004_create_transaction_items_index' },
          { id: '005_upgrade_transactions_for_history_and_parser_metadata' },
          { id: '006_create_transaction_history_table' },
          { id: '007_seed_transaction_history_for_existing_rows' },
          { id: '008_create_transaction_history_index' },
          { id: '009_create_categories_table' },
          { id: '010_seed_default_categories' },
          { id: '011_create_categories_label_index' },
          { id: '012_create_merchants_table' },
          { id: '013_create_merchant_aliases_table' },
          { id: '014_create_merchant_aliases_merchant_id_index' },
          { id: '015_add_transaction_merchant_raw' },
          { id: '016_create_classification_rules_table' },
          { id: '017_create_classification_rules_merchant_index' },
          { id: '018_create_budgets_table' },
          { id: '019_create_budget_threshold_alerts_table' },
          { id: '020_create_sync_settings_table' },
          { id: '021_create_sync_entity_versions_table' },
          { id: '022_create_sync_outbox_table' },
          { id: '023_create_sync_outbox_indexes' },
          { id: '024_create_sync_conflicts_table' },
          { id: '025_create_sync_conflicts_entity_index' },
          { id: '026_create_budget_threshold_alerts_status_index' },
          { id: '027_create_transactions_captured_at_index' },
          { id: '028_create_transactions_status_source_app_captured_at_index' },
        ];
      }

      return [];
    });

    await applyMobileMigrations(database, {
      now: () => '2026-03-26T00:00:00.000Z',
    });

    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE transactions RENAME TO transactions_legacy"),
    );
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS categories'),
    );
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS merchants'),
    );
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS classification_rules'),
    );
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS budgets'),
    );
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS budget_threshold_alerts'),
    );
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_settings'),
    );
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_entity_versions'),
    );
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_outbox'),
    );
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_conflicts'),
    );
    expect(database.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('ADD COLUMN merchant_raw TEXT NOT NULL DEFAULT'),
    );
    expect(database.runAsync).toHaveBeenCalledTimes(28);
  });
});
