import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';
import type {
  TelemetryEvent,
  TelemetryOperationalDashboardResponse,
} from './telemetry.js';
import {
  TELEMETRY_ALERT_KEYS,
  TELEMETRY_EVENT_NAMES,
  TELEMETRY_SCHEMA_VERSION,
} from './telemetry.js';
import { describe, expect, it } from 'vitest';

describe('telemetry contract', () => {
  it('keeps the event schema versioned and exposes the supported event names', () => {
    const eventNames = new Set(TELEMETRY_EVENT_NAMES);

    expect(TELEMETRY_SCHEMA_VERSION).toBe(1);
    expect(eventNames).toEqual(
      new Set([
        'app_runtime_error',
        'budget_alert_delivery',
        'capture_failure',
        'capture_success',
        'classify_completed',
        'notification_permission_denied',
        'onboarding_completed',
        'parser_fallback',
        'sync_error',
      ]),
    );
    expect(TELEMETRY_ALERT_KEYS).toEqual([
      'capture_failure_spike',
      'sync_error_spike',
      'parser_fallback_spike',
      'classify_latency_spike',
      'runtime_error_spike',
    ]);
  });

  it('supports typed telemetry events and dashboard responses', () => {
    const event: TelemetryEvent = {
      appVersion: '1.0.0',
      clientEventId: 'event_1',
      data: {
        durationMs: 4_200,
        saveAsRule: false,
        autoApplyRule: false,
        source: 'inbox',
      },
      eventName: 'classify_completed',
      occurredAt: '2026-03-30T10:00:00.000Z' as IsoUtcDateTimeString,
      platform: 'android',
      rolloutChannel: 'beta',
      runtimeVersion: 'expo-sdk-55-dev-client',
    };
    const dashboard: TelemetryOperationalDashboardResponse = {
      alerts: [],
      budgetAlertDelivery: {
        deliveryCount: 2,
        quietedCount: 1,
        reviewedCount: 0,
      },
      capture: {
        failureCount: 1,
        failureRate: 0.1,
        parserFallbackCount: 1,
        parserFallbackRate: 0.25,
        successCount: 10,
      },
      classification: {
        completedCount: 3,
        latencyP50Ms: 4_200,
        latencyP95Ms: 9_500,
      },
      funnels: {
        onboardingCompletedCount: 4,
        permissionDeniedCount: 1,
      },
      generatedAt: '2026-03-30T10:10:00.000Z' as IsoUtcDateTimeString,
      lookbackHours: 24,
      runtimeErrors: {
        count: 1,
        fatalCount: 0,
      },
      schemaVersion: TELEMETRY_SCHEMA_VERSION,
      sync: {
        affectedDeviceCount: 1,
        errorCount: 1,
      },
      totals: {
        deviceCount: 2,
        eventCount: 12,
        userCount: 2,
      },
    };

    expect(event.eventName).toBe('classify_completed');
    expect(dashboard.schemaVersion).toBe(1);
  });
});
