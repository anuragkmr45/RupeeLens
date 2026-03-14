package expo.modules.notificationcapture

data class SupportedCaptureSource(
  val packageName: String,
  val displayName: String,
  val enabledByDefault: Boolean = false,
)

object SupportedCaptureSources {
  val all: List<SupportedCaptureSource> = listOf(
    SupportedCaptureSource(
      packageName = "com.google.android.apps.nbu.paisa.user",
      displayName = "Google Pay",
    ),
    SupportedCaptureSource(
      packageName = "com.phonepe.app",
      displayName = "PhonePe",
    ),
    SupportedCaptureSource(
      packageName = "net.one97.paytm",
      displayName = "Paytm",
    ),
    SupportedCaptureSource(
      packageName = "in.org.npci.upiapp",
      displayName = "BHIM",
    ),
  )

  private val byPackageName: Map<String, SupportedCaptureSource> = all.associateBy {
    it.packageName
  }

  fun findByPackage(packageName: String): SupportedCaptureSource? = byPackageName[packageName]
}
