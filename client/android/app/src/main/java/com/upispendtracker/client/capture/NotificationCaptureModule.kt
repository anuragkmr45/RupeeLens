package com.upispendtracker.client.capture

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

class NotificationCaptureModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private val settingsStore = CaptureSettingsStore(reactContext)
  private val snapshotStore = CaptureSnapshotStore(reactContext)

  init {
    NotificationCaptureEventEmitter.attach(reactContext)
  }

  override fun getName(): String = "NotificationCaptureModule"

  override fun invalidate() {
    NotificationCaptureEventEmitter.detach(reactApplicationContext)
    super.invalidate()
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required so NativeEventEmitter can subscribe on Android without warnings.
  }

  @ReactMethod
  fun removeListeners(count: Double) {
    // Required so NativeEventEmitter can unsubscribe on Android without warnings.
  }

  @ReactMethod
  fun getCaptureDiagnostics(promise: Promise) {
    promise.resolve(buildDiagnosticsMap())
  }

  @ReactMethod
  fun getPendingCaptureEvents(limit: Double, promise: Promise) {
    val normalizedLimit = limit.toInt().coerceIn(1, 200)
    val pendingCaptureMaps =
      Arguments.createArray().apply {
        snapshotStore.fetchPendingCaptureEvents(normalizedLimit).forEach { pendingCapture ->
          val captureMap =
            buildCaptureEventMap(
              captureEventId = pendingCapture.captureEventId,
              replies = snapshotStore.getCaptureReplies(pendingCapture.captureEventId),
              syncMarker = snapshotStore.getSyncMarker(pendingCapture.captureEventId),
            )

          if (captureMap != null) {
            pushMap(captureMap)
          }
        }
      }

    promise.resolve(pendingCaptureMaps)
  }

  @ReactMethod
  fun getCaptureEvent(captureEventId: Double, promise: Promise) {
    promise.resolve(
      buildCaptureEventMap(
        captureEventId = captureEventId.toLong(),
        replies = snapshotStore.getCaptureReplies(captureEventId.toLong()),
        syncMarker = snapshotStore.getSyncMarker(captureEventId.toLong()),
      ),
    )
  }

  @ReactMethod
  fun markCaptureImported(captureEventId: Double, linkedTransactionId: String, promise: Promise) {
    snapshotStore.updateCaptureState(
      captureEventId = captureEventId.toLong(),
      nextState = CaptureEventState.IMPORTED,
      linkedTransactionId = linkedTransactionId,
    )
    NotificationCaptureEventEmitter.emitCaptureChanged(captureEventId.toLong())
    promise.resolve(null)
  }

  @ReactMethod
  fun markCaptureImportFailed(captureEventId: Double, errorCode: String, promise: Promise) {
    snapshotStore.updateCaptureState(
      captureEventId = captureEventId.toLong(),
      nextState = CaptureEventState.FAILED,
      lastErrorCode = errorCode,
    )
    NotificationCaptureEventEmitter.emitCaptureChanged(captureEventId.toLong())
    promise.resolve(null)
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
  fun setDedupeConfig(config: ReadableMap, promise: Promise) {
    val currentConfig = settingsStore.getDedupeConfig()
    val nextConfig = CaptureDedupeConfig(
      exactMatchWindowSeconds =
        if (config.hasKey("exactMatchWindowSeconds")) {
          config.getDouble("exactMatchWindowSeconds").toInt()
        } else {
          currentConfig.exactMatchWindowSeconds
        },
      fuzzyMatchWindowSeconds =
        if (config.hasKey("fuzzyMatchWindowSeconds")) {
          config.getDouble("fuzzyMatchWindowSeconds").toInt()
        } else {
          currentConfig.fuzzyMatchWindowSeconds
        },
      merchantSimilarityThreshold =
        if (config.hasKey("merchantSimilarityThreshold")) {
          config.getDouble("merchantSimilarityThreshold")
        } else {
          currentConfig.merchantSimilarityThreshold
        },
    )

    settingsStore.setDedupeConfig(nextConfig)
    promise.resolve(buildDiagnosticsMap())
  }

  @ReactMethod
  fun setPrivacyModeEnabled(enabled: Boolean, promise: Promise) {
    settingsStore.setPrivacyModeEnabled(enabled)
    promise.resolve(buildDiagnosticsMap())
  }

  @ReactMethod
  fun clearStoredSnapshots(promise: Promise) {
    snapshotStore.clearSnapshots()
    NotificationCaptureEventEmitter.emitCaptureChanged()
    promise.resolve(buildDiagnosticsMap())
  }

  private fun buildDiagnosticsMap(): WritableMap {
    val dedupeConfig = settingsStore.getDedupeConfig()
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
      putMap(
        "dedupeConfig",
        Arguments.createMap().apply {
          putInt("exactMatchWindowSeconds", dedupeConfig.exactMatchWindowSeconds)
          putInt("fuzzyMatchWindowSeconds", dedupeConfig.fuzzyMatchWindowSeconds)
          putDouble(
            "merchantSimilarityThreshold",
            dedupeConfig.merchantSimilarityThreshold,
          )
        },
      )
      putInt("exactDuplicateCount", diagnostics.exactDuplicateCount)
      putInt("fuzzyDuplicateCount", diagnostics.fuzzyDuplicateCount)
      putInt("storedSnapshotCount", diagnostics.storedSnapshotCount)
      putArray(
        "supportedParsers",
        Arguments.createArray().apply {
          diagnostics.supportedParsers.forEach { parserDescriptor ->
            pushMap(
              Arguments.createMap().apply {
                putString("parserId", parserDescriptor.parserId)
                putString("parserVersion", parserDescriptor.parserVersion)
                putArray(
                  "sourceAppIds",
                  buildStringArray(parserDescriptor.sourceAppIds),
                )
              },
            )
          }
        },
      )
      putArray(
        "recentParseFailures",
        Arguments.createArray().apply {
          diagnostics.recentParseFailures.forEach { parseFailure ->
            pushMap(
              Arguments.createMap().apply {
                putDouble("captureEventId", parseFailure.captureEventId.toDouble())
                putDouble("capturedAtMs", parseFailure.capturedAtMs.toDouble())
                putString("failureReasonCode", parseFailure.failureReasonCode)
                putString("parserTrace", parseFailure.parserTrace)
                putString("sourceAppId", parseFailure.sourceAppId)
              },
            )
          }
        },
      )
      putArray(
        "recentCaptureLog",
        Arguments.createArray().apply {
          diagnostics.recentCaptureLog.forEach { captureLogEntry ->
            pushMap(
              Arguments.createMap().apply {
                putDouble("captureEventId", captureLogEntry.captureEventId.toDouble())
                putString("captureState", captureLogEntry.captureState)
                putDouble("capturedAtMs", captureLogEntry.capturedAtMs.toDouble())
                putString("failureReasonCode", captureLogEntry.failureReasonCode)
                putString("parseStatus", captureLogEntry.parseStatus)
                putString("parserId", captureLogEntry.parserId)
                putString("parserVersion", captureLogEntry.parserVersion)
                putString("sourceAppId", captureLogEntry.sourceAppId)
                putInt("totalDuplicateCount", captureLogEntry.totalDuplicateCount)
              },
            )
          }
        },
      )

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

      diagnostics.lastDedupeDecision?.let { lastDedupeDecision ->
        putMap(
          "lastDedupeDecision",
          Arguments.createMap().apply {
            putDouble("amountMinor", lastDedupeDecision.amountMinor.toDouble())
            putString("dedupeKind", lastDedupeDecision.dedupeKind)
            putDouble("dedupedAtMs", lastDedupeDecision.dedupedAtMs.toDouble())
            putInt("duplicateCount", lastDedupeDecision.duplicateCount)
            putString("merchantRaw", lastDedupeDecision.merchantRaw)
            putString("sourceAppId", lastDedupeDecision.sourceAppId)

            lastDedupeDecision.similarityScore?.let { similarityScore ->
              putDouble("similarityScore", similarityScore)
            }
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

  private fun buildCaptureEventMap(
    captureEventId: Long,
    replies: List<StoredCaptureReplyRecord>,
    syncMarker: CaptureSyncMarkerRecord?,
  ): WritableMap? {
    val record = snapshotStore.getCaptureRecord(captureEventId) ?: return null
    val amountMinor = record.parsedAmountMinor ?: return null
    val merchantRaw = record.merchantRaw ?: return null
    val parsedTimestampMs = record.parsedTimestampMs ?: return null

    return Arguments.createMap().apply {
      putDouble("captureEventId", record.captureEventId.toDouble())
      putString("captureState", record.captureState.wireValue)
      putDouble("capturedAtMs", record.capturedAtMs.toDouble())
      putString("linkedTransactionId", record.linkedTransactionId)
      putString("merchantRaw", merchantRaw)
      putString("notificationKey", record.notificationKey)
      putDouble("parsedAmountMinor", amountMinor.toDouble())
      putDouble("parsedTimestampMs", parsedTimestampMs.toDouble())
      putString("sourceAppId", record.sourceAppId)
      putArray(
        "replies",
        Arguments.createArray().apply {
          replies.forEach { reply ->
            pushMap(
              Arguments.createMap().apply {
                putString("actionType", reply.actionType.wireValue)
                putDouble("captureEventId", reply.captureEventId.toDouble())
                putString("categoryId", reply.categoryId)
                putDouble("createdAtMs", reply.createdAtMs.toDouble())
                putString("itemLabel", reply.itemLabel)
                putDouble("replyId", reply.replyId.toDouble())
                putString("replyText", reply.replyText)
              },
            )
          }
        },
      )

      record.parserId?.let { parserId ->
        putMap(
          "parserInfo",
          Arguments.createMap().apply {
            putString("parserId", parserId)
            putString("parserVersion", record.parserVersion)
            record.parserConfidence?.let { parserConfidence ->
              putInt("confidenceBps", (parserConfidence * 10_000).toInt())
            }
          },
        )
      }

      syncMarker?.let { marker ->
        putString("syncState", marker.syncState.wireValue)
      }
    }
  }
}
