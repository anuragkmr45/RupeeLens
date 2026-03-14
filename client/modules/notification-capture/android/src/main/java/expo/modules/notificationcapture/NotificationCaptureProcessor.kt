package expo.modules.notificationcapture

import android.app.Notification
import android.app.Notification.EXTRA_BIG_TEXT
import android.app.Notification.EXTRA_SUB_TEXT
import android.app.Notification.EXTRA_TEXT
import android.app.Notification.EXTRA_TITLE
import android.content.Context
import android.content.pm.PackageManager
import android.service.notification.StatusBarNotification

class NotificationCaptureProcessor(
  private val context: Context,
  private val repository: NotificationSnapshotRepository =
    NotificationSnapshotRepository(context.applicationContext),
  private val preferences: NotificationCapturePreferences =
    NotificationCapturePreferences(SharedPreferencesKeyValueStore(context.applicationContext)),
  private val packageManager: PackageManager = context.applicationContext.packageManager,
  private val evaluator: NotificationFilterEvaluator = NotificationFilterEvaluator(),
) {
  fun process(statusBarNotification: StatusBarNotification): CaptureDecisionReason {
    val decisionReason = evaluator.evaluate(
      packageName = statusBarNotification.packageName,
      allowlistedPackages = preferences.getAllowlistedPackages(),
    )

    when (decisionReason) {
      CaptureDecisionReason.UNSUPPORTED_SOURCE -> {
        preferences.incrementIgnoredUnsupportedCount()
        return decisionReason
      }

      CaptureDecisionReason.NOT_ALLOWLISTED -> {
        preferences.incrementIgnoredNotAllowlistedCount()
        return decisionReason
      }

      CaptureDecisionReason.STORED -> {
        repository.insertSnapshot(
          NotificationSnapshotEntity(
            packageName = statusBarNotification.packageName,
            appLabel = resolveAppLabel(statusBarNotification.packageName),
            notificationKey = statusBarNotification.key
              ?: "${statusBarNotification.packageName}:${statusBarNotification.id}:${statusBarNotification.postTime}",
            postedAtMillis = statusBarNotification.postTime,
            title = extractNotificationField(statusBarNotification.notification, EXTRA_TITLE),
            text = extractNotificationField(statusBarNotification.notification, EXTRA_TEXT),
            subText = extractNotificationField(
              statusBarNotification.notification,
              EXTRA_SUB_TEXT,
            ),
            bigText = extractNotificationField(
              statusBarNotification.notification,
              EXTRA_BIG_TEXT,
            ),
            category = statusBarNotification.notification.category,
            isGroupSummary = (
              statusBarNotification.notification.flags and Notification.FLAG_GROUP_SUMMARY
              ) != 0,
          ),
        )

        return decisionReason
      }
    }
  }

  private fun extractNotificationField(
    notification: Notification,
    key: String,
  ): String? = notification.extras?.getCharSequence(key)?.toString()

  private fun resolveAppLabel(packageName: String): String =
    try {
      val applicationInfo = packageManager.getApplicationInfo(packageName, 0)
      packageManager.getApplicationLabel(applicationInfo).toString()
    } catch (_: PackageManager.NameNotFoundException) {
      packageName
    }
}
