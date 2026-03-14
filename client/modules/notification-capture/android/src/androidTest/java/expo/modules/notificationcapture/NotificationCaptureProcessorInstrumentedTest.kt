package expo.modules.notificationcapture

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.os.Process
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NotificationCaptureProcessorInstrumentedTest {
  private lateinit var context: Context
  private lateinit var preferences: NotificationCapturePreferences
  private lateinit var repository: NotificationSnapshotRepository
  private lateinit var processor: NotificationCaptureProcessor

  @Before
  fun setUp() {
    context = ApplicationProvider.getApplicationContext()
    ensureTestNotificationChannel()

    preferences = NotificationCapturePreferences(SharedPreferencesKeyValueStore(context))
    repository = NotificationSnapshotRepository(context)
    processor = NotificationCaptureProcessor(
      context = context,
      repository = repository,
      preferences = preferences,
    )

    preferences.clearAllowlist()
    preferences.resetIgnoredCounts()
    repository.clearAll()
  }

  @After
  fun tearDown() {
    preferences.clearAllowlist()
    preferences.resetIgnoredCounts()
    repository.clearAll()
  }

  @Test
  fun storesOnlyAllowlistedSupportedNotifications() {
    preferences.setSourceEnabled("com.google.android.apps.nbu.paisa.user", true)

    val storedDecision = processor.process(
      createStatusBarNotification(
        packageName = "com.google.android.apps.nbu.paisa.user",
        title = "Money received",
        text = "Rs 420 from coffee",
        postTime = 1_710_374_400_000,
      ),
    )

    assertEquals(CaptureDecisionReason.STORED, storedDecision)

    val latestSnapshot = repository.getLatestSnapshot()
    assertNotNull(latestSnapshot)
    assertEquals("com.google.android.apps.nbu.paisa.user", latestSnapshot?.packageName)

    val notAllowlistedDecision = processor.process(
      createStatusBarNotification(
        packageName = "com.phonepe.app",
        title = "Money paid",
        text = "Rs 120",
        postTime = 1_710_374_500_000,
      ),
    )

    assertEquals(CaptureDecisionReason.NOT_ALLOWLISTED, notAllowlistedDecision)
    assertEquals("com.google.android.apps.nbu.paisa.user", repository.getLatestSnapshot()?.packageName)

    val unsupportedDecision = processor.process(
      createStatusBarNotification(
        packageName = "com.example.unsupported",
        title = "Ignored",
        text = "Rs 99",
        postTime = 1_710_374_600_000,
      ),
    )

    assertEquals(CaptureDecisionReason.UNSUPPORTED_SOURCE, unsupportedDecision)
    assertEquals(1, preferences.getRecentIgnoredCounts().getValue("unsupported"))
    assertEquals(1, preferences.getRecentIgnoredCounts().getValue("notAllowlisted"))
  }

  private fun createStatusBarNotification(
    packageName: String,
    title: String,
    text: String,
    postTime: Long,
  ): StatusBarNotification {
    val notification = NotificationCompat.Builder(context, TEST_CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .build()

    return StatusBarNotification(
      packageName,
      packageName,
      1,
      null,
      1000,
      0,
      notification,
      Process.myUserHandle(),
      null,
      postTime,
    )
  }

  private fun ensureTestNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE)
      as NotificationManager

    notificationManager.createNotificationChannel(
      NotificationChannel(
        TEST_CHANNEL_ID,
        "Capture Tests",
        NotificationManager.IMPORTANCE_DEFAULT,
      ),
    )
  }

  companion object {
    private const val TEST_CHANNEL_ID = "capture-tests"
  }
}
