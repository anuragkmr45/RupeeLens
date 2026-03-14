export type CapturePermissionStatus = 'denied' | 'granted';

export type SupportedCaptureSource = {
  displayName: string;
  enabledByDefault: boolean;
  packageName: string;
};

export type CaptureSnapshotSummary = {
  appLabel: string;
  packageName: string;
  postedAtMillis: number;
  snapshotId: number;
};

export type CaptureDiagnosticsSummary = {
  allowlistedPackages: string[];
  lastSnapshot: CaptureSnapshotSummary | null;
  permissionStatus: CapturePermissionStatus;
  recentIgnoredCounts: {
    notAllowlisted: number;
    unsupported: number;
  };
};

export type NotificationCaptureModule = {
  getAllowlistState(): Promise<Record<string, boolean>>;
  getDiagnosticsSummary(): Promise<CaptureDiagnosticsSummary>;
  getPermissionStatus(): Promise<CapturePermissionStatus>;
  getSupportedSources(): Promise<SupportedCaptureSource[]>;
  openNotificationListenerSettings(): Promise<void>;
  setAllSourcesEnabled(enabled: boolean): Promise<Record<string, boolean>>;
  setSourceEnabled(
    packageName: string,
    enabled: boolean,
  ): Promise<Record<string, boolean>>;
};

export type CaptureDiagnosticsState = {
  allowlistState: Record<string, boolean>;
  error: string | null;
  loading: boolean;
  openNotificationListenerSettings(): Promise<void>;
  refresh(): Promise<void>;
  setAllSourcesEnabled(enabled: boolean): Promise<void>;
  setSourceEnabled(packageName: string, enabled: boolean): Promise<void>;
  summary: CaptureDiagnosticsSummary;
  supportedSources: SupportedCaptureSource[];
};
