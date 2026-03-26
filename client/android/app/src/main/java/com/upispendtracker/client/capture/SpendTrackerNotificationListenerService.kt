package com.upispendtracker.client.capture

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class SpendTrackerNotificationListenerService : NotificationListenerService() {
  private val settingsStore by lazy { CaptureSettingsStore(applicationContext) }
  private val snapshotStore by lazy { CaptureSnapshotStore(applicationContext) }

  override fun onNotificationPosted(statusBarNotification: StatusBarNotification) {
    val packageName = statusBarNotification.packageName ?: return
    val sourceAppId = SourceAppRegistry.sourceAppIdForPackage(packageName) ?: return
    val allowedSourceAppIds = settingsStore.getAllowedSourceAppIds()

    if (!allowedSourceAppIds.contains(sourceAppId)) {
      return
    }

    val snapshot = buildSnapshot(statusBarNotification, sourceAppId) ?: return

    captureExecutor.execute {
      snapshotStore.insertSnapshot(snapshot)
    }
  }

  private fun buildSnapshot(
    statusBarNotification: StatusBarNotification,
    sourceAppId: String,
  ): NotificationCaptureSnapshot? {
    val extras = statusBarNotification.notification.extras
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
    val bodyText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
    val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()
    val textLines = extras
      .getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
      ?.map { line -> line?.toString().orEmpty() }
      ?.filter { line -> line.isNotBlank() }
      .orEmpty()
    val rawPayload = NotificationPayloadFormatter.formatRawPayload(
      title = title,
      bodyText = bodyText,
      subText = subText,
      textLines = textLines,
    )

    if (rawPayload.isBlank()) {
      return null
    }

    return NotificationCaptureSnapshot(
      capturedAtMs = System.currentTimeMillis(),
      notificationKey = statusBarNotification.key ?: buildFallbackNotificationKey(statusBarNotification),
      packageName = statusBarNotification.packageName,
      postedAtMs = statusBarNotification.postTime,
      rawPayload = rawPayload,
      sourceAppId = sourceAppId,
      subText = subText,
      title = title,
      bodyText = bodyText,
    )
  }

  private fun buildFallbackNotificationKey(statusBarNotification: StatusBarNotification): String {
    return listOf(
      statusBarNotification.packageName,
      statusBarNotification.id.toString(),
      statusBarNotification.postTime.toString(),
    ).joinToString(separator = ":")
  }

  companion object {
    private val captureExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  }
}
