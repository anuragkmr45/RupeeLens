import { describe, expect, it } from 'vitest';

import { compareVersionStrings, isVersionAtLeast } from './version.js';

describe('version helpers', () => {
  it('compares numeric version segments', () => {
    expect(compareVersionStrings('1.2.0', '1.1.9')).toBe(1);
    expect(compareVersionStrings('1.2.0', '1.2.0')).toBe(0);
    expect(compareVersionStrings('1.2.0', '1.2.1')).toBe(-1);
  });

  it('treats non-numeric suffixes as the same numeric segment', () => {
    expect(compareVersionStrings('1.2.0-dev', '1.2.0')).toBe(0);
    expect(compareVersionStrings('1.2.1-beta', '1.2.0')).toBe(1);
  });

  it('checks version minimums', () => {
    expect(isVersionAtLeast('2.0.0', '1.9.9')).toBe(true);
    expect(isVersionAtLeast('1.0.0', '1.0.1')).toBe(false);
  });
});
