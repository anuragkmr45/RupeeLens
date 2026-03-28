import type { ApiModule } from '../module.js';
import { registerSessionRoutes } from './sessions.route.js';
import type { SessionService } from './sessions.service.js';

export function createSessionsModule(service: SessionService): ApiModule {
  return {
    name: 'sessions',
    register(app) {
      registerSessionRoutes(app, service);
    },
  };
}
