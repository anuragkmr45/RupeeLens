const DEFAULT_API_HOST = '0.0.0.0';
const DEFAULT_API_PORT = 3000;

export interface ApiRuntimeConfig {
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

export function getApiRuntimeConfig(env: NodeJS.ProcessEnv = process.env): ApiRuntimeConfig {
  return {
    host: env.HOST ?? DEFAULT_API_HOST,
    port: parsePort(env.PORT),
  };
}
