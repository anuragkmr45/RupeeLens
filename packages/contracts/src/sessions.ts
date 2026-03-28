import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

export type SessionPlatform = 'android' | 'ios';
export type SessionSyncMode = 'local_only' | 'cloud_sync';

export interface CreateGuestSessionRequest {
  appVersion?: string;
  deviceName: string;
  locale?: string;
  platform: SessionPlatform;
  runtimeVersion?: string;
  timezone?: string;
}

export interface RefreshSessionRequest {
  refreshToken: string;
}

export interface SessionResponse {
  accessToken: string;
  deviceId: string;
  expiresInSeconds: number;
  refreshToken: string;
  syncMode: SessionSyncMode;
  userId: string;
}

export interface DevicePairingCodeResponse {
  expiresAt: IsoUtcDateTimeString;
  pairingCode: string;
}

export interface ConsumePairingCodeRequest extends CreateGuestSessionRequest {
  pairingCode: string;
}

export interface RegisterDeviceRequest extends CreateGuestSessionRequest {
  notificationCaptureEnabled?: boolean;
  supportedPackages?: string[];
}

export interface Device {
  appVersion?: string;
  createdAt: IsoUtcDateTimeString;
  deviceName: string;
  id: string;
  lastSeenAt?: IsoUtcDateTimeString;
  locale?: string;
  notificationCaptureEnabled?: boolean;
  platform: SessionPlatform;
  runtimeVersion?: string;
  supportedPackages: string[];
  timezone?: string;
  updatedAt: IsoUtcDateTimeString;
}
