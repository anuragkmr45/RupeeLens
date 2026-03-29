import type { FastifyInstance } from 'fastify';

import type { ReportBreakdownQuery, ReportGroupBy, ReportSummaryQuery } from './reports.types.js';
import {
  ReportsBadRequestError,
  type ReportsService,
  SessionUnauthorizedError,
} from './reports.service.js';

const VALID_REPORT_GROUPS: readonly ReportGroupBy[] = [
  'category',
  'merchant',
  'item',
  'hourOfDay',
  'dayOfWeek',
];

export function registerReportsRoutes(app: FastifyInstance, service: ReportsService) {
  app.get('/v1/reports/summary', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const query = parseSummaryQuery(request.query);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!query) {
      return reply.status(400).send(badRequest('Expected valid from/to report query values.'));
    }

    try {
      return reply.status(200).send(service.getSummary(accessToken, query));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }

      if (error instanceof ReportsBadRequestError) {
        return reply.status(400).send(badRequest(error.message));
      }

      throw error;
    }
  });

  app.get('/v1/reports/breakdown', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const query = parseBreakdownQuery(request.query);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!query) {
      return reply.status(400).send(
        badRequest('Expected valid from/to/groupBy report breakdown query values.'),
      );
    }

    try {
      return reply.status(200).send(service.getBreakdown(accessToken, query));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }

      if (error instanceof ReportsBadRequestError) {
        return reply.status(400).send(badRequest(error.message));
      }

      throw error;
    }
  });
}

function parseSummaryQuery(value: unknown): ReportSummaryQuery | null {
  if (!isRecord(value)) {
    return null;
  }

  const from = parseDateTimeQuery(value.from);
  const to = parseDateTimeQuery(value.to);

  if (!from || !to) {
    return null;
  }

  return { from, to };
}

function parseBreakdownQuery(value: unknown): ReportBreakdownQuery | null {
  if (!isRecord(value)) {
    return null;
  }

  const summaryQuery = parseSummaryQuery(value);
  const groupBy = parseGroupBy(value.groupBy);
  const limit = parseLimit(value.limit);

  if (!summaryQuery || !groupBy || limit === null) {
    return null;
  }

  return {
    ...summaryQuery,
    groupBy,
    ...(limit !== undefined ? { limit } : {}),
  };
}

function parseDateTimeQuery(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return undefined;
  }

  const parsedValue = Date.parse(normalizedValue);

  return Number.isFinite(parsedValue) ? new Date(parsedValue).toISOString() : undefined;
}

function parseGroupBy(value: unknown): ReportGroupBy | undefined {
  return typeof value === 'string' && VALID_REPORT_GROUPS.includes(value as ReportGroupBy)
    ? (value as ReportGroupBy)
    : undefined;
}

function parseLimit(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isInteger(parsedValue) ? parsedValue : null;
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
