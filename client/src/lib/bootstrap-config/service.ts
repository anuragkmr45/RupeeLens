import {
  BOOTSTRAP_CONTENT_HASH_HEADER,
  BOOTSTRAP_SIGNATURE_HEADER,
  type BootstrapConfigResponse,
} from '@upi-spend-tracker/contracts';
import {
  getBootstrapContentHash,
  verifyEd25519Signature,
} from '@upi-spend-tracker/shared-utils';

import { getAppDatabaseAsync, readJsonSetting, upsertJsonSetting } from '../db';
import type { SQLiteDatabaseAdapter } from '../db';
import type { BootstrapRuntimeMetadata } from './runtime';
import {
  bootstrapConfigStateSettingKey,
  createDefaultBootstrapConfigState,
  type BootstrapConfigState,
  type StoredBootstrapConfigState,
} from './state';

export interface FetchLikeResponse {
  headers: {
    get: (name: string) => string | null;
  };
  json: () => Promise<BootstrapConfigResponse>;
  ok: boolean;
  status: number;
}

export type FetchLike = (input: string) => Promise<FetchLikeResponse>;

function createStateFromStoredValue(
  storedValue: StoredBootstrapConfigState,
): BootstrapConfigState {
  const now = Date.now();

  return {
    config: storedValue.response,
    contentHash: storedValue.contentHash,
    isStale: Date.parse(storedValue.expiresAt) <= now,
    lastError: null,
    lastRefreshAt: storedValue.cachedAt,
    signature: storedValue.signature,
    source: 'cache',
  };
}

async function readStoredBootstrapConfig(
  database: SQLiteDatabaseAdapter,
): Promise<StoredBootstrapConfigState | null> {
  return readJsonSetting<StoredBootstrapConfigState>(
    database,
    bootstrapConfigStateSettingKey,
  );
}

async function persistBootstrapConfig(
  database: SQLiteDatabaseAdapter,
  response: BootstrapConfigResponse,
  contentHash: string,
  signature: string,
): Promise<StoredBootstrapConfigState> {
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + response.cacheTtlSeconds * 1000,
  );
  const storedValue: StoredBootstrapConfigState = {
    cachedAt: now.toISOString(),
    contentHash,
    expiresAt: expiresAt.toISOString(),
    response,
    signature,
  };

  await upsertJsonSetting(
    database,
    bootstrapConfigStateSettingKey,
    storedValue,
  );

  return storedValue;
}

function buildBootstrapConfigUrl(
  runtimeMetadata: BootstrapRuntimeMetadata,
): string {
  const url = new URL('/v1/bootstrap/config', `${runtimeMetadata.apiBaseUrl}/`);

  url.searchParams.set('platform', runtimeMetadata.platform);
  url.searchParams.set('appVersion', runtimeMetadata.appVersion);
  url.searchParams.set('runtimeVersion', runtimeMetadata.runtimeVersion);
  url.searchParams.set('channel', runtimeMetadata.channel);

  return url.toString();
}

function createFailureState(
  runtimeMetadata: BootstrapRuntimeMetadata,
  currentState: BootstrapConfigState | null,
  error: unknown,
): BootstrapConfigState {
  const message =
    error instanceof Error ? error.message : 'Unknown remote config refresh error.';
  const state = currentState ?? createDefaultBootstrapConfigState(runtimeMetadata);

  return {
    ...state,
    isStale: true,
    lastError: message,
  };
}

async function fetchSignedBootstrapConfig(
  runtimeMetadata: BootstrapRuntimeMetadata,
  fetchImplementation: FetchLike,
): Promise<{
  contentHash: string;
  response: BootstrapConfigResponse;
  signature: string;
}> {
  const response = await fetchImplementation(
    buildBootstrapConfigUrl(runtimeMetadata),
  );

  if (!response.ok) {
    throw new Error(
      `Bootstrap config request failed with status ${response.status}.`,
    );
  }

  const contentHashHeader = response.headers.get(BOOTSTRAP_CONTENT_HASH_HEADER);
  const signatureHeader = response.headers.get(BOOTSTRAP_SIGNATURE_HEADER);

  if (!contentHashHeader || !signatureHeader) {
    throw new Error('Bootstrap config response is missing signature headers.');
  }

  const payload = await response.json();
  const computedHash = getBootstrapContentHash(payload);

  if (contentHashHeader !== computedHash) {
    throw new Error('Bootstrap config content hash mismatch.');
  }

  if (
    !verifyEd25519Signature(payload, signatureHeader, runtimeMetadata.publicKey)
  ) {
    throw new Error('Bootstrap config signature verification failed.');
  }

  return {
    contentHash: computedHash,
    response: payload,
    signature: signatureHeader,
  };
}

export async function loadBootstrapConfigState(
  runtimeMetadata: BootstrapRuntimeMetadata,
  database: SQLiteDatabaseAdapter,
): Promise<BootstrapConfigState> {
  const storedValue = await readStoredBootstrapConfig(database);

  if (!storedValue) {
    return createDefaultBootstrapConfigState(runtimeMetadata);
  }

  return createStateFromStoredValue(storedValue);
}

export async function loadBootstrapConfigStateFromDatabase(
  runtimeMetadata: BootstrapRuntimeMetadata,
): Promise<BootstrapConfigState> {
  const database = await getAppDatabaseAsync();

  return loadBootstrapConfigState(runtimeMetadata, database);
}

export async function refreshBootstrapConfigState(
  runtimeMetadata: BootstrapRuntimeMetadata,
  currentState: BootstrapConfigState | null,
  options?: {
    database?: SQLiteDatabaseAdapter;
    fetchImplementation?: FetchLike;
  },
): Promise<BootstrapConfigState> {
  const database = options?.database ?? (await getAppDatabaseAsync());
  const fetchImplementation =
    options?.fetchImplementation ?? (fetch as FetchLike);

  try {
    const signedConfig = await fetchSignedBootstrapConfig(
      runtimeMetadata,
      fetchImplementation,
    );
    const storedValue = await persistBootstrapConfig(
      database,
      signedConfig.response,
      signedConfig.contentHash,
      signedConfig.signature,
    );

    return {
      ...createStateFromStoredValue(storedValue),
      source: 'network',
    };
  } catch (error) {
    return createFailureState(runtimeMetadata, currentState, error);
  }
}
