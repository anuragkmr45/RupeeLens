import path from 'node:path';

const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;
const DEFAULT_CLEANUP_INTERVAL_MS = 10 * 60_000;
const DEFAULT_EXPORTS_INTERVAL_MS = 30_000;
const DEFAULT_ROLLUPS_INTERVAL_MS = 5 * 60_000;
const DEFAULT_EXPORT_ARTIFACT_TTL_MS = 7 * 24 * 60 * 60_000;
const DEFAULT_EXPORT_FAILURE_RETENTION_MS = 7 * 24 * 60 * 60_000;
const DEFAULT_EXPORT_MAX_ATTEMPTS = 3;
const DEFAULT_EXPORT_RETRY_DELAY_MS = 5 * 60_000;
const DEFAULT_DOMAIN_STORE_FILE = path.resolve(process.cwd(), '..', 'api', '.local', 'domain-store.json');
const DEFAULT_SESSION_STORE_FILE = path.resolve(
  process.cwd(),
  '..',
  'api',
  '.local',
  'sessions-store.json',
);
const DEFAULT_EXPORT_JOB_STORE_FILE = path.resolve(process.cwd(), '.local', 'export-jobs.json');
const DEFAULT_REPORTS_ROLLUP_STORE_FILE = path.resolve(
  process.cwd(),
  '.local',
  'reports-rollups.json',
);
const DEFAULT_EXPORT_ARTIFACTS_DIR = path.resolve(process.cwd(), '.local', 'exports');

export interface WorkerRuntimeConfig {
  cleanupIntervalMs: number;
  domainStoreFile: string;
  exportArtifactTtlMs: number;
  exportArtifactsDir: string;
  exportFailureRetentionMs: number;
  exportJobStoreFile: string;
  exportMaxAttempts: number;
  exportRetryDelayMs: number;
  exportsIntervalMs: number;
  heartbeatIntervalMs: number;
  reportsRollupStoreFile: string;
  rollupsIntervalMs: number;
  sessionStoreFile: string;
}

function parsePositiveInteger(
  value: string | undefined,
  fallbackValue: number,
): number {
  if (!value) {
    return fallbackValue;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
}

function parseResolvedPath(value: string | undefined, fallbackValue: string): string {
  if (!value) {
    return fallbackValue;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? path.resolve(trimmedValue) : fallbackValue;
}

export function getWorkerRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): WorkerRuntimeConfig {
  return {
    cleanupIntervalMs: parsePositiveInteger(
      env.WORKER_CLEANUP_INTERVAL_MS,
      DEFAULT_CLEANUP_INTERVAL_MS,
    ),
    domainStoreFile: parseResolvedPath(
      env.WORKER_DOMAIN_STORE_FILE,
      DEFAULT_DOMAIN_STORE_FILE,
    ),
    exportArtifactTtlMs: parsePositiveInteger(
      env.WORKER_EXPORT_ARTIFACT_TTL_MS,
      DEFAULT_EXPORT_ARTIFACT_TTL_MS,
    ),
    exportArtifactsDir: parseResolvedPath(
      env.WORKER_EXPORT_ARTIFACTS_DIR,
      DEFAULT_EXPORT_ARTIFACTS_DIR,
    ),
    exportFailureRetentionMs: parsePositiveInteger(
      env.WORKER_EXPORT_FAILURE_RETENTION_MS,
      DEFAULT_EXPORT_FAILURE_RETENTION_MS,
    ),
    exportJobStoreFile: parseResolvedPath(
      env.WORKER_EXPORT_JOB_STORE_FILE,
      DEFAULT_EXPORT_JOB_STORE_FILE,
    ),
    exportMaxAttempts: parsePositiveInteger(
      env.WORKER_EXPORT_MAX_ATTEMPTS,
      DEFAULT_EXPORT_MAX_ATTEMPTS,
    ),
    exportRetryDelayMs: parsePositiveInteger(
      env.WORKER_EXPORT_RETRY_DELAY_MS,
      DEFAULT_EXPORT_RETRY_DELAY_MS,
    ),
    exportsIntervalMs: parsePositiveInteger(
      env.WORKER_EXPORTS_INTERVAL_MS,
      DEFAULT_EXPORTS_INTERVAL_MS,
    ),
    heartbeatIntervalMs: parsePositiveInteger(
      env.WORKER_HEARTBEAT_INTERVAL_MS,
      DEFAULT_HEARTBEAT_INTERVAL_MS,
    ),
    reportsRollupStoreFile: parseResolvedPath(
      env.WORKER_REPORTS_ROLLUP_STORE_FILE,
      DEFAULT_REPORTS_ROLLUP_STORE_FILE,
    ),
    rollupsIntervalMs: parsePositiveInteger(
      env.WORKER_ROLLUPS_INTERVAL_MS,
      DEFAULT_ROLLUPS_INTERVAL_MS,
    ),
    sessionStoreFile: parseResolvedPath(
      env.WORKER_SESSION_STORE_FILE,
      DEFAULT_SESSION_STORE_FILE,
    ),
  };
}
