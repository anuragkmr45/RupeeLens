import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { registerHealthRoutes } from './modules/health/health.route.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  registerHealthRoutes(app);

  return app;
}
