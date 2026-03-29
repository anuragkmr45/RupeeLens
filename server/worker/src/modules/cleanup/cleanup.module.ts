import type { Logger } from '../../lib/logger.js';
import type { WorkerJob, WorkerModule } from '../module.js';
import {
  createCleanupRepository,
  type CleanupRepositoryOptions,
} from './cleanup.repository.js';
import {
  createCleanupService,
  type CleanupServiceDependencies,
} from './cleanup.service.js';

export interface CleanupModuleOptions
  extends CleanupRepositoryOptions,
    Omit<CleanupServiceDependencies, 'repository'> {
  intervalMs: number;
  logger: Logger;
}

export function createCleanupModule({
  intervalMs,
  logger,
  now,
  ...options
}: CleanupModuleOptions): WorkerModule {
  const cleanupRepository = createCleanupRepository(options);
  const service = createCleanupService({
    exportFailureRetentionMs: options.exportFailureRetentionMs,
    maxExportAttempts: options.maxExportAttempts,
    repository: cleanupRepository,
    ...(now ? { now } : {}),
  });

  const cleanupJob: WorkerJob = {
    intervalMs,
    name: 'cleanup',
    run() {
      const summary = service.runCleanup();

      logger.info('worker cleanup summary', {
        dead_letter_count: summary.deadLetterCount,
        failed_job_count: summary.failedJobCount,
        pending_job_count: summary.pendingJobCount,
        pruned_access_token_count: summary.prunedAccessTokenCount,
        pruned_artifact_count: summary.prunedArtifactCount,
        pruned_completed_export_count: summary.prunedCompletedExportCount,
        pruned_failed_export_count: summary.prunedFailedExportCount,
        pruned_pairing_code_count: summary.prunedPairingCodeCount,
        pruned_refresh_token_count: summary.prunedRefreshTokenCount,
      });
    },
  };

  return {
    jobs: [cleanupJob],
    name: 'cleanup',
  };
}
