import type { ApiModule } from '../module.js';
import { registerReportsRoutes } from './reports.route.js';
import type { ReportsService } from './reports.service.js';

export function createReportsModule(service: ReportsService): ApiModule {
  return {
    name: 'reports',
    register(app) {
      registerReportsRoutes(app, service);
    },
  };
}
