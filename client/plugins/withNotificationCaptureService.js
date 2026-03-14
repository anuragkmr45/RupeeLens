/* eslint-disable @typescript-eslint/no-require-imports */
const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const serviceName =
  'expo.modules.notificationcapture.CaptureNotificationListenerService';
const notificationListenerAction =
  'android.service.notification.NotificationListenerService';

function ensureNotificationCaptureService(mainApplication) {
  if (!Array.isArray(mainApplication.service)) {
    mainApplication.service = [];
  }

  const serviceConfig = {
    $: {
      'android:exported': 'true',
      'android:name': serviceName,
      'android:permission':
        'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
    },
    'intent-filter': [
      {
        action: [
          {
            $: {
              'android:name': notificationListenerAction,
            },
          },
        ],
      },
    ],
  };

  const existingServiceIndex = mainApplication.service.findIndex(
    (service) => service.$['android:name'] === serviceName,
  );

  if (existingServiceIndex >= 0) {
    mainApplication.service[existingServiceIndex] = serviceConfig;
    return;
  }

  mainApplication.service.push(serviceConfig);
}

module.exports = function withNotificationCaptureService(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      configWithManifest.modResults,
    );

    ensureNotificationCaptureService(mainApplication);

    return configWithManifest;
  });
};
