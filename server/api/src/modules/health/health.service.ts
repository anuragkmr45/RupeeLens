import type { HealthResponse } from '@upi-spend-tracker/contracts';
import { getCurrentUtcTimestamp } from '@upi-spend-tracker/shared-utils';

export function getHealthResponse(): HealthResponse {
  return {
    service: 'api',
    status: 'healthy',
    timestamp_utc: getCurrentUtcTimestamp(),
  };
}
