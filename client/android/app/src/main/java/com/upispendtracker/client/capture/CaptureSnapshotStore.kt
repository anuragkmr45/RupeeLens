package com.upispendtracker.client.capture

import android.content.Context
import androidx.room.Room

data class NotificationCaptureSnapshot(
  val capturedAtMs: Long,
  val notificationKey: String,
  val packageName: String,
  val postedAtMs: Long,
  val rawPayload: String,
  val sourceAppId: String,
  val subText: String?,
  val title: String?,
  val bodyText: String?,
)

data class LastCapturedSnapshot(
  val capturedAtMs: Long,
  val packageName: String,
  val preview: String,
  val sourceAppId: String,
)

data class CaptureDiagnostics(
  val exactDuplicateCount: Int,
  val fuzzyDuplicateCount: Int,
  val lastCapture: LastCapturedSnapshot?,
  val lastDedupeDecision: LastDedupeDecision?,
  val storedSnapshotCount: Int,
)

data class LastDedupeDecision(
  val amountMinor: Long,
  val dedupeKind: String,
  val dedupedAtMs: Long,
  val duplicateCount: Int,
  val merchantRaw: String,
  val similarityScore: Double?,
  val sourceAppId: String,
)

data class PrimaryCaptureDedupeMetadata(
  val exactDedupeKey: String,
  val fuzzyDedupeKey: String,
)

enum class CaptureEventState(val wireValue: String) {
  CAPTURED("captured"),
  REPLIED("replied"),
  SKIPPED("skipped"),
  IMPORTED("imported"),
  FAILED("failed");

  companion object {
    fun fromWireValue(value: String): CaptureEventState {
      return entries.find { entry -> entry.wireValue == value } ?: CAPTURED
    }
  }
}

enum class CaptureReplyActionType(val wireValue: String) {
  DIRECT_REPLY("direct_reply"),
  OPEN_APP("open_app"),
  SKIP("skip"),
  SPLIT("split");

  companion object {
    fun fromWireValue(value: String): CaptureReplyActionType {
      return entries.find { entry -> entry.wireValue == value } ?: DIRECT_REPLY
    }
  }
}

enum class CaptureSyncState(val wireValue: String) {
  FAILED("failed"),
  IMPORTED("imported"),
  PENDING_IMPORT("pending_import");

  companion object {
    fun fromWireValue(value: String): CaptureSyncState {
      return entries.find { entry -> entry.wireValue == value } ?: PENDING_IMPORT
    }
  }
}

data class CaptureReplyDraft(
  val captureEventId: Long,
  val actionType: CaptureReplyActionType,
  val categoryId: String? = null,
  val createdAtMs: Long,
  val itemLabel: String? = null,
  val replyText: String? = null,
)

data class CaptureSyncMarkerRecord(
  val captureEventId: Long,
  val lastAttemptAtMs: Long?,
  val lastErrorCode: String?,
  val lastSyncedAtMs: Long?,
  val syncCursor: String?,
  val syncState: CaptureSyncState,
  val updatedAtMs: Long,
)

data class PendingCaptureEvent(
  val captureEventId: Long,
  val captureState: CaptureEventState,
  val capturedAtMs: Long,
  val merchantRaw: String,
  val notificationKey: String,
  val parsedAmountMinor: Long,
  val parsedTimestampMs: Long,
  val sourceAppId: String,
)

data class StoredCaptureReplyRecord(
  val actionType: CaptureReplyActionType,
  val captureEventId: Long,
  val categoryId: String?,
  val createdAtMs: Long,
  val itemLabel: String?,
  val replyId: Long,
  val replyText: String?,
)

data class StoredNotificationCaptureRecord(
  val amountProvenance: String?,
  val captureEventId: Long,
  val captureState: CaptureEventState,
  val exactDedupeKey: String?,
  val exactDuplicateCount: Int,
  val failureReasonCode: String?,
  val fuzzyDedupeKey: String?,
  val fuzzyDuplicateCount: Int,
  val lastDuplicateAtMs: Long?,
  val lastDuplicateKind: String?,
  val lastDuplicateSimilarity: Double?,
  val linkedTransactionId: String?,
  val merchantRaw: String?,
  val merchantProvenance: String?,
  val notificationKey: String,
  val packageName: String,
  val parseStatus: String,
  val parserConfidence: Double?,
  val parserId: String?,
  val parserTrace: String?,
  val parserVersion: String?,
  val parsedAmountMinor: Long?,
  val parsedTimestampMs: Long?,
  val rawPayload: String?,
  val rawPayloadPrunedAtMs: Long?,
  val referenceHint: String?,
  val sourceAppId: String,
  val timestampProvenance: String?,
  val totalDuplicateCount: Int,
)

class CaptureRepository(context: Context) : AutoCloseable {
  private val database =
    Room.databaseBuilder(
      context.applicationContext,
      NotificationCaptureDatabase::class.java,
      NotificationCaptureDatabase.DATABASE_NAME,
    )
      .addMigrations(*NotificationCaptureDatabase.ALL_MIGRATIONS)
      .build()
  private val captureEventDao = database.captureEventDao()
  private val captureReplyDao = database.captureReplyDao()
  private val captureSyncMarkerDao = database.captureSyncMarkerDao()

  fun insertSnapshot(
    snapshot: NotificationCaptureSnapshot,
    parseResult: NotificationParseResult,
    dedupeMetadata: PrimaryCaptureDedupeMetadata? = null,
  ): Long {
    val eventEntity = buildEventEntity(snapshot, parseResult, dedupeMetadata)
    var insertedEventId = -1L

    database.runInTransaction {
      insertedEventId = captureEventDao.insert(eventEntity)

      if (insertedEventId > 0L && parseResult is NotificationParseResult.Success) {
        captureSyncMarkerDao.upsert(
          CaptureSyncMarkerEntity(
            captureEventId = insertedEventId,
            syncState = CaptureSyncState.PENDING_IMPORT.wireValue,
            updatedAtMs = snapshot.capturedAtMs,
          ),
        )
      }
    }

    pruneRetainedRawPayloads()
    return insertedEventId
  }

  fun insertCaptureReply(replyDraft: CaptureReplyDraft): Long {
    return captureReplyDao.insert(
      CaptureReplyEntity(
        captureEventId = replyDraft.captureEventId,
        actionType = replyDraft.actionType.wireValue,
        categoryId = replyDraft.categoryId,
        createdAtMs = replyDraft.createdAtMs,
        itemLabel = replyDraft.itemLabel,
        replyText = replyDraft.replyText,
      ),
    )
  }

  fun getCaptureReplies(captureEventId: Long): List<StoredCaptureReplyRecord> {
    return captureReplyDao
      .listForCapture(captureEventId)
      .map { entity ->
        StoredCaptureReplyRecord(
          actionType = CaptureReplyActionType.fromWireValue(entity.actionType),
          captureEventId = entity.captureEventId,
          categoryId = entity.categoryId,
          createdAtMs = entity.createdAtMs,
          itemLabel = entity.itemLabel,
          replyId = entity.id,
          replyText = entity.replyText,
        )
      }
  }

  fun upsertSyncMarker(
    captureEventId: Long,
    syncState: CaptureSyncState,
    updatedAtMs: Long,
    syncCursor: String? = null,
    lastErrorCode: String? = null,
    lastAttemptAtMs: Long? = null,
    lastSyncedAtMs: Long? = null,
  ) {
    captureSyncMarkerDao.upsert(
      CaptureSyncMarkerEntity(
        captureEventId = captureEventId,
        lastAttemptAtMs = lastAttemptAtMs,
        lastErrorCode = lastErrorCode,
        lastSyncedAtMs = lastSyncedAtMs,
        syncCursor = syncCursor,
        syncState = syncState.wireValue,
        updatedAtMs = updatedAtMs,
      ),
    )
  }

  fun getSyncMarker(captureEventId: Long): CaptureSyncMarkerRecord? {
    return captureSyncMarkerDao.getByCaptureEventId(captureEventId)?.let { entity ->
      CaptureSyncMarkerRecord(
        captureEventId = entity.captureEventId,
        lastAttemptAtMs = entity.lastAttemptAtMs,
        lastErrorCode = entity.lastErrorCode,
        lastSyncedAtMs = entity.lastSyncedAtMs,
        syncCursor = entity.syncCursor,
        syncState = CaptureSyncState.fromWireValue(entity.syncState),
        updatedAtMs = entity.updatedAtMs,
      )
    }
  }

  fun fetchPendingCaptureEvents(limit: Int = DEFAULT_PENDING_FETCH_LIMIT): List<PendingCaptureEvent> {
    return captureEventDao
      .fetchPendingCaptureRows(limit)
      .map { row ->
        PendingCaptureEvent(
          captureEventId = row.id,
          captureState = CaptureEventState.fromWireValue(row.captureState),
          capturedAtMs = row.capturedAtMs,
          merchantRaw = row.merchantRaw,
          notificationKey = row.notificationKey,
          parsedAmountMinor = row.parsedAmountMinor,
          parsedTimestampMs = row.parsedTimestampMs,
          sourceAppId = row.sourceAppId,
        )
      }
  }

  fun updateCaptureState(
    captureEventId: Long,
    nextState: CaptureEventState,
    linkedTransactionId: String? = null,
    updatedAtMs: Long = System.currentTimeMillis(),
    syncState: CaptureSyncState? =
      when (nextState) {
        CaptureEventState.IMPORTED -> CaptureSyncState.IMPORTED
        CaptureEventState.FAILED -> CaptureSyncState.FAILED
        else -> null
      },
    syncCursor: String? = null,
    lastErrorCode: String? = null,
  ) {
    database.runInTransaction {
      captureEventDao.updateCaptureState(
        captureEventId = captureEventId,
        captureState = nextState.wireValue,
        linkedTransactionId = linkedTransactionId,
        stateUpdatedAtMs = updatedAtMs,
      )

      syncState?.let { resolvedSyncState ->
        val lastSyncedAtMs =
          if (resolvedSyncState == CaptureSyncState.IMPORTED) {
            updatedAtMs
          } else {
            null
          }
        val lastAttemptAtMs =
          if (resolvedSyncState == CaptureSyncState.FAILED) {
            updatedAtMs
          } else {
            null
          }

        captureSyncMarkerDao.upsert(
          CaptureSyncMarkerEntity(
            captureEventId = captureEventId,
            lastAttemptAtMs = lastAttemptAtMs,
            lastErrorCode = lastErrorCode,
            lastSyncedAtMs = lastSyncedAtMs,
            syncCursor = syncCursor,
            syncState = resolvedSyncState.wireValue,
            updatedAtMs = updatedAtMs,
          ),
        )
      }
    }
  }

  fun clearSnapshots() {
    database.runInTransaction {
      captureSyncMarkerDao.clear()
      captureReplyDao.clear()
      captureEventDao.clear()
    }
  }

  fun findSuccessfulDedupeCandidates(
    sourceAppId: String,
    amountMinor: Long,
    minimumOccurredAtMs: Long,
    maximumOccurredAtMs: Long,
  ): List<SuccessfulCaptureDedupeCandidate> {
    return captureEventDao
      .findSuccessfulDedupeCandidates(
        sourceAppId = sourceAppId,
        amountMinor = amountMinor,
        minimumOccurredAtMs = minimumOccurredAtMs,
        maximumOccurredAtMs = maximumOccurredAtMs,
      )
      .map { row ->
        SuccessfulCaptureDedupeCandidate(
          amountMinor = row.amountMinor,
          merchantRaw = row.merchantRaw,
          occurredAtMs = row.occurredAtMs,
          referenceHint = row.referenceHint,
          snapshotId = row.snapshotId,
          sourceAppId = row.sourceAppId,
        )
      }
  }

  fun recordDuplicateSuppression(
    matchedSnapshotId: Long,
    dedupeKind: CaptureDedupeKind,
    duplicateCapturedAtMs: Long,
    exactDedupeKey: String,
    fuzzyDedupeKey: String,
    similarityScore: Double?,
  ) {
    database.runInTransaction {
      captureEventDao.updateDuplicateMetadata(
        captureEventId = matchedSnapshotId,
        exactDedupeKey = exactDedupeKey,
        fuzzyDedupeKey = fuzzyDedupeKey,
        lastDuplicateKind = dedupeKind.wireValue,
        lastDuplicateAtMs = duplicateCapturedAtMs,
        lastDuplicateSimilarity = similarityScore,
      )

      when (dedupeKind) {
        CaptureDedupeKind.EXACT -> captureEventDao.incrementExactDuplicateCount(matchedSnapshotId)
        CaptureDedupeKind.FUZZY -> captureEventDao.incrementFuzzyDuplicateCount(matchedSnapshotId)
      }
    }
  }

  fun getDiagnostics(): CaptureDiagnostics {
    val latestEvent = captureEventDao.getLatestEvent()
    val lastDuplicateEvent = captureEventDao.getLastDuplicateEvent()

    return CaptureDiagnostics(
      exactDuplicateCount = captureEventDao.getExactDuplicateCount(),
      fuzzyDuplicateCount = captureEventDao.getFuzzyDuplicateCount(),
      lastCapture =
        latestEvent?.let { event ->
          LastCapturedSnapshot(
            capturedAtMs = event.capturedAtMs,
            packageName = event.packageName,
            preview = buildPreview(event),
            sourceAppId = event.sourceAppId,
          )
        },
      lastDedupeDecision =
        lastDuplicateEvent?.let { event ->
          LastDedupeDecision(
            amountMinor = event.parsedAmountMinor ?: 0L,
            dedupeKind = event.lastDuplicateKind.orEmpty(),
            dedupedAtMs = event.lastDuplicateAtMs ?: 0L,
            duplicateCount = event.totalDuplicateCount,
            merchantRaw = event.parsedMerchantRaw.orEmpty(),
            similarityScore = event.lastDuplicateSimilarity,
            sourceAppId = event.sourceAppId,
          )
        },
      storedSnapshotCount = captureEventDao.countCaptureEvents(),
    )
  }

  fun getLatestStoredRecord(): StoredNotificationCaptureRecord? {
    return captureEventDao.getLatestEvent()?.toStoredRecord()
  }

  fun pruneRetainedRawPayloads(
    maxRetainedRawPayloads: Int = MAX_RETAINED_RAW_PAYLOADS,
    prunedAtMs: Long = System.currentTimeMillis(),
  ): Int {
    val retainIds = captureEventDao.selectLatestCaptureIds(maxRetainedRawPayloads)
    return if (retainIds.isEmpty()) {
      captureEventDao.pruneAllRawPayloads(prunedAtMs)
    } else {
      captureEventDao.pruneRawPayloadsOutside(retainIds, prunedAtMs)
    }
  }

  override fun close() {
    database.close()
  }

  private fun buildEventEntity(
    snapshot: NotificationCaptureSnapshot,
    parseResult: NotificationParseResult,
    dedupeMetadata: PrimaryCaptureDedupeMetadata?,
  ): CaptureEventEntity {
    return when (parseResult) {
      is NotificationParseResult.Success ->
        CaptureEventEntity(
          sourceAppId = snapshot.sourceAppId,
          packageName = snapshot.packageName,
          notificationKey = snapshot.notificationKey,
          title = snapshot.title,
          bodyText = snapshot.bodyText,
          subText = snapshot.subText,
          rawPayload = snapshot.rawPayload,
          postedAtMs = snapshot.postedAtMs,
          capturedAtMs = snapshot.capturedAtMs,
          parseStatus = "success",
          parserId = parseResult.event.parserId,
          parserVersion = parseResult.event.parserVersion,
          parserConfidence = parseResult.event.parserConfidence,
          parserTrace = parseResult.event.parserTrace,
          failureReasonCode = null,
          parsedAmountMinor = parseResult.event.amountMinor,
          parsedMerchantRaw = parseResult.event.merchantRaw,
          parsedTimestampMs = parseResult.event.occurredAtMs,
          timestampProvenance = parseResult.event.timestampProvenance,
          amountProvenance = parseResult.event.amountProvenance,
          merchantProvenance = parseResult.event.merchantProvenance,
          referenceHint = parseResult.event.referenceHint,
          exactDedupeKey = dedupeMetadata?.exactDedupeKey,
          fuzzyDedupeKey = dedupeMetadata?.fuzzyDedupeKey,
          captureState = CaptureEventState.CAPTURED.wireValue,
          stateUpdatedAtMs = snapshot.capturedAtMs,
        )

      is NotificationParseResult.Failure ->
        CaptureEventEntity(
          sourceAppId = snapshot.sourceAppId,
          packageName = snapshot.packageName,
          notificationKey = snapshot.notificationKey,
          title = snapshot.title,
          bodyText = snapshot.bodyText,
          subText = snapshot.subText,
          rawPayload = snapshot.rawPayload,
          postedAtMs = snapshot.postedAtMs,
          capturedAtMs = snapshot.capturedAtMs,
          parseStatus = "failed",
          parserTrace = parseResult.parserTrace,
          failureReasonCode = parseResult.reasonCode,
          parsedTimestampMs = snapshot.postedAtMs,
          timestampProvenance = NotificationParserRegistry.TIMESTAMP_PROVENANCE_POSTED_AT_MS,
          captureState = CaptureEventState.CAPTURED.wireValue,
          stateUpdatedAtMs = snapshot.capturedAtMs,
        )
    }
  }

  private fun buildPreview(event: CaptureEventEntity): String {
    val rawPayload = event.rawPayload
    if (!rawPayload.isNullOrBlank()) {
      return NotificationPayloadFormatter.buildPreview(rawPayload)
    }

    val fallbackPreview =
      listOfNotNull(
        event.bodyText?.takeIf { value -> value.isNotBlank() },
        event.parsedMerchantRaw?.takeIf { value -> value.isNotBlank() }?.let { merchant ->
          event.parsedAmountMinor?.let { amountMinor ->
            "Amount ${amountMinor / 100}.${(amountMinor % 100).toString().padStart(2, '0')} at $merchant"
          } ?: merchant
        },
        event.title?.takeIf { value -> value.isNotBlank() },
      ).firstOrNull()

    return fallbackPreview ?: "Stored capture event"
  }

  private fun CaptureEventEntity.toStoredRecord(): StoredNotificationCaptureRecord {
    return StoredNotificationCaptureRecord(
      amountProvenance = amountProvenance,
      captureEventId = id,
      captureState = CaptureEventState.fromWireValue(captureState),
      exactDedupeKey = exactDedupeKey,
      exactDuplicateCount = exactDuplicateCount,
      failureReasonCode = failureReasonCode,
      fuzzyDedupeKey = fuzzyDedupeKey,
      fuzzyDuplicateCount = fuzzyDuplicateCount,
      lastDuplicateAtMs = lastDuplicateAtMs,
      lastDuplicateKind = lastDuplicateKind,
      lastDuplicateSimilarity = lastDuplicateSimilarity,
      linkedTransactionId = linkedTransactionId,
      merchantRaw = parsedMerchantRaw,
      merchantProvenance = merchantProvenance,
      notificationKey = notificationKey,
      packageName = packageName,
      parseStatus = parseStatus,
      parserConfidence = parserConfidence,
      parserId = parserId,
      parserTrace = parserTrace,
      parserVersion = parserVersion,
      parsedAmountMinor = parsedAmountMinor,
      parsedTimestampMs = parsedTimestampMs,
      rawPayload = rawPayload,
      rawPayloadPrunedAtMs = rawPayloadPrunedAtMs,
      referenceHint = referenceHint,
      sourceAppId = sourceAppId,
      timestampProvenance = timestampProvenance,
      totalDuplicateCount = totalDuplicateCount,
    )
  }

  companion object {
    private const val DEFAULT_PENDING_FETCH_LIMIT = 50
    private const val MAX_RETAINED_RAW_PAYLOADS = 200
  }
}

typealias CaptureSnapshotStore = CaptureRepository
