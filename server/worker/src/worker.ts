import { createHeartbeatPayload } from './jobs/heartbeat.job.js';
import type { Logger } from './lib/logger.js';

const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;

export interface WorkerRuntime {
  start(): void;
  stop(): void;
}

export interface WorkerRuntimeOptions {
  intervalMs?: number;
  logger: Logger;
}

export function createWorkerRuntime({
  intervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
  logger,
}: WorkerRuntimeOptions): WorkerRuntime {
  let timer: NodeJS.Timeout | undefined;

  const runHeartbeat = () => {
    const payload = createHeartbeatPayload();
    logger.info('worker heartbeat', payload);
  };

  return {
    start() {
      logger.info('worker booted', {
        heartbeat_interval_ms: intervalMs,
      });
      runHeartbeat();
      timer = setInterval(runHeartbeat, intervalMs);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
      }
    },
  };
}
