import { getCurrentUtcTimestamp } from '@upi-spend-tracker/shared-utils';

export interface HealthSnapshot {
  service: 'api';
  status: 'healthy';
  timestampUtc: string;
}

export interface HealthRepository {
  readSnapshot(): HealthSnapshot;
}

export interface HealthRepositoryOptions {
  now?: () => string;
}

export function createHealthRepository({
  now = getCurrentUtcTimestamp,
}: HealthRepositoryOptions = {}): HealthRepository {
  return {
    readSnapshot() {
      return {
        service: 'api',
        status: 'healthy',
        timestampUtc: now(),
      };
    },
  };
}
