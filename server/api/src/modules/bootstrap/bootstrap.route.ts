import {
  type BootstrapConfigQuery,
  type ClientPlatform,
  type RolloutChannel,
} from '@upi-spend-tracker/contracts';
import type { FastifyInstance } from 'fastify';

import type { ApiRuntimeConfig } from '../../lib/env.js';
import { getBootstrapResponse } from './bootstrap.service.js';

const validChannels = new Set<RolloutChannel>(['internal', 'beta', 'production']);
const validPlatforms = new Set<ClientPlatform>(['android', 'ios']);

function parseBootstrapConfigQuery(
  query: Record<string, unknown>,
): BootstrapConfigQuery | null {
  const platform = typeof query.platform === 'string' ? query.platform : null;
  const appVersion = typeof query.appVersion === 'string' ? query.appVersion : null;
  const runtimeVersion =
    typeof query.runtimeVersion === 'string' ? query.runtimeVersion : null;
  const channel =
    typeof query.channel === 'string' ? query.channel : undefined;

  if (!platform || !appVersion || !runtimeVersion) {
    return null;
  }

  if (!validPlatforms.has(platform as ClientPlatform)) {
    return null;
  }

  if (channel && !validChannels.has(channel as RolloutChannel)) {
    return null;
  }

  const parsedQuery: BootstrapConfigQuery = {
    appVersion,
    platform: platform as ClientPlatform,
    runtimeVersion,
  };

  if (channel) {
    parsedQuery.channel = channel as RolloutChannel;
  }

  return parsedQuery;
}

export function registerBootstrapRoutes(
  app: FastifyInstance,
  config: Pick<ApiRuntimeConfig, 'bootstrapProfile' | 'bootstrapSigningPrivateKey'>,
) {
  app.get('/v1/bootstrap/config', async (request, reply) => {
    const parsedQuery = parseBootstrapConfigQuery(
      request.query as Record<string, unknown>,
    );

    if (!parsedQuery) {
      return reply.code(400).send({
        message:
          'Expected platform, appVersion, and runtimeVersion query parameters with an optional channel of internal, beta, or production.',
      });
    }

    const responseEnvelope = getBootstrapResponse(parsedQuery, {
      profileName: config.bootstrapProfile,
      signingPrivateKey: config.bootstrapSigningPrivateKey,
    });

    return reply
      .header('X-Bootstrap-Content-Hash', responseEnvelope.contentHash)
      .header('X-Bootstrap-Signature', responseEnvelope.signature)
      .send(responseEnvelope.response);
  });
}
