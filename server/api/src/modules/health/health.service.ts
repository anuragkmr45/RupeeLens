import type { HealthResponse } from '@upi-spend-tracker/contracts';

import type { HealthRepository } from './health.repository.js';

export interface HealthService {
  getHealthResponse(): HealthResponse;
}

export function createHealthService(repository: HealthRepository): HealthService {
  return {
    getHealthResponse() {
      const snapshot = repository.readSnapshot();

      return {
        service: snapshot.service,
        status: snapshot.status,
        timestamp_utc: snapshot.timestampUtc as HealthResponse['timestamp_utc'],
      };
    },
  };
}
