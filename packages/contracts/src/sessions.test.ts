import { describe, expect, it } from 'vitest';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

import type {
  ConsumePairingCodeRequest,
  CreateGuestSessionRequest,
  Device,
  DevicePairingCodeResponse,
  RefreshSessionRequest,
  RegisterDeviceRequest,
  SessionResponse,
} from './sessions.js';

describe('sessions contract', () => {
  it('supports guest session and pairing request shapes', () => {
    const guestRequest: CreateGuestSessionRequest = {
      appVersion: '0.1.0',
      deviceName: 'Anurag Pixel',
      locale: 'en-IN',
      platform: 'android',
      runtimeVersion: 'sdk-55-dev',
      timezone: 'Asia/Kolkata',
    };
    const pairingConsumeRequest: ConsumePairingCodeRequest = {
      ...guestRequest,
      pairingCode: 'AB12CD34',
    };
    const refreshRequest: RefreshSessionRequest = {
      refreshToken: 'st_refresh_test',
    };
    const deviceRequest: RegisterDeviceRequest = {
      ...guestRequest,
      notificationCaptureEnabled: true,
      supportedPackages: ['com.google.android.apps.nbu.paisa.user'],
    };

    expect(guestRequest.platform).toBe('android');
    expect(pairingConsumeRequest.pairingCode).toHaveLength(8);
    expect(refreshRequest.refreshToken).toContain('refresh');
    expect(deviceRequest.supportedPackages).toHaveLength(1);
  });

  it('supports session and device response shapes', () => {
    const session: SessionResponse = {
      accessToken: 'st_access_test',
      deviceId: 'device-1',
      expiresInSeconds: 900,
      refreshToken: 'st_refresh_test',
      syncMode: 'cloud_sync',
      userId: 'user-1',
    };
    const pairing: DevicePairingCodeResponse = {
      expiresAt: '2026-03-28T12:00:00.000Z' as IsoUtcDateTimeString,
      pairingCode: 'AB12CD34',
    };
    const device: Device = {
      appVersion: '0.1.0',
      createdAt: '2026-03-28T11:00:00.000Z' as IsoUtcDateTimeString,
      deviceName: 'Anurag Pixel',
      id: 'device-1',
      lastSeenAt: '2026-03-28T11:05:00.000Z' as IsoUtcDateTimeString,
      locale: 'en-IN',
      notificationCaptureEnabled: true,
      platform: 'android',
      runtimeVersion: 'sdk-55-dev',
      supportedPackages: ['com.phonepe.app'],
      timezone: 'Asia/Kolkata',
      updatedAt: '2026-03-28T11:05:00.000Z' as IsoUtcDateTimeString,
    };

    expect(session.syncMode).toBe('cloud_sync');
    expect(pairing.pairingCode).toMatch(/^[A-Z0-9]+$/);
    expect(device.platform).toBe('android');
  });
});
