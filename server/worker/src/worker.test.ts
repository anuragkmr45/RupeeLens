import { describe, expect, it, vi } from 'vitest';

import { createWorkerRuntime } from './worker.js';

describe('worker runtime', () => {
  it('logs boot and an immediate heartbeat', () => {
    const info = vi.fn();
    const runtime = createWorkerRuntime({
      intervalMs: 10_000,
      logger: {
        info,
      },
    });

    runtime.start();
    runtime.stop();

    expect(info).toHaveBeenCalledWith('worker booted', {
      heartbeat_interval_ms: 10_000,
    });
    expect(info).toHaveBeenCalledWith(
      'worker heartbeat',
      expect.objectContaining({
        service: 'worker',
      }),
    );
  });
});
