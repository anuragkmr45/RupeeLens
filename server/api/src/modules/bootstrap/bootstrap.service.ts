import type {
  BootstrapConfigQuery,
  BootstrapConfigResponse,
  RolloutChannel,
  RuntimeCompatibility,
} from '@upi-spend-tracker/contracts';
import {
  compareDottedVersions,
  getBootstrapContentHash,
  signEd25519Payload,
} from '@upi-spend-tracker/shared-utils';

import { getBootstrapProfileConfig, type BootstrapProfileName } from './bootstrap.config.js';

export interface BootstrapResponseEnvelope {
  contentHash: string;
  response: BootstrapConfigResponse;
  signature: string;
}

function resolveRuntimeCompatibility(
  query: BootstrapConfigQuery,
  allowedRuntimeVersions: readonly string[],
  minSupportedVersion: string,
): RuntimeCompatibility {
  if (compareDottedVersions(query.appVersion, minSupportedVersion) < 0) {
    return {
      compatible: false,
      reason: 'app_version_below_min_supported',
    };
  }

  if (!allowedRuntimeVersions.includes(query.runtimeVersion)) {
    return {
      compatible: false,
      reason: 'runtime_version_not_supported',
    };
  }

  return {
    compatible: true,
  };
}

export function getBootstrapResponse(
  query: BootstrapConfigQuery,
  options: {
    profileName: BootstrapProfileName;
    signingPrivateKey: string;
  },
): BootstrapResponseEnvelope {
  const channel: RolloutChannel = query.channel ?? 'internal';
  const profile = getBootstrapProfileConfig(options.profileName, channel, query.platform);
  const runtimeCompatibility = resolveRuntimeCompatibility(
    query,
    profile.allowedRuntimeVersions,
    profile.minSupportedVersion,
  );

  const response: BootstrapConfigResponse = {
    cacheTtlSeconds: profile.cacheTtlSeconds,
    configVersion: profile.configVersion,
    featureFlags: profile.featureFlags,
    minSupportedVersion: profile.minSupportedVersion,
    parserConfig: profile.parserConfig,
    rolloutChannel: channel,
    runtimeCompatibility,
  };

  if (profile.copyOverrides) {
    response.copyOverrides = profile.copyOverrides;
  }

  if (profile.softUpgradeVersion) {
    response.softUpgradeVersion = profile.softUpgradeVersion;
  }

  const contentHash = getBootstrapContentHash(response);
  const signature = signEd25519Payload(response, options.signingPrivateKey);

  return {
    contentHash,
    response,
    signature,
  };
}
