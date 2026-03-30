import type { ApiModule } from '../module.js';
import type { TelemetryService } from './telemetry.service.js';
import { registerTelemetryRoutes } from './telemetry.route.js';

export function createTelemetryModule(service: TelemetryService): ApiModule {
  return {
    name: 'telemetry',
    register(app) {
      registerTelemetryRoutes(app, service);
    },
  };
}
