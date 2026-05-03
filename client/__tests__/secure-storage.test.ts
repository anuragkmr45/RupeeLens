import * as SecureStore from 'expo-secure-store';

import {
  loadStoredSyncSecrets,
  resetSecureStoreWarningsForTests,
  saveStoredSyncSecrets,
} from '../src/features/sync/secure-storage';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('secure storage fallbacks', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSecureStoreWarningsForTests();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('returns null when SecureStore reads fail instead of crashing startup', async () => {
    mockedSecureStore.getItemAsync.mockRejectedValue(
      new Error("A required entitlement isn't present."),
    );

    await expect(loadStoredSyncSecrets()).resolves.toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('clears partial secrets and resolves when SecureStore writes fail', async () => {
    mockedSecureStore.setItemAsync.mockRejectedValueOnce(
      new Error("A required entitlement isn't present."),
    );

    await expect(
      saveStoredSyncSecrets({
        accessToken: 'token',
        accessTokenExpiresAt: '2026-04-06T00:00:00.000Z',
        refreshToken: 'refresh',
      }),
    ).resolves.toBeUndefined();

    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});
