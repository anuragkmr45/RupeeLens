import { describe, expect, it } from 'vitest';

import { createIntegritySignature, stableSerializeForSignature } from './integrity.js';

describe('integrity helpers', () => {
  it('serializes objects with a stable key order', () => {
    expect(
      stableSerializeForSignature({
        zebra: true,
        alpha: 'first',
        nested: {
          second: 2,
          first: 1,
        },
      }),
    ).toBe('{"alpha":"first","nested":{"first":1,"second":2},"zebra":true}');
  });

  it('creates the same signature for the same logical payload', () => {
    const left = createIntegritySignature({
      alpha: 1,
      beta: {
        enabled: true,
        templates: ['generic_upi_v1'],
      },
    });
    const right = createIntegritySignature({
      beta: {
        templates: ['generic_upi_v1'],
        enabled: true,
      },
      alpha: 1,
    });

    expect(left).toBe(right);
  });

  it('changes the signature when the payload changes', () => {
    expect(createIntegritySignature({ enabled: true })).not.toBe(
      createIntegritySignature({ enabled: false }),
    );
  });
});
