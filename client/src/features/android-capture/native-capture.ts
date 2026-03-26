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

export interface NativeCaptureDiagnostics {
  allowedSourceAppIds: SupportedSourceAppId[];
  lastCapture: NativeCaptureLastSnapshot | null;
  listenerPermissionGranted: boolean;
  serviceAvailable: boolean;
  storedSnapshotCount: number;
}

interface NotificationCaptureModuleShape {
  clearStoredSnapshots(): Promise<unknown>;
  getCaptureDiagnostics(): Promise<unknown>;
  setAllowedSourceApps(sourceAppIds: SupportedSourceAppId[]): Promise<unknown>;
}

const notificationCaptureModule =
  Platform.OS === 'android'
    ? (NativeModules.NotificationCaptureModule as NotificationCaptureModuleShape | undefined)
    : undefined;

export const DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS: NativeCaptureDiagnostics = {
  allowedSourceAppIds: DEFAULT_ONBOARDING_PREFERENCES.selectedSourceAppIds,
  lastCapture: null,
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
    lastCapture?: unknown;
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
    lastCapture: parseLastCapture(candidate.lastCapture),
    listenerPermissionGranted: candidate.listenerPermissionGranted === true,
    serviceAvailable:
      typeof candidate.serviceAvailable === 'boolean'
        ? candidate.serviceAvailable
        : DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS.serviceAvailable,
    storedSnapshotCount:
      typeof candidate.storedSnapshotCount === 'number' ? candidate.storedSnapshotCount : 0,
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

export async function clearStoredCaptureSnapshots(): Promise<NativeCaptureDiagnostics> {
  if (!notificationCaptureModule) {
    return { ...DEFAULT_NATIVE_CAPTURE_DIAGNOSTICS };
  }

  return parseDiagnostics(await notificationCaptureModule.clearStoredSnapshots());
}
