import { getCurrentUtcTimestamp } from '@upi-spend-tracker/shared-utils';

export interface HeartbeatSnapshot {
  service: 'worker';
  timestampUtc: string;
}

export interface HeartbeatRepository {
  readSnapshot(): HeartbeatSnapshot;
}

export interface HeartbeatRepositoryOptions {
  now?: () => string;
}

export function createHeartbeatRepository({
  now = getCurrentUtcTimestamp,
}: HeartbeatRepositoryOptions = {}): HeartbeatRepository {
  return {
    readSnapshot() {
      return {
        service: 'worker',
        timestampUtc: now(),
      };
    },
  };
}
