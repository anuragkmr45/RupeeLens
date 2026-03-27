package com.upispendtracker.client.capture

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class SpendTrackerNotificationListenerService : NotificationListenerService() {
  private val settingsStore by lazy { CaptureSettingsStore(applicationContext) }
  private val snapshotStore by lazy { CaptureSnapshotStore(applicationContext) }
  private val captureProcessor by lazy {
    NotificationCaptureProcessor(
      settingsStore = settingsStore,
      snapshotStore = snapshotStore,
    )
  }

  override fun onNotificationPosted(statusBarNotification: StatusBarNotification) {
    captureExecutor.execute {
      captureProcessor.capture(statusBarNotification)
    }
  }

  companion object {
    private val captureExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  }
}
