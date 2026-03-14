import {
  DEFAULT_BOOTSTRAP_SIGNING_PUBLIC_KEY,
  verifyEd25519Signature,
} from '@upi-spend-tracker/shared-utils';
import { describe, expect, it } from 'vitest';

import { DEFAULT_DEV_BOOTSTRAP_SIGNING_PRIVATE_KEY } from './bootstrap.keys.js';
import { getBootstrapResponse } from './bootstrap.service.js';

describe('bootstrap service', () => {
  it('defaults the channel to internal and returns a signed config envelope', () => {
    const envelope = getBootstrapResponse(
      {
        appVersion: '1.0.0',
        platform: 'android',
        runtimeVersion: '1.0.0',
      },
      {
        profileName: 'dev',
        signingPrivateKey: DEFAULT_DEV_BOOTSTRAP_SIGNING_PRIVATE_KEY,
      },
    );

    expect(envelope.response.rolloutChannel).toBe('internal');
    expect(envelope.response.runtimeCompatibility?.compatible).toBe(true);
    expect(
      verifyEd25519Signature(
        envelope.response,
        envelope.signature,
        DEFAULT_BOOTSTRAP_SIGNING_PUBLIC_KEY,
      ),
    ).toBe(true);
    expect(envelope.contentHash).toHaveLength(64);
  });

  it('marks the response incompatible when runtime version is not allowlisted', () => {
    const envelope = getBootstrapResponse(
      {
        appVersion: '1.0.0',
        channel: 'beta',
        platform: 'android',
        runtimeVersion: '2.0.0',
      },
      {
        profileName: 'dev',
        signingPrivateKey: DEFAULT_DEV_BOOTSTRAP_SIGNING_PRIVATE_KEY,
      },
    );

    expect(envelope.response.rolloutChannel).toBe('beta');
    expect(envelope.response.runtimeCompatibility).toEqual({
      compatible: false,
      reason: 'runtime_version_not_supported',
    });
    expect(envelope.response.featureFlags['feature.sync']).toBe(true);
  });

  it('kills parser execution for non-android platforms in the foundation profile', () => {
    const envelope = getBootstrapResponse(
      {
        appVersion: '1.0.0',
        channel: 'production',
        platform: 'ios',
        runtimeVersion: '1.0.0',
      },
      {
        profileName: 'dev',
        signingPrivateKey: DEFAULT_DEV_BOOTSTRAP_SIGNING_PRIVATE_KEY,
      },
    );

    expect(envelope.response.parserConfig.globalKillSwitch).toBe(true);
  });
});
