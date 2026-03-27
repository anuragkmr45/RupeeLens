package com.upispendtracker.client.capture

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationCaptureDeduperTest {
  private val deduper = NotificationCaptureDeduper()
  private val dedupeConfig = CaptureDedupeConfig.DEFAULT

  @Test
  fun `marks same-bucket same-merchant captures as exact duplicates`() {
    val event = buildEvent(
      merchantRaw = "Blue Tokai",
      occurredAtMs = 1_774_600_120_000L,
    )

    val decision = deduper.evaluate(
      snapshot = buildSnapshot(postedAtMs = event.occurredAtMs),
      event = event,
      dedupeConfig = dedupeConfig,
      candidates = listOf(
        SuccessfulCaptureDedupeCandidate(
          amountMinor = 24_500L,
          merchantRaw = "Blue Tokai",
          occurredAtMs = 1_774_600_100_000L,
          referenceHint = null,
          snapshotId = 4L,
          sourceAppId = "phonepe",
        ),
      ),
    )

    require(decision is CaptureDedupeDecision.Duplicate)
    assertEquals(CaptureDedupeKind.EXACT, decision.dedupeKind)
    assertEquals(4L, decision.matchedSnapshotId)
    assertEquals(1.0, decision.similarityScore ?: 0.0, 0.0)
  }

  @Test
  fun `links near-duplicates with similar merchant text inside fuzzy window`() {
    val event = buildEvent(
      merchantRaw = "Blue Tokai Roasters",
      occurredAtMs = 1_774_600_240_000L,
    )

    val decision = deduper.evaluate(
      snapshot = buildSnapshot(postedAtMs = event.occurredAtMs),
      event = event,
      dedupeConfig = dedupeConfig,
      candidates = listOf(
        SuccessfulCaptureDedupeCandidate(
          amountMinor = 24_500L,
          merchantRaw = "Blue Tokai",
          occurredAtMs = 1_774_600_060_000L,
          referenceHint = null,
          snapshotId = 8L,
          sourceAppId = "phonepe",
        ),
      ),
    )

    require(decision is CaptureDedupeDecision.Duplicate)
    assertEquals(CaptureDedupeKind.FUZZY, decision.dedupeKind)
    assertEquals(8L, decision.matchedSnapshotId)
    assertTrue((decision.similarityScore ?: 0.0) >= dedupeConfig.merchantSimilarityThreshold)
  }

  @Test
  fun `does not merge candidates whose reference hints disagree`() {
    val event = buildEvent(
      merchantRaw = "Blue Tokai Roasters",
      occurredAtMs = 1_774_600_240_000L,
      referenceHint = "UTR123456",
    )

    val decision = deduper.evaluate(
      snapshot = buildSnapshot(postedAtMs = event.occurredAtMs),
      event = event,
      dedupeConfig = dedupeConfig,
      candidates = listOf(
        SuccessfulCaptureDedupeCandidate(
          amountMinor = 24_500L,
          merchantRaw = "Blue Tokai",
          occurredAtMs = 1_774_600_060_000L,
          referenceHint = "UTR999999",
          snapshotId = 9L,
          sourceAppId = "phonepe",
        ),
      ),
    )

    require(decision is CaptureDedupeDecision.Unique)
    assertTrue(decision.exactDedupeKey.isNotBlank())
    assertTrue(decision.fuzzyDedupeKey.isNotBlank())
  }

  private fun buildEvent(
    merchantRaw: String,
    occurredAtMs: Long,
    referenceHint: String? = null,
  ): ParsedNotificationCaptureEvent {
    return ParsedNotificationCaptureEvent(
      amountMinor = 24_500L,
      amountProvenance = "body_text",
      merchantRaw = merchantRaw,
      merchantProvenance = "body_text",
      occurredAtMs = occurredAtMs,
      referenceHint = referenceHint,
      sourceAppId = "phonepe",
      timestampProvenance = NotificationParserRegistry.TIMESTAMP_PROVENANCE_POSTED_AT_MS,
      parserId = "phonepe_v1",
      parserVersion = "1.0.0",
      parserConfidence = 0.96,
      parserTrace = "phonepe_v1:success",
    )
  }

  private fun buildSnapshot(postedAtMs: Long): NotificationCaptureSnapshot {
    return NotificationCaptureSnapshot(
      capturedAtMs = postedAtMs,
      notificationKey = "test-key-$postedAtMs",
      packageName = "com.phonepe.app",
      postedAtMs = postedAtMs,
      rawPayload = "title=PhonePe\ntext=Paid Rs 245.00 to Blue Tokai",
      sourceAppId = "phonepe",
      subText = "UPI",
      title = "PhonePe",
      bodyText = "Paid Rs 245.00 to Blue Tokai",
    )
  }
}
