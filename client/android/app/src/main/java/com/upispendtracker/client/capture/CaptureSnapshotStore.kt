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
  val lastCapture: LastCapturedSnapshot?,
  val storedSnapshotCount: Int,
)

data class StoredNotificationCaptureRecord(
  val amountProvenance: String?,
  val failureReasonCode: String?,
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
  }

  fun insertSnapshot(snapshot: NotificationCaptureSnapshot, parseResult: NotificationParseResult) {
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

  fun getDiagnostics(): CaptureDiagnostics {
    val database = readableDatabase
    val countCursor = database.rawQuery("SELECT COUNT(*) FROM $TABLE_NAME", null)
    val lastCaptureCursor = database.rawQuery(
      """
        SELECT source_app_id, package_name, raw_payload, captured_at_ms
        FROM $TABLE_NAME
        ORDER BY captured_at_ms DESC, id DESC
        LIMIT 1
      """.trimIndent(),
      null,
    )

    countCursor.use { cursor ->
      val storedSnapshotCount = if (cursor.moveToFirst()) cursor.getInt(0) else 0
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

      return CaptureDiagnostics(
        lastCapture = lastCapture,
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
        failureReasonCode = latestCursor.getNullableString("failure_reason_code"),
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
          UNIQUE(notification_key, posted_at_ms)
        )
      """
    private const val DATABASE_NAME = "notification_capture.db"
    private const val DATABASE_VERSION = 2
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
