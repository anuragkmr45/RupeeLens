import type { SqlStatementManifestEntry } from '@upi-spend-tracker/shared-utils';

export const serverDatabaseSeeds = [
  {
    id: '0001_reference_only_seed',
    statements: ['SELECT 1;'],
  },
] as const satisfies readonly SqlStatementManifestEntry[];
