package com.upispendtracker.client.capture

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

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

data class StoredNotificationCaptureRecord(
  val amountProvenance: String?,
  val exactDedupeKey: String?,
  val exactDuplicateCount: Int,
  val failureReasonCode: String?,
  val fuzzyDedupeKey: String?,
  val fuzzyDuplicateCount: Int,
  val lastDuplicateAtMs: Long?,
  val lastDuplicateKind: String?,
  val lastDuplicateSimilarity: Double?,
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
  val rawPayload: String,
  val referenceHint: String?,
  val sourceAppId: String,
  val timestampProvenance: String?,
  val totalDuplicateCount: Int,
)

class CaptureSnapshotStore(context: Context) :
  SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

  override fun onCreate(database: SQLiteDatabase) {
    database.execSQL(CREATE_SNAPSHOTS_TABLE_SQL)
  }

  override fun onUpgrade(database: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    if (oldVersion < 1) {
      onCreate(database)
      return
    }

    if (oldVersion < 2) {
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN parse_status TEXT NOT NULL DEFAULT 'pending'")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN parser_id TEXT")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN parser_version TEXT")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN parser_confidence REAL")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN parser_trace TEXT")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN failure_reason_code TEXT")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN parsed_amount_minor INTEGER")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN parsed_merchant_raw TEXT")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN parsed_timestamp_ms INTEGER")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN timestamp_provenance TEXT")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN amount_provenance TEXT")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN merchant_provenance TEXT")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN reference_hint TEXT")
    }

    if (oldVersion < 3) {
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN exact_dedupe_key TEXT")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN fuzzy_dedupe_key TEXT")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN exact_duplicate_count INTEGER NOT NULL DEFAULT 0")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN fuzzy_duplicate_count INTEGER NOT NULL DEFAULT 0")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN total_duplicate_count INTEGER NOT NULL DEFAULT 0")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN last_duplicate_kind TEXT")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN last_duplicate_at_ms INTEGER")
      database.execSQL("ALTER TABLE $TABLE_NAME ADD COLUMN last_duplicate_similarity REAL")
    }
  }

  fun insertSnapshot(
    snapshot: NotificationCaptureSnapshot,
    parseResult: NotificationParseResult,
    dedupeMetadata: PrimaryCaptureDedupeMetadata? = null,
  ) {
    val database = writableDatabase
    val values = ContentValues().apply {
      put("source_app_id", snapshot.sourceAppId)
      put("package_name", snapshot.packageName)
      put("notification_key", snapshot.notificationKey)
      put("title", snapshot.title)
      put("body_text", snapshot.bodyText)
      put("sub_text", snapshot.subText)
      put("raw_payload", snapshot.rawPayload)
      put("posted_at_ms", snapshot.postedAtMs)
      put("captured_at_ms", snapshot.capturedAtMs)

      when (parseResult) {
        is NotificationParseResult.Success -> {
          put("parse_status", "success")
          put("parser_id", parseResult.event.parserId)
          put("parser_version", parseResult.event.parserVersion)
          put("parser_confidence", parseResult.event.parserConfidence)
          put("parser_trace", parseResult.event.parserTrace)
          putNull("failure_reason_code")
          put("parsed_amount_minor", parseResult.event.amountMinor)
          put("parsed_merchant_raw", parseResult.event.merchantRaw)
          put("parsed_timestamp_ms", parseResult.event.occurredAtMs)
          put("timestamp_provenance", parseResult.event.timestampProvenance)
          put("amount_provenance", parseResult.event.amountProvenance)
          put("merchant_provenance", parseResult.event.merchantProvenance)
          put("reference_hint", parseResult.event.referenceHint)
          put("exact_dedupe_key", dedupeMetadata?.exactDedupeKey)
          put("fuzzy_dedupe_key", dedupeMetadata?.fuzzyDedupeKey)
          put("exact_duplicate_count", 0)
          put("fuzzy_duplicate_count", 0)
          put("total_duplicate_count", 0)
          putNull("last_duplicate_kind")
          putNull("last_duplicate_at_ms")
          putNull("last_duplicate_similarity")
        }

        is NotificationParseResult.Failure -> {
          put("parse_status", "failed")
          putNull("parser_id")
          putNull("parser_version")
          putNull("parser_confidence")
          put("parser_trace", parseResult.parserTrace)
          put("failure_reason_code", parseResult.reasonCode)
          putNull("parsed_amount_minor")
          putNull("parsed_merchant_raw")
          put("parsed_timestamp_ms", snapshot.postedAtMs)
          put("timestamp_provenance", NotificationParserRegistry.TIMESTAMP_PROVENANCE_POSTED_AT_MS)
          putNull("amount_provenance")
          putNull("merchant_provenance")
          putNull("reference_hint")
          putNull("exact_dedupe_key")
          putNull("fuzzy_dedupe_key")
          put("exact_duplicate_count", 0)
          put("fuzzy_duplicate_count", 0)
          put("total_duplicate_count", 0)
          putNull("last_duplicate_kind")
          putNull("last_duplicate_at_ms")
          putNull("last_duplicate_similarity")
        }
      }
    }

    database.insertWithOnConflict(
      TABLE_NAME,
      null,
      values,
      SQLiteDatabase.CONFLICT_IGNORE,
    )
    pruneOldSnapshots(database)
  }

  fun clearSnapshots() {
    writableDatabase.delete(TABLE_NAME, null, null)
  }

  fun findSuccessfulDedupeCandidates(
    sourceAppId: String,
    amountMinor: Long,
    minimumOccurredAtMs: Long,
    maximumOccurredAtMs: Long,
  ): List<SuccessfulCaptureDedupeCandidate> {
    val database = readableDatabase
    val cursor = database.rawQuery(
      """
        SELECT id, source_app_id, parsed_amount_minor, parsed_merchant_raw, parsed_timestamp_ms, reference_hint
        FROM $TABLE_NAME
        WHERE parse_status = 'success'
          AND source_app_id = ?
          AND parsed_amount_minor = ?
          AND parsed_timestamp_ms BETWEEN ? AND ?
        ORDER BY parsed_timestamp_ms DESC, id DESC
      """.trimIndent(),
      arrayOf(
        sourceAppId,
        amountMinor.toString(),
        minimumOccurredAtMs.toString(),
        maximumOccurredAtMs.toString(),
      ),
    )

    cursor.use { candidateCursor ->
      val candidates = mutableListOf<SuccessfulCaptureDedupeCandidate>()

      while (candidateCursor.moveToNext()) {
        val merchantRaw = candidateCursor.getNullableString("parsed_merchant_raw") ?: continue
        val occurredAtMs = candidateCursor.getNullableLong("parsed_timestamp_ms") ?: continue

        candidates.add(
          SuccessfulCaptureDedupeCandidate(
            amountMinor = candidateCursor.getLong(candidateCursor.getColumnIndexOrThrow("parsed_amount_minor")),
            merchantRaw = merchantRaw,
            occurredAtMs = occurredAtMs,
            referenceHint = candidateCursor.getNullableString("reference_hint"),
            snapshotId = candidateCursor.getLong(candidateCursor.getColumnIndexOrThrow("id")),
            sourceAppId = candidateCursor.getString(candidateCursor.getColumnIndexOrThrow("source_app_id")),
          ),
        )
      }

      return candidates
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
    val database = writableDatabase
    val values = ContentValues().apply {
      put("exact_dedupe_key", exactDedupeKey)
      put("fuzzy_dedupe_key", fuzzyDedupeKey)
      put("last_duplicate_kind", dedupeKind.wireValue)
      put("last_duplicate_at_ms", duplicateCapturedAtMs)
      put("last_duplicate_similarity", similarityScore)
    }

    database.update(
      TABLE_NAME,
      values,
      "id = ?",
      arrayOf(matchedSnapshotId.toString()),
    )

    val duplicateColumn =
      when (dedupeKind) {
        CaptureDedupeKind.EXACT -> "exact_duplicate_count"
        CaptureDedupeKind.FUZZY -> "fuzzy_duplicate_count"
      }

    database.execSQL(
      """
        UPDATE $TABLE_NAME
        SET $duplicateColumn = $duplicateColumn + 1,
            total_duplicate_count = total_duplicate_count + 1
        WHERE id = ?
      """.trimIndent(),
      arrayOf(matchedSnapshotId),
    )
  }

  fun getDiagnostics(): CaptureDiagnostics {
    val database = readableDatabase
    val countCursor = database.rawQuery("SELECT COUNT(*) FROM $TABLE_NAME", null)
    val duplicateCountsCursor = database.rawQuery(
      """
        SELECT
          COALESCE(SUM(exact_duplicate_count), 0),
          COALESCE(SUM(fuzzy_duplicate_count), 0)
        FROM $TABLE_NAME
      """.trimIndent(),
      null,
    )
    val lastCaptureCursor = database.rawQuery(
      """
        SELECT source_app_id, package_name, raw_payload, captured_at_ms
        FROM $TABLE_NAME
        ORDER BY captured_at_ms DESC, id DESC
        LIMIT 1
      """.trimIndent(),
      null,
    )
    val lastDedupeCursor = database.rawQuery(
      """
        SELECT source_app_id, parsed_merchant_raw, parsed_amount_minor, total_duplicate_count,
               last_duplicate_kind, last_duplicate_at_ms, last_duplicate_similarity
        FROM $TABLE_NAME
        WHERE last_duplicate_at_ms IS NOT NULL
        ORDER BY last_duplicate_at_ms DESC, id DESC
        LIMIT 1
      """.trimIndent(),
      null,
    )

    countCursor.use { cursor ->
      val storedSnapshotCount = if (cursor.moveToFirst()) cursor.getInt(0) else 0
      val duplicateCounts =
        duplicateCountsCursor.use { duplicateCursor ->
          if (!duplicateCursor.moveToFirst()) {
            0 to 0
          } else {
            duplicateCursor.getInt(0) to duplicateCursor.getInt(1)
          }
        }
      val lastCapture = lastCaptureCursor.use { lastCursor ->
        if (!lastCursor.moveToFirst()) {
          null
        } else {
          LastCapturedSnapshot(
            capturedAtMs = lastCursor.getLong(lastCursor.getColumnIndexOrThrow("captured_at_ms")),
            packageName = lastCursor.getString(lastCursor.getColumnIndexOrThrow("package_name")),
            preview = NotificationPayloadFormatter.buildPreview(
              lastCursor.getString(lastCursor.getColumnIndexOrThrow("raw_payload")) ?: "",
            ),
            sourceAppId = lastCursor.getString(lastCursor.getColumnIndexOrThrow("source_app_id")),
          )
        }
      }
      val lastDedupeDecision = lastDedupeCursor.use { dedupeCursor ->
        if (!dedupeCursor.moveToFirst()) {
          null
        } else {
          LastDedupeDecision(
            amountMinor = dedupeCursor.getLong(dedupeCursor.getColumnIndexOrThrow("parsed_amount_minor")),
            dedupeKind = dedupeCursor.getString(dedupeCursor.getColumnIndexOrThrow("last_duplicate_kind")),
            dedupedAtMs = dedupeCursor.getLong(dedupeCursor.getColumnIndexOrThrow("last_duplicate_at_ms")),
            duplicateCount = dedupeCursor.getInt(dedupeCursor.getColumnIndexOrThrow("total_duplicate_count")),
            merchantRaw = dedupeCursor.getString(dedupeCursor.getColumnIndexOrThrow("parsed_merchant_raw")),
            similarityScore = dedupeCursor.getNullableDouble("last_duplicate_similarity"),
            sourceAppId = dedupeCursor.getString(dedupeCursor.getColumnIndexOrThrow("source_app_id")),
          )
        }
      }

      return CaptureDiagnostics(
        exactDuplicateCount = duplicateCounts.first,
        fuzzyDuplicateCount = duplicateCounts.second,
        lastCapture = lastCapture,
        lastDedupeDecision = lastDedupeDecision,
        storedSnapshotCount = storedSnapshotCount,
      )
    }
  }

  fun getLatestStoredRecord(): StoredNotificationCaptureRecord? {
    val database = readableDatabase
    val cursor = database.rawQuery(
      """
        SELECT *
        FROM $TABLE_NAME
        ORDER BY captured_at_ms DESC, id DESC
        LIMIT 1
      """.trimIndent(),
      null,
    )

    cursor.use { latestCursor ->
      if (!latestCursor.moveToFirst()) {
        return null
      }

      return StoredNotificationCaptureRecord(
        amountProvenance = latestCursor.getNullableString("amount_provenance"),
        exactDedupeKey = latestCursor.getNullableString("exact_dedupe_key"),
        exactDuplicateCount = latestCursor.getInt(latestCursor.getColumnIndexOrThrow("exact_duplicate_count")),
        failureReasonCode = latestCursor.getNullableString("failure_reason_code"),
        fuzzyDedupeKey = latestCursor.getNullableString("fuzzy_dedupe_key"),
        fuzzyDuplicateCount = latestCursor.getInt(latestCursor.getColumnIndexOrThrow("fuzzy_duplicate_count")),
        lastDuplicateAtMs = latestCursor.getNullableLong("last_duplicate_at_ms"),
        lastDuplicateKind = latestCursor.getNullableString("last_duplicate_kind"),
        lastDuplicateSimilarity = latestCursor.getNullableDouble("last_duplicate_similarity"),
        merchantRaw = latestCursor.getNullableString("parsed_merchant_raw"),
        merchantProvenance = latestCursor.getNullableString("merchant_provenance"),
        notificationKey = latestCursor.getString(latestCursor.getColumnIndexOrThrow("notification_key")),
        packageName = latestCursor.getString(latestCursor.getColumnIndexOrThrow("package_name")),
        parseStatus = latestCursor.getString(latestCursor.getColumnIndexOrThrow("parse_status")),
        parserConfidence = latestCursor.getNullableDouble("parser_confidence"),
        parserId = latestCursor.getNullableString("parser_id"),
        parserTrace = latestCursor.getNullableString("parser_trace"),
        parserVersion = latestCursor.getNullableString("parser_version"),
        parsedAmountMinor = latestCursor.getNullableLong("parsed_amount_minor"),
        parsedTimestampMs = latestCursor.getNullableLong("parsed_timestamp_ms"),
        rawPayload = latestCursor.getString(latestCursor.getColumnIndexOrThrow("raw_payload")),
        referenceHint = latestCursor.getNullableString("reference_hint"),
        sourceAppId = latestCursor.getString(latestCursor.getColumnIndexOrThrow("source_app_id")),
        timestampProvenance = latestCursor.getNullableString("timestamp_provenance"),
        totalDuplicateCount = latestCursor.getInt(latestCursor.getColumnIndexOrThrow("total_duplicate_count")),
      )
    }
  }

  private fun pruneOldSnapshots(database: SQLiteDatabase) {
    database.execSQL(
      """
        DELETE FROM $TABLE_NAME
        WHERE id NOT IN (
          SELECT id
          FROM $TABLE_NAME
          ORDER BY captured_at_ms DESC, id DESC
          LIMIT $MAX_STORED_SNAPSHOTS
        )
      """.trimIndent(),
    )
  }

  companion object {
    private const val CREATE_SNAPSHOTS_TABLE_SQL =
      """
        CREATE TABLE IF NOT EXISTS notification_capture_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_app_id TEXT NOT NULL,
          package_name TEXT NOT NULL,
          notification_key TEXT NOT NULL,
          title TEXT,
          body_text TEXT,
          sub_text TEXT,
          raw_payload TEXT NOT NULL,
          posted_at_ms INTEGER NOT NULL,
          captured_at_ms INTEGER NOT NULL,
          parse_status TEXT NOT NULL,
          parser_id TEXT,
          parser_version TEXT,
          parser_confidence REAL,
          parser_trace TEXT,
          failure_reason_code TEXT,
          parsed_amount_minor INTEGER,
          parsed_merchant_raw TEXT,
          parsed_timestamp_ms INTEGER,
          timestamp_provenance TEXT,
          amount_provenance TEXT,
          merchant_provenance TEXT,
          reference_hint TEXT,
          exact_dedupe_key TEXT,
          fuzzy_dedupe_key TEXT,
          exact_duplicate_count INTEGER NOT NULL DEFAULT 0,
          fuzzy_duplicate_count INTEGER NOT NULL DEFAULT 0,
          total_duplicate_count INTEGER NOT NULL DEFAULT 0,
          last_duplicate_kind TEXT,
          last_duplicate_at_ms INTEGER,
          last_duplicate_similarity REAL,
          UNIQUE(notification_key, posted_at_ms)
        )
      """
    private const val DATABASE_NAME = "notification_capture.db"
    private const val DATABASE_VERSION = 3
    private const val MAX_STORED_SNAPSHOTS = 200
    private const val TABLE_NAME = "notification_capture_snapshots"
  }
}

private fun android.database.Cursor.getNullableDouble(columnName: String): Double? {
  val columnIndex = getColumnIndexOrThrow(columnName)
  return if (isNull(columnIndex)) null else getDouble(columnIndex)
}

private fun android.database.Cursor.getNullableLong(columnName: String): Long? {
  val columnIndex = getColumnIndexOrThrow(columnName)
  return if (isNull(columnIndex)) null else getLong(columnIndex)
}

private fun android.database.Cursor.getNullableString(columnName: String): String? {
  val columnIndex = getColumnIndexOrThrow(columnName)
  return if (isNull(columnIndex)) null else getString(columnIndex)
}
