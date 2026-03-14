import { describe, expect, it } from 'vitest';

import { serverDatabaseExpectedTables, serverDatabaseMigrations } from './manifest.js';

describe('server database manifest', () => {
  it('defines the expected foundation tables', () => {
    expect(serverDatabaseExpectedTables).toContain('transactions');
    expect(serverDatabaseExpectedTables).toContain('sync_cursors');
    expect(serverDatabaseExpectedTables).toContain('schema_migrations');
  });

  it('starts with the initial foundation migration', () => {
    expect(serverDatabaseMigrations[0]?.id).toBe('0001_initial_server_schema');
    expect(serverDatabaseMigrations[0]?.statements.length).toBeGreaterThan(10);
  });
});
