import type { JsonObject } from '@upi-spend-tracker/shared-types';

export const BOOTSTRAP_CONTENT_HASH_HEADER = 'x-bootstrap-content-hash';
export const BOOTSTRAP_SIGNATURE_HEADER = 'x-bootstrap-signature';

export type ClientPlatform = 'android' | 'ios';
export type RolloutChannel = 'internal' | 'beta' | 'production';

export interface BootstrapConfigQuery {
  appVersion: string;
  channel?: RolloutChannel;
  platform: ClientPlatform;
  runtimeVersion: string;
}

export interface RuntimeCompatibility {
  compatible: boolean;
  reason?: string;
}

export interface ParserAssignment {
  enabled: boolean;
  templateId?: string;
}

export interface ParserConfig {
  globalKillSwitch: boolean;
  parserAssignments: Record<string, ParserAssignment>;
  parserTemplates: Record<string, JsonObject>;
}

export interface BootstrapConfigResponse {
  cacheTtlSeconds: number;
  configVersion: string;
  copyOverrides?: Record<string, string>;
  featureFlags: Record<string, boolean>;
  minSupportedVersion: string;
  parserConfig: ParserConfig;
  rolloutChannel?: RolloutChannel;
  runtimeCompatibility?: RuntimeCompatibility;
  softUpgradeVersion?: string;
}
