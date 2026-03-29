import { getWorkerRuntimeConfig } from './lib/env.js';
import { createLogger } from './lib/logger.js';
import { createCleanupModule } from './modules/cleanup/cleanup.module.js';
import { createExportJobsModule } from './modules/exports/export-jobs.module.js';
import { createHeartbeatModule } from './modules/heartbeat/heartbeat.module.js';
import { collectWorkerJobs } from './modules/module.js';
import { createReportsRollupsModule } from './modules/rollups/rollups.module.js';
import { createWorkerRuntime } from './worker.js';

const logger = createLogger('worker');
const config = getWorkerRuntimeConfig();
const jobs = collectWorkerJobs([
  createCleanupModule({
    exportFailureRetentionMs: config.exportFailureRetentionMs,
    exportJobStoreFile: config.exportJobStoreFile,
    intervalMs: config.cleanupIntervalMs,
    logger,
    maxExportAttempts: config.exportMaxAttempts,
    sessionStoreFile: config.sessionStoreFile,
  }),
  createExportJobsModule({
    artifactTtlMs: config.exportArtifactTtlMs,
    domainStoreFile: config.domainStoreFile,
    exportArtifactsDir: config.exportArtifactsDir,
    exportJobStoreFile: config.exportJobStoreFile,
    intervalMs: config.exportsIntervalMs,
    logger,
    maxAttempts: config.exportMaxAttempts,
    retryDelayMs: config.exportRetryDelayMs,
  }),
  createHeartbeatModule({
    intervalMs: config.heartbeatIntervalMs,
    logger,
  }),
  createReportsRollupsModule({
    domainStoreFile: config.domainStoreFile,
    intervalMs: config.rollupsIntervalMs,
    logger,
    reportsRollupStoreFile: config.reportsRollupStoreFile,
  }),
]);
const runtime = createWorkerRuntime({
  jobs,
  logger,
});

runtime.start();

function stop() {
  runtime.stop();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
