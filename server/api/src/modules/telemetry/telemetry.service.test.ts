import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  TELEMETRY_SCHEMA_VERSION,
  type TelemetryEvent,
  type TelemetryEventName,
} from '@upi-spend-tracker/contracts';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';
import { describe, expect, it } from 'vitest';

import { createSessionRepository } from '../sessions/sessions.repository.js';
import { createSessionService } from '../sessions/sessions.service.js';
import { createTelemetryRepository } from './telemetry.repository.js';
import { createTelemetryService } from './telemetry.service.js';

describe('telemetry service', () => {
  it('ingests privacy-safe events and summarizes the operational dashboard', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-telemetry-service-'));
    const sessionRepository = createSessionRepository({
      sessionStoreFile: path.join(tempDir, 'sessions.json'),
    });
    const telemetryRepository = createTelemetryRepository({
      telemetryStoreFile: path.join(tempDir, 'telemetry.json'),
    });
    const sessionService = createSessionService({
      now: () => '2026-03-30T10:00:00.000Z' as IsoUtcDateTimeString,
      randomToken: (prefix) => `${prefix}_1`,
      randomUuid: (() => {
        let index = 0;
        return () => `uuid_${++index}`;
      })(),
      repository: sessionRepository,
    });
    const telemetryService = createTelemetryService({
      now: () => '2026-03-30T10:30:00.000Z' as IsoUtcDateTimeString,
      repository: telemetryRepository,
      sessionService,
    });

    try {
      const session = sessionService.createGuestSession({
        deviceName: 'Primary Android',
        platform: 'android',
      });

      const firstIngest = telemetryService.ingestEvents(session.accessToken, {
        events: [
          createTelemetryEvent('onboarding_completed', {
            data: {
              permissionGranted: true,
              selectedSourceAppCount: 3,
              syncMode: 'sync_later',
            },
            id: 'onboarding_1',
            occurredAt: '2026-03-30T09:50:00.000Z',
          }),
          createTelemetryEvent('capture_success', {
            data: {
              parserFallback: false,
              parserId: 'google_pay_v1',
              parserVersion: '1.0.0',
              sourceAppId: 'google_pay',
            },
            id: 'capture_success_1',
            occurredAt: '2026-03-30T10:00:00.000Z',
          }),
          createTelemetryEvent('capture_failure', {
            data: {
              code: 'js_import_failed',
              sourceAppId: 'phonepe',
            },
            id: 'capture_failure_1',
            occurredAt: '2026-03-30T10:01:00.000Z',
          }),
          createTelemetryEvent('capture_failure', {
            data: {
              code: 'js_import_failed',
              sourceAppId: 'paytm',
            },
            id: 'capture_failure_2',
            occurredAt: '2026-03-30T10:02:00.000Z',
          }),
          createTelemetryEvent('capture_failure', {
            data: {
              code: 'js_import_failed',
              sourceAppId: 'google_pay',
            },
            id: 'capture_failure_3',
            occurredAt: '2026-03-30T10:03:00.000Z',
          }),
          createTelemetryEvent('capture_failure', {
            data: {
              code: 'js_import_failed',
              sourceAppId: 'google_pay',
            },
            id: 'capture_failure_4',
            occurredAt: '2026-03-30T10:04:00.000Z',
          }),
          createTelemetryEvent('capture_failure', {
            data: {
              code: 'js_import_failed',
              sourceAppId: 'google_pay',
            },
            id: 'capture_failure_5',
            occurredAt: '2026-03-30T10:05:00.000Z',
          }),
          createTelemetryEvent('parser_fallback', {
            data: {
              fallbackParserId: 'generic_upi_v1',
              sourceAppId: 'google_pay',
            },
            id: 'parser_fallback_1',
            occurredAt: '2026-03-30T10:06:00.000Z',
          }),
          createTelemetryEvent('classify_completed', {
            data: {
              autoApplyRule: false,
              durationMs: 3_500,
              saveAsRule: true,
              source: 'inbox',
            },
            id: 'classify_1',
            occurredAt: '2026-03-30T10:07:00.000Z',
          }),
          createTelemetryEvent('classify_completed', {
            data: {
              autoApplyRule: false,
              durationMs: 18_000,
              saveAsRule: false,
              source: 'native_capture',
            },
            id: 'classify_2',
            occurredAt: '2026-03-30T10:08:00.000Z',
          }),
          createTelemetryEvent('sync_error', {
            data: {
              code: 'sync_request_failed',
              phase: 'cycle',
              syncMode: 'cloud_sync',
            },
            id: 'sync_error_1',
            occurredAt: '2026-03-30T10:09:00.000Z',
          }),
          createTelemetryEvent('sync_error', {
            data: {
              code: 'sync_request_failed',
              phase: 'cycle',
              syncMode: 'cloud_sync',
            },
            id: 'sync_error_2',
            occurredAt: '2026-03-30T10:10:00.000Z',
          }),
          createTelemetryEvent('sync_error', {
            data: {
              code: 'sync_request_failed',
              phase: 'cycle',
              syncMode: 'cloud_sync',
            },
            id: 'sync_error_3',
            occurredAt: '2026-03-30T10:11:00.000Z',
          }),
          createTelemetryEvent('sync_error', {
            data: {
              code: 'sync_request_failed',
              phase: 'cycle',
              syncMode: 'cloud_sync',
            },
            id: 'sync_error_4',
            occurredAt: '2026-03-30T10:12:00.000Z',
          }),
          createTelemetryEvent('sync_error', {
            data: {
              code: 'sync_request_failed',
              phase: 'cycle',
              syncMode: 'cloud_sync',
            },
            id: 'sync_error_5',
            occurredAt: '2026-03-30T10:13:00.000Z',
          }),
          createTelemetryEvent('budget_alert_delivery', {
            data: {
              quietMode: true,
              scope: 'overall',
              status: 'quieted',
              thresholdPercent: 80,
            },
            id: 'budget_alert_1',
            occurredAt: '2026-03-30T10:14:00.000Z',
          }),
          createTelemetryEvent('app_runtime_error', {
            data: {
              code: 'type_error',
              domain: 'sync',
              fatal: false,
            },
            id: 'runtime_error_1',
            occurredAt: '2026-03-30T10:15:00.000Z',
          }),
        ],
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
      });
      const duplicateIngest = telemetryService.ingestEvents(session.accessToken, {
        events: [
          createTelemetryEvent('capture_failure', {
            data: {
              code: 'js_import_failed',
              sourceAppId: 'phonepe',
            },
            id: 'capture_failure_1',
            occurredAt: '2026-03-30T10:01:00.000Z',
          }),
        ],
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
      });
      const dashboard = telemetryService.getOperationalDashboard(session.accessToken, 24);

      expect(firstIngest).toMatchObject({
        acceptedCount: 17,
        duplicateCount: 0,
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
      });
      expect(duplicateIngest).toMatchObject({
        acceptedCount: 0,
        duplicateCount: 1,
      });
      expect(dashboard).toMatchObject({
        budgetAlertDelivery: {
          deliveryCount: 1,
          quietedCount: 1,
          reviewedCount: 0,
        },
        capture: {
          failureCount: 5,
          successCount: 1,
        },
        classification: {
          completedCount: 2,
          latencyP50Ms: 3_500,
          latencyP95Ms: 18_000,
        },
        funnels: {
          onboardingCompletedCount: 1,
          permissionDeniedCount: 0,
        },
        runtimeErrors: {
          count: 1,
          fatalCount: 0,
        },
        schemaVersion: 1,
        sync: {
          affectedDeviceCount: 1,
          errorCount: 5,
        },
        totals: {
          deviceCount: 1,
          eventCount: 17,
          userCount: 1,
        },
      });
      expect(dashboard.alerts).toEqual([
        expect.objectContaining({
          key: 'capture_failure_spike',
          status: 'firing',
        }),
        expect.objectContaining({
          key: 'sync_error_spike',
          status: 'firing',
        }),
        expect.objectContaining({
          key: 'parser_fallback_spike',
          status: 'firing',
        }),
        expect.objectContaining({
          key: 'classify_latency_spike',
          status: 'firing',
        }),
        expect.objectContaining({
          key: 'runtime_error_spike',
          status: 'ok',
        }),
      ]);
    } finally {
      sessionRepository.close();
      telemetryRepository.close();
      await rm(tempDir, {
        force: true,
        recursive: true,
      });
    }
  });
});

function createTelemetryEvent<TEventName extends TelemetryEventName>(
  eventName: TEventName,
  {
    data,
    id,
    occurredAt,
  }: {
    data: Extract<TelemetryEvent, { eventName: TEventName }>['data'];
    id: string;
    occurredAt: string;
  },
): Extract<TelemetryEvent, { eventName: TEventName }> {
  return {
    appVersion: '1.0.0',
    clientEventId: id,
    data,
    eventName,
    occurredAt: occurredAt as IsoUtcDateTimeString,
    platform: 'android',
    rolloutChannel: 'beta',
    runtimeVersion: 'expo-sdk-55-dev-client',
  } as Extract<TelemetryEvent, { eventName: TEventName }>;
}
