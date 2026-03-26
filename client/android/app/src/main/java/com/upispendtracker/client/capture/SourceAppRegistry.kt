package com.upispendtracker.client.capture

data class SupportedSourceApp(
  val id: String,
  val label: String,
  val packageName: String,
)

object SourceAppRegistry {
  private val supportedSourceApps = listOf(
    SupportedSourceApp(
      id = "google_pay",
      label = "Google Pay",
      packageName = "com.google.android.apps.nbu.paisa.user",
    ),
    SupportedSourceApp(
      id = "phonepe",
      label = "PhonePe",
      packageName = "com.phonepe.app",
    ),
    SupportedSourceApp(
      id = "paytm",
      label = "Paytm",
      packageName = "net.one97.paytm",
    ),
    SupportedSourceApp(
      id = "bhim",
      label = "BHIM",
      packageName = "in.org.npci.upiapp",
    ),
  )

  val defaultAllowedSourceAppIds: Set<String> = linkedSetOf(
    "google_pay",
    "phonepe",
    "paytm",
  )

  fun allSupportedSourceApps(): List<SupportedSourceApp> = supportedSourceApps

  fun normalizeSourceAppIds(sourceAppIds: Collection<String>): Set<String> {
    val supportedIds = supportedSourceApps.map { it.id }.toSet()
    return sourceAppIds.filter { supportedIds.contains(it) }.toCollection(LinkedHashSet())
  }

  fun sourceAppIdForPackage(packageName: String): String? =
    supportedSourceApps.firstOrNull { it.packageName == packageName }?.id

  fun packageNameForSourceAppId(sourceAppId: String): String? =
    supportedSourceApps.firstOrNull { it.id == sourceAppId }?.packageName

  fun labelForSourceAppId(sourceAppId: String): String? =
    supportedSourceApps.firstOrNull { it.id == sourceAppId }?.label
}
