import { describe, expect, it } from 'vitest';

import { getWorkerRuntimeConfig } from './env.js';

describe('getWorkerRuntimeConfig', () => {
  it('returns the default worker runtime config when env is empty', () => {
    expect(getWorkerRuntimeConfig({})).toEqual({
      cleanupIntervalMs: 600_000,
      domainStoreFile: expect.stringContaining('api/.local/domain-store.json'),
      exportArtifactTtlMs: 604_800_000,
      exportArtifactsDir: expect.stringContaining('.local/exports'),
      exportFailureRetentionMs: 604_800_000,
      exportJobStoreFile: expect.stringContaining('.local/export-jobs.json'),
      exportMaxAttempts: 3,
      exportRetryDelayMs: 300_000,
      exportsIntervalMs: 30_000,
      heartbeatIntervalMs: 60_000,
      reportsRollupStoreFile: expect.stringContaining('.local/reports-rollups.json'),
      rollupsIntervalMs: 300_000,
      sessionStoreFile: expect.stringContaining('api/.local/sessions-store.json'),
    });
  });

  it('uses valid overrides and falls back for invalid values', () => {
    expect(
      getWorkerRuntimeConfig({
        WORKER_CLEANUP_INTERVAL_MS: '45000',
        WORKER_DOMAIN_STORE_FILE: './tmp/domain-store.json',
        WORKER_EXPORT_ARTIFACT_TTL_MS: '120000',
        WORKER_EXPORT_ARTIFACTS_DIR: './tmp/artifacts',
        WORKER_EXPORT_FAILURE_RETENTION_MS: '240000',
        WORKER_EXPORT_JOB_STORE_FILE: './tmp/export-jobs.json',
        WORKER_EXPORT_MAX_ATTEMPTS: '5',
        WORKER_EXPORT_RETRY_DELAY_MS: '90000',
        WORKER_EXPORTS_INTERVAL_MS: '15000',
        WORKER_HEARTBEAT_INTERVAL_MS: '20000',
        WORKER_REPORTS_ROLLUP_STORE_FILE: './tmp/reports-rollups.json',
        WORKER_ROLLUPS_INTERVAL_MS: '60000',
        WORKER_SESSION_STORE_FILE: './tmp/sessions-store.json',
      }),
    ).toEqual({
      cleanupIntervalMs: 45_000,
      domainStoreFile: expect.stringContaining('tmp/domain-store.json'),
      exportArtifactTtlMs: 120_000,
      exportArtifactsDir: expect.stringContaining('tmp/artifacts'),
      exportFailureRetentionMs: 240_000,
      exportJobStoreFile: expect.stringContaining('tmp/export-jobs.json'),
      exportMaxAttempts: 5,
      exportRetryDelayMs: 90_000,
      exportsIntervalMs: 15_000,
      heartbeatIntervalMs: 20_000,
      reportsRollupStoreFile: expect.stringContaining('tmp/reports-rollups.json'),
      rollupsIntervalMs: 60_000,
      sessionStoreFile: expect.stringContaining('tmp/sessions-store.json'),
    });

    expect(
      getWorkerRuntimeConfig({
        WORKER_CLEANUP_INTERVAL_MS: 'invalid',
        WORKER_EXPORT_ARTIFACT_TTL_MS: 'invalid',
        WORKER_EXPORT_FAILURE_RETENTION_MS: 'invalid',
        WORKER_EXPORT_MAX_ATTEMPTS: 'invalid',
        WORKER_EXPORT_RETRY_DELAY_MS: 'invalid',
        WORKER_EXPORTS_INTERVAL_MS: 'invalid',
        WORKER_HEARTBEAT_INTERVAL_MS: 'invalid',
        WORKER_ROLLUPS_INTERVAL_MS: 'invalid',
      }),
    ).toMatchObject({
      cleanupIntervalMs: 600_000,
      exportArtifactTtlMs: 604_800_000,
      exportFailureRetentionMs: 604_800_000,
      exportMaxAttempts: 3,
      exportRetryDelayMs: 300_000,
      exportsIntervalMs: 30_000,
      heartbeatIntervalMs: 60_000,
      rollupsIntervalMs: 300_000,
    });
  });
});
