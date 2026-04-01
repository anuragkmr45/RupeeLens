package com.upispendtracker.client.capture

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationParserRegistryTest {
  private val parserRegistry = NotificationParserRegistry.default()

  @Test
  fun `fixture suite covers success and failure cases`() {
    assertEquals("parser-fixtures.v1", PARSER_FIXTURE_CATALOG_VERSION)

    val fixtures = buildParserFixtureCatalogV1()

    assertTrue(fixtures.size >= 30)

    fixtures.forEach { fixture ->
      val snapshot = buildSnapshot(
        sourceAppId = fixture.sourceAppId,
        title = fixture.title,
        bodyText = fixture.bodyText,
        subText = fixture.subText,
        textLines = fixture.textLines,
      )

      when (val result = parserRegistry.parse(snapshot)) {
        is NotificationParseResult.Success -> {
          assertEquals("${fixture.name} parser", fixture.expectedParserId, result.event.parserId)
          assertEquals("${fixture.name} amount", fixture.expectedAmountMinor, result.event.amountMinor)
          assertEquals("${fixture.name} merchant", fixture.expectedMerchantRaw, result.event.merchantRaw)
          assertEquals("${fixture.name} source app", fixture.sourceAppId, result.event.sourceAppId)
          assertEquals(
            "${fixture.name} timestamp",
            FIXED_POSTED_AT_MS,
            result.event.occurredAtMs,
          )
          assertNotNull("${fixture.name} parser trace", result.event.parserTrace)
          assertEquals("${fixture.name} reference", fixture.expectedReferenceHint, result.event.referenceHint)
          assertTrue("${fixture.name} confidence", result.event.parserConfidence > 0.0)
        }

        is NotificationParseResult.Failure -> {
          assertEquals("${fixture.name} reason", fixture.expectedFailureReasonCode, result.reasonCode)
          assertTrue("${fixture.name} trace", result.parserTrace.isNotBlank())
        }
      }
    }
  }

  @Test
  fun `tries package specific parser before generic fallback`() {
    val snapshot = buildSnapshot(
      sourceAppId = "phonepe",
      title = "PhonePe",
      bodyText = "Blue Tokai received ₹180",
    )

    val result = parserRegistry.parse(snapshot)

    require(result is NotificationParseResult.Success)
    assertEquals("phonepe_v1", result.event.parserId)
    assertEquals("phonepe_v1:success", result.event.parserTrace)
    assertEquals(18_000L, result.event.amountMinor)
    assertEquals("Blue Tokai", result.event.merchantRaw)
  }

  @Test
  fun `falls back to generic parser when package specific parser misses`() {
    val snapshot = buildSnapshot(
      sourceAppId = "google_pay",
      title = "Google Pay",
      bodyText = "Debited Rs 245.00 towards Blue Tokai",
    )

    val result = parserRegistry.parse(snapshot)

    require(result is NotificationParseResult.Success)
    assertEquals("generic_upi_v1", result.event.parserId)
    assertEquals(
      "google_pay_v1:unsupported_notification_format|generic_upi_v1:success",
      result.event.parserTrace,
    )
    assertEquals(24_500L, result.event.amountMinor)
    assertEquals("Blue Tokai", result.event.merchantRaw)
  }

  @Test
  fun `reports the supported parser inventory with versions`() {
    val supportedParsers = NotificationParserRegistry.supportedParsers()

    assertTrue(supportedParsers.any { parser -> parser.parserId == "google_pay_v1" && parser.parserVersion == "1.0.0" })
    assertTrue(supportedParsers.any { parser -> parser.parserId == "generic_upi_v1" && parser.sourceAppIds.contains("phonepe") })
    assertTrue(supportedParsers.any { parser -> parser.parserId == "merchant_first_v1" && parser.sourceAppIds.contains("paytm") })
  }

  private fun buildSnapshot(
    sourceAppId: String,
    title: String,
    bodyText: String,
    subText: String? = "UPI",
    textLines: List<String> = emptyList(),
  ): NotificationCaptureSnapshot {
    return NotificationCaptureSnapshot(
      capturedAtMs = FIXED_CAPTURED_AT_MS,
      notificationKey = "$sourceAppId:$title:$bodyText",
      packageName = requireNotNull(SourceAppRegistry.packageNameForSourceAppId(sourceAppId)),
      postedAtMs = FIXED_POSTED_AT_MS,
      rawPayload = NotificationPayloadFormatter.formatRawPayload(title, bodyText, subText, textLines),
      sourceAppId = sourceAppId,
      subText = subText,
      title = title,
      bodyText = bodyText,
    )
  }

  companion object {
    private const val FIXED_CAPTURED_AT_MS = 1_774_600_000_000L
    private const val FIXED_POSTED_AT_MS = 1_774_600_000_100L
  }
}
