import { getWorkerRuntimeConfig } from './lib/env.js';
import { createLogger } from './lib/logger.js';
import { createHeartbeatModule } from './modules/heartbeat/heartbeat.module.js';
import { collectWorkerJobs } from './modules/module.js';
import { createWorkerRuntime } from './worker.js';

const logger = createLogger('worker');
const config = getWorkerRuntimeConfig();
const jobs = collectWorkerJobs([
  createHeartbeatModule({
    intervalMs: config.heartbeatIntervalMs,
    logger,
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
