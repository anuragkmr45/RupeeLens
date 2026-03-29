import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createReportsRollupsModule } from './rollups.module.js';

describe('reports rollups module', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs) {
      rmSync(tempDir, {
        force: true,
        recursive: true,
      });
    }

    tempDirs.length = 0;
  });

  it('writes deterministic daily and monthly rollups from the domain store', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'rupeelens-worker-rollups-'));
    const domainStoreFile = path.join(tempDir, 'domain-store.json');
    const reportsRollupStoreFile = path.join(tempDir, 'reports-rollups.json');
    const info = vi.fn();
    tempDirs.push(tempDir);

    writeFileSync(
      domainStoreFile,
      JSON.stringify(
        {
          auditEvents: [],
          budgetScopes: [],
          budgets: [],
          categories: [],
          merchants: [],
          rules: [],
          transactionItems: [],
          transactions: [
            {
              amountMinor: 12500,
              id: 'txn_1',
              paidAt: '2026-03-28T08:15:00.000Z',
              status: 'classified',
              updatedAt: '2026-03-28T08:20:00.000Z',
              userId: 'user_1',
            },
            {
              amountMinor: 5000,
              id: 'txn_2',
              paidAt: '2026-03-28T10:15:00.000Z',
              status: 'new',
              updatedAt: '2026-03-28T10:20:00.000Z',
              userId: 'user_1',
            },
            {
              amountMinor: 8000,
              deletedAt: '2026-03-28T12:00:00.000Z',
              id: 'txn_3',
              paidAt: '2026-03-28T11:15:00.000Z',
              status: 'deleted',
              updatedAt: '2026-03-28T11:20:00.000Z',
              userId: 'user_1',
            },
          ],
          version: 1,
        },
        null,
        2,
      ),
    );

    const module = createReportsRollupsModule({
      domainStoreFile,
      intervalMs: 60_000,
      logger: { info },
      now: () => '2026-03-29T00:00:00.000Z',
      reportsRollupStoreFile,
    });

    module.jobs[0]?.run();

    expect(info).toHaveBeenCalledWith('worker reports rollups refreshed', {
      daily_rollup_count: 1,
      monthly_rollup_count: 1,
      user_count: 1,
    });

    expect(JSON.parse(readFileSync(reportsRollupStoreFile, 'utf8'))).toEqual({
      generatedAt: '2026-03-29T00:00:00.000Z',
      rollups: [
        {
          classifiedTransactionCount: 1,
          periodKey: '2026-03-28',
          periodType: 'daily',
          totalSpendMinor: 17500,
          transactionCount: 2,
          uncategorizedCount: 1,
          userId: 'user_1',
        },
        {
          classifiedTransactionCount: 1,
          periodKey: '2026-03',
          periodType: 'monthly',
          totalSpendMinor: 17500,
          transactionCount: 2,
          uncategorizedCount: 1,
          userId: 'user_1',
        },
      ],
      version: 1,
    });
  });
});
