import {
  TELEMETRY_SCHEMA_VERSION,
  type TelemetryIngestRequest,
  type TelemetryIngestResponse,
  type TelemetryOperationalAlert,
  type TelemetryOperationalDashboardResponse,
} from '@upi-spend-tracker/contracts';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

import {
  type SessionService,
} from '../sessions/sessions.service.js';
import type {
  StoredTelemetryEvent,
  TelemetryRepository,
} from './telemetry.repository.js';

const DEFAULT_LOOKBACK_HOURS = 24;
const MAX_LOOKBACK_HOURS = 168;

export interface TelemetryServiceDependencies {
  now?: () => IsoUtcDateTimeString;
  repository: TelemetryRepository;
  sessionService: SessionService;
}

export interface TelemetryService {
  getOperationalDashboard(
    accessToken: string,
    lookbackHours?: number,
  ): TelemetryOperationalDashboardResponse;
  ingestEvents(
    accessToken: string,
    request: TelemetryIngestRequest,
  ): TelemetryIngestResponse;
}

export class TelemetryBadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TelemetryBadRequestError';
  }
}

export function createTelemetryService({
  now = () => new Date().toISOString() as IsoUtcDateTimeString,
  repository,
  sessionService,
}: TelemetryServiceDependencies): TelemetryService {
  return {
    getOperationalDashboard(accessToken, lookbackHours = DEFAULT_LOOKBACK_HOURS) {
      sessionService.authenticateSession(accessToken);
      const normalizedLookbackHours = normalizeLookbackHours(lookbackHours);
      const generatedAt = now();

      return buildOperationalDashboard({
        events: repository.listEvents(),
        generatedAt,
        lookbackHours: normalizedLookbackHours,
      });
    },
    ingestEvents(accessToken, request) {
      const authenticatedSession = sessionService.authenticateSession(accessToken);

      if (request.schemaVersion !== TELEMETRY_SCHEMA_VERSION || request.events.length === 0) {
        throw new TelemetryBadRequestError(
          'Expected telemetry events with the current schema version.',
        );
      }

      if (request.events.length > 100) {
        throw new TelemetryBadRequestError('Telemetry batches cannot exceed 100 events.');
      }

      const receivedAt = now();
      const results = repository.appendEvents(
        request.events.map((event) => ({
          ...event,
          deviceId: authenticatedSession.deviceId,
          receivedAt,
          userId: authenticatedSession.userId,
        })),
      );

      return {
        acceptedCount: results.acceptedCount,
        duplicateCount: results.duplicateCount,
        receivedAt,
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
      };
    },
  };
}

export function buildOperationalDashboard({
  events,
  generatedAt,
  lookbackHours,
}: {
  events: ReadonlyArray<StoredTelemetryEvent>;
  generatedAt: IsoUtcDateTimeString;
  lookbackHours: number;
}): TelemetryOperationalDashboardResponse {
  const lookbackStartMs = Date.parse(generatedAt) - lookbackHours * 60 * 60 * 1000;
  const recentEvents = events.filter((event) => Date.parse(event.occurredAt) >= lookbackStartMs);
  const uniqueUserIds = new Set(recentEvents.map((event) => event.userId));
  const uniqueDeviceIds = new Set(recentEvents.map((event) => event.deviceId));
  const syncErrorDeviceIds = new Set<string>();
  const classifyLatencies: number[] = [];
  let onboardingCompletedCount = 0;
  let permissionDeniedCount = 0;
  let captureSuccessCount = 0;
  let captureFailureCount = 0;
  let parserFallbackCount = 0;
  let syncErrorCount = 0;
  let budgetAlertDeliveryCount = 0;
  let budgetAlertQuietedCount = 0;
  let budgetAlertReviewedCount = 0;
  let runtimeErrorCount = 0;
  let fatalRuntimeErrorCount = 0;

  for (const event of recentEvents) {
    switch (event.eventName) {
      case 'onboarding_completed':
        onboardingCompletedCount += 1;
        break;
      case 'notification_permission_denied':
        permissionDeniedCount += 1;
        break;
      case 'capture_success':
        captureSuccessCount += 1;
        break;
      case 'capture_failure':
        captureFailureCount += 1;
        break;
      case 'parser_fallback':
        parserFallbackCount += 1;
        break;
      case 'classify_completed':
        classifyLatencies.push(event.data.durationMs);
        break;
      case 'sync_error':
        syncErrorCount += 1;
        syncErrorDeviceIds.add(event.deviceId);
        break;
      case 'budget_alert_delivery':
        budgetAlertDeliveryCount += 1;

        if (event.data.status === 'quieted') {
          budgetAlertQuietedCount += 1;
        }

        if (event.data.status === 'reviewed') {
          budgetAlertReviewedCount += 1;
        }

        break;
      case 'app_runtime_error':
        runtimeErrorCount += 1;

        if (event.data.fatal) {
          fatalRuntimeErrorCount += 1;
        }

        break;
    }
  }

  const classifyLatencyP50Ms = percentile(classifyLatencies, 0.5);
  const classifyLatencyP95Ms = percentile(classifyLatencies, 0.95);
  const captureAttemptCount = captureSuccessCount + captureFailureCount;
  const captureFailureRate =
    captureAttemptCount > 0 ? roundRatio(captureFailureCount / captureAttemptCount) : null;
  const parserFallbackRate =
    captureSuccessCount > 0 ? roundRatio(parserFallbackCount / captureSuccessCount) : null;

  return {
    alerts: buildOperationalAlerts({
      captureFailureCount,
      classifyLatencyP95Ms,
      parserFallbackRate,
      runtimeErrorCount,
      syncErrorCount,
    }),
    budgetAlertDelivery: {
      deliveryCount: budgetAlertDeliveryCount,
      quietedCount: budgetAlertQuietedCount,
      reviewedCount: budgetAlertReviewedCount,
    },
    capture: {
      failureCount: captureFailureCount,
      failureRate: captureFailureRate,
      parserFallbackCount,
      parserFallbackRate,
      successCount: captureSuccessCount,
    },
    classification: {
      completedCount: classifyLatencies.length,
      latencyP50Ms: classifyLatencyP50Ms,
      latencyP95Ms: classifyLatencyP95Ms,
    },
    funnels: {
      onboardingCompletedCount,
      permissionDeniedCount,
    },
    generatedAt,
    lookbackHours,
    runtimeErrors: {
      count: runtimeErrorCount,
      fatalCount: fatalRuntimeErrorCount,
    },
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    sync: {
      affectedDeviceCount: syncErrorDeviceIds.size,
      errorCount: syncErrorCount,
    },
    totals: {
      deviceCount: uniqueDeviceIds.size,
      eventCount: recentEvents.length,
      userCount: uniqueUserIds.size,
    },
  };
}

function buildOperationalAlerts({
  captureFailureCount,
  classifyLatencyP95Ms,
  parserFallbackRate,
  runtimeErrorCount,
  syncErrorCount,
}: {
  captureFailureCount: number;
  classifyLatencyP95Ms: number | null;
  parserFallbackRate: number | null;
  runtimeErrorCount: number;
  syncErrorCount: number;
}): TelemetryOperationalAlert[] {
  return [
    {
      description: 'Capture failures in the recent telemetry window.',
      key: 'capture_failure_spike',
      observed: captureFailureCount,
      status: captureFailureCount >= 5 ? 'firing' : 'ok',
      threshold: 5,
      unit: 'count',
    },
    {
      description: 'Sync errors reported by paired clients in the recent telemetry window.',
      key: 'sync_error_spike',
      observed: syncErrorCount,
      status: syncErrorCount >= 5 ? 'firing' : 'ok',
      threshold: 5,
      unit: 'count',
    },
    {
      description: 'Parser fallback ratio over successful captures.',
      key: 'parser_fallback_spike',
      observed: parserFallbackRate ?? 0,
      status: (parserFallbackRate ?? 0) >= 0.5 ? 'firing' : 'ok',
      threshold: 0.5,
      unit: 'ratio',
    },
    {
      description: '95th percentile classify latency from local review flows.',
      key: 'classify_latency_spike',
      observed: classifyLatencyP95Ms ?? 0,
      status: (classifyLatencyP95Ms ?? 0) >= 15_000 ? 'firing' : 'ok',
      threshold: 15_000,
      unit: 'milliseconds',
    },
    {
      description: 'Client runtime errors captured in the recent telemetry window.',
      key: 'runtime_error_spike',
      observed: runtimeErrorCount,
      status: runtimeErrorCount >= 3 ? 'firing' : 'ok',
      threshold: 3,
      unit: 'count',
    },
  ];
}

function normalizeLookbackHours(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > MAX_LOOKBACK_HOURS) {
    throw new TelemetryBadRequestError(
      `lookbackHours must be an integer between 1 and ${MAX_LOOKBACK_HOURS}.`,
    );
  }

  return value;
}

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * percentileValue) - 1),
  );

  return sortedValues[index] ?? null;
}

function roundRatio(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
