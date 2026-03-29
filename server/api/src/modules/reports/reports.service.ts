import { calculateBudgetSummary } from '../domain/budget-summary.js';
import type {
  DomainRepository,
  StoredCategory,
  StoredMerchant,
  StoredTransaction,
  StoredTransactionItem,
} from '../domain/domain.repository.js';
import {
  SessionUnauthorizedError,
  type SessionService,
} from '../sessions/sessions.service.js';
import type {
  BreakdownItem,
  BudgetStatusSummary,
  NamedAmount,
  ReportBreakdownQuery,
  ReportBreakdownResponse,
  ReportGroupBy,
  ReportSummaryQuery,
  ReportSummaryResponse,
} from './reports.types.js';

const DEFAULT_BREAKDOWN_LIMIT = 25;
const MAX_BREAKDOWN_LIMIT = 200;

export interface ReportsServiceDependencies {
  repository: DomainRepository;
  sessionService: SessionService;
}

export interface ReportsService {
  getBreakdown(accessToken: string, query: ReportBreakdownQuery): ReportBreakdownResponse;
  getSummary(accessToken: string, query: ReportSummaryQuery): ReportSummaryResponse;
}

export class ReportsBadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportsBadRequestError';
  }
}

interface ReportWindow {
  from: string;
  to: string;
}

interface ReportGroupAccumulator {
  amountMinor: number;
  key: string;
  label: string;
  transactionIds: Set<string>;
}

export function createReportsService({
  repository,
  sessionService,
}: ReportsServiceDependencies): ReportsService {
  function authenticate(accessToken: string) {
    return sessionService.authenticateSession(accessToken);
  }

  function getDirectory(userId: string) {
    return {
      categoriesById: new Map(
        repository.listCategories(userId, true).map((category) => [category.id, category]),
      ),
      merchantsById: new Map(
        repository.listMerchants(userId, true).map((merchant) => [merchant.id, merchant]),
      ),
    };
  }

  return {
    getBreakdown(accessToken, query) {
      const session = authenticate(accessToken);
      const window = validateWindow(query.from, query.to);
      const limit = validateLimit(query.limit);
      const directory = getDirectory(session.userId);
      const transactions = listWindowTransactions(repository, session.userId, window);
      const items = listWindowItems(repository, session.userId, transactions);
      const groupedItems = buildBreakdownItems(
        query.groupBy,
        transactions,
        items,
        directory.categoriesById,
        directory.merchantsById,
      );
      const topItems = groupedItems.slice(0, limit);

      return {
        groupBy: query.groupBy,
        hasMore: groupedItems.length > limit,
        items: topItems,
        limit,
        totalGroups: groupedItems.length,
      };
    },
    getSummary(accessToken, query) {
      const session = authenticate(accessToken);
      const window = validateWindow(query.from, query.to);
      const directory = getDirectory(session.userId);
      const currentTransactions = listWindowTransactions(repository, session.userId, window);
      const currentItems = listWindowItems(repository, session.userId, currentTransactions);
      const previousWindow = buildPreviousWindow(window);
      const previousTransactions = listWindowTransactions(repository, session.userId, previousWindow);
      const merchantBreakdown = buildBreakdownItems(
        'merchant',
        currentTransactions,
        currentItems,
        directory.categoriesById,
        directory.merchantsById,
      );
      const categoryBreakdown = buildBreakdownItems(
        'category',
        currentTransactions,
        currentItems,
        directory.categoriesById,
        directory.merchantsById,
      );
      const itemBreakdown = buildBreakdownItems(
        'item',
        currentTransactions,
        currentItems,
        directory.categoriesById,
        directory.merchantsById,
      );
      const totalSpendMinor = currentTransactions.reduce(
        (total, transaction) => total + transaction.amountMinor,
        0,
      );
      const previousTotalSpendMinor = previousTransactions.reduce(
        (total, transaction) => total + transaction.amountMinor,
        0,
      );
      const deltaMinor = totalSpendMinor - previousTotalSpendMinor;
      const comparison = {
        deltaMinor,
        ...(previousTotalSpendMinor > 0
          ? { deltaPct: roundToTwoDecimals((deltaMinor / previousTotalSpendMinor) * 100) }
          : {}),
        previousTotalSpendMinor,
      };

      return {
        budgetStatuses: buildBudgetStatuses(repository, session.userId, window.to),
        classifiedTransactionCount: currentTransactions.filter((transaction) =>
          ['classified', 'partial'].includes(transaction.status),
        ).length,
        comparison,
        from: window.from,
        to: window.to,
        ...(toNamedAmount(categoryBreakdown[0]) ? { topCategory: toNamedAmount(categoryBreakdown[0]) } : {}),
        ...(toNamedAmount(itemBreakdown[0]) ? { topItem: toNamedAmount(itemBreakdown[0]) } : {}),
        ...(toNamedAmount(merchantBreakdown[0]) ? { topMerchant: toNamedAmount(merchantBreakdown[0]) } : {}),
        totalSpendMinor,
        transactionCount: currentTransactions.length,
        uncategorizedCount: currentTransactions.filter((transaction) =>
          ['new', 'skipped'].includes(transaction.status),
        ).length,
      };
    },
  };
}

function buildBudgetStatuses(
  repository: DomainRepository,
  userId: string,
  reportReferenceIso: string,
): BudgetStatusSummary[] {
  const transactions = repository.listTransactions(userId);
  const items = repository.listTransactionItems(userId);

  return repository
    .listBudgets(userId)
    .map((budget) => {
      const summary = calculateBudgetSummary(
        budget,
        repository.listBudgetScopes(userId, budget.id),
        transactions,
        items,
        reportReferenceIso,
      );

      return {
        budgetId: budget.id,
        limitMinor: budget.limitMinor,
        name: budget.name,
        spentMinor: summary.spentMinor,
        status: summary.status,
      };
    })
    .sort(
      (left, right) =>
        compareBudgetSeverity(right.status, left.status) || left.name.localeCompare(right.name),
    );
}

function buildBreakdownItems(
  groupBy: ReportGroupBy,
  transactions: StoredTransaction[],
  items: StoredTransactionItem[],
  categoriesById: Map<string, StoredCategory>,
  merchantsById: Map<string, StoredMerchant>,
): BreakdownItem[] {
  const groups = new Map<string, ReportGroupAccumulator>();
  const totalSpendMinor =
    groupBy === 'category' || groupBy === 'item'
      ? items.reduce((total, item) => total + item.totalAmountMinor, 0)
      : transactions.reduce((total, transaction) => total + transaction.amountMinor, 0);

  switch (groupBy) {
    case 'merchant':
      transactions.forEach((transaction) => {
        const merchant = resolveMerchant(transaction, merchantsById);
        addToGroup(groups, merchant.key, merchant.label, transaction.amountMinor, transaction.id);
      });
      break;
    case 'category':
      items.forEach((item) => {
        const category = resolveCategory(item, categoriesById);
        addToGroup(groups, category.key, category.label, item.totalAmountMinor, item.transactionId);
      });
      break;
    case 'item':
      items.forEach((item) => {
        const itemKey = (item.itemNorm ?? item.itemName.trim().toLowerCase()) || 'unknown_item';
        const label = item.itemName.trim().length > 0 ? item.itemName.trim() : 'Unknown item';
        addToGroup(groups, itemKey, label, item.totalAmountMinor, item.transactionId);
      });
      break;
    case 'hourOfDay':
      transactions.forEach((transaction) => {
        const hour = new Date(transaction.paidAt).getUTCHours();
        const key = String(hour).padStart(2, '0');
        addToGroup(groups, key, `${key}:00 UTC`, transaction.amountMinor, transaction.id);
      });
      break;
    case 'dayOfWeek':
      transactions.forEach((transaction) => {
        const dayOfWeek = new Date(transaction.paidAt).getUTCDay();
        const key = DAY_OF_WEEK_KEYS[dayOfWeek] ?? 'unknown';
        const label = DAY_OF_WEEK_LABELS[dayOfWeek] ?? 'Unknown';
        addToGroup(groups, key, label, transaction.amountMinor, transaction.id);
      });
      break;
    default:
      break;
  }

  return [...groups.values()]
    .map((group) => ({
      amountMinor: group.amountMinor,
      key: group.key,
      label: group.label,
      percentage:
        totalSpendMinor > 0
          ? roundToTwoDecimals((group.amountMinor / totalSpendMinor) * 100)
          : 0,
      transactionCount: group.transactionIds.size,
    }))
    .sort(
      (left, right) =>
        right.amountMinor - left.amountMinor ||
        right.transactionCount - left.transactionCount ||
        left.label.localeCompare(right.label),
    );
}

function addToGroup(
  groups: Map<string, ReportGroupAccumulator>,
  key: string,
  label: string,
  amountMinor: number,
  transactionId: string,
) {
  const existing = groups.get(key);

  if (existing) {
    existing.amountMinor += amountMinor;
    existing.transactionIds.add(transactionId);
    return;
  }

  groups.set(key, {
    amountMinor,
    key,
    label,
    transactionIds: new Set([transactionId]),
  });
}

function resolveMerchant(
  transaction: StoredTransaction,
  merchantsById: Map<string, StoredMerchant>,
): { key: string; label: string } {
  if (transaction.merchantId) {
    const merchant = merchantsById.get(transaction.merchantId);

    if (merchant) {
      return {
        key: merchant.id,
        label: merchant.label,
      };
    }
  }

  const fallbackLabel =
    normalizeOptionalString(transaction.merchantRaw) ??
    normalizeOptionalString(transaction.merchantNorm) ??
    'Unknown merchant';

  return {
    key: normalizeKey(fallbackLabel),
    label: fallbackLabel,
  };
}

function resolveCategory(
  item: StoredTransactionItem,
  categoriesById: Map<string, StoredCategory>,
): { key: string; label: string } {
  if (item.categoryId) {
    const category = categoriesById.get(item.categoryId);

    if (category) {
      return {
        key: category.id,
        label: category.name,
      };
    }
  }

  return {
    key: 'uncategorized',
    label: 'Uncategorized',
  };
}

function listWindowTransactions(
  repository: DomainRepository,
  userId: string,
  window: ReportWindow,
): StoredTransaction[] {
  const fromMs = Date.parse(window.from);
  const toMs = Date.parse(window.to);

  return repository.listTransactions(userId).filter((transaction) => {
    if (transaction.status === 'deleted' || transaction.deletedAt) {
      return false;
    }

    const paidAtMs = Date.parse(transaction.paidAt);
    return Number.isFinite(paidAtMs) && paidAtMs >= fromMs && paidAtMs <= toMs;
  });
}

function listWindowItems(
  repository: DomainRepository,
  userId: string,
  transactions: StoredTransaction[],
): StoredTransactionItem[] {
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));

  return repository
    .listTransactionItems(userId)
    .filter((item) => !item.deletedAt && transactionIds.has(item.transactionId));
}

function buildPreviousWindow(window: ReportWindow): ReportWindow {
  const fromMs = Date.parse(window.from);
  const toMs = Date.parse(window.to);
  const durationMs = Math.max(0, toMs - fromMs);
  const previousToMs = fromMs - 1;
  const previousFromMs = previousToMs - durationMs;

  return {
    from: new Date(previousFromMs).toISOString(),
    to: new Date(previousToMs).toISOString(),
  };
}

function validateWindow(from: string, to: string): ReportWindow {
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);

  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    throw new ReportsBadRequestError('from and to must be valid ISO date-time strings.');
  }

  if (fromMs > toMs) {
    throw new ReportsBadRequestError('from must be less than or equal to to.');
  }

  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
  };
}

function validateLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_BREAKDOWN_LIMIT;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BREAKDOWN_LIMIT) {
    throw new ReportsBadRequestError(`limit must be an integer between 1 and ${MAX_BREAKDOWN_LIMIT}.`);
  }

  return limit;
}

function compareBudgetSeverity(left: BudgetStatusSummary['status'], right: BudgetStatusSummary['status']) {
  return BUDGET_STATUS_PRIORITY[left] - BUDGET_STATUS_PRIORITY[right];
}

function toNamedAmount(value: BreakdownItem | undefined): NamedAmount | undefined {
  if (!value) {
    return undefined;
  }

  return {
    amountMinor: value.amountMinor,
    name: value.label,
  };
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

const BUDGET_STATUS_PRIORITY: Record<BudgetStatusSummary['status'], number> = {
  healthy: 0,
  over_limit: 3,
  warning50: 1,
  warning80: 2,
};

const DAY_OF_WEEK_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const DAY_OF_WEEK_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export { SessionUnauthorizedError };
