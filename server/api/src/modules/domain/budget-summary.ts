import type {
  StoredBudget,
  StoredBudgetScope,
  StoredTransaction,
  StoredTransactionItem,
} from './domain.repository.js';
import type { BudgetStatus, BudgetSummary } from './domain.types.js';

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function startOfUtcWeek(value: Date): Date {
  const result = new Date(value);
  result.setUTCHours(0, 0, 0, 0);
  const day = result.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + delta);
  return result;
}

function buildMonthlyWindow(now: Date, anchorDay: number | undefined): { end: Date; start: Date } {
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

function buildBudgetWindow(
  budget: StoredBudget,
  nowIso: string,
): { end: string; start: string } {
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

export function calculateBudgetSummary(
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
                ? items.filter(
                    (item) =>
                      transactionIdsInWindow.has(item.transactionId) &&
                      item.categoryId === scope.scopeRefId,
                  )
                : []
              ).forEach((item) => {
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
