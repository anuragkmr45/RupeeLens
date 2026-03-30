import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import type { TelemetryEvent } from '@upi-spend-tracker/contracts';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

export type StoredTelemetryEvent = TelemetryEvent & {
  deviceId: string;
  receivedAt: IsoUtcDateTimeString;
  userId: string;
};

interface SerializedTelemetryStoreState {
  events: StoredTelemetryEvent[];
  version: 1;
}

export interface CreateTelemetryRepositoryOptions {
  telemetryStoreFile: string;
}

export interface TelemetryRepository {
  appendEvents(events: StoredTelemetryEvent[]): {
    acceptedCount: number;
    duplicateCount: number;
  };
  close(): void;
  listEvents(): StoredTelemetryEvent[];
}

const TELEMETRY_STORE_VERSION = 1;

function cloneTelemetryEvent(event: StoredTelemetryEvent): StoredTelemetryEvent {
  return {
    ...event,
    data: { ...event.data },
  } as StoredTelemetryEvent;
}

function loadState(telemetryStoreFile: string): SerializedTelemetryStoreState {
  try {
    const parsed = JSON.parse(readFileSync(telemetryStoreFile, 'utf8')) as Partial<SerializedTelemetryStoreState>;

    if (parsed.version !== TELEMETRY_STORE_VERSION) {
      throw new Error(
        `Unsupported telemetry store version in ${telemetryStoreFile}: ${String(parsed.version)}`,
      );
    }

    return {
      events: Array.isArray(parsed.events) ? parsed.events.map(cloneTelemetryEvent) : [],
      version: TELEMETRY_STORE_VERSION,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        events: [],
        version: TELEMETRY_STORE_VERSION,
      };
    }

    throw error;
  }
}

function writeState(
  telemetryStoreFile: string,
  state: SerializedTelemetryStoreState,
): void {
  mkdirSync(path.dirname(telemetryStoreFile), {
    recursive: true,
  });

  const tempFile = `${telemetryStoreFile}.${process.pid}.tmp`;

  try {
    writeFileSync(tempFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    renameSync(tempFile, telemetryStoreFile);
  } catch (error) {
    try {
      unlinkSync(tempFile);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw cleanupError;
      }
    }

    throw error;
  }
}

export function createTelemetryRepository({
  telemetryStoreFile,
}: CreateTelemetryRepositoryOptions): TelemetryRepository {
  const initialState = loadState(telemetryStoreFile);
  const events = new Map(
    initialState.events.map((event) => [createEventKey(event), cloneTelemetryEvent(event)]),
  );

  function persist(): void {
    writeState(telemetryStoreFile, {
      events: [...events.values()]
        .map(cloneTelemetryEvent)
        .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)),
      version: TELEMETRY_STORE_VERSION,
    });
  }

  return {
    appendEvents(nextEvents) {
      let acceptedCount = 0;
      let duplicateCount = 0;

      for (const event of nextEvents) {
        const eventKey = createEventKey(event);

        if (events.has(eventKey)) {
          duplicateCount += 1;
          continue;
        }

        events.set(eventKey, cloneTelemetryEvent(event));
        acceptedCount += 1;
      }

      if (acceptedCount > 0) {
        persist();
      }

      return {
        acceptedCount,
        duplicateCount,
      };
    },
    close() {
      persist();
    },
    listEvents() {
      return [...events.values()].map(cloneTelemetryEvent);
    },
  };
}

function createEventKey(
  event: Pick<StoredTelemetryEvent, 'clientEventId' | 'deviceId' | 'userId'>,
): string {
  return `${event.userId}:${event.deviceId}:${event.clientEventId}`;
}
