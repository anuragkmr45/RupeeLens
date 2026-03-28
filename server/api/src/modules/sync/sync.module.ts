import type { ApiModule } from '../module.js';
import type { SyncService } from './sync.service.js';
import { registerSyncRoutes } from './sync.route.js';

export function createSyncModule(service: SyncService): ApiModule {
  return {
    name: 'sync',
    register(app) {
      registerSyncRoutes(app, service);
    },
  };
}
