import { createLogger } from './lib/logger.js';
import { createWorkerRuntime } from './worker.js';

const logger = createLogger('worker');
const runtime = createWorkerRuntime({
  logger,
});

runtime.start();

function stop() {
  runtime.stop();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
