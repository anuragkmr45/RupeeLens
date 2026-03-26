import type { HeartbeatPayload } from './heartbeat.module.js';
import type { HeartbeatRepository } from './heartbeat.repository.js';

export interface HeartbeatService {
  createPayload(): HeartbeatPayload;
}

export function createHeartbeatService(repository: HeartbeatRepository): HeartbeatService {
  return {
    createPayload() {
      const snapshot = repository.readSnapshot();

      return {
        service: snapshot.service,
        timestamp_utc: snapshot.timestampUtc,
      };
    },
  };
}
