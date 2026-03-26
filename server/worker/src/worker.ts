import type { Logger } from './lib/logger.js';
import type { WorkerJob } from './modules/module.js';

export interface WorkerRuntime {
  start(): void;
  stop(): void;
}

export interface WorkerRuntimeOptions {
  jobs: readonly WorkerJob[];
  logger: Logger;
}

export function createWorkerRuntime({
  jobs,
  logger,
}: WorkerRuntimeOptions): WorkerRuntime {
  let timers: NodeJS.Timeout[] = [];

  return {
    start() {
      if (timers.length > 0) {
        return;
      }

      logger.info('worker booted', {
        job_count: jobs.length,
        jobs: jobs.map((job) => ({
          interval_ms: job.intervalMs,
          name: job.name,
        })),
      });

      timers = jobs.map((job) => {
        job.run();
        return setInterval(() => {
          job.run();
        }, job.intervalMs);
      });
    },
    stop() {
      for (const timer of timers) {
        clearInterval(timer);
      }

      timers = [];
    },
  };
}
