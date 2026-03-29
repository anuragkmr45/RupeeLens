package com.upispendtracker.client.capture

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

object NotificationCaptureEventEmitter {
  const val EVENT_CAPTURE_CHANGED = "notificationCaptureChanged"

  @Volatile private var reactContext: ReactApplicationContext? = null

  fun attach(reactContext: ReactApplicationContext) {
    this.reactContext = reactContext
  }

  fun detach(reactContext: ReactApplicationContext) {
    if (this.reactContext == reactContext) {
      this.reactContext = null
    }
  }

  fun emitCaptureChanged(captureEventId: Long? = null) {
    val context = reactContext ?: return

    if (!context.hasActiveCatalystInstance()) {
      return
    }

    val payload =
      Arguments.createMap().apply {
        captureEventId?.let { putDouble("captureEventId", it.toDouble()) }
      }

    context
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_CAPTURE_CHANGED, payload)
  }
}
