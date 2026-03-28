import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';

function createTempStores() {
  const baseDir = mkdtempSync(path.join(tmpdir(), 'rupeelens-domain-'));

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

describe('domain routes', () => {
  const apps: ReturnType<typeof buildApp>[] = [];

  afterEach(async () => {
    await Promise.all(
      apps.splice(0, apps.length).map(async (app) => {
        await app.close();
      }),
    );
  });

  it('supports authenticated transaction classify, rule creation, and budget summary flows', async () => {
    const stores = createTempStores();
    const app = buildApp(stores);
    apps.push(app);
    await app.ready();

    const accessToken = await createGuestAccessToken(app);
    const authHeaders = {
      authorization: `Bearer ${accessToken}`,
    };
    const paidAt = new Date().toISOString();

    const categoryResponse = await app.inject({
      headers: authHeaders,
      method: 'POST',
      payload: {
        colorToken: 'lime',
        name: 'Meals',
      },
      url: '/v1/categories',
    });

    expect(categoryResponse.statusCode).toBe(201);
    const category = categoryResponse.json();

    const transactionResponse = await app.inject({
      headers: authHeaders,
      method: 'POST',
      payload: {
        amountMinor: 25000,
        currencyCode: 'INR',
        merchantNorm: 'swiggy',
        merchantRaw: 'Swiggy',
        note: 'Lunch order',
        paidAt,
        source: 'manual',
      },
      url: '/v1/transactions',
    });

    expect(transactionResponse.statusCode).toBe(201);
    const transaction = transactionResponse.json();

    const classifyResponse = await app.inject({
      headers: authHeaders,
      method: 'POST',
      payload: {
        createRule: true,
        items: [
          {
            categoryId: category.id,
            itemName: 'Lunch',
            totalAmountMinor: 25000,
          },
        ],
        ruleDraft: {
          merchantMatchType: 'merchantNorm',
          merchantMatchValue: 'swiggy',
          outputCategoryId: category.id,
          outputItemName: 'Lunch',
        },
        version: transaction.version,
      },
      url: `/v1/transactions/${transaction.id}/classify`,
    });

    expect(classifyResponse.statusCode).toBe(200);
    expect(classifyResponse.json()).toMatchObject({
      auditEvents: expect.arrayContaining([
        expect.objectContaining({
          action: 'transaction.classified',
        }),
      ]),
      items: [
        expect.objectContaining({
          categoryId: category.id,
          itemName: 'Lunch',
          totalAmountMinor: 25000,
        }),
      ],
      transaction: expect.objectContaining({
        status: 'classified',
        version: 2,
      }),
    });

    const rulesResponse = await app.inject({
      headers: authHeaders,
      method: 'GET',
      url: '/v1/rules',
    });

    expect(rulesResponse.statusCode).toBe(200);
    expect(rulesResponse.json()).toMatchObject({
      items: [
        expect.objectContaining({
          merchantMatchType: 'merchantNorm',
          merchantMatchValue: 'swiggy',
          outputCategoryId: category.id,
        }),
      ],
    });

    const budgetResponse = await app.inject({
      headers: authHeaders,
      method: 'POST',
      payload: {
        limitMinor: 50000,
        name: 'Food',
        periodType: 'monthly',
        scopes: [
          {
            scopeRefId: category.id,
            scopeType: 'category',
          },
        ],
      },
      url: '/v1/budgets',
    });

    expect(budgetResponse.statusCode).toBe(201);
    const budget = budgetResponse.json();

    const budgetDetailResponse = await app.inject({
      headers: authHeaders,
      method: 'GET',
      url: `/v1/budgets/${budget.id}`,
    });

    expect(budgetDetailResponse.statusCode).toBe(200);
    expect(budgetDetailResponse.json()).toMatchObject({
      budget: expect.objectContaining({
        id: budget.id,
        limitMinor: 50000,
      }),
      scopes: [
        expect.objectContaining({
          scopeRefId: category.id,
          scopeType: 'category',
        }),
      ],
      summary: expect.objectContaining({
        remainingMinor: 25000,
        spentMinor: 25000,
      }),
    });

    const listResponse = await app.inject({
      headers: authHeaders,
      method: 'GET',
      url: '/v1/transactions?status=classified&page=1&pageSize=20&search=swiggy',
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      items: [
        expect.objectContaining({
          id: transaction.id,
          status: 'classified',
        }),
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
  });

  it('enforces validation, version conflicts, soft delete, and restart-safe persistence', async () => {
    const stores = createTempStores();
    const app = buildApp(stores);
    apps.push(app);
    await app.ready();

    const accessToken = await createGuestAccessToken(app);
    const authHeaders = {
      authorization: `Bearer ${accessToken}`,
    };
    const paidAt = new Date().toISOString();

    const badBudgetResponse = await app.inject({
      headers: authHeaders,
      method: 'POST',
      payload: {
        limitMinor: 0,
        name: '',
        periodType: 'custom',
        scopes: [],
      },
      url: '/v1/budgets',
    });

    expect(badBudgetResponse.statusCode).toBe(400);
    expect(badBudgetResponse.json()).toMatchObject({
      code: 'bad_request',
      fieldErrors: expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
        }),
        expect.objectContaining({
          field: 'limitMinor',
        }),
      ]),
    });

    const categoryResponse = await app.inject({
      headers: authHeaders,
      method: 'POST',
      payload: {
        name: 'Transport',
      },
      url: '/v1/categories',
    });

    const category = categoryResponse.json();

    const patchCategoryResponse = await app.inject({
      headers: authHeaders,
      method: 'PATCH',
      payload: {
        name: 'Travel',
        version: category.version,
      },
      url: `/v1/categories/${category.id}`,
    });

    expect(patchCategoryResponse.statusCode).toBe(200);

    const stalePatchResponse = await app.inject({
      headers: authHeaders,
      method: 'PATCH',
      payload: {
        name: 'Bus',
        version: category.version,
      },
      url: `/v1/categories/${category.id}`,
    });

    expect(stalePatchResponse.statusCode).toBe(409);

    const deleteCategoryResponse = await app.inject({
      headers: authHeaders,
      method: 'DELETE',
      url: `/v1/categories/${category.id}`,
    });

    expect(deleteCategoryResponse.statusCode).toBe(204);

    const listCategoriesResponse = await app.inject({
      headers: authHeaders,
      method: 'GET',
      url: '/v1/categories',
    });

    expect(listCategoriesResponse.statusCode).toBe(200);
    expect(listCategoriesResponse.json()).toEqual({
      items: [],
    });

    const transactionResponse = await app.inject({
      headers: authHeaders,
      method: 'POST',
      payload: {
        amountMinor: 18000,
        currencyCode: 'INR',
        merchantRaw: 'Metro card',
        paidAt,
        source: 'manual',
      },
      url: '/v1/transactions',
    });

    expect(transactionResponse.statusCode).toBe(201);
    const transaction = transactionResponse.json();

    await app.close();
    apps.pop();

    const restartedApp = buildApp(stores);
    apps.push(restartedApp);
    await restartedApp.ready();

    const persistedListResponse = await restartedApp.inject({
      headers: authHeaders,
      method: 'GET',
      url: '/v1/transactions',
    });

    expect(persistedListResponse.statusCode).toBe(200);
    expect(persistedListResponse.json()).toMatchObject({
      items: [
        expect.objectContaining({
          id: transaction.id,
          amountMinor: 18000,
        }),
      ],
      total: 1,
    });
  });
});
