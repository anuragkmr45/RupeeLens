import { describe, expect, it } from 'vitest';

import {
  assertOrderedSqlManifest,
  getLatestSqlManifestEntryId,
  getSqlManifestHash,
  type SqlStatementManifestEntry,
} from './migrations.js';

const manifest = [
  {
    id: '0001_initial',
    statements: ['CREATE TABLE example (id TEXT PRIMARY KEY);'],
  },
  {
    id: '0002_follow_up',
    statements: ['CREATE INDEX example_id_idx ON example (id);'],
  },
] as const satisfies readonly SqlStatementManifestEntry[];

describe('migration manifest helpers', () => {
  it('produces a stable sha256 manifest hash', () => {
    expect(getSqlManifestHash(manifest)).toHaveLength(64);
    expect(getSqlManifestHash(manifest)).toBe(getSqlManifestHash(manifest));
  });

  it('reports the latest manifest entry id', () => {
    expect(getLatestSqlManifestEntryId(manifest)).toBe('0002_follow_up');
    expect(getLatestSqlManifestEntryId([])).toBeNull();
  });

  it('rejects duplicate ids', () => {
    expect(() =>
      assertOrderedSqlManifest([
        manifest[0],
        {
          id: '0001_initial',
          statements: ['SELECT 1;'],
        },
      ]),
    ).toThrow(/duplicate entry id/i);
  });

  it('rejects non-ascending ids', () => {
    expect(() =>
      assertOrderedSqlManifest([
        manifest[1],
        manifest[0],
      ]),
    ).toThrow(/strictly ordered/i);
  });
});
