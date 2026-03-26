import {
  SERVER_MIGRATION_TABLE,
  SERVER_MIGRATION_TABLE_SQL,
  serverMigrations,
} from './migrations.js';

export interface ServerMigrationDatabase {
  exec(sql: string): Promise<void>;
  queryRows<T>(sql: string): Promise<T[]>;
}

interface AppliedMigrationRow {
  id: string;
}

export interface ApplyServerMigrationsOptions {
  now?: () => string;
}

export async function applyServerMigrations(
  database: ServerMigrationDatabase,
  { now = () => new Date().toISOString() }: ApplyServerMigrationsOptions = {},
): Promise<void> {
  await database.exec(SERVER_MIGRATION_TABLE_SQL);

  const appliedMigrationRows = await database.queryRows<AppliedMigrationRow>(
    `SELECT id FROM ${SERVER_MIGRATION_TABLE} ORDER BY id ASC`,
  );
  const appliedMigrationIds = new Set(appliedMigrationRows.map((row) => row.id));

  for (const migration of serverMigrations) {
    if (appliedMigrationIds.has(migration.id)) {
      continue;
    }

    await database.exec(`
      BEGIN;
      ${migration.sql}
      INSERT INTO ${SERVER_MIGRATION_TABLE} (id, applied_at)
      VALUES (${toSqlLiteral(migration.id)}, ${toSqlLiteral(now())});
      COMMIT;
    `);
  }
}

function toSqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
