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

class CaptureSnapshotStore(context: Context) :
  SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

  override fun onCreate(database: SQLiteDatabase) {
    database.execSQL(CREATE_SNAPSHOTS_TABLE_SQL)
  }

  override fun onUpgrade(database: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    if (oldVersion < 1) {
      onCreate(database)
    }
  }

  fun insertSnapshot(snapshot: NotificationCaptureSnapshot) {
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
          UNIQUE(notification_key, posted_at_ms)
        )
      """
    private const val DATABASE_NAME = "notification_capture.db"
    private const val DATABASE_VERSION = 1
    private const val MAX_STORED_SNAPSHOTS = 200
    private const val TABLE_NAME = "notification_capture_snapshots"
  }
}
