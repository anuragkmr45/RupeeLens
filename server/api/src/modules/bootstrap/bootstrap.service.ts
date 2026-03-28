import type {
  BootstrapConfigRequestQuery,
  BootstrapConfigResponse,
  CaptureDedupeConfig,
  BootstrapParserConfig,
  ParserTemplateConfig,
  RolloutChannel,
} from '@upi-spend-tracker/contracts';
import {
  createIntegritySignature,
  compareVersionStrings,
} from '@upi-spend-tracker/shared-utils';

import type {
  BootstrapConfigDefinition,
  BootstrapConfigOverride,
  BootstrapConfigRepository,
} from './bootstrap.repository.js';

export interface BootstrapConfigService {
  getBootstrapConfig(query: BootstrapConfigRequestQuery): BootstrapConfigResponse;
}

function normalizeRuntimeVersion(runtimeVersion: string): string {
  return runtimeVersion.trim().toLowerCase();
}

function mergeParserConfig(
  base: BootstrapParserConfig,
  override: BootstrapConfigOverride['parserConfig'],
): BootstrapParserConfig {
  const templates: Record<string, ParserTemplateConfig> = {
    ...base.templates,
    ...(override?.templates ?? {}),
  };

  return {
    parserKillSwitch: override?.parserKillSwitch ?? base.parserKillSwitch,
    templates,
  };
}

function mergeDedupeConfig(
  base: CaptureDedupeConfig,
  override: BootstrapConfigOverride['dedupeConfig'],
): CaptureDedupeConfig {
  return {
    exactMatchWindowSeconds:
      override?.exactMatchWindowSeconds ?? base.exactMatchWindowSeconds,
    fuzzyMatchWindowSeconds:
      override?.fuzzyMatchWindowSeconds ?? base.fuzzyMatchWindowSeconds,
    merchantSimilarityThreshold:
      override?.merchantSimilarityThreshold ?? base.merchantSimilarityThreshold,
  };
}

function mergeDefinition(
  base: BootstrapConfigDefinition,
  override: BootstrapConfigOverride,
): BootstrapConfigDefinition {
  return {
    cacheTtlSeconds: override.cacheTtlSeconds ?? base.cacheTtlSeconds,
    copyOverrides: {
      ...base.copyOverrides,
      ...(override.copyOverrides ?? {}),
    },
    dedupeConfig: mergeDedupeConfig(base.dedupeConfig, override.dedupeConfig),
    featureFlags: {
      ...base.featureFlags,
      ...(override.featureFlags ?? {}),
    },
    minSupportedVersion: base.minSupportedVersion,
    parserConfig: mergeParserConfig(base.parserConfig, override.parserConfig),
    runtimeSupport: {
      ...base.runtimeSupport,
      ...(override.runtimeSupport ?? {}),
    },
    softUpgradeVersion: base.softUpgradeVersion,
  };
}

function buildRuntimeCompatibility(
  query: BootstrapConfigRequestQuery,
  definition: BootstrapConfigDefinition,
) {
  const supportedRuntimePrefixes =
    definition.runtimeSupport[query.platform]?.supportedRuntimePrefixes ?? [];
  const normalizedRuntimeVersion = normalizeRuntimeVersion(query.runtimeVersion);
  const supportsRuntimeVersion = supportedRuntimePrefixes.some((prefix) =>
    normalizedRuntimeVersion.startsWith(prefix.toLowerCase()),
  );

  if (!supportsRuntimeVersion) {
    return {
      compatible: false,
      reason: `Runtime ${query.runtimeVersion} is unsupported for ${query.platform}. Expected one of: ${supportedRuntimePrefixes.join(', ')}.`,
    };
  }

  if (compareVersionStrings(query.appVersion, definition.minSupportedVersion) < 0) {
    return {
      compatible: false,
      reason: `Upgrade required to at least ${definition.minSupportedVersion}.`,
    };
  }

  if (compareVersionStrings(query.appVersion, definition.softUpgradeVersion) < 0) {
    return {
      compatible: true,
      reason: `Upgrade recommended to ${definition.softUpgradeVersion} for the latest parser config.`,
    };
  }

  return {
    compatible: true,
  };
}

function buildConfigVersion(
  query: BootstrapConfigRequestQuery,
  definition: BootstrapConfigDefinition,
  rolloutChannel: RolloutChannel,
  runtimeCompatibility: NonNullable<BootstrapConfigResponse['runtimeCompatibility']>,
): string {
  const signature = createIntegritySignature({
    appVersion: query.appVersion,
    channel: rolloutChannel,
    featureFlags: definition.featureFlags,
    minSupportedVersion: definition.minSupportedVersion,
    parserConfig: definition.parserConfig,
    dedupeConfig: definition.dedupeConfig,
    platform: query.platform,
    runtimeCompatibility,
    runtimeVersion: normalizeRuntimeVersion(query.runtimeVersion),
    softUpgradeVersion: definition.softUpgradeVersion,
  });

  return `bootstrap-${query.platform}-${rolloutChannel}-${signature}`;
}

export function createBootstrapConfigService(
  repository: BootstrapConfigRepository,
): BootstrapConfigService {
  return {
    getBootstrapConfig(query) {
      const rolloutChannel = query.channel ?? 'production';
      const baseDefinition = repository.readBaseDefinition();
      const definition = mergeDefinition(
        baseDefinition,
        repository.readChannelOverride(rolloutChannel),
      );
      const runtimeCompatibility = buildRuntimeCompatibility(query, definition);
      const parserConfig =
        runtimeCompatibility.compatible
          ? definition.parserConfig
          : {
              ...definition.parserConfig,
              parserKillSwitch: true,
            };
      const responseWithoutSignature: Omit<BootstrapConfigResponse, 'signature'> = {
        cacheTtlSeconds: definition.cacheTtlSeconds,
        configVersion: buildConfigVersion(
          query,
          definition,
          rolloutChannel,
          runtimeCompatibility,
        ),
        copyOverrides: definition.copyOverrides,
        dedupeConfig: definition.dedupeConfig,
        featureFlags: definition.featureFlags,
        minSupportedVersion: definition.minSupportedVersion,
        parserConfig,
        rolloutChannel,
        runtimeCompatibility,
        softUpgradeVersion: definition.softUpgradeVersion,
      };

      return {
        ...responseWithoutSignature,
        signature: createIntegritySignature(responseWithoutSignature),
      };
    },
  };
}
