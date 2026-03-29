import type { FastifyInstance } from 'fastify';

import type {
  BudgetPatchRequest,
  BudgetScope,
  BudgetUpsertRequest,
  CategoryPatchRequest,
  CategoryUpsertRequest,
  ClassifyItemInput,
  ClassifyTransactionRequest,
  DomainListItemsQuery,
  DomainListMerchantsQuery,
  DomainListTransactionsQuery,
  MerchantPatchRequest,
  MerchantUpsertRequest,
  RuleDraft,
  RulePatchRequest,
  RuleUpsertRequest,
  TransactionItemPatchRequest,
  TransactionItemUpsertRequest,
  TransactionPatchRequest,
  TransactionStatus,
  TransactionUpsertRequest,
  VersionedDeleteRequest,
} from './domain.types.js';
import {
  DomainBadRequestError,
  DomainConflictError,
  DomainNotFoundError,
  type DomainService,
  SessionUnauthorizedError,
} from './domain.service.js';

const VALID_TRANSACTION_STATUSES: readonly TransactionStatus[] = [
  'new',
  'classified',
  'partial',
  'skipped',
  'deleted',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

function parseInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function parseQueryBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

function parseTransactionStatus(value: unknown): TransactionStatus | undefined {
  return typeof value === 'string' && VALID_TRANSACTION_STATUSES.includes(value as TransactionStatus)
    ? (value as TransactionStatus)
    : undefined;
}

function parseActiveTransactionStatus(
  value: unknown,
): Exclude<TransactionStatus, 'deleted'> | undefined {
  const status = parseTransactionStatus(value);
  return status && status !== 'deleted' ? status : undefined;
}

function parseTransactionUpsertRequest(body: unknown): TransactionUpsertRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const amountMinor = parseInteger(body.amountMinor);
  const currencyCode = parseString(body.currencyCode);
  const paidAt = parseString(body.paidAt);
  const source = parseString(body.source) as TransactionUpsertRequest['source'] | undefined;

  if (
    amountMinor === undefined ||
    currencyCode === undefined ||
    paidAt === undefined ||
    source === undefined
  ) {
    return null;
  }

  return {
    amountMinor,
    currencyCode,
    paidAt,
    source,
    ...(parseString(body.merchantId) ? { merchantId: parseString(body.merchantId) } : {}),
    ...(parseString(body.merchantNorm) ? { merchantNorm: parseString(body.merchantNorm) } : {}),
    ...(parseString(body.merchantRaw) ? { merchantRaw: parseString(body.merchantRaw) } : {}),
    ...(parseString(body.note) ? { note: parseString(body.note) } : {}),
    ...(parseString(body.sourceApp) ? { sourceApp: parseString(body.sourceApp) } : {}),
    ...(parseActiveTransactionStatus(body.status)
      ? { status: parseActiveTransactionStatus(body.status) }
      : {}),
  };
}

function parseTransactionPatchRequest(body: unknown): TransactionPatchRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const version = parseInteger(body.version);

  if (version === undefined) {
    return null;
  }

  return {
    version,
    ...(parseString(body.merchantId) ? { merchantId: parseString(body.merchantId) } : {}),
    ...(parseString(body.merchantNorm) ? { merchantNorm: parseString(body.merchantNorm) } : {}),
    ...(parseString(body.merchantRaw) ? { merchantRaw: parseString(body.merchantRaw) } : {}),
    ...(parseString(body.note) ? { note: parseString(body.note) } : {}),
    ...(parseActiveTransactionStatus(body.status)
      ? { status: parseActiveTransactionStatus(body.status) }
      : {}),
  };
}

function parseTransactionItemUpsertRequest(body: unknown): TransactionItemUpsertRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const itemName = parseString(body.itemName);
  const totalAmountMinor = parseInteger(body.totalAmountMinor);
  const transactionVersion = parseInteger(body.transactionVersion);

  if (itemName === undefined || totalAmountMinor === undefined || transactionVersion === undefined) {
    return null;
  }

  return {
    itemName,
    totalAmountMinor,
    transactionVersion,
    ...(parseString(body.categoryId) ? { categoryId: parseString(body.categoryId) } : {}),
    ...(typeof body.qty === 'number' ? { qty: body.qty } : {}),
    ...(parseInteger(body.unitAmountMinor) !== undefined
      ? { unitAmountMinor: parseInteger(body.unitAmountMinor) }
      : {}),
  };
}

function parseTransactionItemPatchRequest(body: unknown): TransactionItemPatchRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const version = parseInteger(body.version);

  if (version === undefined) {
    return null;
  }

  return {
    version,
    ...(parseString(body.categoryId) ? { categoryId: parseString(body.categoryId) } : {}),
    ...(parseBoolean(body.confirmed) !== undefined ? { confirmed: parseBoolean(body.confirmed) } : {}),
    ...(parseString(body.itemName) !== undefined ? { itemName: parseString(body.itemName) } : {}),
    ...(typeof body.qty === 'number' ? { qty: body.qty } : {}),
    ...(parseInteger(body.totalAmountMinor) !== undefined
      ? { totalAmountMinor: parseInteger(body.totalAmountMinor) }
      : {}),
    ...(parseInteger(body.unitAmountMinor) !== undefined
      ? { unitAmountMinor: parseInteger(body.unitAmountMinor) }
      : {}),
  };
}

function parseVersionedDeleteRequest(body: unknown): VersionedDeleteRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const version = parseInteger(body.version);

  if (version === undefined) {
    return null;
  }

  return { version };
}

function parseClassifyItems(value: unknown): ClassifyItemInput[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .filter((entry) => isRecord(entry))
    .map((entry) => ({
      ...(parseString(entry.categoryId) ? { categoryId: parseString(entry.categoryId) } : {}),
      itemName: parseString(entry.itemName) ?? '',
      ...(typeof entry.qty === 'number' ? { qty: entry.qty } : {}),
      totalAmountMinor: parseInteger(entry.totalAmountMinor) ?? Number.NaN,
      ...(parseInteger(entry.unitAmountMinor) !== undefined
        ? { unitAmountMinor: parseInteger(entry.unitAmountMinor) }
        : {}),
    }));
}

function parseRuleDraft(value: unknown): RuleDraft | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    ...(parseInteger(value.amountMaxMinor) !== undefined
      ? { amountMaxMinor: parseInteger(value.amountMaxMinor) }
      : {}),
    ...(parseInteger(value.amountMinMinor) !== undefined
      ? { amountMinMinor: parseInteger(value.amountMinMinor) }
      : {}),
    ...(parseBoolean(value.autoApply) !== undefined ? { autoApply: parseBoolean(value.autoApply) } : {}),
    ...(parseInteger(value.hourBucket) !== undefined ? { hourBucket: parseInteger(value.hourBucket) } : {}),
    ...(parseString(value.merchantMatchType)
      ? { merchantMatchType: parseString(value.merchantMatchType) as RuleDraft['merchantMatchType'] }
      : {}),
    ...(parseString(value.merchantMatchValue) ? { merchantMatchValue: parseString(value.merchantMatchValue) } : {}),
    ...(parseString(value.outputCategoryId) ? { outputCategoryId: parseString(value.outputCategoryId) } : {}),
    ...(parseString(value.outputItemName) ? { outputItemName: parseString(value.outputItemName) } : {}),
    ...(parseInteger(value.weekdayMask) !== undefined ? { weekdayMask: parseInteger(value.weekdayMask) } : {}),
  };
}

function parseClassifyTransactionRequest(body: unknown): ClassifyTransactionRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const version = parseInteger(body.version);
  const items = parseClassifyItems(body.items);

  if (version === undefined || !items) {
    return null;
  }

  return {
    items,
    version,
    ...(parseBoolean(body.createRule) !== undefined ? { createRule: parseBoolean(body.createRule) } : {}),
    ...(parseInteger(body.remainderAmountMinor) !== undefined
      ? { remainderAmountMinor: parseInteger(body.remainderAmountMinor) }
      : {}),
    ...(parseString(body.remainderType)
      ? { remainderType: parseString(body.remainderType) as ClassifyTransactionRequest['remainderType'] }
      : {}),
    ...(parseRuleDraft(body.ruleDraft) ? { ruleDraft: parseRuleDraft(body.ruleDraft) } : {}),
  };
}

function parseCategoryUpsertRequest(body: unknown): CategoryUpsertRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const name = parseString(body.name);

  if (name === undefined) {
    return null;
  }

  return {
    name,
    ...(parseString(body.colorToken) ? { colorToken: parseString(body.colorToken) } : {}),
    ...(parseString(body.iconKey) ? { iconKey: parseString(body.iconKey) } : {}),
  };
}

function parseCategoryPatchRequest(body: unknown): CategoryPatchRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const version = parseInteger(body.version);

  if (version === undefined) {
    return null;
  }

  return {
    version,
    ...(parseString(body.colorToken) ? { colorToken: parseString(body.colorToken) } : {}),
    ...(parseString(body.iconKey) ? { iconKey: parseString(body.iconKey) } : {}),
    ...(parseString(body.name) ? { name: parseString(body.name) } : {}),
  };
}

function parseMerchantUpsertRequest(body: unknown): MerchantUpsertRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const label = parseString(body.label);

  if (label === undefined) {
    return null;
  }

  return { label };
}

function parseMerchantPatchRequest(body: unknown): MerchantPatchRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const version = parseInteger(body.version);

  if (version === undefined) {
    return null;
  }

  return {
    version,
    ...(parseString(body.label) !== undefined ? { label: parseString(body.label) } : {}),
  };
}

function parseRuleUpsertRequest(body: unknown): RuleUpsertRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const priority = parseInteger(body.priority);
  const merchantMatchType = parseString(body.merchantMatchType);
  const merchantMatchValue = parseString(body.merchantMatchValue);

  if (
    priority === undefined ||
    merchantMatchType === undefined ||
    merchantMatchValue === undefined
  ) {
    return null;
  }

  return {
    merchantMatchType: merchantMatchType as RuleUpsertRequest['merchantMatchType'],
    merchantMatchValue,
    priority,
    ...(parseBoolean(body.active) !== undefined ? { active: parseBoolean(body.active) } : {}),
    ...(parseInteger(body.amountMaxMinor) !== undefined
      ? { amountMaxMinor: parseInteger(body.amountMaxMinor) }
      : {}),
    ...(parseInteger(body.amountMinMinor) !== undefined
      ? { amountMinMinor: parseInteger(body.amountMinMinor) }
      : {}),
    ...(parseBoolean(body.autoApply) !== undefined ? { autoApply: parseBoolean(body.autoApply) } : {}),
    ...(parseInteger(body.hourBucket) !== undefined ? { hourBucket: parseInteger(body.hourBucket) } : {}),
    ...(parseString(body.outputCategoryId) ? { outputCategoryId: parseString(body.outputCategoryId) } : {}),
    ...(parseString(body.outputItemName) ? { outputItemName: parseString(body.outputItemName) } : {}),
    ...(parseInteger(body.weekdayMask) !== undefined ? { weekdayMask: parseInteger(body.weekdayMask) } : {}),
  };
}

function parseRulePatchRequest(body: unknown): RulePatchRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const version = parseInteger(body.version);

  if (version === undefined) {
    return null;
  }

  return {
    version,
    ...(parseBoolean(body.active) !== undefined ? { active: parseBoolean(body.active) } : {}),
    ...(parseInteger(body.amountMaxMinor) !== undefined
      ? { amountMaxMinor: parseInteger(body.amountMaxMinor) }
      : {}),
    ...(parseInteger(body.amountMinMinor) !== undefined
      ? { amountMinMinor: parseInteger(body.amountMinMinor) }
      : {}),
    ...(parseBoolean(body.autoApply) !== undefined ? { autoApply: parseBoolean(body.autoApply) } : {}),
    ...(parseInteger(body.hourBucket) !== undefined ? { hourBucket: parseInteger(body.hourBucket) } : {}),
    ...(parseString(body.merchantMatchType)
      ? { merchantMatchType: parseString(body.merchantMatchType) as RulePatchRequest['merchantMatchType'] }
      : {}),
    ...(parseString(body.merchantMatchValue) ? { merchantMatchValue: parseString(body.merchantMatchValue) } : {}),
    ...(parseString(body.outputCategoryId) ? { outputCategoryId: parseString(body.outputCategoryId) } : {}),
    ...(parseString(body.outputItemName) ? { outputItemName: parseString(body.outputItemName) } : {}),
    ...(parseInteger(body.priority) !== undefined ? { priority: parseInteger(body.priority) } : {}),
    ...(parseInteger(body.weekdayMask) !== undefined ? { weekdayMask: parseInteger(body.weekdayMask) } : {}),
  };
}

function parseBudgetScopes(value: unknown): BudgetScope[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .filter((entry) => isRecord(entry))
    .map((entry) => ({
      scopeType: parseString(entry.scopeType) as BudgetScope['scopeType'],
      ...(parseString(entry.scopeRefId) ? { scopeRefId: parseString(entry.scopeRefId) } : {}),
      ...(parseString(entry.scopeValueText) ? { scopeValueText: parseString(entry.scopeValueText) } : {}),
    }));
}

function parseBudgetUpsertRequest(body: unknown): BudgetUpsertRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const name = parseString(body.name);
  const periodType = parseString(body.periodType);
  const limitMinor = parseInteger(body.limitMinor);
  const scopes = parseBudgetScopes(body.scopes);

  if (
    name === undefined ||
    periodType === undefined ||
    limitMinor === undefined ||
    !scopes
  ) {
    return null;
  }

  return {
    limitMinor,
    name,
    periodType: periodType as BudgetUpsertRequest['periodType'],
    scopes,
    ...(parseBoolean(body.alert100) !== undefined ? { alert100: parseBoolean(body.alert100) } : {}),
    ...(parseBoolean(body.alert50) !== undefined ? { alert50: parseBoolean(body.alert50) } : {}),
    ...(parseBoolean(body.alert80) !== undefined ? { alert80: parseBoolean(body.alert80) } : {}),
    ...(parseInteger(body.cycleAnchorDay) !== undefined
      ? { cycleAnchorDay: parseInteger(body.cycleAnchorDay) }
      : {}),
    ...(parseString(body.endDate) ? { endDate: parseString(body.endDate) } : {}),
    ...(parseString(body.startDate) ? { startDate: parseString(body.startDate) } : {}),
  };
}

function parseBudgetPatchRequest(body: unknown): BudgetPatchRequest | null {
  if (!isRecord(body)) {
    return null;
  }

  const version = parseInteger(body.version);

  if (version === undefined) {
    return null;
  }

  return {
    version,
    ...(parseBoolean(body.alert100) !== undefined ? { alert100: parseBoolean(body.alert100) } : {}),
    ...(parseBoolean(body.alert50) !== undefined ? { alert50: parseBoolean(body.alert50) } : {}),
    ...(parseBoolean(body.alert80) !== undefined ? { alert80: parseBoolean(body.alert80) } : {}),
    ...(parseInteger(body.cycleAnchorDay) !== undefined
      ? { cycleAnchorDay: parseInteger(body.cycleAnchorDay) }
      : {}),
    ...(parseString(body.endDate) ? { endDate: parseString(body.endDate) } : {}),
    ...(parseInteger(body.limitMinor) !== undefined ? { limitMinor: parseInteger(body.limitMinor) } : {}),
    ...(parseString(body.name) ? { name: parseString(body.name) } : {}),
    ...(parseString(body.periodType)
      ? { periodType: parseString(body.periodType) as BudgetPatchRequest['periodType'] }
      : {}),
    ...(parseBudgetScopes(body.scopes) ?? undefined ? { scopes: parseBudgetScopes(body.scopes) ?? undefined } : {}),
    ...(parseString(body.startDate) ? { startDate: parseString(body.startDate) } : {}),
  };
}

function parseTransactionsQuery(query: unknown): DomainListTransactionsQuery | null {
  if (!isRecord(query)) {
    return {};
  }

  const page = query.page === undefined ? undefined : Number(query.page);
  const pageSize = query.pageSize === undefined ? undefined : Number(query.pageSize);
  const status = query.status === undefined ? undefined : parseTransactionStatus(query.status);
  const includeDeleted =
    query.includeDeleted === undefined ? undefined : parseQueryBoolean(query.includeDeleted);

  if (
    (query.page !== undefined && (page === undefined || !Number.isInteger(page) || page < 1)) ||
    (query.pageSize !== undefined &&
      (pageSize === undefined || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200)) ||
    (query.status !== undefined && !status) ||
    (query.includeDeleted !== undefined && includeDeleted === undefined)
  ) {
    return null;
  }

  return {
    ...(parseString(query.categoryId) ? { categoryId: parseString(query.categoryId) } : {}),
    ...(parseString(query.from) ? { from: parseString(query.from) } : {}),
    ...(includeDeleted !== undefined ? { includeDeleted } : {}),
    ...(parseString(query.merchantId) ? { merchantId: parseString(query.merchantId) } : {}),
    ...(page !== undefined ? { page } : {}),
    ...(pageSize !== undefined ? { pageSize } : {}),
    ...(parseString(query.search) ? { search: parseString(query.search) } : {}),
    ...(status ? { status } : {}),
    ...(parseString(query.to) ? { to: parseString(query.to) } : {}),
  };
}

function parseEntityListQuery(query: unknown): {
  includeDeleted?: boolean | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  search?: string | undefined;
} | null {
  if (!isRecord(query)) {
    return {};
  }

  const page = query.page === undefined ? undefined : Number(query.page);
  const pageSize = query.pageSize === undefined ? undefined : Number(query.pageSize);
  const includeDeleted =
    query.includeDeleted === undefined ? undefined : parseQueryBoolean(query.includeDeleted);

  if (
    (query.page !== undefined && (page === undefined || !Number.isInteger(page) || page < 1)) ||
    (query.pageSize !== undefined &&
      (pageSize === undefined || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200)) ||
    (query.includeDeleted !== undefined && includeDeleted === undefined)
  ) {
    return null;
  }

  return {
    ...(includeDeleted !== undefined ? { includeDeleted } : {}),
    ...(page !== undefined ? { page } : {}),
    ...(pageSize !== undefined ? { pageSize } : {}),
    ...(parseString(query.search) ? { search: parseString(query.search) } : {}),
  };
}

function parseItemsQuery(query: unknown): DomainListItemsQuery | null {
  const baseQuery = parseEntityListQuery(query);

  if (baseQuery === null) {
    return null;
  }

  if (!isRecord(query)) {
    return baseQuery;
  }

  return {
    ...baseQuery,
    ...(parseString(query.categoryId) ? { categoryId: parseString(query.categoryId) } : {}),
    ...(parseString(query.transactionId) ? { transactionId: parseString(query.transactionId) } : {}),
  };
}

function parseMerchantsQuery(query: unknown): DomainListMerchantsQuery | null {
  return parseEntityListQuery(query);
}

function badRequest(message: string, fieldErrors?: { field: string; message: string }[]) {
  return {
    code: 'bad_request',
    ...(fieldErrors ? { fieldErrors } : {}),
    message,
  };
}

function conflict(message: string) {
  return {
    code: 'conflict',
    message,
  };
}

function notFound(message: string) {
  return {
    code: 'not_found',
    message,
  };
}

function unauthorized(message: string) {
  return {
    code: 'unauthorized',
    message,
  };
}

export function registerDomainRoutes(app: FastifyInstance, service: DomainService) {
  app.get('/v1/transactions', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const query = parseTransactionsQuery(request.query);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (query === null) {
      return reply.status(400).send(badRequest('Expected valid transaction list query values.'));
    }

    try {
      return reply.status(200).send(service.listTransactions(accessToken, query));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }

      throw error;
    }
  });

  app.post('/v1/transactions', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const body = parseTransactionUpsertRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!body) {
      return reply.status(400).send(badRequest('Expected valid transaction create values.'));
    }

    try {
      return reply.status(201).send(service.createTransaction(accessToken, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      throw error;
    }
  });

  app.get('/v1/transactions/:transactionId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const transactionId = parseString((request.params as Record<string, unknown>).transactionId);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!transactionId) {
      return reply.status(400).send(badRequest('Expected a transactionId path parameter.'));
    }

    try {
      return reply.status(200).send(service.getTransactionDetail(accessToken, transactionId));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.patch('/v1/transactions/:transactionId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const transactionId = parseString((request.params as Record<string, unknown>).transactionId);
    const body = parseTransactionPatchRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!transactionId || !body) {
      return reply.status(400).send(badRequest('Expected valid transaction patch values.'));
    }

    try {
      return reply.status(200).send(service.patchTransaction(accessToken, transactionId, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.delete('/v1/transactions/:transactionId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const transactionId = parseString((request.params as Record<string, unknown>).transactionId);
    const body = parseVersionedDeleteRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!transactionId || !body) {
      return reply.status(400).send(badRequest('Expected valid transaction delete values.'));
    }

    try {
      service.deleteTransaction(accessToken, transactionId, body);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.post('/v1/transactions/:transactionId/classify', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const transactionId = parseString((request.params as Record<string, unknown>).transactionId);
    const body = parseClassifyTransactionRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!transactionId || !body) {
      return reply.status(400).send(badRequest('Expected valid transaction classify values.'));
    }

    try {
      return reply.status(200).send(service.classifyTransaction(accessToken, transactionId, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.get('/v1/items', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const query = parseItemsQuery(request.query);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (query === null) {
      return reply.status(400).send(badRequest('Expected valid item list query values.'));
    }

    try {
      return reply.status(200).send(service.listItems(accessToken, query));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      throw error;
    }
  });

  app.get('/v1/items/:itemId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const itemId = parseString((request.params as Record<string, unknown>).itemId);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!itemId) {
      return reply.status(400).send(badRequest('Expected an itemId path parameter.'));
    }

    try {
      return reply.status(200).send(service.getItemDetail(accessToken, itemId));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.post('/v1/transactions/:transactionId/items', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const transactionId = parseString((request.params as Record<string, unknown>).transactionId);
    const body = parseTransactionItemUpsertRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!transactionId || !body) {
      return reply.status(400).send(badRequest('Expected valid transaction item create values.'));
    }

    try {
      return reply.status(201).send(service.createItem(accessToken, transactionId, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.patch('/v1/items/:itemId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const itemId = parseString((request.params as Record<string, unknown>).itemId);
    const body = parseTransactionItemPatchRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!itemId || !body) {
      return reply.status(400).send(badRequest('Expected valid transaction item patch values.'));
    }

    try {
      return reply.status(200).send(service.patchItem(accessToken, itemId, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.delete('/v1/items/:itemId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const itemId = parseString((request.params as Record<string, unknown>).itemId);
    const body = parseVersionedDeleteRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!itemId || !body) {
      return reply.status(400).send(badRequest('Expected valid transaction item delete values.'));
    }

    try {
      service.deleteItem(accessToken, itemId, body);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.get('/v1/categories', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const query = parseEntityListQuery(request.query);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (query === null) {
      return reply.status(400).send(badRequest('Expected valid category list query values.'));
    }

    try {
      return reply.status(200).send(service.listCategories(accessToken, query?.includeDeleted));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      throw error;
    }
  });

  app.post('/v1/categories', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const body = parseCategoryUpsertRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!body) {
      return reply.status(400).send(badRequest('Expected valid category create values.'));
    }

    try {
      return reply.status(201).send(service.createCategory(accessToken, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      throw error;
    }
  });

  app.get('/v1/merchants', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const query = parseMerchantsQuery(request.query);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (query === null) {
      return reply.status(400).send(badRequest('Expected valid merchant list query values.'));
    }

    try {
      return reply.status(200).send(service.listMerchants(accessToken, query));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      throw error;
    }
  });

  app.post('/v1/merchants', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const body = parseMerchantUpsertRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!body) {
      return reply.status(400).send(badRequest('Expected valid merchant create values.'));
    }

    try {
      return reply.status(201).send(service.createMerchant(accessToken, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      throw error;
    }
  });

  app.get('/v1/merchants/:merchantId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const merchantId = parseString((request.params as Record<string, unknown>).merchantId);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!merchantId) {
      return reply.status(400).send(badRequest('Expected a merchantId path parameter.'));
    }

    try {
      return reply.status(200).send(service.getMerchant(accessToken, merchantId));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.patch('/v1/merchants/:merchantId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const merchantId = parseString((request.params as Record<string, unknown>).merchantId);
    const body = parseMerchantPatchRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!merchantId || !body) {
      return reply.status(400).send(badRequest('Expected valid merchant patch values.'));
    }

    try {
      return reply.status(200).send(service.patchMerchant(accessToken, merchantId, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.delete('/v1/merchants/:merchantId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const merchantId = parseString((request.params as Record<string, unknown>).merchantId);
    const body = parseVersionedDeleteRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!merchantId || !body) {
      return reply.status(400).send(badRequest('Expected valid merchant delete values.'));
    }

    try {
      service.deleteMerchant(accessToken, merchantId, body);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.patch('/v1/categories/:categoryId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const categoryId = parseString((request.params as Record<string, unknown>).categoryId);
    const body = parseCategoryPatchRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!categoryId || !body) {
      return reply.status(400).send(badRequest('Expected valid category patch values.'));
    }

    try {
      return reply.status(200).send(service.patchCategory(accessToken, categoryId, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.delete('/v1/categories/:categoryId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const categoryId = parseString((request.params as Record<string, unknown>).categoryId);
    const body = parseVersionedDeleteRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!categoryId || !body) {
      return reply.status(400).send(badRequest('Expected valid category delete values.'));
    }

    try {
      service.deleteCategory(accessToken, categoryId, body);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.get('/v1/rules', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const query = parseEntityListQuery(request.query);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (query === null) {
      return reply.status(400).send(badRequest('Expected valid rule list query values.'));
    }

    try {
      return reply.status(200).send(service.listRules(accessToken, query?.includeDeleted));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      throw error;
    }
  });

  app.post('/v1/rules', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const body = parseRuleUpsertRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!body) {
      return reply.status(400).send(badRequest('Expected valid rule create values.'));
    }

    try {
      return reply.status(201).send(service.createRule(accessToken, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      throw error;
    }
  });

  app.patch('/v1/rules/:ruleId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const ruleId = parseString((request.params as Record<string, unknown>).ruleId);
    const body = parseRulePatchRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!ruleId || !body) {
      return reply.status(400).send(badRequest('Expected valid rule patch values.'));
    }

    try {
      return reply.status(200).send(service.patchRule(accessToken, ruleId, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.delete('/v1/rules/:ruleId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const ruleId = parseString((request.params as Record<string, unknown>).ruleId);
    const body = parseVersionedDeleteRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!ruleId || !body) {
      return reply.status(400).send(badRequest('Expected valid rule delete values.'));
    }

    try {
      service.deleteRule(accessToken, ruleId, body);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.get('/v1/budgets', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const query = parseEntityListQuery(request.query);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (query === null) {
      return reply.status(400).send(badRequest('Expected valid budget list query values.'));
    }

    try {
      return reply.status(200).send(service.listBudgets(accessToken, query?.includeDeleted));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      throw error;
    }
  });

  app.post('/v1/budgets', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const body = parseBudgetUpsertRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!body) {
      return reply.status(400).send(badRequest('Expected valid budget create values.'));
    }

    try {
      return reply.status(201).send(service.createBudget(accessToken, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      throw error;
    }
  });

  app.get('/v1/budgets/:budgetId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const budgetId = parseString((request.params as Record<string, unknown>).budgetId);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!budgetId) {
      return reply.status(400).send(badRequest('Expected a budgetId path parameter.'));
    }

    try {
      return reply.status(200).send(service.getBudgetDetail(accessToken, budgetId));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.patch('/v1/budgets/:budgetId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const budgetId = parseString((request.params as Record<string, unknown>).budgetId);
    const body = parseBudgetPatchRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!budgetId || !body) {
      return reply.status(400).send(badRequest('Expected valid budget patch values.'));
    }

    try {
      return reply.status(200).send(service.patchBudget(accessToken, budgetId, body));
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });

  app.delete('/v1/budgets/:budgetId', async (request, reply) => {
    const accessToken = parseBearerToken(request.headers.authorization);
    const budgetId = parseString((request.params as Record<string, unknown>).budgetId);
    const body = parseVersionedDeleteRequest(request.body);

    if (!accessToken) {
      return reply.status(401).send(unauthorized('Missing or invalid bearer token.'));
    }

    if (!budgetId || !body) {
      return reply.status(400).send(badRequest('Expected valid budget delete values.'));
    }

    try {
      service.deleteBudget(accessToken, budgetId, body);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof SessionUnauthorizedError) {
        return reply.status(401).send(unauthorized(error.message));
      }
      if (error instanceof DomainBadRequestError) {
        return reply.status(400).send(badRequest(error.message, error.fieldErrors));
      }
      if (error instanceof DomainConflictError) {
        return reply.status(409).send(conflict(error.message));
      }
      if (error instanceof DomainNotFoundError) {
        return reply.status(404).send(notFound(error.message));
      }
      throw error;
    }
  });
}
