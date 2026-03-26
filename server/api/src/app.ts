import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { createHealthModule } from './modules/health/health.module.js';
import { registerApiModules } from './modules/module.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  registerApiModules(app, [createHealthModule()]);

  return app;
}
