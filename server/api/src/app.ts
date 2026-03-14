import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { getApiRuntimeConfig } from './lib/env.js';
import { registerBootstrapRoutes } from './modules/bootstrap/bootstrap.route.js';
import { registerHealthRoutes } from './modules/health/health.route.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });
  const config = getApiRuntimeConfig();

  registerBootstrapRoutes(app, config);
  registerHealthRoutes(app);

  return app;
}
