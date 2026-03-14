package expo.modules.notificationcapture

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationCapturePreferencesTest {
  @Test
  fun defaultsSupportedSourcesToDisabledUntilExplicitlyEnabled() {
    val preferences = NotificationCapturePreferences(InMemoryCaptureKeyValueStore())

    val allowlistState = preferences.getAllowlistState()

    assertFalse(allowlistState.getValue("com.google.android.apps.nbu.paisa.user"))
    assertFalse(allowlistState.getValue("com.phonepe.app"))
    assertFalse(allowlistState.getValue("net.one97.paytm"))
    assertFalse(allowlistState.getValue("in.org.npci.upiapp"))
  }

  @Test
  fun persistsAllowlistChangesAcrossPreferenceInstancesSharingTheSameStore() {
    val keyValueStore = InMemoryCaptureKeyValueStore()
    val firstPreferences = NotificationCapturePreferences(keyValueStore)

    firstPreferences.setSourceEnabled("com.google.android.apps.nbu.paisa.user", true)

    val secondPreferences = NotificationCapturePreferences(keyValueStore)

    assertTrue(
      secondPreferences.getAllowlistState()
        .getValue("com.google.android.apps.nbu.paisa.user"),
    )
  }

  private class InMemoryCaptureKeyValueStore : CaptureKeyValueStore {
    private val booleans = mutableMapOf<String, Boolean>()
    private val ints = mutableMapOf<String, Int>()

    override fun getBoolean(key: String, defaultValue: Boolean): Boolean =
      booleans[key] ?: defaultValue

    override fun putBoolean(key: String, value: Boolean) {
      booleans[key] = value
    }

    override fun getInt(key: String, defaultValue: Int): Int =
      ints[key] ?: defaultValue

    override fun putInt(key: String, value: Int) {
      ints[key] = value
    }

    override fun clear() {
      booleans.clear()
      ints.clear()
    }
  }
}
