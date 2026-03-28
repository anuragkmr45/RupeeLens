import type { ApiModule } from '../module.js';
import { createSessionRepository } from './sessions.repository.js';
import { registerSessionRoutes } from './sessions.route.js';
import { createSessionService } from './sessions.service.js';

export interface SessionsModuleOptions {
  sessionStoreFile: string;
}

export function createSessionsModule(options: SessionsModuleOptions): ApiModule {
  const repository = createSessionRepository({
    sessionStoreFile: options.sessionStoreFile,
  });
  const service = createSessionService({ repository });

  return {
    name: 'sessions',
    register(app) {
      app.addHook('onClose', async () => {
        repository.close();
      });
      registerSessionRoutes(app, service);
    },
  };
}
