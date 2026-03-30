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

  fun getDedupeConfig(): CaptureDedupeConfig {
    val storedExactMatchWindowSeconds =
      sharedPreferences.getInt(
        KEY_DEDUPE_EXACT_MATCH_WINDOW_SECONDS,
        CaptureDedupeConfig.DEFAULT.exactMatchWindowSeconds,
      )
    val storedFuzzyMatchWindowSeconds =
      sharedPreferences.getInt(
        KEY_DEDUPE_FUZZY_MATCH_WINDOW_SECONDS,
        CaptureDedupeConfig.DEFAULT.fuzzyMatchWindowSeconds,
      )
    val storedMerchantSimilarityThreshold =
      sharedPreferences.getFloat(
        KEY_DEDUPE_MERCHANT_SIMILARITY_THRESHOLD,
        CaptureDedupeConfig.DEFAULT.merchantSimilarityThreshold.toFloat(),
      )

    val exactMatchWindowSeconds = storedExactMatchWindowSeconds.coerceAtLeast(30)
    val fuzzyMatchWindowSeconds = storedFuzzyMatchWindowSeconds.coerceAtLeast(exactMatchWindowSeconds)
    val merchantSimilarityThreshold =
      storedMerchantSimilarityThreshold.toDouble().coerceIn(0.5, 1.0)

    return CaptureDedupeConfig(
      exactMatchWindowSeconds = exactMatchWindowSeconds,
      fuzzyMatchWindowSeconds = fuzzyMatchWindowSeconds,
      merchantSimilarityThreshold = merchantSimilarityThreshold,
    )
  }

  fun setDedupeConfig(dedupeConfig: CaptureDedupeConfig) {
    sharedPreferences.edit()
      .putInt(KEY_DEDUPE_EXACT_MATCH_WINDOW_SECONDS, dedupeConfig.exactMatchWindowSeconds)
      .putInt(KEY_DEDUPE_FUZZY_MATCH_WINDOW_SECONDS, dedupeConfig.fuzzyMatchWindowSeconds)
      .putFloat(
        KEY_DEDUPE_MERCHANT_SIMILARITY_THRESHOLD,
        dedupeConfig.merchantSimilarityThreshold.toFloat(),
      )
      .apply()
  }

  fun getPrivacyModeEnabled(): Boolean {
    return sharedPreferences.getBoolean(KEY_PRIVACY_MODE_ENABLED, true)
  }

  fun setPrivacyModeEnabled(enabled: Boolean) {
    sharedPreferences.edit()
      .putBoolean(KEY_PRIVACY_MODE_ENABLED, enabled)
      .apply()
  }

  companion object {
    private const val KEY_ALLOWED_SOURCE_APP_IDS = "allowed_source_app_ids"
    private const val KEY_DEDUPE_EXACT_MATCH_WINDOW_SECONDS = "dedupe_exact_match_window_seconds"
    private const val KEY_DEDUPE_FUZZY_MATCH_WINDOW_SECONDS = "dedupe_fuzzy_match_window_seconds"
    private const val KEY_DEDUPE_MERCHANT_SIMILARITY_THRESHOLD =
      "dedupe_merchant_similarity_threshold"
    private const val KEY_PRIVACY_MODE_ENABLED = "privacy_mode_enabled"
    private const val PREFERENCES_NAME = "notification_capture_settings"
  }
}
