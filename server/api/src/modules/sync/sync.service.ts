import {
  createHash,
} from 'node:crypto';

import type {
  ConflictRecord,
  EntityChange,
  OperationAck,
  OperationRejection,
  OutboxOperation,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from '@upi-spend-tracker/contracts';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

import {
  SessionUnauthorizedError,
  type SessionService,
} from '../sessions/sessions.service.js';
import type { SyncRepository } from './sync.repository.js';

const DEFAULT_PULL_LIMIT = 250;
const MAX_PULL_LIMIT = 1000;

export interface SyncServiceDependencies {
  now?: () => string;
  repository: SyncRepository;
  sessionService: SessionService;
}

export interface SyncService {
  pull(accessToken: string, cursor: string | null, limit?: number): SyncPullResponse;
  push(accessToken: string, idempotencyKey: string, request: SyncPushRequest): SyncPushResponse;
}

export class SyncIdempotencyConflictError extends Error {
  constructor(message = 'The Idempotency-Key has already been used with a different sync payload.') {
    super(message);
    this.name = 'SyncIdempotencyConflictError';
  }
}

export class SyncBadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncBadRequestError';
  }
}

export function createSyncService({
  now = () => new Date().toISOString(),
  repository,
  sessionService,
}: SyncServiceDependencies): SyncService {
  function ensureDeviceMatch(accessToken: string, deviceId: string) {
    const session = sessionService.authenticateSession(accessToken);

    if (session.deviceId !== deviceId) {
      throw new SessionUnauthorizedError('The sync request deviceId does not match the authenticated session.');
    }

    return session;
  }

  function createConflict(
    operation: OutboxOperation,
    serverVersion: number,
    serverState: Record<string, unknown>,
    conflictReason: string,
  ): ConflictRecord {
    return {
      clientVersion: operation.entityVersion,
      conflictReason,
      entityId: operation.entityId,
      entityType: operation.entityType,
      serverState,
      serverVersion,
    };
  }

  function createRejection(
    opId: string,
    code: string,
    message: string,
    field?: string,
  ): OperationRejection {
    return {
      code,
      message,
      opId,
      ...(field ? { fieldErrors: [{ field, message }] } : {}),
    };
  }

  return {
    pull(accessToken, cursor, limit = DEFAULT_PULL_LIMIT) {
      const session = sessionService.authenticateSession(accessToken);

      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PULL_LIMIT) {
        throw new SyncBadRequestError(`limit must be an integer between 1 and ${MAX_PULL_LIMIT}.`);
      }

      const { changes, hasMore, latestCursor } = repository.listEntityChanges(
        session.userId,
        cursor,
        limit,
      );
      const nextCursor = changes.at(-1)?.cursor ?? cursor ?? latestCursor;

      return {
        changes: changes.map<EntityChange>((change) => ({
          changeType: change.changeType,
          data: { ...change.data },
          entityId: change.entityId,
          entityType: change.entityType,
          version: change.version,
          ...(change.updatedAt ? { updatedAt: change.updatedAt } : {}),
        })),
        cursor: nextCursor,
        hasMore,
      };
    },
    push(accessToken, idempotencyKey, request) {
      const timestamp = toIsoUtcDateTimeString(now());
      const session = ensureDeviceMatch(accessToken, request.deviceId);
      const requestDigest = createDigest(
        JSON.stringify({
          baseCursor: request.baseCursor ?? null,
          deviceId: request.deviceId,
          operations: request.operations,
        }),
      );
      const replayRecord = repository.findIdempotencyRecord(
        session.userId,
        request.deviceId,
        idempotencyKey,
      );

      if (replayRecord) {
        if (replayRecord.requestDigest !== requestDigest) {
          throw new SyncIdempotencyConflictError();
        }

        return {
          ...replayRecord.response,
          accepted: replayRecord.response.accepted.map((record) => ({
            ...record,
            status: 'idempotent_replay',
          })),
        };
      }

      const accepted: OperationAck[] = [];
      const rejected: OperationRejection[] = [];
      const conflicts: ConflictRecord[] = [];

      for (const operation of request.operations) {
        const appliedOperation = repository.findAppliedOperation(session.userId, operation.opId);

        if (appliedOperation) {
          accepted.push({
            entityId: appliedOperation.entityId,
            entityType: appliedOperation.entityType,
            opId: appliedOperation.opId,
            serverVersion: appliedOperation.serverVersion,
            status: 'idempotent_replay',
          });
          continue;
        }

        if (Object.keys(operation.payload).length === 0 && operation.opType === 'upsert') {
          rejected.push(
            createRejection(
              operation.opId,
              'invalid_payload',
              'Upsert operations require a non-empty payload object.',
              'payload',
            ),
          );
          continue;
        }

        const currentEntity = repository.findEntity(
          session.userId,
          operation.entityType,
          operation.entityId,
        );
        const currentVersion = currentEntity?.version ?? 0;
        const operationTimestamp = operation.occurredAt ?? timestamp;

        if (operation.opType === 'upsert') {
          if (operation.entityVersion !== currentVersion + 1) {
            conflicts.push(
              createConflict(
                operation,
                currentVersion,
                currentEntity?.data ?? {},
                currentEntity
                  ? 'version_mismatch'
                  : 'missing_server_base',
              ),
            );
            continue;
          }

          repository.saveEntity({
            data: { ...operation.payload },
            entityId: operation.entityId,
            entityType: operation.entityType,
            updatedAt: operationTimestamp,
            userId: session.userId,
            version: operation.entityVersion,
          });
          repository.saveEntityChange({
            changeType: 'upsert',
            data: { ...operation.payload },
            entityId: operation.entityId,
            entityType: operation.entityType,
            updatedAt: operationTimestamp,
            userId: session.userId,
            version: operation.entityVersion,
          });
          repository.saveAppliedOperation({
            entityId: operation.entityId,
            entityType: operation.entityType,
            opId: operation.opId,
            serverVersion: operation.entityVersion,
            status: 'accepted',
            userId: session.userId,
          });
          accepted.push({
            entityId: operation.entityId,
            entityType: operation.entityType,
            opId: operation.opId,
            serverVersion: operation.entityVersion,
            status: 'accepted',
          });
          continue;
        }

        if (!currentEntity) {
          repository.saveAppliedOperation({
            entityId: operation.entityId,
            entityType: operation.entityType,
            opId: operation.opId,
            serverVersion: operation.entityVersion,
            status: 'accepted',
            userId: session.userId,
          });
          accepted.push({
            entityId: operation.entityId,
            entityType: operation.entityType,
            opId: operation.opId,
            serverVersion: operation.entityVersion,
            status: 'accepted',
          });
          continue;
        }

        if (operation.entityVersion !== currentVersion + 1) {
          conflicts.push(
            createConflict(
              operation,
              currentVersion,
              currentEntity.data,
              'version_mismatch',
            ),
          );
          continue;
        }

        repository.saveEntity({
          data: {},
          entityId: operation.entityId,
          entityType: operation.entityType,
          updatedAt: operationTimestamp,
          userId: session.userId,
          version: operation.entityVersion,
        });
        repository.saveEntityChange({
          changeType: 'delete',
          data: {},
          entityId: operation.entityId,
          entityType: operation.entityType,
          updatedAt: operationTimestamp,
          userId: session.userId,
          version: operation.entityVersion,
        });
        repository.saveAppliedOperation({
          entityId: operation.entityId,
          entityType: operation.entityType,
          opId: operation.opId,
          serverVersion: operation.entityVersion,
          status: 'accepted',
          userId: session.userId,
        });
        accepted.push({
          entityId: operation.entityId,
          entityType: operation.entityType,
          opId: operation.opId,
          serverVersion: operation.entityVersion,
          status: 'accepted',
        });
      }

      const response: SyncPushResponse = {
        accepted,
        conflicts,
        newCursor: repository.getLatestCursor(session.userId),
        rejected,
      };

      repository.saveIdempotencyRecord({
        createdAt: timestamp,
        deviceId: request.deviceId,
        idempotencyKey,
        requestDigest,
        response,
        userId: session.userId,
      });

      return response;
    },
  };
}

function createDigest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function toIsoUtcDateTimeString(value: string): IsoUtcDateTimeString {
  return value as IsoUtcDateTimeString;
}
