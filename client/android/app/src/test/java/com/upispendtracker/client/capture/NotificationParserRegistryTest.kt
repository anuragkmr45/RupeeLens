package com.upispendtracker.client.capture

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationParserRegistryTest {
  private val parserRegistry = NotificationParserRegistry.default()

  @Test
  fun `fixture suite covers success and failure cases`() {
    val fixtures = buildFixtures()

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

  private fun buildFixtures(): List<ParserFixtureCase> {
    return listOf(
      ParserFixtureCase.success(
        name = "google pay paid to merchant",
        sourceAppId = "google_pay",
        title = "Google Pay",
        bodyText = "You paid ₹250 to Blue Tokai",
        expectedParserId = "google_pay_v1",
        expectedAmountMinor = 25_000L,
        expectedMerchantRaw = "Blue Tokai",
      ),
      ParserFixtureCase.success(
        name = "google pay paid with commas",
        sourceAppId = "google_pay",
        title = "Google Pay",
        bodyText = "Paid Rs 1,245.50 to Swiggy",
        expectedParserId = "google_pay_v1",
        expectedAmountMinor = 124_550L,
        expectedMerchantRaw = "Swiggy",
      ),
      ParserFixtureCase.success(
        name = "google pay sent with inr",
        sourceAppId = "google_pay",
        title = "Google Pay",
        bodyText = "Sent INR 89 to Milk Basket",
        expectedParserId = "google_pay_v1",
        expectedAmountMinor = 8_900L,
        expectedMerchantRaw = "Milk Basket",
      ),
      ParserFixtureCase.success(
        name = "google pay paid at merchant",
        sourceAppId = "google_pay",
        title = "Google Pay",
        bodyText = "Paid ₹510 at Metro Station",
        expectedParserId = "google_pay_v1",
        expectedAmountMinor = 51_000L,
        expectedMerchantRaw = "Metro Station",
      ),
      ParserFixtureCase.success(
        name = "phonepe paid to merchant",
        sourceAppId = "phonepe",
        title = "PhonePe",
        bodyText = "Paid ₹245.00 to Chai Point",
        expectedParserId = "phonepe_v1",
        expectedAmountMinor = 24_500L,
        expectedMerchantRaw = "Chai Point",
      ),
      ParserFixtureCase.success(
        name = "phonepe sent to merchant",
        sourceAppId = "phonepe",
        title = "PhonePe",
        bodyText = "Sent Rs 600 to Uber",
        expectedParserId = "phonepe_v1",
        expectedAmountMinor = 60_000L,
        expectedMerchantRaw = "Uber",
      ),
      ParserFixtureCase.success(
        name = "phonepe paid at merchant",
        sourceAppId = "phonepe",
        title = "PhonePe",
        bodyText = "Paid INR 120 at IRCTC",
        expectedParserId = "phonepe_v1",
        expectedAmountMinor = 12_000L,
        expectedMerchantRaw = "IRCTC",
      ),
      ParserFixtureCase.success(
        name = "phonepe merchant received",
        sourceAppId = "phonepe",
        title = "PhonePe",
        bodyText = "Blue Tokai received ₹180",
        expectedParserId = "phonepe_v1",
        expectedAmountMinor = 18_000L,
        expectedMerchantRaw = "Blue Tokai",
      ),
      ParserFixtureCase.success(
        name = "paytm payment of to merchant",
        sourceAppId = "paytm",
        title = "Paytm",
        bodyText = "Payment of ₹399 to BigBasket successful",
        expectedParserId = "paytm_v1",
        expectedAmountMinor = 39_900L,
        expectedMerchantRaw = "BigBasket",
      ),
      ParserFixtureCase.success(
        name = "paytm paid at merchant",
        sourceAppId = "paytm",
        title = "Paytm",
        bodyText = "Paid Rs 75 at Local Kirana",
        expectedParserId = "paytm_v1",
        expectedAmountMinor = 7_500L,
        expectedMerchantRaw = "Local Kirana",
      ),
      ParserFixtureCase.success(
        name = "paytm sent to merchant",
        sourceAppId = "paytm",
        title = "Paytm",
        bodyText = "Sent ₹1,250 to Blinkit",
        expectedParserId = "paytm_v1",
        expectedAmountMinor = 125_000L,
        expectedMerchantRaw = "Blinkit",
      ),
      ParserFixtureCase.success(
        name = "paytm merchant received",
        sourceAppId = "paytm",
        title = "Paytm",
        bodyText = "A2B Veg received Rs 410",
        expectedParserId = "paytm_v1",
        expectedAmountMinor = 41_000L,
        expectedMerchantRaw = "A2B Veg",
      ),
      ParserFixtureCase.success(
        name = "bhim paid to merchant",
        sourceAppId = "bhim",
        title = "BHIM",
        bodyText = "Paid Rs 245 to KFC",
        expectedParserId = "bhim_v1",
        expectedAmountMinor = 24_500L,
        expectedMerchantRaw = "KFC",
      ),
      ParserFixtureCase.success(
        name = "bhim upi payment of merchant",
        sourceAppId = "bhim",
        title = "BHIM",
        bodyText = "UPI payment of ₹799 to Myntra successful",
        expectedParserId = "bhim_v1",
        expectedAmountMinor = 79_900L,
        expectedMerchantRaw = "Myntra",
      ),
      ParserFixtureCase.success(
        name = "bhim sent to merchant",
        sourceAppId = "bhim",
        title = "BHIM",
        bodyText = "Sent INR 50 to Auto Rickshaw",
        expectedParserId = "bhim_v1",
        expectedAmountMinor = 5_000L,
        expectedMerchantRaw = "Auto Rickshaw",
      ),
      ParserFixtureCase.success(
        name = "bhim merchant received",
        sourceAppId = "bhim",
        title = "BHIM",
        bodyText = "Apollo Pharmacy received ₹320",
        expectedParserId = "bhim_v1",
        expectedAmountMinor = 32_000L,
        expectedMerchantRaw = "Apollo Pharmacy",
      ),
      ParserFixtureCase.success(
        name = "google pay generic fallback",
        sourceAppId = "google_pay",
        title = "Google Pay",
        bodyText = "Debited Rs 245.00 towards Blue Tokai",
        expectedParserId = "generic_upi_v1",
        expectedAmountMinor = 24_500L,
        expectedMerchantRaw = "Blue Tokai",
      ),
      ParserFixtureCase.success(
        name = "phonepe generic debit fallback",
        sourceAppId = "phonepe",
        title = "PhonePe",
        bodyText = "UPI debit of ₹120 towards Chai Point",
        expectedParserId = "generic_upi_v1",
        expectedAmountMinor = 12_000L,
        expectedMerchantRaw = "Chai Point",
      ),
      ParserFixtureCase.success(
        name = "paytm generic to fallback",
        sourceAppId = "paytm",
        title = "Paytm",
        bodyText = "UPI debit of Rs 999 towards Reliance Fresh",
        expectedParserId = "generic_upi_v1",
        expectedAmountMinor = 99_900L,
        expectedMerchantRaw = "Reliance Fresh",
      ),
      ParserFixtureCase.success(
        name = "bhim generic at fallback",
        sourceAppId = "bhim",
        title = "BHIM",
        bodyText = "Transferred INR 82 at Metro Canteen",
        expectedParserId = "generic_upi_v1",
        expectedAmountMinor = 8_200L,
        expectedMerchantRaw = "Metro Canteen",
      ),
      ParserFixtureCase.success(
        name = "paytm merchant first generic fallback",
        sourceAppId = "paytm",
        title = "Paytm",
        bodyText = "Airtel credited 799",
        expectedParserId = "merchant_first_v1",
        expectedAmountMinor = 79_900L,
        expectedMerchantRaw = "Airtel",
      ),
      ParserFixtureCase.success(
        name = "phonepe generic with reference",
        sourceAppId = "phonepe",
        title = "PhonePe",
        bodyText = "Debited Rs 500 towards IRCTC Ref 123456ABC",
        expectedParserId = "generic_upi_v1",
        expectedAmountMinor = 50_000L,
        expectedMerchantRaw = "IRCTC",
        expectedReferenceHint = "123456ABC",
      ),
      ParserFixtureCase.success(
        name = "bhim generic from text lines",
        sourceAppId = "bhim",
        title = "BHIM",
        bodyText = "Payment update",
        textLines = listOf("Debited Rs 45 towards Cafe Coffee Day", "UTR 1234567890"),
        expectedParserId = "generic_upi_v1",
        expectedAmountMinor = 4_500L,
        expectedMerchantRaw = "Cafe Coffee Day",
        expectedReferenceHint = "1234567890",
      ),
      ParserFixtureCase.success(
        name = "phonepe generic from text lines",
        sourceAppId = "phonepe",
        title = "PhonePe",
        bodyText = "Payment update",
        textLines = listOf("Debited Rs 230 towards Zomato", "Ref ABCD1234"),
        expectedParserId = "generic_upi_v1",
        expectedAmountMinor = 23_000L,
        expectedMerchantRaw = "Zomato",
        expectedReferenceHint = "ABCD1234",
      ),
      ParserFixtureCase.failure(
        name = "google pay unsupported format",
        sourceAppId = "google_pay",
        title = "Google Pay",
        bodyText = "Payment received",
        expectedFailureReasonCode = NotificationParseFailureReasonCodes.UNSUPPORTED_NOTIFICATION_FORMAT,
      ),
      ParserFixtureCase.failure(
        name = "phonepe missing amount",
        sourceAppId = "phonepe",
        title = "PhonePe",
        bodyText = "Paid to Chai Point",
        expectedFailureReasonCode = NotificationParseFailureReasonCodes.UNSUPPORTED_NOTIFICATION_FORMAT,
      ),
      ParserFixtureCase.failure(
        name = "paytm missing merchant",
        sourceAppId = "paytm",
        title = "Paytm",
        bodyText = "Rs 245 paid successfully",
        expectedFailureReasonCode = NotificationParseFailureReasonCodes.MERCHANT_NOT_FOUND,
      ),
      ParserFixtureCase.failure(
        name = "bhim unsupported format",
        sourceAppId = "bhim",
        title = "BHIM",
        bodyText = "UPI alert only",
        expectedFailureReasonCode = NotificationParseFailureReasonCodes.UNSUPPORTED_NOTIFICATION_FORMAT,
      ),
      ParserFixtureCase.failure(
        name = "phonepe invalid amount token",
        sourceAppId = "phonepe",
        title = "PhonePe",
        bodyText = "You paid ??? to Store",
        expectedFailureReasonCode = NotificationParseFailureReasonCodes.UNSUPPORTED_NOTIFICATION_FORMAT,
      ),
      ParserFixtureCase.failure(
        name = "paytm merchant without amount",
        sourceAppId = "paytm",
        title = "Paytm",
        bodyText = "₹ to Merchant",
        expectedFailureReasonCode = NotificationParseFailureReasonCodes.UNSUPPORTED_NOTIFICATION_FORMAT,
      ),
      ParserFixtureCase.failure(
        name = "google pay amount without merchant",
        sourceAppId = "google_pay",
        title = "Google Pay",
        bodyText = "Paid Rs 340 successfully",
        expectedFailureReasonCode = NotificationParseFailureReasonCodes.MERCHANT_NOT_FOUND,
      ),
      ParserFixtureCase.failure(
        name = "bhim amount without merchant",
        sourceAppId = "bhim",
        title = "BHIM",
        bodyText = "UPI debit of ₹640 completed",
        expectedFailureReasonCode = NotificationParseFailureReasonCodes.MERCHANT_NOT_FOUND,
      ),
    )
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

private data class ParserFixtureCase(
  val bodyText: String,
  val expectedAmountMinor: Long?,
  val expectedFailureReasonCode: String?,
  val expectedMerchantRaw: String?,
  val expectedParserId: String?,
  val expectedReferenceHint: String?,
  val name: String,
  val sourceAppId: String,
  val subText: String? = "UPI",
  val textLines: List<String> = emptyList(),
  val title: String,
) {
  companion object {
    fun success(
      name: String,
      sourceAppId: String,
      title: String,
      bodyText: String,
      expectedParserId: String,
      expectedAmountMinor: Long,
      expectedMerchantRaw: String,
      expectedReferenceHint: String? = null,
      subText: String? = "UPI",
      textLines: List<String> = emptyList(),
    ): ParserFixtureCase {
      return ParserFixtureCase(
        bodyText = bodyText,
        expectedAmountMinor = expectedAmountMinor,
        expectedFailureReasonCode = null,
        expectedMerchantRaw = expectedMerchantRaw,
        expectedParserId = expectedParserId,
        expectedReferenceHint = expectedReferenceHint,
        name = name,
        sourceAppId = sourceAppId,
        subText = subText,
        textLines = textLines,
        title = title,
      )
    }

    fun failure(
      name: String,
      sourceAppId: String,
      title: String,
      bodyText: String,
      expectedFailureReasonCode: String,
      subText: String? = "UPI",
      textLines: List<String> = emptyList(),
    ): ParserFixtureCase {
      return ParserFixtureCase(
        bodyText = bodyText,
        expectedAmountMinor = null,
        expectedFailureReasonCode = expectedFailureReasonCode,
        expectedMerchantRaw = null,
        expectedParserId = null,
        expectedReferenceHint = null,
        name = name,
        sourceAppId = sourceAppId,
        subText = subText,
        textLines = textLines,
        title = title,
      )
    }
  }
}
