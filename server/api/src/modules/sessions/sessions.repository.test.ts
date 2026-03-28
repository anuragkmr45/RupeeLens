import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

import { createSessionRepository } from './sessions.repository.js';

describe('sessions repository', () => {
  it('reloads persisted session state from disk', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-repository-store-'));
    const sessionStoreFile = path.join(tempDir, 'sessions-store.json');
    const timestamp = '2026-03-28T10:00:00.000Z' as IsoUtcDateTimeString;
    const repository = createSessionRepository({
      sessionStoreFile,
    });

    try {
      repository.createUser({
        createdAt: timestamp,
        id: 'user-1',
        syncMode: 'cloud_sync',
      });
      repository.createDevice({
        createdAt: timestamp,
        deviceId: 'device-1',
        deviceName: 'Primary device',
        platform: 'android',
        updatedAt: timestamp,
        userId: 'user-1',
      });
      repository.createRefreshToken({
        deviceId: 'device-1',
        expiresAt: timestamp,
        issuedAt: timestamp,
        tokenDigest: 'refresh-digest',
        userId: 'user-1',
      });
      repository.createPairingCode({
        codeDigest: 'pairing-digest',
        codeLength: 8,
        createdAt: timestamp,
        createdByDeviceId: 'device-1',
        expiresAt: timestamp,
        userId: 'user-1',
      });
      repository.close();

      const reloadedRepository = createSessionRepository({
        sessionStoreFile,
      });

      try {
        expect(reloadedRepository.findDeviceById('device-1')).toMatchObject({
          deviceName: 'Primary device',
          id: 'device-1',
          userId: 'user-1',
        });
        expect(reloadedRepository.findRefreshTokenByDigest('refresh-digest')).toMatchObject({
          deviceId: 'device-1',
          userId: 'user-1',
        });
        expect(reloadedRepository.findPairingCodeByDigest('pairing-digest')).toMatchObject({
          createdByDeviceId: 'device-1',
          userId: 'user-1',
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
