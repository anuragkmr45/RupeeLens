import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { getApiRuntimeConfig } from './lib/env.js';
import { createBootstrapConfigModule } from './modules/bootstrap/bootstrap.module.js';
import { createDomainModule } from './modules/domain/domain.module.js';
import { createDomainRepository } from './modules/domain/domain.repository.js';
import { createDomainService } from './modules/domain/domain.service.js';
import { createHealthModule } from './modules/health/health.module.js';
import { registerApiModules } from './modules/module.js';
import { createReportsModule } from './modules/reports/reports.module.js';
import { createReportsService } from './modules/reports/reports.service.js';
import { createSessionRepository } from './modules/sessions/sessions.repository.js';
import { createSessionService } from './modules/sessions/sessions.service.js';
import { createSessionsModule } from './modules/sessions/sessions.module.js';
import { createSyncModule } from './modules/sync/sync.module.js';
import { createSyncRepository } from './modules/sync/sync.repository.js';
import { createSyncService } from './modules/sync/sync.service.js';
import { createTelemetryModule } from './modules/telemetry/telemetry.module.js';
import { createTelemetryRepository } from './modules/telemetry/telemetry.repository.js';
import { createTelemetryService } from './modules/telemetry/telemetry.service.js';

export interface BuildAppOptions {
  domainStoreFile?: string;
  sessionStoreFile?: string;
  syncStoreFile?: string;
  telemetryStoreFile?: string;
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
  const domainRepository = createDomainRepository({
    domainStoreFile: options.domainStoreFile ?? runtimeConfig.domainStoreFile,
  });
  const domainService = createDomainService({
    repository: domainRepository,
    sessionService,
  });
  const reportsService = createReportsService({
    repository: domainRepository,
    sessionService,
  });
  const syncRepository = createSyncRepository({
    syncStoreFile: options.syncStoreFile ?? runtimeConfig.syncStoreFile,
  });
  const syncService = createSyncService({
    repository: syncRepository,
    sessionService,
  });
  const telemetryRepository = createTelemetryRepository({
    telemetryStoreFile: options.telemetryStoreFile ?? runtimeConfig.telemetryStoreFile,
  });
  const telemetryService = createTelemetryService({
    repository: telemetryRepository,
    sessionService,
  });

  app.addHook('onClose', async () => {
    domainRepository.close();
    sessionRepository.close();
    syncRepository.close();
    telemetryRepository.close();
  });

  registerApiModules(app, [
    createHealthModule(),
    createBootstrapConfigModule(),
    createSessionsModule(sessionService),
    createDomainModule(domainService),
    createReportsModule(reportsService),
    createSyncModule(syncService),
    createTelemetryModule(telemetryService),
  ]);

  return app;
}
