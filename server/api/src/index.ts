import { buildApp } from './app.js';
import { getApiRuntimeConfig } from './lib/env.js';
import { createLogger } from './lib/logger.js';

const logger = createLogger('api');

async function start() {
  const config = getApiRuntimeConfig();
  const app = buildApp({
    sessionStoreFile: config.sessionStoreFile,
  });

  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });

    logger.info('api booted', {
      host: config.host,
      port: config.port,
    });
  } catch (error) {
    logger.error('api failed to start', {
      error,
    });
    process.exitCode = 1;
  }
}

void start();
