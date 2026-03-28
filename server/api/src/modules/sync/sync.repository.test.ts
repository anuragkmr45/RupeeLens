import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

import { createSyncRepository } from './sync.repository.js';

describe('sync repository', () => {
  it('reloads persisted changes and cursor state from disk', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-sync-repo-'));
    const syncStoreFile = path.join(tempDir, 'sync-store.json');
    const repository = createSyncRepository({
      syncStoreFile,
    });

    try {
      repository.saveEntity({
        data: {
          amountMinor: 2500,
        },
        entityId: 'transaction-1',
        entityType: 'transaction',
        updatedAt: '2026-03-28T12:00:00.000Z' as IsoUtcDateTimeString,
        userId: 'user-1',
        version: 1,
      });
      repository.saveEntityChange({
        changeType: 'upsert',
        data: {
          amountMinor: 2500,
        },
        entityId: 'transaction-1',
        entityType: 'transaction',
        updatedAt: '2026-03-28T12:00:00.000Z' as IsoUtcDateTimeString,
        userId: 'user-1',
        version: 1,
      });
      repository.close();

      const reloadedRepository = createSyncRepository({
        syncStoreFile,
      });

      try {
        expect(reloadedRepository.getLatestCursor('user-1')).toBe('1');
        expect(reloadedRepository.findEntity('user-1', 'transaction', 'transaction-1')).toMatchObject({
          data: {
            amountMinor: 2500,
          },
          version: 1,
        });
        expect(reloadedRepository.listEntityChanges('user-1', '0', 10)).toMatchObject({
          changes: [
            {
              cursor: '1',
              entityId: 'transaction-1',
            },
          ],
          hasMore: false,
          latestCursor: '1',
        });
      } finally {
        reloadedRepository.close();
      }
    } finally {
      await rm(tempDir, {
        force: true,
        recursive: true,
      });
    }
  });
});
