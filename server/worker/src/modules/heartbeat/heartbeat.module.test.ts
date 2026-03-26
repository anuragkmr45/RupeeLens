import { describe, expect, it, vi } from 'vitest';

import { createHeartbeatModule } from './heartbeat.module.js';

describe('heartbeat module', () => {
  it('creates a scheduled worker job from repository and service seams', () => {
    const info = vi.fn();
    const module = createHeartbeatModule({
      intervalMs: 15_000,
      logger: {
        info,
      },
      now: () => '2026-03-26T00:00:00.000Z',
    });

    expect(module.name).toBe('heartbeat');
    expect(module.jobs).toHaveLength(1);

    module.jobs[0]?.run();

    expect(info).toHaveBeenCalledWith('worker heartbeat', {
      service: 'worker',
      timestamp_utc: '2026-03-26T00:00:00.000Z',
    });
  });
});
