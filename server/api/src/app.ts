import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { getApiRuntimeConfig } from './lib/env.js';
import { createSessionRepository } from './modules/sessions/sessions.repository.js';
import { createSessionService } from './modules/sessions/sessions.service.js';
import { createBootstrapConfigModule } from './modules/bootstrap/bootstrap.module.js';
import { createHealthModule } from './modules/health/health.module.js';
import { registerApiModules } from './modules/module.js';
import { createSessionsModule } from './modules/sessions/sessions.module.js';
import { createSyncModule } from './modules/sync/sync.module.js';
import { createSyncRepository } from './modules/sync/sync.repository.js';
import { createSyncService } from './modules/sync/sync.service.js';

export interface BuildAppOptions {
  sessionStoreFile?: string;
  syncStoreFile?: string;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: false,
  });
  const runtimeConfig = getApiRuntimeConfig();
  const sessionRepository = createSessionRepository({
    sessionStoreFile: options.sessionStoreFile ?? runtimeConfig.sessionStoreFile,
  });
  const sessionService = createSessionService({
    repository: sessionRepository,
  });
  const syncRepository = createSyncRepository({
    syncStoreFile: options.syncStoreFile ?? runtimeConfig.syncStoreFile,
  });
  const syncService = createSyncService({
    repository: syncRepository,
    sessionService,
  });

  app.addHook('onClose', async () => {
    sessionRepository.close();
    syncRepository.close();
  });

  registerApiModules(app, [
    createHealthModule(),
    createBootstrapConfigModule(),
    createSessionsModule(sessionService),
    createSyncModule(syncService),
  ]);

  return app;
}
