import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'UPI Spend Tracker',
  slug: 'upi-spend-tracker',
  scheme: 'upispendtracker',
  version: '1.0.0',
  plugins: ['expo-dev-client', './plugins/withNotificationCaptureService'],
  extra: {
    rolloutChannel: 'internal',
    runtimeVersion: '1.0.0',
  },
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  android: {
    package: 'com.upispendtracker.client',
  },
};

export default config;
