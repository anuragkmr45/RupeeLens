import type {
  OutboxOperation,
  SyncEntityType,
  SyncOperationType,
  SyncPushRequest,
} from '@upi-spend-tracker/contracts';
import type { FastifyInstance } from 'fastify';

import {
  SessionUnauthorizedError,
} from '../sessions/sessions.service.js';
import {
  SyncBadRequestError,
  SyncIdempotencyConflictError,
  type SyncService,
} from './sync.service.js';

const VALID_ENTITY_TYPES: readonly SyncEntityType[] = [
  'transaction',
  'transaction_item',
  'category',
  'merchant',
  'merchant_alias',
  'rule',
  'budget',
  'budget_scope',
];

const VALID_OPERATION_TYPES: readonly SyncOperationType[] = ['upsert', 'delete'];

export function registerSyncRoutes(app: FastifyInstance, service: SyncService) {
  app.post('/v1/sync/push', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const idempotencyKey = normalizeOptionalString(request.headers['idempotency-key']);
    const parsedBody = parseSyncPushRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!idempotencyKey) {
      return reply.status(400).send(badRequest('Missing Idempotency-Key header.'));
    }

    if (!parsedBody) {
      return reply.status(400).send(badRequest('Expected valid sync push request values.'));
    }

    try {
      return reply.status(200).send(service.push(accessToken, idempotencyKey, parsedBody));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }

      if (error instanceof SyncIdempotencyConflictError) {
        return reply.status(409).send(conflict(error.message));
      }

      if (error instanceof SyncBadRequestError) {
        return reply.status(400).send(badRequest(error.message));
      }

      throw error;
    }
  });

  app.get('/v1/sync/pull', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const cursor = normalizeOptionalString(request.query && isRecord(request.query) ? request.query.cursor : undefined);
    const limit = parseLimit(request.query && isRecord(request.query) ? request.query.limit : undefined);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (limit === null) {
      return reply.status(400).send(badRequest('limit must be an integer between 1 and 1000.'));
    }

    try {
      return reply.status(200).send(service.pull(accessToken, cursor ?? null, limit ?? undefined));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }

      if (error instanceof SyncBadRequestError) {
        return reply.status(400).send(badRequest(error.message));
      }

      throw error;
    }
  });
}

function parseSyncPushRequest(body: unknown): SyncPushRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const deviceId = normalizeOptionalString(body.deviceId);
  const operations = parseOperations(body.operations);
  const baseCursor = normalizeOptionalString(body.baseCursor);

  if (!deviceId || operations === null || operations.length === 0) {
    return null;
  }

  return {
    deviceId,
    operations,
    ...(baseCursor ? { baseCursor } : {}),
  };
}

function parseOperations(value: unknown): OutboxOperation[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const operations: OutboxOperation[] = [];

  for (const entry of value) {
    const operation = parseOperation(entry);

    if (!operation) {
      return null;
    }

    operations.push(operation);
  }

  return operations;
}

function parseOperation(value: unknown): OutboxOperation | null {
  if (!isRecord(value)) {
    return null;
  }

  const entityId = normalizeOptionalString(value.entityId);
  const entityType = parseEntityType(value.entityType);
  const opId = normalizeOptionalString(value.opId);
  const opType = parseOperationType(value.opType);
  const occurredAt = normalizeOptionalString(value.occurredAt);
  const entityVersion = parseEntityVersion(value.entityVersion);

  if (
    !entityId ||
    !entityType ||
    !opId ||
    !opType ||
    entityVersion === null ||
    !isRecord(value.payload)
  ) {
    return null;
  }

  return {
    entityId,
    entityType,
    entityVersion,
    opId,
    opType,
    payload: { ...value.payload },
    ...(occurredAt
      ? { occurredAt: occurredAt as NonNullable<OutboxOperation['occurredAt']> }
      : {}),
  };
}

function parseEntityType(value: unknown): SyncEntityType | null {
  return typeof value === 'string' && VALID_ENTITY_TYPES.includes(value as SyncEntityType)
    ? (value as SyncEntityType)
    : null;
}

function parseOperationType(value: unknown): SyncOperationType | null {
  return typeof value === 'string' && VALID_OPERATION_TYPES.includes(value as SyncOperationType)
    ? (value as SyncOperationType)
    : null;
}

function parseEntityVersion(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

function parseLimit(value: unknown): number | null | undefined {
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

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function badRequest(message: string) {
  return {
    error: 'Bad Request',
    message,
    statusCode: 400,
  };
}

function conflict(message: string) {
  return {
    error: 'Conflict',
    message,
    statusCode: 409,
  };
}

function unauthorized(message: string) {
  return {
    error: 'Unauthorized',
    message,
    statusCode: 401,
  };
}
