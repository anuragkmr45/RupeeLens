import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

export const DEFAULT_BOOTSTRAP_SIGNING_PUBLIC_KEY =
  'TUbjlttlBOrFXx-Yu5cjBDktSmLV3Io0lsFCcz1Wl1k';

function compareJsonValues(left: unknown, right: unknown): number {
  const leftString = canonicalizeJson(left);
  const rightString = canonicalizeJson(right);

  if (leftString === rightString) {
    return 0;
  }

  return leftString < rightString ? -1 : 1;
}

export function canonicalizeJson(value: unknown): string {
  if (value === undefined) {
    throw new Error('Cannot canonicalize undefined values.');
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalizeJson(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return compareJsonValues(leftValue, rightValue);
      }

      return leftKey < rightKey ? -1 : 1;
    });

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalizeJson(entryValue)}`)
    .join(',')}}`;
}

export function getBootstrapContentHash(payload: unknown): string {
  return bytesToHex(sha256(utf8ToBytes(canonicalizeJson(payload))));
}

function parseVersionSegments(version: string): number[] {
  const segments = version.match(/\d+/g);

  if (!segments) {
    return [0];
  }

  return segments.map((segment) => Number.parseInt(segment, 10));
}

export function compareDottedVersions(left: string, right: string): number {
  const leftSegments = parseVersionSegments(left);
  const rightSegments = parseVersionSegments(right);
  const length = Math.max(leftSegments.length, rightSegments.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftSegments[index] ?? 0;
    const rightValue = rightSegments[index] ?? 0;

    if (leftValue === rightValue) {
      continue;
    }

    return leftValue < rightValue ? -1 : 1;
  }

  return 0;
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const chunk =
      (first << 16) |
      ((second ?? 0) << 8) |
      (third ?? 0);

    encoded += alphabet[(chunk >> 18) & 63] ?? '';
    encoded += alphabet[(chunk >> 12) & 63] ?? '';
    encoded += second === undefined ? '=' : alphabet[(chunk >> 6) & 63] ?? '';
    encoded += third === undefined ? '=' : alphabet[chunk & 63] ?? '';
  }

  return encoded;
}

function base64ToBytes(value: string): Uint8Array {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const cleaned = value.replaceAll(/\s+/g, '');

  if (cleaned.length % 4 !== 0) {
    throw new Error('Invalid base64 string length.');
  }

  const bytes: number[] = [];

  for (let index = 0; index < cleaned.length; index += 4) {
    const chars = cleaned.slice(index, index + 4);
    const values = chars.split('').map((character) => {
      if (character === '=') {
        return 0;
      }

      const alphabetIndex = alphabet.indexOf(character);

      if (alphabetIndex === -1) {
        throw new Error(`Invalid base64 character: ${character}`);
      }

      return alphabetIndex;
    });

    const [value0, value1, value2, value3] = values as [
      number,
      number,
      number,
      number,
    ];
    const chunk =
      (value0 << 18) |
      (value1 << 12) |
      (value2 << 6) |
      value3;

    bytes.push((chunk >> 16) & 255);

    if (chars[2] !== '=') {
      bytes.push((chunk >> 8) & 255);
    }

    if (chars[3] !== '=') {
      bytes.push(chunk & 255);
    }
  }

  return Uint8Array.from(bytes);
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

export function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const paddingLength = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);

  return base64ToBytes(`${normalized}${'='.repeat(paddingLength)}`);
}

function getPayloadBytes(payload: unknown | string): Uint8Array {
  return utf8ToBytes(
    typeof payload === 'string' ? payload : canonicalizeJson(payload),
  );
}

export function signEd25519Payload(
  payload: unknown | string,
  privateKeyBase64Url: string,
): string {
  return bytesToBase64Url(
    ed25519.sign(
      getPayloadBytes(payload),
      base64UrlToBytes(privateKeyBase64Url),
    ),
  );
}

export function verifyEd25519Signature(
  payload: unknown | string,
  signatureBase64Url: string,
  publicKeyBase64Url = DEFAULT_BOOTSTRAP_SIGNING_PUBLIC_KEY,
): boolean {
  return ed25519.verify(
    base64UrlToBytes(signatureBase64Url),
    getPayloadBytes(payload),
    base64UrlToBytes(publicKeyBase64Url),
  );
}
