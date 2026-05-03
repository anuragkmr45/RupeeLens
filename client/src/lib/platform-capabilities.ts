import { Platform } from 'react-native';

export interface PlatformCapabilities {
  platform: 'android' | 'ios';
  opensNotificationAccessSettings: boolean;
  supportsNativeCaptureDiagnostics: boolean;
  supportsNativeNotificationCapture: boolean;
}

export function getPlatformCapabilities(): PlatformCapabilities {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const supportsNativeNotificationCapture = platform === 'android';

  return {
    platform,
    opensNotificationAccessSettings: supportsNativeNotificationCapture,
    supportsNativeCaptureDiagnostics: supportsNativeNotificationCapture,
    supportsNativeNotificationCapture,
  };
}

export function getSettingsActionLabel({
  opensNotificationAccessSettings,
}: Pick<PlatformCapabilities, 'opensNotificationAccessSettings'>): string {
  return opensNotificationAccessSettings
    ? 'Open notification access'
    : 'Open app settings';
}

export function getSettingsVisitLabel(
  {
    opensNotificationAccessSettings,
  }: Pick<PlatformCapabilities, 'opensNotificationAccessSettings'>,
  settingsOpened: boolean,
): string {
  if (opensNotificationAccessSettings) {
    return settingsOpened ? 'notification settings opened' : 'not started';
  }

  return settingsOpened ? 'app settings opened' : 'not opened yet';
}
