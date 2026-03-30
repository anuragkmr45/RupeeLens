import type {
  TelemetryEvent,
  TelemetryIngestRequest,
  TelemetryIngestResponse,
} from '@upi-spend-tracker/contracts';
import { TELEMETRY_SCHEMA_VERSION } from '@upi-spend-tracker/contracts';
import { Storage } from 'expo-sqlite/kv-store';

import { resolveBootstrapBaseUrl } from '../bootstrap-config/runtime-config';
import type { StoredSyncCredentials } from '../sync/session';
import { normalizeTrustedApiBaseUrl } from '../sync/transport-policy';

const TELEMETRY_STORAGE_KEY = 'telemetry_event_queue_v1';
const MAX_QUEUED_TELEMETRY_EVENTS = 200;
const DEFAULT_FLUSH_BATCH_SIZE = 50;

interface PersistedTelemetryQueue {
  events: TelemetryEvent[];
  version: 1;
}

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

interface ErrorUtilsShape {
  getGlobalHandler?: () => GlobalErrorHandler | undefined;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
}

export interface FlushTelemetryEventsResult {
  acceptedCount: number;
  duplicateCount: number;
  remainingCount: number;
}

let queueOperationPromise: Promise<void> = Promise.resolve();

export async function clearQueuedTelemetryEvents(): Promise<void> {
  await runSerialized(async () => {
    await Storage.removeItem(TELEMETRY_STORAGE_KEY);
  });
}

export async function loadQueuedTelemetryEvents(): Promise<TelemetryEvent[]> {
  const queue = await readTelemetryQueue();
  return queue.events.map(cloneTelemetryEvent);
}

export async function enqueueTelemetryEvent(event: TelemetryEvent): Promise<number> {
  return runSerialized(async () => {
    const queue = await readTelemetryQueue();
    const nextEvents = [...queue.events, cloneTelemetryEvent(event)].slice(
      -MAX_QUEUED_TELEMETRY_EVENTS,
    );

    await writeTelemetryQueue({
      events: nextEvents,
      version: 1,
    });

    return nextEvents.length;
  });
}

export async function flushTelemetryEvents({
  batchSize = DEFAULT_FLUSH_BATCH_SIZE,
  credentials,
  fetchImplementation = globalThis.fetch,
}: {
  batchSize?: number;
  credentials: Pick<StoredSyncCredentials, 'accessToken' | 'apiBaseUrl'> | null;
  fetchImplementation?: typeof globalThis.fetch;
}): Promise<FlushTelemetryEventsResult> {
  return runSerialized(async () => {
    const queue = await readTelemetryQueue();

    if (
      queue.events.length === 0 ||
      !credentials?.accessToken ||
      typeof fetchImplementation !== 'function'
    ) {
      return {
        acceptedCount: 0,
        duplicateCount: 0,
        remainingCount: queue.events.length,
      };
    }

    const batch = queue.events.slice(0, batchSize);
    const requestBody: TelemetryIngestRequest = {
      events: batch,
      schemaVersion: TELEMETRY_SCHEMA_VERSION,
    };
    const response = await fetchImplementation(
      new URL(
        '/v1/telemetry/events',
        normalizeTrustedApiBaseUrl(
          credentials.apiBaseUrl?.trim() || resolveBootstrapBaseUrl('android'),
        ),
      ).toString(),
      {
        body: JSON.stringify(requestBody),
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${credentials.accessToken}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      },
    );
    const payload = (await response.json()) as Partial<TelemetryIngestResponse>;

    if (!response.ok || !isTelemetryIngestResponse(payload)) {
      throw new Error(`Telemetry ingest failed with ${response.status}.`);
    }

    const remainingEvents = queue.events.slice(batch.length);

    await writeTelemetryQueue({
      events: remainingEvents,
      version: 1,
    });

    return {
      acceptedCount: payload.acceptedCount,
      duplicateCount: payload.duplicateCount,
      remainingCount: remainingEvents.length,
    };
  });
}

export function installGlobalTelemetryErrorHandler(
  onError: (error: unknown, isFatal: boolean) => void,
): () => void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  const getGlobalHandler = errorUtils?.getGlobalHandler;
  const setGlobalHandler = errorUtils?.setGlobalHandler;

  if (
    !getGlobalHandler ||
    !setGlobalHandler
  ) {
    return () => undefined;
  }

  const previousHandler = getGlobalHandler();
  const nextHandler: GlobalErrorHandler = (error, isFatal = false) => {
    onError(error, isFatal);
    previousHandler?.(error, isFatal);
  };

  setGlobalHandler(nextHandler);

  return () => {
    if (previousHandler) {
      setGlobalHandler(previousHandler);
    }
  };
}

async function readTelemetryQueue(): Promise<PersistedTelemetryQueue> {
  const storedValue = await Storage.getItem(TELEMETRY_STORAGE_KEY);

  if (!storedValue) {
    return {
      events: [],
      version: 1,
    };
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<PersistedTelemetryQueue>;

    return {
      events: Array.isArray(parsed.events)
        ? parsed.events.map(cloneTelemetryEvent)
        : [],
      version: 1,
    };
  } catch {
    return {
      events: [],
      version: 1,
    };
  }
}

async function writeTelemetryQueue(queue: PersistedTelemetryQueue): Promise<void> {
  await Storage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(queue));
}

function cloneTelemetryEvent(event: TelemetryEvent): TelemetryEvent {
  return {
    ...event,
    data: { ...event.data },
  } as TelemetryEvent;
}

function isTelemetryIngestResponse(
  payload: Partial<TelemetryIngestResponse>,
): payload is TelemetryIngestResponse {
  return (
    typeof payload.acceptedCount === 'number' &&
    typeof payload.duplicateCount === 'number' &&
    typeof payload.receivedAt === 'string' &&
    payload.schemaVersion === TELEMETRY_SCHEMA_VERSION
  );
}

function runSerialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = queueOperationPromise.then(operation, operation);

  queueOperationPromise = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}
