package com.upispendtracker.client.capture

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SourceAppRegistryTest {
  @Test
  fun `maps supported packages back to source app ids`() {
    assertEquals(
      "google_pay",
      SourceAppRegistry.sourceAppIdForPackage("com.google.android.apps.nbu.paisa.user"),
    )
    assertEquals(
      "phonepe",
      SourceAppRegistry.sourceAppIdForPackage("com.phonepe.app"),
    )
  }

  @Test
  fun `ignores unsupported source app ids when normalizing allowlists`() {
    assertEquals(
      linkedSetOf("google_pay", "bhim"),
      SourceAppRegistry.normalizeSourceAppIds(listOf("google_pay", "unknown", "bhim")),
    )
    assertNull(SourceAppRegistry.sourceAppIdForPackage("com.example.unsupported"))
  }
}
