import { describe, expect, it, vi } from 'vitest';

import { createWorkerRuntime } from './worker.js';

describe('worker runtime', () => {
  it('logs boot metadata and runs each job immediately', () => {
    const info = vi.fn();
    const runHeartbeat = vi.fn();
    const runtime = createWorkerRuntime({
      jobs: [
        {
          intervalMs: 10_000,
          name: 'heartbeat',
          run: runHeartbeat,
        },
      ],
      logger: {
        info,
      },
    });

    runtime.start();
    runtime.stop();

    expect(info).toHaveBeenCalledWith('worker booted', {
      job_count: 1,
      jobs: [
        {
          interval_ms: 10_000,
          name: 'heartbeat',
        },
      ],
    });
    expect(runHeartbeat).toHaveBeenCalledTimes(1);
  });
});
