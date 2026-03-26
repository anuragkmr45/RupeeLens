import { describe, expect, it, vi } from 'vitest';

import { applyServerMigrations } from './migration-runner.js';

describe('server migration runner', () => {
  it('applies missing migrations in order and records them', async () => {
    const exec = vi.fn().mockResolvedValue(undefined);
    const queryRows = vi.fn().mockResolvedValue([]);

    await applyServerMigrations(
      {
        exec,
        queryRows,
      },
      {
        now: () => '2026-03-26T00:00:00.000Z',
      },
    );

    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations'));
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO schema_migrations (id, applied_at)"),
    );
  });

  it('skips migrations that are already applied', async () => {
    const exec = vi.fn().mockResolvedValue(undefined);
    const queryRows = vi.fn().mockResolvedValue([{ id: '001_create_app_metadata' }]);

    await applyServerMigrations({
      exec,
      queryRows,
    });

    expect(exec).toHaveBeenCalledTimes(1);
  });
});
