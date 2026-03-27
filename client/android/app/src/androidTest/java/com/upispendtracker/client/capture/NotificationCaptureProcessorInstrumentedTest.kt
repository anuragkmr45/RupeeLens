package com.upispendtracker.client.capture

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Process
import android.service.notification.StatusBarNotification
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NotificationCaptureProcessorInstrumentedTest {
  private lateinit var context: Context
  private lateinit var processor: NotificationCaptureProcessor
  private lateinit var settingsStore: CaptureSettingsStore
  private lateinit var snapshotStore: CaptureSnapshotStore

  @Before
  fun setUp() {
    context = InstrumentationRegistry.getInstrumentation().targetContext
    ensureTestNotificationChannel()

    settingsStore = CaptureSettingsStore(context)
    snapshotStore = CaptureSnapshotStore(context)
    snapshotStore.clearSnapshots()
    settingsStore.setAllowedSourceAppIds(SourceAppRegistry.defaultAllowedSourceAppIds)
    processor = NotificationCaptureProcessor(
      settingsStore = settingsStore,
      snapshotStore = snapshotStore,
      nowProvider = { FIXED_CAPTURED_AT_MS },
    )
  }

  @After
  fun tearDown() {
    snapshotStore.clearSnapshots()
    settingsStore.setAllowedSourceAppIds(SourceAppRegistry.defaultAllowedSourceAppIds)
  }

  @Test
  fun storesSnapshotsForSupportedAllowlistedPackages() {
    settingsStore.setAllowedSourceAppIds(setOf("phonepe"))

    val didCapture = processor.capture(
      buildStatusBarNotification(
        packageName = "com.phonepe.app",
        title = "PhonePe",
        bodyText = "Paid Rs 245.00 at Chai Point",
        subText = "UPI",
      ),
    )

    val diagnostics = snapshotStore.getDiagnostics()

    assertTrue(didCapture)
    assertEquals(1, diagnostics.storedSnapshotCount)
    assertNotNull(diagnostics.lastCapture)
    assertEquals("com.phonepe.app", diagnostics.lastCapture?.packageName)
    assertEquals("phonepe", diagnostics.lastCapture?.sourceAppId)
    assertTrue(diagnostics.lastCapture?.preview?.contains("Paid Rs 245.00") == true)
  }

  @Test
  fun ignoresSupportedPackagesThatAreNotAllowlisted() {
    settingsStore.setAllowedSourceAppIds(setOf("google_pay"))

    val didCapture = processor.capture(
      buildStatusBarNotification(
        packageName = "com.phonepe.app",
        title = "PhonePe",
        bodyText = "Paid Rs 125.00 at UPI Store",
      ),
    )

    assertFalse(didCapture)
    assertEquals(0, snapshotStore.getDiagnostics().storedSnapshotCount)
  }

  @Test
  fun ignoresUnsupportedPackages() {
    settingsStore.setAllowedSourceAppIds(SourceAppRegistry.defaultAllowedSourceAppIds)

    val didCapture = processor.capture(
      buildStatusBarNotification(
        packageName = "com.android.shell",
        title = "Shell Notification",
        bodyText = "This should never be stored",
      ),
    )

    assertFalse(didCapture)
    assertEquals(0, snapshotStore.getDiagnostics().storedSnapshotCount)
  }

  private fun buildStatusBarNotification(
    packageName: String,
    title: String,
    bodyText: String,
    subText: String? = null,
  ): StatusBarNotification {
    val notification = Notification.Builder(context, TEST_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(title)
      .setContentText(bodyText)
      .apply {
        if (subText != null) {
          setSubText(subText)
        }
      }
      .build()

    return StatusBarNotification(
      packageName,
      packageName,
      7,
      "capture-test",
      context.applicationInfo.uid,
      0,
      0,
      notification,
      Process.myUserHandle(),
      FIXED_POSTED_AT_MS,
    )
  }

  private fun ensureTestNotificationChannel() {
    val notificationManager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    notificationManager.createNotificationChannel(
      NotificationChannel(
        TEST_CHANNEL_ID,
        "Capture Test",
        NotificationManager.IMPORTANCE_DEFAULT,
      ),
    )
  }

  companion object {
    private const val FIXED_CAPTURED_AT_MS = 1_774_600_000_000L
    private const val FIXED_POSTED_AT_MS = 1_774_600_000_100L
    private const val TEST_CHANNEL_ID = "capture-test"
  }
}
