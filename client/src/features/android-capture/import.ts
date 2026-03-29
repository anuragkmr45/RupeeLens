import {
  skipTransaction,
  sortTransactionsByCapturedAtDesc,
  type ClassificationDraft,
  type Transaction,
  type TransactionHistoryEntry,
  type TransactionParserInfo,
} from '../spend-tracker/domain';
import type { SupportedSourceAppId } from '../spend-tracker/persistence';
import type {
  NativeCaptureEventRecord,
  NativeCaptureReplyRecord,
} from './native-capture';

export type NativeCaptureActionRoute = 'classify' | 'split';

export interface ParsedCaptureActionUrl {
  captureEventId: number;
  route: NativeCaptureActionRoute;
}

export function buildImportedCaptureTransactionId(captureEventId: number): string {
  return `txn_capture_${captureEventId}`;
}

export function parseCaptureActionUrl(url: string): ParsedCaptureActionUrl | null {
  try {
    const parsedUrl = new URL(url);
    const route = parsedUrl.searchParams.get('route');
    const captureEventId = Number.parseInt(
      parsedUrl.searchParams.get('captureEventId') ?? '',
      10,
    );

    if (
      parsedUrl.protocol !== 'upispendtracker:' ||
      parsedUrl.hostname !== 'capture-action' ||
      (route !== 'classify' && route !== 'split') ||
      !Number.isFinite(captureEventId) ||
      captureEventId <= 0
    ) {
      return null;
    }

    return {
      captureEventId,
      route,
    };
  } catch {
    return null;
  }
}

export function getCaptureClassificationSeed(
  replies: NativeCaptureReplyRecord[],
): Pick<ClassificationDraft, 'categoryId' | 'itemLabel'> | null {
  const latestReplyWithSeed = [...replies]
    .reverse()
    .find(
      (reply) =>
        (reply.itemLabel?.trim().length ?? 0) > 0 ||
        (reply.categoryId?.trim().length ?? 0) > 0,
    );

  if (!latestReplyWithSeed) {
    return null;
  }

  return {
    categoryId: latestReplyWithSeed.categoryId ?? null,
    itemLabel: latestReplyWithSeed.itemLabel?.trim() ?? '',
  };
}

export function buildImportedCaptureTransaction(
  event: NativeCaptureEventRecord,
): Transaction {
  const transactionId = getImportedCaptureTransactionId(event);
  const transactionCapturedAt = new Date(event.parsedTimestampMs).toISOString();
  const history: TransactionHistoryEntry[] = [
    {
      at: new Date(event.capturedAtMs).toISOString(),
      id: `${transactionId}_history_captured`,
      kind: 'captured',
      summary: `${formatSourceAppLabel(event.sourceAppId)} capture imported from native review.`,
    },
  ];

  if (isNativeCaptureSkipped(event)) {
    history.push({
      at: new Date(event.capturedAtMs).toISOString(),
      id: `${transactionId}_history_skipped_native`,
      kind: 'skipped',
      summary: 'Skipped from the Android quick-action prompt.',
    });
  }

  return {
    amountMinor: event.parsedAmountMinor,
    capturedAt: transactionCapturedAt,
    history,
    id: transactionId,
    items: [],
    merchant: event.merchantRaw,
    merchantRaw: event.merchantRaw,
    note: '',
    parserInfo: buildParserInfo(event.parserInfo),
    sourceApp: formatSourceAppLabel(event.sourceAppId),
    status: isNativeCaptureSkipped(event) ? 'skipped' : 'uncategorized',
  };
}

export function upsertImportedCaptureTransaction(
  transactions: Transaction[],
  event: NativeCaptureEventRecord,
): Transaction[] {
  const transactionId = getImportedCaptureTransactionId(event);
  const existingTransaction = transactions.find((transaction) => transaction.id === transactionId);

  if (!existingTransaction) {
    return sortTransactionsByCapturedAtDesc([
      ...transactions,
      buildImportedCaptureTransaction(event),
    ]);
  }

  if (isNativeCaptureSkipped(event) && existingTransaction.status === 'uncategorized') {
    return skipTransaction(transactions, existingTransaction.id);
  }

  return transactions;
}

export function getImportedCaptureTransactionId(
  event: Pick<NativeCaptureEventRecord, 'captureEventId' | 'linkedTransactionId'>,
): string {
  return event.linkedTransactionId ?? buildImportedCaptureTransactionId(event.captureEventId);
}

export function isNativeCaptureSkipped(
  event: Pick<NativeCaptureEventRecord, 'captureState' | 'replies'>,
): boolean {
  return (
    event.captureState === 'skipped' ||
    event.replies.some((reply) => reply.actionType === 'skip')
  );
}

function buildParserInfo(
  parserInfo: NativeCaptureEventRecord['parserInfo'],
): TransactionParserInfo | null {
  if (!parserInfo) {
    return null;
  }

  return {
    confidenceBps: parserInfo.confidenceBps,
    parserId: parserInfo.parserId,
    parserVersion: parserInfo.parserVersion,
  };
}

function formatSourceAppLabel(sourceAppId: SupportedSourceAppId): string {
  switch (sourceAppId) {
    case 'bhim':
      return 'BHIM';
    case 'google_pay':
      return 'Google Pay';
    case 'paytm':
      return 'Paytm';
    case 'phonepe':
    default:
      return 'PhonePe';
  }
}
