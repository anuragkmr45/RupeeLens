import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { createBootstrapConfigModule } from './modules/bootstrap/bootstrap.module.js';
import { createHealthModule } from './modules/health/health.module.js';
import { registerApiModules } from './modules/module.js';
import { createSessionsModule } from './modules/sessions/sessions.module.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  registerApiModules(app, [
    createHealthModule(),
    createBootstrapConfigModule(),
    createSessionsModule(),
  ]);

  return app;
}
