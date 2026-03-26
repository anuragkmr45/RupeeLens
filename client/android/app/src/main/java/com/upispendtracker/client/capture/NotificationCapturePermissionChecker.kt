package com.upispendtracker.client.capture

import android.content.ComponentName
import android.content.Context
import android.provider.Settings

object NotificationCapturePermissionChecker {
  fun isListenerEnabled(context: Context): Boolean {
    val enabledListeners =
      Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        ?: return false
    val expectedComponent = ComponentName(
      context,
      SpendTrackerNotificationListenerService::class.java,
    ).flattenToString()

    return enabledListeners
      .split(':')
      .any { componentName -> componentName.equals(expectedComponent, ignoreCase = true) }
  }
}
