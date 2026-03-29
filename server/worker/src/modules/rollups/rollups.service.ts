import { getCurrentUtcTimestamp } from '@upi-spend-tracker/shared-utils';

import type { ReportsRollupRecord } from '../../lib/store-shapes.js';
import type { ReportsRollupsRepository } from './rollups.repository.js';

export interface ReportsRollupRefreshSummary {
  dailyRollupCount: number;
  monthlyRollupCount: number;
  userCount: number;
}

export interface ReportsRollupsService {
  refreshRollups(): ReportsRollupRefreshSummary;
}

export interface ReportsRollupsServiceDependencies {
  now?: () => string;
  repository: ReportsRollupsRepository;
}

export function createReportsRollupsService({
  now = getCurrentUtcTimestamp,
  repository,
}: ReportsRollupsServiceDependencies): ReportsRollupsService {
  return {
    refreshRollups() {
      const generatedAt = now();
      const domainState = repository.readDomainState();
      const rollups = buildRollups(domainState.transactions);
      const userIds = new Set(rollups.map((rollup) => rollup.userId));

      repository.writeRollupState({
        generatedAt,
        rollups,
        version: 1,
      });

      return {
        dailyRollupCount: rollups.filter((rollup) => rollup.periodType === 'daily').length,
        monthlyRollupCount: rollups.filter((rollup) => rollup.periodType === 'monthly').length,
        userCount: userIds.size,
      };
    },
  };
}

function buildRollups(
  transactions: ReadonlyArray<{
    amountMinor: number;
    deletedAt?: string | undefined;
    paidAt: string;
    status: string;
    userId: string;
  }>,
): ReportsRollupRecord[] {
  const records = new Map<string, ReportsRollupRecord>();

  for (const transaction of transactions) {
    if (transaction.deletedAt || transaction.status === 'deleted') {
      continue;
    }

    addRollupRecord(records, transaction, 'daily', transaction.paidAt.slice(0, 10));
    addRollupRecord(records, transaction, 'monthly', transaction.paidAt.slice(0, 7));
  }

  return [...records.values()].sort(
    (left, right) =>
      left.userId.localeCompare(right.userId) ||
      left.periodType.localeCompare(right.periodType) ||
      left.periodKey.localeCompare(right.periodKey),
  );
}

function addRollupRecord(
  records: Map<string, ReportsRollupRecord>,
  transaction: {
    amountMinor: number;
    paidAt: string;
    status: string;
    userId: string;
  },
  periodType: 'daily' | 'monthly',
  periodKey: string,
): void {
  const key = `${transaction.userId}:${periodType}:${periodKey}`;
  const currentRecord = records.get(key) ?? {
    classifiedTransactionCount: 0,
    periodKey,
    periodType,
    totalSpendMinor: 0,
    transactionCount: 0,
    uncategorizedCount: 0,
    userId: transaction.userId,
  };

  currentRecord.totalSpendMinor += transaction.amountMinor;
  currentRecord.transactionCount += 1;

  if (transaction.status === 'classified' || transaction.status === 'partial') {
    currentRecord.classifiedTransactionCount += 1;
  }

  if (transaction.status === 'new' || transaction.status === 'skipped') {
    currentRecord.uncategorizedCount += 1;
  }

  records.set(key, currentRecord);
}
