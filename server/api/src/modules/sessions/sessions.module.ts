import type { ApiModule } from '../module.js';
import { createSessionRepository } from './sessions.repository.js';
import { registerSessionRoutes } from './sessions.route.js';
import { createSessionService } from './sessions.service.js';

export function createSessionsModule(): ApiModule {
  const repository = createSessionRepository();
  const service = createSessionService({ repository });

  return {
    name: 'sessions',
    register(app) {
      registerSessionRoutes(app, service);
    },
  };
}
