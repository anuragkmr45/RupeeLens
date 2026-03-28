import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { getApiRuntimeConfig } from './lib/env.js';
import { createBootstrapConfigModule } from './modules/bootstrap/bootstrap.module.js';
import { createHealthModule } from './modules/health/health.module.js';
import { registerApiModules } from './modules/module.js';
import { createSessionsModule } from './modules/sessions/sessions.module.js';

export interface BuildAppOptions {
  sessionStoreFile?: string;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: false,
  });
  const runtimeConfig = getApiRuntimeConfig();

  registerApiModules(app, [
    createHealthModule(),
    createBootstrapConfigModule(),
    createSessionsModule({
      sessionStoreFile: options.sessionStoreFile ?? runtimeConfig.sessionStoreFile,
    }),
  ]);

  return app;
}
