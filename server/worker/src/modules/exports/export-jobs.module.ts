import type { Logger } from '../../lib/logger.js';
import type { WorkerJob, WorkerModule } from '../module.js';
import {
  createExportJobsRepository,
  type ExportJobsRepositoryOptions,
} from './export-jobs.repository.js';
import {
  createExportJobsService,
  type ExportJobsServiceDependencies,
} from './export-jobs.service.js';

export interface ExportJobsModuleOptions
  extends ExportJobsRepositoryOptions,
    Omit<ExportJobsServiceDependencies, 'repository'> {
  intervalMs: number;
  logger: Logger;
}

export function createExportJobsModule({
  artifactTtlMs,
  intervalMs,
  logger,
  maxAttempts,
  now,
  retryDelayMs,
  ...repositoryOptions
}: ExportJobsModuleOptions): WorkerModule {
  const repository = createExportJobsRepository(repositoryOptions);
  const service = createExportJobsService({
    artifactTtlMs,
    maxAttempts,
    repository,
    retryDelayMs,
    ...(now ? { now } : {}),
  });

  const exportJob: WorkerJob = {
    intervalMs,
    name: 'export-jobs',
    run() {
      const summary = service.processDueJobs();

      logger.info('worker export queue snapshot', {
        completed_count: summary.completedCount,
        dead_letter_count: summary.deadLetterCount,
        failed_count: summary.failedCount,
        pending_count: summary.pendingCount,
        processed_count: summary.processedCount,
        retryable_failure_count: summary.retryableFailureCount,
      });
    },
  };

  return {
    jobs: [exportJob],
    name: 'export-jobs',
  };
}
