import { Platform } from 'react-native';

export interface PlatformCapabilities {
  platform: 'android' | 'ios';
  prefersBottomPrimaryNavigation: boolean;
  supportsNativeCaptureDiagnostics: boolean;
  supportsNativeNotificationCapture: boolean;
}

export function getPlatformCapabilities(): PlatformCapabilities {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const supportsNativeNotificationCapture = platform === 'android';

  return {
    platform,
    prefersBottomPrimaryNavigation: platform === 'ios',
    supportsNativeCaptureDiagnostics: supportsNativeNotificationCapture,
    supportsNativeNotificationCapture,
  };
}
