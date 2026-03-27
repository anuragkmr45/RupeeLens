package com.upispendtracker.client.capture

import android.app.Notification
import android.service.notification.StatusBarNotification

class NotificationCaptureProcessor(
  private val settingsStore: CaptureSettingsStore,
  private val snapshotStore: CaptureSnapshotStore,
  private val parserRegistry: NotificationParserRegistry = NotificationParserRegistry.default(),
  private val nowProvider: () -> Long = { System.currentTimeMillis() },
) {
  fun capture(statusBarNotification: StatusBarNotification): Boolean {
    val packageName = statusBarNotification.packageName ?: return false
    val sourceAppId = SourceAppRegistry.sourceAppIdForPackage(packageName) ?: return false
    val allowedSourceAppIds = settingsStore.getAllowedSourceAppIds()

    if (!allowedSourceAppIds.contains(sourceAppId)) {
      return false
    }

    val snapshot = buildSnapshot(statusBarNotification, sourceAppId) ?: return false
    val parseResult = parserRegistry.parse(snapshot)
    snapshotStore.insertSnapshot(snapshot, parseResult)
    return true
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
      capturedAtMs = nowProvider(),
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
}
