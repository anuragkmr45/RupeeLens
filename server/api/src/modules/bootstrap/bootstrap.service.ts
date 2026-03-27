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
    softUpgradeVersion: base.softUpgradeVersion,
  };
}

function buildRuntimeCompatibility(
  appVersion: string,
  minSupportedVersion: string,
  softUpgradeVersion: string,
) {
  if (compareVersionStrings(appVersion, minSupportedVersion) < 0) {
    return {
      compatible: false,
      reason: `Upgrade required to at least ${minSupportedVersion}.`,
    };
  }

  if (compareVersionStrings(appVersion, softUpgradeVersion) < 0) {
    return {
      compatible: true,
      reason: `Upgrade recommended to ${softUpgradeVersion} for the latest parser config.`,
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
): string {
  const signature = createIntegritySignature({
    channel: rolloutChannel,
    featureFlags: definition.featureFlags,
    minSupportedVersion: definition.minSupportedVersion,
    parserConfig: definition.parserConfig,
    dedupeConfig: definition.dedupeConfig,
    platform: query.platform,
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
      const runtimeCompatibility = buildRuntimeCompatibility(
        query.appVersion,
        definition.minSupportedVersion,
        definition.softUpgradeVersion,
      );
      const parserConfig =
        runtimeCompatibility.compatible
          ? definition.parserConfig
          : {
              ...definition.parserConfig,
              parserKillSwitch: true,
            };
      const responseWithoutSignature: Omit<BootstrapConfigResponse, 'signature'> = {
        cacheTtlSeconds: definition.cacheTtlSeconds,
        configVersion: buildConfigVersion(query, definition, rolloutChannel),
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
