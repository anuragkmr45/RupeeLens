import { getCurrentUtcTimestamp } from '@upi-spend-tracker/shared-utils';

import type {
  ExportJobRecord,
  WorkerDomainBudget,
  WorkerDomainCategory,
  WorkerDomainRule,
  WorkerDomainTransaction,
  WorkerDomainTransactionItem,
} from '../../lib/store-shapes.js';
import type { ExportJobsRepository } from './export-jobs.repository.js';

export interface ExportJobsService {
  processDueJobs(): ExportQueueSummary;
}

export interface ExportJobsServiceDependencies {
  artifactTtlMs: number;
  maxAttempts: number;
  now?: () => string;
  repository: ExportJobsRepository;
  retryDelayMs: number;
}

export interface ExportQueueSummary {
  completedCount: number;
  deadLetterCount: number;
  failedCount: number;
  pendingCount: number;
  processedCount: number;
  retryableFailureCount: number;
}

type ExportResourceType = 'transactions' | 'items' | 'categories' | 'budgets' | 'rules';

const EXPORT_HEADERS = [
  'resource_type',
  'id',
  'parent_id',
  'name',
  'status',
  'amount_minor',
  'paid_at',
  'merchant_id',
  'merchant_norm',
  'merchant_raw',
  'item_name',
  'item_norm',
  'category_id',
  'merchant_match_type',
  'merchant_match_value',
  'output_category_id',
  'output_item_name',
  'priority',
  'auto_apply',
  'limit_minor',
  'period_type',
  'start_date',
  'end_date',
  'cycle_anchor_day',
  'active',
  'updated_at',
  'deleted_at',
] as const;

export function createExportJobsService({
  artifactTtlMs,
  maxAttempts,
  now = getCurrentUtcTimestamp,
  repository,
  retryDelayMs,
}: ExportJobsServiceDependencies): ExportJobsService {
  return {
    processDueJobs() {
      const nowIso = now();
      const nowMs = Date.parse(nowIso);
      const exportJobState = repository.readExportJobState();
      const domainState = repository.readDomainState();
      let processedCount = 0;
      let completedCount = 0;
      let failedCount = 0;

      const jobs = exportJobState.jobs.map((job) => {
        if (!isDueJob(job, nowMs, maxAttempts)) {
          return job;
        }

        processedCount += 1;

        try {
          const csvContent = buildCsvContent(job, domainState);
          const artifactPath = repository.writeArtifact(job.userId, job.id, csvContent);
          const completedJobBase = { ...job };
          delete completedJobBase.lastError;
          completedCount += 1;

          const completedJob: ExportJobRecord = {
            ...completedJobBase,
            artifactPath,
            attemptCount: job.attemptCount + 1,
            completedAt: nowIso,
            expiresAt: new Date(nowMs + artifactTtlMs).toISOString(),
            nextAttemptAt: nowIso,
            status: 'completed',
          };

          return completedJob;
        } catch (error) {
          failedCount += 1;

          const failedJob: ExportJobRecord = {
            ...job,
            attemptCount: job.attemptCount + 1,
            lastError: error instanceof Error ? error.message : 'Unknown export processing error.',
            nextAttemptAt: new Date(nowMs + retryDelayMs).toISOString(),
            status: 'failed',
          };

          return failedJob;
        }
      });

      repository.writeExportJobState({
        ...exportJobState,
        jobs,
      });

      return {
        completedCount,
        deadLetterCount: jobs.filter(
          (job) => job.status === 'failed' && job.attemptCount >= maxAttempts,
        ).length,
        failedCount,
        pendingCount: jobs.filter((job) => job.status === 'queued' || job.status === 'processing')
          .length,
        processedCount,
        retryableFailureCount: jobs.filter(
          (job) => job.status === 'failed' && job.attemptCount < maxAttempts,
        ).length,
      };
    },
  };
}

function isDueJob(job: ExportJobRecord, nowMs: number, maxAttempts: number): boolean {
  if (job.status === 'completed') {
    return false;
  }

  if (job.status === 'failed' && job.attemptCount >= maxAttempts) {
    return false;
  }

  return Date.parse(job.nextAttemptAt) <= nowMs;
}

function buildCsvContent(
  job: ExportJobRecord,
  domainState: {
    budgets: WorkerDomainBudget[];
    categories: WorkerDomainCategory[];
    rules: WorkerDomainRule[];
    transactionItems: WorkerDomainTransactionItem[];
    transactions: WorkerDomainTransaction[];
  },
): string {
  if (job.format !== 'csv') {
    throw new Error(`Unsupported export format: ${job.format}`);
  }

  const filters = createDateFilter(job.from, job.to);
  const rows: Record<(typeof EXPORT_HEADERS)[number], string>[] = [];

  for (const resourceType of job.resourceTypes as ExportResourceType[]) {
    switch (resourceType) {
      case 'transactions':
        rows.push(
          ...domainState.transactions
            .filter((record) => record.userId === job.userId && !record.deletedAt)
            .filter((record) => filters.matches(record.paidAt))
            .map((record) =>
              createCsvRow({
                amount_minor: String(record.amountMinor),
                id: record.id,
                merchant_id: record.merchantId,
                merchant_norm: record.merchantNorm,
                merchant_raw: record.merchantRaw,
                paid_at: record.paidAt,
                resource_type: 'transactions',
                status: record.status,
                updated_at: record.updatedAt,
              }),
            ),
        );
        break;
      case 'items':
        rows.push(
          ...domainState.transactionItems
            .filter((record) => record.userId === job.userId && !record.deletedAt)
            .filter((record) => filters.matches(record.updatedAt))
            .map((record) =>
              createCsvRow({
                amount_minor: String(record.totalAmountMinor),
                category_id: record.categoryId,
                id: record.id,
                item_name: record.itemName,
                item_norm: record.itemNorm,
                parent_id: record.transactionId,
                resource_type: 'items',
                updated_at: record.updatedAt,
              }),
            ),
        );
        break;
      case 'categories':
        rows.push(
          ...domainState.categories
            .filter((record) => record.userId === job.userId && !record.deletedAt)
            .filter((record) => filters.matches(record.updatedAt))
            .map((record) =>
              createCsvRow({
                id: record.id,
                name: record.name,
                resource_type: 'categories',
                updated_at: record.updatedAt,
              }),
            ),
        );
        break;
      case 'budgets':
        rows.push(
          ...domainState.budgets
            .filter((record) => record.userId === job.userId && !record.deletedAt)
            .filter((record) => filters.matches(record.updatedAt))
            .map((record) =>
              createCsvRow({
                active: 'true',
                cycle_anchor_day:
                  record.cycleAnchorDay !== undefined ? String(record.cycleAnchorDay) : undefined,
                end_date: record.endDate,
                id: record.id,
                limit_minor: String(record.limitMinor),
                name: record.name,
                period_type: record.periodType,
                resource_type: 'budgets',
                start_date: record.startDate,
                updated_at: record.updatedAt,
              }),
            ),
        );
        break;
      case 'rules':
        rows.push(
          ...domainState.rules
            .filter((record) => record.userId === job.userId && !record.deletedAt)
            .filter((record) => filters.matches(record.updatedAt))
            .map((record) =>
              createCsvRow({
                active: String(record.active),
                auto_apply:
                  record.autoApply !== undefined ? String(record.autoApply) : undefined,
                category_id: record.outputCategoryId,
                id: record.id,
                merchant_match_type: record.merchantMatchType,
                merchant_match_value: record.merchantMatchValue,
                output_category_id: record.outputCategoryId,
                output_item_name: record.outputItemName,
                priority: record.priority !== undefined ? String(record.priority) : undefined,
                resource_type: 'rules',
                updated_at: record.updatedAt,
              }),
            ),
        );
        break;
      default:
        throw new Error(`Unsupported export resource type: ${String(resourceType)}`);
    }
  }

  return [
    EXPORT_HEADERS.join(','),
    ...rows.map((row) => EXPORT_HEADERS.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\n');
}

function createDateFilter(from: string | undefined, to: string | undefined) {
  const fromMs = from ? Date.parse(from) : null;
  const toMs = to ? Date.parse(to) : null;

  return {
    matches(value: string | undefined) {
      if (!value) {
        return fromMs === null && toMs === null;
      }

      const valueMs = Date.parse(value);

      if (fromMs !== null && valueMs < fromMs) {
        return false;
      }

      if (toMs !== null && valueMs > toMs) {
        return false;
      }

      return true;
    },
  };
}

function createCsvRow(
  partial: Partial<Record<(typeof EXPORT_HEADERS)[number], string | undefined>>,
): Record<(typeof EXPORT_HEADERS)[number], string> {
  return EXPORT_HEADERS.reduce(
    (row, header) => {
      row[header] = partial[header] ?? '';
      return row;
    },
    {} as Record<(typeof EXPORT_HEADERS)[number], string>,
  );
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}
