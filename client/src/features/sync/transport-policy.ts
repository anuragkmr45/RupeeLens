const LOCAL_HOSTNAMES = new Set([
  '127.0.0.1',
  '10.0.2.2',
  'localhost',
]);

export function normalizeTrustedApiBaseUrl(baseUrl: string): string {
  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('Expected a valid API base URL.');
  }

  if (url.protocol === 'https:') {
    return stripTrailingSlash(url);
  }

  if (url.protocol === 'http:' && isAllowedInsecureDevelopmentHost(url.hostname)) {
    return stripTrailingSlash(url);
  }

  throw new Error('Cloud sync requires HTTPS/TLS outside approved local development hosts.');
}

export function sanitizeTrustedApiBaseUrl(baseUrl: string | null): string | null {
  if (!baseUrl) {
    return null;
  }

  try {
    return normalizeTrustedApiBaseUrl(baseUrl);
  } catch {
    return null;
  }
}

function isAllowedInsecureDevelopmentHost(hostname: string): boolean {
  const normalizedHostname = hostname.trim().toLowerCase();

  if (LOCAL_HOSTNAMES.has(normalizedHostname) || normalizedHostname.endsWith('.local')) {
    return true;
  }

  return isPrivateIpv4Address(normalizedHostname);
}

function isPrivateIpv4Address(hostname: string): boolean {
  const octets = hostname.split('.').map((segment) => Number(segment));

  if (
    octets.length !== 4 ||
    octets.some((segment) => !Number.isInteger(segment) || segment < 0 || segment > 255)
  ) {
    return false;
  }

  const firstOctet = octets[0] ?? -1;
  const secondOctet = octets[1] ?? -1;

  return (
    firstOctet === 10 ||
    firstOctet === 127 ||
    (firstOctet === 169 && secondOctet === 254) ||
    (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) ||
    (firstOctet === 192 && secondOctet === 168)
  );
}

function stripTrailingSlash(url: URL): string {
  const normalizedPathname = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${normalizedPathname}`;
}
