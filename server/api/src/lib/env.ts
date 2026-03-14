import { DEFAULT_DEV_BOOTSTRAP_SIGNING_PRIVATE_KEY } from '../modules/bootstrap/bootstrap.keys.js';

const DEFAULT_API_HOST = '0.0.0.0';
const DEFAULT_API_PORT = 3000;

export interface ApiRuntimeConfig {
  bootstrapProfile: 'dev' | 'test';
  bootstrapSigningPrivateKey: string;
  host: string;
  port: number;
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

function parseBootstrapProfile(
  env: NodeJS.ProcessEnv,
): 'dev' | 'test' {
  const profile =
    env.BOOTSTRAP_CONFIG_PROFILE ?? (env.NODE_ENV === 'test' ? 'test' : 'dev');

  return profile === 'test' ? 'test' : 'dev';
}

export function getApiRuntimeConfig(env: NodeJS.ProcessEnv = process.env): ApiRuntimeConfig {
  const bootstrapProfile = parseBootstrapProfile(env);

  return {
    bootstrapProfile,
    bootstrapSigningPrivateKey:
      env.BOOTSTRAP_SIGNING_PRIVATE_KEY ??
      DEFAULT_DEV_BOOTSTRAP_SIGNING_PRIVATE_KEY,
    host: env.HOST ?? DEFAULT_API_HOST,
    port: parsePort(env.PORT),
  };
}
