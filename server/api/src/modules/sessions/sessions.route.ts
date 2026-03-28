import type {
  ConsumePairingCodeRequest,
  CreateGuestSessionRequest,
  RefreshSessionRequest,
  RegisterDeviceRequest,
  SessionPlatform,
} from '@upi-spend-tracker/contracts';
import type { FastifyInstance } from 'fastify';

import {
  PairingCodeConflictError,
  SessionUnauthorizedError,
  type SessionService,
} from './sessions.service.js';

const VALID_PLATFORMS: readonly SessionPlatform[] = ['android', 'ios'];

export function registerSessionRoutes(app: FastifyInstance, service: SessionService) {
  app.post('/v1/sessions/guest', async (request, reply) => {
    const parsedBody = parseCreateGuestSessionRequest(request.body);

    if (!parsedBody) {
      return reply.status(400).send(badRequest('Expected valid guest-session body values.'));
    }

    return reply.status(201).send(service.createGuestSession(parsedBody));
  });

  app.post('/v1/sessions/refresh', async (request, reply) => {
    const parsedBody = parseRefreshSessionRequest(request.body);

    if (!parsedBody) {
      return reply.status(400).send(badRequest('Expected a refreshToken string.'));
    }

    try {
      return reply.status(200).send(service.refreshSession(parsedBody.refreshToken));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }

      throw error;
    }
  });

  app.post('/v1/devices/register', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const parsedBody = parseRegisterDeviceRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!parsedBody) {
      return reply.status(400).send(badRequest('Expected valid device registration values.'));
    }

    try {
      return reply.status(200).send(service.registerDevice(accessToken, parsedBody));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }

      throw error;
    }
  });

  app.post('/v1/device-pairings', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    try {
      return reply.status(201).send(service.createPairingCode(accessToken));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }

      throw error;
    }
  });

  app.post('/v1/device-pairings/consume', async (request, reply) => {
    const parsedBody = parseConsumePairingCodeRequest(request.body);

    if (!parsedBody) {
      return reply.status(400).send(
        badRequest('Expected valid pairing code and device metadata values.'),
      );
    }

    try {
      return reply.status(200).send(service.consumePairingCode(parsedBody));
    } catch (error) {
      if (error instanceof PairingCodeConflictError) {
        return reply.status(409).send({
          error: 'Conflict',
          message: error.message,
          statusCode: 409,
        });
      }

      throw error;
    }
  });
}

function parseCreateGuestSessionRequest(
  body: unknown,
): CreateGuestSessionRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const deviceName = normalizeDeviceName(body.deviceName);
  const platform = parsePlatform(body.platform);
  const appVersion = normalizeOptionalString(body.appVersion);
  const locale = normalizeOptionalString(body.locale);
  const runtimeVersion = normalizeOptionalString(body.runtimeVersion);
  const timezone = normalizeOptionalString(body.timezone);

  if (!deviceName || !platform) {
    return null;
  }

  return {
    deviceName,
    platform,
    ...(appVersion ? { appVersion } : {}),
    ...(locale ? { locale } : {}),
    ...(runtimeVersion ? { runtimeVersion } : {}),
    ...(timezone ? { timezone } : {}),
  };
}

function parseRefreshSessionRequest(body: unknown): RefreshSessionRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const refreshToken = normalizeOptionalString(body.refreshToken);

  return refreshToken ? { refreshToken } : null;
}

function parseRegisterDeviceRequest(body: unknown): RegisterDeviceRequest | null {
  const sessionRequest = parseCreateGuestSessionRequest(body);

  if (!sessionRequest || !isRecord(body)) {
    return null;
  }

  const supportedPackages = parseSupportedPackages(body.supportedPackages);

  if (supportedPackages === null) {
    return null;
  }

  return {
    ...sessionRequest,
    supportedPackages,
    ...(typeof body.notificationCaptureEnabled === 'boolean'
      ? { notificationCaptureEnabled: body.notificationCaptureEnabled }
      : {}),
  };
}

function parseConsumePairingCodeRequest(
  body: unknown,
): ConsumePairingCodeRequest | null {
  const sessionRequest = parseCreateGuestSessionRequest(body);

  if (!sessionRequest || !isRecord(body)) {
    return null;
  }

  const pairingCode = normalizePairingCode(body.pairingCode);

  if (!pairingCode) {
    return null;
  }

  return {
    ...sessionRequest,
    pairingCode,
  };
}

function parsePlatform(value: unknown): SessionPlatform | null {
  return typeof value === 'string' && VALID_PLATFORMS.includes(value as SessionPlatform)
    ? (value as SessionPlatform)
    : null;
}

function parseSupportedPackages(value: unknown): string[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedPackages = value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));

  return normalizedPackages;
}

function parseBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim().length > 0 ? token.trim() : null;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function normalizeDeviceName(value: unknown): string | null {
  const normalizedValue = normalizeOptionalString(value);

  if (!normalizedValue || normalizedValue.length > 120) {
    return null;
  }

  return normalizedValue;
}

function normalizePairingCode(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  if (!/^[A-Z0-9]{6,16}$/.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function badRequest(message: string) {
  return {
    error: 'Bad Request',
    message,
    statusCode: 400,
  };
}

function unauthorized(message: string) {
  return {
    error: 'Unauthorized',
    message,
    statusCode: 401,
  };
}
