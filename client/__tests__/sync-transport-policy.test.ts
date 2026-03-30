import {
  normalizeTrustedApiBaseUrl,
  sanitizeTrustedApiBaseUrl,
} from '../src/features/sync/transport-policy';

describe('sync transport policy', () => {
  it('allows HTTPS API origins', () => {
    expect(normalizeTrustedApiBaseUrl('https://api.example.com/')).toBe(
      'https://api.example.com',
    );
  });

  it('allows local HTTP development origins', () => {
    expect(normalizeTrustedApiBaseUrl('http://localhost:3000/')).toBe(
      'http://localhost:3000',
    );
    expect(normalizeTrustedApiBaseUrl('http://192.168.0.10:3000')).toBe(
      'http://192.168.0.10:3000',
    );
  });

  it('rejects insecure remote HTTP origins', () => {
    expect(() => normalizeTrustedApiBaseUrl('http://api.example.com')).toThrow(
      'Cloud sync requires HTTPS/TLS outside approved local development hosts.',
    );
  });

  it('sanitizes invalid or insecure stored origins to null', () => {
    expect(sanitizeTrustedApiBaseUrl('http://api.example.com')).toBeNull();
    expect(sanitizeTrustedApiBaseUrl('not-a-url')).toBeNull();
    expect(sanitizeTrustedApiBaseUrl(null)).toBeNull();
  });
});
