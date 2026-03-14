package expo.modules.notificationcapture

import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationFilterEvaluatorTest {
  private val evaluator = NotificationFilterEvaluator()

  @Test
  fun returnsStoredForAllowlistedSupportedPackage() {
    val decision = evaluator.evaluate(
      packageName = "com.google.android.apps.nbu.paisa.user",
      allowlistedPackages = setOf("com.google.android.apps.nbu.paisa.user"),
    )

    assertEquals(CaptureDecisionReason.STORED, decision)
  }

  @Test
  fun returnsNotAllowlistedForSupportedPackageOutsideAllowlist() {
    val decision = evaluator.evaluate(
      packageName = "com.phonepe.app",
      allowlistedPackages = emptySet(),
    )

    assertEquals(CaptureDecisionReason.NOT_ALLOWLISTED, decision)
  }

  @Test
  fun returnsUnsupportedForUnknownPackage() {
    val decision = evaluator.evaluate(
      packageName = "com.example.unsupported",
      allowlistedPackages = setOf("com.example.unsupported"),
    )

    assertEquals(CaptureDecisionReason.UNSUPPORTED_SOURCE, decision)
  }
}
