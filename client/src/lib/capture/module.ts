import { requireOptionalNativeModule } from 'expo-modules-core';

import {
  createDefaultAllowlistState,
  createDefaultCaptureDiagnosticsSummary,
  fallbackSupportedCaptureSources,
} from './defaults';
import type { NotificationCaptureModule } from './types';

const fallbackNotificationCaptureModule: NotificationCaptureModule = {
  async getAllowlistState() {
    return createDefaultAllowlistState();
  },
  async getDiagnosticsSummary() {
    return createDefaultCaptureDiagnosticsSummary();
  },
  async getPermissionStatus() {
    return 'denied';
  },
  async getSupportedSources() {
    return fallbackSupportedCaptureSources;
  },
  async openNotificationListenerSettings() {
    return undefined;
  },
  async setAllSourcesEnabled(enabled: boolean) {
    return Object.fromEntries(
      fallbackSupportedCaptureSources.map((source) => [source.packageName, enabled]),
    );
  },
  async setSourceEnabled(packageName: string, enabled: boolean) {
    return {
      ...createDefaultAllowlistState(),
      [packageName]: enabled,
    };
  },
};

export const notificationCaptureModule =
  requireOptionalNativeModule<NotificationCaptureModule>('NotificationCapture') ??
  fallbackNotificationCaptureModule;
