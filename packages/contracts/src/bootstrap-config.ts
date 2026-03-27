export type BootstrapPlatform = 'android' | 'ios';
export type RolloutChannel = 'beta' | 'internal' | 'production';

export interface BootstrapConfigRequestQuery {
  appVersion: string;
  channel?: RolloutChannel;
  platform: BootstrapPlatform;
  runtimeVersion: string;
}

export interface RuntimeCompatibilityInfo {
  compatible: boolean;
  reason?: string;
}

export interface ParserTemplateConfig {
  enabled: boolean;
  fields: Record<string, string>;
  sourceApps: string[];
  version: string;
}

export interface BootstrapParserConfig {
  parserKillSwitch: boolean;
  templates: Record<string, ParserTemplateConfig>;
}

export interface CaptureDedupeConfig {
  exactMatchWindowSeconds: number;
  fuzzyMatchWindowSeconds: number;
  merchantSimilarityThreshold: number;
}

export interface BootstrapConfigResponse {
  cacheTtlSeconds: number;
  configVersion: string;
  copyOverrides?: Record<string, string>;
  dedupeConfig: CaptureDedupeConfig;
  featureFlags: Record<string, boolean>;
  minSupportedVersion: string;
  parserConfig: BootstrapParserConfig;
  rolloutChannel: RolloutChannel;
  runtimeCompatibility?: RuntimeCompatibilityInfo;
  signature: string;
  softUpgradeVersion?: string;
}
