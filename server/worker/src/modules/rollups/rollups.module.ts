import type { Logger } from '../../lib/logger.js';
import type { WorkerJob, WorkerModule } from '../module.js';
import {
  createReportsRollupsRepository,
  type ReportsRollupsRepositoryOptions,
} from './rollups.repository.js';
import {
  createReportsRollupsService,
  type ReportsRollupsServiceDependencies,
} from './rollups.service.js';

export interface ReportsRollupsModuleOptions
  extends ReportsRollupsRepositoryOptions,
    Omit<ReportsRollupsServiceDependencies, 'repository'> {
  intervalMs: number;
  logger: Logger;
}

export function createReportsRollupsModule({
  intervalMs,
  logger,
  now,
  ...repositoryOptions
}: ReportsRollupsModuleOptions): WorkerModule {
  const repository = createReportsRollupsRepository(repositoryOptions);
  const service = createReportsRollupsService({
    repository,
    ...(now ? { now } : {}),
  });

  const refreshJob: WorkerJob = {
    intervalMs,
    name: 'reports-rollups',
    run() {
      const summary = service.refreshRollups();

      logger.info('worker reports rollups refreshed', {
        daily_rollup_count: summary.dailyRollupCount,
        monthly_rollup_count: summary.monthlyRollupCount,
        user_count: summary.userCount,
      });
    },
  };

  return {
    jobs: [refreshJob],
    name: 'reports-rollups',
  };
}
