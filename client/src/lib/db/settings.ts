import type { SQLiteDatabaseAdapter } from './core';

interface SettingRow {
  value_json: string;
}

function sqlStringLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export async function readJsonSetting<T>(
  database: SQLiteDatabaseAdapter,
  key: string,
): Promise<T | null> {
  const row = await database.getFirstAsync<SettingRow>(`SELECT value_json
    FROM settings
    WHERE key = ${sqlStringLiteral(key)}
    LIMIT 1;`);

  if (!row) {
    return null;
  }

  return JSON.parse(row.value_json) as T;
}

export async function upsertJsonSetting(
  database: SQLiteDatabaseAdapter,
  key: string,
  value: unknown,
): Promise<void> {
  const now = new Date().toISOString();

  await database.execAsync(`INSERT INTO settings (
    key,
    value_json,
    updated_at
  ) VALUES (
    ${sqlStringLiteral(key)},
    ${sqlStringLiteral(JSON.stringify(value))},
    ${sqlStringLiteral(now)}
  )
  ON CONFLICT(key) DO UPDATE SET
    value_json = excluded.value_json,
    updated_at = excluded.updated_at;`);
}
