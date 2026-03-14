import type {
  BootstrapConfigResponse,
  ClientPlatform,
  ParserConfig,
  RolloutChannel,
} from '@upi-spend-tracker/contracts';

export type BootstrapProfileName = 'dev' | 'test';

type BootstrapProfileConfig = Omit<
  BootstrapConfigResponse,
  'rolloutChannel' | 'runtimeCompatibility'
> & {
  allowedRuntimeVersions: readonly string[];
};

const baseParserConfig: ParserConfig = {
  globalKillSwitch: false,
  parserAssignments: {
    'upi.generic': {
      enabled: true,
      templateId: 'upi-generic-v1',
    },
    'upi.googlepay': {
      enabled: true,
      templateId: 'upi-googlepay-v1',
    },
  },
  parserTemplates: {
    'upi-generic-v1': {
      amountPattern: '(?:INR|Rs\\.?|₹)\\s?(\\d+(?:\\.\\d{2})?)',
      keywords: ['debited', 'paid', 'spent'],
      merchantHintStrategy: 'suffix_tokens',
      timestampSource: 'notification_post_time',
    },
    'upi-googlepay-v1': {
      amountPattern: '₹\\s?(\\d+(?:\\.\\d{2})?)',
      keywords: ['bank transfer', 'UPI', 'paid'],
      merchantHintStrategy: 'neighbor_tokens',
      timestampSource: 'notification_post_time',
    },
  },
};

const baseFeatureFlags = {
  'feature.capture_android_listener': true,
  'feature.remote_parser_config': true,
  'feature.sync': false,
} as const;

const baseCopyOverrides = {
  configBanner: 'Remote config foundation active',
} as const;

const baseProfiles = {
  dev: {
    allowedRuntimeVersions: ['1.0.0'],
    cacheTtlSeconds: 300,
    configVersion: 'dev-2026-03-14',
    copyOverrides: {
      ...baseCopyOverrides,
      configBanner: 'Remote config foundation active (dev)',
    },
    featureFlags: {
      ...baseFeatureFlags,
    },
    minSupportedVersion: '1.0.0',
    parserConfig: {
      ...baseParserConfig,
      parserAssignments: {
        ...baseParserConfig.parserAssignments,
      },
      parserTemplates: {
        ...baseParserConfig.parserTemplates,
      },
    },
    softUpgradeVersion: '1.1.0',
  },
  test: {
    allowedRuntimeVersions: ['1.0.0', 'test-runtime'],
    cacheTtlSeconds: 30,
    configVersion: 'test-2026-03-14',
    copyOverrides: {
      ...baseCopyOverrides,
      configBanner: 'Remote config foundation active (test)',
    },
    featureFlags: {
      ...baseFeatureFlags,
      'feature.capture_android_listener': false,
    },
    minSupportedVersion: '1.0.0',
    parserConfig: {
      ...baseParserConfig,
      parserAssignments: {
        ...baseParserConfig.parserAssignments,
      },
      parserTemplates: {
        ...baseParserConfig.parserTemplates,
      },
    },
    softUpgradeVersion: '1.0.1',
  },
} as const satisfies Record<BootstrapProfileName, BootstrapProfileConfig>;

const channelOverrides = {
  dev: {
    beta: {
      featureFlags: {
        'feature.sync': true,
      },
    },
    internal: {},
    production: {
      parserConfig: {
        parserAssignments: {
          'upi.googlepay': {
            enabled: false,
            templateId: 'upi-googlepay-v1',
          },
        },
      },
    },
  },
  test: {
    beta: {
      featureFlags: {
        'feature.sync': true,
      },
    },
    internal: {},
    production: {
      cacheTtlSeconds: 120,
    },
  },
} as const satisfies Record<
  BootstrapProfileName,
  Record<
    RolloutChannel,
    Partial<
      Pick<BootstrapProfileConfig, 'cacheTtlSeconds' | 'copyOverrides' | 'featureFlags'> & {
        parserConfig: Partial<ParserConfig>;
      }
    >
  >
>;

function resolvePlatformParserConfig(
  platform: ClientPlatform,
  parserConfig: ParserConfig,
): ParserConfig {
  if (platform === 'android') {
    return parserConfig;
  }

  return {
    ...parserConfig,
    globalKillSwitch: true,
  };
}

export function getBootstrapProfileConfig(
  profileName: BootstrapProfileName,
  channel: RolloutChannel,
  platform: ClientPlatform,
): BootstrapProfileConfig {
  const baseProfile = baseProfiles[profileName];
  const override = channelOverrides[profileName][channel];
  const overrideFeatureFlags =
    'featureFlags' in override ? override.featureFlags : undefined;
  const overrideParserConfig =
    'parserConfig' in override ? override.parserConfig : undefined;
  const overrideCopyOverrides =
    'copyOverrides' in override ? override.copyOverrides : undefined;
  const overrideCacheTtlSeconds =
    'cacheTtlSeconds' in override ? override.cacheTtlSeconds : undefined;
  const overrideParserAssignments = overrideParserConfig?.parserAssignments ?? {};
  const overrideParserTemplates =
    overrideParserConfig && 'parserTemplates' in overrideParserConfig
      ? overrideParserConfig.parserTemplates ?? {}
      : {};
  const featureFlags = {
    ...baseProfile.featureFlags,
    ...overrideFeatureFlags,
  };
  const parserConfig = resolvePlatformParserConfig(platform, {
    ...baseProfile.parserConfig,
    ...overrideParserConfig,
    parserAssignments: {
      ...baseProfile.parserConfig.parserAssignments,
      ...overrideParserAssignments,
    },
    parserTemplates: {
      ...baseProfile.parserConfig.parserTemplates,
      ...overrideParserTemplates,
    },
  });

  return {
    ...baseProfile,
    copyOverrides: {
      ...baseProfile.copyOverrides,
      ...(overrideCopyOverrides ?? {}),
    },
    cacheTtlSeconds: overrideCacheTtlSeconds ?? baseProfile.cacheTtlSeconds,
    featureFlags,
    parserConfig,
  };
}
