package com.upispendtracker.client.capture

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

class NotificationCaptureModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private val settingsStore = CaptureSettingsStore(reactContext)
  private val snapshotStore = CaptureSnapshotStore(reactContext)

  override fun getName(): String = "NotificationCaptureModule"

  @ReactMethod
  fun getCaptureDiagnostics(promise: Promise) {
    promise.resolve(buildDiagnosticsMap())
  }

  @ReactMethod
  fun setAllowedSourceApps(sourceAppIds: ReadableArray, promise: Promise) {
    val normalizedSourceAppIds = mutableListOf<String>()

    for (index in 0 until sourceAppIds.size()) {
      val sourceAppId = sourceAppIds.getString(index)

      if (sourceAppId != null) {
        normalizedSourceAppIds.add(sourceAppId)
      }
    }

    settingsStore.setAllowedSourceAppIds(
      SourceAppRegistry.normalizeSourceAppIds(normalizedSourceAppIds),
    )
    promise.resolve(buildDiagnosticsMap())
  }

  @ReactMethod
  fun clearStoredSnapshots(promise: Promise) {
    snapshotStore.clearSnapshots()
    promise.resolve(buildDiagnosticsMap())
  }

  private fun buildDiagnosticsMap(): WritableMap {
    val diagnostics = snapshotStore.getDiagnostics()

    return Arguments.createMap().apply {
      putArray(
        "allowedSourceAppIds",
        buildStringArray(settingsStore.getAllowedSourceAppIds().toList()),
      )
      putBoolean(
        "listenerPermissionGranted",
        NotificationCapturePermissionChecker.isListenerEnabled(reactApplicationContext),
      )
      putBoolean("serviceAvailable", true)
      putInt("storedSnapshotCount", diagnostics.storedSnapshotCount)

      diagnostics.lastCapture?.let { lastCapture ->
        putMap(
          "lastCapture",
          Arguments.createMap().apply {
            putDouble("capturedAtMs", lastCapture.capturedAtMs.toDouble())
            putString("packageName", lastCapture.packageName)
            putString("preview", lastCapture.preview)
            putString("sourceAppId", lastCapture.sourceAppId)
          },
        )
      }
    }
  }

  private fun buildStringArray(values: List<String>): WritableArray {
    return Arguments.createArray().apply {
      values.forEach { value -> pushString(value) }
    }
  }
}
