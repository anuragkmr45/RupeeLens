package com.upispendtracker.client.capture

import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationPayloadFormatterTest {
  @Test
  fun `formats payload sections in deterministic order`() {
    val payload = NotificationPayloadFormatter.formatRawPayload(
      title = "Paid Rs 250",
      bodyText = "To Blue Tokai",
      subText = "UPI",
      textLines = listOf("Ref 123456", "Txn successful"),
    )

    assertEquals(
      """
        title=Paid Rs 250
        text=To Blue Tokai
        subText=UPI
        line1=Ref 123456
        line2=Txn successful
      """.trimIndent(),
      payload,
    )
  }
}
