import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCleanupModule } from './cleanup.module.js';

describe('cleanup module', () => {
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

  it('prunes expired session records and old export artifacts', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'rupeelens-worker-cleanup-'));
    const sessionStoreFile = path.join(tempDir, 'sessions-store.json');
    const exportJobStoreFile = path.join(tempDir, 'export-jobs.json');
    const artifactPath = path.join(tempDir, 'exports', 'user_1', 'job_1.csv');
    const info = vi.fn();
    tempDirs.push(tempDir);

    writeFileSync(
      sessionStoreFile,
      JSON.stringify(
        {
          accessTokens: [
            { expiresAt: '2026-03-28T00:00:00.000Z', tokenDigest: 'expired' },
            { expiresAt: '2026-03-30T00:00:00.000Z', tokenDigest: 'active' },
          ],
          devices: [],
          pairingCodes: [
            { codeDigest: 'active', expiresAt: '2026-03-30T00:00:00.000Z' },
            {
              codeDigest: 'consumed',
              consumedAt: '2026-03-28T10:00:00.000Z',
              expiresAt: '2026-03-30T00:00:00.000Z',
            },
          ],
          refreshTokens: [
            { expiresAt: '2026-03-30T00:00:00.000Z', tokenDigest: 'keep' },
            {
              expiresAt: '2026-03-30T00:00:00.000Z',
              revokedAt: '2026-03-28T10:00:00.000Z',
              tokenDigest: 'revoke',
            },
          ],
          users: [],
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
              artifactPath,
              attemptCount: 1,
              completedAt: '2026-03-28T10:00:00.000Z',
              createdAt: '2026-03-28T09:00:00.000Z',
              expiresAt: '2026-03-28T20:00:00.000Z',
              format: 'csv',
              id: 'job_1',
              nextAttemptAt: '2026-03-28T09:00:00.000Z',
              resourceTypes: ['transactions'],
              status: 'completed',
              userId: 'user_1',
            },
            {
              attemptCount: 3,
              createdAt: '2026-03-20T09:00:00.000Z',
              format: 'csv',
              id: 'job_2',
              lastError: 'boom',
              nextAttemptAt: '2026-03-20T09:00:00.000Z',
              resourceTypes: ['transactions'],
              status: 'failed',
              userId: 'user_1',
            },
            {
              attemptCount: 0,
              createdAt: '2026-03-29T09:00:00.000Z',
              format: 'csv',
              id: 'job_3',
              nextAttemptAt: '2026-03-29T10:00:00.000Z',
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

    mkdirSync(path.dirname(artifactPath), {
      recursive: true,
    });
    writeFileSync(artifactPath, 'header\nvalue\n');

    const module = createCleanupModule({
      exportFailureRetentionMs: 86_400_000,
      exportJobStoreFile,
      intervalMs: 60_000,
      logger: { info },
      maxExportAttempts: 3,
      now: () => '2026-03-29T12:00:00.000Z',
      sessionStoreFile,
    });

    module.jobs[0]?.run();

    expect(info).toHaveBeenCalledWith('worker cleanup summary', {
      dead_letter_count: 0,
      failed_job_count: 0,
      pending_job_count: 1,
      pruned_access_token_count: 1,
      pruned_artifact_count: 1,
      pruned_completed_export_count: 1,
      pruned_failed_export_count: 1,
      pruned_pairing_code_count: 1,
      pruned_refresh_token_count: 1,
    });

    expect(JSON.parse(readFileSync(sessionStoreFile, 'utf8'))).toEqual({
      accessTokens: [{ expiresAt: '2026-03-30T00:00:00.000Z', tokenDigest: 'active' }],
      devices: [],
      pairingCodes: [{ codeDigest: 'active', expiresAt: '2026-03-30T00:00:00.000Z' }],
      refreshTokens: [{ expiresAt: '2026-03-30T00:00:00.000Z', tokenDigest: 'keep' }],
      users: [],
      version: 1,
    });
    expect(JSON.parse(readFileSync(exportJobStoreFile, 'utf8'))).toEqual({
      jobs: [
        {
          attemptCount: 0,
          createdAt: '2026-03-29T09:00:00.000Z',
          format: 'csv',
          id: 'job_3',
          nextAttemptAt: '2026-03-29T10:00:00.000Z',
          resourceTypes: ['transactions'],
          status: 'queued',
          userId: 'user_1',
        },
      ],
      version: 1,
    });
    expect(existsSync(artifactPath)).toBe(false);
  });
});
