import { randomUUID } from 'node:crypto';

import {
  SessionUnauthorizedError,
  type SessionService,
} from '../sessions/sessions.service.js';
import type {
  DomainRepository,
  StoredAuditEvent,
  StoredBudget,
  StoredBudgetScope,
  StoredCategory,
  StoredMerchant,
  StoredRule,
  StoredTransaction,
  StoredTransactionItem,
} from './domain.repository.js';
import type {
  AuditEvent,
  Budget,
  BudgetDetailResponse,
  BudgetListResponse,
  BudgetPatchRequest,
  BudgetStatus,
  BudgetSummary,
  BudgetUpsertRequest,
  Category,
  CategoryListResponse,
  CategoryPatchRequest,
  CategoryUpsertRequest,
  ClassifyTransactionRequest,
  DomainListItemsQuery,
  DomainListMerchantsQuery,
  DomainListTransactionsQuery,
  FieldError,
  Merchant,
  MerchantListResponse,
  MerchantPatchRequest,
  MerchantUpsertRequest,
  Rule,
  RuleDraft,
  RuleListResponse,
  RulePatchRequest,
  RuleUpsertRequest,
  Transaction,
  TransactionDetailResponse,
  TransactionItem,
  TransactionItemListResponse,
  TransactionItemPatchRequest,
  TransactionItemUpsertRequest,
  TransactionListResponse,
  TransactionPatchRequest,
  TransactionStatus,
  TransactionUpsertRequest,
  VersionedDeleteRequest,
} from './domain.types.js';

export interface DomainServiceDependencies {
  now?: () => string;
  randomId?: () => string;
  repository: DomainRepository;
  sessionService: SessionService;
}

export interface DomainService {
  classifyTransaction(
    accessToken: string,
    transactionId: string,
    request: ClassifyTransactionRequest,
  ): TransactionDetailResponse;
  createItem(
    accessToken: string,
    transactionId: string,
    request: TransactionItemUpsertRequest,
  ): TransactionItem;
  createBudget(accessToken: string, request: BudgetUpsertRequest): Budget;
  createCategory(accessToken: string, request: CategoryUpsertRequest): Category;
  createMerchant(accessToken: string, request: MerchantUpsertRequest): Merchant;
  createRule(accessToken: string, request: RuleUpsertRequest): Rule;
  createTransaction(accessToken: string, request: TransactionUpsertRequest): Transaction;
  deleteItem(accessToken: string, itemId: string, request: VersionedDeleteRequest): void;
  deleteBudget(accessToken: string, budgetId: string): void;
  deleteCategory(accessToken: string, categoryId: string): void;
  deleteMerchant(accessToken: string, merchantId: string): void;
  deleteRule(accessToken: string, ruleId: string): void;
  deleteTransaction(accessToken: string, transactionId: string): void;
  getBudgetDetail(accessToken: string, budgetId: string): BudgetDetailResponse;
  getItemDetail(accessToken: string, itemId: string): TransactionItem;
  getMerchant(accessToken: string, merchantId: string): Merchant;
  getTransactionDetail(accessToken: string, transactionId: string): TransactionDetailResponse;
  listBudgets(accessToken: string, includeDeleted?: boolean): BudgetListResponse;
  listCategories(accessToken: string, includeDeleted?: boolean): CategoryListResponse;
  listItems(accessToken: string, query: DomainListItemsQuery): TransactionItemListResponse;
  listMerchants(accessToken: string, query: DomainListMerchantsQuery): MerchantListResponse;
  listRules(accessToken: string, includeDeleted?: boolean): RuleListResponse;
  listTransactions(accessToken: string, query: DomainListTransactionsQuery): TransactionListResponse;
  patchItem(accessToken: string, itemId: string, request: TransactionItemPatchRequest): TransactionItem;
  patchBudget(accessToken: string, budgetId: string, request: BudgetPatchRequest): Budget;
  patchCategory(accessToken: string, categoryId: string, request: CategoryPatchRequest): Category;
  patchMerchant(accessToken: string, merchantId: string, request: MerchantPatchRequest): Merchant;
  patchRule(accessToken: string, ruleId: string, request: RulePatchRequest): Rule;
  patchTransaction(
    accessToken: string,
    transactionId: string,
    request: TransactionPatchRequest,
  ): Transaction;
}

export class DomainBadRequestError extends Error {
  constructor(
    public readonly fieldErrors: FieldError[],
    message = 'One or more request fields are invalid.',
  ) {
    super(message);
    this.name = 'DomainBadRequestError';
  }
}

export class DomainConflictError extends Error {
  constructor(message = 'The requested change conflicts with the current entity version.') {
    super(message);
    this.name = 'DomainConflictError';
  }
}

export class DomainNotFoundError extends Error {
  constructor(message = 'The requested resource could not be found.') {
    super(message);
    this.name = 'DomainNotFoundError';
  }
}

function toCategory(record: StoredCategory): Category {
  return {
    colorToken: record.colorToken,
    createdAt: record.createdAt,
    ...(record.deletedAt ? { deletedAt: record.deletedAt } : {}),
    iconKey: record.iconKey,
    id: record.id,
    isSystem: record.isSystem,
    name: record.name,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}

function toMerchant(record: StoredMerchant): Merchant {
  return {
    createdAt: record.createdAt,
    ...(record.deletedAt ? { deletedAt: record.deletedAt } : {}),
    id: record.id,
    label: record.label,
    normalizedLabel: record.normalizedLabel,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}

function toRule(record: StoredRule): Rule {
  return {
    active: record.active,
    amountMaxMinor: record.amountMaxMinor,
    amountMinMinor: record.amountMinMinor,
    autoApply: record.autoApply,
    createdAt: record.createdAt,
    ...(record.deletedAt ? { deletedAt: record.deletedAt } : {}),
    hourBucket: record.hourBucket,
    id: record.id,
    merchantMatchType: record.merchantMatchType,
    merchantMatchValue: record.merchantMatchValue,
    outputCategoryId: record.outputCategoryId,
    outputItemName: record.outputItemName,
    priority: record.priority,
    updatedAt: record.updatedAt,
    version: record.version,
    weekdayMask: record.weekdayMask,
  };
}

function toBudget(record: StoredBudget): Budget {
  return {
    alert100: record.alert100,
    alert50: record.alert50,
    alert80: record.alert80,
    createdAt: record.createdAt,
    cycleAnchorDay: record.cycleAnchorDay,
    ...(record.deletedAt ? { deletedAt: record.deletedAt } : {}),
    endDate: record.endDate,
    id: record.id,
    limitMinor: record.limitMinor,
    name: record.name,
    periodType: record.periodType,
    startDate: record.startDate,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}

function toTransaction(record: StoredTransaction): Transaction {
  return {
    amountMinor: record.amountMinor,
    createdAt: record.createdAt,
    currencyCode: record.currencyCode,
    ...(record.deletedAt ? { deletedAt: record.deletedAt } : {}),
    id: record.id,
    ...(record.merchantId ? { merchantId: record.merchantId } : {}),
    ...(record.merchantNorm ? { merchantNorm: record.merchantNorm } : {}),
    ...(record.merchantRaw ? { merchantRaw: record.merchantRaw } : {}),
    ...(record.note ? { note: record.note } : {}),
    paidAt: record.paidAt,
    source: record.source,
    ...(record.sourceApp ? { sourceApp: record.sourceApp } : {}),
    status: record.status,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}

function toTransactionItem(record: StoredTransactionItem): TransactionItem {
  return {
    ...(record.categoryId ? { categoryId: record.categoryId } : {}),
    confirmed: record.confirmed,
    createdAt: record.createdAt,
    ...(record.deletedAt ? { deletedAt: record.deletedAt } : {}),
    id: record.id,
    itemName: record.itemName,
    ...(record.itemNorm ? { itemNorm: record.itemNorm } : {}),
    ...(record.qty !== undefined ? { qty: record.qty } : {}),
    ...(record.suggestionScore !== undefined ? { suggestionScore: record.suggestionScore } : {}),
    ...(record.suggestionSource ? { suggestionSource: record.suggestionSource } : {}),
    totalAmountMinor: record.totalAmountMinor,
    transactionId: record.transactionId,
    ...(record.unitAmountMinor !== undefined ? { unitAmountMinor: record.unitAmountMinor } : {}),
    updatedAt: record.updatedAt,
    version: record.version,
  };
}

function toAuditEvent(record: StoredAuditEvent): AuditEvent {
  return {
    action: record.action,
    ...(record.actorDeviceId ? { actorDeviceId: record.actorDeviceId } : {}),
    ...(record.after ? { after: { ...record.after } } : {}),
    ...(record.before ? { before: { ...record.before } } : {}),
    createdAt: record.createdAt,
    id: record.id,
  };
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function requireInteger(value: number | undefined, field: string, errors: FieldError[]): void {
  if (value === undefined || !Number.isInteger(value)) {
    errors.push({
      field,
      message: 'Expected an integer value.',
    });
  }
}

function requirePositiveInteger(value: number | undefined, field: string, errors: FieldError[]): void {
  if (value === undefined || !Number.isInteger(value) || value <= 0) {
    errors.push({
      field,
      message: 'Expected a positive integer value.',
    });
  }
}

function requireIsoDateTime(value: string | undefined, field: string, errors: FieldError[]): void {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    errors.push({
      field,
      message: 'Expected an ISO date-time string.',
    });
  }
}

function requireIsoDate(value: string | undefined, field: string, errors: FieldError[]): void {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push({
      field,
      message: 'Expected a YYYY-MM-DD date string.',
    });
  }
}

function validateTransactionCreate(request: TransactionUpsertRequest): FieldError[] {
  const errors: FieldError[] = [];

  requireInteger(request.amountMinor, 'amountMinor', errors);
  requireIsoDateTime(request.paidAt, 'paidAt', errors);

  if (!normalizeOptionalString(request.currencyCode)) {
    errors.push({
      field: 'currencyCode',
      message: 'Currency code is required.',
    });
  }

  if (!['capture', 'manual', 'import'].includes(request.source)) {
    errors.push({
      field: 'source',
      message: 'Unsupported source value.',
    });
  }

  return errors;
}

function validateTransactionPatch(request: TransactionPatchRequest): FieldError[] {
  const errors: FieldError[] = [];
  requirePositiveInteger(request.version, 'version', errors);
  return errors;
}

function validateCategoryCreate(request: CategoryUpsertRequest): FieldError[] {
  const errors: FieldError[] = [];
  const name = normalizeOptionalString(request.name);

  if (!name) {
    errors.push({
      field: 'name',
      message: 'Category name is required.',
    });
  } else if (name.length > 80) {
    errors.push({
      field: 'name',
      message: 'Category name must be 80 characters or fewer.',
    });
  }

  return errors;
}

function validateCategoryPatch(request: CategoryPatchRequest): FieldError[] {
  const errors = validateCategoryCreate({
    colorToken: request.colorToken,
    iconKey: request.iconKey,
    name: request.name ?? 'placeholder',
  });
  requirePositiveInteger(request.version, 'version', errors);

  if (request.name === undefined) {
    return errors.filter((error) => error.field !== 'name');
  }

  return errors;
}

function validateMerchantCreate(request: MerchantUpsertRequest): FieldError[] {
  const errors: FieldError[] = [];
  const label = normalizeOptionalString(request.label);

  if (!label) {
    errors.push({
      field: 'label',
      message: 'Merchant label is required.',
    });
  } else if (label.length > 120) {
    errors.push({
      field: 'label',
      message: 'Merchant label must be 120 characters or fewer.',
    });
  }

  return errors;
}

function validateMerchantPatch(request: MerchantPatchRequest): FieldError[] {
  const errors = validateMerchantCreate({
    label: request.label ?? 'placeholder',
  });
  requirePositiveInteger(request.version, 'version', errors);

  if (request.label === undefined) {
    return errors.filter((error) => error.field !== 'label');
  }

  return errors;
}

function validateItemCreate(request: TransactionItemUpsertRequest): FieldError[] {
  const errors: FieldError[] = [];
  requirePositiveInteger(request.transactionVersion, 'transactionVersion', errors);

  const itemName = normalizeOptionalString(request.itemName);

  if (!itemName) {
    errors.push({
      field: 'itemName',
      message: 'itemName is required.',
    });
  }

  if (!Number.isInteger(request.totalAmountMinor) || request.totalAmountMinor <= 0) {
    errors.push({
      field: 'totalAmountMinor',
      message: 'totalAmountMinor must be a positive integer.',
    });
  }

  if (request.qty !== undefined && request.qty <= 0) {
    errors.push({
      field: 'qty',
      message: 'qty must be greater than zero.',
    });
  }

  if (
    request.unitAmountMinor !== undefined &&
    (!Number.isInteger(request.unitAmountMinor) || request.unitAmountMinor <= 0)
  ) {
    errors.push({
      field: 'unitAmountMinor',
      message: 'unitAmountMinor must be a positive integer.',
    });
  }

  return errors;
}

function validateItemPatch(request: TransactionItemPatchRequest): FieldError[] {
  const errors: FieldError[] = [];
  requirePositiveInteger(request.version, 'version', errors);

  if (request.itemName !== undefined && !normalizeOptionalString(request.itemName)) {
    errors.push({
      field: 'itemName',
      message: 'itemName cannot be empty.',
    });
  }

  if (
    request.totalAmountMinor !== undefined &&
    (!Number.isInteger(request.totalAmountMinor) || request.totalAmountMinor <= 0)
  ) {
    errors.push({
      field: 'totalAmountMinor',
      message: 'totalAmountMinor must be a positive integer.',
    });
  }

  if (request.qty !== undefined && request.qty <= 0) {
    errors.push({
      field: 'qty',
      message: 'qty must be greater than zero.',
    });
  }

  if (
    request.unitAmountMinor !== undefined &&
    (!Number.isInteger(request.unitAmountMinor) || request.unitAmountMinor <= 0)
  ) {
    errors.push({
      field: 'unitAmountMinor',
      message: 'unitAmountMinor must be a positive integer.',
    });
  }

  return errors;
}

function validateRuleRequest(
  request: RuleUpsertRequest | RulePatchRequest | RuleDraft,
  requireMatch = true,
): FieldError[] {
  const errors: FieldError[] = [];

  if ('version' in request) {
    requirePositiveInteger(request.version, 'version', errors);
  }

  if ('priority' in request && request.priority !== undefined && !Number.isInteger(request.priority)) {
    errors.push({
      field: 'priority',
      message: 'Priority must be an integer.',
    });
  }

  if (requireMatch && !normalizeOptionalString(request.merchantMatchValue)) {
    errors.push({
      field: 'merchantMatchValue',
      message: 'merchantMatchValue is required.',
    });
  }

  if (
    request.merchantMatchType !== undefined &&
    !['merchantId', 'merchantNorm', 'contains', 'exact'].includes(request.merchantMatchType)
  ) {
    errors.push({
      field: 'merchantMatchType',
      message: 'Unsupported merchantMatchType.',
    });
  }

  if (
    request.hourBucket !== undefined &&
    (!Number.isInteger(request.hourBucket) || request.hourBucket < 0 || request.hourBucket > 23)
  ) {
    errors.push({
      field: 'hourBucket',
      message: 'hourBucket must be an integer between 0 and 23.',
    });
  }

  if (
    request.amountMinMinor !== undefined &&
    (!Number.isInteger(request.amountMinMinor) || request.amountMinMinor < 0)
  ) {
    errors.push({
      field: 'amountMinMinor',
      message: 'amountMinMinor must be a non-negative integer.',
    });
  }

  if (
    request.amountMaxMinor !== undefined &&
    (!Number.isInteger(request.amountMaxMinor) || request.amountMaxMinor < 0)
  ) {
    errors.push({
      field: 'amountMaxMinor',
      message: 'amountMaxMinor must be a non-negative integer.',
    });
  }

  if (
    request.amountMinMinor !== undefined &&
    request.amountMaxMinor !== undefined &&
    request.amountMinMinor > request.amountMaxMinor
  ) {
    errors.push({
      field: 'amountMinMinor',
      message: 'amountMinMinor cannot exceed amountMaxMinor.',
    });
  }

  return errors;
}

function validateBudgetRequest(
  request: BudgetUpsertRequest | BudgetPatchRequest,
  requireScopes: boolean,
): FieldError[] {
  const errors: FieldError[] = [];

  if ('version' in request) {
    requirePositiveInteger(request.version, 'version', errors);
  }

  if (request.name !== undefined && !normalizeOptionalString(request.name)) {
    errors.push({
      field: 'name',
      message: 'Budget name cannot be empty.',
    });
  }

  if (request.limitMinor !== undefined && (!Number.isInteger(request.limitMinor) || request.limitMinor <= 0)) {
    errors.push({
      field: 'limitMinor',
      message: 'limitMinor must be a positive integer.',
    });
  }

  if (
    request.cycleAnchorDay !== undefined &&
    (!Number.isInteger(request.cycleAnchorDay) || request.cycleAnchorDay < 1 || request.cycleAnchorDay > 31)
  ) {
    errors.push({
      field: 'cycleAnchorDay',
      message: 'cycleAnchorDay must be an integer between 1 and 31.',
    });
  }

  if (
    request.periodType !== undefined &&
    !['monthly', 'weekly', 'rolling', 'salary_cycle', 'custom'].includes(request.periodType)
  ) {
    errors.push({
      field: 'periodType',
      message: 'Unsupported periodType.',
    });
  }

  if (request.startDate !== undefined) {
    requireIsoDate(request.startDate, 'startDate', errors);
  }

  if (request.endDate !== undefined) {
    requireIsoDate(request.endDate, 'endDate', errors);
  }

  if (request.periodType === 'custom') {
    if (!request.startDate) {
      errors.push({
        field: 'startDate',
        message: 'Custom budgets require startDate.',
      });
    }

    if (!request.endDate) {
      errors.push({
        field: 'endDate',
        message: 'Custom budgets require endDate.',
      });
    }
  }

  if (
    request.startDate &&
    request.endDate &&
    new Date(`${request.startDate}T00:00:00.000Z`).getTime() >
      new Date(`${request.endDate}T23:59:59.999Z`).getTime()
  ) {
    errors.push({
      field: 'startDate',
      message: 'startDate must be before or equal to endDate.',
    });
  }

  if (request.scopes !== undefined || requireScopes) {
    if (!request.scopes || request.scopes.length === 0) {
      errors.push({
        field: 'scopes',
        message: 'At least one budget scope is required.',
      });
    } else {
      request.scopes.forEach((scope, index) => {
        if (!['overall', 'category', 'merchant', 'item'].includes(scope.scopeType)) {
          errors.push({
            field: `scopes[${index}].scopeType`,
            message: 'Unsupported scopeType.',
          });
        }

        if (scope.scopeType !== 'overall' && !scope.scopeRefId && !normalizeOptionalString(scope.scopeValueText)) {
          errors.push({
            field: `scopes[${index}]`,
            message: 'Non-overall scopes require scopeRefId or scopeValueText.',
          });
        }
      });
    }
  }

  return errors;
}

function validateClassifyRequest(request: ClassifyTransactionRequest): FieldError[] {
  const errors: FieldError[] = [];
  requirePositiveInteger(request.version, 'version', errors);

  if (!Array.isArray(request.items) || request.items.length === 0) {
    errors.push({
      field: 'items',
      message: 'At least one classified item is required.',
    });
    return errors;
  }

  request.items.forEach((item, index) => {
    const itemName = normalizeOptionalString(item.itemName);

    if (!itemName) {
      errors.push({
        field: `items[${index}].itemName`,
        message: 'itemName is required.',
      });
    }

    if (!Number.isInteger(item.totalAmountMinor) || item.totalAmountMinor <= 0) {
      errors.push({
        field: `items[${index}].totalAmountMinor`,
        message: 'totalAmountMinor must be a positive integer.',
      });
    }
  });

  if (request.remainderAmountMinor !== undefined && (!Number.isInteger(request.remainderAmountMinor) || request.remainderAmountMinor < 0)) {
    errors.push({
      field: 'remainderAmountMinor',
      message: 'remainderAmountMinor must be a non-negative integer.',
    });
  }

  if (
    request.remainderType !== undefined &&
    !['none', 'tip', 'tax', 'fee', 'unknown'].includes(request.remainderType)
  ) {
    errors.push({
      field: 'remainderType',
      message: 'Unsupported remainderType.',
    });
  }

  if (request.createRule) {
    if (!request.ruleDraft) {
      errors.push({
        field: 'ruleDraft',
        message: 'ruleDraft is required when createRule is true.',
      });
    } else {
      errors.push(...validateRuleRequest(request.ruleDraft, false));
    }
  }

  return errors;
}

function ensureValidOrThrow(errors: FieldError[]): void {
  if (errors.length > 0) {
    throw new DomainBadRequestError(errors);
  }
}

function assertVersion(currentVersion: number, requestedVersion: number): void {
  if (currentVersion !== requestedVersion) {
    throw new DomainConflictError();
  }
}

function buildAuditEvent(
  randomId: () => string,
  now: string,
  action: string,
  actorDeviceId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): StoredAuditEvent {
  return {
    action,
    ...(after ? { after } : {}),
    actorDeviceId,
    ...(before ? { before } : {}),
    createdAt: now,
    id: randomId(),
    transactionId: '',
    userId: '',
  };
}

function deriveTransactionStatus(
  currentStatus: TransactionStatus,
  amountMinor: number,
  items: StoredTransactionItem[],
): TransactionStatus {
  if (currentStatus === 'deleted') {
    return 'deleted';
  }

  if (currentStatus === 'skipped' && items.length === 0) {
    return 'skipped';
  }

  const totalMinor = items.reduce((total, item) => total + item.totalAmountMinor, 0);

  if (totalMinor <= 0) {
    return 'new';
  }

  if (totalMinor >= amountMinor) {
    return 'classified';
  }

  return 'partial';
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const startIndex = (page - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    page,
    pageSize,
    total: items.length,
  };
}

function startOfUtcWeek(value: Date): Date {
  const result = new Date(value);
  result.setUTCHours(0, 0, 0, 0);
  const day = result.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + delta);
  return result;
}

function buildMonthlyWindow(now: Date, anchorDay: number | undefined): { start: Date; end: Date } {
  const anchor = Math.min(Math.max(anchorDay ?? 1, 1), 28);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), anchor, 0, 0, 0, 0));

  if (now.getUTCDate() < anchor) {
    start.setUTCMonth(start.getUTCMonth() - 1);
  }

  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return {
    end,
    start,
  };
}

function buildBudgetWindow(budget: StoredBudget, nowIso: string): {
  end: string;
  start: string;
} {
  const now = new Date(nowIso);

  switch (budget.periodType) {
    case 'weekly': {
      const start = startOfUtcWeek(now);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      return {
        end: end.toISOString(),
        start: start.toISOString(),
      };
    }
    case 'rolling': {
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 30);
      return {
        end: now.toISOString(),
        start: start.toISOString(),
      };
    }
    case 'custom': {
      const start = new Date(`${budget.startDate ?? '1970-01-01'}T00:00:00.000Z`);
      const end = new Date(`${budget.endDate ?? '1970-01-01'}T23:59:59.999Z`);
      return {
        end: end.toISOString(),
        start: start.toISOString(),
      };
    }
    case 'salary_cycle':
    case 'monthly':
    default: {
      const { end, start } = buildMonthlyWindow(now, budget.cycleAnchorDay);
      return {
        end: end.toISOString(),
        start: start.toISOString(),
      };
    }
  }
}

function calculateBudgetSummary(
  budget: StoredBudget,
  scopes: StoredBudgetScope[],
  transactions: StoredTransaction[],
  items: StoredTransactionItem[],
  nowIso: string,
): BudgetSummary {
  const window = buildBudgetWindow(budget, nowIso);
  const windowStart = window.start;
  const windowEnd = window.end;
  const windowTransactions = transactions.filter(
    (transaction) =>
      transaction.status !== 'deleted' &&
      transaction.paidAt >= windowStart &&
      transaction.paidAt <= windowEnd,
  );
  const transactionIdsInWindow = new Set(windowTransactions.map((transaction) => transaction.id));
  const spentMinor = scopes.some((scope) => scope.scopeType === 'overall')
    ? windowTransactions.reduce((total, transaction) => total + transaction.amountMinor, 0)
    : (() => {
    const matchedTransactionIds = new Set<string>();
    const matchedItemIds = new Set<string>();

    scopes.forEach((scope) => {
      switch (scope.scopeType) {
        case 'merchant':
          windowTransactions
            .filter((transaction) => transaction.merchantId === scope.scopeRefId)
            .forEach((transaction) => {
              matchedTransactionIds.add(transaction.id);
            });
          break;
        case 'category':
          (scope.scopeRefId
            ? items.filter((item) => transactionIdsInWindow.has(item.transactionId) && item.categoryId === scope.scopeRefId)
            : [])
            .forEach((item) => {
              matchedItemIds.add(item.id);
            });
          break;
        case 'item': {
          const expectedValue = normalizeOptionalString(scope.scopeValueText)?.toLowerCase();

          items
            .filter((item) => {
              if (!transactionIdsInWindow.has(item.transactionId)) {
                return false;
              }

              if (scope.scopeRefId && item.id === scope.scopeRefId) {
                return true;
              }

              if (!expectedValue) {
                return false;
              }

              return (
                item.itemName.toLowerCase() === expectedValue ||
                item.itemNorm?.toLowerCase() === expectedValue
              );
            })
            .forEach((item) => {
              matchedItemIds.add(item.id);
            });
          break;
        }
        case 'overall':
        default:
          break;
      }
    });

    return (
      windowTransactions
        .filter((transaction) => matchedTransactionIds.has(transaction.id))
        .reduce((total, transaction) => total + transaction.amountMinor, 0) +
      items
        .filter((item) => matchedItemIds.has(item.id))
        .reduce((total, item) => total + item.totalAmountMinor, 0)
    );
  })();

  const remainingMinor = budget.limitMinor - spentMinor;
  const ratio = budget.limitMinor > 0 ? spentMinor / budget.limitMinor : 0;
  let status: BudgetStatus = 'healthy';

  if (ratio >= 1) {
    status = 'over_limit';
  } else if (ratio >= 0.8) {
    status = 'warning80';
  } else if (ratio >= 0.5) {
    status = 'warning50';
  }

  const startMs = new Date(window.start).getTime();
  const endMs = new Date(window.end).getTime();
  const nowMs = new Date(nowIso).getTime();
  const elapsedMs = Math.max(1, Math.min(nowMs, endMs) - startMs);
  const totalMs = Math.max(1, endMs - startMs);
  const projectedMinor = Math.round((spentMinor / elapsedMs) * totalMs);

  return {
    periodEnd: window.end,
    periodStart: window.start,
    projectedMinor,
    remainingMinor,
    spentMinor,
    status,
  };
}

export function createDomainService({
  now = () => new Date().toISOString(),
  randomId = randomUUID,
  repository,
  sessionService,
}: DomainServiceDependencies): DomainService {
  function authenticate(accessToken: string) {
    return sessionService.authenticateSession(accessToken);
  }

  function buildTransactionDetail(userId: string, transactionId: string): TransactionDetailResponse {
    const transaction = repository.getTransaction(userId, transactionId);

    if (!transaction) {
      throw new DomainNotFoundError('Transaction not found.');
    }

    return {
      auditEvents: repository.listAuditEvents(userId, transactionId).map(toAuditEvent),
      items: repository.listTransactionItems(userId, transactionId).map(toTransactionItem),
      transaction: toTransaction(transaction),
    };
  }

  function ensureUniqueMerchantLabel(
    userId: string,
    label: string,
    excludedMerchantId?: string,
  ): string {
    const normalizedLabel = label.trim().toLowerCase();
    const conflictingMerchant = repository
      .listMerchants(userId)
      .find(
        (merchant) =>
          merchant.normalizedLabel === normalizedLabel && merchant.id !== excludedMerchantId,
      );

    if (conflictingMerchant) {
      throw new DomainConflictError('Merchant label already exists.');
    }

    return normalizedLabel;
  }

  function updateTransactionForItems(
    transaction: StoredTransaction,
    nextItems: StoredTransactionItem[],
  ): StoredTransaction {
    const activeItems = nextItems.filter((item) => !item.deletedAt);
    const activeItemTotal = activeItems.reduce((total, item) => total + item.totalAmountMinor, 0);

    if (activeItemTotal > transaction.amountMinor) {
      throw new DomainBadRequestError([
        {
          field: 'totalAmountMinor',
          message: 'Item totals cannot exceed the transaction amount.',
        },
      ]);
    }

    const nowIso = now();
    const nextTransaction: StoredTransaction = {
      ...transaction,
      status: deriveTransactionStatus(transaction.status, transaction.amountMinor, activeItems),
      updatedAt: nowIso,
      version: transaction.version + 1,
    };

    repository.saveTransaction(nextTransaction);
    return nextTransaction;
  }

  return {
    classifyTransaction(accessToken, transactionId, request) {
      ensureValidOrThrow(validateClassifyRequest(request));

      const session = authenticate(accessToken);
      const currentTransaction = repository.getTransaction(session.userId, transactionId);

      if (!currentTransaction) {
        throw new DomainNotFoundError('Transaction not found.');
      }

      assertVersion(currentTransaction.version, request.version);

      const nowIso = now();
      const itemTotal = request.items.reduce((total, item) => total + item.totalAmountMinor, 0);
      const remainderAmount = request.remainderAmountMinor ?? 0;

      if (itemTotal + remainderAmount > currentTransaction.amountMinor) {
        throw new DomainBadRequestError([
          {
            field: 'items',
            message: 'Classified item totals cannot exceed the transaction amount.',
          },
        ]);
      }

      const nextStatus: TransactionStatus =
        itemTotal + remainderAmount >= currentTransaction.amountMinor ? 'classified' : 'partial';
      const nextTransaction: StoredTransaction = {
        ...currentTransaction,
        status: nextStatus,
        updatedAt: nowIso,
        version: currentTransaction.version + 1,
      };
      const nextItems: StoredTransactionItem[] = request.items.map((item) => ({
        ...(item.categoryId ? { categoryId: item.categoryId } : {}),
        confirmed: true,
        createdAt: nowIso,
        id: randomId(),
        itemName: item.itemName.trim(),
        itemNorm: item.itemName.trim().toLowerCase(),
        ...(item.qty !== undefined ? { qty: item.qty } : {}),
        ...(item.unitAmountMinor !== undefined ? { unitAmountMinor: item.unitAmountMinor } : {}),
        totalAmountMinor: item.totalAmountMinor,
        transactionId,
        updatedAt: nowIso,
        userId: session.userId,
        version: 1,
      }));

      repository.saveTransaction(nextTransaction);
      repository.replaceTransactionItems(session.userId, transactionId, nextItems);

      if (request.createRule && request.ruleDraft) {
        const ruleErrors = validateRuleRequest(request.ruleDraft, false);
        ensureValidOrThrow(ruleErrors);
        const firstItem = request.items[0]!;

        repository.saveRule({
          active: true,
          amountMaxMinor: request.ruleDraft.amountMaxMinor,
          amountMinMinor: request.ruleDraft.amountMinMinor,
          autoApply: request.ruleDraft.autoApply ?? false,
          createdAt: nowIso,
          deletedAt: undefined,
          hourBucket: request.ruleDraft.hourBucket,
          id: randomId(),
          merchantMatchType:
            request.ruleDraft.merchantMatchType ??
            (currentTransaction.merchantId ? 'merchantId' : currentTransaction.merchantNorm ? 'merchantNorm' : 'exact'),
          merchantMatchValue:
            request.ruleDraft.merchantMatchValue ??
            currentTransaction.merchantId ??
            currentTransaction.merchantNorm ??
            currentTransaction.merchantRaw ??
            'unknown',
          outputCategoryId: request.ruleDraft.outputCategoryId ?? firstItem.categoryId,
          outputItemName: request.ruleDraft.outputItemName ?? firstItem.itemName,
          priority: 100,
          updatedAt: nowIso,
          userId: session.userId,
          version: 1,
          weekdayMask: request.ruleDraft.weekdayMask,
        });
      }

      const auditEvent = buildAuditEvent(
        randomId,
        nowIso,
        'transaction.classified',
        session.deviceId,
        {
          status: currentTransaction.status,
          version: currentTransaction.version,
        },
        {
          itemCount: nextItems.length,
          remainderAmountMinor: request.remainderAmountMinor,
          remainderType: request.remainderType,
          status: nextStatus,
          version: nextTransaction.version,
        },
      );

      repository.appendAuditEvent({
        ...auditEvent,
        transactionId,
        userId: session.userId,
      });

      return buildTransactionDetail(session.userId, transactionId);
    },
    createItem(accessToken, transactionId, request) {
      ensureValidOrThrow(validateItemCreate(request));

      const session = authenticate(accessToken);
      const transaction = repository.getTransaction(session.userId, transactionId);

      if (!transaction || transaction.status === 'deleted') {
        throw new DomainNotFoundError('Transaction not found.');
      }

      assertVersion(transaction.version, request.transactionVersion);

      if (request.categoryId && !repository.getCategory(session.userId, request.categoryId)) {
        throw new DomainBadRequestError([
          {
            field: 'categoryId',
            message: 'categoryId must reference an existing category.',
          },
        ]);
      }

      const nowIso = now();
      const item: StoredTransactionItem = {
        ...(request.categoryId ? { categoryId: request.categoryId } : {}),
        confirmed: true,
        createdAt: nowIso,
        id: randomId(),
        itemName: request.itemName.trim(),
        itemNorm: request.itemName.trim().toLowerCase(),
        ...(request.qty !== undefined ? { qty: request.qty } : {}),
        totalAmountMinor: request.totalAmountMinor,
        transactionId,
        ...(request.unitAmountMinor !== undefined
          ? { unitAmountMinor: request.unitAmountMinor }
          : {}),
        updatedAt: nowIso,
        userId: session.userId,
        version: 1,
      };

      const nextItems = [
        ...repository.listTransactionItems(session.userId, transactionId, true).filter(
          (existingItem) => !existingItem.deletedAt,
        ),
        item,
      ];
      const nextTransaction = updateTransactionForItems(transaction, nextItems);

      repository.saveTransactionItem(item);
      repository.appendAuditEvent({
        action: 'transaction.item_created',
        actorDeviceId: session.deviceId,
        after: {
          itemId: item.id,
          transactionStatus: nextTransaction.status,
          transactionVersion: nextTransaction.version,
        },
        createdAt: nowIso,
        id: randomId(),
        transactionId,
        userId: session.userId,
      });

      return toTransactionItem(item);
    },
    createBudget(accessToken, request) {
      ensureValidOrThrow(validateBudgetRequest(request, true));

      const session = authenticate(accessToken);
      const nowIso = now();
      const budgetId = randomId();
      const budget: StoredBudget = {
        alert100: request.alert100 ?? true,
        alert50: request.alert50 ?? true,
        alert80: request.alert80 ?? true,
        createdAt: nowIso,
        cycleAnchorDay: request.cycleAnchorDay,
        deletedAt: undefined,
        endDate: request.endDate,
        id: budgetId,
        limitMinor: request.limitMinor,
        name: request.name.trim(),
        periodType: request.periodType,
        startDate: request.startDate,
        updatedAt: nowIso,
        userId: session.userId,
        version: 1,
      };

      repository.saveBudget(budget);
      repository.replaceBudgetScopes(
        session.userId,
        budgetId,
        request.scopes.map((scope) => ({
          ...scope,
          budgetId,
          userId: session.userId,
        })),
      );

      return toBudget(budget);
    },
    createCategory(accessToken, request) {
      ensureValidOrThrow(validateCategoryCreate(request));

      const session = authenticate(accessToken);
      const nowIso = now();
      const category: StoredCategory = {
        colorToken: normalizeOptionalString(request.colorToken),
        createdAt: nowIso,
        deletedAt: undefined,
        iconKey: normalizeOptionalString(request.iconKey),
        id: randomId(),
        isSystem: false,
        name: request.name.trim(),
        updatedAt: nowIso,
        userId: session.userId,
        version: 1,
      };

      repository.saveCategory(category);
      return toCategory(category);
    },
    createMerchant(accessToken, request) {
      ensureValidOrThrow(validateMerchantCreate(request));

      const session = authenticate(accessToken);
      const nowIso = now();
      const label = request.label.trim();
      const normalizedLabel = ensureUniqueMerchantLabel(session.userId, label);
      const merchant: StoredMerchant = {
        createdAt: nowIso,
        deletedAt: undefined,
        id: randomId(),
        label,
        normalizedLabel,
        updatedAt: nowIso,
        userId: session.userId,
        version: 1,
      };

      repository.saveMerchant(merchant);
      return toMerchant(merchant);
    },
    createRule(accessToken, request) {
      ensureValidOrThrow(validateRuleRequest(request));

      const session = authenticate(accessToken);
      const nowIso = now();
      const rule: StoredRule = {
        active: request.active ?? true,
        amountMaxMinor: request.amountMaxMinor,
        amountMinMinor: request.amountMinMinor,
        autoApply: request.autoApply ?? false,
        createdAt: nowIso,
        deletedAt: undefined,
        hourBucket: request.hourBucket,
        id: randomId(),
        merchantMatchType: request.merchantMatchType,
        merchantMatchValue: request.merchantMatchValue.trim(),
        outputCategoryId: request.outputCategoryId,
        outputItemName: normalizeOptionalString(request.outputItemName),
        priority: request.priority,
        updatedAt: nowIso,
        userId: session.userId,
        version: 1,
        weekdayMask: request.weekdayMask,
      };

      repository.saveRule(rule);
      return toRule(rule);
    },
    createTransaction(accessToken, request) {
      ensureValidOrThrow(validateTransactionCreate(request));

      const session = authenticate(accessToken);
      const nowIso = now();
      const transaction: StoredTransaction = {
        amountMinor: request.amountMinor,
        createdAt: nowIso,
        currencyCode: request.currencyCode.trim(),
        id: randomId(),
        merchantId: request.merchantId,
        merchantNorm: normalizeOptionalString(request.merchantNorm),
        merchantRaw: normalizeOptionalString(request.merchantRaw),
        note: normalizeOptionalString(request.note),
        paidAt: request.paidAt,
        source: request.source,
        sourceApp: normalizeOptionalString(request.sourceApp),
        status: request.status ?? 'new',
        updatedAt: nowIso,
        userId: session.userId,
        version: 1,
      };

      repository.saveTransaction(transaction);
      repository.appendAuditEvent({
        action: 'transaction.created',
        actorDeviceId: session.deviceId,
        after: {
          amountMinor: transaction.amountMinor,
          status: transaction.status,
          version: transaction.version,
        },
        createdAt: nowIso,
        id: randomId(),
        transactionId: transaction.id,
        userId: session.userId,
      });

      return toTransaction(transaction);
    },
    deleteItem(accessToken, itemId, request) {
      const errors: FieldError[] = [];
      requirePositiveInteger(request.version, 'version', errors);
      ensureValidOrThrow(errors);

      const session = authenticate(accessToken);
      const item = repository.getTransactionItem(session.userId, itemId);

      if (!item) {
        throw new DomainNotFoundError('Transaction item not found.');
      }

      assertVersion(item.version, request.version);

      const transaction = repository.getTransaction(session.userId, item.transactionId);

      if (!transaction) {
        throw new DomainNotFoundError('Transaction not found.');
      }

      const nowIso = now();
      const nextItem: StoredTransactionItem = {
        ...item,
        deletedAt: nowIso,
        updatedAt: nowIso,
        version: item.version + 1,
      };
      const nextItems = repository
        .listTransactionItems(session.userId, item.transactionId, true)
        .map((existingItem) => (existingItem.id === item.id ? nextItem : existingItem));
      const nextTransaction = updateTransactionForItems(transaction, nextItems);

      repository.saveTransactionItem(nextItem);
      repository.appendAuditEvent({
        action: 'transaction.item_deleted',
        actorDeviceId: session.deviceId,
        after: {
          itemId: item.id,
          transactionStatus: nextTransaction.status,
          transactionVersion: nextTransaction.version,
        },
        before: {
          itemVersion: item.version,
          transactionStatus: transaction.status,
          transactionVersion: transaction.version,
        },
        createdAt: nowIso,
        id: randomId(),
        transactionId: item.transactionId,
        userId: session.userId,
      });
    },
    deleteBudget(accessToken, budgetId) {
      const session = authenticate(accessToken);
      const budget = repository.getBudget(session.userId, budgetId);

      if (!budget) {
        throw new DomainNotFoundError('Budget not found.');
      }

      repository.saveBudget({
        ...budget,
        deletedAt: now(),
        updatedAt: now(),
        version: budget.version + 1,
      });
    },
    deleteCategory(accessToken, categoryId) {
      const session = authenticate(accessToken);
      const category = repository.getCategory(session.userId, categoryId);

      if (!category) {
        throw new DomainNotFoundError('Category not found.');
      }

      repository.saveCategory({
        ...category,
        deletedAt: now(),
        updatedAt: now(),
        version: category.version + 1,
      });
    },
    deleteMerchant(accessToken, merchantId) {
      const session = authenticate(accessToken);
      const merchant = repository.getMerchant(session.userId, merchantId);

      if (!merchant) {
        throw new DomainNotFoundError('Merchant not found.');
      }

      repository.saveMerchant({
        ...merchant,
        deletedAt: now(),
        updatedAt: now(),
        version: merchant.version + 1,
      });
    },
    deleteRule(accessToken, ruleId) {
      const session = authenticate(accessToken);
      const rule = repository.getRule(session.userId, ruleId);

      if (!rule) {
        throw new DomainNotFoundError('Rule not found.');
      }

      repository.saveRule({
        ...rule,
        deletedAt: now(),
        updatedAt: now(),
        version: rule.version + 1,
      });
    },
    deleteTransaction(accessToken, transactionId) {
      const session = authenticate(accessToken);
      const transaction = repository.getTransaction(session.userId, transactionId);

      if (!transaction) {
        throw new DomainNotFoundError('Transaction not found.');
      }

      const nowIso = now();
      repository.saveTransaction({
        ...transaction,
        deletedAt: nowIso,
        status: 'deleted',
        updatedAt: nowIso,
        version: transaction.version + 1,
      });
      repository.appendAuditEvent({
        action: 'transaction.deleted',
        actorDeviceId: session.deviceId,
        after: {
          status: 'deleted',
          version: transaction.version + 1,
        },
        before: {
          status: transaction.status,
          version: transaction.version,
        },
        createdAt: nowIso,
        id: randomId(),
        transactionId,
        userId: session.userId,
      });
    },
    getBudgetDetail(accessToken, budgetId) {
      const session = authenticate(accessToken);
      const budget = repository.getBudget(session.userId, budgetId);

      if (!budget) {
        throw new DomainNotFoundError('Budget not found.');
      }

      const scopes = repository.listBudgetScopes(session.userId, budgetId);
      const summary = calculateBudgetSummary(
        budget,
        scopes,
        repository.listTransactions(session.userId),
        repository.listTransactionItems(session.userId),
        now(),
      );

      return {
        budget: toBudget(budget),
        scopes,
        summary,
      };
    },
    getItemDetail(accessToken, itemId) {
      const session = authenticate(accessToken);
      const item = repository.getTransactionItem(session.userId, itemId);

      if (!item) {
        throw new DomainNotFoundError('Transaction item not found.');
      }

      return toTransactionItem(item);
    },
    getMerchant(accessToken, merchantId) {
      const session = authenticate(accessToken);
      const merchant = repository.getMerchant(session.userId, merchantId);

      if (!merchant) {
        throw new DomainNotFoundError('Merchant not found.');
      }

      return toMerchant(merchant);
    },
    getTransactionDetail(accessToken, transactionId) {
      const session = authenticate(accessToken);
      return buildTransactionDetail(session.userId, transactionId);
    },
    listBudgets(accessToken, includeDeleted = false) {
      const session = authenticate(accessToken);
      return {
        items: repository.listBudgets(session.userId, includeDeleted).map(toBudget),
      };
    },
    listCategories(accessToken, includeDeleted = false) {
      const session = authenticate(accessToken);
      return {
        items: repository.listCategories(session.userId, includeDeleted).map(toCategory),
      };
    },
    listItems(accessToken, query) {
      const session = authenticate(accessToken);
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 50;
      const normalizedSearch = normalizeOptionalString(query.search)?.toLowerCase();
      const filteredItems = repository
        .listTransactionItems(session.userId, query.transactionId, query.includeDeleted ?? false)
        .filter((item) => {
          if (query.categoryId && item.categoryId !== query.categoryId) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          return [item.itemName, item.itemNorm]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLowerCase().includes(normalizedSearch));
        });
      const paginated = paginate(filteredItems, page, pageSize);

      return {
        ...paginated,
        items: paginated.items.map(toTransactionItem),
      };
    },
    listMerchants(accessToken, query) {
      const session = authenticate(accessToken);
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 50;
      const normalizedSearch = normalizeOptionalString(query.search)?.toLowerCase();
      const filteredMerchants = repository
        .listMerchants(session.userId, query.includeDeleted ?? false)
        .filter((merchant) => {
          if (!normalizedSearch) {
            return true;
          }

          return (
            merchant.label.toLowerCase().includes(normalizedSearch) ||
            merchant.normalizedLabel.includes(normalizedSearch)
          );
        });
      const paginated = paginate(filteredMerchants, page, pageSize);

      return {
        ...paginated,
        items: paginated.items.map(toMerchant),
      };
    },
    listRules(accessToken, includeDeleted = false) {
      const session = authenticate(accessToken);
      return {
        items: repository.listRules(session.userId, includeDeleted).map(toRule),
      };
    },
    listTransactions(accessToken, query) {
      const session = authenticate(accessToken);
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 50;
      const normalizedSearch = normalizeOptionalString(query.search)?.toLowerCase();
      const filteredTransactions = repository.listTransactions(session.userId).filter((transaction) => {
        if (query.from && transaction.paidAt < query.from) {
          return false;
        }

        if (query.to && transaction.paidAt > query.to) {
          return false;
        }

        if (query.status) {
          return transaction.status === query.status;
        }

        if (!query.includeDeleted && transaction.status === 'deleted') {
          return false;
        }

        if (query.merchantId && transaction.merchantId !== query.merchantId) {
          return false;
        }

        if (normalizedSearch) {
          const haystack = [
            transaction.note,
            transaction.merchantNorm,
            transaction.merchantRaw,
            transaction.sourceApp,
          ]
            .filter((value): value is string => Boolean(value))
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(normalizedSearch)) {
            return false;
          }
        }

        if (query.categoryId) {
          const transactionItems = repository.listTransactionItems(session.userId, transaction.id);

          return transactionItems.some((item) => item.categoryId === query.categoryId);
        }

        return true;
      });
      const paginated = paginate(filteredTransactions, page, pageSize);

      return {
        ...paginated,
        items: paginated.items.map(toTransaction),
      };
    },
    patchItem(accessToken, itemId, request) {
      ensureValidOrThrow(validateItemPatch(request));

      const session = authenticate(accessToken);
      const item = repository.getTransactionItem(session.userId, itemId);

      if (!item) {
        throw new DomainNotFoundError('Transaction item not found.');
      }

      assertVersion(item.version, request.version);

      if (request.categoryId && !repository.getCategory(session.userId, request.categoryId)) {
        throw new DomainBadRequestError([
          {
            field: 'categoryId',
            message: 'categoryId must reference an existing category.',
          },
        ]);
      }

      const transaction = repository.getTransaction(session.userId, item.transactionId);

      if (!transaction) {
        throw new DomainNotFoundError('Transaction not found.');
      }

      const nowIso = now();
      const nextItem: StoredTransactionItem = {
        ...item,
        ...(request.categoryId !== undefined ? { categoryId: request.categoryId } : {}),
        ...(request.confirmed !== undefined ? { confirmed: request.confirmed } : {}),
        ...(request.itemName !== undefined
          ? {
              itemName: request.itemName.trim(),
              itemNorm: request.itemName.trim().toLowerCase(),
            }
          : {}),
        ...(request.qty !== undefined ? { qty: request.qty } : {}),
        ...(request.totalAmountMinor !== undefined
          ? { totalAmountMinor: request.totalAmountMinor }
          : {}),
        ...(request.unitAmountMinor !== undefined
          ? { unitAmountMinor: request.unitAmountMinor }
          : {}),
        updatedAt: nowIso,
        version: item.version + 1,
      };
      const nextItems = repository
        .listTransactionItems(session.userId, item.transactionId, true)
        .map((existingItem) => (existingItem.id === item.id ? nextItem : existingItem));
      const nextTransaction = updateTransactionForItems(transaction, nextItems);

      repository.saveTransactionItem(nextItem);
      repository.appendAuditEvent({
        action: 'transaction.item_updated',
        actorDeviceId: session.deviceId,
        after: {
          itemId: item.id,
          itemVersion: nextItem.version,
          transactionStatus: nextTransaction.status,
          transactionVersion: nextTransaction.version,
        },
        before: {
          itemVersion: item.version,
          transactionStatus: transaction.status,
          transactionVersion: transaction.version,
        },
        createdAt: nowIso,
        id: randomId(),
        transactionId: item.transactionId,
        userId: session.userId,
      });

      return toTransactionItem(nextItem);
    },
    patchBudget(accessToken, budgetId, request) {
      ensureValidOrThrow(validateBudgetRequest(request, false));

      const session = authenticate(accessToken);
      const budget = repository.getBudget(session.userId, budgetId);

      if (!budget) {
        throw new DomainNotFoundError('Budget not found.');
      }

      assertVersion(budget.version, request.version);
      const nowIso = now();
      const nextBudget: StoredBudget = {
        ...budget,
        ...(request.alert100 !== undefined ? { alert100: request.alert100 } : {}),
        ...(request.alert50 !== undefined ? { alert50: request.alert50 } : {}),
        ...(request.alert80 !== undefined ? { alert80: request.alert80 } : {}),
        ...(request.cycleAnchorDay !== undefined ? { cycleAnchorDay: request.cycleAnchorDay } : {}),
        ...(request.endDate !== undefined ? { endDate: request.endDate } : {}),
        ...(request.limitMinor !== undefined ? { limitMinor: request.limitMinor } : {}),
        ...(request.name !== undefined ? { name: request.name.trim() } : {}),
        ...(request.periodType !== undefined ? { periodType: request.periodType } : {}),
        ...(request.startDate !== undefined ? { startDate: request.startDate } : {}),
        updatedAt: nowIso,
        version: budget.version + 1,
      };

      repository.saveBudget(nextBudget);

      if (request.scopes) {
        repository.replaceBudgetScopes(
          session.userId,
          budgetId,
          request.scopes.map((scope) => ({
            ...scope,
            budgetId,
            userId: session.userId,
          })),
        );
      }

      return toBudget(nextBudget);
    },
    patchCategory(accessToken, categoryId, request) {
      ensureValidOrThrow(validateCategoryPatch(request));

      const session = authenticate(accessToken);
      const category = repository.getCategory(session.userId, categoryId);

      if (!category) {
        throw new DomainNotFoundError('Category not found.');
      }

      assertVersion(category.version, request.version);
      const nextCategory: StoredCategory = {
        ...category,
        ...(request.colorToken !== undefined ? { colorToken: normalizeOptionalString(request.colorToken) } : {}),
        ...(request.iconKey !== undefined ? { iconKey: normalizeOptionalString(request.iconKey) } : {}),
        ...(request.name !== undefined ? { name: request.name.trim() } : {}),
        updatedAt: now(),
        version: category.version + 1,
      };

      repository.saveCategory(nextCategory);
      return toCategory(nextCategory);
    },
    patchMerchant(accessToken, merchantId, request) {
      ensureValidOrThrow(validateMerchantPatch(request));

      const session = authenticate(accessToken);
      const merchant = repository.getMerchant(session.userId, merchantId);

      if (!merchant) {
        throw new DomainNotFoundError('Merchant not found.');
      }

      assertVersion(merchant.version, request.version);
      const nextLabel = request.label?.trim() ?? merchant.label;
      const nextMerchant: StoredMerchant = {
        ...merchant,
        ...(request.label !== undefined
          ? {
              label: nextLabel,
              normalizedLabel: ensureUniqueMerchantLabel(
                session.userId,
                nextLabel,
                merchant.id,
              ),
            }
          : {}),
        updatedAt: now(),
        version: merchant.version + 1,
      };

      repository.saveMerchant(nextMerchant);
      return toMerchant(nextMerchant);
    },
    patchRule(accessToken, ruleId, request) {
      ensureValidOrThrow(validateRuleRequest(request, false));

      const session = authenticate(accessToken);
      const rule = repository.getRule(session.userId, ruleId);

      if (!rule) {
        throw new DomainNotFoundError('Rule not found.');
      }

      assertVersion(rule.version, request.version);
      const nextRule: StoredRule = {
        ...rule,
        ...(request.active !== undefined ? { active: request.active } : {}),
        ...(request.amountMaxMinor !== undefined ? { amountMaxMinor: request.amountMaxMinor } : {}),
        ...(request.amountMinMinor !== undefined ? { amountMinMinor: request.amountMinMinor } : {}),
        ...(request.autoApply !== undefined ? { autoApply: request.autoApply } : {}),
        ...(request.hourBucket !== undefined ? { hourBucket: request.hourBucket } : {}),
        ...(request.merchantMatchType !== undefined ? { merchantMatchType: request.merchantMatchType } : {}),
        ...(request.merchantMatchValue !== undefined
          ? { merchantMatchValue: request.merchantMatchValue.trim() }
          : {}),
        ...(request.outputCategoryId !== undefined ? { outputCategoryId: request.outputCategoryId } : {}),
        ...(request.outputItemName !== undefined
          ? { outputItemName: normalizeOptionalString(request.outputItemName) }
          : {}),
        ...(request.priority !== undefined ? { priority: request.priority } : {}),
        ...(request.weekdayMask !== undefined ? { weekdayMask: request.weekdayMask } : {}),
        updatedAt: now(),
        version: rule.version + 1,
      };

      repository.saveRule(nextRule);
      return toRule(nextRule);
    },
    patchTransaction(accessToken, transactionId, request) {
      ensureValidOrThrow(validateTransactionPatch(request));

      const session = authenticate(accessToken);
      const transaction = repository.getTransaction(session.userId, transactionId);

      if (!transaction) {
        throw new DomainNotFoundError('Transaction not found.');
      }

      assertVersion(transaction.version, request.version);
      const nowIso = now();
      const nextTransaction: StoredTransaction = {
        ...transaction,
        ...(request.merchantId !== undefined ? { merchantId: request.merchantId } : {}),
        ...(request.merchantNorm !== undefined
          ? { merchantNorm: normalizeOptionalString(request.merchantNorm) }
          : {}),
        ...(request.merchantRaw !== undefined ? { merchantRaw: normalizeOptionalString(request.merchantRaw) } : {}),
        ...(request.note !== undefined ? { note: normalizeOptionalString(request.note) } : {}),
        ...(request.status !== undefined ? { status: request.status } : {}),
        updatedAt: nowIso,
        version: transaction.version + 1,
      };

      repository.saveTransaction(nextTransaction);
      repository.appendAuditEvent({
        action: 'transaction.updated',
        actorDeviceId: session.deviceId,
        after: {
          status: nextTransaction.status,
          version: nextTransaction.version,
        },
        before: {
          status: transaction.status,
          version: transaction.version,
        },
        createdAt: nowIso,
        id: randomId(),
        transactionId,
        userId: session.userId,
      });

      return toTransaction(nextTransaction);
    },
  };
}

export { SessionUnauthorizedError };
