import { describe, expect, it } from 'vitest';

import { createIntegritySignature } from '@upi-spend-tracker/shared-utils';

import { createBootstrapConfigRepository } from './bootstrap.repository.js';
import { createBootstrapConfigService } from './bootstrap.service.js';

describe('bootstrap config service', () => {
  const service = createBootstrapConfigService(createBootstrapConfigRepository());

  it('applies rollout-channel overrides', () => {
    const response = service.getBootstrapConfig({
      appVersion: '0.2.0',
      channel: 'internal',
      platform: 'android',
      runtimeVersion: 'sdk-55-shell',
    });

    expect(response.rolloutChannel).toBe('internal');
    expect(response.featureFlags.showcase_enabled).toBe(true);
    expect(response.dedupeConfig.exactMatchWindowSeconds).toBe(90);
    expect(response.dedupeConfig.fuzzyMatchWindowSeconds).toBe(420);
    expect(response.dedupeConfig.merchantSimilarityThreshold).toBe(0.8);
    expect(response.parserConfig.templates.experimental_upi_v2?.enabled).toBe(true);
  });

  it('marks incompatible versions and forces the parser kill switch', () => {
    const response = service.getBootstrapConfig({
      appVersion: '0.2.0',
      channel: 'production',
      platform: 'android',
      runtimeVersion: 'expo-sdk-54-go',
    });

    expect(response.runtimeCompatibility?.compatible).toBe(false);
    expect(response.runtimeCompatibility?.reason).toContain('expo-sdk-54-go');
    expect(response.parserConfig.parserKillSwitch).toBe(true);
  });

  it('keeps compatible runtimes but recommends soft upgrades for older app versions', () => {
    const response = service.getBootstrapConfig({
      appVersion: '0.0.0-alpha',
      channel: 'production',
      platform: 'android',
      runtimeVersion: 'sdk-55-shell',
    });

    expect(response.runtimeCompatibility?.compatible).toBe(true);
    expect(response.runtimeCompatibility?.reason).toContain('Upgrade recommended');
  });

  it('varies configVersion by runtime-compatibility inputs', () => {
    const compatibleResponse = service.getBootstrapConfig({
      appVersion: '0.2.0',
      channel: 'beta',
      platform: 'ios',
      runtimeVersion: 'expo-sdk-55-dev-client',
    });
    const incompatibleResponse = service.getBootstrapConfig({
      appVersion: '0.2.0',
      channel: 'beta',
      platform: 'ios',
      runtimeVersion: 'expo-sdk-54-go',
    });

    expect(compatibleResponse.configVersion).not.toBe(incompatibleResponse.configVersion);
  });

  it('signs the final config payload deterministically', () => {
    const response = service.getBootstrapConfig({
      appVersion: '0.2.0',
      channel: 'beta',
      platform: 'ios',
      runtimeVersion: 'sdk-55-shell',
    });
    const { signature, ...unsignedResponse } = response;

    expect(signature).toBe(createIntegritySignature(unsignedResponse));
  });
});
