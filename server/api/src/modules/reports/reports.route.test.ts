import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';

function createTempStores() {
  const baseDir = mkdtempSync(path.join(tmpdir(), 'rupeelens-reports-'));

  return {
    domainStoreFile: path.join(baseDir, 'domain.json'),
    sessionStoreFile: path.join(baseDir, 'sessions.json'),
    syncStoreFile: path.join(baseDir, 'sync.json'),
  };
}

async function createGuestAccessToken(app: ReturnType<typeof buildApp>) {
  const response = await app.inject({
    method: 'POST',
    payload: {
      deviceName: 'Test Pixel',
      platform: 'android',
      runtimeVersion: 'expo-sdk-55-dev-client',
    },
    url: '/v1/sessions/guest',
  });

  expect(response.statusCode).toBe(201);
  return response.json().accessToken as string;
}

async function createCategory(
  app: ReturnType<typeof buildApp>,
  authorization: string,
  name: string,
) {
  const response = await app.inject({
    headers: { authorization },
    method: 'POST',
    payload: { name },
    url: '/v1/categories',
  });

  expect(response.statusCode).toBe(201);
  return response.json();
}

async function createMerchant(
  app: ReturnType<typeof buildApp>,
  authorization: string,
  label: string,
) {
  const response = await app.inject({
    headers: { authorization },
    method: 'POST',
    payload: { label },
    url: '/v1/merchants',
  });

  expect(response.statusCode).toBe(201);
  return response.json();
}

async function createTransaction(
  app: ReturnType<typeof buildApp>,
  authorization: string,
  payload: Record<string, unknown>,
) {
  const response = await app.inject({
    headers: { authorization },
    method: 'POST',
    payload,
    url: '/v1/transactions',
  });

  expect(response.statusCode).toBe(201);
  return response.json();
}

async function classifyTransaction(
  app: ReturnType<typeof buildApp>,
  authorization: string,
  transactionId: string,
  payload: Record<string, unknown>,
) {
  const response = await app.inject({
    headers: { authorization },
    method: 'POST',
    payload,
    url: `/v1/transactions/${transactionId}/classify`,
  });

  expect(response.statusCode).toBe(200);
  return response.json();
}

describe('reports routes', () => {
  const apps: ReturnType<typeof buildApp>[] = [];

  afterEach(async () => {
    await Promise.all(
      apps.splice(0, apps.length).map(async (app) => {
        await app.close();
      }),
    );
  });

  it('returns authenticated summary and top-N breakdown responses', async () => {
    const stores = createTempStores();
    const app = buildApp(stores);
    apps.push(app);
    await app.ready();

    const accessToken = await createGuestAccessToken(app);
    const authorization = `Bearer ${accessToken}`;
    const mealsCategory = await createCategory(app, authorization, 'Meals');
    const transportCategory = await createCategory(app, authorization, 'Transport');
    const swiggyMerchant = await createMerchant(app, authorization, 'Swiggy');
    const metroMerchant = await createMerchant(app, authorization, 'Metro Rail');

    const txn1 = await createTransaction(app, authorization, {
      amountMinor: 25_000,
      currencyCode: 'INR',
      merchantId: swiggyMerchant.id,
      merchantNorm: 'swiggy',
      merchantRaw: 'Swiggy',
      paidAt: '2026-03-10T09:00:00.000Z',
      source: 'manual',
    });
    const txn2 = await createTransaction(app, authorization, {
      amountMinor: 15_000,
      currencyCode: 'INR',
      merchantId: metroMerchant.id,
      merchantNorm: 'metro rail',
      merchantRaw: 'Metro Rail',
      paidAt: '2026-03-11T18:00:00.000Z',
      source: 'manual',
    });
    const txn3 = await createTransaction(app, authorization, {
      amountMinor: 5_000,
      currencyCode: 'INR',
      merchantId: swiggyMerchant.id,
      merchantNorm: 'swiggy',
      merchantRaw: 'Swiggy',
      paidAt: '2026-03-11T21:00:00.000Z',
      source: 'manual',
    });
    const previousTxn = await createTransaction(app, authorization, {
      amountMinor: 10_000,
      currencyCode: 'INR',
      merchantId: metroMerchant.id,
      merchantNorm: 'metro rail',
      merchantRaw: 'Metro Rail',
      paidAt: '2026-03-08T08:00:00.000Z',
      source: 'manual',
    });

    await classifyTransaction(app, authorization, txn1.id, {
      items: [
        {
          categoryId: mealsCategory.id,
          itemName: 'Lunch',
          totalAmountMinor: 25_000,
        },
      ],
      version: txn1.version,
    });
    await classifyTransaction(app, authorization, txn2.id, {
      items: [
        {
          categoryId: transportCategory.id,
          itemName: 'Metro Pass',
          totalAmountMinor: 15_000,
        },
      ],
      version: txn2.version,
    });
    await classifyTransaction(app, authorization, txn3.id, {
      items: [
        {
          categoryId: mealsCategory.id,
          itemName: 'Coffee',
          totalAmountMinor: 5_000,
        },
      ],
      version: txn3.version,
    });
    await classifyTransaction(app, authorization, previousTxn.id, {
      items: [
        {
          categoryId: transportCategory.id,
          itemName: 'Bus recharge',
          totalAmountMinor: 10_000,
        },
      ],
      version: previousTxn.version,
    });

    const budgetResponse = await app.inject({
      headers: { authorization },
      method: 'POST',
      payload: {
        limitMinor: 50_000,
        name: 'Food',
        periodType: 'monthly',
        scopes: [
          {
            scopeRefId: mealsCategory.id,
            scopeType: 'category',
          },
        ],
      },
      url: '/v1/budgets',
    });

    expect(budgetResponse.statusCode).toBe(201);

    const summaryResponse = await app.inject({
      headers: { authorization },
      method: 'GET',
      url: '/v1/reports/summary?from=2026-03-10T00:00:00.000Z&to=2026-03-12T23:59:59.999Z',
    });
    const breakdownResponse = await app.inject({
      headers: { authorization },
      method: 'GET',
      url: '/v1/reports/breakdown?from=2026-03-10T00:00:00.000Z&to=2026-03-12T23:59:59.999Z&groupBy=merchant&limit=1',
    });

    expect(summaryResponse.statusCode).toBe(200);
    expect(summaryResponse.json()).toMatchObject({
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
      totalSpendMinor: 45_000,
      transactionCount: 3,
      uncategorizedCount: 0,
    });

    expect(breakdownResponse.statusCode).toBe(200);
    expect(breakdownResponse.json()).toMatchObject({
      groupBy: 'merchant',
      hasMore: true,
      items: [
        {
          amountMinor: 30_000,
          key: swiggyMerchant.id,
          label: 'Swiggy',
          percentage: 66.67,
          transactionCount: 2,
        },
      ],
      limit: 1,
      totalGroups: 2,
    });
  });

  it('rejects missing auth and invalid query values', async () => {
    const stores = createTempStores();
    const app = buildApp(stores);
    apps.push(app);
    await app.ready();

    const unauthorizedResponse = await app.inject({
      method: 'GET',
      url: '/v1/reports/summary?from=2026-03-10T00:00:00.000Z&to=2026-03-12T23:59:59.999Z',
    });
    const invalidRangeResponse = await app.inject({
      headers: {
        authorization: `Bearer ${await createGuestAccessToken(app)}`,
      },
      method: 'GET',
      url: '/v1/reports/summary?from=2026-03-12T23:59:59.999Z&to=2026-03-10T00:00:00.000Z',
    });
    const invalidBreakdownResponse = await app.inject({
      headers: {
        authorization: `Bearer ${await createGuestAccessToken(app)}`,
      },
      method: 'GET',
      url: '/v1/reports/breakdown?from=2026-03-10T00:00:00.000Z&to=2026-03-12T23:59:59.999Z&groupBy=channel&limit=999',
    });

    expect(unauthorizedResponse.statusCode).toBe(401);
    expect(invalidRangeResponse.statusCode).toBe(400);
    expect(invalidBreakdownResponse.statusCode).toBe(400);
  });
});
