import type { BudgetStatus } from '../domain/domain.types.js';

export type ReportGroupBy =
  | 'category'
  | 'merchant'
  | 'item'
  | 'hourOfDay'
  | 'dayOfWeek';

export interface ReportSummaryQuery {
  from: string;
  to: string;
}

export interface ReportBreakdownQuery extends ReportSummaryQuery {
  groupBy: ReportGroupBy;
  limit?: number | undefined;
}

export interface NamedAmount {
  amountMinor: number;
  name: string;
}

export interface PeriodComparison {
  deltaMinor?: number | undefined;
  deltaPct?: number | undefined;
  previousTotalSpendMinor?: number | undefined;
}

export interface BudgetStatusSummary {
  budgetId: string;
  limitMinor: number;
  name: string;
  spentMinor: number;
  status: BudgetStatus;
}

export interface ReportSummaryResponse {
  budgetStatuses?: BudgetStatusSummary[] | undefined;
  classifiedTransactionCount?: number | undefined;
  comparison?: PeriodComparison | undefined;
  from: string;
  to: string;
  topCategory?: NamedAmount | undefined;
  topItem?: NamedAmount | undefined;
  topMerchant?: NamedAmount | undefined;
  totalSpendMinor: number;
  transactionCount: number;
  uncategorizedCount?: number | undefined;
}

export interface BreakdownItem {
  amountMinor: number;
  key: string;
  label: string;
  percentage: number;
  transactionCount: number;
}

export interface ReportBreakdownResponse {
  groupBy: ReportGroupBy;
  hasMore: boolean;
  items: BreakdownItem[];
  limit: number;
  totalGroups: number;
}
