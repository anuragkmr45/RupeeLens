export type TransactionStatus = 'new' | 'classified' | 'partial' | 'skipped' | 'deleted';
export type TransactionSource = 'capture' | 'manual' | 'import';
export type SuggestionSource = 'manual' | 'rule' | 'history';
export type RuleMerchantMatchType = 'merchantId' | 'merchantNorm' | 'contains' | 'exact';
export type BudgetPeriodType =
  | 'monthly'
  | 'weekly'
  | 'rolling'
  | 'salary_cycle'
  | 'custom';
export type BudgetScopeType = 'overall' | 'category' | 'merchant' | 'item';
export type BudgetStatus = 'healthy' | 'warning50' | 'warning80' | 'over_limit';
export type RemainderType = 'none' | 'tip' | 'tax' | 'fee' | 'unknown';

export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  code: string;
  fieldErrors?: FieldError[];
  message: string;
}

export interface Transaction {
  amountMinor: number;
  createdAt: string;
  currencyCode: string;
  deletedAt?: string | undefined;
  id: string;
  merchantId?: string | undefined;
  merchantNorm?: string | undefined;
  merchantRaw?: string | undefined;
  note?: string | undefined;
  paidAt: string;
  source: TransactionSource;
  sourceApp?: string | undefined;
  status: TransactionStatus;
  updatedAt: string;
  version: number;
}

export interface TransactionItem {
  categoryId?: string | undefined;
  confirmed: boolean;
  createdAt: string;
  deletedAt?: string | undefined;
  id: string;
  itemName: string;
  itemNorm?: string | undefined;
  qty?: number | undefined;
  suggestionScore?: number | undefined;
  suggestionSource?: SuggestionSource | undefined;
  totalAmountMinor: number;
  transactionId: string;
  unitAmountMinor?: number | undefined;
  updatedAt: string;
  version: number;
}

export interface AuditEvent {
  action: string;
  actorDeviceId?: string | undefined;
  after?: Record<string, unknown> | undefined;
  before?: Record<string, unknown> | undefined;
  createdAt: string;
  id: string;
}

export interface TransactionDetailResponse {
  auditEvents?: AuditEvent[];
  items: TransactionItem[];
  transaction: Transaction;
}

export interface TransactionItemListResponse {
  items: TransactionItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface TransactionListResponse {
  items: Transaction[];
  page: number;
  pageSize: number;
  total: number;
}

export interface TransactionUpsertRequest {
  amountMinor: number;
  currencyCode: string;
  merchantId?: string | undefined;
  merchantNorm?: string | undefined;
  merchantRaw?: string | undefined;
  note?: string | undefined;
  paidAt: string;
  source: TransactionSource;
  sourceApp?: string | undefined;
  status?: Exclude<TransactionStatus, 'deleted'> | undefined;
}

export interface TransactionPatchRequest {
  merchantId?: string | undefined;
  merchantNorm?: string | undefined;
  merchantRaw?: string | undefined;
  note?: string | undefined;
  status?: Exclude<TransactionStatus, 'deleted'> | undefined;
  version: number;
}

export interface ClassifyItemInput {
  categoryId?: string | undefined;
  itemName: string;
  qty?: number | undefined;
  totalAmountMinor: number;
  unitAmountMinor?: number | undefined;
}

export interface RuleDraft {
  amountMaxMinor?: number | undefined;
  amountMinMinor?: number | undefined;
  autoApply?: boolean | undefined;
  hourBucket?: number | undefined;
  merchantMatchType?: RuleMerchantMatchType | undefined;
  merchantMatchValue?: string | undefined;
  outputCategoryId?: string | undefined;
  outputItemName?: string | undefined;
  weekdayMask?: number | undefined;
}

export interface ClassifyTransactionRequest {
  createRule?: boolean | undefined;
  items: ClassifyItemInput[];
  remainderAmountMinor?: number | undefined;
  remainderType?: RemainderType | undefined;
  ruleDraft?: RuleDraft | undefined;
  version: number;
}

export interface TransactionItemUpsertRequest {
  categoryId?: string | undefined;
  itemName: string;
  qty?: number | undefined;
  totalAmountMinor: number;
  transactionVersion: number;
  unitAmountMinor?: number | undefined;
}

export interface TransactionItemPatchRequest {
  categoryId?: string | undefined;
  confirmed?: boolean | undefined;
  itemName?: string | undefined;
  qty?: number | undefined;
  totalAmountMinor?: number | undefined;
  unitAmountMinor?: number | undefined;
  version: number;
}

export interface VersionedDeleteRequest {
  version: number;
}

export interface Merchant {
  createdAt: string;
  deletedAt?: string | undefined;
  id: string;
  label: string;
  normalizedLabel: string;
  updatedAt: string;
  version: number;
}

export interface MerchantListResponse {
  items: Merchant[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MerchantUpsertRequest {
  label: string;
}

export interface MerchantPatchRequest {
  label?: string | undefined;
  version: number;
}

export interface Category {
  colorToken?: string | undefined;
  createdAt: string;
  deletedAt?: string | undefined;
  iconKey?: string | undefined;
  id: string;
  isSystem: boolean;
  name: string;
  updatedAt: string;
  version: number;
}

export interface CategoryListResponse {
  items: Category[];
}

export interface CategoryUpsertRequest {
  colorToken?: string | undefined;
  iconKey?: string | undefined;
  name: string;
}

export interface CategoryPatchRequest {
  colorToken?: string | undefined;
  iconKey?: string | undefined;
  name?: string | undefined;
  version: number;
}

export interface Rule {
  active: boolean;
  amountMaxMinor?: number | undefined;
  amountMinMinor?: number | undefined;
  autoApply: boolean;
  createdAt: string;
  deletedAt?: string | undefined;
  hourBucket?: number | undefined;
  id: string;
  merchantMatchType: RuleMerchantMatchType;
  merchantMatchValue: string;
  outputCategoryId?: string | undefined;
  outputItemName?: string | undefined;
  priority: number;
  updatedAt: string;
  version: number;
  weekdayMask?: number | undefined;
}

export interface RuleUpsertRequest {
  active?: boolean | undefined;
  amountMaxMinor?: number | undefined;
  amountMinMinor?: number | undefined;
  autoApply?: boolean | undefined;
  hourBucket?: number | undefined;
  merchantMatchType: RuleMerchantMatchType;
  merchantMatchValue: string;
  outputCategoryId?: string | undefined;
  outputItemName?: string | undefined;
  priority: number;
  weekdayMask?: number | undefined;
}

export interface RulePatchRequest {
  active?: boolean | undefined;
  amountMaxMinor?: number | undefined;
  amountMinMinor?: number | undefined;
  autoApply?: boolean | undefined;
  hourBucket?: number | undefined;
  merchantMatchType?: RuleMerchantMatchType | undefined;
  merchantMatchValue?: string | undefined;
  outputCategoryId?: string | undefined;
  outputItemName?: string | undefined;
  priority?: number | undefined;
  version: number;
  weekdayMask?: number | undefined;
}

export interface RuleListResponse {
  items: Rule[];
}

export interface BudgetScope {
  scopeRefId?: string | undefined;
  scopeType: BudgetScopeType;
  scopeValueText?: string | undefined;
}

export interface Budget {
  alert100?: boolean | undefined;
  alert50?: boolean | undefined;
  alert80?: boolean | undefined;
  createdAt: string;
  cycleAnchorDay?: number | undefined;
  deletedAt?: string | undefined;
  endDate?: string | undefined;
  id: string;
  limitMinor: number;
  name: string;
  periodType: BudgetPeriodType;
  startDate?: string | undefined;
  updatedAt: string;
  version: number;
}

export interface BudgetSummary {
  periodEnd?: string | undefined;
  periodStart?: string | undefined;
  projectedMinor?: number | undefined;
  remainingMinor: number;
  spentMinor: number;
  status: BudgetStatus;
}

export interface BudgetDetailResponse {
  budget: Budget;
  scopes: BudgetScope[];
  summary: BudgetSummary;
}

export interface BudgetListResponse {
  items: Budget[];
}

export interface BudgetUpsertRequest {
  alert100?: boolean | undefined;
  alert50?: boolean | undefined;
  alert80?: boolean | undefined;
  cycleAnchorDay?: number | undefined;
  endDate?: string | undefined;
  limitMinor: number;
  name: string;
  periodType: BudgetPeriodType;
  scopes: BudgetScope[];
  startDate?: string | undefined;
}

export interface BudgetPatchRequest {
  alert100?: boolean | undefined;
  alert50?: boolean | undefined;
  alert80?: boolean | undefined;
  cycleAnchorDay?: number | undefined;
  endDate?: string | undefined;
  limitMinor?: number | undefined;
  name?: string | undefined;
  periodType?: BudgetPeriodType | undefined;
  scopes?: BudgetScope[] | undefined;
  startDate?: string | undefined;
  version: number;
}

export interface DomainListTransactionsQuery {
  categoryId?: string | undefined;
  from?: string | undefined;
  includeDeleted?: boolean | undefined;
  merchantId?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  search?: string | undefined;
  status?: TransactionStatus | undefined;
  to?: string | undefined;
}

export interface DomainListItemsQuery {
  categoryId?: string | undefined;
  includeDeleted?: boolean | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  search?: string | undefined;
  transactionId?: string | undefined;
}

export interface DomainListMerchantsQuery {
  includeDeleted?: boolean | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  search?: string | undefined;
}
