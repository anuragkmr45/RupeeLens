import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';

describe('sync routes', () => {
  let app = buildApp();
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-sync-routes-'));
    app = buildApp({
      sessionStoreFile: path.join(tempDir, 'sessions-store.json'),
      syncStoreFile: path.join(tempDir, 'sync-store.json'),
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    if (tempDir) {
      await rm(tempDir, {
        force: true,
        recursive: true,
      });
    }
  });

  it('pushes operations and pulls deltas for the authenticated device', async () => {
    const sessionResponse = await app.inject({
      method: 'POST',
      payload: {
        deviceName: 'Primary Android',
        platform: 'android',
      },
      url: '/v1/sessions/guest',
    });
    const session = sessionResponse.json();
    const pushResponse = await app.inject({
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'idempotency-key': 'idem-1',
      },
      method: 'POST',
      payload: {
        deviceId: session.deviceId,
        operations: [
          {
            entityId: 'transaction-1',
            entityType: 'transaction',
            entityVersion: 1,
            opId: 'op-1',
            opType: 'upsert',
            payload: {
              amountMinor: 2500,
            },
          },
        ],
      },
      url: '/v1/sync/push',
    });
    const pullResponse = await app.inject({
      headers: {
        authorization: `Bearer ${session.accessToken}`,
      },
      method: 'GET',
      url: '/v1/sync/pull?cursor=0&limit=10',
    });

    expect(pushResponse.statusCode).toBe(200);
    expect(pushResponse.json()).toMatchObject({
      accepted: [
        {
          entityId: 'transaction-1',
          opId: 'op-1',
          serverVersion: 1,
        },
      ],
      newCursor: '1',
      rejected: [],
    });
    expect(pullResponse.statusCode).toBe(200);
    expect(pullResponse.json()).toMatchObject({
      changes: [
        {
          changeType: 'upsert',
          entityId: 'transaction-1',
          entityType: 'transaction',
          version: 1,
        },
      ],
      cursor: '1',
      hasMore: false,
    });
  });

  it('handles replay, conflict, and auth validation', async () => {
    const sessionResponse = await app.inject({
      method: 'POST',
      payload: {
        deviceName: 'Replay Android',
        platform: 'android',
      },
      url: '/v1/sessions/guest',
    });
    const session = sessionResponse.json();
    const firstPush = await app.inject({
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'idempotency-key': 'idem-2',
      },
      method: 'POST',
      payload: {
        deviceId: session.deviceId,
        operations: [
          {
            entityId: 'category-1',
            entityType: 'category',
            entityVersion: 1,
            opId: 'op-2',
            opType: 'upsert',
            payload: {
              label: 'Food',
            },
          },
        ],
      },
      url: '/v1/sync/push',
    });
    const replayPush = await app.inject({
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'idempotency-key': 'idem-2',
      },
      method: 'POST',
      payload: {
        deviceId: session.deviceId,
        operations: [
          {
            entityId: 'category-1',
            entityType: 'category',
            entityVersion: 1,
            opId: 'op-2',
            opType: 'upsert',
            payload: {
              label: 'Food',
            },
          },
        ],
      },
      url: '/v1/sync/push',
    });
    const conflictPush = await app.inject({
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'idempotency-key': 'idem-3',
      },
      method: 'POST',
      payload: {
        deviceId: session.deviceId,
        operations: [
          {
            entityId: 'category-1',
            entityType: 'category',
            entityVersion: 1,
            opId: 'op-3',
            opType: 'upsert',
            payload: {
              label: 'Transport',
            },
          },
        ],
      },
      url: '/v1/sync/push',
    });
    const unauthorizedPush = await app.inject({
      headers: {
        'idempotency-key': 'idem-4',
      },
      method: 'POST',
      payload: {
        deviceId: session.deviceId,
        operations: [
          {
            entityId: 'category-2',
            entityType: 'category',
            entityVersion: 1,
            opId: 'op-4',
            opType: 'upsert',
            payload: {
              label: 'Bills',
            },
          },
        ],
      },
      url: '/v1/sync/push',
    });

    expect(firstPush.statusCode).toBe(200);
    expect(replayPush.statusCode).toBe(200);
    expect(replayPush.json()).toMatchObject({
      accepted: [
        {
          opId: 'op-2',
          status: 'idempotent_replay',
        },
      ],
    });
    expect(conflictPush.statusCode).toBe(200);
    expect(conflictPush.json()).toMatchObject({
      conflicts: [
        {
          conflictReason: 'version_mismatch',
          entityId: 'category-1',
          serverVersion: 1,
        },
      ],
    });
    expect(unauthorizedPush.statusCode).toBe(401);
  });
});
