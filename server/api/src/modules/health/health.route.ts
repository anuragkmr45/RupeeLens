import type { FastifyInstance } from 'fastify';

import type { HealthService } from './health.service.js';

export function registerHealthRoutes(app: FastifyInstance, service: HealthService) {
  app.get('/health', async () => service.getHealthResponse());
}
