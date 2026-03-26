export interface ServerMigration {
  id: string;
  sql: string;
}

export const SERVER_MIGRATION_TABLE = 'schema_migrations';
export const SERVER_MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${SERVER_MIGRATION_TABLE} (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL
  );
`;

export const serverMigrations: readonly ServerMigration[] = [
  {
    id: '001_create_app_metadata',
    sql: `
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO app_metadata (key, value)
      VALUES ('seed_strategy', '{"mode":"manual","note":"No server domain seeds yet"}'::jsonb)
      ON CONFLICT (key) DO UPDATE
      SET
        value = EXCLUDED.value,
        updated_at = NOW();
    `,
  },
] as const;
