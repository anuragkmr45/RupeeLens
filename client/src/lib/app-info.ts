import type { PlatformCapabilities } from './platform-capabilities';

export const APP_COPY = {
  stage: 'QA-005 observability-instrumented, QA-002 privacy-hardened client',
  title: 'UPI Spend Tracker',
} as const;

export function getAppSubtitle({
  supportsNativeNotificationCapture,
}: Pick<PlatformCapabilities, 'supportsNativeNotificationCapture'>): string {
  if (supportsNativeNotificationCapture) {
    return 'Local-first UPI review with a cycle-aware dashboard, shared manual and history flows, privacy-safe exports, Android native capture diagnostics, and a fast native capture path on Android.';
  }

  return 'Local-first UPI review with a cycle-aware dashboard, shared manual and history flows, privacy-safe exports, support tooling, and an honest manual/local-only shell on iPhone.';
}
