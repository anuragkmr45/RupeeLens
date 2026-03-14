import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';
import { getCurrentUtcTimestamp } from '@upi-spend-tracker/shared-utils';

export interface HeartbeatPayload {
  service: 'worker';
  timestamp_utc: IsoUtcDateTimeString;
}

export function createHeartbeatPayload(): HeartbeatPayload {
  return {
    service: 'worker',
    timestamp_utc: getCurrentUtcTimestamp(),
  };
}
