import type {
  BootstrapConfigQuery,
  ClientPlatform,
  RolloutChannel,
} from '@upi-spend-tracker/contracts';
import { DEFAULT_BOOTSTRAP_SIGNING_PUBLIC_KEY } from '@upi-spend-tracker/shared-utils';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface BootstrapRuntimeMetadata
  extends Omit<BootstrapConfigQuery, 'channel'> {
  apiBaseUrl: string;
  channel: RolloutChannel;
  publicKey: string;
}

function parseChannel(value: unknown): RolloutChannel {
  if (value === 'beta' || value === 'production') {
    return value;
  }

  return 'internal';
}

function getPlatform(): ClientPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

function getDefaultApiBaseUrl(platform: ClientPlatform): string {
  if (platform === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://127.0.0.1:3000';
}

export function getBootstrapRuntimeMetadata(): BootstrapRuntimeMetadata {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const platform = getPlatform();

  return {
    apiBaseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/u, '') ||
      getDefaultApiBaseUrl(platform),
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    channel: parseChannel(extra.rolloutChannel),
    platform,
    publicKey: DEFAULT_BOOTSTRAP_SIGNING_PUBLIC_KEY,
    runtimeVersion:
      typeof extra.runtimeVersion === 'string' ? extra.runtimeVersion : '1.0.0',
  };
}
