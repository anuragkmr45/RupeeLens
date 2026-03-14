package expo.modules.notificationcapture

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationCaptureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NotificationCapture")

    AsyncFunction("getPermissionStatus") {
      getPermissionStatus()
    }

    AsyncFunction("openNotificationListenerSettings") {
      val settingsIntent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      currentContext().startActivity(settingsIntent)
    }

    AsyncFunction("getSupportedSources") {
      SupportedCaptureSources.all.map { source ->
        source.toRecord()
      }
    }

    AsyncFunction("getAllowlistState") {
      preferences().getAllowlistState()
    }

    AsyncFunction("setSourceEnabled") { packageName: String, enabled: Boolean ->
      preferences().setSourceEnabled(packageName, enabled)
      preferences().getAllowlistState()
    }

    AsyncFunction("setAllSourcesEnabled") { enabled: Boolean ->
      preferences().setAllSourcesEnabled(enabled)
      preferences().getAllowlistState()
    }

    AsyncFunction("getDiagnosticsSummary") {
      val latestSnapshot = repository().getLatestSnapshot()

      mapOf(
        "permissionStatus" to getPermissionStatus(),
        "allowlistedPackages" to preferences().getAllowlistedPackages().toList().sorted(),
        "lastSnapshot" to latestSnapshot?.toPreviewRecord(),
        "recentIgnoredCounts" to preferences().getRecentIgnoredCounts(),
      )
    }
  }

  private fun currentContext(): Context = appContext.reactContext?.applicationContext
    ?: throw IllegalStateException("NotificationCapture module requires an active React context.")

  private fun getPermissionStatus(): String =
    if (NotificationManagerCompat.getEnabledListenerPackages(currentContext())
        .contains(currentContext().packageName)
    ) {
      "granted"
    } else {
      "denied"
    }

  private fun preferences(): NotificationCapturePreferences =
    NotificationCapturePreferences(SharedPreferencesKeyValueStore(currentContext()))

  private fun repository(): NotificationSnapshotRepository =
    NotificationSnapshotRepository(currentContext())

  private fun SupportedCaptureSource.toRecord(): Map<String, Any> = mapOf(
    "packageName" to packageName,
    "displayName" to displayName,
    "enabledByDefault" to enabledByDefault,
  )

  private fun NotificationSnapshotEntity.toPreviewRecord(): Map<String, Any> = mapOf(
    "snapshotId" to id,
    "packageName" to packageName,
    "appLabel" to appLabel,
    "postedAtMillis" to postedAtMillis,
  )
}
