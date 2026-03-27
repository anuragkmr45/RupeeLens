import type {
  CaptureDedupeConfig,
  BootstrapParserConfig,
  ParserTemplateConfig,
  RolloutChannel,
} from '@upi-spend-tracker/contracts';

export interface BootstrapConfigDefinition {
  cacheTtlSeconds: number;
  copyOverrides: Record<string, string>;
  dedupeConfig: CaptureDedupeConfig;
  featureFlags: Record<string, boolean>;
  minSupportedVersion: string;
  parserConfig: BootstrapParserConfig;
  softUpgradeVersion: string;
}

export interface BootstrapConfigOverride {
  cacheTtlSeconds?: number;
  copyOverrides?: Record<string, string>;
  dedupeConfig?: Partial<CaptureDedupeConfig>;
  featureFlags?: Record<string, boolean>;
  parserConfig?: {
    parserKillSwitch?: boolean;
    templates?: Record<string, ParserTemplateConfig>;
  };
}

export interface BootstrapConfigRepository {
  readBaseDefinition(): BootstrapConfigDefinition;
  readChannelOverride(channel: RolloutChannel): BootstrapConfigOverride;
}

const BASE_PARSER_TEMPLATES: Record<string, ParserTemplateConfig> = {
  generic_upi_v1: {
    enabled: true,
    fields: {
      amount: '(?:rs\\.?|inr)?\\s?(?<amount>[\\d,]+(?:\\.\\d{1,2})?)',
      merchant: '(?:to|at)\\s(?<merchant>[A-Za-z0-9 &._-]+)',
      reference: '(?:ref|utr)[:\\s-]*(?<reference>[A-Za-z0-9-]{6,})',
    },
    sourceApps: ['google_pay', 'phonepe', 'paytm', 'bhim'],
    version: '1.0.0',
  },
  merchant_first_v1: {
    enabled: true,
    fields: {
      amount: '(?<amount>[\\d,]+(?:\\.\\d{1,2})?)',
      merchant: '(?<merchant>[A-Za-z0-9 &._-]+)(?:\\s+received|\\s+paid)',
    },
    sourceApps: ['phonepe', 'paytm'],
    version: '1.0.0',
  },
};

const BASE_DEFINITION: BootstrapConfigDefinition = {
  cacheTtlSeconds: 900,
  copyOverrides: {
    home_remote_config_status:
      'Using the stable production bootstrap config. Remote refresh keeps feature flags and parser templates current without a native release.',
  },
  dedupeConfig: {
    exactMatchWindowSeconds: 120,
    fuzzyMatchWindowSeconds: 300,
    merchantSimilarityThreshold: 0.88,
  },
  featureFlags: {
    budgets_enabled: false,
    notification_capture_enabled: true,
    search_enabled: false,
    showcase_enabled: false,
  },
  minSupportedVersion: '0.0.0',
  parserConfig: {
    parserKillSwitch: false,
    templates: BASE_PARSER_TEMPLATES,
  },
  softUpgradeVersion: '0.1.0',
};

const MERCHANT_FIRST_TEMPLATE = BASE_PARSER_TEMPLATES.merchant_first_v1!;

const CHANNEL_OVERRIDES: Record<RolloutChannel, BootstrapConfigOverride> = {
  beta: {
    cacheTtlSeconds: 600,
    copyOverrides: {
      home_remote_config_status:
        'Beta rollout keeps the same safe defaults but enables more visibility for staged testing.',
    },
    dedupeConfig: {
      merchantSimilarityThreshold: 0.84,
    },
    featureFlags: {
      search_enabled: true,
      showcase_enabled: true,
    },
  },
  internal: {
    cacheTtlSeconds: 300,
    copyOverrides: {
      home_remote_config_status:
        'Internal rollout enables showcase access and an experimental parser template for fast QA loops.',
    },
    dedupeConfig: {
      exactMatchWindowSeconds: 90,
      fuzzyMatchWindowSeconds: 420,
      merchantSimilarityThreshold: 0.8,
    },
    featureFlags: {
      search_enabled: true,
      showcase_enabled: true,
    },
    parserConfig: {
      templates: {
        experimental_upi_v2: {
          enabled: true,
          fields: {
            amount: '(?:debited|paid)\\s+(?<amount>[\\d,]+(?:\\.\\d{1,2})?)',
            merchant: '(?:towards|to)\\s(?<merchant>[A-Za-z0-9 &._-]+)',
          },
          sourceApps: ['google_pay', 'phonepe'],
          version: '2.0.0',
        },
      },
    },
  },
  production: {
    parserConfig: {
      templates: {
        merchant_first_v1: {
          enabled: false,
          fields: MERCHANT_FIRST_TEMPLATE.fields,
          sourceApps: MERCHANT_FIRST_TEMPLATE.sourceApps,
          version: MERCHANT_FIRST_TEMPLATE.version,
        },
      },
    },
  },
};

export function createBootstrapConfigRepository(): BootstrapConfigRepository {
  return {
    readBaseDefinition() {
      return BASE_DEFINITION;
    },
    readChannelOverride(channel) {
      return CHANNEL_OVERRIDES[channel];
    },
  };
}
