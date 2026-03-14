import { ed25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import {
  base64UrlToBytes,
  bytesToBase64Url,
  canonicalizeJson,
  compareDottedVersions,
  getBootstrapContentHash,
  signEd25519Payload,
  verifyEd25519Signature,
} from './bootstrap.js';

const testPrivateKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const testPublicKey = bytesToBase64Url(
  ed25519.getPublicKey(base64UrlToBytes(testPrivateKey)),
);

describe('bootstrap helpers', () => {
  it('canonicalizes json with stable key ordering', () => {
    expect(
      canonicalizeJson({
        b: true,
        a: {
          y: 2,
          x: 1,
        },
      }),
    ).toBe('{"a":{"x":1,"y":2},"b":true}');
  });

  it('produces a stable bootstrap content hash', () => {
    const payload = {
      featureFlags: {
        foo: true,
      },
    };

    expect(getBootstrapContentHash(payload)).toHaveLength(64);
    expect(getBootstrapContentHash(payload)).toBe(getBootstrapContentHash(payload));
  });

  it('compares dotted versions numerically', () => {
    expect(compareDottedVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareDottedVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
    expect(compareDottedVersions('1.2.0', '1.10.0')).toBeLessThan(0);
  });

  it('signs and verifies ed25519 payloads', () => {
    const payload = {
      configVersion: 'dev-2026-03-14',
    };
    const signature = signEd25519Payload(payload, testPrivateKey);

    expect(verifyEd25519Signature(payload, signature, testPublicKey)).toBe(true);
    expect(
      verifyEd25519Signature(
        {
          configVersion: 'other',
        },
        signature,
        testPublicKey,
      ),
    ).toBe(false);
  });
});
