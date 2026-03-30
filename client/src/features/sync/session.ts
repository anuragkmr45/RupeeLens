import type {
  ConsumePairingCodeRequest,
  CreateGuestSessionRequest,
  DevicePairingCodeResponse,
  SessionResponse,
} from '@upi-spend-tracker/contracts';
import { Platform } from 'react-native';

import {
  getDefaultBootstrapConfigQuery,
  resolveBootstrapBaseUrl,
} from '../bootstrap-config/runtime-config';
import type { SyncCredentials } from './runtime';
import { normalizeTrustedApiBaseUrl } from './transport-policy';

const ACCESS_TOKEN_REFRESH_SKEW_MS = 60_000;

interface RequestOptions {
  accessToken?: string | undefined;
  baseUrl?: string | null | undefined;
  body?: Record<string, unknown> | undefined;
  fetchImplementation?: typeof globalThis.fetch | undefined;
  method: 'GET' | 'POST';
  path: string;
}

export interface StoredSyncCredentials extends SyncCredentials {
  accessTokenExpiresAt: string;
  refreshToken: string;
  userId: string;
}

export function buildDefaultSyncDeviceName(): string {
  return Platform.OS === 'ios' ? 'iPhone' : 'Android device';
}

export function buildDefaultSyncSessionRequest(
  deviceName: string,
): CreateGuestSessionRequest {
  const bootstrapQuery = getDefaultBootstrapConfigQuery();
  const resolvedOptions = Intl.DateTimeFormat().resolvedOptions();
  const locale = normalizeOptionalString(resolvedOptions.locale);
  const timezone = normalizeOptionalString(resolvedOptions.timeZone);

  return {
    appVersion: bootstrapQuery.appVersion,
    deviceName: deviceName.trim(),
    platform: bootstrapQuery.platform,
    runtimeVersion: bootstrapQuery.runtimeVersion,
    ...(locale ? { locale } : {}),
    ...(timezone ? { timezone } : {}),
  };
}

export async function createGuestSyncSession({
  deviceName,
  fetchImplementation,
}: {
  deviceName: string;
  fetchImplementation?: typeof globalThis.fetch;
}): Promise<StoredSyncCredentials> {
  const request = buildDefaultSyncSessionRequest(deviceName);
  const response = await requestJson<SessionResponse>({
    method: 'POST',
    path: '/v1/sessions/guest',
    ...(fetchImplementation ? { fetchImplementation } : {}),
    body: { ...request },
  });

  return toStoredSyncCredentials(response, null);
}

export async function consumeSyncPairingCode({
  deviceName,
  fetchImplementation,
  pairingCode,
}: {
  deviceName: string;
  fetchImplementation?: typeof globalThis.fetch;
  pairingCode: string;
}): Promise<StoredSyncCredentials> {
  const baseRequest = buildDefaultSyncSessionRequest(deviceName);
  const request: ConsumePairingCodeRequest = {
    ...baseRequest,
    pairingCode: pairingCode.trim().toUpperCase(),
  };
  const response = await requestJson<SessionResponse>({
    method: 'POST',
    path: '/v1/device-pairings/consume',
    ...(fetchImplementation ? { fetchImplementation } : {}),
    body: { ...request },
  });

  return toStoredSyncCredentials(response, null);
}

export async function createSyncPairingCode({
  credentials,
  fetchImplementation,
}: {
  credentials: StoredSyncCredentials;
  fetchImplementation?: typeof globalThis.fetch;
}): Promise<DevicePairingCodeResponse> {
  return requestJson<DevicePairingCodeResponse>({
    accessToken: credentials.accessToken,
    method: 'POST',
    path: '/v1/device-pairings',
    ...(credentials.apiBaseUrl !== undefined
      ? { baseUrl: credentials.apiBaseUrl }
      : {}),
    ...(fetchImplementation ? { fetchImplementation } : {}),
  });
}

export async function refreshSyncCredentials({
  credentials,
  fetchImplementation,
}: {
  credentials: StoredSyncCredentials;
  fetchImplementation?: typeof globalThis.fetch;
}): Promise<StoredSyncCredentials> {
  const response = await requestJson<SessionResponse>({
    body: {
      refreshToken: credentials.refreshToken,
    },
    method: 'POST',
    path: '/v1/sessions/refresh',
    ...(credentials.apiBaseUrl !== undefined
      ? { baseUrl: credentials.apiBaseUrl }
      : {}),
    ...(fetchImplementation ? { fetchImplementation } : {}),
  });

  return toStoredSyncCredentials(response, credentials.apiBaseUrl ?? null);
}

export async function ensureFreshSyncCredentials({
  credentials,
  fetchImplementation,
  now = new Date().toISOString(),
}: {
  credentials: StoredSyncCredentials;
  fetchImplementation?: typeof globalThis.fetch;
  now?: string;
}): Promise<StoredSyncCredentials> {
  if (!isSyncAccessTokenExpiring(credentials, now)) {
    return credentials;
  }

  return refreshSyncCredentials({
    credentials,
    ...(fetchImplementation ? { fetchImplementation } : {}),
  });
}

export function isSyncAccessTokenExpiring(
  credentials: StoredSyncCredentials,
  now = new Date().toISOString(),
): boolean {
  const expiresAtMs = Date.parse(credentials.accessTokenExpiresAt);
  const referenceMs = Date.parse(now);

  if (Number.isNaN(expiresAtMs) || Number.isNaN(referenceMs)) {
    return true;
  }

  return expiresAtMs - referenceMs <= ACCESS_TOKEN_REFRESH_SKEW_MS;
}

function toStoredSyncCredentials(
  response: SessionResponse,
  apiBaseUrl: string | null,
): StoredSyncCredentials {
  return {
    accessToken: response.accessToken,
    accessTokenExpiresAt: new Date(
      Date.now() + response.expiresInSeconds * 1000,
    ).toISOString(),
    apiBaseUrl: normalizeTrustedApiBaseUrl(
      apiBaseUrl ?? resolveBootstrapBaseUrl(responseDevicePlatform()),
    ),
    deviceId: response.deviceId,
    refreshToken: response.refreshToken,
    userId: response.userId,
  };
}

async function requestJson<T>({
  accessToken,
  baseUrl,
  body,
  fetchImplementation = globalThis.fetch,
  method,
  path,
}: RequestOptions): Promise<T> {
  if (typeof fetchImplementation !== 'function') {
    throw new Error('Fetch API is unavailable in this runtime.');
  }

  const resolvedBaseUrl = normalizeTrustedApiBaseUrl(
    normalizeOptionalString(baseUrl) ?? resolveBootstrapBaseUrl(responseDevicePlatform()),
  );
  const response = await fetchImplementation(
    new URL(path, resolvedBaseUrl).toString(),
    {
      ...(body ? { body: JSON.stringify(body) } : {}),
      headers: {
        accept: 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      method,
    },
  );
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status));
  }

  return payload as T;
}

function getErrorMessage(payload: unknown, statusCode: number): string {
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message;
  }

  return `Sync session request failed with ${statusCode}.`;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function responseDevicePlatform(): 'android' | 'ios' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}
