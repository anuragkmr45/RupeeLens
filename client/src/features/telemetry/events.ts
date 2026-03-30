import type {
  AppRuntimeErrorTelemetryEvent,
  BudgetAlertDeliveryTelemetryEvent,
  CaptureFailureTelemetryEvent,
  CaptureSuccessTelemetryEvent,
  ClassifyCompletedTelemetryEvent,
  NotificationPermissionDeniedTelemetryEvent,
  OnboardingCompletedTelemetryEvent,
  ParserFallbackTelemetryEvent,
  TelemetryBudgetAlertStatus,
  TelemetryBudgetScope,
  TelemetryClassifySource,
  TelemetryRolloutChannel,
  TelemetryRuntimeErrorDomain,
  TelemetrySourceAppId,
  TelemetrySyncMode,
  SyncErrorTelemetryEvent,
} from '@upi-spend-tracker/contracts';
import { Platform } from 'react-native';

import { getDefaultBootstrapConfigQuery } from '../bootstrap-config/runtime-config';

type TelemetryOccurredAt = OnboardingCompletedTelemetryEvent['occurredAt'];

function createClientEventId(): string {
  return `telemetry_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRolloutChannel(
  rolloutChannel: string | null | undefined,
): TelemetryRolloutChannel {
  return rolloutChannel === 'internal' ||
    rolloutChannel === 'beta' ||
    rolloutChannel === 'production'
    ? rolloutChannel
    : 'unknown';
}

function createBaseEvent() {
  const bootstrapQuery = getDefaultBootstrapConfigQuery();

  return {
    appVersion: bootstrapQuery.appVersion,
    clientEventId: createClientEventId(),
    occurredAt: new Date().toISOString() as TelemetryOccurredAt,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    runtimeVersion: bootstrapQuery.runtimeVersion,
  } as const;
}

export function createOnboardingCompletedTelemetryEvent({
  permissionGranted,
  rolloutChannel,
  selectedSourceAppCount,
  syncMode,
}: {
  permissionGranted: boolean;
  rolloutChannel?: string | null;
  selectedSourceAppCount: number;
  syncMode: Exclude<TelemetrySyncMode, 'cloud_sync'>;
}): OnboardingCompletedTelemetryEvent {
  return {
    ...createBaseEvent(),
    data: {
      permissionGranted,
      selectedSourceAppCount,
      syncMode,
    },
    eventName: 'onboarding_completed',
    rolloutChannel: normalizeRolloutChannel(rolloutChannel),
  };
}

export function createNotificationPermissionDeniedTelemetryEvent({
  rolloutChannel,
  selectedSourceAppCount,
  source,
  syncMode,
}: {
  rolloutChannel?: string | null;
  selectedSourceAppCount: number;
  source: 'onboarding' | 'settings';
  syncMode: Exclude<TelemetrySyncMode, 'cloud_sync'>;
}): NotificationPermissionDeniedTelemetryEvent {
  return {
    ...createBaseEvent(),
    data: {
      selectedSourceAppCount,
      source,
      syncMode,
    },
    eventName: 'notification_permission_denied',
    rolloutChannel: normalizeRolloutChannel(rolloutChannel),
  };
}

export function createCaptureSuccessTelemetryEvent({
  parserFallback,
  parserId,
  parserVersion,
  rolloutChannel,
  sourceAppId,
}: {
  parserFallback: boolean;
  parserId?: string | null;
  parserVersion?: string | null;
  rolloutChannel?: string | null;
  sourceAppId: TelemetrySourceAppId;
}): CaptureSuccessTelemetryEvent {
  return {
    ...createBaseEvent(),
    data: {
      parserFallback,
      ...(parserId ? { parserId } : {}),
      ...(parserVersion ? { parserVersion } : {}),
      sourceAppId,
    },
    eventName: 'capture_success',
    rolloutChannel: normalizeRolloutChannel(rolloutChannel),
  };
}

export function createCaptureFailureTelemetryEvent({
  code,
  rolloutChannel,
  sourceAppId,
}: {
  code: string;
  rolloutChannel?: string | null;
  sourceAppId: TelemetrySourceAppId;
}): CaptureFailureTelemetryEvent {
  return {
    ...createBaseEvent(),
    data: {
      code: normalizeTelemetryCode(code, 'capture_failed'),
      sourceAppId,
    },
    eventName: 'capture_failure',
    rolloutChannel: normalizeRolloutChannel(rolloutChannel),
  };
}

export function createParserFallbackTelemetryEvent({
  fallbackParserId,
  rolloutChannel,
  sourceAppId,
}: {
  fallbackParserId: string;
  rolloutChannel?: string | null;
  sourceAppId: TelemetrySourceAppId;
}): ParserFallbackTelemetryEvent {
  return {
    ...createBaseEvent(),
    data: {
      fallbackParserId,
      sourceAppId,
    },
    eventName: 'parser_fallback',
    rolloutChannel: normalizeRolloutChannel(rolloutChannel),
  };
}

export function createClassifyCompletedTelemetryEvent({
  autoApplyRule,
  durationMs,
  rolloutChannel,
  saveAsRule,
  source,
}: {
  autoApplyRule: boolean;
  durationMs: number;
  rolloutChannel?: string | null;
  saveAsRule: boolean;
  source: TelemetryClassifySource;
}): ClassifyCompletedTelemetryEvent {
  return {
    ...createBaseEvent(),
    data: {
      autoApplyRule,
      durationMs: Math.max(0, Math.round(durationMs)),
      saveAsRule,
      source,
    },
    eventName: 'classify_completed',
    rolloutChannel: normalizeRolloutChannel(rolloutChannel),
  };
}

export function createSyncErrorTelemetryEvent({
  code,
  phase,
  rolloutChannel,
  syncMode,
}: {
  code: string;
  phase: 'cycle' | 'refresh';
  rolloutChannel?: string | null;
  syncMode: TelemetrySyncMode;
}): SyncErrorTelemetryEvent {
  return {
    ...createBaseEvent(),
    data: {
      code: normalizeTelemetryCode(code, 'sync_error'),
      phase,
      syncMode,
    },
    eventName: 'sync_error',
    rolloutChannel: normalizeRolloutChannel(rolloutChannel),
  };
}

export function createBudgetAlertDeliveryTelemetryEvent({
  quietMode,
  rolloutChannel,
  scope,
  status,
  thresholdPercent,
}: {
  quietMode: boolean;
  rolloutChannel?: string | null;
  scope: TelemetryBudgetScope;
  status: TelemetryBudgetAlertStatus;
  thresholdPercent: 50 | 80 | 100;
}): BudgetAlertDeliveryTelemetryEvent {
  return {
    ...createBaseEvent(),
    data: {
      quietMode,
      scope,
      status,
      thresholdPercent,
    },
    eventName: 'budget_alert_delivery',
    rolloutChannel: normalizeRolloutChannel(rolloutChannel),
  };
}

export function createRuntimeErrorTelemetryEvent({
  code,
  domain,
  fatal,
  rolloutChannel,
}: {
  code: string;
  domain: TelemetryRuntimeErrorDomain;
  fatal: boolean;
  rolloutChannel?: string | null;
}): AppRuntimeErrorTelemetryEvent {
  return {
    ...createBaseEvent(),
    data: {
      code: normalizeTelemetryCode(code, 'runtime_error'),
      domain,
      fatal,
    },
    eventName: 'app_runtime_error',
    rolloutChannel: normalizeRolloutChannel(rolloutChannel),
  };
}

export function buildRuntimeErrorCode(
  error: unknown,
  fallbackCode = 'runtime_error',
): string {
  if (error instanceof Error && error.name.trim().length > 0) {
    return normalizeTelemetryCode(error.name, fallbackCode);
  }

  return normalizeTelemetryCode(fallbackCode, 'runtime_error');
}

export function normalizeTelemetryCode(value: string, fallbackCode: string): string {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);

  return normalizedValue.length > 0 ? normalizedValue : fallbackCode;
}
