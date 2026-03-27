import { NativeModules, Platform } from 'react-native';

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

export interface NativeCaptureDiagnostics {
  allowedSourceAppIds: SupportedSourceAppId[];
  dedupeConfig: NativeCaptureDedupeConfig;
  exactDuplicateCount: number;
  fuzzyDuplicateCount: number;
  lastCapture: NativeCaptureLastSnapshot | null;
  lastDedupeDecision: NativeCaptureLastDedupeDecision | null;
  listenerPermissionGranted: boolean;
  serviceAvailable: boolean;
  storedSnapshotCount: number;
}

interface NotificationCaptureModuleShape {
  clearStoredSnapshots(): Promise<unknown>;
  getCaptureDiagnostics(): Promise<unknown>;
  setDedupeConfig(config: NativeCaptureDedupeConfig): Promise<unknown>;
  setAllowedSourceApps(sourceAppIds: SupportedSourceAppId[]): Promise<unknown>;
}

const notificationCaptureModule =
  Platform.OS === 'android'
    ? (NativeModules.NotificationCaptureModule as NotificationCaptureModuleShape | undefined)
    : undefined;

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
  serviceAvailable: Platform.OS === 'android' ? Boolean(notificationCaptureModule) : false,
  storedSnapshotCount: 0,
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
    serviceAvailable?: unknown;
    storedSnapshotCount?: unknown;
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
    serviceAvailable:
      typeof candidate.serviceAvailable === 'boolean'
        ? candidate.serviceAvailable
        : DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS.serviceAvailable,
    storedSnapshotCount:
      typeof candidate.storedSnapshotCount === 'number' ? candidate.storedSnapshotCount : 0,
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

export async function clearStoredCaptureSnapshots(): Promise<NativeCaptureDiagnostics> {
  if (!notificationCaptureModule) {
    return { ...DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS };
  }

  return parseDiagnostics(await notificationCaptureModule.clearStoredSnapshots());
}
