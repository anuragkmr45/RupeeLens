import {
  buildImportedCaptureTransaction,
  buildImportedCaptureTransactionId,
  getCaptureClassificationSeed,
  parseCaptureActionUrl,
  upsertImportedCaptureTransaction,
} from '../src/features/android-capture/import';
import type { NativeCaptureEventRecord } from '../src/features/android-capture/native-capture';

function buildNativeCaptureEvent(
  overrides: Partial<NativeCaptureEventRecord> = {},
): NativeCaptureEventRecord {
  return {
    captureEventId: 77,
    captureState: 'captured',
    capturedAtMs: new Date('2026-03-30T08:40:00.000Z').getTime(),
    merchantRaw: 'Blue Tokai',
    notificationKey: 'capture-77',
    parsedAmountMinor: 24500,
    parsedTimestampMs: new Date('2026-03-30T08:35:00.000Z').getTime(),
    parserInfo: {
      confidenceBps: 9800,
      parserId: 'gpay_upi_v1',
      parserVersion: '1.0.0',
    },
    replies: [],
    sourceAppId: 'google_pay',
    syncState: 'pending_import',
    ...overrides,
  };
}

describe('native capture import helpers', () => {
  it('builds a deterministic imported transaction for native captures', () => {
    const transaction = buildImportedCaptureTransaction(buildNativeCaptureEvent());

    expect(transaction).toEqual(
      expect.objectContaining({
        amountMinor: 24500,
        id: buildImportedCaptureTransactionId(77),
        merchant: 'Blue Tokai',
        merchantRaw: 'Blue Tokai',
        parserInfo: {
          confidenceBps: 9800,
          parserId: 'gpay_upi_v1',
          parserVersion: '1.0.0',
        },
        sourceApp: 'Google Pay',
        status: 'uncategorized',
      }),
    );
    expect(transaction.history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'captured',
        }),
      ]),
    );
  });

  it('uses native skip actions to keep imported transactions out of the main review flow', () => {
    const skippedEvent = buildNativeCaptureEvent({
      replies: [
        {
          actionType: 'skip',
          captureEventId: 77,
          createdAtMs: new Date('2026-03-30T08:41:00.000Z').getTime(),
          replyId: 1,
        },
      ],
    });

    const importedTransactions = upsertImportedCaptureTransaction([], skippedEvent);

    expect(importedTransactions).toEqual([
      expect.objectContaining({
        id: 'txn_capture_77',
        status: 'skipped',
      }),
    ]);
  });

  it('keeps imports idempotent when the transaction already exists locally', () => {
    const captureEvent = buildNativeCaptureEvent();
    const firstImport = upsertImportedCaptureTransaction([], captureEvent);
    const secondImport = upsertImportedCaptureTransaction(firstImport, captureEvent);

    expect(firstImport).toHaveLength(1);
    expect(secondImport).toHaveLength(1);
    expect(secondImport[0]?.id).toBe('txn_capture_77');
  });

  it('derives classify seed from the latest reply that carries an item label', () => {
    const seed = getCaptureClassificationSeed([
      {
        actionType: 'open_app',
        captureEventId: 77,
        createdAtMs: 1,
        replyId: 1,
      },
      {
        actionType: 'direct_reply',
        captureEventId: 77,
        createdAtMs: 2,
        itemLabel: 'Morning coffee',
        replyId: 2,
        replyText: 'Morning coffee',
      },
    ]);

    expect(seed).toEqual({
      categoryId: null,
      itemLabel: 'Morning coffee',
    });
  });

  it('parses only supported capture-action deep links', () => {
    expect(
      parseCaptureActionUrl('upispendtracker://capture-action?route=split&captureEventId=99'),
    ).toEqual({
      captureEventId: 99,
      route: 'split',
    });
    expect(parseCaptureActionUrl('https://example.com')).toBeNull();
    expect(parseCaptureActionUrl('upispendtracker://capture-action?route=skip&captureEventId=1')).toBeNull();
  });
});
