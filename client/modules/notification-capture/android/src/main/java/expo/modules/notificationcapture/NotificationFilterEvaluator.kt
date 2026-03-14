package expo.modules.notificationcapture

enum class CaptureDecisionReason {
  STORED,
  UNSUPPORTED_SOURCE,
  NOT_ALLOWLISTED,
}

class NotificationFilterEvaluator(
  private val supportedSources: List<SupportedCaptureSource> = SupportedCaptureSources.all,
) {
  fun evaluate(
    packageName: String,
    allowlistedPackages: Set<String>,
  ): CaptureDecisionReason {
    val supportedSource = supportedSources.firstOrNull { source ->
      source.packageName == packageName
    }

    if (supportedSource == null) {
      return CaptureDecisionReason.UNSUPPORTED_SOURCE
    }

    if (!allowlistedPackages.contains(packageName)) {
      return CaptureDecisionReason.NOT_ALLOWLISTED
    }

    return CaptureDecisionReason.STORED
  }
}
