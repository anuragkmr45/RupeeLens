const DEFAULT_SERVER_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:56432/upi_spend_tracker';

export function getServerDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env.SERVER_DATABASE_URL ?? DEFAULT_SERVER_DATABASE_URL;
}
