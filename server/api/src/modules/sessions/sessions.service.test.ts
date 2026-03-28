import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createSessionRepository } from './sessions.repository.js';
import {
  createSessionService,
  PairingCodeConflictError,
  SessionUnauthorizedError,
} from './sessions.service.js';

describe('sessions service', () => {
  it('creates guest sessions, rotates refresh tokens, and updates device metadata', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-service-store-'));
    const timestamps = [
      '2026-03-28T10:00:00.000Z',
      '2026-03-28T10:05:00.000Z',
      '2026-03-28T10:06:00.000Z',
    ];
    let timestampIndex = 0;
    let uuidIndex = 0;
    let tokenIndex = 0;
    const service = createSessionService({
      now: () => timestamps[Math.min(timestampIndex++, timestamps.length - 1)]!,
      randomToken: (prefix) => `${prefix}_${++tokenIndex}`,
      randomUuid: () => `uuid_${++uuidIndex}`,
      repository: createSessionRepository({
        sessionStoreFile: path.join(tempDir, 'sessions-store.json'),
      }),
    });

    try {
      const session = service.createGuestSession({
        appVersion: '0.1.0',
        deviceName: 'Pixel 9',
        platform: 'android',
        runtimeVersion: 'sdk-55',
      });
      const refreshed = service.refreshSession(session.refreshToken);
      const device = service.registerDevice(refreshed.accessToken, {
        appVersion: '0.1.1',
        deviceName: 'Pixel 9 Pro',
        notificationCaptureEnabled: true,
        platform: 'android',
        runtimeVersion: 'sdk-55',
        supportedPackages: ['com.phonepe.app'],
      });

      expect(session.userId).toBe('uuid_1');
      expect(refreshed.refreshToken).not.toBe(session.refreshToken);
      expect(device.deviceName).toBe('Pixel 9 Pro');
      expect(device.supportedPackages).toEqual(['com.phonepe.app']);
      expect(() => service.refreshSession(session.refreshToken)).toThrow(SessionUnauthorizedError);
    } finally {
      await rm(tempDir, {
        force: true,
        recursive: true,
      });
    }
  });

  it('creates one-time pairing codes and rejects replay or expiry', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-service-store-'));
    let currentTimestamp = '2026-03-28T10:00:00.000Z';
    let uuidIndex = 0;
    let tokenIndex = 0;
    const service = createSessionService({
      now: () => currentTimestamp,
      randomCode: () => 'AB12CD34',
      randomToken: (prefix) => `${prefix}_${++tokenIndex}`,
      randomUuid: () => `uuid_${++uuidIndex}`,
      repository: createSessionRepository({
        sessionStoreFile: path.join(tempDir, 'sessions-store.json'),
      }),
    });

    try {
      const session = service.createGuestSession({
        deviceName: 'Trusted Pixel',
        platform: 'android',
      });
      const pairingCode = service.createPairingCode(session.accessToken);
      const pairedSession = service.consumePairingCode({
        deviceName: 'iPhone shell',
        pairingCode: pairingCode.pairingCode,
        platform: 'ios',
      });

      expect(pairedSession.userId).toBe(session.userId);
      expect(pairedSession.deviceId).not.toBe(session.deviceId);
      expect(() =>
        service.consumePairingCode({
          deviceName: 'Second device',
          pairingCode: pairingCode.pairingCode,
          platform: 'android',
        }),
      ).toThrow(PairingCodeConflictError);

      const expiringCode = service.createPairingCode(session.accessToken);
      currentTimestamp = '2026-03-28T10:11:00.000Z';

      expect(() =>
        service.consumePairingCode({
          deviceName: 'Late device',
          pairingCode: expiringCode.pairingCode,
          platform: 'android',
        }),
      ).toThrow(PairingCodeConflictError);
    } finally {
      await rm(tempDir, {
        force: true,
        recursive: true,
      });
    }
  });
});
