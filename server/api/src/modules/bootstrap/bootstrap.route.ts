import type {
  BootstrapConfigRequestQuery,
  BootstrapPlatform,
  RolloutChannel,
} from '@upi-spend-tracker/contracts';
import type { FastifyInstance } from 'fastify';

import type { BootstrapConfigService } from './bootstrap.service.js';

const VALID_PLATFORMS: readonly BootstrapPlatform[] = ['android', 'ios'];
const VALID_CHANNELS: readonly RolloutChannel[] = ['internal', 'beta', 'production'];

function parseBootstrapQuery(query: Record<string, unknown>): BootstrapConfigRequestQuery | null {
  const platform = query.platform;
  const appVersion = query.appVersion;
  const runtimeVersion = query.runtimeVersion;
  const channel = query.channel;

  if (
    typeof platform !== 'string' ||
    !VALID_PLATFORMS.includes(platform as BootstrapPlatform) ||
    typeof appVersion !== 'string' ||
    appVersion.trim().length === 0 ||
    typeof runtimeVersion !== 'string' ||
    runtimeVersion.trim().length === 0
  ) {
    return null;
  }

  if (
    channel !== undefined &&
    (typeof channel !== 'string' || !VALID_CHANNELS.includes(channel as RolloutChannel))
  ) {
    return null;
  }

  return {
    appVersion,
    platform: platform as BootstrapPlatform,
    runtimeVersion,
    ...(channel ? { channel: channel as RolloutChannel } : {}),
  };
}

export function registerBootstrapConfigRoutes(
  app: FastifyInstance,
  service: BootstrapConfigService,
) {
  app.get('/v1/bootstrap/config', async (request, reply) => {
    const parsedQuery = parseBootstrapQuery(request.query as Record<string, unknown>);

    if (!parsedQuery) {
      return reply.status(400).send({
        error: 'Bad Request',
        message:
          'Expected valid platform, appVersion, runtimeVersion, and optional channel query values.',
        statusCode: 400,
      });
    }

    const response = service.getBootstrapConfig(parsedQuery);

    reply.header(
      'Cache-Control',
      `public, max-age=${response.cacheTtlSeconds}, stale-while-revalidate=${Math.min(
        response.cacheTtlSeconds,
        300,
      )}`,
    );
    reply.header('ETag', `"${response.signature}"`);
    reply.header('Vary', 'Accept');

    return response;
  });
}
