import {
  TELEMETRY_EVENT_NAMES,
  TELEMETRY_SCHEMA_VERSION,
  type TelemetryEvent,
  type TelemetryEventName,
  type TelemetryIngestRequest,
} from '@upi-spend-tracker/contracts';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';
import type { FastifyInstance } from 'fastify';

import { SessionUnauthorizedError } from '../sessions/sessions.service.js';
import {
  TelemetryBadRequestError,
  type TelemetryService,
} from './telemetry.service.js';

export function registerTelemetryRoutes(
  app: FastifyInstance,
  service: TelemetryService,
) {
  app.post('/v1/telemetry/events', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const parsedBody = parseTelemetryIngestRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!parsedBody) {
      return reply.status(400).send(badRequest('Expected valid telemetry events.'));
    }

    try {
      return reply.status(202).send(service.ingestEvents(accessToken, parsedBody));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }

      if (error instanceof TelemetryBadRequestError) {
        return reply.status(400).send(badRequest(error.message));
      }

      throw error;
    }
  });

  app.get('/v1/telemetry/dashboard', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const lookbackHours = parseLookbackHours(
      request.query && isRecord(request.query) ? request.query.lookbackHours : undefined,
    );

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (lookbackHours === null) {
      return reply.status(400).send(badRequest('lookbackHours must be an integer between 1 and 168.'));
    }

    try {
      return reply.status(200).send(service.getOperationalDashboard(accessToken, lookbackHours ?? undefined));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }

      if (error instanceof TelemetryBadRequestError) {
        return reply.status(400).send(badRequest(error.message));
      }

      throw error;
    }
  });
}

function parseTelemetryIngestRequest(body: unknown): TelemetryIngestRequest | null {
  if (!isRecord(body) || body.schemaVersion !== TELEMETRY_SCHEMA_VERSION || !Array.isArray(body.events)) {
    return null;
  }

  const events: TelemetryEvent[] = [];

  for (const value of body.events) {
    const event = parseTelemetryEvent(value);

    if (!event) {
      return null;
    }

    events.push(event);
  }

  return events.length > 0
    ? {
        events,
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
      }
    : null;
}

function parseTelemetryEvent(value: unknown): TelemetryEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const eventName = parseEventName(value.eventName);

  if (eventName === null) {
    return null;
  }

  const appVersion = normalizeOptionalString(value.appVersion);
  const clientEventId = normalizeOptionalString(value.clientEventId);
  const occurredAt = parseIsoUtcDateTimeString(value.occurredAt);
  const platform = parsePlatform(value.platform);
  const rolloutChannel = parseRolloutChannel(value.rolloutChannel);
  const runtimeVersion = normalizeOptionalString(value.runtimeVersion);

  if (!appVersion || !clientEventId || !occurredAt || !platform || !rolloutChannel || !runtimeVersion || !isRecord(value.data)) {
    return null;
  }

  const data = value.data;
  const eventBase = {
    appVersion,
    clientEventId,
    occurredAt,
    platform,
    rolloutChannel,
    runtimeVersion,
  } as const;

  switch (eventName) {
    case 'onboarding_completed': {
      const syncMode = parseLocalSyncMode(data.syncMode);
      const selectedSourceAppCount = parseNonNegativeInteger(data.selectedSourceAppCount);

      if (syncMode === null || selectedSourceAppCount === null || typeof data.permissionGranted !== 'boolean') {
        return null;
      }

      return {
        ...eventBase,
        data: {
          permissionGranted: data.permissionGranted,
          selectedSourceAppCount,
          syncMode,
        },
        eventName,
      };
    }
    case 'notification_permission_denied': {
      const syncMode = parseLocalSyncMode(data.syncMode);
      const selectedSourceAppCount = parseNonNegativeInteger(data.selectedSourceAppCount);
      const source = data.source === 'onboarding' || data.source === 'settings' ? data.source : null;

      if (syncMode === null || selectedSourceAppCount === null || source === null) {
        return null;
      }

      return {
        ...eventBase,
        data: {
          selectedSourceAppCount,
          source,
          syncMode,
        },
        eventName,
      };
    }
    case 'capture_success': {
      const sourceAppId = parseSourceAppId(data.sourceAppId);
      const parserId = normalizeOptionalString(data.parserId);
      const parserVersion = normalizeOptionalString(data.parserVersion);

      if (sourceAppId === null || typeof data.parserFallback !== 'boolean') {
        return null;
      }

      return {
        ...eventBase,
        data: {
          parserFallback: data.parserFallback,
          ...(parserId ? { parserId } : {}),
          ...(parserVersion ? { parserVersion } : {}),
          sourceAppId,
        },
        eventName,
      };
    }
    case 'capture_failure': {
      const code = normalizeOptionalString(data.code);
      const sourceAppId = parseSourceAppId(data.sourceAppId);

      if (!code || sourceAppId === null) {
        return null;
      }

      return {
        ...eventBase,
        data: {
          code,
          sourceAppId,
        },
        eventName,
      };
    }
    case 'parser_fallback': {
      const fallbackParserId = normalizeOptionalString(data.fallbackParserId);
      const sourceAppId = parseSourceAppId(data.sourceAppId);

      if (!fallbackParserId || sourceAppId === null) {
        return null;
      }

      return {
        ...eventBase,
        data: {
          fallbackParserId,
          sourceAppId,
        },
        eventName,
      };
    }
    case 'classify_completed': {
      const durationMs = parseNonNegativeInteger(data.durationMs);
      const source =
        data.source === 'detail' ||
        data.source === 'home' ||
        data.source === 'inbox' ||
        data.source === 'native_capture'
          ? data.source
          : null;

      if (
        durationMs === null ||
        source === null ||
        typeof data.autoApplyRule !== 'boolean' ||
        typeof data.saveAsRule !== 'boolean'
      ) {
        return null;
      }

      return {
        ...eventBase,
        data: {
          autoApplyRule: data.autoApplyRule,
          durationMs,
          saveAsRule: data.saveAsRule,
          source,
        },
        eventName,
      };
    }
    case 'sync_error': {
      const code = normalizeOptionalString(data.code);
      const phase = data.phase === 'cycle' || data.phase === 'refresh' ? data.phase : null;
      const syncMode = parseSyncMode(data.syncMode);

      if (!code || phase === null || syncMode === null) {
        return null;
      }

      return {
        ...eventBase,
        data: {
          code,
          phase,
          syncMode,
        },
        eventName,
      };
    }
    case 'budget_alert_delivery': {
      const scope = parseBudgetScope(data.scope);
      const status = parseBudgetStatus(data.status);

      if (
        scope === null ||
        status === null ||
        typeof data.quietMode !== 'boolean' ||
        (data.thresholdPercent !== 50 && data.thresholdPercent !== 80 && data.thresholdPercent !== 100)
      ) {
        return null;
      }

      return {
        ...eventBase,
        data: {
          quietMode: data.quietMode,
          scope,
          status,
          thresholdPercent: data.thresholdPercent,
        },
        eventName,
      };
    }
    case 'app_runtime_error': {
      const code = normalizeOptionalString(data.code);
      const domain = parseRuntimeDomain(data.domain);

      if (!code || domain === null || typeof data.fatal !== 'boolean') {
        return null;
      }

      return {
        ...eventBase,
        data: {
          code,
          domain,
          fatal: data.fatal,
        },
        eventName,
      };
    }
    default:
      return null;
  }
}

function parseLookbackHours(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = normalizeOptionalString(value);

  if (!normalizedValue) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isInteger(parsedValue) ? parsedValue : null;
}

function parseBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim().length > 0 ? token.trim() : null;
}

function parseNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function parseEventName(value: unknown): TelemetryEventName | null {
  return typeof value === 'string' && TELEMETRY_EVENT_NAMES.includes(value as TelemetryEventName)
    ? (value as TelemetryEventName)
    : null;
}

function parseIsoUtcDateTimeString(value: unknown): IsoUtcDateTimeString | null {
  const normalizedValue = normalizeOptionalString(value);

  if (!normalizedValue || Number.isNaN(Date.parse(normalizedValue))) {
    return null;
  }

  return normalizedValue as IsoUtcDateTimeString;
}

function parsePlatform(value: unknown): 'android' | 'ios' | null {
  return value === 'android' || value === 'ios' ? value : null;
}

function parseRolloutChannel(value: unknown): 'internal' | 'beta' | 'production' | 'unknown' | null {
  return value === 'internal' || value === 'beta' || value === 'production' || value === 'unknown'
    ? value
    : null;
}

function parseSourceAppId(value: unknown): 'bhim' | 'google_pay' | 'paytm' | 'phonepe' | null {
  return value === 'bhim' || value === 'google_pay' || value === 'paytm' || value === 'phonepe'
    ? value
    : null;
}

function parseSyncMode(value: unknown): 'cloud_sync' | 'local_only' | 'sync_later' | null {
  return value === 'cloud_sync' || value === 'local_only' || value === 'sync_later' ? value : null;
}

function parseLocalSyncMode(value: unknown): 'local_only' | 'sync_later' | null {
  return value === 'local_only' || value === 'sync_later' ? value : null;
}

function parseBudgetScope(value: unknown): 'category' | 'item' | 'merchant' | 'overall' | null {
  return value === 'category' || value === 'item' || value === 'merchant' || value === 'overall'
    ? value
    : null;
}

function parseBudgetStatus(value: unknown): 'active' | 'quieted' | 'reviewed' | null {
  return value === 'active' || value === 'quieted' || value === 'reviewed' ? value : null;
}

function parseRuntimeDomain(
  value: unknown,
): 'bootstrap' | 'capture_import' | 'export' | 'global' | 'settings' | 'sync' | null {
  return value === 'bootstrap' ||
    value === 'capture_import' ||
    value === 'export' ||
    value === 'global' ||
    value === 'settings' ||
    value === 'sync'
    ? value
    : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function badRequest(message: string) {
  return {
    error: 'bad_request',
    message,
  };
}

function unauthorized(message: string) {
  return {
    error: 'unauthorized',
    message,
  };
}
