package com.upispendtracker.client.capture

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CaptureActionNotificationFormatterTest {
  @Test
  fun buildsReadablePromptWhenPrivacyModeIsOff() {
    val content =
      CaptureActionNotificationFormatter.buildContent(
        prompt =
          ActionableCapturePrompt(
            amountMinor = 24_500L,
            captureEventId = 42L,
            merchantLabel = "Chai Point",
            sourceAppId = "phonepe",
          ),
        privacyModeEnabled = false,
      )

    assertEquals("Review ₹245.00 payment", content.title)
    assertEquals(
      "₹245.00 from Chai Point is ready to classify, split, or skip.",
      content.text,
    )
    assertEquals("Review ₹245.00 payment", content.publicTitle)
    assertTrue(content.publicText.contains("PhonePe"))
  }

  @Test
  fun redactsPromptCopyWhenPrivacyModeIsOn() {
    val content =
      CaptureActionNotificationFormatter.buildContent(
        prompt =
          ActionableCapturePrompt(
            amountMinor = 24_500L,
            captureEventId = 42L,
            merchantLabel = "Chai Point",
            sourceAppId = "phonepe",
          ),
        privacyModeEnabled = true,
      )

    assertEquals("New payment ready to review", content.title)
    assertEquals(
      "Classify, split, or skip the latest captured payment.",
      content.text,
    )
    assertEquals("New payment ready to review", content.publicTitle)
    assertEquals(
      "Classify, split, or skip the latest captured payment.",
      content.publicText,
    )
  }

  @Test
  fun buildsStableCaptureRouteUri() {
    val routePath = CaptureActionNotificationFormatter.buildRoutePath(84L, "split")

    assertEquals("upispendtracker://capture-action?route=split&captureEventId=84", routePath)
  }
}
