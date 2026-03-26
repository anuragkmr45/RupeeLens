import type { ApiModule } from '../module.js';
import { registerHealthRoutes } from './health.route.js';
import { createHealthRepository, type HealthRepositoryOptions } from './health.repository.js';
import { createHealthService } from './health.service.js';

export type HealthModuleOptions = HealthRepositoryOptions;

export function createHealthModule(options: HealthModuleOptions = {}): ApiModule {
  const repository = createHealthRepository(options);
  const service = createHealthService(repository);

  return {
    name: 'health',
    register(app) {
      registerHealthRoutes(app, service);
    },
  };
}
