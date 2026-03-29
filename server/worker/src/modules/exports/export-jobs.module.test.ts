import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createExportJobsModule } from './export-jobs.module.js';

describe('export jobs module', () => {
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

  it('processes queued csv exports and writes an artifact', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'rupeelens-worker-exports-'));
    const domainStoreFile = path.join(tempDir, 'domain-store.json');
    const exportJobStoreFile = path.join(tempDir, 'export-jobs.json');
    const exportArtifactsDir = path.join(tempDir, 'artifacts');
    const info = vi.fn();
    tempDirs.push(tempDir);

    writeFileSync(
      domainStoreFile,
      JSON.stringify(
        {
          auditEvents: [],
          budgetScopes: [],
          budgets: [],
          categories: [
            {
              id: 'cat_food',
              name: 'Food',
              updatedAt: '2026-03-28T10:00:00.000Z',
              userId: 'user_1',
            },
          ],
          merchants: [],
          rules: [],
          transactionItems: [
            {
              categoryId: 'cat_food',
              id: 'item_1',
              itemName: 'Lunch',
              totalAmountMinor: 12500,
              transactionId: 'txn_1',
              updatedAt: '2026-03-28T09:00:00.000Z',
              userId: 'user_1',
            },
          ],
          transactions: [
            {
              amountMinor: 12500,
              id: 'txn_1',
              merchantNorm: 'merchant_cafe',
              merchantRaw: 'Cafe',
              paidAt: '2026-03-28T08:30:00.000Z',
              status: 'classified',
              updatedAt: '2026-03-28T08:35:00.000Z',
              userId: 'user_1',
            },
          ],
          version: 1,
        },
        null,
        2,
      ),
    );

    writeFileSync(
      exportJobStoreFile,
      JSON.stringify(
        {
          jobs: [
            {
              attemptCount: 0,
              createdAt: '2026-03-29T09:00:00.000Z',
              format: 'csv',
              from: '2026-03-28T00:00:00.000Z',
              id: 'job_1',
              nextAttemptAt: '2026-03-29T09:00:00.000Z',
              resourceTypes: ['transactions', 'items', 'categories'],
              status: 'queued',
              to: '2026-03-29T00:00:00.000Z',
              userId: 'user_1',
            },
          ],
          version: 1,
        },
        null,
        2,
      ),
    );

    const module = createExportJobsModule({
      artifactTtlMs: 86_400_000,
      domainStoreFile,
      exportArtifactsDir,
      exportJobStoreFile,
      intervalMs: 60_000,
      logger: { info },
      maxAttempts: 3,
      now: () => '2026-03-29T10:00:00.000Z',
      retryDelayMs: 60_000,
    });

    module.jobs[0]?.run();

    expect(info).toHaveBeenCalledWith('worker export queue snapshot', {
      completed_count: 1,
      dead_letter_count: 0,
      failed_count: 0,
      pending_count: 0,
      processed_count: 1,
      retryable_failure_count: 0,
    });

    const jobState = JSON.parse(readFileSync(exportJobStoreFile, 'utf8'));
    const artifactPath = jobState.jobs[0]?.artifactPath;

    expect(jobState).toMatchObject({
      jobs: [
        {
          attemptCount: 1,
          completedAt: '2026-03-29T10:00:00.000Z',
          expiresAt: '2026-03-30T10:00:00.000Z',
          format: 'csv',
          id: 'job_1',
          nextAttemptAt: '2026-03-29T10:00:00.000Z',
          status: 'completed',
          userId: 'user_1',
        },
      ],
      version: 1,
    });
    expect(typeof artifactPath).toBe('string');
    expect(existsSync(artifactPath)).toBe(true);
    expect(readFileSync(artifactPath, 'utf8')).toContain('resource_type,id,parent_id,name,status');
    expect(readFileSync(artifactPath, 'utf8')).toContain('transactions,txn_1');
    expect(readFileSync(artifactPath, 'utf8')).toContain('items,item_1,txn_1');
    expect(readFileSync(artifactPath, 'utf8')).toContain('categories,cat_food');
  });

  it('marks failed jobs with delayed retry metadata', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'rupeelens-worker-exports-fail-'));
    const domainStoreFile = path.join(tempDir, 'domain-store.json');
    const exportJobStoreFile = path.join(tempDir, 'export-jobs.json');
    const exportArtifactsDir = path.join(tempDir, 'artifacts');
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
          transactions: [],
          version: 1,
        },
        null,
        2,
      ),
    );

    writeFileSync(
      exportJobStoreFile,
      JSON.stringify(
        {
          jobs: [
            {
              attemptCount: 0,
              createdAt: '2026-03-29T09:00:00.000Z',
              format: 'json',
              id: 'job_fail',
              nextAttemptAt: '2026-03-29T09:00:00.000Z',
              resourceTypes: ['transactions'],
              status: 'queued',
              userId: 'user_1',
            },
          ],
          version: 1,
        },
        null,
        2,
      ),
    );

    const module = createExportJobsModule({
      artifactTtlMs: 86_400_000,
      domainStoreFile,
      exportArtifactsDir,
      exportJobStoreFile,
      intervalMs: 60_000,
      logger: { info },
      maxAttempts: 3,
      now: () => '2026-03-29T10:00:00.000Z',
      retryDelayMs: 60_000,
    });

    module.jobs[0]?.run();

    expect(info).toHaveBeenCalledWith('worker export queue snapshot', {
      completed_count: 0,
      dead_letter_count: 0,
      failed_count: 1,
      pending_count: 0,
      processed_count: 1,
      retryable_failure_count: 1,
    });

    expect(JSON.parse(readFileSync(exportJobStoreFile, 'utf8'))).toMatchObject({
      jobs: [
        {
          attemptCount: 1,
          id: 'job_fail',
          lastError: 'Unsupported export format: json',
          nextAttemptAt: '2026-03-29T10:01:00.000Z',
          status: 'failed',
          userId: 'user_1',
        },
      ],
      version: 1,
    });
  });
});
