import type { Device, RegisterDeviceRequest, SessionPlatform } from '@upi-spend-tracker/contracts';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

export interface StoredUser {
  createdAt: IsoUtcDateTimeString;
  id: string;
  syncMode: 'cloud_sync';
}

export interface StoredDeviceRecord extends Device {
  userId: string;
}

export interface StoredAccessTokenRecord {
  deviceId: string;
  expiresAt: IsoUtcDateTimeString;
  issuedAt: IsoUtcDateTimeString;
  tokenDigest: string;
  userId: string;
}

export interface StoredRefreshTokenRecord {
  deviceId: string;
  expiresAt: IsoUtcDateTimeString;
  issuedAt: IsoUtcDateTimeString;
  replacedByDigest?: string | null;
  revokedAt?: IsoUtcDateTimeString | null;
  tokenDigest: string;
  userId: string;
}

export interface StoredPairingCodeRecord {
  codeDigest: string;
  codeLength: number;
  consumedAt?: IsoUtcDateTimeString | null;
  consumedByDeviceId?: string | null;
  createdAt: IsoUtcDateTimeString;
  createdByDeviceId: string;
  expiresAt: IsoUtcDateTimeString;
  userId: string;
}

export interface CreateDeviceInput extends RegisterDeviceRequest {
  createdAt: IsoUtcDateTimeString;
  deviceId: string;
  updatedAt: IsoUtcDateTimeString;
  userId: string;
}

export interface SessionRepository {
  createAccessToken(record: StoredAccessTokenRecord): void;
  createDevice(input: CreateDeviceInput): StoredDeviceRecord;
  createPairingCode(record: StoredPairingCodeRecord): void;
  createRefreshToken(record: StoredRefreshTokenRecord): void;
  createUser(user: StoredUser): void;
  findAccessTokenByDigest(tokenDigest: string): StoredAccessTokenRecord | null;
  findDeviceById(deviceId: string): StoredDeviceRecord | null;
  findPairingCodeByDigest(codeDigest: string): StoredPairingCodeRecord | null;
  findRefreshTokenByDigest(tokenDigest: string): StoredRefreshTokenRecord | null;
  revokeRefreshToken(
    tokenDigest: string,
    revokedAt: IsoUtcDateTimeString,
    replacedByDigest?: string,
  ): void;
  revokeUnconsumedPairingCodesForDevice(
    deviceId: string,
    revokedAt: IsoUtcDateTimeString,
  ): void;
  consumePairingCode(
    codeDigest: string,
    consumedAt: IsoUtcDateTimeString,
    consumedByDeviceId: string,
  ): void;
  updateDevice(
    deviceId: string,
    input: RegisterDeviceRequest,
    updatedAt: IsoUtcDateTimeString,
  ): StoredDeviceRecord | null;
}

function createStoredDevice(input: CreateDeviceInput): StoredDeviceRecord {
  return {
    createdAt: input.createdAt,
    deviceName: input.deviceName,
    id: input.deviceId,
    lastSeenAt: input.updatedAt,
    platform: input.platform,
    supportedPackages: [...(input.supportedPackages ?? [])],
    updatedAt: input.updatedAt,
    userId: input.userId,
    ...(input.appVersion ? { appVersion: input.appVersion } : {}),
    ...(input.locale ? { locale: input.locale } : {}),
    ...(input.notificationCaptureEnabled !== undefined
      ? { notificationCaptureEnabled: input.notificationCaptureEnabled }
      : {}),
    ...(input.runtimeVersion ? { runtimeVersion: input.runtimeVersion } : {}),
    ...(input.timezone ? { timezone: input.timezone } : {}),
  };
}

export function createSessionRepository(): SessionRepository {
  const users = new Map<string, StoredUser>();
  const devices = new Map<string, StoredDeviceRecord>();
  const accessTokens = new Map<string, StoredAccessTokenRecord>();
  const refreshTokens = new Map<string, StoredRefreshTokenRecord>();
  const pairingCodes = new Map<string, StoredPairingCodeRecord>();

  return {
    createAccessToken(record) {
      accessTokens.set(record.tokenDigest, { ...record });
    },
    createDevice(input) {
      const device = createStoredDevice(input);
      devices.set(device.id, device);
      return { ...device, supportedPackages: [...device.supportedPackages] };
    },
    createPairingCode(record) {
      pairingCodes.set(record.codeDigest, { ...record });
    },
    createRefreshToken(record) {
      refreshTokens.set(record.tokenDigest, { ...record });
    },
    createUser(user) {
      users.set(user.id, { ...user });
    },
    findAccessTokenByDigest(tokenDigest) {
      const record = accessTokens.get(tokenDigest);
      return record ? { ...record } : null;
    },
    findDeviceById(deviceId) {
      const device = devices.get(deviceId);

      return device ? { ...device, supportedPackages: [...device.supportedPackages] } : null;
    },
    findPairingCodeByDigest(codeDigest) {
      const record = pairingCodes.get(codeDigest);
      return record ? { ...record } : null;
    },
    findRefreshTokenByDigest(tokenDigest) {
      const record = refreshTokens.get(tokenDigest);
      return record ? { ...record } : null;
    },
    revokeRefreshToken(tokenDigest, revokedAt, replacedByDigest) {
      const record = refreshTokens.get(tokenDigest);

      if (!record) {
        return;
      }

      refreshTokens.set(tokenDigest, {
        ...record,
        replacedByDigest: replacedByDigest ?? record.replacedByDigest ?? null,
        revokedAt,
      });
    },
    revokeUnconsumedPairingCodesForDevice(deviceId, revokedAt) {
      for (const [codeDigest, record] of pairingCodes) {
        if (record.createdByDeviceId !== deviceId || record.consumedAt) {
          continue;
        }

        pairingCodes.set(codeDigest, {
          ...record,
          consumedAt: revokedAt,
          consumedByDeviceId: null,
        });
      }
    },
    consumePairingCode(codeDigest, consumedAt, consumedByDeviceId) {
      const record = pairingCodes.get(codeDigest);

      if (!record) {
        return;
      }

      pairingCodes.set(codeDigest, {
        ...record,
        consumedAt,
        consumedByDeviceId,
      });
    },
    updateDevice(deviceId, input, updatedAt) {
      const currentDevice = devices.get(deviceId);

      if (!currentDevice) {
        return null;
      }

      const nextDevice: StoredDeviceRecord = {
        createdAt: currentDevice.createdAt,
        deviceName: input.deviceName,
        id: currentDevice.id,
        lastSeenAt: updatedAt,
        platform: input.platform as SessionPlatform,
        supportedPackages: [...(input.supportedPackages ?? [])],
        updatedAt,
        userId: currentDevice.userId,
        ...(input.appVersion ? { appVersion: input.appVersion } : {}),
        ...(input.locale ? { locale: input.locale } : {}),
        ...(input.notificationCaptureEnabled !== undefined
          ? { notificationCaptureEnabled: input.notificationCaptureEnabled }
          : {}),
        ...(input.runtimeVersion ? { runtimeVersion: input.runtimeVersion } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
      };

      devices.set(deviceId, nextDevice);

      return { ...nextDevice, supportedPackages: [...nextDevice.supportedPackages] };
    },
  };
}
