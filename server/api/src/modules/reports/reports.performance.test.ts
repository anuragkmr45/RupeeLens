import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { describe, expect, it } from 'vitest';

import { createDomainRepository } from '../domain/domain.repository.js';
import { createSessionRepository } from '../sessions/sessions.repository.js';
import { createSessionService } from '../sessions/sessions.service.js';
import { createReportsService } from './reports.service.js';

const REPORT_FIXTURE_TRANSACTION_COUNT = 1_500;
const REPORT_SUMMARY_P95_TARGET_MS = 80;
const REPORT_BREAKDOWN_P95_TARGET_MS = 100;
const REPORT_WINDOW_FROM = '2026-03-01T00:00:00.000Z';
const REPORT_WINDOW_TO = '2026-03-31T23:59:59.999Z';

describe('reports latency baseline', () => {
  it(
    'keeps summary and breakdown calculations within the repo-side latency baseline',
    async () => {
      const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-reports-performance-'));
      const domainStoreFile = path.join(tempDir, 'domain.json');
      const sessionStoreFile = path.join(tempDir, 'sessions.json');
      const sessionRepository = createSessionRepository({
        sessionStoreFile,
      });
      const sessionService = createSessionService({
        repository: sessionRepository,
      });
      const session = sessionService.createGuestSession({
        deviceName: 'Latency Benchmark Pixel',
        platform: 'android',
        runtimeVersion: 'expo-sdk-55-dev-client',
      });
      const domainRepository = createDomainRepository({
        domainStoreFile,
      });
      seedLargeReportFixture(domainRepository, session.userId);
      const reportsService = createReportsService({
        repository: domainRepository,
        sessionService,
      });

      try {
        const warmSummary = reportsService.getSummary(session.accessToken, {
          from: REPORT_WINDOW_FROM,
          to: REPORT_WINDOW_TO,
        });
        const warmBreakdown = reportsService.getBreakdown(session.accessToken, {
          from: REPORT_WINDOW_FROM,
          groupBy: 'item',
          limit: 25,
          to: REPORT_WINDOW_TO,
        });

        expect(warmSummary).toMatchObject({
          transactionCount: REPORT_FIXTURE_TRANSACTION_COUNT,
        });
        expect(warmBreakdown).toMatchObject({
          groupBy: 'item',
          totalGroups: 120,
        });

        const summaryP95Ms = measureP95Ms(() =>
          reportsService.getSummary(session.accessToken, {
            from: REPORT_WINDOW_FROM,
            to: REPORT_WINDOW_TO,
          }),
        );
        const breakdownP95Ms = measureP95Ms(() =>
          reportsService.getBreakdown(session.accessToken, {
            from: REPORT_WINDOW_FROM,
            groupBy: 'item',
            limit: 25,
            to: REPORT_WINDOW_TO,
          }),
        );

        expect(summaryP95Ms).toBeLessThanOrEqual(REPORT_SUMMARY_P95_TARGET_MS);
        expect(breakdownP95Ms).toBeLessThanOrEqual(REPORT_BREAKDOWN_P95_TARGET_MS);
      } finally {
        sessionRepository.close();
        domainRepository.close();
        await rm(tempDir, {
          force: true,
          recursive: true,
        });
      }
    },
    10_000,
  );
});

function measureP95Ms(operation: () => unknown): number {
  const samples: number[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const startedAt = performance.now();
    operation();
    samples.push(performance.now() - startedAt);
  }

  return percentile(samples, 0.95);
}

function percentile(samples: number[], ratio: number): number {
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * ratio) - 1);
  return Number(sorted[index]!.toFixed(2));
}

function seedLargeReportFixture(
  repository: ReturnType<typeof createDomainRepository>,
  userId: string,
): void {
  for (let categoryIndex = 0; categoryIndex < 12; categoryIndex += 1) {
    repository.saveCategory({
      colorToken: categoryIndex % 2 === 0 ? 'lime' : 'blue',
      createdAt: '2026-02-28T00:00:00.000Z',
      id: `category_${categoryIndex}`,
      isSystem: false,
      name: `Category ${categoryIndex + 1}`,
      updatedAt: '2026-02-28T00:00:00.000Z',
      userId,
      version: 1,
    });
  }

  for (let merchantIndex = 0; merchantIndex < 60; merchantIndex += 1) {
    repository.saveMerchant({
      createdAt: '2026-02-28T00:00:00.000Z',
      id: `merchant_${merchantIndex}`,
      label: `Merchant ${merchantIndex + 1}`,
      normalizedLabel: `merchant ${merchantIndex + 1}`,
      updatedAt: '2026-02-28T00:00:00.000Z',
      userId,
      version: 1,
    });
  }

  repository.saveBudget({
    alert100: true,
    alert50: true,
    alert80: true,
    createdAt: '2026-02-28T00:00:00.000Z',
    cycleAnchorDay: 1,
    id: 'budget_primary',
    limitMinor: 2_500_000,
    name: 'Primary March Budget',
    periodType: 'monthly',
    updatedAt: '2026-02-28T00:00:00.000Z',
    userId,
    version: 1,
  });
  repository.replaceBudgetScopes(userId, 'budget_primary', [
    {
      budgetId: 'budget_primary',
      scopeRefId: 'category_0',
      scopeType: 'category',
      userId,
    },
  ]);

  for (let transactionIndex = 0; transactionIndex < REPORT_FIXTURE_TRANSACTION_COUNT; transactionIndex += 1) {
    const categoryIndex = transactionIndex % 12;
    const merchantIndex = transactionIndex % 60;
    const itemIndex = transactionIndex % 120;
    const dayOfMonth = (transactionIndex % 28) + 1;
    const hour = transactionIndex % 24;
    const minute = transactionIndex % 60;
    const paidAt = new Date(Date.UTC(2026, 2, dayOfMonth, hour, minute, 0)).toISOString();
    const amountMinor = 1_500 + ((transactionIndex * 137) % 28_500);
    const transactionId = `txn_${transactionIndex}`;

    repository.saveTransaction({
      amountMinor,
      createdAt: paidAt,
      currencyCode: 'INR',
      id: transactionId,
      merchantId: `merchant_${merchantIndex}`,
      merchantNorm: `merchant ${merchantIndex + 1}`,
      merchantRaw: `Merchant ${merchantIndex + 1}`,
      paidAt,
      source: 'import',
      status: 'classified',
      updatedAt: paidAt,
      userId,
      version: 1,
    });
    repository.saveTransactionItem({
      categoryId: `category_${categoryIndex}`,
      confirmed: true,
      createdAt: paidAt,
      id: `item_${transactionIndex}`,
      itemName: `Item ${itemIndex + 1}`,
      itemNorm: `item_${itemIndex + 1}`,
      totalAmountMinor: amountMinor,
      transactionId,
      updatedAt: paidAt,
      userId,
      version: 1,
    });
  }
}
