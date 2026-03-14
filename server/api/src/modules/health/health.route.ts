import type { FastifyInstance } from 'fastify';

import { getHealthResponse } from './health.service.js';

export function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', async () => getHealthResponse());
}
