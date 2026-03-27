export type CategoryId = string;
export type MerchantId = string;

export interface CategoryOption {
  description: string;
  id: CategoryId;
  isDefault: boolean;
  label: string;
}

export interface CategoryUsageSummary {
  category: CategoryOption;
  itemCount: number;
  transactionCount: number;
}

export interface MerchantRecord {
  id: MerchantId;
  label: string;
  normalizedLabel: string;
}

export type MerchantAliasSource = 'manual' | 'merged';

export interface MerchantAliasRecord {
  alias: string;
  confidenceBps: number;
  id: string;
  merchantId: MerchantId;
  normalizedAlias: string;
  source: MerchantAliasSource;
}

export type MerchantMatchKind = 'alias' | 'deterministic';

export interface MerchantReviewCandidate {
  confidenceBps: number;
  sourceMerchantId: MerchantId;
  sourceMerchantLabel: string;
  targetMerchantId: MerchantId;
  targetMerchantLabel: string;
}

export interface MerchantUsageSummary {
  aliasCount: number;
  merchant: MerchantRecord;
  transactionCount: number;
}

export interface MerchantDirectoryState {
  merchantAliases: MerchantAliasRecord[];
  merchants: MerchantRecord[];
  reviewCandidates: MerchantReviewCandidate[];
  transactions: Transaction[];
}

export interface TransactionItem {
  amountMinor: number;
  categoryId: CategoryId;
  id: string;
  label: string;
}

export interface TransactionParserInfo {
  confidenceBps: number | null;
  parserId: string;
  parserVersion: string;
}

export type TransactionHistoryKind =
  | 'captured'
  | 'category_merged'
  | 'classified'
  | 'classification_imported'
  | 'manual_added'
  | 'merchant_alias_split'
  | 'merchant_merged'
  | 'note_updated'
  | 'restored'
  | 'skipped'
  | 'split_saved';

export interface TransactionHistoryEntry {
  at: string;
  id: string;
  kind: TransactionHistoryKind;
  summary: string;
}

export interface Transaction {
  amountMinor: number;
  capturedAt: string;
  history?: TransactionHistoryEntry[];
  id: string;
  items: TransactionItem[];
  merchant: string;
  merchantConfidenceBps?: number | null;
  merchantId?: MerchantId | null;
  merchantMatchKind?: MerchantMatchKind | null;
  merchantRaw?: string;
  note?: string;
  parserInfo?: TransactionParserInfo | null;
  sourceApp: string;
  status: TransactionStatus;
}

export type RuleAmountBucket =
  | 'any'
  | 'under_250'
  | 'between_250_and_500'
  | 'between_500_and_1000'
  | 'over_1000';
export type RuleHourBucket = 'any' | 'morning' | 'afternoon' | 'evening' | 'night';
export type RuleWeekday =
  | 'any'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export interface SpendRule {
  amountBucket: RuleAmountBucket;
  autoApply: boolean;
  categoryId: CategoryId;
  createdAt: string;
  hourBucket: RuleHourBucket;
  id: string;
  itemLabel: string;
  merchantId: MerchantId | null;
  merchantLabel: string;
  merchantNormalizedLabel: string;
  updatedAt: string;
  weekday: RuleWeekday;
}

export interface ClassificationDraft {
  autoApplyRule: boolean;
  categoryId: CategoryId | null;
  itemLabel: string;
  saveAsRule: boolean;
}

export interface SplitDraftRow {
  amountInput: string;
  categoryId: CategoryId | null;
  id: string;
  itemLabel: string;
}

export type SplitRemainderDisposition =
  | 'leave_unresolved'
  | 'fees'
  | 'tax'
  | 'tip'
  | 'unknown';

export interface SplitDraft {
  remainderCategoryId: CategoryId | null;
  remainderDisposition: SplitRemainderDisposition;
  rows: SplitDraftRow[];
}

export interface SplitDraftSummary {
  allocatedMinor: number;
  hasInvalidRows: boolean;
  hasOverAllocation: boolean;
  readyRows: Array<{
    amountMinor: number;
    categoryId: CategoryId;
    id: string;
    itemLabel: string;
  }>;
  remainingMinor: number;
  signedRemainingMinor: number;
}

export interface ManualEntryInput {
  amountMinor: number;
  capturedAt?: string;
  categoryId: CategoryId;
  itemLabel: string;
  merchant: string;
  note?: string;
  sourceApp?: string;
  transactionId?: string;
}

export interface DashboardSummary {
  budgetLabel: string;
  budgetRemainingMinor: number;
  budgetProjectedSpendMinor: number;
  budgetTargetMinor: number;
  budgetThresholdState: BudgetThresholdState;
  budgetUsedRatio: number;
  classifiedCount: number;
  inboxCount: number;
  recentActivity: Transaction[];
  topCategoryLabel: string;
  topItems: TransactionItemSummary[];
  topMerchantLabel: string;
  totalSpendMinor: number;
}

export type TransactionStatus =
  | 'classified'
  | 'partially_classified'
  | 'skipped'
  | 'uncategorized';

export type InboxStatusFilter =
  | 'all'
  | 'needs_review'
  | 'partially_classified'
  | 'skipped';
export type InboxAmountFilter = 'all' | 'under_250' | 'between_250_and_500' | 'over_500';
export type InboxAgeFilter = 'all' | 'today' | 'last_3_days' | 'older';
export type TimelineStatusFilter = 'all' | TransactionStatus;
export type TimelineDateFilter = 'all' | 'today' | 'last_7_days' | 'last_30_days' | 'older';

export interface InboxFilters {
  ageFilter: InboxAgeFilter;
  amountFilter: InboxAmountFilter;
  merchantQuery: string;
  sourceApp: string | 'all';
  statusFilter: InboxStatusFilter;
}

export interface InboxReviewItem {
  reviewStatus: Exclude<TransactionStatus, 'classified'>;
  transaction: Transaction;
}

export interface TimelineFilters {
  amountFilter: InboxAmountFilter;
  dateFilter: TimelineDateFilter;
  query: string;
  sourceApp: string | 'all';
  statusFilter: TimelineStatusFilter;
}

export interface TimelineDayGroup {
  dayKey: string;
  label: string;
  transactions: Transaction[];
}

export interface ClassificationSuggestionContext {
  amountMinor?: number | null | undefined;
  capturedAt?: string | null | undefined;
  currentTransactionId?: string;
  merchant: string;
  merchantId?: MerchantId | null | undefined;
}

export type ClassificationSuggestionSource = 'heuristic' | 'history' | 'rule';

export interface ClassificationSuggestion {
  autoApply: boolean;
  categoryId: CategoryId;
  explanation: string[];
  id: string;
  itemLabel: string;
  reason: string;
  ruleId?: string;
  score: number;
  source: ClassificationSuggestionSource;
}

export type BudgetScope = 'overall' | 'category' | 'merchant' | 'item';
export type BudgetPeriod = 'monthly' | 'weekly' | 'rolling' | 'custom';
export type BudgetThresholdState = 'on_track' | 'warning' | 'at_risk' | 'over_budget';

export interface BudgetDefinition {
  categoryId?: CategoryId | null;
  createdAt: string;
  id: string;
  itemLabel?: string | null;
  label: string;
  merchantId?: MerchantId | null;
  merchantLabel?: string | null;
  merchantNormalizedLabel?: string | null;
  period: BudgetPeriod;
  rollingWindowDays?: number | null;
  scope: BudgetScope;
  startsOnDay?: number | null;
  targetMinor: number;
  updatedAt: string;
  weekStartsOn?: number | null;
}

export interface BudgetSummary {
  budget: BudgetDefinition;
  cycleEnd: string;
  cycleStart: string;
  matchedItemCount: number;
  matchedTransactionCount: number;
  overrunMinor: number;
  projectedSpendMinor: number;
  remainingMinor: number;
  spentMinor: number;
  thresholdState: BudgetThresholdState;
  usageRatio: number;
}

interface HistorySuggestionAccumulator {
  amountBucketMatches: number;
  categoryId: CategoryId;
  hourBucketMatches: number;
  itemLabel: string;
  merchantMatches: number;
  occurrences: number;
  weekdayMatches: number;
  mostRecentCapturedAt: string;
}

interface HistoryObservationMatch {
  amountBucketMatched: boolean;
  hourBucketMatched: boolean;
  merchantMatched: boolean;
  weekdayMatched: boolean;
}

export interface DashboardSummaryOptions {
  budgets?: BudgetDefinition[] | null;
  budgetTargetMinor: number;
  cycleStartDay: number;
  now?: string;
  recentActivityLimit?: number;
  topItemsLimit?: number;
}

export interface TransactionItemSummary {
  amountMinor: number;
  categoryLabel: string;
  label: string;
  merchant: string;
  transactionId: string;
}

export const DEFAULT_INBOX_FILTERS: InboxFilters = {
  ageFilter: 'all',
  amountFilter: 'all',
  merchantQuery: '',
  sourceApp: 'all',
  statusFilter: 'needs_review',
};

export const DEFAULT_TIMELINE_FILTERS: TimelineFilters = {
  amountFilter: 'all',
  dateFilter: 'all',
  query: '',
  sourceApp: 'all',
  statusFilter: 'all',
};

export const SPLIT_REMAINDER_OPTIONS: Array<{
  id: SplitRemainderDisposition;
  label: string;
}> = [
  { id: 'leave_unresolved', label: 'Leave in Inbox' },
  { id: 'tip', label: 'Tip' },
  { id: 'tax', label: 'Tax' },
  { id: 'fees', label: 'Fees' },
  { id: 'unknown', label: 'Unknown' },
];

export const categoryOptions: CategoryOption[] = [
  {
    description: 'Electricity, mobile, and utility bills.',
    id: 'bills',
    isDefault: true,
    label: 'Bills',
  },
  {
    description: 'School fees, tuition, books, and classes.',
    id: 'education',
    isDefault: true,
    label: 'Education',
  },
  {
    description: 'Movies, games, streaming, and fun spends.',
    id: 'entertainment',
    isDefault: true,
    label: 'Entertainment',
  },
  {
    description: 'Coffee, dining, snacks, and drinks.',
    id: 'food_drink',
    isDefault: true,
    label: 'Food & Drink',
  },
  {
    description: 'Groceries and daily essentials.',
    id: 'groceries',
    isDefault: true,
    label: 'Groceries',
  },
  {
    description: 'Medicines, clinics, tests, and wellness.',
    id: 'healthcare',
    isDefault: true,
    label: 'Healthcare',
  },
  {
    description: 'Home supplies, repairs, and recurring essentials.',
    id: 'household',
    isDefault: true,
    label: 'Household',
  },
  {
    description: 'Everything that does not fit a stronger default yet.',
    id: 'misc',
    isDefault: true,
    label: 'Miscellaneous',
  },
  {
    description: 'Salon, grooming, skincare, and toiletries.',
    id: 'personal_care',
    isDefault: true,
    label: 'Personal Care',
  },
  {
    description: 'Personal shopping and one-off purchases.',
    id: 'shopping',
    isDefault: true,
    label: 'Shopping',
  },
  {
    description: 'Metro, cab, fuel, and commute spends.',
    id: 'transport',
    isDefault: true,
    label: 'Transport',
  },
  {
    description: 'Flights, hotels, and long-distance travel.',
    id: 'travel',
    isDefault: true,
    label: 'Travel',
  },
];

export function getDefaultCategories(): CategoryOption[] {
  return categoryOptions.map((category) => ({ ...category }));
}

export function normalizeCategories(
  categories: CategoryOption[] | null | undefined,
): CategoryOption[] {
  const defaultCategories = getDefaultCategories();

  if (!Array.isArray(categories)) {
    return defaultCategories;
  }

  const seenIds = new Set(defaultCategories.map((category) => category.id));
  const customCategories: CategoryOption[] = [];

  for (const category of categories) {
    if (
      !category ||
      typeof category !== 'object' ||
      typeof category.id !== 'string' ||
      typeof category.label !== 'string' ||
      typeof category.description !== 'string'
    ) {
      continue;
    }

    const normalizedId = category.id.trim();
    const normalizedLabel = category.label.trim();
    const normalizedDescription = category.description.trim();

    if (
      normalizedId.length === 0 ||
      normalizedLabel.length === 0 ||
      seenIds.has(normalizedId)
    ) {
      continue;
    }

    seenIds.add(normalizedId);
    customCategories.push({
      description: normalizedDescription,
      id: normalizedId,
      isDefault: false,
      label: normalizedLabel,
    });
  }

  customCategories.sort((left, right) => left.label.localeCompare(right.label));

  return [...defaultCategories, ...customCategories];
}

export function addCustomCategory(
  categories: CategoryOption[],
  input: Pick<CategoryOption, 'description' | 'label'>,
): CategoryOption[] {
  const normalizedLabel = input.label.trim();

  if (normalizedLabel.length === 0) {
    return normalizeCategories(categories);
  }

  const normalizedDescription = input.description.trim();
  const nextCategory: CategoryOption = {
    description: normalizedDescription,
    id: buildCustomCategoryId(normalizedLabel, categories),
    isDefault: false,
    label: normalizedLabel,
  };

  return normalizeCategories([...categories, nextCategory]);
}

export function updateCustomCategory(
  categories: CategoryOption[],
  categoryId: CategoryId,
  input: Pick<CategoryOption, 'description' | 'label'>,
): CategoryOption[] {
  const normalizedLabel = input.label.trim();

  if (normalizedLabel.length === 0) {
    return normalizeCategories(categories);
  }

  return normalizeCategories(
    categories.map((category) =>
      category.id === categoryId && !category.isDefault
        ? {
            ...category,
            description: input.description.trim(),
            label: normalizedLabel,
          }
        : category,
    ),
  );
}

export function deleteCustomCategory(
  categories: CategoryOption[],
  categoryId: CategoryId,
): CategoryOption[] {
  return normalizeCategories(
    categories.filter((category) => category.isDefault || category.id !== categoryId),
  );
}

export function summarizeCategoryUsage(
  categories: CategoryOption[],
  transactions: Transaction[],
): CategoryUsageSummary[] {
  const itemCounts = new Map<CategoryId, number>();
  const transactionCounts = new Map<CategoryId, number>();

  for (const transaction of transactions) {
    const categoriesInTransaction = new Set<CategoryId>();

    for (const item of transaction.items) {
      itemCounts.set(item.categoryId, (itemCounts.get(item.categoryId) ?? 0) + 1);
      categoriesInTransaction.add(item.categoryId);
    }

    for (const categoryId of categoriesInTransaction) {
      transactionCounts.set(categoryId, (transactionCounts.get(categoryId) ?? 0) + 1);
    }
  }

  return normalizeCategories(categories).map((category) => ({
    category,
    itemCount: itemCounts.get(category.id) ?? 0,
    transactionCount: transactionCounts.get(category.id) ?? 0,
  }));
}

export function mergeCategories(
  categories: CategoryOption[],
  transactions: Transaction[],
  sourceCategoryId: CategoryId,
  targetCategoryId: CategoryId,
): { categories: CategoryOption[]; transactions: Transaction[] } {
  if (sourceCategoryId === targetCategoryId) {
    return {
      categories: normalizeCategories(categories),
      transactions,
    };
  }

  const normalizedCategories = normalizeCategories(categories);
  const sourceCategory = normalizedCategories.find((category) => category.id === sourceCategoryId);
  const targetCategory = normalizedCategories.find((category) => category.id === targetCategoryId);

  if (!sourceCategory || !targetCategory || sourceCategory.isDefault) {
    return {
      categories: normalizedCategories,
      transactions,
    };
  }

  return {
    categories: deleteCustomCategory(normalizedCategories, sourceCategoryId),
    transactions: transactions.map((transaction) => {
      let mergedItems = 0;

      const nextItems = transaction.items.map((item) => {
        if (item.categoryId !== sourceCategoryId) {
          return item;
        }

        mergedItems += 1;

        return {
          ...item,
          categoryId: targetCategoryId,
        };
      });

      if (mergedItems === 0) {
        return transaction;
      }

      return {
        ...transaction,
        history: appendTransactionHistoryEntry(
          transaction.history,
          createHistoryEntry(
            transaction.id,
            'category_merged',
            `Merged ${sourceCategory.label} into ${targetCategory.label} for ${mergedItems} item row${mergedItems === 1 ? '' : 's'}.`,
          ),
        ),
        items: nextItems,
      };
    }),
  };
}

export function canDeleteCategory(
  categories: CategoryOption[],
  transactions: Transaction[],
  categoryId: CategoryId,
): boolean {
  const category = categories.find((candidate) => candidate.id === categoryId);

  if (!category || category.isDefault) {
    return false;
  }

  return !transactions.some((transaction) =>
    transaction.items.some((item) => item.categoryId === categoryId),
  );
}

function buildCustomCategoryId(
  label: string,
  categories: CategoryOption[],
): CategoryId {
  const baseSlug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'category';
  const prefix = `custom_${baseSlug}`;
  const existingIds = new Set(categories.map((category) => category.id));

  if (!existingIds.has(prefix)) {
    return prefix;
  }

  let suffix = 2;

  while (existingIds.has(`${prefix}_${suffix}`)) {
    suffix += 1;
  }

  return `${prefix}_${suffix}`;
}

const MERCHANT_NOISE_TOKENS = new Set([
  'india',
  'limited',
  'ltd',
  'payment',
  'payments',
  'private',
  'pvt',
  'service',
  'services',
  'solution',
  'solutions',
  'tech',
  'technologies',
]);
const MERCHANT_REVIEW_THRESHOLD_BPS = 7_600;

export function normalizeMerchantLabel(rawMerchant: string): string {
  const sanitizedTokens = rawMerchant
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !MERCHANT_NOISE_TOKENS.has(token))
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => token.length > 1);

  return sanitizedTokens.join(' ').trim();
}

export function normalizeMerchants(
  merchants: MerchantRecord[] | null | undefined,
): MerchantRecord[] {
  if (!Array.isArray(merchants)) {
    return [];
  }

  const normalizedMerchants: MerchantRecord[] = [];
  const seenIds = new Set<string>();
  const seenNormalizedLabels = new Set<string>();

  for (const merchant of merchants) {
    if (
      !merchant ||
      typeof merchant !== 'object' ||
      typeof merchant.id !== 'string' ||
      typeof merchant.label !== 'string'
    ) {
      continue;
    }

    const normalizedLabel = normalizeMerchantLabel(
      merchant.normalizedLabel || merchant.label,
    );
    const normalizedId = merchant.id.trim();
    const normalizedDisplayLabel = formatMerchantLabel(normalizedLabel, merchant.label);

    if (
      normalizedId.length === 0 ||
      normalizedLabel.length === 0 ||
      seenIds.has(normalizedId) ||
      seenNormalizedLabels.has(normalizedLabel)
    ) {
      continue;
    }

    seenIds.add(normalizedId);
    seenNormalizedLabels.add(normalizedLabel);
    normalizedMerchants.push({
      id: normalizedId,
      label: normalizedDisplayLabel,
      normalizedLabel,
    });
  }

  normalizedMerchants.sort((left, right) => left.label.localeCompare(right.label));

  return normalizedMerchants;
}

export function normalizeMerchantAliases(
  merchantAliases: MerchantAliasRecord[] | null | undefined,
  merchants: MerchantRecord[],
): MerchantAliasRecord[] {
  if (!Array.isArray(merchantAliases)) {
    return [];
  }

  const merchantIds = new Set(merchants.map((merchant) => merchant.id));
  const normalizedAliases: MerchantAliasRecord[] = [];
  const seenNormalizedAliases = new Set<string>();

  for (const alias of merchantAliases) {
    if (
      !alias ||
      typeof alias !== 'object' ||
      typeof alias.id !== 'string' ||
      typeof alias.alias !== 'string' ||
      typeof alias.merchantId !== 'string' ||
      typeof alias.confidenceBps !== 'number' ||
      !isMerchantAliasSource(alias.source)
    ) {
      continue;
    }

    const normalizedAlias = normalizeMerchantLabel(
      alias.normalizedAlias || alias.alias,
    );
    const normalizedId = alias.id.trim();
    const normalizedMerchantId = alias.merchantId.trim();
    const normalizedAliasLabel = alias.alias.trim();

    if (
      normalizedId.length === 0 ||
      normalizedAlias.length === 0 ||
      normalizedAliasLabel.length === 0 ||
      !merchantIds.has(normalizedMerchantId) ||
      seenNormalizedAliases.has(normalizedAlias)
    ) {
      continue;
    }

    seenNormalizedAliases.add(normalizedAlias);
    normalizedAliases.push({
      alias: normalizedAliasLabel,
      confidenceBps: alias.confidenceBps,
      id: normalizedId,
      merchantId: normalizedMerchantId,
      normalizedAlias,
      source: alias.source,
    });
  }

  normalizedAliases.sort((left, right) => left.alias.localeCompare(right.alias));

  return normalizedAliases;
}

export function normalizeSpendRules(
  rules: SpendRule[] | null | undefined,
): SpendRule[] {
  if (!Array.isArray(rules)) {
    return [];
  }

  const normalizedRules: SpendRule[] = [];

  for (const rule of rules) {
    if (
      !rule ||
      typeof rule !== 'object' ||
      typeof rule.id !== 'string' ||
      typeof rule.categoryId !== 'string' ||
      typeof rule.itemLabel !== 'string' ||
      typeof rule.merchantLabel !== 'string' ||
      typeof rule.merchantNormalizedLabel !== 'string' ||
      typeof rule.createdAt !== 'string' ||
      typeof rule.updatedAt !== 'string' ||
      typeof rule.autoApply !== 'boolean' ||
      !isRuleAmountBucket(rule.amountBucket) ||
      !isRuleHourBucket(rule.hourBucket) ||
      !isRuleWeekday(rule.weekday)
    ) {
      continue;
    }

    const normalizedCategoryId = rule.categoryId.trim();
    const normalizedItemLabel = rule.itemLabel.trim();
    const normalizedMerchantLabel = rule.merchantLabel.trim();
    const normalizedMerchantId =
      typeof rule.merchantId === 'string' && rule.merchantId.trim().length > 0
        ? rule.merchantId.trim()
        : null;
    const normalizedMerchantNormalizedLabel = normalizeMerchantLabel(
      rule.merchantNormalizedLabel || normalizedMerchantLabel,
    );

    if (
      normalizedCategoryId.length === 0 ||
      normalizedItemLabel.length === 0 ||
      normalizedMerchantLabel.length === 0 ||
      normalizedMerchantNormalizedLabel.length === 0
    ) {
      continue;
    }

    normalizedRules.push({
      amountBucket: rule.amountBucket,
      autoApply: rule.autoApply,
      categoryId: normalizedCategoryId,
      createdAt: rule.createdAt,
      hourBucket: rule.hourBucket,
      id: rule.id.trim(),
      itemLabel: normalizedItemLabel,
      merchantId: normalizedMerchantId,
      merchantLabel: normalizedMerchantLabel,
      merchantNormalizedLabel: normalizedMerchantNormalizedLabel,
      updatedAt: rule.updatedAt,
      weekday: rule.weekday,
    });
  }

  return normalizedRules.sort(compareRulesForDeterministicPriority);
}

export function reconcileMerchantState(
  transactions: Transaction[],
  merchants: MerchantRecord[] | null | undefined = [],
  merchantAliases: MerchantAliasRecord[] | null | undefined = [],
): MerchantDirectoryState {
  const nextMerchants = normalizeMerchants(merchants);
  const transactionsWithRawMerchant = transactions.map((transaction) => ({
    ...transaction,
    merchantRaw: getTransactionRawMerchant(transaction),
  }));
  const ensuredMerchants = ensureMerchantsFromTransactions(
    nextMerchants,
    transactionsWithRawMerchant,
  );
  const nextAliases = normalizeMerchantAliases(merchantAliases, ensuredMerchants);
  const merchantById = new Map(ensuredMerchants.map((merchant) => [merchant.id, merchant]));
  const merchantByNormalizedLabel = new Map(
    ensuredMerchants.map((merchant) => [merchant.normalizedLabel, merchant]),
  );
  const aliasByNormalizedValue = new Map(
    nextAliases.map((alias) => [alias.normalizedAlias, alias]),
  );
  const normalizedTransactions = transactionsWithRawMerchant.map((transaction) => {
    const merchantRaw = getTransactionRawMerchant(transaction);
    const normalizedRawMerchant = normalizeMerchantLabel(merchantRaw);
    const aliasMatch =
      normalizedRawMerchant.length > 0
        ? aliasByNormalizedValue.get(normalizedRawMerchant)
        : undefined;
    const directMerchantMatch =
      normalizedRawMerchant.length > 0
        ? merchantByNormalizedLabel.get(normalizedRawMerchant)
        : undefined;
    const matchedMerchant =
      (aliasMatch ? merchantById.get(aliasMatch.merchantId) : null) ??
      directMerchantMatch ??
      createFallbackMerchant(ensuredMerchants, merchantRaw);

    if (!merchantById.has(matchedMerchant.id)) {
      merchantById.set(matchedMerchant.id, matchedMerchant);
      merchantByNormalizedLabel.set(matchedMerchant.normalizedLabel, matchedMerchant);
      ensuredMerchants.push(matchedMerchant);
    }

    return {
      ...transaction,
      merchant: matchedMerchant.label,
      merchantConfidenceBps: aliasMatch?.confidenceBps ?? 10_000,
      merchantId: matchedMerchant.id,
      merchantMatchKind: aliasMatch ? ('alias' as const) : ('deterministic' as const),
      merchantRaw,
    };
  });
  const normalizedDirectory = normalizeMerchants(ensuredMerchants);

  return {
    merchantAliases: normalizeMerchantAliases(nextAliases, normalizedDirectory),
    merchants: normalizedDirectory,
    reviewCandidates: getMerchantReviewCandidates(
      normalizedDirectory,
      normalizedTransactions,
    ),
    transactions: normalizedTransactions,
  };
}

export function summarizeMerchantUsage(
  merchants: MerchantRecord[],
  merchantAliases: MerchantAliasRecord[],
  transactions: Transaction[],
): MerchantUsageSummary[] {
  const transactionCounts = new Map<MerchantId, number>();
  const aliasCounts = new Map<MerchantId, number>();

  for (const transaction of transactions) {
    const merchantId = transaction.merchantId;

    if (!merchantId) {
      continue;
    }

    transactionCounts.set(merchantId, (transactionCounts.get(merchantId) ?? 0) + 1);
  }

  for (const alias of merchantAliases) {
    aliasCounts.set(alias.merchantId, (aliasCounts.get(alias.merchantId) ?? 0) + 1);
  }

  return normalizeMerchants(merchants).map((merchant) => ({
    aliasCount: aliasCounts.get(merchant.id) ?? 0,
    merchant,
    transactionCount: transactionCounts.get(merchant.id) ?? 0,
  }));
}

export function mergeMerchants(
  merchants: MerchantRecord[],
  merchantAliases: MerchantAliasRecord[],
  transactions: Transaction[],
  sourceMerchantId: MerchantId,
  targetMerchantId: MerchantId,
): MerchantDirectoryState {
  if (sourceMerchantId === targetMerchantId) {
    return reconcileMerchantState(transactions, merchants, merchantAliases);
  }

  const normalizedMerchants = normalizeMerchants(merchants);
  const sourceMerchant = normalizedMerchants.find((merchant) => merchant.id === sourceMerchantId);
  const targetMerchant = normalizedMerchants.find((merchant) => merchant.id === targetMerchantId);

  if (!sourceMerchant || !targetMerchant) {
    return reconcileMerchantState(transactions, normalizedMerchants, merchantAliases);
  }

  const mergedTransactions = transactions.map((transaction) => {
    if (transaction.merchantId !== sourceMerchant.id) {
      return transaction;
    }

    return {
      ...transaction,
      history: appendTransactionHistoryEntry(
        transaction.history,
        createHistoryEntry(
          transaction.id,
          'merchant_merged',
          `Merged merchant ${sourceMerchant.label} into ${targetMerchant.label} and created an alias for future captures.`,
        ),
      ),
    };
  });
  const nextAliases = normalizeMerchantAliases(
    [
      ...merchantAliases.map((alias) =>
        alias.merchantId === sourceMerchant.id
          ? {
              ...alias,
              merchantId: targetMerchant.id,
              source: 'merged' as const,
            }
          : alias,
      ),
      {
        alias: sourceMerchant.label,
        confidenceBps: 10_000,
        id: buildMerchantAliasId(sourceMerchant.label, targetMerchant.id, merchantAliases),
        merchantId: targetMerchant.id,
        normalizedAlias: sourceMerchant.normalizedLabel,
        source: 'merged',
      },
    ],
    normalizedMerchants.filter((merchant) => merchant.id !== sourceMerchant.id),
  );

  return reconcileMerchantState(
    mergedTransactions,
    normalizedMerchants.filter((merchant) => merchant.id !== sourceMerchant.id),
    nextAliases,
  );
}

export function splitMerchantAlias(
  merchants: MerchantRecord[],
  merchantAliases: MerchantAliasRecord[],
  transactions: Transaction[],
  aliasId: string,
): MerchantDirectoryState {
  const aliasToSplit = merchantAliases.find((alias) => alias.id === aliasId);

  if (!aliasToSplit) {
    return reconcileMerchantState(transactions, merchants, merchantAliases);
  }

  const nextMerchants = normalizeMerchants(merchants);
  const revivedMerchant = ensureMerchant(
    nextMerchants,
    formatMerchantLabel(aliasToSplit.normalizedAlias, aliasToSplit.alias),
    aliasToSplit.normalizedAlias,
  );
  const splitTransactions = transactions.map((transaction) => {
    if (normalizeMerchantLabel(getTransactionRawMerchant(transaction)) !== aliasToSplit.normalizedAlias) {
      return transaction;
    }

    return {
      ...transaction,
      history: appendTransactionHistoryEntry(
        transaction.history,
        createHistoryEntry(
          transaction.id,
          'merchant_alias_split',
          `Split alias ${aliasToSplit.alias} back into standalone merchant ${revivedMerchant.label}.`,
        ),
      ),
    };
  });

  return reconcileMerchantState(
    splitTransactions,
    nextMerchants,
    merchantAliases.filter((alias) => alias.id !== aliasId),
  );
}

export function getMerchantReviewCandidates(
  merchants: MerchantRecord[],
  transactions: Transaction[],
): MerchantReviewCandidate[] {
  const transactionCounts = new Map<MerchantId, number>();

  for (const transaction of transactions) {
    const merchantId = transaction.merchantId;

    if (!merchantId) {
      continue;
    }

    transactionCounts.set(merchantId, (transactionCounts.get(merchantId) ?? 0) + 1);
  }

  const candidates = new Map<string, MerchantReviewCandidate>();
  const normalizedMerchants = normalizeMerchants(merchants);

  for (const sourceMerchant of normalizedMerchants) {
    const sourceTransactionCount = transactionCounts.get(sourceMerchant.id) ?? 0;

    if (sourceTransactionCount === 0) {
      continue;
    }

    let bestCandidate: MerchantReviewCandidate | null = null;

    for (const targetMerchant of normalizedMerchants) {
      if (sourceMerchant.id === targetMerchant.id) {
        continue;
      }

      const similarityBps = getMerchantSimilarityBps(
        sourceMerchant.normalizedLabel,
        targetMerchant.normalizedLabel,
      );
      const targetTransactionCount = transactionCounts.get(targetMerchant.id) ?? 0;

      if (
        similarityBps < MERCHANT_REVIEW_THRESHOLD_BPS ||
        targetTransactionCount < sourceTransactionCount
      ) {
        continue;
      }

      if (
        targetTransactionCount === sourceTransactionCount &&
        targetMerchant.label.localeCompare(sourceMerchant.label) >= 0
      ) {
        continue;
      }

      if (
        !bestCandidate ||
        similarityBps > bestCandidate.confidenceBps ||
        (similarityBps === bestCandidate.confidenceBps &&
          targetTransactionCount >
            (transactionCounts.get(bestCandidate.targetMerchantId) ?? 0))
      ) {
        bestCandidate = {
          confidenceBps: similarityBps,
          sourceMerchantId: sourceMerchant.id,
          sourceMerchantLabel: sourceMerchant.label,
          targetMerchantId: targetMerchant.id,
          targetMerchantLabel: targetMerchant.label,
        };
      }
    }

    if (bestCandidate) {
      candidates.set(bestCandidate.sourceMerchantId, bestCandidate);
    }
  }

  return [...candidates.values()].sort(
    (left, right) =>
      right.confidenceBps - left.confidenceBps ||
      left.sourceMerchantLabel.localeCompare(right.sourceMerchantLabel),
  );
}

function ensureMerchantsFromTransactions(
  merchants: MerchantRecord[],
  transactions: Transaction[],
): MerchantRecord[] {
  const nextMerchants = [...merchants];

  for (const transaction of transactions) {
    const rawMerchant = getTransactionRawMerchant(transaction);
    const normalizedRawMerchant = normalizeMerchantLabel(rawMerchant);

    if (normalizedRawMerchant.length === 0) {
      continue;
    }

    ensureMerchant(
      nextMerchants,
      formatMerchantLabel(normalizedRawMerchant, rawMerchant),
      normalizedRawMerchant,
    );
  }

  return nextMerchants;
}

function ensureMerchant(
  merchants: MerchantRecord[],
  label: string,
  normalizedLabel = normalizeMerchantLabel(label),
): MerchantRecord {
  const existingMerchant = merchants.find(
    (merchant) => merchant.normalizedLabel === normalizedLabel,
  );

  if (existingMerchant) {
    return existingMerchant;
  }

  const nextMerchant: MerchantRecord = {
    id: buildMerchantId(label, merchants),
    label: formatMerchantLabel(normalizedLabel, label),
    normalizedLabel,
  };

  merchants.push(nextMerchant);

  return nextMerchant;
}

function createFallbackMerchant(
  merchants: MerchantRecord[],
  rawMerchant: string,
): MerchantRecord {
  const normalizedLabel = normalizeMerchantLabel(rawMerchant);

  return ensureMerchant(
    merchants,
    formatMerchantLabel(normalizedLabel, rawMerchant),
    normalizedLabel,
  );
}

function buildMerchantId(label: string, merchants: MerchantRecord[]): MerchantId {
  const baseSlug =
    normalizeMerchantLabel(label).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') ||
    'merchant';
  const prefix = `merchant_${baseSlug}`;
  const existingIds = new Set(merchants.map((merchant) => merchant.id));

  if (!existingIds.has(prefix)) {
    return prefix;
  }

  let suffix = 2;

  while (existingIds.has(`${prefix}_${suffix}`)) {
    suffix += 1;
  }

  return `${prefix}_${suffix}`;
}

function buildMerchantAliasId(
  alias: string,
  merchantId: MerchantId,
  merchantAliases: MerchantAliasRecord[],
): string {
  const baseSlug =
    normalizeMerchantLabel(alias).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') ||
    'alias';
  const prefix = `${merchantId}_${baseSlug}`;
  const existingIds = new Set(merchantAliases.map((merchantAlias) => merchantAlias.id));

  if (!existingIds.has(prefix)) {
    return prefix;
  }

  let suffix = 2;

  while (existingIds.has(`${prefix}_${suffix}`)) {
    suffix += 1;
  }

  return `${prefix}_${suffix}`;
}

function getMerchantSimilarityBps(left: string, right: string): number {
  if (left === right) {
    return 10_000;
  }

  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  const sharedTokens = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const tokenScore =
    leftTokens.size + rightTokens.size === 0
      ? 0
      : (2 * sharedTokens) / (leftTokens.size + rightTokens.size);
  const charScore = getDiceCoefficient(left, right);

  return Math.round(Math.max(tokenScore, charScore) * 10_000);
}

function getDiceCoefficient(left: string, right: string): number {
  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);

  if (leftBigrams.length === 0 || rightBigrams.length === 0) {
    return 0;
  }

  const remainingRightBigrams = [...rightBigrams];
  let sharedBigrams = 0;

  for (const bigram of leftBigrams) {
    const rightIndex = remainingRightBigrams.indexOf(bigram);

    if (rightIndex === -1) {
      continue;
    }

    sharedBigrams += 1;
    remainingRightBigrams.splice(rightIndex, 1);
  }

  return (2 * sharedBigrams) / (leftBigrams.length + rightBigrams.length);
}

function buildBigrams(value: string): string[] {
  const sanitizedValue = value.replace(/\s+/g, ' ').trim();

  if (sanitizedValue.length < 2) {
    return [];
  }

  const bigrams: string[] = [];

  for (let index = 0; index < sanitizedValue.length - 1; index += 1) {
    bigrams.push(sanitizedValue.slice(index, index + 2));
  }

  return bigrams;
}

function formatMerchantLabel(
  normalizedLabel: string,
  fallbackLabel: string,
): string {
  if (normalizedLabel.length === 0) {
    return fallbackLabel.trim();
  }

  return normalizedLabel
    .split(' ')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function getTransactionRawMerchant(transaction: Transaction): string {
  return (transaction.merchantRaw ?? transaction.merchant).trim();
}

function isMerchantAliasSource(value: unknown): value is MerchantAliasSource {
  return value === 'manual' || value === 'merged';
}

function buildSeededParserInfo(
  sourceApp: Transaction['sourceApp'],
): TransactionParserInfo | null {
  switch (sourceApp) {
    case 'Google Pay':
      return {
        confidenceBps: 9800,
        parserId: 'gpay_upi_v1',
        parserVersion: '1.0.0',
      };
    case 'PhonePe':
      return {
        confidenceBps: 9700,
        parserId: 'phonepe_upi_v1',
        parserVersion: '1.0.0',
      };
    case 'Paytm':
      return {
        confidenceBps: 9650,
        parserId: 'paytm_upi_v1',
        parserVersion: '1.0.0',
      };
    default:
      return null;
  }
}

function buildSeededHistory(
  transaction: Pick<Transaction, 'capturedAt' | 'id' | 'items' | 'merchant' | 'sourceApp' | 'status'>,
): TransactionHistoryEntry[] {
  const baseEntries: TransactionHistoryEntry[] = [
    {
      at: transaction.capturedAt,
      id: `${transaction.id}_history_captured`,
      kind: 'captured',
      summary: `${transaction.sourceApp} capture stored for ${transaction.merchant}.`,
    },
  ];

  if (transaction.status === 'classified' && transaction.items.length > 0) {
    baseEntries.push({
      at: transaction.capturedAt,
      id: `${transaction.id}_history_classified`,
      kind: 'classified',
      summary: `Saved classification with ${transaction.items.length} item row${transaction.items.length === 1 ? '' : 's'}.`,
    });
  }

  return baseEntries;
}

const seededTransactionsBase: Transaction[] = [
  {
    amountMinor: 18000,
    capturedAt: '2026-03-25T09:12:00+05:30',
    history: buildSeededHistory({
      capturedAt: '2026-03-25T09:12:00+05:30',
      id: 'txn_blue_tokai',
      items: [],
      merchant: 'Blue Tokai Roasters',
      sourceApp: 'Google Pay',
      status: 'uncategorized',
    }),
    id: 'txn_blue_tokai',
    items: [],
    merchant: 'Blue Tokai Roasters',
    note: '',
    parserInfo: buildSeededParserInfo('Google Pay'),
    sourceApp: 'Google Pay',
    status: 'uncategorized',
  },
  {
    amountMinor: 64000,
    capturedAt: '2026-03-25T08:34:00+05:30',
    history: buildSeededHistory({
      capturedAt: '2026-03-25T08:34:00+05:30',
      id: 'txn_blinkit',
      items: [],
      merchant: 'Blinkit',
      sourceApp: 'PhonePe',
      status: 'uncategorized',
    }),
    id: 'txn_blinkit',
    items: [],
    merchant: 'Blinkit',
    note: '',
    parserInfo: buildSeededParserInfo('PhonePe'),
    sourceApp: 'PhonePe',
    status: 'uncategorized',
  },
  {
    amountMinor: 32000,
    capturedAt: '2026-03-25T07:48:00+05:30',
    history: buildSeededHistory({
      capturedAt: '2026-03-25T07:48:00+05:30',
      id: 'txn_metro',
      items: [
        {
          amountMinor: 32000,
          categoryId: 'transport',
          id: 'item_metro_1',
          label: 'Metro card top-up',
        },
      ],
      merchant: 'Bangalore Metro',
      sourceApp: 'Paytm',
      status: 'classified',
    }),
    id: 'txn_metro',
    items: [
      {
        amountMinor: 32000,
        categoryId: 'transport',
        id: 'item_metro_1',
        label: 'Metro card top-up',
      },
    ],
    merchant: 'Bangalore Metro',
    note: 'Used for weekday commute.',
    parserInfo: buildSeededParserInfo('Paytm'),
    sourceApp: 'Paytm',
    status: 'classified',
  },
  {
    amountMinor: 21500,
    capturedAt: '2026-03-24T18:30:00+05:30',
    history: buildSeededHistory({
      capturedAt: '2026-03-24T18:30:00+05:30',
      id: 'txn_third_wave',
      items: [
        {
          amountMinor: 21500,
          categoryId: 'food_drink',
          id: 'item_third_wave_1',
          label: 'Flat white and cookie',
        },
      ],
      merchant: 'Third Wave Coffee',
      sourceApp: 'Google Pay',
      status: 'classified',
    }),
    id: 'txn_third_wave',
    items: [
      {
        amountMinor: 21500,
        categoryId: 'food_drink',
        id: 'item_third_wave_1',
        label: 'Flat white and cookie',
      },
    ],
    merchant: 'Third Wave Coffee',
    note: '',
    parserInfo: buildSeededParserInfo('Google Pay'),
    sourceApp: 'Google Pay',
    status: 'classified',
  },
  {
    amountMinor: 42000,
    capturedAt: '2026-03-23T20:14:00+05:30',
    history: buildSeededHistory({
      capturedAt: '2026-03-23T20:14:00+05:30',
      id: 'txn_bigbasket',
      items: [
        {
          amountMinor: 42000,
          categoryId: 'groceries',
          id: 'item_bigbasket_1',
          label: 'Weekly vegetables',
        },
      ],
      merchant: 'BigBasket',
      sourceApp: 'PhonePe',
      status: 'classified',
    }),
    id: 'txn_bigbasket',
    items: [
      {
        amountMinor: 42000,
        categoryId: 'groceries',
        id: 'item_bigbasket_1',
        label: 'Weekly vegetables',
      },
    ],
    merchant: 'BigBasket',
    note: '',
    parserInfo: buildSeededParserInfo('PhonePe'),
    sourceApp: 'PhonePe',
    status: 'classified',
  },
];

const seededMerchantDirectory = reconcileMerchantState(seededTransactionsBase);

export const seededMerchants: MerchantRecord[] = seededMerchantDirectory.merchants;
export const seededMerchantAliases: MerchantAliasRecord[] =
  seededMerchantDirectory.merchantAliases;
export const seededTransactions: Transaction[] = seededMerchantDirectory.transactions;

export function buildClassificationDraft(
  transaction: Transaction,
): ClassificationDraft {
  const firstItem = transaction.items[0];

  return {
    autoApplyRule: false,
    categoryId: firstItem?.categoryId ?? null,
    itemLabel: firstItem?.label ?? '',
    saveAsRule: false,
  };
}

export function buildSplitDraft(
  transaction: Transaction,
  classificationDraft?: Pick<ClassificationDraft, 'categoryId' | 'itemLabel'> | null,
): SplitDraft {
  const seededRows =
    transaction.items.length > 0
      ? transaction.items.map((item, index) => ({
          amountInput: formatMinorForInput(item.amountMinor),
          categoryId: item.categoryId,
          id: item.id || `${transaction.id}_split_${index + 1}`,
          itemLabel: item.label,
        }))
      : [
          createSplitDraftRow({
            amountMinor: transaction.amountMinor,
            categoryId: classificationDraft?.categoryId ?? null,
            itemLabel: classificationDraft?.itemLabel ?? '',
            rowId: `${transaction.id}_split_1`,
          }),
        ];

  return {
    remainderCategoryId: null,
    remainderDisposition: 'leave_unresolved',
    rows: seededRows,
  };
}

export function formatCaptureMoment(capturedAt: string): string {
  const capturedDate = new Date(capturedAt);
  const month = MONTH_LABELS[capturedDate.getMonth()] ?? 'Date';
  const date = capturedDate.getDate();
  const hours24 = capturedDate.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = `${capturedDate.getMinutes()}`.padStart(2, '0');
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';

  return `${month} ${date}, ${hours12}:${minutes} ${meridiem}`;
}

export function formatCurrency(amountMinor: number): string {
  const amount = amountMinor / 100;
  const formattedAmount = Number.isInteger(amount)
    ? amount.toLocaleString('en-IN')
    : amount.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      });

  return `Rs ${formattedAmount}`;
}

export function parseCurrencyInputToMinor(value: string): number | null {
  const normalizedValue = value.replace(/,/g, '').trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return null;
  }

  const [wholePart, fractionalPart = ''] = normalizedValue.split('.');
  return Number(wholePart) * 100 + Number(fractionalPart.padEnd(2, '0'));
}

export function createManualTransaction({
  amountMinor,
  capturedAt = new Date().toISOString(),
  categoryId,
  itemLabel,
  merchant,
  note = '',
  sourceApp = 'Manual entry',
  transactionId = `txn_manual_${Date.now()}`,
}: ManualEntryInput): Transaction {
  const normalizedMerchant = merchant.trim();
  const normalizedItemLabel = itemLabel.trim();
  const normalizedNote = note.trim();

  return {
    amountMinor,
    capturedAt,
    history: [
      {
        at: capturedAt,
        id: `${transactionId}_history_manual_added`,
        kind: 'manual_added',
        summary: `Manual spend saved for ${normalizedMerchant}.`,
      },
      {
        at: capturedAt,
        id: `${transactionId}_history_classified`,
        kind: 'classified',
        summary: 'Manual entry saved with one classified item row.',
      },
    ],
    id: transactionId,
    items: [
      {
        amountMinor,
        categoryId,
        id: `${transactionId}_item_1`,
        label: normalizedItemLabel,
      },
    ],
    merchant: normalizedMerchant,
    merchantRaw: normalizedMerchant,
    note: normalizedNote,
    parserInfo: null,
    sourceApp,
    status: 'classified',
  };
}

export function createSplitDraftRow({
  amountMinor,
  categoryId = null,
  itemLabel = '',
  rowId = `split_row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
}: {
  amountMinor?: number;
  categoryId?: CategoryId | null;
  itemLabel?: string;
  rowId?: string;
} = {}): SplitDraftRow {
  return {
    amountInput:
      typeof amountMinor === 'number' && amountMinor > 0 ? formatMinorForInput(amountMinor) : '',
    categoryId,
    id: rowId,
    itemLabel,
  };
}

export function appendSplitDraftRow(splitDraft: SplitDraft): SplitDraft {
  return {
    ...splitDraft,
    rows: [...splitDraft.rows, createSplitDraftRow()],
  };
}

export function removeSplitDraftRow(
  splitDraft: SplitDraft,
  rowId: string,
): SplitDraft {
  const remainingRows = splitDraft.rows.filter((row) => row.id !== rowId);

  return {
    ...splitDraft,
    rows: remainingRows.length > 0 ? remainingRows : [createSplitDraftRow()],
  };
}

export function moveSplitDraftRow(
  splitDraft: SplitDraft,
  rowId: string,
  direction: 'down' | 'up',
): SplitDraft {
  const currentIndex = splitDraft.rows.findIndex((row) => row.id === rowId);

  if (currentIndex === -1) {
    return splitDraft;
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= splitDraft.rows.length) {
    return splitDraft;
  }

  const nextRows = [...splitDraft.rows];
  const [movedRow] = nextRows.splice(currentIndex, 1);

  if (!movedRow) {
    return splitDraft;
  }

  nextRows.splice(targetIndex, 0, movedRow);

  return {
    ...splitDraft,
    rows: nextRows,
  };
}

export function summarizeSplitDraft(
  totalAmountMinor: number,
  splitDraft: SplitDraft,
): SplitDraftSummary {
  let allocatedMinor = 0;
  let hasInvalidRows = false;
  const readyRows: SplitDraftSummary['readyRows'] = [];

  for (const row of splitDraft.rows) {
    const amountMinor = parseCurrencyInputToMinor(row.amountInput);
    const itemLabel = row.itemLabel.trim();
    const hasAnyContent =
      row.amountInput.trim().length > 0 ||
      itemLabel.length > 0 ||
      row.categoryId !== null;

    if (!hasAnyContent) {
      continue;
    }

    if (!row.categoryId || amountMinor === null || amountMinor <= 0 || itemLabel.length === 0) {
      hasInvalidRows = true;
      continue;
    }

    allocatedMinor += amountMinor;
    readyRows.push({
      amountMinor,
      categoryId: row.categoryId,
      id: row.id,
      itemLabel,
    });
  }

  const signedRemainingMinor = totalAmountMinor - allocatedMinor;

  return {
    allocatedMinor,
    hasInvalidRows,
    hasOverAllocation: signedRemainingMinor < 0,
    readyRows,
    remainingMinor: Math.max(signedRemainingMinor, 0),
    signedRemainingMinor,
  };
}

export function isSplitDraftReady(
  totalAmountMinor: number,
  splitDraft: SplitDraft,
): boolean {
  const summary = summarizeSplitDraft(totalAmountMinor, splitDraft);

  if (
    summary.readyRows.length === 0 ||
    summary.hasInvalidRows ||
    summary.hasOverAllocation
  ) {
    return false;
  }

  if (summary.remainingMinor === 0) {
    return true;
  }

  if (splitDraft.remainderDisposition === 'leave_unresolved') {
    return true;
  }

  return splitDraft.remainderCategoryId !== null;
}

export function splitTransaction(
  transactions: Transaction[],
  transactionId: string,
  splitDraft: SplitDraft,
): Transaction[] {
  return transactions.map((transaction) => {
    if (transaction.id !== transactionId) {
      return transaction;
    }

    if (!isSplitDraftReady(transaction.amountMinor, splitDraft)) {
      return transaction;
    }

    const summary = summarizeSplitDraft(transaction.amountMinor, splitDraft);
    const nextItems = summary.readyRows.map((row, index) => ({
      amountMinor: row.amountMinor,
      categoryId: row.categoryId,
      id: `${transaction.id}_item_${index + 1}`,
      label: row.itemLabel,
    }));

    if (
      summary.remainingMinor > 0 &&
      splitDraft.remainderDisposition !== 'leave_unresolved' &&
      splitDraft.remainderCategoryId
    ) {
      nextItems.push({
        amountMinor: summary.remainingMinor,
        categoryId: splitDraft.remainderCategoryId,
        id: `${transaction.id}_item_${nextItems.length + 1}`,
        label: getRemainderLabel(splitDraft.remainderDisposition),
      });
    }

    return {
      ...transaction,
      history: appendTransactionHistoryEntry(
        transaction.history,
        createHistoryEntry(
          transaction.id,
          summary.remainingMinor > 0 &&
            splitDraft.remainderDisposition === 'leave_unresolved'
            ? 'split_saved'
            : 'classified',
          summary.remainingMinor > 0 &&
            splitDraft.remainderDisposition === 'leave_unresolved'
            ? `Saved ${nextItems.length} split rows and left ${formatCurrency(summary.remainingMinor)} unresolved.`
            : `Saved ${nextItems.length} split rows and fully resolved the payment.`,
        ),
      ),
      items: nextItems,
      status:
        summary.remainingMinor > 0 &&
        splitDraft.remainderDisposition === 'leave_unresolved'
          ? 'partially_classified'
          : 'classified',
    };
  });
}

export function sortTransactionsByCapturedAtDesc(
  transactions: Transaction[],
): Transaction[] {
  return [...transactions].sort(
    (left, right) =>
      new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime(),
  );
}

export function getPendingTransactions(
  transactions: Transaction[],
): Transaction[] {
  return sortTransactionsByCapturedAtDesc(transactions)
    .filter(
      (transaction) =>
        transaction.status === 'uncategorized' ||
        transaction.status === 'partially_classified',
    );
}

export function getInboxReviewTransactions(
  transactions: Transaction[],
  filters: InboxFilters,
  now = new Date().toISOString(),
): InboxReviewItem[] {
  return sortTransactionsByCapturedAtDesc(transactions)
    .filter((transaction) => transaction.status !== 'classified')
    .filter((transaction) => matchesInboxStatusFilter(transaction, filters.statusFilter))
    .filter((transaction) => matchesSourceAppFilter(transaction, filters.sourceApp))
    .filter((transaction) => matchesMerchantFilter(transaction, filters.merchantQuery))
    .filter((transaction) => matchesAmountFilter(transaction, filters.amountFilter))
    .filter((transaction) => matchesAgeFilter(transaction, filters.ageFilter, now))
    .map((transaction) => ({
      reviewStatus:
        transaction.status === 'skipped'
          ? 'skipped'
          : transaction.status === 'partially_classified'
            ? 'partially_classified'
            : 'uncategorized',
      transaction,
    }));
}

export function getInboxSourceAppOptions(transactions: Transaction[]): string[] {
  return [...new Set(
    transactions
      .filter((transaction) => transaction.status !== 'classified')
      .map((transaction) => transaction.sourceApp),
  )].sort((left, right) => left.localeCompare(right));
}

export function getTimelineTransactions(
  transactions: Transaction[],
  filters: TimelineFilters,
  now = new Date().toISOString(),
  categories: CategoryOption[] = categoryOptions,
): Transaction[] {
  return sortTransactionsByCapturedAtDesc(transactions)
    .filter((transaction) => matchesTimelineStatusFilter(transaction, filters.statusFilter))
    .filter((transaction) => matchesSourceAppFilter(transaction, filters.sourceApp))
    .filter((transaction) => matchesAmountFilter(transaction, filters.amountFilter))
    .filter((transaction) => matchesTimelineDateFilter(transaction, filters.dateFilter, now))
    .filter((transaction) => matchesTimelineQuery(transaction, filters.query, categories));
}

export function getTimelineSourceAppOptions(transactions: Transaction[]): string[] {
  return [...new Set(transactions.map((transaction) => transaction.sourceApp))].sort(
    (left, right) => left.localeCompare(right),
  );
}

export function getTimelineDayGroups(
  transactions: Transaction[],
  filters: TimelineFilters,
  now = new Date().toISOString(),
  categories: CategoryOption[] = categoryOptions,
): TimelineDayGroup[] {
  const groupedTransactions = new Map<string, Transaction[]>();
  const filteredTransactions = getTimelineTransactions(transactions, filters, now, categories);

  for (const transaction of filteredTransactions) {
    const dayKey = transaction.capturedAt.slice(0, 10);
    const existingGroup = groupedTransactions.get(dayKey) ?? [];

    groupedTransactions.set(dayKey, [...existingGroup, transaction]);
  }

  return [...groupedTransactions.entries()].map(([dayKey, dayTransactions]) => ({
    dayKey,
    label: formatTimelineDayLabel(dayKey, now),
    transactions: dayTransactions,
  }));
}

export function getTransactionById(
  transactions: Transaction[],
  transactionId: string,
): Transaction | null {
  return transactions.find((transaction) => transaction.id === transactionId) ?? null;
}

export function getTransactionStatusLabel(status: TransactionStatus): string {
  switch (status) {
    case 'classified':
      return 'Classified';
    case 'partially_classified':
      return 'Partially classified';
    case 'skipped':
      return 'Skipped';
    case 'uncategorized':
    default:
      return 'Needs review';
  }
}

export function getUnresolvedAmountMinor(transaction: Transaction): number {
  return Math.max(
    transaction.amountMinor - transaction.items.reduce((sum, item) => sum + item.amountMinor, 0),
    0,
  );
}

export function saveClassificationRule(
  rules: SpendRule[],
  context: Pick<ClassificationSuggestionContext, 'amountMinor' | 'capturedAt' | 'merchant' | 'merchantId'>,
  classification: Pick<ClassificationDraft, 'categoryId' | 'itemLabel'>,
  {
    autoApply = false,
    merchantAliases = [],
    merchants = [],
    now = new Date().toISOString(),
  }: {
    autoApply?: boolean;
    merchantAliases?: MerchantAliasRecord[];
    merchants?: MerchantRecord[];
    now?: string;
  } = {},
): SpendRule[] {
  const categoryId = classification.categoryId;
  const itemLabel = classification.itemLabel.trim();
  const resolvedMerchant = resolveMerchantSuggestionKey(
    context.merchant,
    merchants,
    merchantAliases,
    context.merchantId,
  );

  if (!categoryId || itemLabel.length === 0 || resolvedMerchant.normalizedLabel.length === 0) {
    return normalizeSpendRules(rules);
  }

  const amountBucket = getRuleAmountBucket(context.amountMinor);
  const hourBucket = getRuleHourBucket(context.capturedAt);
  const weekday = getRuleWeekday(context.capturedAt);
  const nextRuleId = buildSpendRuleId(
    resolvedMerchant.normalizedLabel,
    amountBucket,
    hourBucket,
    weekday,
  );
  const normalizedRules = normalizeSpendRules(rules);
  const existingRule = normalizedRules.find((rule) => rule.id === nextRuleId);

  return normalizeSpendRules([
    ...normalizedRules.filter((rule) => rule.id !== nextRuleId),
    {
      amountBucket,
      autoApply,
      categoryId,
      createdAt: existingRule?.createdAt ?? now,
      hourBucket,
      id: nextRuleId,
      itemLabel,
      merchantId: resolvedMerchant.merchantId,
      merchantLabel: resolvedMerchant.label,
      merchantNormalizedLabel: resolvedMerchant.normalizedLabel,
      updatedAt: now,
      weekday,
    },
  ]);
}

export function deleteRulesForCategory(
  rules: SpendRule[],
  categoryId: CategoryId,
): SpendRule[] {
  return normalizeSpendRules(rules).filter((rule) => rule.categoryId !== categoryId);
}

export function mergeRuleCategories(
  rules: SpendRule[],
  sourceCategoryId: CategoryId,
  targetCategoryId: CategoryId,
  now = new Date().toISOString(),
): SpendRule[] {
  return normalizeSpendRules(
    rules.map((rule) =>
      rule.categoryId === sourceCategoryId
        ? {
            ...rule,
            categoryId: targetCategoryId,
            updatedAt: now,
          }
        : rule,
    ),
  );
}

export function mergeRuleMerchants(
  rules: SpendRule[],
  sourceMerchantId: MerchantId,
  targetMerchantId: MerchantId,
  merchants: MerchantRecord[],
  now = new Date().toISOString(),
): SpendRule[] {
  const targetMerchant = normalizeMerchants(merchants).find(
    (merchant) => merchant.id === targetMerchantId,
  );

  if (!targetMerchant) {
    return normalizeSpendRules(rules);
  }

  return normalizeSpendRules(
    rules.map((rule) =>
      rule.merchantId === sourceMerchantId
        ? {
            ...rule,
            merchantId: targetMerchant.id,
            merchantLabel: targetMerchant.label,
            merchantNormalizedLabel: targetMerchant.normalizedLabel,
            updatedAt: now,
          }
        : rule,
    ),
  );
}

export function applyAutoClassificationRules(
  transactions: Transaction[],
  rules: SpendRule[],
  merchants: MerchantRecord[] = [],
  merchantAliases: MerchantAliasRecord[] = [],
  categories: CategoryOption[] = categoryOptions,
): Transaction[] {
  const normalizedRules = normalizeSpendRules(rules);

  if (normalizedRules.length === 0) {
    return transactions;
  }

  return transactions.map((transaction) => {
    if (transaction.status !== 'uncategorized' || transaction.items.length > 0) {
      return transaction;
    }

    const autoSuggestion = getClassificationSuggestions(
      transactions,
      {
        amountMinor: transaction.amountMinor,
        capturedAt: transaction.capturedAt,
        currentTransactionId: transaction.id,
        merchant: transaction.merchantRaw ?? transaction.merchant,
        merchantId: transaction.merchantId,
      },
      normalizedRules,
      merchants,
      merchantAliases,
    ).find((suggestion) => suggestion.source === 'rule' && suggestion.autoApply);

    if (!autoSuggestion) {
      return transaction;
    }

    return {
      ...transaction,
      history: appendTransactionHistoryEntry(
        transaction.history,
        createHistoryEntry(
          transaction.id,
          'classified',
          `Auto-applied your saved rule as ${getCategoryLabel(autoSuggestion.categoryId, categories)} with item "${autoSuggestion.itemLabel}".`,
        ),
      ),
      items: [
        {
          amountMinor: transaction.amountMinor,
          categoryId: autoSuggestion.categoryId,
          id: `${transaction.id}_item_1`,
          label: autoSuggestion.itemLabel,
        },
      ],
      status: 'classified',
    };
  });
}

export function getClassificationSuggestions(
  transactions: Transaction[],
  context: ClassificationSuggestionContext,
  rules: SpendRule[] = [],
  merchants: MerchantRecord[] = [],
  merchantAliases: MerchantAliasRecord[] = [],
): ClassificationSuggestion[] {
  const suggestions = new Map<string, ClassificationSuggestion>();
  const resolvedMerchant = resolveMerchantSuggestionKey(
    context.merchant,
    merchants,
    merchantAliases,
    context.merchantId,
  );
  const normalizedMerchant = resolvedMerchant.normalizedLabel;
  const amountBucket = getRuleAmountBucket(context.amountMinor);
  const hourBucket = getRuleHourBucket(context.capturedAt);
  const weekday = getRuleWeekday(context.capturedAt);
  const historyReferenceCapturedAt = getHistoryReferenceCapturedAt(
    transactions,
    context.capturedAt,
  );

  for (const rule of normalizeSpendRules(rules)) {
    const matchedFactors = getMatchedRuleFactors(rule, {
      amountBucket,
      hourBucket,
      normalizedMerchant,
      weekday,
    });

    if (!matchedFactors) {
      continue;
    }

    upsertSuggestion(suggestions, {
      autoApply: rule.autoApply,
      categoryId: rule.categoryId,
      explanation: matchedFactors,
      id: `rule_${rule.id}`,
      itemLabel: rule.itemLabel,
      reason: buildRuleSuggestionReason(rule, matchedFactors),
      ruleId: rule.id,
      score: 100 + getRuleSpecificity(rule),
      source: 'rule',
    });
  }

  for (const suggestion of getWeightedHistorySuggestions(
    transactions,
    {
      amountBucket,
      currentTransactionId: context.currentTransactionId,
      hourBucket,
      normalizedMerchant,
      referenceCapturedAt: historyReferenceCapturedAt,
      weekday,
    },
    merchants,
    merchantAliases,
  )) {
    upsertSuggestion(suggestions, suggestion);
  }

  for (const suggestion of getMerchantKeywordSuggestions(normalizedMerchant)) {
    upsertSuggestion(suggestions, suggestion);
  }

  return [...suggestions.values()].sort(compareSuggestionsForPriority).slice(0, 3);
}

export function isClassificationReady(classification: ClassificationDraft): boolean {
  return Boolean(classification.categoryId) && classification.itemLabel.trim().length > 0;
}

export function classifyTransaction(
  transactions: Transaction[],
  transactionId: string,
  classification: ClassificationDraft,
  categories: CategoryOption[] = categoryOptions,
): Transaction[] {
  const categoryId = classification.categoryId;
  const itemLabel = classification.itemLabel.trim();

  if (!categoryId || itemLabel.length === 0) {
    return transactions;
  }

  return transactions.map((transaction) => {
    if (transaction.id !== transactionId) {
      return transaction;
    }

    return {
      ...transaction,
      history: appendTransactionHistoryEntry(
        transaction.history,
        createHistoryEntry(
          transaction.id,
          'classified',
          `Saved classification as ${getCategoryLabel(categoryId, categories)} with item "${itemLabel}".`,
        ),
      ),
      items: [
        {
          amountMinor: transaction.amountMinor,
          categoryId,
          id: `${transaction.id}_item_1`,
          label: itemLabel,
        },
      ],
      status: 'classified',
    };
  });
}

export function skipTransaction(
  transactions: Transaction[],
  transactionId: string,
): Transaction[] {
  return updateTransactionStatus(
    transactions,
    transactionId,
    'skipped',
    'Marked this transaction to review later.',
  );
}

export function restoreSkippedTransaction(
  transactions: Transaction[],
  transactionId: string,
): Transaction[] {
  return updateTransactionStatus(
    transactions,
    transactionId,
    'uncategorized',
    'Moved this transaction back into needs review.',
  );
}

export function updateTransactionNote(
  transactions: Transaction[],
  transactionId: string,
  note: string,
): Transaction[] {
  const normalizedNote = note.trim();

  return transactions.map((transaction) => {
    if (transaction.id !== transactionId || (transaction.note ?? '') === normalizedNote) {
      return transaction;
    }

    return {
      ...transaction,
      history: appendTransactionHistoryEntry(
        transaction.history,
        createHistoryEntry(
          transaction.id,
          'note_updated',
          normalizedNote.length > 0
            ? 'Saved a local note on this transaction.'
            : 'Cleared the local note on this transaction.',
        ),
      ),
      note: normalizedNote,
    };
  });
}

export function deleteTransaction(
  transactions: Transaction[],
  transactionId: string,
): Transaction[] {
  return transactions.filter((transaction) => transaction.id !== transactionId);
}

export function summarizeDashboard(
  transactions: Transaction[],
  options: DashboardSummaryOptions,
  categories: CategoryOption[] = categoryOptions,
): DashboardSummary {
  const primaryBudgetSummary = getPrimaryDashboardBudgetSummary(transactions, options);
  const periodTransactions = getTransactionsInRange(
    transactions,
    new Date(primaryBudgetSummary.cycleStart),
    new Date(primaryBudgetSummary.cycleEnd),
  );
  const merchantSpend = new Map<string, number>();
  const categorySpend = new Map<CategoryId, number>();
  const itemSummaries: TransactionItemSummary[] = [];
  const recentActivityLimit = options.recentActivityLimit ?? 3;
  const topItemsLimit = options.topItemsLimit ?? 3;

  let classifiedCount = 0;
  let inboxCount = 0;
  const totalSpendMinor = primaryBudgetSummary.spentMinor;

  for (const transaction of periodTransactions) {
    merchantSpend.set(
      transaction.merchant,
      (merchantSpend.get(transaction.merchant) ?? 0) + transaction.amountMinor,
    );

    if (
      transaction.status === 'uncategorized' ||
      transaction.status === 'partially_classified'
    ) {
      inboxCount += 1;
      if (transaction.status === 'uncategorized') {
        continue;
      }
    }

    if (transaction.status === 'skipped') {
      continue;
    }

    classifiedCount += 1;

    for (const item of transaction.items) {
      categorySpend.set(
        item.categoryId,
        (categorySpend.get(item.categoryId) ?? 0) + item.amountMinor,
      );
      itemSummaries.push({
        amountMinor: item.amountMinor,
        categoryLabel: getCategoryLabel(item.categoryId, categories, 'Needs data'),
        label: item.label,
        merchant: transaction.merchant,
        transactionId: transaction.id,
      });
    }
  }

  return {
    budgetLabel: primaryBudgetSummary.budget.label,
    budgetRemainingMinor: primaryBudgetSummary.remainingMinor,
    budgetProjectedSpendMinor: primaryBudgetSummary.projectedSpendMinor,
    budgetTargetMinor: primaryBudgetSummary.budget.targetMinor,
    budgetThresholdState: primaryBudgetSummary.thresholdState,
    budgetUsedRatio: primaryBudgetSummary.usageRatio,
    classifiedCount,
    inboxCount,
    recentActivity: sortTransactionsByCapturedAtDesc(periodTransactions).slice(0, recentActivityLimit),
    topCategoryLabel: getTopCategoryLabel(categorySpend, categories),
    topItems: itemSummaries
      .sort((left, right) => right.amountMinor - left.amountMinor)
      .slice(0, topItemsLimit),
    topMerchantLabel: getTopMerchantLabel(merchantSpend),
    totalSpendMinor,
  };
}

export function summarizeBudgets(
  transactions: Transaction[],
  budgets: BudgetDefinition[] | null | undefined,
  now?: string,
): BudgetSummary[] {
  const anchorDate = getBudgetAnchorDate(transactions, now);

  return normalizeBudgetDefinitions(budgets).map((budget) =>
    summarizeBudget(transactions, budget, anchorDate),
  );
}

export function normalizeBudgetDefinitions(
  budgets: BudgetDefinition[] | null | undefined,
): BudgetDefinition[] {
  if (!Array.isArray(budgets)) {
    return [];
  }

  const normalizedBudgets: BudgetDefinition[] = [];
  const seenIds = new Set<string>();

  for (const budget of budgets) {
    if (
      !budget ||
      typeof budget !== 'object' ||
      typeof budget.id !== 'string' ||
      typeof budget.label !== 'string' ||
      typeof budget.targetMinor !== 'number' ||
      typeof budget.createdAt !== 'string' ||
      typeof budget.updatedAt !== 'string' ||
      !isBudgetScope(budget.scope) ||
      !isBudgetPeriod(budget.period)
    ) {
      continue;
    }

    const normalizedId = budget.id.trim();
    const normalizedLabel = budget.label.trim();

    if (
      normalizedId.length === 0 ||
      normalizedLabel.length === 0 ||
      budget.targetMinor <= 0 ||
      seenIds.has(normalizedId)
    ) {
      continue;
    }

    const normalizedBudget: BudgetDefinition = {
      createdAt: budget.createdAt,
      id: normalizedId,
      label: normalizedLabel,
      period: budget.period,
      scope: budget.scope,
      targetMinor: Math.round(budget.targetMinor),
      updatedAt: budget.updatedAt,
    };

    if (budget.scope === 'category') {
      if (typeof budget.categoryId !== 'string' || budget.categoryId.trim().length === 0) {
        continue;
      }

      normalizedBudget.categoryId = budget.categoryId.trim();
    }

    if (budget.scope === 'merchant') {
      const merchantNormalizedLabel = normalizeMerchantLabel(
        budget.merchantNormalizedLabel || budget.merchantLabel || '',
      );

      if (merchantNormalizedLabel.length === 0) {
        continue;
      }

      normalizedBudget.merchantId =
        typeof budget.merchantId === 'string' && budget.merchantId.trim().length > 0
          ? budget.merchantId.trim()
          : null;
      normalizedBudget.merchantLabel =
        typeof budget.merchantLabel === 'string' && budget.merchantLabel.trim().length > 0
          ? budget.merchantLabel.trim()
          : formatMerchantLabel(merchantNormalizedLabel, merchantNormalizedLabel);
      normalizedBudget.merchantNormalizedLabel = merchantNormalizedLabel;
    }

    if (budget.scope === 'item') {
      const normalizedItemLabel = normalizeBudgetItemLabel(budget.itemLabel ?? '');

      if (normalizedItemLabel.length === 0) {
        continue;
      }

      normalizedBudget.itemLabel = budget.itemLabel?.trim() ?? '';
    }

    if (budget.period === 'custom') {
      normalizedBudget.startsOnDay = clampBudgetStartDay(budget.startsOnDay);
    }

    if (budget.period === 'weekly') {
      normalizedBudget.weekStartsOn = clampBudgetWeekday(budget.weekStartsOn);
    }

    if (budget.period === 'rolling') {
      normalizedBudget.rollingWindowDays = clampRollingWindowDays(budget.rollingWindowDays);
    }

    seenIds.add(normalizedId);
    normalizedBudgets.push(normalizedBudget);
  }

  normalizedBudgets.sort(compareBudgetsForPriority);
  return normalizedBudgets;
}

function getPrimaryDashboardBudgetSummary(
  transactions: Transaction[],
  options: DashboardSummaryOptions,
): BudgetSummary {
  const normalizedBudgets = normalizeBudgetDefinitions(options.budgets);
  const fallbackBudget = buildLegacyDashboardBudget(options);
  const primaryBudget =
    normalizedBudgets.find((budget) => budget.scope === 'overall') ?? fallbackBudget;

  return summarizeBudget(transactions, primaryBudget, getBudgetAnchorDate(transactions, options.now));
}

function summarizeBudget(
  transactions: Transaction[],
  budget: BudgetDefinition,
  anchorDate: Date,
): BudgetSummary {
  const { cycleEnd, cycleStart } = getBudgetWindow(anchorDate, budget);
  let matchedItemCount = 0;
  let matchedTransactionCount = 0;
  let spentMinor = 0;

  for (const transaction of getTransactionsInRange(transactions, cycleStart, cycleEnd)) {
    if (transaction.status === 'skipped') {
      continue;
    }

    const match = getBudgetSpendMatch(transaction, budget);

    if (!match.matched) {
      continue;
    }

    spentMinor += match.amountMinor;
    matchedItemCount += match.matchedItemCount;
    matchedTransactionCount += 1;
  }

  const projectedSpendMinor = getProjectedBudgetSpendMinor(
    spentMinor,
    budget,
    cycleStart,
    cycleEnd,
    anchorDate,
  );
  const usageRatio = spentMinor / budget.targetMinor;
  const projectedUsageRatio = projectedSpendMinor / budget.targetMinor;

  return {
    budget,
    cycleEnd: cycleEnd.toISOString(),
    cycleStart: cycleStart.toISOString(),
    matchedItemCount,
    matchedTransactionCount,
    overrunMinor: Math.max(spentMinor - budget.targetMinor, 0),
    projectedSpendMinor,
    remainingMinor: Math.max(budget.targetMinor - spentMinor, 0),
    spentMinor,
    thresholdState: getBudgetThresholdState(usageRatio, projectedUsageRatio),
    usageRatio: Math.min(usageRatio, 1),
  };
}

function matchesInboxStatusFilter(
  transaction: Transaction,
  statusFilter: InboxStatusFilter,
): boolean {
  if (statusFilter === 'all') {
    return transaction.status !== 'classified';
  }

  if (statusFilter === 'needs_review') {
    return (
      transaction.status === 'uncategorized' ||
      transaction.status === 'partially_classified'
    );
  }

  if (statusFilter === 'partially_classified') {
    return transaction.status === 'partially_classified';
  }

  return transaction.status === 'skipped';
}

function matchesTimelineStatusFilter(
  transaction: Transaction,
  statusFilter: TimelineStatusFilter,
): boolean {
  return statusFilter === 'all' || transaction.status === statusFilter;
}

function getMerchantKeywordSuggestions(
  normalizedMerchant: string,
): ClassificationSuggestion[] {
  const merchantSuggestionTemplates = [
    {
      categoryId: 'food_drink' as const,
      itemLabel: 'Coffee run',
      keywords: ['cafe', 'chai', 'coffee', 'tokai'],
      reason: 'Merchant looks like food or drink',
    },
    {
      categoryId: 'groceries' as const,
      itemLabel: 'Groceries',
      keywords: ['basket', 'blinkit', 'fresh', 'grocery', 'mart'],
      reason: 'Merchant looks like groceries',
    },
    {
      categoryId: 'transport' as const,
      itemLabel: 'Commute',
      keywords: ['fuel', 'metro', 'ola', 'rapido', 'uber'],
      reason: 'Merchant looks like transport',
    },
    {
      categoryId: 'bills' as const,
      itemLabel: 'Monthly bill',
      keywords: ['bill', 'broadband', 'electric', 'utility'],
      reason: 'Merchant looks like a bill or utility',
    },
    {
      categoryId: 'shopping' as const,
      itemLabel: 'Shopping',
      keywords: ['amazon', 'mall', 'shop', 'store'],
      reason: 'Merchant looks like shopping',
    },
  ];

  return merchantSuggestionTemplates
    .filter((template) =>
      template.keywords.some((keyword) => normalizedMerchant.includes(keyword)),
    )
    .map((template, index) => ({
      autoApply: false,
      categoryId: template.categoryId,
      explanation: ['merchant keyword'],
      id: `heuristic_${template.categoryId}_${index}`,
      itemLabel: template.itemLabel,
      reason: template.reason,
      score: 10,
      source: 'heuristic' as const,
    }));
}

function matchesSourceAppFilter(
  transaction: Transaction,
  sourceAppFilter: InboxFilters['sourceApp'],
): boolean {
  return sourceAppFilter === 'all' || transaction.sourceApp === sourceAppFilter;
}

function matchesMerchantFilter(
  transaction: Transaction,
  merchantQuery: string,
): boolean {
  const normalizedQuery = merchantQuery.trim().toLowerCase();
  const merchantValues = [
    transaction.merchant,
    transaction.merchantRaw ?? transaction.merchant,
  ].map((value) => value.toLowerCase());

  return (
    normalizedQuery.length === 0 ||
    merchantValues.some((value) => value.includes(normalizedQuery))
  );
}

function matchesTimelineQuery(
  transaction: Transaction,
  query: string,
  categories: CategoryOption[],
): boolean {
  const normalizedTokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (normalizedTokens.length === 0) {
    return true;
  }

  const searchHaystacks = [
    transaction.merchant,
    transaction.merchantRaw ?? '',
    transaction.note ?? '',
    transaction.sourceApp,
    getTransactionStatusLabel(transaction.status),
    ...transaction.items.map((item) => item.label),
    ...transaction.items.map((item) => getCategoryLabel(item.categoryId, categories)),
  ].map((value) => value.toLowerCase());

  return normalizedTokens.every((token) =>
    searchHaystacks.some((haystack) => haystack.includes(token)),
  );
}

function matchesAmountFilter(
  transaction: Transaction,
  amountFilter: InboxAmountFilter,
): boolean {
  switch (amountFilter) {
    case 'under_250':
      return transaction.amountMinor < 25000;
    case 'between_250_and_500':
      return transaction.amountMinor >= 25000 && transaction.amountMinor <= 50000;
    case 'over_500':
      return transaction.amountMinor > 50000;
    case 'all':
    default:
      return true;
  }
}

function matchesAgeFilter(
  transaction: Transaction,
  ageFilter: InboxAgeFilter,
  now: string,
): boolean {
  if (ageFilter === 'all') {
    return true;
  }

  const transactionDate = new Date(transaction.capturedAt);
  const referenceDate = new Date(now);
  const todayStart = getStartOfDay(referenceDate);
  const threeDaysAgoStart = new Date(todayStart);

  threeDaysAgoStart.setDate(threeDaysAgoStart.getDate() - 3);

  if (ageFilter === 'today') {
    return transactionDate >= todayStart;
  }

  if (ageFilter === 'last_3_days') {
    return transactionDate >= threeDaysAgoStart && transactionDate < todayStart;
  }

  return transactionDate < threeDaysAgoStart;
}

function matchesTimelineDateFilter(
  transaction: Transaction,
  dateFilter: TimelineDateFilter,
  now: string,
): boolean {
  if (dateFilter === 'all') {
    return true;
  }

  const transactionDate = new Date(transaction.capturedAt);
  const referenceDate = new Date(now);
  const todayStart = getStartOfDay(referenceDate);

  if (dateFilter === 'today') {
    return transactionDate >= todayStart;
  }

  const sevenDaysAgoStart = new Date(todayStart);
  sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 6);

  if (dateFilter === 'last_7_days') {
    return transactionDate >= sevenDaysAgoStart;
  }

  const thirtyDaysAgoStart = new Date(todayStart);
  thirtyDaysAgoStart.setDate(thirtyDaysAgoStart.getDate() - 29);

  if (dateFilter === 'last_30_days') {
    return transactionDate >= thirtyDaysAgoStart;
  }

  return transactionDate < thirtyDaysAgoStart;
}

function getBudgetAnchorDate(transactions: Transaction[], now?: string): Date {
  const sortedTransactions = sortTransactionsByCapturedAtDesc(transactions);

  return new Date(now ?? sortedTransactions[0]?.capturedAt ?? new Date().toISOString());
}

function getTransactionsInRange(
  transactions: Transaction[],
  cycleStart: Date,
  cycleEnd: Date,
): Transaction[] {
  return sortTransactionsByCapturedAtDesc(transactions).filter((transaction) => {
    const capturedAt = new Date(transaction.capturedAt);

    return capturedAt >= cycleStart && capturedAt < cycleEnd;
  });
}

function isBudgetScope(value: unknown): value is BudgetScope {
  return value === 'overall' || value === 'category' || value === 'merchant' || value === 'item';
}

function isBudgetPeriod(value: unknown): value is BudgetPeriod {
  return value === 'monthly' || value === 'weekly' || value === 'rolling' || value === 'custom';
}

function compareBudgetsForPriority(left: BudgetDefinition, right: BudgetDefinition): number {
  if (left.scope !== right.scope) {
    return left.scope === 'overall' ? -1 : right.scope === 'overall' ? 1 : 0;
  }

  const updatedAtDelta =
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

  if (updatedAtDelta !== 0) {
    return updatedAtDelta;
  }

  return left.id.localeCompare(right.id);
}

function clampBudgetStartDay(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.round(value), 1), 31);
}

function clampBudgetWeekday(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.round(value), 0), 6);
}

function clampRollingWindowDays(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 30;
  }

  return Math.min(Math.max(Math.round(value), 1), 365);
}

function normalizeBudgetItemLabel(itemLabel: string): string {
  return itemLabel.trim().toLowerCase();
}

function buildLegacyDashboardBudget(options: DashboardSummaryOptions): BudgetDefinition {
  const normalizedTargetMinor = Math.max(Math.round(options.budgetTargetMinor), 1);
  const normalizedCycleStartDay = clampBudgetStartDay(options.cycleStartDay);
  const budgetPeriod = normalizedCycleStartDay === 1 ? 'monthly' : 'custom';
  const timestamp = options.now ?? new Date().toISOString();
  const fallbackBudget: BudgetDefinition = {
    createdAt: timestamp,
    id: `dashboard_budget_${budgetPeriod}_${normalizedCycleStartDay}`,
    label: 'Current cycle budget',
    period: budgetPeriod,
    scope: 'overall',
    targetMinor: normalizedTargetMinor,
    updatedAt: timestamp,
  };

  if (budgetPeriod === 'custom') {
    fallbackBudget.startsOnDay = normalizedCycleStartDay;
  }

  return fallbackBudget;
}

function getBudgetWindow(
  anchorDate: Date,
  budget: BudgetDefinition,
): { cycleEnd: Date; cycleStart: Date } {
  switch (budget.period) {
    case 'weekly':
      return getWeeklyBudgetWindow(anchorDate, budget.weekStartsOn ?? 1);
    case 'rolling':
      return getRollingBudgetWindow(anchorDate, budget.rollingWindowDays ?? 30);
    case 'custom':
      return getCycleWindow(anchorDate, budget.startsOnDay ?? 1);
    case 'monthly':
    default:
      return getMonthlyBudgetWindow(anchorDate);
  }
}

function getMonthlyBudgetWindow(anchorDate: Date): { cycleEnd: Date; cycleStart: Date } {
  const cycleStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 0, 0, 0, 0);

  return {
    cycleEnd: new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1, 0, 0, 0, 0),
    cycleStart,
  };
}

function getWeeklyBudgetWindow(
  anchorDate: Date,
  weekStartsOn: number,
): { cycleEnd: Date; cycleStart: Date } {
  const anchorDayStart = getStartOfDay(anchorDate);
  const dayDelta = (anchorDayStart.getDay() - weekStartsOn + 7) % 7;
  const cycleStart = new Date(anchorDayStart);

  cycleStart.setDate(cycleStart.getDate() - dayDelta);

  const cycleEnd = new Date(cycleStart);
  cycleEnd.setDate(cycleEnd.getDate() + 7);

  return { cycleEnd, cycleStart };
}

function getRollingBudgetWindow(
  anchorDate: Date,
  rollingWindowDays: number,
): { cycleEnd: Date; cycleStart: Date } {
  const cycleEnd = new Date(getStartOfDay(anchorDate));
  cycleEnd.setDate(cycleEnd.getDate() + 1);

  const cycleStart = new Date(cycleEnd);
  cycleStart.setDate(cycleStart.getDate() - Math.max(rollingWindowDays, 1));

  return { cycleEnd, cycleStart };
}

function getBudgetSpendMatch(
  transaction: Transaction,
  budget: BudgetDefinition,
): { amountMinor: number; matched: boolean; matchedItemCount: number } {
  if (budget.scope === 'overall') {
    return {
      amountMinor: transaction.amountMinor,
      matched: true,
      matchedItemCount: transaction.items.length,
    };
  }

  if (budget.scope === 'merchant') {
    const transactionNormalizedMerchant = normalizeMerchantLabel(
      getTransactionRawMerchant(transaction),
    );
    const matchesMerchant =
      (budget.merchantId && transaction.merchantId === budget.merchantId) ||
      transactionNormalizedMerchant === budget.merchantNormalizedLabel;

    return {
      amountMinor: matchesMerchant ? transaction.amountMinor : 0,
      matched: matchesMerchant,
      matchedItemCount: matchesMerchant ? transaction.items.length : 0,
    };
  }

  if (budget.scope === 'category') {
    const matchedItems = transaction.items.filter((item) => item.categoryId === budget.categoryId);

    return {
      amountMinor: matchedItems.reduce((sum, item) => sum + item.amountMinor, 0),
      matched: matchedItems.length > 0,
      matchedItemCount: matchedItems.length,
    };
  }

  const normalizedBudgetItemLabel = normalizeBudgetItemLabel(budget.itemLabel ?? '');
  const matchedItems = transaction.items.filter(
    (item) => normalizeBudgetItemLabel(item.label) === normalizedBudgetItemLabel,
  );

  return {
    amountMinor: matchedItems.reduce((sum, item) => sum + item.amountMinor, 0),
    matched: matchedItems.length > 0,
    matchedItemCount: matchedItems.length,
  };
}

function getProjectedBudgetSpendMinor(
  spentMinor: number,
  budget: BudgetDefinition,
  cycleStart: Date,
  cycleEnd: Date,
  anchorDate: Date,
): number {
  if (spentMinor <= 0) {
    return 0;
  }

  if (budget.period === 'rolling') {
    return spentMinor;
  }

  const totalWindowMs = Math.max(cycleEnd.getTime() - cycleStart.getTime(), 1);
  const referenceTime = Math.min(Math.max(anchorDate.getTime(), cycleStart.getTime()), cycleEnd.getTime());
  const elapsedWindowMs = Math.max(referenceTime - cycleStart.getTime(), 1);

  return Math.max(spentMinor, Math.round((spentMinor / elapsedWindowMs) * totalWindowMs));
}

function getBudgetThresholdState(
  usageRatio: number,
  projectedUsageRatio: number,
): BudgetThresholdState {
  if (usageRatio >= 1) {
    return 'over_budget';
  }

  if (projectedUsageRatio >= 1) {
    return 'at_risk';
  }

  if (usageRatio >= 0.8 || projectedUsageRatio >= 0.8) {
    return 'warning';
  }

  return 'on_track';
}

function getCycleWindow(
  anchorDate: Date,
  cycleStartDay: number,
): { cycleEnd: Date; cycleStart: Date } {
  let cycleStart = buildCycleAnchor(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    cycleStartDay,
  );

  if (anchorDate < cycleStart) {
    cycleStart = buildCycleAnchor(
      anchorDate.getFullYear(),
      anchorDate.getMonth() - 1,
      cycleStartDay,
    );
  }

  return {
    cycleEnd: buildCycleAnchor(
      cycleStart.getFullYear(),
      cycleStart.getMonth() + 1,
      cycleStartDay,
    ),
    cycleStart,
  };
}

function buildCycleAnchor(
  year: number,
  monthIndex: number,
  cycleStartDay: number,
): Date {
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();

  return new Date(
    year,
    monthIndex,
    Math.min(cycleStartDay, lastDayOfMonth),
    0,
    0,
    0,
    0,
  );
}

function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function updateTransactionStatus(
  transactions: Transaction[],
  transactionId: string,
  status: Extract<TransactionStatus, 'skipped' | 'uncategorized'>,
  summary: string,
): Transaction[] {
  return transactions.map((transaction) =>
    transaction.id === transactionId
      ? {
          ...transaction,
          history: appendTransactionHistoryEntry(
            transaction.history,
            createHistoryEntry(
              transaction.id,
              status === 'skipped' ? 'skipped' : 'restored',
              summary,
            ),
          ),
          status,
        }
      : transaction,
  );
}

function formatMinorForInput(amountMinor: number): string {
  const whole = Math.trunc(amountMinor / 100);
  const fractional = Math.abs(amountMinor % 100);

  return fractional === 0
    ? `${whole}`
    : `${whole}.${`${fractional}`.padStart(2, '0')}`;
}

function getRemainderLabel(
  remainderDisposition: Exclude<SplitRemainderDisposition, 'leave_unresolved'>,
): string {
  switch (remainderDisposition) {
    case 'tip':
      return 'Tip';
    case 'tax':
      return 'Tax';
    case 'fees':
      return 'Fees';
    case 'unknown':
    default:
      return 'Unknown remainder';
  }
}

function getTopCategoryLabel(
  categorySpend: Map<CategoryId, number>,
  categories: CategoryOption[] = categoryOptions,
): string {
  let topCategoryId: CategoryId | null = null;
  let topCategorySpend = -1;

  for (const [categoryId, spendMinor] of categorySpend.entries()) {
    if (spendMinor > topCategorySpend) {
      topCategoryId = categoryId;
      topCategorySpend = spendMinor;
    }
  }

  if (topCategoryId === null) {
    return 'Needs data';
  }

  return getCategoryLabel(topCategoryId, categories, 'Needs data');
}

function getTopMerchantLabel(merchantSpend: Map<string, number>): string {
  let topMerchantLabel = 'Needs data';
  let topMerchantSpend = -1;

  for (const [merchantLabel, spendMinor] of merchantSpend.entries()) {
    if (spendMinor > topMerchantSpend) {
      topMerchantLabel = merchantLabel;
      topMerchantSpend = spendMinor;
    }
  }

  return topMerchantLabel;
}

function resolveMerchantSuggestionKey(
  merchant: string,
  merchants: MerchantRecord[],
  merchantAliases: MerchantAliasRecord[],
  merchantId?: MerchantId | null,
): { label: string; merchantId: MerchantId | null; normalizedLabel: string } {
  const normalizedMerchant = normalizeMerchantLabel(merchant);

  if (normalizedMerchant.length === 0) {
    return {
      label: merchant.trim(),
      merchantId: null,
      normalizedLabel: '',
    };
  }

  const normalizedMerchants = normalizeMerchants(merchants);
  const normalizedAliases = normalizeMerchantAliases(merchantAliases, normalizedMerchants);
  const merchantById = new Map(normalizedMerchants.map((entry) => [entry.id, entry]));
  const merchantByNormalizedLabel = new Map(
    normalizedMerchants.map((entry) => [entry.normalizedLabel, entry]),
  );
  const aliasByNormalizedLabel = new Map(
    normalizedAliases.map((entry) => [entry.normalizedAlias, entry]),
  );

  const directMerchant =
    (merchantId ? merchantById.get(merchantId) : null) ??
    (() => {
      const aliasMatch = aliasByNormalizedLabel.get(normalizedMerchant);

      if (aliasMatch) {
        return merchantById.get(aliasMatch.merchantId) ?? null;
      }

      return merchantByNormalizedLabel.get(normalizedMerchant) ?? null;
    })();

  return {
    label: directMerchant?.label ?? formatMerchantLabel(normalizedMerchant, merchant),
    merchantId: directMerchant?.id ?? (merchantId ?? null),
    normalizedLabel: directMerchant?.normalizedLabel ?? normalizedMerchant,
  };
}

function isRuleAmountBucket(value: unknown): value is RuleAmountBucket {
  return (
    value === 'any' ||
    value === 'under_250' ||
    value === 'between_250_and_500' ||
    value === 'between_500_and_1000' ||
    value === 'over_1000'
  );
}

function isRuleHourBucket(value: unknown): value is RuleHourBucket {
  return (
    value === 'any' ||
    value === 'morning' ||
    value === 'afternoon' ||
    value === 'evening' ||
    value === 'night'
  );
}

function isRuleWeekday(value: unknown): value is RuleWeekday {
  return (
    value === 'any' ||
    value === 'sunday' ||
    value === 'monday' ||
    value === 'tuesday' ||
    value === 'wednesday' ||
    value === 'thursday' ||
    value === 'friday' ||
    value === 'saturday'
  );
}

function getRuleAmountBucket(amountMinor?: number | null): RuleAmountBucket {
  if (typeof amountMinor !== 'number' || amountMinor <= 0) {
    return 'any';
  }

  if (amountMinor < 25_000) {
    return 'under_250';
  }

  if (amountMinor <= 50_000) {
    return 'between_250_and_500';
  }

  if (amountMinor <= 100_000) {
    return 'between_500_and_1000';
  }

  return 'over_1000';
}

function getRuleHourBucket(capturedAt?: string | null): RuleHourBucket {
  if (!capturedAt) {
    return 'any';
  }

  const capturedDate = new Date(capturedAt);
  const hours = capturedDate.getHours();

  if (hours >= 5 && hours <= 11) {
    return 'morning';
  }

  if (hours >= 12 && hours <= 16) {
    return 'afternoon';
  }

  if (hours >= 17 && hours <= 21) {
    return 'evening';
  }

  return 'night';
}

function getRuleWeekday(capturedAt?: string | null): RuleWeekday {
  if (!capturedAt) {
    return 'any';
  }

  const dayIndex = new Date(capturedAt).getDay();
  const weekdays: RuleWeekday[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  return weekdays[dayIndex] ?? 'any';
}

function getRuleSpecificity(rule: SpendRule): number {
  return [
    true,
    rule.amountBucket !== 'any',
    rule.hourBucket !== 'any',
    rule.weekday !== 'any',
  ].filter(Boolean).length;
}

function compareRulesForDeterministicPriority(left: SpendRule, right: SpendRule): number {
  const specificityDelta = getRuleSpecificity(right) - getRuleSpecificity(left);

  if (specificityDelta !== 0) {
    return specificityDelta;
  }

  const updatedAtDelta =
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

  if (updatedAtDelta !== 0) {
    return updatedAtDelta;
  }

  return left.id.localeCompare(right.id);
}

function compareSuggestionsForPriority(
  left: ClassificationSuggestion,
  right: ClassificationSuggestion,
): number {
  const scoreDelta = right.score - left.score;

  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  if (left.autoApply !== right.autoApply) {
    return left.autoApply ? -1 : 1;
  }

  return left.itemLabel.localeCompare(right.itemLabel);
}

function upsertSuggestion(
  suggestions: Map<string, ClassificationSuggestion>,
  suggestion: ClassificationSuggestion,
): void {
  const suggestionKey = buildSuggestionKey(suggestion.categoryId, suggestion.itemLabel);
  const existingSuggestion = suggestions.get(suggestionKey);

  if (
    !existingSuggestion ||
    compareSuggestionsForPriority(existingSuggestion, suggestion) > 0
  ) {
    suggestions.set(suggestionKey, suggestion);
  }
}

function buildSuggestionKey(categoryId: CategoryId, itemLabel: string): string {
  return `${categoryId}:${itemLabel.trim().toLowerCase()}`;
}

function buildSpendRuleId(
  merchantNormalizedLabel: string,
  amountBucket: RuleAmountBucket,
  hourBucket: RuleHourBucket,
  weekday: RuleWeekday,
): string {
  const merchantSlug = merchantNormalizedLabel.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  return `rule_${merchantSlug || 'merchant'}_${amountBucket}_${hourBucket}_${weekday}`;
}

function getMatchedRuleFactors(
  rule: SpendRule,
  context: {
    amountBucket: RuleAmountBucket;
    hourBucket: RuleHourBucket;
    normalizedMerchant: string;
    weekday: RuleWeekday;
  },
): string[] | null {
  if (
    context.normalizedMerchant.length === 0 ||
    rule.merchantNormalizedLabel !== context.normalizedMerchant
  ) {
    return null;
  }

  const matchedFactors = [`merchant ${rule.merchantLabel}`];

  if (rule.amountBucket !== 'any') {
    if (context.amountBucket !== rule.amountBucket) {
      return null;
    }

    matchedFactors.push(`amount ${formatRuleAmountBucket(rule.amountBucket)}`);
  }

  if (rule.hourBucket !== 'any') {
    if (context.hourBucket !== rule.hourBucket) {
      return null;
    }

    matchedFactors.push(`${formatRuleHourBucket(rule.hourBucket)} timing`);
  }

  if (rule.weekday !== 'any') {
    if (context.weekday !== rule.weekday) {
      return null;
    }

    matchedFactors.push(formatRuleWeekday(rule.weekday));
  }

  return matchedFactors;
}

function buildRuleSuggestionReason(rule: SpendRule, matchedFactors: string[]): string {
  const factorSummary = formatMatchedFactors(matchedFactors.slice(1));

  if (factorSummary.length === 0) {
    return rule.autoApply ? 'Auto-apply rule matched this merchant' : 'Saved rule matched this merchant';
  }

  return rule.autoApply
    ? `Auto-apply rule matched ${factorSummary}`
    : `Saved rule matched ${factorSummary}`;
}

function getWeightedHistorySuggestions(
  transactions: Transaction[],
  context: {
    amountBucket: RuleAmountBucket;
    currentTransactionId: string | undefined;
    hourBucket: RuleHourBucket;
    normalizedMerchant: string;
    referenceCapturedAt: string;
    weekday: RuleWeekday;
  },
  merchants: MerchantRecord[],
  merchantAliases: MerchantAliasRecord[],
): ClassificationSuggestion[] {
  const suggestionAccumulators = new Map<string, HistorySuggestionAccumulator>();

  for (const transaction of transactions) {
    if (
      transaction.id === context.currentTransactionId ||
      transaction.status !== 'classified' ||
      transaction.items.length === 0
    ) {
      continue;
    }

    const normalizedTransactionMerchant = resolveMerchantSuggestionKey(
      getTransactionRawMerchant(transaction),
      merchants,
      merchantAliases,
      transaction.merchantId,
    ).normalizedLabel;
    const observationMatch = getHistoryObservationMatch({
      amountBucket: context.amountBucket,
      currentTransactionMerchant: context.normalizedMerchant,
      historyTransactionAmountMinor: transaction.amountMinor,
      historyTransactionCapturedAt: transaction.capturedAt,
      historyTransactionMerchant: normalizedTransactionMerchant,
      hourBucket: context.hourBucket,
      weekday: context.weekday,
    });

    if (!hasMeaningfulHistoryObservation(observationMatch)) {
      continue;
    }

    for (const item of transaction.items) {
      const itemLabel = item.label.trim();

      if (itemLabel.length === 0) {
        continue;
      }

      const suggestionKey = buildSuggestionKey(item.categoryId, itemLabel);
      const existingAccumulator = suggestionAccumulators.get(suggestionKey);

      if (existingAccumulator) {
        existingAccumulator.occurrences += 1;
        existingAccumulator.amountBucketMatches += observationMatch.amountBucketMatched ? 1 : 0;
        existingAccumulator.hourBucketMatches += observationMatch.hourBucketMatched ? 1 : 0;
        existingAccumulator.merchantMatches += observationMatch.merchantMatched ? 1 : 0;
        existingAccumulator.weekdayMatches += observationMatch.weekdayMatched ? 1 : 0;
        existingAccumulator.mostRecentCapturedAt = getMostRecentCapturedAt(
          existingAccumulator.mostRecentCapturedAt,
          transaction.capturedAt,
        );
        continue;
      }

      suggestionAccumulators.set(suggestionKey, {
        amountBucketMatches: observationMatch.amountBucketMatched ? 1 : 0,
        categoryId: item.categoryId,
        hourBucketMatches: observationMatch.hourBucketMatched ? 1 : 0,
        itemLabel,
        merchantMatches: observationMatch.merchantMatched ? 1 : 0,
        mostRecentCapturedAt: transaction.capturedAt,
        occurrences: 1,
        weekdayMatches: observationMatch.weekdayMatched ? 1 : 0,
      });
    }
  }

  return [...suggestionAccumulators.values()]
    .map((accumulator) =>
      buildWeightedHistorySuggestion(accumulator, {
        amountBucket: context.amountBucket,
        hourBucket: context.hourBucket,
        referenceCapturedAt: context.referenceCapturedAt,
        weekday: context.weekday,
      }),
    )
    .filter((suggestion): suggestion is ClassificationSuggestion => suggestion !== null);
}

function getHistoryObservationMatch({
  amountBucket,
  currentTransactionMerchant,
  historyTransactionAmountMinor,
  historyTransactionCapturedAt,
  historyTransactionMerchant,
  hourBucket,
  weekday,
}: {
  amountBucket: RuleAmountBucket;
  currentTransactionMerchant: string;
  historyTransactionAmountMinor: number;
  historyTransactionCapturedAt: string;
  historyTransactionMerchant: string;
  hourBucket: RuleHourBucket;
  weekday: RuleWeekday;
}): HistoryObservationMatch {
  return {
    amountBucketMatched:
      amountBucket !== 'any' &&
      getRuleAmountBucket(historyTransactionAmountMinor) === amountBucket,
    hourBucketMatched:
      hourBucket !== 'any' && getRuleHourBucket(historyTransactionCapturedAt) === hourBucket,
    merchantMatched:
      currentTransactionMerchant.length > 0 &&
      historyTransactionMerchant === currentTransactionMerchant,
    weekdayMatched:
      weekday !== 'any' && getRuleWeekday(historyTransactionCapturedAt) === weekday,
  };
}

function hasMeaningfulHistoryObservation(observationMatch: HistoryObservationMatch): boolean {
  return (
    observationMatch.merchantMatched ||
    observationMatch.amountBucketMatched ||
    observationMatch.hourBucketMatched ||
    observationMatch.weekdayMatched
  );
}

function buildWeightedHistorySuggestion(
  accumulator: HistorySuggestionAccumulator,
  context: {
    amountBucket: RuleAmountBucket;
    hourBucket: RuleHourBucket;
    referenceCapturedAt: string;
    weekday: RuleWeekday;
  },
): ClassificationSuggestion | null {
  const recency = getHistoryRecencyContribution(
    accumulator.mostRecentCapturedAt,
    context.referenceCapturedAt,
  );
  const merchantContribution = getHistoryMerchantContribution(accumulator.merchantMatches);
  const amountContribution = getHistoryAmountContribution(accumulator.amountBucketMatches);
  const hourContribution = getHistoryHourContribution(accumulator.hourBucketMatches);
  const weekdayContribution = getHistoryWeekdayContribution(accumulator.weekdayMatches);
  const frequencyContribution = getHistoryFrequencyContribution(accumulator.occurrences);
  const score =
    merchantContribution +
    amountContribution +
    hourContribution +
    weekdayContribution +
    recency.score +
    frequencyContribution;

  if (!shouldIncludeHistorySuggestion(accumulator, score)) {
    return null;
  }

  const explanation = buildWeightedHistoryExplanation(accumulator, context, {
    amountContribution,
    frequencyContribution,
    hourContribution,
    merchantContribution,
    recency,
    weekdayContribution,
  });

  return {
    autoApply: false,
    categoryId: accumulator.categoryId,
    explanation,
    id: buildHistorySuggestionId(accumulator.categoryId, accumulator.itemLabel),
    itemLabel: accumulator.itemLabel,
    reason: buildWeightedHistorySuggestionReason(explanation),
    score,
    source: 'history',
  };
}

function shouldIncludeHistorySuggestion(
  accumulator: HistorySuggestionAccumulator,
  score: number,
): boolean {
  if (score < 18) {
    return false;
  }

  if (accumulator.merchantMatches > 0) {
    return true;
  }

  return accumulator.amountBucketMatches > 0 && accumulator.occurrences >= 3;
}

function buildWeightedHistoryExplanation(
  accumulator: HistorySuggestionAccumulator,
  context: {
    amountBucket: RuleAmountBucket;
    hourBucket: RuleHourBucket;
    weekday: RuleWeekday;
  },
  contributions: {
    amountContribution: number;
    frequencyContribution: number;
    hourContribution: number;
    merchantContribution: number;
    recency: { label: string | null; score: number };
    weekdayContribution: number;
  },
): string[] {
  const rankedFactors = [
    contributions.merchantContribution > 0
      ? {
          label:
            accumulator.merchantMatches === 1
              ? 'merchant match'
              : `merchant repeated ${accumulator.merchantMatches}x`,
          score: contributions.merchantContribution,
        }
      : null,
    contributions.amountContribution > 0
      ? {
          label:
            accumulator.amountBucketMatches === 1
              ? `amount ${formatRuleAmountBucket(context.amountBucket)} matched once`
              : `amount ${formatRuleAmountBucket(context.amountBucket)} matched ${accumulator.amountBucketMatches}x`,
          score: contributions.amountContribution,
        }
      : null,
    contributions.hourContribution > 0
      ? {
          label:
            accumulator.hourBucketMatches === 1
              ? `${formatRuleHourBucket(context.hourBucket)} timing matched once`
              : `${formatRuleHourBucket(context.hourBucket)} timing matched ${accumulator.hourBucketMatches}x`,
          score: contributions.hourContribution,
        }
      : null,
    contributions.weekdayContribution > 0
      ? {
          label:
            accumulator.weekdayMatches === 1
              ? `${formatRuleWeekday(context.weekday)} pattern matched once`
              : `${formatRuleWeekday(context.weekday)} pattern matched ${accumulator.weekdayMatches}x`,
          score: contributions.weekdayContribution,
        }
      : null,
    contributions.recency.label
      ? {
          label: contributions.recency.label,
          score: contributions.recency.score,
        }
      : null,
    contributions.frequencyContribution > 0
      ? {
          label: `${accumulator.occurrences} confirmations`,
          score: contributions.frequencyContribution,
        }
      : null,
  ]
    .filter((factor): factor is { label: string; score: number } => factor !== null)
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return left.label.localeCompare(right.label);
    });

  return rankedFactors.slice(0, 4).map((factor) => factor.label);
}

function buildWeightedHistorySuggestionReason(explanation: string[]): string {
  return `Weighted local history favored ${formatMatchedFactors(explanation.slice(0, 2))}`;
}

function getHistoryMerchantContribution(matchCount: number): number {
  if (matchCount <= 0) {
    return 0;
  }

  return 24 + Math.min((matchCount - 1) * 4, 12);
}

function getHistoryAmountContribution(matchCount: number): number {
  if (matchCount <= 0) {
    return 0;
  }

  return 8 + Math.min((matchCount - 1) * 2, 6);
}

function getHistoryHourContribution(matchCount: number): number {
  if (matchCount <= 0) {
    return 0;
  }

  return 4 + Math.min(matchCount - 1, 3);
}

function getHistoryWeekdayContribution(matchCount: number): number {
  if (matchCount <= 0) {
    return 0;
  }

  return 3 + Math.min(matchCount - 1, 3);
}

function getHistoryFrequencyContribution(occurrences: number): number {
  if (occurrences <= 1) {
    return 0;
  }

  return Math.min((occurrences - 1) * 5, 20);
}

function getHistoryRecencyContribution(
  capturedAt: string,
  referenceCapturedAt: string,
): { label: string | null; score: number } {
  const capturedAtTimestamp = Date.parse(capturedAt);
  const referenceTimestamp = Date.parse(referenceCapturedAt);

  if (!Number.isFinite(capturedAtTimestamp) || !Number.isFinite(referenceTimestamp)) {
    return {
      label: null,
      score: 0,
    };
  }

  const diffDays = Math.max(
    0,
    Math.floor((referenceTimestamp - capturedAtTimestamp) / (24 * 60 * 60 * 1000)),
  );

  if (diffDays <= 3) {
    return { label: 'recent within 3 days', score: 14 };
  }

  if (diffDays <= 7) {
    return { label: 'recent within 7 days', score: 10 };
  }

  if (diffDays <= 30) {
    return { label: 'recent within 30 days', score: 6 };
  }

  if (diffDays <= 90) {
    return { label: 'recent within 90 days', score: 3 };
  }

  return {
    label: null,
    score: 0,
  };
}

function getHistoryReferenceCapturedAt(
  transactions: Transaction[],
  capturedAt?: string | null,
): string {
  if (capturedAt && Number.isFinite(Date.parse(capturedAt))) {
    return capturedAt;
  }

  const latestCapturedAt = transactions.reduce<string | null>((currentLatest, transaction) => {
    if (!Number.isFinite(Date.parse(transaction.capturedAt))) {
      return currentLatest;
    }

    if (!currentLatest) {
      return transaction.capturedAt;
    }

    return Date.parse(transaction.capturedAt) > Date.parse(currentLatest)
      ? transaction.capturedAt
      : currentLatest;
  }, null);

  return latestCapturedAt ?? '1970-01-01T00:00:00.000Z';
}

function getMostRecentCapturedAt(left: string, right: string): string {
  const leftTimestamp = Date.parse(left);
  const rightTimestamp = Date.parse(right);

  if (!Number.isFinite(leftTimestamp)) {
    return right;
  }

  if (!Number.isFinite(rightTimestamp)) {
    return left;
  }

  return rightTimestamp > leftTimestamp ? right : left;
}

function buildHistorySuggestionId(categoryId: CategoryId, itemLabel: string): string {
  return `history_${buildSuggestionKey(categoryId, itemLabel).replace(/[^a-z0-9]+/g, '_')}`;
}

function formatMatchedFactors(factors: string[]): string {
  if (factors.length === 0) {
    return '';
  }

  if (factors.length === 1) {
    return factors[0] ?? '';
  }

  if (factors.length === 2) {
    return `${factors[0]} and ${factors[1]}`;
  }

  return `${factors.slice(0, -1).join(', ')}, and ${factors[factors.length - 1]}`;
}

function formatRuleAmountBucket(amountBucket: RuleAmountBucket): string {
  switch (amountBucket) {
    case 'under_250':
      return 'under Rs 250';
    case 'between_250_and_500':
      return 'Rs 250-Rs 500';
    case 'between_500_and_1000':
      return 'Rs 500-Rs 1,000';
    case 'over_1000':
      return 'over Rs 1,000';
    case 'any':
    default:
      return 'any amount';
  }
}

function formatRuleHourBucket(hourBucket: RuleHourBucket): string {
  switch (hourBucket) {
    case 'morning':
      return 'morning';
    case 'afternoon':
      return 'afternoon';
    case 'evening':
      return 'evening';
    case 'night':
      return 'night';
    case 'any':
    default:
      return 'anytime';
  }
}

function formatRuleWeekday(weekday: RuleWeekday): string {
  switch (weekday) {
    case 'sunday':
      return 'Sunday';
    case 'monday':
      return 'Monday';
    case 'tuesday':
      return 'Tuesday';
    case 'wednesday':
      return 'Wednesday';
    case 'thursday':
      return 'Thursday';
    case 'friday':
      return 'Friday';
    case 'saturday':
      return 'Saturday';
    case 'any':
    default:
      return 'Any day';
  }
}

function appendTransactionHistoryEntry(
  history: Transaction['history'],
  nextEntry: TransactionHistoryEntry,
): TransactionHistoryEntry[] {
  return [...(history ?? []), nextEntry];
}

function createHistoryEntry(
  transactionId: string,
  kind: TransactionHistoryKind,
  summary: string,
  at = new Date().toISOString(),
): TransactionHistoryEntry {
  return {
    at,
    id: `${transactionId}_${kind}_${Date.parse(at) || Date.now()}`,
    kind,
    summary,
  };
}

function getCategoryLabel(
  categoryId: CategoryId,
  categories: CategoryOption[] = categoryOptions,
  fallback = 'Needs category',
): string {
  return (
    categories.find((category) => category.id === categoryId)?.label ??
    fallback
  );
}

function formatTimelineDayLabel(dayKey: string, now: string): string {
  const dayDate = new Date(`${dayKey}T00:00:00`);
  const referenceDate = new Date(now);
  const todayStart = getStartOfDay(referenceDate);
  const yesterdayStart = new Date(todayStart);

  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (dayDate.getTime() === todayStart.getTime()) {
    return 'Today';
  }

  if (dayDate.getTime() === yesterdayStart.getTime()) {
    return 'Yesterday';
  }

  const month = MONTH_LABELS[dayDate.getMonth()] ?? 'Date';

  if (dayDate.getFullYear() === referenceDate.getFullYear()) {
    return `${month} ${dayDate.getDate()}`;
  }

  return `${month} ${dayDate.getDate()}, ${dayDate.getFullYear()}`;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
