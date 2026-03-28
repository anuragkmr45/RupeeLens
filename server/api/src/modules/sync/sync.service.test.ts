import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createSessionRepository } from '../sessions/sessions.repository.js';
import { createSessionService } from '../sessions/sessions.service.js';
import { createSyncRepository } from './sync.repository.js';
import {
  createSyncService,
  SyncIdempotencyConflictError,
} from './sync.service.js';

describe('sync service', () => {
  it('accepts push operations, rejects version conflicts, and supports pull cursors', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-sync-service-'));
    const sessionRepository = createSessionRepository({
      sessionStoreFile: path.join(tempDir, 'sessions-store.json'),
    });
    const sessionService = createSessionService({
      now: () => '2026-03-28T10:00:00.000Z',
      randomToken: (prefix) => `${prefix}_1`,
      randomUuid: (() => {
        let index = 0;
        return () => `uuid_${++index}`;
      })(),
      repository: sessionRepository,
    });
    const syncRepository = createSyncRepository({
      syncStoreFile: path.join(tempDir, 'sync-store.json'),
    });
    const syncService = createSyncService({
      now: () => '2026-03-28T10:01:00.000Z',
      repository: syncRepository,
      sessionService,
    });

    try {
      const session = sessionService.createGuestSession({
        deviceName: 'Primary Android',
        platform: 'android',
      });
      const firstPush = syncService.push(session.accessToken, 'idem-1', {
        deviceId: session.deviceId,
        operations: [
          {
            entityId: 'transaction-1',
            entityType: 'transaction',
            entityVersion: 1,
            opId: 'op-1',
            opType: 'upsert',
            payload: {
              amountMinor: 2500,
            },
          },
        ],
      });
      const conflictingPush = syncService.push(session.accessToken, 'idem-2', {
        deviceId: session.deviceId,
        operations: [
          {
            entityId: 'transaction-1',
            entityType: 'transaction',
            entityVersion: 1,
            opId: 'op-2',
            opType: 'upsert',
            payload: {
              amountMinor: 2600,
            },
          },
        ],
      });
      const pull = syncService.pull(session.accessToken, null, 10);

      expect(firstPush.accepted).toMatchObject([
        {
          entityId: 'transaction-1',
          opId: 'op-1',
          serverVersion: 1,
          status: 'accepted',
        },
      ]);
      expect(firstPush.newCursor).toBe('1');
      expect(conflictingPush.conflicts).toMatchObject([
        {
          clientVersion: 1,
          conflictReason: 'version_mismatch',
          entityId: 'transaction-1',
          serverVersion: 1,
        },
      ]);
      expect(pull).toMatchObject({
        cursor: '1',
        hasMore: false,
      });
      expect(pull.changes).toMatchObject([
        {
          changeType: 'upsert',
          entityId: 'transaction-1',
          entityType: 'transaction',
          version: 1,
        },
      ]);
    } finally {
      sessionRepository.close();
      syncRepository.close();
      await rm(tempDir, {
        force: true,
        recursive: true,
      });
    }
  });

  it('replays identical idempotency keys and rejects mismatched payload reuse', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-sync-service-'));
    const sessionService = createSessionService({
      now: () => '2026-03-28T10:00:00.000Z',
      randomToken: (prefix) => `${prefix}_1`,
      randomUuid: (() => {
        let index = 0;
        return () => `uuid_${++index}`;
      })(),
      repository: createSessionRepository({
        sessionStoreFile: path.join(tempDir, 'sessions-store.json'),
      }),
    });
    const syncService = createSyncService({
      now: () => '2026-03-28T10:01:00.000Z',
      repository: createSyncRepository({
        syncStoreFile: path.join(tempDir, 'sync-store.json'),
      }),
      sessionService,
    });

    try {
      const session = sessionService.createGuestSession({
        deviceName: 'Primary Android',
        platform: 'android',
      });
      const firstResponse = syncService.push(session.accessToken, 'idem-1', {
        deviceId: session.deviceId,
        operations: [
          {
            entityId: 'category-1',
            entityType: 'category',
            entityVersion: 1,
            opId: 'op-1',
            opType: 'upsert',
            payload: {
              label: 'Food',
            },
          },
        ],
      });
      const replayResponse = syncService.push(session.accessToken, 'idem-1', {
        deviceId: session.deviceId,
        operations: [
          {
            entityId: 'category-1',
            entityType: 'category',
            entityVersion: 1,
            opId: 'op-1',
            opType: 'upsert',
            payload: {
              label: 'Food',
            },
          },
        ],
      });

      expect(firstResponse.accepted[0]?.status).toBe('accepted');
      expect(replayResponse.accepted[0]?.status).toBe('idempotent_replay');
      expect(() =>
        syncService.push(session.accessToken, 'idem-1', {
          deviceId: session.deviceId,
          operations: [
            {
              entityId: 'category-1',
              entityType: 'category',
              entityVersion: 1,
              opId: 'op-1',
              opType: 'upsert',
              payload: {
                label: 'Transport',
              },
            },
          ],
        }),
      ).toThrow(SyncIdempotencyConflictError);
    } finally {
      await rm(tempDir, {
        force: true,
        recursive: true,
      });
    }
  });
});
