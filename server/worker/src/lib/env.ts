const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;

export interface WorkerRuntimeConfig {
  heartbeatIntervalMs: number;
}

function parseIntervalMs(value: string | undefined): number {
  if (!value) {
    return DEFAULT_HEARTBEAT_INTERVAL_MS;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_HEARTBEAT_INTERVAL_MS;
  }

  return parsed;
}

export function getWorkerRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): WorkerRuntimeConfig {
  return {
    heartbeatIntervalMs: parseIntervalMs(env.WORKER_HEARTBEAT_INTERVAL_MS),
  };
}
