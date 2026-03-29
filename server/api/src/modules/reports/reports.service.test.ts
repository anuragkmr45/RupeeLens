import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createDomainRepository } from '../domain/domain.repository.js';
import { createSessionRepository } from '../sessions/sessions.repository.js';
import { createSessionService } from '../sessions/sessions.service.js';
import { createReportsService } from './reports.service.js';

describe('reports service', () => {
  it('returns canonical summary totals and supports every breakdown dimension', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-reports-service-'));
    const sessionRepository = createSessionRepository({
      sessionStoreFile: path.join(tempDir, 'sessions.json'),
    });
    const domainRepository = createDomainRepository({
      domainStoreFile: path.join(tempDir, 'domain.json'),
    });
    const sessionService = createSessionService({
      now: () => '2026-03-12T10:00:00.000Z',
      randomToken: (prefix) => `${prefix}_1`,
      randomUuid: (() => {
        let index = 0;
        return () => `uuid_${++index}`;
      })(),
      repository: sessionRepository,
    });
    const reportsService = createReportsService({
      repository: domainRepository,
      sessionService,
    });

    try {
      const session = sessionService.createGuestSession({
        deviceName: 'Primary Android',
        platform: 'android',
      });

      seedReportFixtures(domainRepository, session.userId);

      const summary = reportsService.getSummary(session.accessToken, {
        from: '2026-03-10T00:00:00.000Z',
        to: '2026-03-12T23:59:59.999Z',
      });
      const merchantBreakdown = reportsService.getBreakdown(session.accessToken, {
        from: '2026-03-10T00:00:00.000Z',
        groupBy: 'merchant',
        limit: 10,
        to: '2026-03-12T23:59:59.999Z',
      });
      const categoryBreakdown = reportsService.getBreakdown(session.accessToken, {
        from: '2026-03-10T00:00:00.000Z',
        groupBy: 'category',
        limit: 10,
        to: '2026-03-12T23:59:59.999Z',
      });
      const itemBreakdown = reportsService.getBreakdown(session.accessToken, {
        from: '2026-03-10T00:00:00.000Z',
        groupBy: 'item',
        limit: 10,
        to: '2026-03-12T23:59:59.999Z',
      });
      const hourBreakdown = reportsService.getBreakdown(session.accessToken, {
        from: '2026-03-10T00:00:00.000Z',
        groupBy: 'hourOfDay',
        limit: 10,
        to: '2026-03-12T23:59:59.999Z',
      });
      const dayBreakdown = reportsService.getBreakdown(session.accessToken, {
        from: '2026-03-10T00:00:00.000Z',
        groupBy: 'dayOfWeek',
        limit: 10,
        to: '2026-03-12T23:59:59.999Z',
      });

      expect(summary).toMatchObject({
        budgetStatuses: [
          expect.objectContaining({
            limitMinor: 50_000,
            name: 'Food',
            spentMinor: 30_000,
            status: 'warning50',
          }),
        ],
        classifiedTransactionCount: 3,
        comparison: {
          deltaMinor: 35_000,
          deltaPct: 350,
          previousTotalSpendMinor: 10_000,
        },
        totalSpendMinor: 45_000,
        topCategory: {
          amountMinor: 30_000,
          name: 'Meals',
        },
        topItem: {
          amountMinor: 25_000,
          name: 'Lunch',
        },
        topMerchant: {
          amountMinor: 30_000,
          name: 'Swiggy',
        },
        transactionCount: 3,
        uncategorizedCount: 0,
      });
      expect(merchantBreakdown).toMatchObject({
        groupBy: 'merchant',
        hasMore: false,
        limit: 10,
        totalGroups: 2,
      });
      expect(merchantBreakdown.items).toEqual([
        expect.objectContaining({
          amountMinor: 30_000,
          key: 'merchant_sw',
          label: 'Swiggy',
          percentage: 66.67,
          transactionCount: 2,
        }),
        expect.objectContaining({
          amountMinor: 15_000,
          key: 'merchant_mr',
          label: 'Metro Rail',
          percentage: 33.33,
          transactionCount: 1,
        }),
      ]);
      expect(categoryBreakdown.items).toEqual([
        expect.objectContaining({
          amountMinor: 30_000,
          key: 'category_food',
          label: 'Meals',
          transactionCount: 2,
        }),
        expect.objectContaining({
          amountMinor: 15_000,
          key: 'category_transport',
          label: 'Transport',
          transactionCount: 1,
        }),
      ]);
      expect(itemBreakdown.items).toEqual([
        expect.objectContaining({
          amountMinor: 25_000,
          key: 'lunch',
          label: 'Lunch',
        }),
        expect.objectContaining({
          amountMinor: 15_000,
          key: 'metro_pass',
          label: 'Metro Pass',
        }),
        expect.objectContaining({
          amountMinor: 5_000,
          key: 'coffee',
          label: 'Coffee',
        }),
      ]);
      expect(hourBreakdown.items).toEqual([
        expect.objectContaining({
          amountMinor: 25_000,
          key: '09',
          label: '09:00 UTC',
        }),
        expect.objectContaining({
          amountMinor: 15_000,
          key: '18',
          label: '18:00 UTC',
        }),
        expect.objectContaining({
          amountMinor: 5_000,
          key: '21',
          label: '21:00 UTC',
        }),
      ]);
      expect(dayBreakdown.items).toEqual([
        expect.objectContaining({
          amountMinor: 25_000,
          key: 'tuesday',
          label: 'Tuesday',
        }),
        expect.objectContaining({
          amountMinor: 20_000,
          key: 'wednesday',
          label: 'Wednesday',
        }),
      ]);
    } finally {
      sessionRepository.close();
      domainRepository.close();
      await rm(tempDir, {
        force: true,
        recursive: true,
      });
    }
  });
});

function seedReportFixtures(
  repository: ReturnType<typeof createDomainRepository>,
  userId: string,
) {
  repository.saveCategory({
    colorToken: 'lime',
    createdAt: '2026-03-09T09:00:00.000Z',
    id: 'category_food',
    isSystem: false,
    name: 'Meals',
    updatedAt: '2026-03-09T09:00:00.000Z',
    userId,
    version: 1,
  });
  repository.saveCategory({
    createdAt: '2026-03-09T09:00:00.000Z',
    id: 'category_transport',
    isSystem: false,
    name: 'Transport',
    updatedAt: '2026-03-09T09:00:00.000Z',
    userId,
    version: 1,
  });
  repository.saveMerchant({
    createdAt: '2026-03-09T09:00:00.000Z',
    id: 'merchant_sw',
    label: 'Swiggy',
    normalizedLabel: 'swiggy',
    updatedAt: '2026-03-09T09:00:00.000Z',
    userId,
    version: 1,
  });
  repository.saveMerchant({
    createdAt: '2026-03-09T09:00:00.000Z',
    id: 'merchant_mr',
    label: 'Metro Rail',
    normalizedLabel: 'metro rail',
    updatedAt: '2026-03-09T09:00:00.000Z',
    userId,
    version: 1,
  });
  repository.saveTransaction({
    amountMinor: 25_000,
    createdAt: '2026-03-10T09:00:00.000Z',
    currencyCode: 'INR',
    id: 'txn_1',
    merchantId: 'merchant_sw',
    merchantNorm: 'swiggy',
    merchantRaw: 'Swiggy',
    paidAt: '2026-03-10T09:00:00.000Z',
    source: 'manual',
    status: 'classified',
    updatedAt: '2026-03-10T09:05:00.000Z',
    userId,
    version: 2,
  });
  repository.saveTransaction({
    amountMinor: 15_000,
    createdAt: '2026-03-11T18:00:00.000Z',
    currencyCode: 'INR',
    id: 'txn_2',
    merchantId: 'merchant_mr',
    merchantNorm: 'metro rail',
    merchantRaw: 'Metro Rail',
    paidAt: '2026-03-11T18:00:00.000Z',
    source: 'manual',
    status: 'classified',
    updatedAt: '2026-03-11T18:03:00.000Z',
    userId,
    version: 2,
  });
  repository.saveTransaction({
    amountMinor: 5_000,
    createdAt: '2026-03-11T21:00:00.000Z',
    currencyCode: 'INR',
    id: 'txn_3',
    merchantId: 'merchant_sw',
    merchantNorm: 'swiggy',
    merchantRaw: 'Swiggy',
    paidAt: '2026-03-11T21:00:00.000Z',
    source: 'manual',
    status: 'classified',
    updatedAt: '2026-03-11T21:04:00.000Z',
    userId,
    version: 2,
  });
  repository.saveTransaction({
    amountMinor: 10_000,
    createdAt: '2026-03-08T08:00:00.000Z',
    currencyCode: 'INR',
    id: 'txn_prev',
    merchantId: 'merchant_mr',
    merchantNorm: 'metro rail',
    merchantRaw: 'Metro Rail',
    paidAt: '2026-03-08T08:00:00.000Z',
    source: 'manual',
    status: 'classified',
    updatedAt: '2026-03-08T08:03:00.000Z',
    userId,
    version: 2,
  });
  repository.replaceTransactionItems(userId, 'txn_1', [
    {
      categoryId: 'category_food',
      confirmed: true,
      createdAt: '2026-03-10T09:05:00.000Z',
      id: 'item_1',
      itemName: 'Lunch',
      itemNorm: 'lunch',
      totalAmountMinor: 25_000,
      transactionId: 'txn_1',
      updatedAt: '2026-03-10T09:05:00.000Z',
      userId,
      version: 1,
    },
  ]);
  repository.replaceTransactionItems(userId, 'txn_2', [
    {
      categoryId: 'category_transport',
      confirmed: true,
      createdAt: '2026-03-11T18:03:00.000Z',
      id: 'item_2',
      itemName: 'Metro Pass',
      itemNorm: 'metro_pass',
      totalAmountMinor: 15_000,
      transactionId: 'txn_2',
      updatedAt: '2026-03-11T18:03:00.000Z',
      userId,
      version: 1,
    },
  ]);
  repository.replaceTransactionItems(userId, 'txn_3', [
    {
      categoryId: 'category_food',
      confirmed: true,
      createdAt: '2026-03-11T21:04:00.000Z',
      id: 'item_3',
      itemName: 'Coffee',
      itemNorm: 'coffee',
      totalAmountMinor: 5_000,
      transactionId: 'txn_3',
      updatedAt: '2026-03-11T21:04:00.000Z',
      userId,
      version: 1,
    },
  ]);
  repository.replaceTransactionItems(userId, 'txn_prev', [
    {
      categoryId: 'category_transport',
      confirmed: true,
      createdAt: '2026-03-08T08:03:00.000Z',
      id: 'item_prev',
      itemName: 'Bus recharge',
      itemNorm: 'bus_recharge',
      totalAmountMinor: 10_000,
      transactionId: 'txn_prev',
      updatedAt: '2026-03-08T08:03:00.000Z',
      userId,
      version: 1,
    },
  ]);
  repository.saveBudget({
    alert100: true,
    alert50: true,
    alert80: true,
    createdAt: '2026-03-09T10:00:00.000Z',
    id: 'budget_food',
    limitMinor: 50_000,
    name: 'Food',
    periodType: 'monthly',
    updatedAt: '2026-03-09T10:00:00.000Z',
    userId,
    version: 1,
  });
  repository.replaceBudgetScopes(userId, 'budget_food', [
    {
      budgetId: 'budget_food',
      scopeRefId: 'category_food',
      scopeType: 'category',
      userId,
    },
  ]);
}
