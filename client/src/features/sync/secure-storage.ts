import * as SecureStore from 'expo-secure-store';

export interface StoredSyncSecrets {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = 'sync_credentials_v1_access_token';
const ACCESS_TOKEN_EXPIRES_AT_KEY = 'sync_credentials_v1_access_token_expires_at';
const REFRESH_TOKEN_KEY = 'sync_credentials_v1_refresh_token';

export async function clearStoredSyncSecrets(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(ACCESS_TOKEN_EXPIRES_AT_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
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
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, secrets.accessToken),
    SecureStore.setItemAsync(
      ACCESS_TOKEN_EXPIRES_AT_KEY,
      secrets.accessTokenExpiresAt,
    ),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, secrets.refreshToken),
  ]);
}

async function readNormalizedSecureValue(key: string): Promise<string | null> {
  const value = await SecureStore.getItemAsync(key);

  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}
