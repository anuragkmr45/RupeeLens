import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import type { Device, RegisterDeviceRequest } from '@upi-spend-tracker/contracts';
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
  close(): void;
  consumePairingCode(
    codeDigest: string,
    consumedAt: IsoUtcDateTimeString,
    consumedByDeviceId: string,
  ): void;
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
  updateDevice(
    deviceId: string,
    input: RegisterDeviceRequest,
    updatedAt: IsoUtcDateTimeString,
  ): StoredDeviceRecord | null;
}

export interface CreateSessionRepositoryOptions {
  sessionStoreFile: string;
}

interface SerializedSessionRepositoryState {
  accessTokens: StoredAccessTokenRecord[];
  devices: StoredDeviceRecord[];
  pairingCodes: StoredPairingCodeRecord[];
  refreshTokens: StoredRefreshTokenRecord[];
  users: StoredUser[];
  version: 1;
}

const SESSION_STORE_VERSION = 1;

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

function cloneStoredDevice(device: StoredDeviceRecord): StoredDeviceRecord {
  return {
    ...device,
    supportedPackages: [...device.supportedPackages],
  };
}

function cloneStoredAccessToken(record: StoredAccessTokenRecord): StoredAccessTokenRecord {
  return { ...record };
}

function cloneStoredRefreshToken(record: StoredRefreshTokenRecord): StoredRefreshTokenRecord {
  return { ...record };
}

function cloneStoredPairingCode(record: StoredPairingCodeRecord): StoredPairingCodeRecord {
  return { ...record };
}

function loadState(sessionStoreFile: string): SerializedSessionRepositoryState {
  try {
    const parsed = JSON.parse(readFileSync(sessionStoreFile, 'utf8')) as Partial<SerializedSessionRepositoryState>;

    if (parsed.version !== SESSION_STORE_VERSION) {
      throw new Error(
        `Unsupported session store version in ${sessionStoreFile}: ${String(parsed.version)}`,
      );
    }

    return {
      accessTokens: Array.isArray(parsed.accessTokens) ? parsed.accessTokens : [],
      devices: Array.isArray(parsed.devices) ? parsed.devices : [],
      pairingCodes: Array.isArray(parsed.pairingCodes) ? parsed.pairingCodes : [],
      refreshTokens: Array.isArray(parsed.refreshTokens) ? parsed.refreshTokens : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
      version: SESSION_STORE_VERSION,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        accessTokens: [],
        devices: [],
        pairingCodes: [],
        refreshTokens: [],
        users: [],
        version: SESSION_STORE_VERSION,
      };
    }

    throw error;
  }
}

function writeState(
  sessionStoreFile: string,
  state: SerializedSessionRepositoryState,
): void {
  mkdirSync(path.dirname(sessionStoreFile), {
    recursive: true,
  });

  const tempFile = `${sessionStoreFile}.${process.pid}.tmp`;

  try {
    writeFileSync(tempFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    renameSync(tempFile, sessionStoreFile);
  } catch (error) {
    try {
      unlinkSync(tempFile);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw cleanupError;
      }
    }

    throw error;
  }
}

export function createSessionRepository({
  sessionStoreFile,
}: CreateSessionRepositoryOptions): SessionRepository {
  const initialState = loadState(sessionStoreFile);
  const users = new Map(initialState.users.map((user) => [user.id, { ...user }]));
  const devices = new Map(
    initialState.devices.map((device) => [device.id, cloneStoredDevice(device)]),
  );
  const accessTokens = new Map(
    initialState.accessTokens.map((record) => [record.tokenDigest, cloneStoredAccessToken(record)]),
  );
  const refreshTokens = new Map(
    initialState.refreshTokens.map((record) => [record.tokenDigest, cloneStoredRefreshToken(record)]),
  );
  const pairingCodes = new Map(
    initialState.pairingCodes.map((record) => [record.codeDigest, cloneStoredPairingCode(record)]),
  );

  function persist(): void {
    writeState(sessionStoreFile, {
      accessTokens: [...accessTokens.values()].map(cloneStoredAccessToken),
      devices: [...devices.values()].map(cloneStoredDevice),
      pairingCodes: [...pairingCodes.values()].map(cloneStoredPairingCode),
      refreshTokens: [...refreshTokens.values()].map(cloneStoredRefreshToken),
      users: [...users.values()].map((user) => ({ ...user })),
      version: SESSION_STORE_VERSION,
    });
  }

  return {
    close() {},
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
      persist();
    },
    createAccessToken(record) {
      accessTokens.set(record.tokenDigest, cloneStoredAccessToken(record));
      persist();
    },
    createDevice(input) {
      const device = createStoredDevice(input);
      devices.set(device.id, cloneStoredDevice(device));
      persist();
      return cloneStoredDevice(device);
    },
    createPairingCode(record) {
      pairingCodes.set(record.codeDigest, cloneStoredPairingCode(record));
      persist();
    },
    createRefreshToken(record) {
      refreshTokens.set(record.tokenDigest, cloneStoredRefreshToken(record));
      persist();
    },
    createUser(user) {
      users.set(user.id, { ...user });
      persist();
    },
    findAccessTokenByDigest(tokenDigest) {
      const record = accessTokens.get(tokenDigest);
      return record ? cloneStoredAccessToken(record) : null;
    },
    findDeviceById(deviceId) {
      const device = devices.get(deviceId);
      return device ? cloneStoredDevice(device) : null;
    },
    findPairingCodeByDigest(codeDigest) {
      const record = pairingCodes.get(codeDigest);
      return record ? cloneStoredPairingCode(record) : null;
    },
    findRefreshTokenByDigest(tokenDigest) {
      const record = refreshTokens.get(tokenDigest);
      return record ? cloneStoredRefreshToken(record) : null;
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
      persist();
    },
    revokeUnconsumedPairingCodesForDevice(deviceId, revokedAt) {
      let didChange = false;

      for (const [codeDigest, record] of pairingCodes) {
        if (record.createdByDeviceId !== deviceId || record.consumedAt) {
          continue;
        }

        pairingCodes.set(codeDigest, {
          ...record,
          consumedAt: revokedAt,
          consumedByDeviceId: null,
        });
        didChange = true;
      }

      if (didChange) {
        persist();
      }
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
        platform: input.platform,
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

      devices.set(deviceId, cloneStoredDevice(nextDevice));
      persist();

      return cloneStoredDevice(nextDevice);
    },
  };
}
