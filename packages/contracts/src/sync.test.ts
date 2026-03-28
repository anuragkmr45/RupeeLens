import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';
import { describe, expect, it } from 'vitest';

import type {
  EntityChange,
  OutboxOperation,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from './sync.js';

describe('sync contract', () => {
  it('supports sync push request and response shapes', () => {
    const operation: OutboxOperation = {
      entityId: 'transaction-1',
      entityType: 'transaction',
      entityVersion: 1,
      occurredAt: '2026-03-28T12:00:00.000Z' as IsoUtcDateTimeString,
      opId: 'op-1',
      opType: 'upsert',
      payload: {
        amountMinor: 2500,
      },
    };
    const request: SyncPushRequest = {
      baseCursor: '3',
      deviceId: 'device-1',
      operations: [operation],
    };
    const response: SyncPushResponse = {
      accepted: [
        {
          entityId: 'transaction-1',
          entityType: 'transaction',
          opId: 'op-1',
          serverVersion: 1,
          status: 'accepted',
        },
      ],
      conflicts: [],
      newCursor: '4',
      rejected: [],
    };

    expect(request.operations[0]?.entityType).toBe('transaction');
    expect(response.accepted[0]?.serverVersion).toBe(1);
  });

  it('supports sync pull change shapes', () => {
    const change: EntityChange = {
      changeType: 'upsert',
      data: {
        amountMinor: 2500,
      },
      entityId: 'transaction-1',
      entityType: 'transaction',
      updatedAt: '2026-03-28T12:00:00.000Z' as IsoUtcDateTimeString,
      version: 1,
    };
    const response: SyncPullResponse = {
      changes: [change],
      cursor: '4',
      hasMore: false,
    };

    expect(response.changes[0]?.changeType).toBe('upsert');
    expect(response.hasMore).toBe(false);
  });
});
