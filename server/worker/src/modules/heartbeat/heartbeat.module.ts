import type { Logger } from '../../lib/logger.js';
import type { WorkerJob, WorkerModule } from '../module.js';
import {
  createHeartbeatRepository,
  type HeartbeatRepositoryOptions,
} from './heartbeat.repository.js';
import { createHeartbeatService } from './heartbeat.service.js';

export interface HeartbeatPayload {
  service: 'worker';
  timestamp_utc: string;
}

export interface HeartbeatModuleOptions extends HeartbeatRepositoryOptions {
  intervalMs: number;
  logger: Logger;
}

export function createHeartbeatModule({
  intervalMs,
  logger,
  ...repositoryOptions
}: HeartbeatModuleOptions): WorkerModule {
  const repository = createHeartbeatRepository(repositoryOptions);
  const service = createHeartbeatService(repository);
  const heartbeatJob: WorkerJob = {
    intervalMs,
    name: 'heartbeat',
    run() {
      logger.info('worker heartbeat', service.createPayload());
    },
  };

  return {
    jobs: [heartbeatJob],
    name: 'heartbeat',
  };
}
