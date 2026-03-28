import type {
  ConsumePairingCodeRequest,
  CreateGuestSessionRequest,
  Device,
  DevicePairingCodeResponse,
  RegisterDeviceRequest,
  SessionResponse,
} from '@upi-spend-tracker/contracts';
import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import type {
  SessionRepository,
  StoredPairingCodeRecord,
  StoredRefreshTokenRecord,
} from './sessions.repository.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const PAIRING_CODE_TTL_SECONDS = 10 * 60;
const PAIRING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAIRING_CODE_LENGTH = 8;

export interface SessionServiceDependencies {
  now?: () => string;
  randomCode?: (length: number) => string;
  randomToken?: (prefix: string) => string;
  randomUuid?: () => string;
  repository: SessionRepository;
}

export interface SessionService {
  consumePairingCode(request: ConsumePairingCodeRequest): SessionResponse;
  createGuestSession(request: CreateGuestSessionRequest): SessionResponse;
  createPairingCode(accessToken: string): DevicePairingCodeResponse;
  refreshSession(refreshToken: string): SessionResponse;
  registerDevice(accessToken: string, request: RegisterDeviceRequest): Device;
}

export class SessionUnauthorizedError extends Error {
  constructor(message = 'The provided session token is invalid or expired.') {
    super(message);
    this.name = 'SessionUnauthorizedError';
  }
}

export class PairingCodeConflictError extends Error {
  constructor(message = 'The pairing code is invalid, expired, or already used.') {
    super(message);
    this.name = 'PairingCodeConflictError';
  }
}

export function createSessionService({
  now = () => new Date().toISOString(),
  randomCode = createRandomPairingCode,
  randomToken = createRandomToken,
  randomUuid = randomUUID,
  repository,
}: SessionServiceDependencies): SessionService {
  function issueSession(
    userId: string,
    deviceId: string,
    issuedAt: IsoUtcDateTimeString,
  ): SessionResponse {
    const accessToken = randomToken('st_access');
    const refreshToken = randomToken('st_refresh');
    const accessExpiresAt = addSeconds(issuedAt, ACCESS_TOKEN_TTL_SECONDS);
    const refreshExpiresAt = addSeconds(issuedAt, REFRESH_TOKEN_TTL_SECONDS);

    repository.createAccessToken({
      deviceId,
      expiresAt: accessExpiresAt,
      issuedAt,
      tokenDigest: createDigest(accessToken),
      userId,
    });
    repository.createRefreshToken({
      deviceId,
      expiresAt: refreshExpiresAt,
      issuedAt,
      tokenDigest: createDigest(refreshToken),
      userId,
    });

    return {
      accessToken,
      deviceId,
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken,
      syncMode: 'cloud_sync',
      userId,
    };
  }

  function authenticateAccessToken(accessToken: string) {
    const tokenRecord = repository.findAccessTokenByDigest(createDigest(accessToken));

    if (!tokenRecord || isExpired(tokenRecord.expiresAt, now())) {
      throw new SessionUnauthorizedError();
    }

    return tokenRecord;
  }

  function getActiveRefreshToken(refreshToken: string): StoredRefreshTokenRecord {
    const tokenRecord = repository.findRefreshTokenByDigest(createDigest(refreshToken));

    if (
      !tokenRecord ||
      tokenRecord.revokedAt ||
      isExpired(tokenRecord.expiresAt, now())
    ) {
      throw new SessionUnauthorizedError('The refresh token is invalid, expired, or already rotated.');
    }

    return tokenRecord;
  }

  function getActivePairingCode(code: string): StoredPairingCodeRecord {
    const pairingCode = repository.findPairingCodeByDigest(createDigest(normalizePairingCode(code)));

    if (
      !pairingCode ||
      pairingCode.consumedAt ||
      isExpired(pairingCode.expiresAt, now())
    ) {
      throw new PairingCodeConflictError();
    }

    return pairingCode;
  }

  return {
    consumePairingCode(request) {
      const timestamp = toIsoUtcDateTimeString(now());
      const pairingCode = getActivePairingCode(request.pairingCode);
      const nextDeviceId = randomUuid();

      repository.createDevice({
        ...request,
        createdAt: timestamp,
        deviceId: nextDeviceId,
        updatedAt: timestamp,
        userId: pairingCode.userId,
      });
      repository.consumePairingCode(
        pairingCode.codeDigest,
        timestamp,
        nextDeviceId,
      );

      return issueSession(pairingCode.userId, nextDeviceId, timestamp);
    },
    createGuestSession(request) {
      const timestamp = toIsoUtcDateTimeString(now());
      const userId = randomUuid();
      const deviceId = randomUuid();

      repository.createUser({
        createdAt: timestamp,
        id: userId,
        syncMode: 'cloud_sync',
      });
      repository.createDevice({
        ...request,
        createdAt: timestamp,
        deviceId,
        updatedAt: timestamp,
        userId,
      });

      return issueSession(userId, deviceId, timestamp);
    },
    createPairingCode(accessToken) {
      const timestamp = toIsoUtcDateTimeString(now());
      const activeAccessToken = authenticateAccessToken(accessToken);
      const code = normalizePairingCode(randomCode(PAIRING_CODE_LENGTH));
      const expiresAt = addSeconds(timestamp, PAIRING_CODE_TTL_SECONDS);

      repository.revokeUnconsumedPairingCodesForDevice(activeAccessToken.deviceId, timestamp);
      repository.createPairingCode({
        codeDigest: createDigest(code),
        codeLength: code.length,
        createdAt: timestamp,
        createdByDeviceId: activeAccessToken.deviceId,
        expiresAt,
        userId: activeAccessToken.userId,
      });

      return {
        expiresAt,
        pairingCode: code,
      };
    },
    refreshSession(refreshToken) {
      const timestamp = toIsoUtcDateTimeString(now());
      const activeRefreshToken = getActiveRefreshToken(refreshToken);
      const session = issueSession(
        activeRefreshToken.userId,
        activeRefreshToken.deviceId,
        timestamp,
      );

      repository.revokeRefreshToken(
        activeRefreshToken.tokenDigest,
        timestamp,
        createDigest(session.refreshToken),
      );

      return session;
    },
    registerDevice(accessToken, request) {
      const timestamp = toIsoUtcDateTimeString(now());
      const activeAccessToken = authenticateAccessToken(accessToken);
      const updatedDevice = repository.updateDevice(
        activeAccessToken.deviceId,
        request,
        timestamp,
      );

      if (!updatedDevice) {
        throw new SessionUnauthorizedError('The session device no longer exists.');
      }

      return updatedDevice;
    },
  };
}

function createDigest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function addSeconds(
  timestamp: IsoUtcDateTimeString,
  seconds: number,
): IsoUtcDateTimeString {
  return new Date(Date.parse(timestamp) + seconds * 1000).toISOString() as IsoUtcDateTimeString;
}

function isExpired(expiresAt: string, referenceTimestamp: string): boolean {
  return Date.parse(referenceTimestamp) >= Date.parse(expiresAt);
}

function createRandomToken(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('base64url')}`;
}

function createRandomPairingCode(length: number): string {
  let pairingCode = '';

  for (let index = 0; index < length; index += 1) {
    const charIndex = randomBytes(1)[0]! % PAIRING_CODE_ALPHABET.length;
    pairingCode += PAIRING_CODE_ALPHABET.charAt(charIndex);
  }

  return pairingCode;
}

function normalizePairingCode(pairingCode: string): string {
  return pairingCode.trim().toUpperCase();
}

function toIsoUtcDateTimeString(value: string): IsoUtcDateTimeString {
  return value as IsoUtcDateTimeString;
}
