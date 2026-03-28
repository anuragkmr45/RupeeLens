import path from 'node:path';

const DEFAULT_API_HOST = '0.0.0.0';
const DEFAULT_API_PORT = 3000;
const DEFAULT_SESSION_STORE_FILE = path.resolve(process.cwd(), '.local', 'sessions-store.json');

export interface ApiRuntimeConfig {
  host: string;
  port: number;
  sessionStoreFile: string;
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

function parseSessionStoreFile(value: string | undefined): string {
  if (!value) {
    return DEFAULT_SESSION_STORE_FILE;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0
    ? path.resolve(trimmedValue)
    : DEFAULT_SESSION_STORE_FILE;
}

export function getApiRuntimeConfig(env: NodeJS.ProcessEnv = process.env): ApiRuntimeConfig {
  return {
    host: env.HOST ?? DEFAULT_API_HOST,
    port: parsePort(env.PORT),
    sessionStoreFile: parseSessionStoreFile(env.API_SESSION_STORE_FILE),
  };
}
