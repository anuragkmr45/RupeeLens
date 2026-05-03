import * as SecureStore from 'expo-secure-store';

export interface StoredSyncSecrets {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = 'sync_credentials_v1_access_token';
const ACCESS_TOKEN_EXPIRES_AT_KEY =
  'sync_credentials_v1_access_token_expires_at';
const REFRESH_TOKEN_KEY = 'sync_credentials_v1_refresh_token';
const warnedSecureStoreFailures = new Set<string>();

export async function clearStoredSyncSecrets(): Promise<void> {
  const results = await Promise.allSettled([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCESS_TOKEN_EXPIRES_AT_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      warnSecureStoreFailure('clear', result.reason);
      return;
    }
  }
}

export async function loadStoredSyncSecrets(): Promise<StoredSyncSecrets | null> {
  const [accessToken, accessTokenExpiresAt, refreshToken] = await Promise.all([
    readNormalizedSecureValue(ACCESS_TOKEN_KEY),
    readNormalizedSecureValue(ACCESS_TOKEN_EXPIRES_AT_KEY),
    readNormalizedSecureValue(REFRESH_TOKEN_KEY),
  ]);

  if (!accessToken && !accessTokenExpiresAt && !refreshToken) {
    return null;
  }

  if (!accessToken || !accessTokenExpiresAt || !refreshToken) {
    await clearStoredSyncSecrets();
    return null;
  }

  return {
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
  };
}

export async function saveStoredSyncSecrets(
  secrets: StoredSyncSecrets | null,
): Promise<void> {
  if (!secrets) {
    await clearStoredSyncSecrets();
    return;
  }

  await Promise.all([
    writeSecureValue(ACCESS_TOKEN_KEY, secrets.accessToken),
    writeSecureValue(ACCESS_TOKEN_EXPIRES_AT_KEY, secrets.accessTokenExpiresAt),
    writeSecureValue(REFRESH_TOKEN_KEY, secrets.refreshToken),
  ]);
}

async function readNormalizedSecureValue(key: string): Promise<string | null> {
  let value: string | null = null;

  try {
    value = await SecureStore.getItemAsync(key);
  } catch (error) {
    warnSecureStoreFailure('read', error);
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

async function writeSecureValue(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    warnSecureStoreFailure('write', error);
    await clearStoredSyncSecrets();
  }
}

function warnSecureStoreFailure(
  operation: 'clear' | 'read' | 'write',
  error: unknown,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const warningKey = `${operation}:${message}`;

  if (warnedSecureStoreFailures.has(warningKey)) {
    return;
  }

  warnedSecureStoreFailures.add(warningKey);
  console.warn(
    `SecureStore ${operation} failed; continuing without persisted sync secrets. ${message}`,
  );
}

export function resetSecureStoreWarningsForTests(): void {
  warnedSecureStoreFailures.clear();
}
