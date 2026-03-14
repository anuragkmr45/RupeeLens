import type {
  CaptureDiagnosticsSummary,
  CapturePermissionStatus,
  SupportedCaptureSource,
} from './types';

export const fallbackSupportedCaptureSources: SupportedCaptureSource[] = [
  {
    displayName: 'Google Pay',
    enabledByDefault: false,
    packageName: 'com.google.android.apps.nbu.paisa.user',
  },
  {
    displayName: 'PhonePe',
    enabledByDefault: false,
    packageName: 'com.phonepe.app',
  },
  {
    displayName: 'Paytm',
    enabledByDefault: false,
    packageName: 'net.one97.paytm',
  },
  {
    displayName: 'BHIM',
    enabledByDefault: false,
    packageName: 'in.org.npci.upiapp',
  },
];

export function createDefaultAllowlistState(): Record<string, boolean> {
  return Object.fromEntries(
    fallbackSupportedCaptureSources.map((source) => [
      source.packageName,
      source.enabledByDefault,
    ]),
  );
}

export function createDefaultCaptureDiagnosticsSummary(
  permissionStatus: CapturePermissionStatus = 'denied',
): CaptureDiagnosticsSummary {
  return {
    allowlistedPackages: [],
    lastSnapshot: null,
    permissionStatus,
    recentIgnoredCounts: {
      notAllowlisted: 0,
      unsupported: 0,
    },
  };
}
