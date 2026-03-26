import type { ApiModule } from '../module.js';
import { createBootstrapConfigRepository } from './bootstrap.repository.js';
import { registerBootstrapConfigRoutes } from './bootstrap.route.js';
import { createBootstrapConfigService } from './bootstrap.service.js';

export function createBootstrapConfigModule(): ApiModule {
  const repository = createBootstrapConfigRepository();
  const service = createBootstrapConfigService(repository);

  return {
    name: 'bootstrap-config',
    register(app) {
      registerBootstrapConfigRoutes(app, service);
    },
  };
}
