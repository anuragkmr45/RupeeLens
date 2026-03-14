import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export interface SqlStatementManifestEntry {
  id: string;
  statements: readonly string[];
}

export function assertOrderedSqlManifest(
  entries: readonly SqlStatementManifestEntry[],
  manifestName = 'sql manifest',
): void {
  const seenIds = new Set<string>();
  let previousId: string | null = null;

  for (const entry of entries) {
    if (seenIds.has(entry.id)) {
      throw new Error(
        `${manifestName} contains a duplicate entry id: ${entry.id}`,
      );
    }

    if (previousId !== null && entry.id <= previousId) {
      throw new Error(
        `${manifestName} must be strictly ordered. ${entry.id} is not after ${previousId}.`,
      );
    }

    seenIds.add(entry.id);
    previousId = entry.id;
  }
}

export function getSqlManifestHash(
  entries: readonly SqlStatementManifestEntry[],
): string {
  assertOrderedSqlManifest(entries);

  const payload = JSON.stringify(
    entries.map((entry) => ({
      id: entry.id,
      statements: [...entry.statements],
    })),
  );

  return bytesToHex(sha256(new TextEncoder().encode(payload)));
}

export function getLatestSqlManifestEntryId(
  entries: readonly SqlStatementManifestEntry[],
): string | null {
  if (entries.length === 0) {
    return null;
  }

  return entries[entries.length - 1]?.id ?? null;
}
