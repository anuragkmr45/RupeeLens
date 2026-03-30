import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

import {
  TELEMETRY_SCHEMA_VERSION,
  type TelemetryEvent,
  type TelemetryEventName,
} from '@upi-spend-tracker/contracts';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';

function createTempStores() {
  const baseDir = mkdtempSync(path.join(tmpdir(), 'rupeelens-telemetry-'));

  return {
    domainStoreFile: path.join(baseDir, 'domain.json'),
    sessionStoreFile: path.join(baseDir, 'sessions.json'),
    syncStoreFile: path.join(baseDir, 'sync.json'),
    telemetryStoreFile: path.join(baseDir, 'telemetry.json'),
  };
}

async function createGuestAccessToken(app: ReturnType<typeof buildApp>) {
  const response = await app.inject({
    method: 'POST',
    payload: {
      deviceName: 'Test Pixel',
      platform: 'android',
      runtimeVersion: 'expo-sdk-55-dev-client',
    },
    url: '/v1/sessions/guest',
  });

  expect(response.statusCode).toBe(201);
  return response.json().accessToken as string;
}

describe('telemetry routes', () => {
  const apps: ReturnType<typeof buildApp>[] = [];

  afterEach(async () => {
    await Promise.all(
      apps.splice(0, apps.length).map(async (app) => {
        await app.close();
      }),
    );
  });

  it('accepts telemetry events and returns an authenticated operational dashboard', async () => {
    const stores = createTempStores();
    const app = buildApp(stores);
    apps.push(app);
    await app.ready();

    const accessToken = await createGuestAccessToken(app);
    const authorization = `Bearer ${accessToken}`;

    const ingestResponse = await app.inject({
      headers: { authorization },
      method: 'POST',
      payload: {
        events: [
          createTelemetryEvent('onboarding_completed', {
            data: {
              permissionGranted: false,
              selectedSourceAppCount: 2,
              syncMode: 'local_only',
            },
            id: 'onboarding_1',
            occurredAt: '2026-03-30T10:00:00.000Z',
          }),
          createTelemetryEvent('notification_permission_denied', {
            data: {
              selectedSourceAppCount: 2,
              source: 'onboarding',
              syncMode: 'local_only',
            },
            id: 'permission_1',
            occurredAt: '2026-03-30T10:01:00.000Z',
          }),
          createTelemetryEvent('sync_error', {
            data: {
              code: 'sync_request_failed',
              phase: 'cycle',
              syncMode: 'cloud_sync',
            },
            id: 'sync_1',
            occurredAt: '2026-03-30T10:02:00.000Z',
          }),
        ],
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
      },
      url: '/v1/telemetry/events',
    });
    const dashboardResponse = await app.inject({
      headers: { authorization },
      method: 'GET',
      url: '/v1/telemetry/dashboard?lookbackHours=24',
    });

    expect(ingestResponse.statusCode).toBe(202);
    expect(ingestResponse.json()).toMatchObject({
      acceptedCount: 3,
      duplicateCount: 0,
      schemaVersion: TELEMETRY_SCHEMA_VERSION,
    });
    expect(dashboardResponse.statusCode).toBe(200);
    expect(dashboardResponse.json()).toMatchObject({
      funnels: {
        onboardingCompletedCount: 1,
        permissionDeniedCount: 1,
      },
      schemaVersion: TELEMETRY_SCHEMA_VERSION,
      sync: {
        affectedDeviceCount: 1,
        errorCount: 1,
      },
      totals: {
        deviceCount: 1,
        eventCount: 3,
        userCount: 1,
      },
    });
  });

  it('rejects invalid telemetry payloads', async () => {
    const stores = createTempStores();
    const app = buildApp(stores);
    apps.push(app);
    await app.ready();

    const accessToken = await createGuestAccessToken(app);
    const authorization = `Bearer ${accessToken}`;
    const response = await app.inject({
      headers: { authorization },
      method: 'POST',
      payload: {
        events: [
          {
            appVersion: '1.0.0',
            clientEventId: 'bad_1',
            data: {
              permissionGranted: true,
            },
            eventName: 'onboarding_completed',
            occurredAt: '2026-03-30T10:00:00.000Z',
            platform: 'android',
            rolloutChannel: 'beta',
            runtimeVersion: 'expo-sdk-55-dev-client',
          },
        ],
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
      },
      url: '/v1/telemetry/events',
    });

    expect(response.statusCode).toBe(400);
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
