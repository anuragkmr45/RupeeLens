import type { ExpoConfig } from 'expo/config';

type RolloutChannel = 'internal' | 'beta' | 'production';

const DEFAULT_RELEASE_CHANNEL: RolloutChannel = 'production';
const APP_VERSION = '1.0.0';

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function resolveReleaseChannel(env: NodeJS.ProcessEnv = process.env): RolloutChannel {
  const configuredChannel = normalizeOptionalString(env.EXPO_PUBLIC_RELEASE_CHANNEL);

  if (
    configuredChannel === 'internal' ||
    configuredChannel === 'beta' ||
    configuredChannel === 'production'
  ) {
    return configuredChannel;
  }

  return DEFAULT_RELEASE_CHANNEL;
}

function resolveUpdatesUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const configuredUrl = normalizeOptionalString(env.EXPO_UPDATES_URL);

  if (configuredUrl) {
    return configuredUrl;
  }

  const easProjectId = normalizeOptionalString(env.EXPO_EAS_PROJECT_ID);
  return easProjectId ? `https://u.expo.dev/${easProjectId}` : undefined;
}

function buildConfig(env: NodeJS.ProcessEnv = process.env): ExpoConfig {
  const easProjectId = normalizeOptionalString(env.EXPO_EAS_PROJECT_ID);
  const releaseChannel = resolveReleaseChannel(env);
  const updatesUrl = resolveUpdatesUrl(env);

  return {
    android: {
      package: 'com.upispendtracker.client',
      versionCode: 1,
    },
    extra: {
      otaRuntimePolicy: 'fingerprint',
      releaseChannel,
      ...(easProjectId
        ? {
            eas: {
              projectId: easProjectId,
            },
          }
        : {}),
    },
    ios: {
      buildNumber: '1',
      bundleIdentifier: 'com.upispendtracker.client',
    },
    name: 'UPI Spend Tracker',
    orientation: 'portrait',
    runtimeVersion: {
      policy: 'fingerprint',
    },
    scheme: 'upispendtracker',
    slug: 'upi-spend-tracker',
    updates: {
      checkAutomatically: 'ON_LOAD',
      enabled: Boolean(updatesUrl),
      fallbackToCacheTimeout: 0,
      ...(updatesUrl ? { url: updatesUrl } : {}),
    },
    userInterfaceStyle: 'light',
    version: APP_VERSION,
  };
}

export default buildConfig;
