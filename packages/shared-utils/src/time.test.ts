import { describe, expect, it } from 'vitest';

import { getCurrentUtcTimestamp, toIsoUtcDateTimeString } from './time.js';

describe('time helpers', () => {
  it('formats ISO timestamps in UTC', () => {
    const timestamp = toIsoUtcDateTimeString(new Date('2026-03-13T00:00:00.000Z'));

    expect(timestamp).toBe('2026-03-13T00:00:00.000Z');
  });

  it('returns a UTC timestamp for the current moment', () => {
    expect(getCurrentUtcTimestamp().endsWith('Z')).toBe(true);
  });
});
