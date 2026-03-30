import path from 'node:path';

const DEFAULT_API_HOST = '0.0.0.0';
const DEFAULT_API_PORT = 3000;
const DEFAULT_DOMAIN_STORE_FILE = path.resolve(process.cwd(), '.local', 'domain-store.json');
const DEFAULT_SESSION_STORE_FILE = path.resolve(process.cwd(), '.local', 'sessions-store.json');
const DEFAULT_SYNC_STORE_FILE = path.resolve(process.cwd(), '.local', 'sync-store.json');
const DEFAULT_TELEMETRY_STORE_FILE = path.resolve(process.cwd(), '.local', 'telemetry-store.json');

export interface ApiRuntimeConfig {
  domainStoreFile: string;
  host: string;
  port: number;
  sessionStoreFile: string;
  syncStoreFile: string;
  telemetryStoreFile: string;
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_API_PORT;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_API_PORT;
  }

  return parsed;
}

function parseStoreFile(value: string | undefined, fallbackValue: string): string {
  if (!value) {
    return fallbackValue;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0
    ? path.resolve(trimmedValue)
    : fallbackValue;
}

export function getApiRuntimeConfig(env: NodeJS.ProcessEnv = process.env): ApiRuntimeConfig {
  return {
    domainStoreFile: parseStoreFile(env.API_DOMAIN_STORE_FILE, DEFAULT_DOMAIN_STORE_FILE),
    host: env.HOST ?? DEFAULT_API_HOST,
    port: parsePort(env.PORT),
    sessionStoreFile: parseStoreFile(env.API_SESSION_STORE_FILE, DEFAULT_SESSION_STORE_FILE),
    syncStoreFile: parseStoreFile(env.API_SYNC_STORE_FILE, DEFAULT_SYNC_STORE_FILE),
    telemetryStoreFile: parseStoreFile(env.API_TELEMETRY_STORE_FILE, DEFAULT_TELEMETRY_STORE_FILE),
  };
}
