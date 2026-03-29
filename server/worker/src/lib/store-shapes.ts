export interface WorkerDomainTransaction {
  amountMinor: number;
  deletedAt?: string | undefined;
  id: string;
  merchantId?: string | undefined;
  merchantNorm?: string | undefined;
  merchantRaw?: string | undefined;
  paidAt: string;
  status: string;
  updatedAt: string;
  userId: string;
}

export interface WorkerDomainTransactionItem {
  categoryId?: string | undefined;
  deletedAt?: string | undefined;
  id: string;
  itemName: string;
  itemNorm?: string | undefined;
  totalAmountMinor: number;
  transactionId: string;
  updatedAt: string;
  userId: string;
}

export interface WorkerDomainCategory {
  id: string;
  name: string;
  deletedAt?: string | undefined;
  updatedAt: string;
  userId: string;
}

export interface WorkerDomainBudget {
  alert100?: boolean | undefined;
  alert50?: boolean | undefined;
  alert80?: boolean | undefined;
  createdAt?: string | undefined;
  cycleAnchorDay?: number | undefined;
  id: string;
  name: string;
  periodType?: string | undefined;
  limitMinor: number;
  deletedAt?: string | undefined;
  endDate?: string | undefined;
  startDate?: string | undefined;
  updatedAt: string;
  userId: string;
  version?: number | undefined;
}

export interface WorkerDomainRule {
  active: boolean;
  amountMaxMinor?: number | undefined;
  amountMinMinor?: number | undefined;
  autoApply?: boolean | undefined;
  createdAt?: string | undefined;
  deletedAt?: string | undefined;
  hourBucket?: number | undefined;
  id: string;
  merchantMatchType: string;
  merchantMatchValue: string;
  outputCategoryId?: string | undefined;
  outputItemName?: string | undefined;
  priority?: number | undefined;
  updatedAt: string;
  userId: string;
  version?: number | undefined;
  weekdayMask?: number | undefined;
}

export interface WorkerDomainStoreState {
  auditEvents: unknown[];
  budgetScopes: unknown[];
  budgets: WorkerDomainBudget[];
  categories: WorkerDomainCategory[];
  merchants: unknown[];
  rules: WorkerDomainRule[];
  transactionItems: WorkerDomainTransactionItem[];
  transactions: WorkerDomainTransaction[];
  version: 1;
}

export interface WorkerAccessTokenRecord {
  [key: string]: unknown;
  expiresAt: string;
}

export interface WorkerRefreshTokenRecord {
  [key: string]: unknown;
  expiresAt: string;
  revokedAt?: string | null | undefined;
}

export interface WorkerPairingCodeRecord {
  [key: string]: unknown;
  consumedAt?: string | null | undefined;
  expiresAt: string;
}

export interface WorkerSessionStoreState {
  accessTokens: WorkerAccessTokenRecord[];
  devices: unknown[];
  pairingCodes: WorkerPairingCodeRecord[];
  refreshTokens: WorkerRefreshTokenRecord[];
  users: unknown[];
  version: 1;
}

export type ExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ExportJobRecord {
  artifactPath?: string | undefined;
  attemptCount: number;
  completedAt?: string | undefined;
  createdAt: string;
  expiresAt?: string | undefined;
  format: string;
  from?: string | undefined;
  id: string;
  lastError?: string | undefined;
  nextAttemptAt: string;
  resourceTypes: string[];
  status: ExportJobStatus;
  to?: string | undefined;
  userId: string;
}

export interface ExportJobStoreState {
  jobs: ExportJobRecord[];
  version: 1;
}

export interface ReportsRollupRecord {
  classifiedTransactionCount: number;
  periodKey: string;
  periodType: 'daily' | 'monthly';
  totalSpendMinor: number;
  transactionCount: number;
  uncategorizedCount: number;
  userId: string;
}

export interface ReportsRollupStoreState {
  generatedAt: string;
  rollups: ReportsRollupRecord[];
  version: 1;
}
