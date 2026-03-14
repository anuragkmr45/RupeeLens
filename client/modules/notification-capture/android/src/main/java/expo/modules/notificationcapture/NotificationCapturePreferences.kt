package expo.modules.notificationcapture

import android.content.Context

interface CaptureKeyValueStore {
  fun getBoolean(key: String, defaultValue: Boolean): Boolean
  fun putBoolean(key: String, value: Boolean)
  fun getInt(key: String, defaultValue: Int): Int
  fun putInt(key: String, value: Int)
  fun clear()
}

class SharedPreferencesKeyValueStore(context: Context) : CaptureKeyValueStore {
  private val sharedPreferences = context.applicationContext.getSharedPreferences(
    "notification_capture",
    Context.MODE_PRIVATE,
  )

  override fun getBoolean(key: String, defaultValue: Boolean): Boolean =
    sharedPreferences.getBoolean(key, defaultValue)

  override fun putBoolean(key: String, value: Boolean) {
    sharedPreferences.edit().putBoolean(key, value).apply()
  }

  override fun getInt(key: String, defaultValue: Int): Int =
    sharedPreferences.getInt(key, defaultValue)

  override fun putInt(key: String, value: Int) {
    sharedPreferences.edit().putInt(key, value).apply()
  }

  override fun clear() {
    sharedPreferences.edit().clear().apply()
  }
}

class NotificationCapturePreferences(
  private val keyValueStore: CaptureKeyValueStore,
) {
  fun getAllowlistState(
    supportedSources: List<SupportedCaptureSource> = SupportedCaptureSources.all,
  ): Map<String, Boolean> = supportedSources.associate { source ->
    source.packageName to isSourceEnabled(source.packageName, source.enabledByDefault)
  }

  fun getAllowlistedPackages(
    supportedSources: List<SupportedCaptureSource> = SupportedCaptureSources.all,
  ): Set<String> = getAllowlistState(supportedSources)
    .filterValues { isEnabled -> isEnabled }
    .keys

  fun isSourceEnabled(
    packageName: String,
    defaultValue: Boolean = false,
  ): Boolean = keyValueStore.getBoolean(allowlistKey(packageName), defaultValue)

  fun setSourceEnabled(
    packageName: String,
    enabled: Boolean,
    supportedSources: List<SupportedCaptureSource> = SupportedCaptureSources.all,
  ) {
    require(supportedSources.any { source -> source.packageName == packageName }) {
      "Unsupported source package: $packageName"
    }

    keyValueStore.putBoolean(allowlistKey(packageName), enabled)
  }

  fun setAllSourcesEnabled(
    enabled: Boolean,
    supportedSources: List<SupportedCaptureSource> = SupportedCaptureSources.all,
  ) {
    supportedSources.forEach { source ->
      keyValueStore.putBoolean(allowlistKey(source.packageName), enabled)
    }
  }

  fun getRecentIgnoredCounts(): Map<String, Int> = mapOf(
    "unsupported" to keyValueStore.getInt(RECENT_IGNORED_UNSUPPORTED_KEY, 0),
    "notAllowlisted" to keyValueStore.getInt(RECENT_IGNORED_NOT_ALLOWLISTED_KEY, 0),
  )

  fun incrementIgnoredUnsupportedCount() {
    incrementCounter(RECENT_IGNORED_UNSUPPORTED_KEY)
  }

  fun incrementIgnoredNotAllowlistedCount() {
    incrementCounter(RECENT_IGNORED_NOT_ALLOWLISTED_KEY)
  }

  fun clearAllowlist(
    supportedSources: List<SupportedCaptureSource> = SupportedCaptureSources.all,
  ) {
    supportedSources.forEach { source ->
      keyValueStore.putBoolean(allowlistKey(source.packageName), source.enabledByDefault)
    }
  }

  fun resetIgnoredCounts() {
    keyValueStore.putInt(RECENT_IGNORED_UNSUPPORTED_KEY, 0)
    keyValueStore.putInt(RECENT_IGNORED_NOT_ALLOWLISTED_KEY, 0)
  }

  companion object {
    private const val ALLOWLIST_PREFIX = "allowlist."
    private const val RECENT_IGNORED_UNSUPPORTED_KEY = "recentIgnoredCounts.unsupported"
    private const val RECENT_IGNORED_NOT_ALLOWLISTED_KEY =
      "recentIgnoredCounts.notAllowlisted"

    private fun allowlistKey(packageName: String): String = "$ALLOWLIST_PREFIX$packageName"
  }

  private fun incrementCounter(key: String) {
    val currentValue = keyValueStore.getInt(key, 0)
    keyValueStore.putInt(key, currentValue + 1)
  }
}
