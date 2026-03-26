package com.upispendtracker.client.capture

import android.content.Context

class CaptureSettingsStore(context: Context) {
  private val sharedPreferences =
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

  fun getAllowedSourceAppIds(): Set<String> {
    val storedIds =
      sharedPreferences.getStringSet(KEY_ALLOWED_SOURCE_APP_IDS, null)
        ?: SourceAppRegistry.defaultAllowedSourceAppIds

    return SourceAppRegistry.normalizeSourceAppIds(storedIds).ifEmpty {
      emptySet()
    }
  }

  fun setAllowedSourceAppIds(sourceAppIds: Set<String>) {
    sharedPreferences.edit()
      .putStringSet(KEY_ALLOWED_SOURCE_APP_IDS, LinkedHashSet(sourceAppIds))
      .apply()
  }

  companion object {
    private const val KEY_ALLOWED_SOURCE_APP_IDS = "allowed_source_app_ids"
    private const val PREFERENCES_NAME = "notification_capture_settings"
  }
}
