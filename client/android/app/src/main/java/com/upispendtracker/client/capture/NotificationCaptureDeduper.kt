package com.upispendtracker.client.capture

import kotlin.math.abs
import kotlin.math.max

data class SuccessfulCaptureDedupeCandidate(
  val amountMinor: Long,
  val merchantRaw: String,
  val occurredAtMs: Long,
  val referenceHint: String?,
  val snapshotId: Long,
  val sourceAppId: String,
)

sealed interface CaptureDedupeDecision {
  data class Unique(
    val exactDedupeKey: String,
    val fuzzyDedupeKey: String,
  ) : CaptureDedupeDecision

  data class Duplicate(
    val dedupeKind: CaptureDedupeKind,
    val exactDedupeKey: String,
    val fuzzyDedupeKey: String,
    val matchedSnapshotId: Long,
    val similarityScore: Double?,
  ) : CaptureDedupeDecision
}

class NotificationCaptureDeduper {
  fun evaluate(
    snapshot: NotificationCaptureSnapshot,
    event: ParsedNotificationCaptureEvent,
    dedupeConfig: CaptureDedupeConfig,
    candidates: List<SuccessfulCaptureDedupeCandidate>,
  ): CaptureDedupeDecision {
    val exactDedupeKey = buildExactDedupeKey(event, dedupeConfig)
    val fuzzyDedupeKey = buildFuzzyDedupeKey(event)

    candidates.firstOrNull { candidate ->
      candidate.sourceAppId == event.sourceAppId &&
        candidate.amountMinor == event.amountMinor &&
        buildExactDedupeKey(candidate, dedupeConfig) == exactDedupeKey
    }?.let { exactMatch ->
      return CaptureDedupeDecision.Duplicate(
        dedupeKind = CaptureDedupeKind.EXACT,
        exactDedupeKey = exactDedupeKey,
        fuzzyDedupeKey = fuzzyDedupeKey,
        matchedSnapshotId = exactMatch.snapshotId,
        similarityScore = 1.0,
      )
    }

    val fuzzyMatch =
      candidates
        .filter { candidate ->
          candidate.sourceAppId == event.sourceAppId &&
            candidate.amountMinor == event.amountMinor &&
            abs(candidate.occurredAtMs - snapshot.postedAtMs) <= dedupeConfig.fuzzyMatchWindowMs
        }
        .mapNotNull { candidate ->
          if (
            candidate.referenceHint != null &&
            event.referenceHint != null &&
            candidate.referenceHint != event.referenceHint
          ) {
            return@mapNotNull null
          }

          val similarityScore =
            if (
              candidate.referenceHint != null &&
              event.referenceHint != null &&
              candidate.referenceHint == event.referenceHint
            ) {
              1.0
            } else {
              computeMerchantSimilarity(candidate.merchantRaw, event.merchantRaw)
            }

          if (similarityScore < dedupeConfig.merchantSimilarityThreshold) {
            return@mapNotNull null
          }

          FuzzyCandidateMatch(
            candidate = candidate,
            similarityScore = similarityScore,
            timeDistanceMs = abs(candidate.occurredAtMs - snapshot.postedAtMs),
          )
        }
        .sortedWith(
          compareByDescending<FuzzyCandidateMatch> { it.similarityScore }
            .thenBy { it.timeDistanceMs }
            .thenByDescending { it.candidate.snapshotId },
        )
        .firstOrNull()

    if (fuzzyMatch != null) {
      return CaptureDedupeDecision.Duplicate(
        dedupeKind = CaptureDedupeKind.FUZZY,
        exactDedupeKey = exactDedupeKey,
        fuzzyDedupeKey = fuzzyDedupeKey,
        matchedSnapshotId = fuzzyMatch.candidate.snapshotId,
        similarityScore = fuzzyMatch.similarityScore,
      )
    }

    return CaptureDedupeDecision.Unique(
      exactDedupeKey = exactDedupeKey,
      fuzzyDedupeKey = fuzzyDedupeKey,
    )
  }

  fun buildExactDedupeKey(
    event: ParsedNotificationCaptureEvent,
    dedupeConfig: CaptureDedupeConfig,
  ): String {
    val timeBucket = event.occurredAtMs / dedupeConfig.exactMatchWindowMs
    return listOf(
      event.sourceAppId,
      normalizeMerchantForDedupe(event.merchantRaw),
      event.amountMinor.toString(),
      timeBucket.toString(),
      event.referenceHint.orEmpty().lowercase(),
    ).joinToString(separator = "|")
  }

  fun buildExactDedupeKey(
    candidate: SuccessfulCaptureDedupeCandidate,
    dedupeConfig: CaptureDedupeConfig,
  ): String {
    val timeBucket = candidate.occurredAtMs / dedupeConfig.exactMatchWindowMs
    return listOf(
      candidate.sourceAppId,
      normalizeMerchantForDedupe(candidate.merchantRaw),
      candidate.amountMinor.toString(),
      timeBucket.toString(),
      candidate.referenceHint.orEmpty().lowercase(),
    ).joinToString(separator = "|")
  }

  fun buildFuzzyDedupeKey(event: ParsedNotificationCaptureEvent): String {
    return listOf(
      event.sourceAppId,
      normalizeMerchantForDedupe(event.merchantRaw),
      event.amountMinor.toString(),
    ).joinToString(separator = "|")
  }

  fun computeMerchantSimilarity(leftMerchantRaw: String, rightMerchantRaw: String): Double {
    val left = normalizeMerchantForDedupe(leftMerchantRaw)
    val right = normalizeMerchantForDedupe(rightMerchantRaw)

    if (left.isEmpty() || right.isEmpty()) {
      return 0.0
    }

    if (left == right) {
      return 1.0
    }

    if ((left.contains(right) || right.contains(left)) && minOf(left.length, right.length) >= 6) {
      return 0.95
    }

    val distance = levenshteinDistance(left, right)
    val longestLength = max(left.length, right.length)
    return 1.0 - (distance.toDouble() / longestLength.toDouble())
  }

  fun normalizeMerchantForDedupe(rawMerchant: String): String {
    return rawMerchant
      .lowercase()
      .replace(Regex("[^a-z0-9]+"), " ")
      .trim()
      .replace(Regex("\\s{2,}"), " ")
  }
}

private data class FuzzyCandidateMatch(
  val candidate: SuccessfulCaptureDedupeCandidate,
  val similarityScore: Double,
  val timeDistanceMs: Long,
)

private fun levenshteinDistance(left: String, right: String): Int {
  val costs = IntArray(right.length + 1) { index -> index }

  for (leftIndex in left.indices) {
    var previousDiagonal = leftIndex
    costs[0] = leftIndex + 1

    for (rightIndex in right.indices) {
      val currentCost = costs[rightIndex + 1]
      val substitutionCost = if (left[leftIndex] == right[rightIndex]) 0 else 1

      costs[rightIndex + 1] = minOf(
        costs[rightIndex + 1] + 1,
        costs[rightIndex] + 1,
        previousDiagonal + substitutionCost,
      )
      previousDiagonal = currentCost
    }
  }

  return costs[right.length]
}
