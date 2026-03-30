import type { StoredSyncCredentials } from '../src/features/sync/session';
import {
  clearQueuedTelemetryEvents,
  enqueueTelemetryEvent,
  flushTelemetryEvents,
  installGlobalTelemetryErrorHandler,
  loadQueuedTelemetryEvents,
} from '../src/features/telemetry/runtime';
import {
  createOnboardingCompletedTelemetryEvent,
  createRuntimeErrorTelemetryEvent,
} from '../src/features/telemetry/events';

const mockStorageState = new Map<string, string>();

jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItem: jest.fn(async (key: string) => mockStorageState.get(key) ?? null),
    removeItem: jest.fn(async (key: string) => {
      mockStorageState.delete(key);
    }),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorageState.set(key, value);
    }),
  },
}));

describe('telemetry runtime', () => {
  beforeEach(() => {
    mockStorageState.clear();
  });

  it('queues telemetry events locally until a later flush', async () => {
    await enqueueTelemetryEvent(
      createOnboardingCompletedTelemetryEvent({
        permissionGranted: false,
        rolloutChannel: 'beta',
        selectedSourceAppCount: 2,
        syncMode: 'local_only',
      }),
    );

    await expect(loadQueuedTelemetryEvents()).resolves.toEqual([
      expect.objectContaining({
        eventName: 'onboarding_completed',
      }),
    ]);
  });

  it('flushes queued telemetry events through the authenticated telemetry API', async () => {
    await enqueueTelemetryEvent(
      createOnboardingCompletedTelemetryEvent({
        permissionGranted: true,
        rolloutChannel: 'beta',
        selectedSourceAppCount: 3,
        syncMode: 'sync_later',
      }),
    );

    const fetchImplementation = jest.fn().mockResolvedValue({
      json: async () => ({
        acceptedCount: 1,
        duplicateCount: 0,
        receivedAt: '2026-03-30T10:30:00.000Z',
        schemaVersion: 1,
      }),
      ok: true,
      status: 202,
    });
    const credentials: Pick<StoredSyncCredentials, 'accessToken' | 'apiBaseUrl'> = {
      accessToken: 'access-token',
      apiBaseUrl: 'http://localhost:3000',
    };

    await expect(
      flushTelemetryEvents({
        credentials,
        fetchImplementation: fetchImplementation as unknown as typeof globalThis.fetch,
      }),
    ).resolves.toEqual({
      acceptedCount: 1,
      duplicateCount: 0,
      remainingCount: 0,
    });
    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://localhost:3000/v1/telemetry/events',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    await expect(loadQueuedTelemetryEvents()).resolves.toEqual([]);
  });

  it('wraps the global error handler when ErrorUtils is available', () => {
    const previousHandler = jest.fn();
    const setGlobalHandler = jest.fn();
    const onError = jest.fn();

    (globalThis as { ErrorUtils?: unknown }).ErrorUtils = {
      getGlobalHandler: () => previousHandler,
      setGlobalHandler,
    };

    const cleanup = installGlobalTelemetryErrorHandler(onError);
    const wrappedHandler = setGlobalHandler.mock.calls[0]?.[0] as
      | ((error: unknown, isFatal?: boolean) => void)
      | undefined;

    expect(typeof wrappedHandler).toBe('function');

    wrappedHandler?.(
      createRuntimeErrorTelemetryEvent({
        code: 'type_error',
        domain: 'global',
        fatal: true,
        rolloutChannel: 'beta',
      }),
      true,
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'app_runtime_error',
      }),
      true,
    );
    expect(previousHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'app_runtime_error',
      }),
      true,
    );

    cleanup();
    expect(setGlobalHandler).toHaveBeenLastCalledWith(previousHandler);
    delete (globalThis as { ErrorUtils?: unknown }).ErrorUtils;
  });

  it('clears the queued telemetry state when requested', async () => {
    await enqueueTelemetryEvent(
      createOnboardingCompletedTelemetryEvent({
        permissionGranted: true,
        rolloutChannel: 'beta',
        selectedSourceAppCount: 1,
        syncMode: 'sync_later',
      }),
    );

    await clearQueuedTelemetryEvents();

    await expect(loadQueuedTelemetryEvents()).resolves.toEqual([]);
  });
});
