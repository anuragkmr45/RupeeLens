import { describe, expect, it } from 'vitest';

import type {
  BootstrapConfigResponse,
  BootstrapConfigQuery,
} from './bootstrap.js';

describe('bootstrap contract', () => {
  it('supports the SET-006 bootstrap config response shape', () => {
    const response: BootstrapConfigResponse = {
      cacheTtlSeconds: 300,
      configVersion: 'dev-2026-03-14',
      featureFlags: {
        'feature.capture_android_listener': false,
      },
      minSupportedVersion: '1.0.0',
      parserConfig: {
        globalKillSwitch: false,
        parserAssignments: {
          'upi.generic': {
            enabled: true,
            templateId: 'upi-generic-v1',
          },
        },
        parserTemplates: {
          'upi-generic-v1': {
            amountPattern: 'INR\\s?(\\d+)',
          },
        },
      },
      rolloutChannel: 'internal',
      runtimeCompatibility: {
        compatible: true,
      },
      softUpgradeVersion: '1.1.0',
    };

    expect(response.parserConfig.globalKillSwitch).toBe(false);
    expect(response.rolloutChannel).toBe('internal');
  });

  it('supports the bootstrap request query shape', () => {
    const query: BootstrapConfigQuery = {
      appVersion: '1.0.0',
      channel: 'internal',
      platform: 'android',
      runtimeVersion: '1.0.0',
    };

    expect(query.platform).toBe('android');
  });
});
