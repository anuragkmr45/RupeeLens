package com.upispendtracker.client.capture

data class CaptureDedupeConfig(
  val exactMatchWindowSeconds: Int,
  val fuzzyMatchWindowSeconds: Int,
  val merchantSimilarityThreshold: Double,
) {
  init {
    require(exactMatchWindowSeconds > 0)
    require(fuzzyMatchWindowSeconds >= exactMatchWindowSeconds)
    require(merchantSimilarityThreshold > 0.0 && merchantSimilarityThreshold <= 1.0)
  }

  val exactMatchWindowMs: Long
    get() = exactMatchWindowSeconds * 1_000L

  val fuzzyMatchWindowMs: Long
    get() = fuzzyMatchWindowSeconds * 1_000L

  companion object {
    val DEFAULT = CaptureDedupeConfig(
      exactMatchWindowSeconds = 120,
      fuzzyMatchWindowSeconds = 300,
      merchantSimilarityThreshold = 0.88,
    )
  }
}

enum class CaptureDedupeKind(
  val wireValue: String,
) {
  EXACT("exact_duplicate"),
  FUZZY("fuzzy_duplicate"),
}
