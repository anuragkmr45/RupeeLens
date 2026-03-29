import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type {
  DevicePairingCodeResponse,
  SessionResponse,
  SyncPullResponse,
  SyncPushResponse,
} from '@upi-spend-tracker/contracts';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';

interface JsonRequestOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  method: 'GET' | 'POST';
  path: string;
}

describe('sync mobile integration', () => {
  let tempDir = '';
  let app: FastifyInstance = buildApp();

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'rupeelens-sync-mobile-integration-'));
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

  it('pushes and pulls deltas across paired mobile clients over HTTP', async () => {
    const primarySession = await createGuestSession('Primary Android');
    const pairingCode = await createPairingCode(primarySession.accessToken);
    const secondarySession = await consumePairingCode(pairingCode.pairingCode, 'Secondary Android');

    const firstPush = await requestJson<SyncPushResponse>({
      body: {
        deviceId: primarySession.deviceId,
        operations: [
          {
            entityId: 'transaction-1',
            entityType: 'transaction',
            entityVersion: 1,
            occurredAt: '2026-03-30T12:00:00.000Z',
            opId: 'mobile-op-1',
            opType: 'upsert',
            payload: {
              amountMinor: 259900,
              merchant: 'Milk Basket',
              status: 'uncategorized',
            },
          },
        ],
      },
      headers: {
        authorization: `Bearer ${primarySession.accessToken}`,
        'idempotency-key': 'mobile-sync-batch-1',
      },
      method: 'POST',
      path: '/v1/sync/push',
    });

    expect(firstPush.status).toBe(200);
    expect(firstPush.json).toMatchObject({
      accepted: [
        {
          entityId: 'transaction-1',
          entityType: 'transaction',
          opId: 'mobile-op-1',
          serverVersion: 1,
          status: 'accepted',
        },
      ],
      conflicts: [],
      newCursor: '1',
      rejected: [],
    });

    const initialSecondaryPull = await requestJson<SyncPullResponse>({
      headers: {
        authorization: `Bearer ${secondarySession.accessToken}`,
      },
      method: 'GET',
      path: '/v1/sync/pull?cursor=0&limit=25',
    });

    expect(initialSecondaryPull.status).toBe(200);
    expect(initialSecondaryPull.json).toMatchObject({
      changes: [
        {
          changeType: 'upsert',
          data: {
            amountMinor: 259900,
            merchant: 'Milk Basket',
            status: 'uncategorized',
          },
          entityId: 'transaction-1',
          entityType: 'transaction',
          version: 1,
        },
      ],
      cursor: '1',
      hasMore: false,
    });

    const secondPush = await requestJson<SyncPushResponse>({
      body: {
        baseCursor: '1',
        deviceId: primarySession.deviceId,
        operations: [
          {
            entityId: 'transaction-1',
            entityType: 'transaction',
            entityVersion: 2,
            occurredAt: '2026-03-30T12:05:00.000Z',
            opId: 'mobile-op-2',
            opType: 'upsert',
            payload: {
              amountMinor: 259900,
              merchant: 'Milk Basket',
              status: 'classified',
            },
          },
        ],
      },
      headers: {
        authorization: `Bearer ${primarySession.accessToken}`,
        'idempotency-key': 'mobile-sync-batch-2',
      },
      method: 'POST',
      path: '/v1/sync/push',
    });

    expect(secondPush.status).toBe(200);
    expect(secondPush.json).toMatchObject({
      accepted: [
        {
          entityId: 'transaction-1',
          entityType: 'transaction',
          opId: 'mobile-op-2',
          serverVersion: 2,
          status: 'accepted',
        },
      ],
      conflicts: [],
      newCursor: '2',
      rejected: [],
    });

    const incrementalSecondaryPull = await requestJson<SyncPullResponse>({
      headers: {
        authorization: `Bearer ${secondarySession.accessToken}`,
      },
      method: 'GET',
      path: '/v1/sync/pull?cursor=1&limit=25',
    });

    expect(incrementalSecondaryPull.status).toBe(200);
    expect(incrementalSecondaryPull.json).toMatchObject({
      changes: [
        {
          changeType: 'upsert',
          data: {
            amountMinor: 259900,
            merchant: 'Milk Basket',
            status: 'classified',
          },
          entityId: 'transaction-1',
          entityType: 'transaction',
          version: 2,
        },
      ],
      cursor: '2',
      hasMore: false,
    });
  });

  it('replays identical mobile pushes and returns machine-readable conflicts for stale paired devices', async () => {
    const primarySession = await createGuestSession('Replay Primary');
    const pairingCode = await createPairingCode(primarySession.accessToken);
    const secondarySession = await consumePairingCode(pairingCode.pairingCode, 'Replay Secondary');

    const firstPush = await requestJson<SyncPushResponse>({
      body: {
        deviceId: primarySession.deviceId,
        operations: [
          {
            entityId: 'category-1',
            entityType: 'category',
            entityVersion: 1,
            occurredAt: '2026-03-30T13:00:00.000Z',
            opId: 'mobile-op-replay-1',
            opType: 'upsert',
            payload: {
              label: 'Food',
            },
          },
        ],
      },
      headers: {
        authorization: `Bearer ${primarySession.accessToken}`,
        'idempotency-key': 'mobile-sync-replay-1',
      },
      method: 'POST',
      path: '/v1/sync/push',
    });

    const replayPush = await requestJson<SyncPushResponse>({
      body: {
        deviceId: primarySession.deviceId,
        operations: [
          {
            entityId: 'category-1',
            entityType: 'category',
            entityVersion: 1,
            occurredAt: '2026-03-30T13:00:00.000Z',
            opId: 'mobile-op-replay-1',
            opType: 'upsert',
            payload: {
              label: 'Food',
            },
          },
        ],
      },
      headers: {
        authorization: `Bearer ${primarySession.accessToken}`,
        'idempotency-key': 'mobile-sync-replay-1',
      },
      method: 'POST',
      path: '/v1/sync/push',
    });

    const staleSecondaryPush = await requestJson<SyncPushResponse>({
      body: {
        deviceId: secondarySession.deviceId,
        operations: [
          {
            entityId: 'category-1',
            entityType: 'category',
            entityVersion: 1,
            occurredAt: '2026-03-30T13:05:00.000Z',
            opId: 'mobile-op-conflict-1',
            opType: 'upsert',
            payload: {
              label: 'Transport',
            },
          },
        ],
      },
      headers: {
        authorization: `Bearer ${secondarySession.accessToken}`,
        'idempotency-key': 'mobile-sync-conflict-1',
      },
      method: 'POST',
      path: '/v1/sync/push',
    });

    expect(firstPush.status).toBe(200);
    expect(replayPush.status).toBe(200);
    expect(replayPush.json).toMatchObject({
      accepted: [
        {
          opId: 'mobile-op-replay-1',
          status: 'idempotent_replay',
        },
      ],
      conflicts: [],
      rejected: [],
    });
    expect(staleSecondaryPush.status).toBe(200);
    expect(staleSecondaryPush.json).toMatchObject({
      accepted: [],
      conflicts: [
        {
          clientVersion: 1,
          conflictReason: 'version_mismatch',
          entityId: 'category-1',
          entityType: 'category',
          serverState: {
            label: 'Food',
          },
          serverVersion: 1,
        },
      ],
      rejected: [],
    });
  });

  async function createGuestSession(deviceName: string): Promise<SessionResponse> {
    const response = await requestJson<SessionResponse>({
      body: {
        appVersion: '0.1.0',
        deviceName,
        platform: 'android',
        runtimeVersion: 'sdk-55',
      },
      method: 'POST',
      path: '/v1/sessions/guest',
    });

    expect(response.status).toBe(201);
    return response.json;
  }

  async function createPairingCode(accessToken: string): Promise<DevicePairingCodeResponse> {
    const response = await requestJson<DevicePairingCodeResponse>({
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      method: 'POST',
      path: '/v1/device-pairings',
    });

    expect(response.status).toBe(201);
    return response.json;
  }

  async function consumePairingCode(
    pairingCode: string,
    deviceName: string,
  ): Promise<SessionResponse> {
    const response = await requestJson<SessionResponse>({
      body: {
        appVersion: '0.1.0',
        deviceName,
        pairingCode,
        platform: 'android',
        runtimeVersion: 'sdk-55',
      },
      method: 'POST',
      path: '/v1/device-pairings/consume',
    });

    expect(response.status).toBe(200);
    return response.json;
  }

  async function requestJson<T>({
    body,
    headers,
    method,
    path,
  }: JsonRequestOptions): Promise<{ json: T; status: number }> {
    const response = await app.inject({
      headers: {
        accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      method,
      ...(body ? { payload: body } : {}),
      url: path,
    });

    return {
      json: response.json() as T,
      status: response.statusCode,
    };
  }
});
