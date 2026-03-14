import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

export interface HealthResponse {
  service: 'api';
  status: 'healthy';
  timestamp_utc: IsoUtcDateTimeString;
}
