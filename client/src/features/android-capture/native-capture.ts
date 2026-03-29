import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

import {
  DEFAULT_ONBOARDING_PREFERENCES,
  type SupportedSourceAppId,
} from '../spend-tracker/persistence';

export interface NativeCaptureLastSnapshot {
  capturedAtMs: number;
  packageName: string;
  preview: string;
  sourceAppId: SupportedSourceAppId;
}

export interface NativeCaptureSupportedParser {
  parserId: string;
  parserVersion: string;
  sourceAppIds: SupportedSourceAppId[];
}

export interface NativeCaptureDedupeConfig {
  exactMatchWindowSeconds: number;
  fuzzyMatchWindowSeconds: number;
  merchantSimilarityThreshold: number;
}

export interface NativeCaptureLastDedupeDecision {
  amountMinor: number;
  dedupeKind: 'exact_duplicate' | 'fuzzy_duplicate';
  dedupedAtMs: number;
  duplicateCount: number;
  merchantRaw: string;
  similarityScore?: number;
  sourceAppId: SupportedSourceAppId;
}

export interface NativeCaptureRecentCaptureLogEntry {
  captureEventId: number;
  captureState: 'captured' | 'failed' | 'imported' | 'replied' | 'skipped';
  capturedAtMs: number;
  failureReasonCode?: string;
  parseStatus: 'failed' | 'success';
  parserId?: string;
  parserVersion?: string;
  sourceAppId: SupportedSourceAppId;
  totalDuplicateCount: number;
}

export interface NativeCaptureRecentParseFailure {
  captureEventId: number;
  capturedAtMs: number;
  failureReasonCode: string;
  parserTrace?: string;
  sourceAppId: SupportedSourceAppId;
}

export interface NativeCaptureReplyRecord {
  actionType: 'direct_reply' | 'open_app' | 'skip' | 'split';
  captureEventId: number;
  categoryId?: string | null;
  createdAtMs: number;
  itemLabel?: string | null;
  replyId: number;
  replyText?: string | null;
}

export interface NativeCaptureEventParserInfo {
  confidenceBps: number | null;
  parserId: string;
  parserVersion: string;
}

export interface NativeCaptureEventRecord {
  captureEventId: number;
  captureState: 'captured' | 'failed' | 'imported' | 'replied' | 'skipped';
  capturedAtMs: number;
  linkedTransactionId?: string | null;
  merchantRaw: string;
  notificationKey: string;
  parsedAmountMinor: number;
  parsedTimestampMs: number;
  parserInfo: NativeCaptureEventParserInfo | null;
  replies: NativeCaptureReplyRecord[];
  sourceAppId: SupportedSourceAppId;
  syncState?: 'failed' | 'imported' | 'pending_import' | null;
}

export interface NativeCaptureDiagnostics {
  allowedSourceAppIds: SupportedSourceAppId[];
  dedupeConfig: NativeCaptureDedupeConfig;
  exactDuplicateCount: number;
  fuzzyDuplicateCount: number;
  lastCapture: NativeCaptureLastSnapshot | null;
  lastDedupeDecision: NativeCaptureLastDedupeDecision | null;
  listenerPermissionGranted: boolean;
  recentCaptureLog: NativeCaptureRecentCaptureLogEntry[];
  recentParseFailures: NativeCaptureRecentParseFailure[];
  serviceAvailable: boolean;
  storedSnapshotCount: number;
  supportedParsers: NativeCaptureSupportedParser[];
}

export interface CaptureTemplateVersionSummary {
  sourceAppIds: SupportedSourceAppId[];
  templateId: string;
  version: string;
}

export interface RedactedCaptureDebugBundleInput {
  captureDiagnostics: NativeCaptureDiagnostics;
  enabledParserTemplates: CaptureTemplateVersionSummary[];
  notificationAccessState: string;
  rolloutChannel: string;
  runtimeCompatibility?: {
    compatible: boolean;
    reason?: string;
  } | null;
  selectedSourceAppIds: SupportedSourceAppId[];
}

interface NotificationCaptureModuleShape {
  clearStoredSnapshots(): Promise<unknown>;
  getCaptureEvent(captureEventId: number): Promise<unknown>;
  getCaptureDiagnostics(): Promise<unknown>;
  getPendingCaptureEvents(limit: number): Promise<unknown>;
  markCaptureImportFailed(captureEventId: number, errorCode: string): Promise<unknown>;
  markCaptureImported(captureEventId: number, linkedTransactionId: string): Promise<unknown>;
  setDedupeConfig(config: NativeCaptureDedupeConfig): Promise<unknown>;
  setAllowedSourceApps(sourceAppIds: SupportedSourceAppId[]): Promise<unknown>;
  setPrivacyModeEnabled(enabled: boolean): Promise<unknown>;
  addListener?(eventName: string): void;
  removeListeners?(count: number): void;
}

const notificationCaptureModule =
  Platform.OS === 'android'
    ? (NativeModules.NotificationCaptureModule as NotificationCaptureModuleShape | undefined)
    : undefined;
let notificationCaptureEventEmitter: NativeEventEmitter | null = null;

export const DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS: NativeCaptureDiagnostics = {
  allowedSourceAppIds: DEFAULT_ONBOARDING_PREFERENCES.selectedSourceAppIds,
  dedupeConfig: {
    exactMatchWindowSeconds: 120,
    fuzzyMatchWindowSeconds: 300,
    merchantSimilarityThreshold: 0.88,
  },
  exactDuplicateCount: 0,
  fuzzyDuplicateCount: 0,
  lastCapture: null,
  lastDedupeDecision: null,
  listenerPermissionGranted: false,
  recentCaptureLog: [],
  recentParseFailures: [],
  serviceAvailable: Platform.OS === 'android' ? Boolean(notificationCaptureModule) : false,
  storedSnapshotCount: 0,
  supportedParsers: [],
};

function isSupportedSourceAppId(value: unknown): value is SupportedSourceAppId {
  return (
    value === 'bhim' ||
    value === 'google_pay' ||
    value === 'paytm' ||
    value === 'phonepe'
  );
}

function parseDiagnostics(value: unknown): NativeCaptureDiagnostics {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS };
  }

  const candidate = value as {
    allowedSourceAppIds?: unknown;
    dedupeConfig?: unknown;
    exactDuplicateCount?: unknown;
    fuzzyDuplicateCount?: unknown;
    lastCapture?: unknown;
    lastDedupeDecision?: unknown;
    listenerPermissionGranted?: unknown;
    recentCaptureLog?: unknown;
    recentParseFailures?: unknown;
    serviceAvailable?: unknown;
    storedSnapshotCount?: unknown;
    supportedParsers?: unknown;
  };
  const parsedAllowedSourceAppIds = Array.isArray(candidate.allowedSourceAppIds)
    ? candidate.allowedSourceAppIds.filter((sourceAppId): sourceAppId is SupportedSourceAppId =>
        isSupportedSourceAppId(sourceAppId),
      )
    : DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS.allowedSourceAppIds;

  return {
    allowedSourceAppIds: parsedAllowedSourceAppIds,
    dedupeConfig: parseDedupeConfig(candidate.dedupeConfig),
    exactDuplicateCount:
      typeof candidate.exactDuplicateCount === 'number' ? candidate.exactDuplicateCount : 0,
    fuzzyDuplicateCount:
      typeof candidate.fuzzyDuplicateCount === 'number' ? candidate.fuzzyDuplicateCount : 0,
    lastCapture: parseLastCapture(candidate.lastCapture),
    lastDedupeDecision: parseLastDedupeDecision(candidate.lastDedupeDecision),
    listenerPermissionGranted: candidate.listenerPermissionGranted === true,
    recentCaptureLog: parseRecentCaptureLog(candidate.recentCaptureLog),
    recentParseFailures: parseRecentParseFailures(candidate.recentParseFailures),
    serviceAvailable:
      typeof candidate.serviceAvailable === 'boolean'
        ? candidate.serviceAvailable
        : DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS.serviceAvailable,
    storedSnapshotCount:
      typeof candidate.storedSnapshotCount === 'number' ? candidate.storedSnapshotCount : 0,
    supportedParsers: parseSupportedParsers(candidate.supportedParsers),
  };
}

function parseDedupeConfig(value: unknown): NativeCaptureDedupeConfig {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS.dedupeConfig };
  }

  const candidate = value as {
    exactMatchWindowSeconds?: unknown;
    fuzzyMatchWindowSeconds?: unknown;
    merchantSimilarityThreshold?: unknown;
  };

  if (
    typeof candidate.exactMatchWindowSeconds !== 'number' ||
    typeof candidate.fuzzyMatchWindowSeconds !== 'number' ||
    typeof candidate.merchantSimilarityThreshold !== 'number'
  ) {
    return { ...DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS.dedupeConfig };
  }

  return {
    exactMatchWindowSeconds: candidate.exactMatchWindowSeconds,
    fuzzyMatchWindowSeconds: candidate.fuzzyMatchWindowSeconds,
    merchantSimilarityThreshold: candidate.merchantSimilarityThreshold,
  };
}

function parseLastCapture(value: unknown): NativeCaptureLastSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as {
    capturedAtMs?: unknown;
    packageName?: unknown;
    preview?: unknown;
    sourceAppId?: unknown;
  };

  if (
    typeof candidate.capturedAtMs !== 'number' ||
    typeof candidate.packageName !== 'string' ||
    typeof candidate.preview !== 'string' ||
    !isSupportedSourceAppId(candidate.sourceAppId)
  ) {
    return null;
  }

  return {
    capturedAtMs: candidate.capturedAtMs,
    packageName: candidate.packageName,
    preview: candidate.preview,
    sourceAppId: candidate.sourceAppId,
  };
}

function parseLastDedupeDecision(value: unknown): NativeCaptureLastDedupeDecision | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as {
    amountMinor?: unknown;
    dedupeKind?: unknown;
    dedupedAtMs?: unknown;
    duplicateCount?: unknown;
    merchantRaw?: unknown;
    similarityScore?: unknown;
    sourceAppId?: unknown;
  };

  if (
    typeof candidate.amountMinor !== 'number' ||
    (candidate.dedupeKind !== 'exact_duplicate' && candidate.dedupeKind !== 'fuzzy_duplicate') ||
    typeof candidate.dedupedAtMs !== 'number' ||
    typeof candidate.duplicateCount !== 'number' ||
    typeof candidate.merchantRaw !== 'string' ||
    !isSupportedSourceAppId(candidate.sourceAppId)
  ) {
    return null;
  }

  return {
    amountMinor: candidate.amountMinor,
    dedupeKind: candidate.dedupeKind,
    dedupedAtMs: candidate.dedupedAtMs,
    duplicateCount: candidate.duplicateCount,
    merchantRaw: candidate.merchantRaw,
    ...(typeof candidate.similarityScore === 'number'
      ? { similarityScore: candidate.similarityScore }
      : {}),
    sourceAppId: candidate.sourceAppId,
  };
}

function parseSupportedParsers(value: unknown): NativeCaptureSupportedParser[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as {
      parserId?: unknown;
      parserVersion?: unknown;
      sourceAppIds?: unknown;
    };

    if (
      typeof candidate.parserId !== 'string' ||
      typeof candidate.parserVersion !== 'string' ||
      !Array.isArray(candidate.sourceAppIds)
    ) {
      return [];
    }

    const sourceAppIds = candidate.sourceAppIds.filter((sourceAppId): sourceAppId is SupportedSourceAppId =>
      isSupportedSourceAppId(sourceAppId),
    );

    return [
      {
        parserId: candidate.parserId,
        parserVersion: candidate.parserVersion,
        sourceAppIds,
      },
    ];
  });
}

function parseRecentParseFailures(value: unknown): NativeCaptureRecentParseFailure[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as {
      captureEventId?: unknown;
      capturedAtMs?: unknown;
      failureReasonCode?: unknown;
      parserTrace?: unknown;
      sourceAppId?: unknown;
    };

    if (
      typeof candidate.captureEventId !== 'number' ||
      typeof candidate.capturedAtMs !== 'number' ||
      typeof candidate.failureReasonCode !== 'string' ||
      !isSupportedSourceAppId(candidate.sourceAppId)
    ) {
      return [];
    }

    return [
      {
        captureEventId: candidate.captureEventId,
        capturedAtMs: candidate.capturedAtMs,
        failureReasonCode: candidate.failureReasonCode,
        ...(typeof candidate.parserTrace === 'string' ? { parserTrace: candidate.parserTrace } : {}),
        sourceAppId: candidate.sourceAppId,
      },
    ];
  });
}

function parseRecentCaptureLog(value: unknown): NativeCaptureRecentCaptureLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as {
      captureEventId?: unknown;
      captureState?: unknown;
      capturedAtMs?: unknown;
      failureReasonCode?: unknown;
      parseStatus?: unknown;
      parserId?: unknown;
      parserVersion?: unknown;
      sourceAppId?: unknown;
      totalDuplicateCount?: unknown;
    };

    if (
      typeof candidate.captureEventId !== 'number' ||
      (candidate.captureState !== 'captured' &&
        candidate.captureState !== 'failed' &&
        candidate.captureState !== 'imported' &&
        candidate.captureState !== 'replied' &&
        candidate.captureState !== 'skipped') ||
      typeof candidate.capturedAtMs !== 'number' ||
      (candidate.parseStatus !== 'failed' && candidate.parseStatus !== 'success') ||
      !isSupportedSourceAppId(candidate.sourceAppId) ||
      typeof candidate.totalDuplicateCount !== 'number'
    ) {
      return [];
    }

    return [
      {
        captureEventId: candidate.captureEventId,
        captureState: candidate.captureState,
        capturedAtMs: candidate.capturedAtMs,
        ...(typeof candidate.failureReasonCode === 'string'
          ? { failureReasonCode: candidate.failureReasonCode }
          : {}),
        parseStatus: candidate.parseStatus,
        ...(typeof candidate.parserId === 'string' ? { parserId: candidate.parserId } : {}),
        ...(typeof candidate.parserVersion === 'string'
          ? { parserVersion: candidate.parserVersion }
          : {}),
        sourceAppId: candidate.sourceAppId,
        totalDuplicateCount: candidate.totalDuplicateCount,
      },
    ];
  });
}

function parseCaptureReplies(value: unknown): NativeCaptureReplyRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as {
      actionType?: unknown;
      captureEventId?: unknown;
      categoryId?: unknown;
      createdAtMs?: unknown;
      itemLabel?: unknown;
      replyId?: unknown;
      replyText?: unknown;
    };

    if (
      (candidate.actionType !== 'direct_reply' &&
        candidate.actionType !== 'open_app' &&
        candidate.actionType !== 'skip' &&
        candidate.actionType !== 'split') ||
      typeof candidate.captureEventId !== 'number' ||
      typeof candidate.createdAtMs !== 'number' ||
      typeof candidate.replyId !== 'number'
    ) {
      return [];
    }

    return [
      {
        actionType: candidate.actionType,
        captureEventId: candidate.captureEventId,
        ...(typeof candidate.categoryId === 'string' ? { categoryId: candidate.categoryId } : {}),
        createdAtMs: candidate.createdAtMs,
        ...(typeof candidate.itemLabel === 'string' ? { itemLabel: candidate.itemLabel } : {}),
        replyId: candidate.replyId,
        ...(typeof candidate.replyText === 'string' ? { replyText: candidate.replyText } : {}),
      },
    ];
  });
}

function parseCaptureEventParserInfo(value: unknown): NativeCaptureEventParserInfo | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as {
    confidenceBps?: unknown;
    parserId?: unknown;
    parserVersion?: unknown;
  };

  if (
    typeof candidate.parserId !== 'string' ||
    typeof candidate.parserVersion !== 'string'
  ) {
    return null;
  }

  return {
    confidenceBps:
      typeof candidate.confidenceBps === 'number' ? candidate.confidenceBps : null,
    parserId: candidate.parserId,
    parserVersion: candidate.parserVersion,
  };
}

function parseCaptureEventRecord(value: unknown): NativeCaptureEventRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as {
    captureEventId?: unknown;
    captureState?: unknown;
    capturedAtMs?: unknown;
    linkedTransactionId?: unknown;
    merchantRaw?: unknown;
    notificationKey?: unknown;
    parsedAmountMinor?: unknown;
    parsedTimestampMs?: unknown;
    parserInfo?: unknown;
    replies?: unknown;
    sourceAppId?: unknown;
    syncState?: unknown;
  };

  if (
    typeof candidate.captureEventId !== 'number' ||
    (candidate.captureState !== 'captured' &&
      candidate.captureState !== 'failed' &&
      candidate.captureState !== 'imported' &&
      candidate.captureState !== 'replied' &&
      candidate.captureState !== 'skipped') ||
    typeof candidate.capturedAtMs !== 'number' ||
    typeof candidate.merchantRaw !== 'string' ||
    typeof candidate.notificationKey !== 'string' ||
    typeof candidate.parsedAmountMinor !== 'number' ||
    typeof candidate.parsedTimestampMs !== 'number' ||
    !isSupportedSourceAppId(candidate.sourceAppId)
  ) {
    return null;
  }

  return {
    captureEventId: candidate.captureEventId,
    captureState: candidate.captureState,
    capturedAtMs: candidate.capturedAtMs,
    ...(typeof candidate.linkedTransactionId === 'string'
      ? { linkedTransactionId: candidate.linkedTransactionId }
      : {}),
    merchantRaw: candidate.merchantRaw,
    notificationKey: candidate.notificationKey,
    parsedAmountMinor: candidate.parsedAmountMinor,
    parsedTimestampMs: candidate.parsedTimestampMs,
    parserInfo: parseCaptureEventParserInfo(candidate.parserInfo),
    replies: parseCaptureReplies(candidate.replies),
    sourceAppId: candidate.sourceAppId,
    ...((candidate.syncState === 'failed' ||
      candidate.syncState === 'imported' ||
      candidate.syncState === 'pending_import') && {
      syncState: candidate.syncState,
    }),
  };
}

function parseCaptureEventRecords(value: unknown): NativeCaptureEventRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const parsedEvent = parseCaptureEventRecord(entry);
    return parsedEvent ? [parsedEvent] : [];
  });
}

export function buildRedactedCaptureDebugBundle({
  captureDiagnostics,
  enabledParserTemplates,
  notificationAccessState,
  rolloutChannel,
  runtimeCompatibility,
  selectedSourceAppIds,
}: RedactedCaptureDebugBundleInput) {
  return {
    generatedAt: new Date().toISOString(),
    nativeCapture: {
      allowedSourceAppIds: captureDiagnostics.allowedSourceAppIds,
      dedupeConfig: captureDiagnostics.dedupeConfig,
      exactDuplicateCount: captureDiagnostics.exactDuplicateCount,
      fuzzyDuplicateCount: captureDiagnostics.fuzzyDuplicateCount,
      lastCapture: captureDiagnostics.lastCapture
        ? {
            capturedAtMs: captureDiagnostics.lastCapture.capturedAtMs,
            packageName: captureDiagnostics.lastCapture.packageName,
            sourceAppId: captureDiagnostics.lastCapture.sourceAppId,
          }
        : null,
      lastDedupeDecision: captureDiagnostics.lastDedupeDecision
        ? {
            amountMinor: captureDiagnostics.lastDedupeDecision.amountMinor,
            dedupeKind: captureDiagnostics.lastDedupeDecision.dedupeKind,
            dedupedAtMs: captureDiagnostics.lastDedupeDecision.dedupedAtMs,
            duplicateCount: captureDiagnostics.lastDedupeDecision.duplicateCount,
            similarityScore: captureDiagnostics.lastDedupeDecision.similarityScore ?? null,
            sourceAppId: captureDiagnostics.lastDedupeDecision.sourceAppId,
          }
        : null,
      listenerPermissionGranted: captureDiagnostics.listenerPermissionGranted,
      recentCaptureLog: captureDiagnostics.recentCaptureLog,
      recentParseFailures: captureDiagnostics.recentParseFailures,
      serviceAvailable: captureDiagnostics.serviceAvailable,
      storedSnapshotCount: captureDiagnostics.storedSnapshotCount,
      supportedParsers: captureDiagnostics.supportedParsers,
    },
    onboarding: {
      notificationAccessState,
      selectedSourceAppIds,
    },
    rollout: {
      enabledParserTemplates,
      rolloutChannel,
      runtimeCompatibility: runtimeCompatibility ?? null,
    },
  } as const;
}

export async function getNativeCaptureDiagnostics(): Promise<NativeCaptureDiagnostics> {
  if (!notificationCaptureModule) {
    return { ...DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS };
  }

  try {
    return parseDiagnostics(await notificationCaptureModule.getCaptureDiagnostics());
  } catch {
    return {
      ...DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS,
      serviceAvailable: true,
    };
  }
}

export async function setAllowedSourceApps(
  sourceAppIds: SupportedSourceAppId[],
): Promise<NativeCaptureDiagnostics> {
  if (!notificationCaptureModule) {
    return {
      ...DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS,
      allowedSourceAppIds: [...sourceAppIds],
    };
  }

  return parseDiagnostics(await notificationCaptureModule.setAllowedSourceApps(sourceAppIds));
}

export async function setNativeCaptureDedupeConfig(
  dedupeConfig: NativeCaptureDedupeConfig,
): Promise<NativeCaptureDiagnostics> {
  if (!notificationCaptureModule) {
    return {
      ...DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS,
      dedupeConfig: { ...dedupeConfig },
    };
  }

  return parseDiagnostics(await notificationCaptureModule.setDedupeConfig(dedupeConfig));
}

export async function setNativeCapturePrivacyModeEnabled(
  enabled: boolean,
): Promise<NativeCaptureDiagnostics> {
  if (!notificationCaptureModule) {
    return { ...DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS };
  }

  return parseDiagnostics(await notificationCaptureModule.setPrivacyModeEnabled(enabled));
}

export async function clearStoredCaptureSnapshots(): Promise<NativeCaptureDiagnostics> {
  if (!notificationCaptureModule) {
    return { ...DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS };
  }

  return parseDiagnostics(await notificationCaptureModule.clearStoredSnapshots());
}

export async function getPendingNativeCaptureEvents(
  limit = 50,
): Promise<NativeCaptureEventRecord[]> {
  if (!notificationCaptureModule) {
    return [];
  }

  try {
    return parseCaptureEventRecords(
      await notificationCaptureModule.getPendingCaptureEvents(limit),
    );
  } catch {
    return [];
  }
}

export async function getNativeCaptureEvent(
  captureEventId: number,
): Promise<NativeCaptureEventRecord | null> {
  if (!notificationCaptureModule) {
    return null;
  }

  try {
    return parseCaptureEventRecord(
      await notificationCaptureModule.getCaptureEvent(captureEventId),
    );
  } catch {
    return null;
  }
}

export async function markNativeCaptureImported(
  captureEventId: number,
  linkedTransactionId: string,
): Promise<void> {
  if (!notificationCaptureModule) {
    return;
  }

  await notificationCaptureModule.markCaptureImported(captureEventId, linkedTransactionId);
}

export async function markNativeCaptureImportFailed(
  captureEventId: number,
  errorCode: string,
): Promise<void> {
  if (!notificationCaptureModule) {
    return;
  }

  await notificationCaptureModule.markCaptureImportFailed(captureEventId, errorCode);
}

export function subscribeToPendingCaptureEvents(
  listener: (captureEventId: number | null) => void,
): () => void {
  if (!notificationCaptureModule || Platform.OS !== 'android') {
    return () => {};
  }

  if (!notificationCaptureEventEmitter) {
    notificationCaptureEventEmitter = new NativeEventEmitter(
      notificationCaptureModule as never,
    );
  }

  const subscription = notificationCaptureEventEmitter.addListener(
    'notificationCaptureChanged',
    (value: unknown) => {
      const candidate =
        value && typeof value === 'object'
          ? (value as { captureEventId?: unknown })
          : undefined;

      listener(typeof candidate?.captureEventId === 'number' ? candidate.captureEventId : null);
    },
  );

  return () => {
    subscription.remove();
  };
}
