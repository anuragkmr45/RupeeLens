import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

export const TELEMETRY_SCHEMA_VERSION = 1 as const;
export const TELEMETRY_EVENT_NAMES = [
  'onboarding_completed',
  'notification_permission_denied',
  'capture_success',
  'capture_failure',
  'parser_fallback',
  'classify_completed',
  'sync_error',
  'budget_alert_delivery',
  'app_runtime_error',
] as const;
export const TELEMETRY_ALERT_KEYS = [
  'capture_failure_spike',
  'sync_error_spike',
  'parser_fallback_spike',
  'classify_latency_spike',
  'runtime_error_spike',
] as const;

export type TelemetryEventName = typeof TELEMETRY_EVENT_NAMES[number];
export type TelemetryAlertKey = typeof TELEMETRY_ALERT_KEYS[number];
export type TelemetryPlatform = 'android' | 'ios';
export type TelemetryRolloutChannel = 'internal' | 'beta' | 'production' | 'unknown';
export type TelemetrySourceAppId = 'bhim' | 'google_pay' | 'paytm' | 'phonepe';
export type TelemetrySyncMode = 'cloud_sync' | 'local_only' | 'sync_later';
export type TelemetryPermissionSurface = 'onboarding' | 'settings';
export type TelemetryClassifySource = 'detail' | 'home' | 'inbox' | 'native_capture';
export type TelemetrySyncPhase = 'cycle' | 'refresh';
export type TelemetryBudgetScope = 'category' | 'item' | 'merchant' | 'overall';
export type TelemetryBudgetAlertStatus = 'active' | 'quieted' | 'reviewed';
export type TelemetryRuntimeErrorDomain =
  | 'bootstrap'
  | 'capture_import'
  | 'export'
  | 'global'
  | 'settings'
  | 'sync';
export type TelemetryAlertStatus = 'firing' | 'ok';
export type TelemetryAlertUnit = 'count' | 'milliseconds' | 'ratio';

interface TelemetryEventBase<TEventName extends TelemetryEventName, TData extends Record<string, unknown>> {
  appVersion: string;
  clientEventId: string;
  data: TData;
  eventName: TEventName;
  occurredAt: IsoUtcDateTimeString;
  platform: TelemetryPlatform;
  rolloutChannel: TelemetryRolloutChannel;
  runtimeVersion: string;
}

export type OnboardingCompletedTelemetryEvent = TelemetryEventBase<
  'onboarding_completed',
  {
    permissionGranted: boolean;
    selectedSourceAppCount: number;
    syncMode: Exclude<TelemetrySyncMode, 'cloud_sync'>;
  }
>;

export type NotificationPermissionDeniedTelemetryEvent = TelemetryEventBase<
  'notification_permission_denied',
  {
    selectedSourceAppCount: number;
    source: TelemetryPermissionSurface;
    syncMode: Exclude<TelemetrySyncMode, 'cloud_sync'>;
  }
>;

export type CaptureSuccessTelemetryEvent = TelemetryEventBase<
  'capture_success',
  {
    parserFallback: boolean;
    parserId?: string | null;
    parserVersion?: string | null;
    sourceAppId: TelemetrySourceAppId;
  }
>;

export type CaptureFailureTelemetryEvent = TelemetryEventBase<
  'capture_failure',
  {
    code: string;
    sourceAppId: TelemetrySourceAppId;
  }
>;

export type ParserFallbackTelemetryEvent = TelemetryEventBase<
  'parser_fallback',
  {
    fallbackParserId: string;
    sourceAppId: TelemetrySourceAppId;
  }
>;

export type ClassifyCompletedTelemetryEvent = TelemetryEventBase<
  'classify_completed',
  {
    autoApplyRule: boolean;
    durationMs: number;
    saveAsRule: boolean;
    source: TelemetryClassifySource;
  }
>;

export type SyncErrorTelemetryEvent = TelemetryEventBase<
  'sync_error',
  {
    code: string;
    phase: TelemetrySyncPhase;
    syncMode: TelemetrySyncMode;
  }
>;

export type BudgetAlertDeliveryTelemetryEvent = TelemetryEventBase<
  'budget_alert_delivery',
  {
    quietMode: boolean;
    scope: TelemetryBudgetScope;
    status: TelemetryBudgetAlertStatus;
    thresholdPercent: 50 | 80 | 100;
  }
>;

export type AppRuntimeErrorTelemetryEvent = TelemetryEventBase<
  'app_runtime_error',
  {
    code: string;
    domain: TelemetryRuntimeErrorDomain;
    fatal: boolean;
  }
>;

export type TelemetryEvent =
  | OnboardingCompletedTelemetryEvent
  | NotificationPermissionDeniedTelemetryEvent
  | CaptureSuccessTelemetryEvent
  | CaptureFailureTelemetryEvent
  | ParserFallbackTelemetryEvent
  | ClassifyCompletedTelemetryEvent
  | SyncErrorTelemetryEvent
  | BudgetAlertDeliveryTelemetryEvent
  | AppRuntimeErrorTelemetryEvent;

export interface TelemetryIngestRequest {
  events: TelemetryEvent[];
  schemaVersion: typeof TELEMETRY_SCHEMA_VERSION;
}

export interface TelemetryIngestResponse {
  acceptedCount: number;
  duplicateCount: number;
  receivedAt: IsoUtcDateTimeString;
  schemaVersion: typeof TELEMETRY_SCHEMA_VERSION;
}

export interface TelemetryOperationalAlert {
  description: string;
  key: TelemetryAlertKey;
  observed: number;
  status: TelemetryAlertStatus;
  threshold: number;
  unit: TelemetryAlertUnit;
}

export interface TelemetryOperationalDashboardResponse {
  alerts: TelemetryOperationalAlert[];
  budgetAlertDelivery: {
    deliveryCount: number;
    quietedCount: number;
    reviewedCount: number;
  };
  capture: {
    failureCount: number;
    failureRate: number | null;
    parserFallbackCount: number;
    parserFallbackRate: number | null;
    successCount: number;
  };
  classification: {
    completedCount: number;
    latencyP50Ms: number | null;
    latencyP95Ms: number | null;
  };
  generatedAt: IsoUtcDateTimeString;
  lookbackHours: number;
  runtimeErrors: {
    count: number;
    fatalCount: number;
  };
  schemaVersion: typeof TELEMETRY_SCHEMA_VERSION;
  sync: {
    affectedDeviceCount: number;
    errorCount: number;
  };
  totals: {
    deviceCount: number;
    eventCount: number;
    userCount: number;
  };
  funnels: {
    onboardingCompletedCount: number;
    permissionDeniedCount: number;
  };
}
