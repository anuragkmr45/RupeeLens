import type { ApiModule } from '../module.js';

import type { DomainService } from './domain.service.js';
import { registerDomainRoutes } from './domain.route.js';

export function createDomainModule(service: DomainService): ApiModule {
  return {
    name: 'domain',
    register(app) {
      registerDomainRoutes(app, service);
    },
  };
}
