package com.upispendtracker.client.capture

import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Entity(
  tableName = "capture_events",
  indices = [
    Index(value = ["notification_key", "posted_at_ms"], unique = true),
    Index(value = ["parse_status", "source_app_id", "parsed_amount_minor", "parsed_timestamp_ms"]),
    Index(value = ["captured_at_ms"]),
    Index(value = ["capture_state"]),
  ],
)
data class CaptureEventEntity(
  @PrimaryKey(autoGenerate = true) val id: Long = 0,
  @ColumnInfo(name = "source_app_id") val sourceAppId: String,
  @ColumnInfo(name = "package_name") val packageName: String,
  @ColumnInfo(name = "notification_key") val notificationKey: String,
  @ColumnInfo(name = "title") val title: String? = null,
  @ColumnInfo(name = "body_text") val bodyText: String? = null,
  @ColumnInfo(name = "sub_text") val subText: String? = null,
  @ColumnInfo(name = "raw_payload") val rawPayload: String? = null,
  @ColumnInfo(name = "raw_payload_pruned_at_ms") val rawPayloadPrunedAtMs: Long? = null,
  @ColumnInfo(name = "posted_at_ms") val postedAtMs: Long,
  @ColumnInfo(name = "captured_at_ms") val capturedAtMs: Long,
  @ColumnInfo(name = "parse_status") val parseStatus: String,
  @ColumnInfo(name = "parser_id") val parserId: String? = null,
  @ColumnInfo(name = "parser_version") val parserVersion: String? = null,
  @ColumnInfo(name = "parser_confidence") val parserConfidence: Double? = null,
  @ColumnInfo(name = "parser_trace") val parserTrace: String? = null,
  @ColumnInfo(name = "failure_reason_code") val failureReasonCode: String? = null,
  @ColumnInfo(name = "parsed_amount_minor") val parsedAmountMinor: Long? = null,
  @ColumnInfo(name = "parsed_merchant_raw") val parsedMerchantRaw: String? = null,
  @ColumnInfo(name = "parsed_timestamp_ms") val parsedTimestampMs: Long? = null,
  @ColumnInfo(name = "timestamp_provenance") val timestampProvenance: String? = null,
  @ColumnInfo(name = "amount_provenance") val amountProvenance: String? = null,
  @ColumnInfo(name = "merchant_provenance") val merchantProvenance: String? = null,
  @ColumnInfo(name = "reference_hint") val referenceHint: String? = null,
  @ColumnInfo(name = "exact_dedupe_key") val exactDedupeKey: String? = null,
  @ColumnInfo(name = "fuzzy_dedupe_key") val fuzzyDedupeKey: String? = null,
  @ColumnInfo(name = "exact_duplicate_count") val exactDuplicateCount: Int = 0,
  @ColumnInfo(name = "fuzzy_duplicate_count") val fuzzyDuplicateCount: Int = 0,
  @ColumnInfo(name = "total_duplicate_count") val totalDuplicateCount: Int = 0,
  @ColumnInfo(name = "last_duplicate_kind") val lastDuplicateKind: String? = null,
  @ColumnInfo(name = "last_duplicate_at_ms") val lastDuplicateAtMs: Long? = null,
  @ColumnInfo(name = "last_duplicate_similarity") val lastDuplicateSimilarity: Double? = null,
  @ColumnInfo(name = "capture_state") val captureState: String,
  @ColumnInfo(name = "linked_transaction_id") val linkedTransactionId: String? = null,
  @ColumnInfo(name = "state_updated_at_ms") val stateUpdatedAtMs: Long,
)

@Entity(
  tableName = "capture_replies",
  foreignKeys = [
    ForeignKey(
      entity = CaptureEventEntity::class,
      parentColumns = ["id"],
      childColumns = ["capture_event_id"],
      onDelete = ForeignKey.CASCADE,
    ),
  ],
  indices = [Index(value = ["capture_event_id"]), Index(value = ["created_at_ms"])],
)
data class CaptureReplyEntity(
  @PrimaryKey(autoGenerate = true) val id: Long = 0,
  @ColumnInfo(name = "capture_event_id") val captureEventId: Long,
  @ColumnInfo(name = "action_type") val actionType: String,
  @ColumnInfo(name = "reply_text") val replyText: String? = null,
  @ColumnInfo(name = "item_label") val itemLabel: String? = null,
  @ColumnInfo(name = "category_id") val categoryId: String? = null,
  @ColumnInfo(name = "created_at_ms") val createdAtMs: Long,
)

@Entity(
  tableName = "capture_sync_markers",
  foreignKeys = [
    ForeignKey(
      entity = CaptureEventEntity::class,
      parentColumns = ["id"],
      childColumns = ["capture_event_id"],
      onDelete = ForeignKey.CASCADE,
    ),
  ],
  indices = [Index(value = ["sync_state", "updated_at_ms"])],
)
data class CaptureSyncMarkerEntity(
  @PrimaryKey
  @ColumnInfo(name = "capture_event_id")
  val captureEventId: Long,
  @ColumnInfo(name = "sync_state") val syncState: String,
  @ColumnInfo(name = "sync_cursor") val syncCursor: String? = null,
  @ColumnInfo(name = "last_error_code") val lastErrorCode: String? = null,
  @ColumnInfo(name = "updated_at_ms") val updatedAtMs: Long,
  @ColumnInfo(name = "last_attempt_at_ms") val lastAttemptAtMs: Long? = null,
  @ColumnInfo(name = "last_synced_at_ms") val lastSyncedAtMs: Long? = null,
)

data class SuccessfulCaptureDedupeCandidateRow(
  @ColumnInfo(name = "parsed_amount_minor") val amountMinor: Long,
  @ColumnInfo(name = "parsed_merchant_raw") val merchantRaw: String,
  @ColumnInfo(name = "parsed_timestamp_ms") val occurredAtMs: Long,
  @ColumnInfo(name = "reference_hint") val referenceHint: String?,
  @ColumnInfo(name = "id") val snapshotId: Long,
  @ColumnInfo(name = "source_app_id") val sourceAppId: String,
)

data class PendingCaptureEventRow(
  @ColumnInfo(name = "id") val id: Long,
  @ColumnInfo(name = "capture_state") val captureState: String,
  @ColumnInfo(name = "captured_at_ms") val capturedAtMs: Long,
  @ColumnInfo(name = "parsed_merchant_raw") val merchantRaw: String,
  @ColumnInfo(name = "notification_key") val notificationKey: String,
  @ColumnInfo(name = "parsed_amount_minor") val parsedAmountMinor: Long,
  @ColumnInfo(name = "parsed_timestamp_ms") val parsedTimestampMs: Long,
  @ColumnInfo(name = "source_app_id") val sourceAppId: String,
)

@Dao
interface CaptureEventDao {
  @Insert(onConflict = OnConflictStrategy.IGNORE)
  fun insert(entity: CaptureEventEntity): Long

  @Query("DELETE FROM capture_events")
  fun clear()

  @Query(
    """
      SELECT id, source_app_id, parsed_amount_minor, parsed_merchant_raw, parsed_timestamp_ms, reference_hint
      FROM capture_events
      WHERE parse_status = 'success'
        AND source_app_id = :sourceAppId
        AND parsed_amount_minor = :amountMinor
        AND parsed_timestamp_ms BETWEEN :minimumOccurredAtMs AND :maximumOccurredAtMs
      ORDER BY parsed_timestamp_ms DESC, id DESC
    """,
  )
  fun findSuccessfulDedupeCandidates(
    sourceAppId: String,
    amountMinor: Long,
    minimumOccurredAtMs: Long,
    maximumOccurredAtMs: Long,
  ): List<SuccessfulCaptureDedupeCandidateRow>

  @Query(
    """
      UPDATE capture_events
      SET exact_dedupe_key = :exactDedupeKey,
          fuzzy_dedupe_key = :fuzzyDedupeKey,
          last_duplicate_kind = :lastDuplicateKind,
          last_duplicate_at_ms = :lastDuplicateAtMs,
          last_duplicate_similarity = :lastDuplicateSimilarity
      WHERE id = :captureEventId
    """,
  )
  fun updateDuplicateMetadata(
    captureEventId: Long,
    exactDedupeKey: String,
    fuzzyDedupeKey: String,
    lastDuplicateKind: String,
    lastDuplicateAtMs: Long,
    lastDuplicateSimilarity: Double?,
  )

  @Query(
    """
      UPDATE capture_events
      SET exact_duplicate_count = exact_duplicate_count + 1,
          total_duplicate_count = total_duplicate_count + 1
      WHERE id = :captureEventId
    """,
  )
  fun incrementExactDuplicateCount(captureEventId: Long)

  @Query(
    """
      UPDATE capture_events
      SET fuzzy_duplicate_count = fuzzy_duplicate_count + 1,
          total_duplicate_count = total_duplicate_count + 1
      WHERE id = :captureEventId
    """,
  )
  fun incrementFuzzyDuplicateCount(captureEventId: Long)

  @Query("SELECT COUNT(*) FROM capture_events")
  fun countCaptureEvents(): Int

  @Query("SELECT COALESCE(SUM(exact_duplicate_count), 0) FROM capture_events")
  fun getExactDuplicateCount(): Int

  @Query("SELECT COALESCE(SUM(fuzzy_duplicate_count), 0) FROM capture_events")
  fun getFuzzyDuplicateCount(): Int

  @Query("SELECT * FROM capture_events ORDER BY captured_at_ms DESC, id DESC LIMIT 1")
  fun getLatestEvent(): CaptureEventEntity?

  @Query(
    """
      SELECT *
      FROM capture_events
      WHERE last_duplicate_at_ms IS NOT NULL
      ORDER BY last_duplicate_at_ms DESC, id DESC
      LIMIT 1
    """,
  )
  fun getLastDuplicateEvent(): CaptureEventEntity?

  @Query(
    """
      SELECT id
      FROM capture_events
      ORDER BY captured_at_ms DESC, id DESC
      LIMIT :limit
    """,
  )
  fun selectLatestCaptureIds(limit: Int): List<Long>

  @Query(
    """
      UPDATE capture_events
      SET raw_payload = NULL,
          title = NULL,
          body_text = NULL,
          sub_text = NULL,
          raw_payload_pruned_at_ms = :prunedAtMs
      WHERE raw_payload IS NOT NULL
        AND id NOT IN (:retainIds)
    """,
  )
  fun pruneRawPayloadsOutside(retainIds: List<Long>, prunedAtMs: Long): Int

  @Query(
    """
      UPDATE capture_events
      SET raw_payload = NULL,
          title = NULL,
          body_text = NULL,
          sub_text = NULL,
          raw_payload_pruned_at_ms = :prunedAtMs
      WHERE raw_payload IS NOT NULL
    """,
  )
  fun pruneAllRawPayloads(prunedAtMs: Long): Int

  @Query(
    """
      UPDATE capture_events
      SET capture_state = :captureState,
          linked_transaction_id = :linkedTransactionId,
          state_updated_at_ms = :stateUpdatedAtMs
      WHERE id = :captureEventId
    """,
  )
  fun updateCaptureState(
    captureEventId: Long,
    captureState: String,
    linkedTransactionId: String?,
    stateUpdatedAtMs: Long,
  )

  @Query(
    """
      SELECT e.id, e.capture_state, e.captured_at_ms, e.parsed_merchant_raw, e.notification_key,
             e.parsed_amount_minor, e.parsed_timestamp_ms, e.source_app_id
      FROM capture_events e
      INNER JOIN capture_sync_markers s ON s.capture_event_id = e.id
      WHERE e.parse_status = 'success'
        AND e.parsed_merchant_raw IS NOT NULL
        AND e.parsed_amount_minor IS NOT NULL
        AND e.parsed_timestamp_ms IS NOT NULL
        AND s.sync_state = 'pending_import'
      ORDER BY e.captured_at_ms ASC, e.id ASC
      LIMIT :limit
    """,
  )
  fun fetchPendingCaptureRows(limit: Int): List<PendingCaptureEventRow>
}

@Dao
interface CaptureReplyDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  fun insert(entity: CaptureReplyEntity): Long

  @Query("SELECT * FROM capture_replies WHERE capture_event_id = :captureEventId ORDER BY created_at_ms ASC, id ASC")
  fun listForCapture(captureEventId: Long): List<CaptureReplyEntity>

  @Query("DELETE FROM capture_replies")
  fun clear()
}

@Dao
interface CaptureSyncMarkerDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  fun upsert(entity: CaptureSyncMarkerEntity)

  @Query("SELECT * FROM capture_sync_markers WHERE capture_event_id = :captureEventId LIMIT 1")
  fun getByCaptureEventId(captureEventId: Long): CaptureSyncMarkerEntity?

  @Query("DELETE FROM capture_sync_markers")
  fun clear()
}

@Database(
  entities = [CaptureEventEntity::class, CaptureReplyEntity::class, CaptureSyncMarkerEntity::class],
  version = 4,
  exportSchema = false,
)
abstract class NotificationCaptureDatabase : RoomDatabase() {
  abstract fun captureEventDao(): CaptureEventDao

  abstract fun captureReplyDao(): CaptureReplyDao

  abstract fun captureSyncMarkerDao(): CaptureSyncMarkerDao

  companion object {
    const val DATABASE_NAME = "notification_capture.db"

    val ALL_MIGRATIONS: Array<Migration> =
      arrayOf(
        buildLegacySnapshotMigration(startVersion = 1),
        buildLegacySnapshotMigration(startVersion = 2),
        buildLegacySnapshotMigration(startVersion = 3),
      )
  }
}

private fun buildLegacySnapshotMigration(startVersion: Int): Migration {
  return object : Migration(startVersion, 4) {
    override fun migrate(database: SupportSQLiteDatabase) {
      createCaptureEventsTable(database)
      createCaptureRepliesTable(database)
      createCaptureSyncMarkersTable(database)
      migrateLegacySnapshots(database)
      database.execSQL("DROP TABLE IF EXISTS notification_capture_snapshots")
    }
  }
}

private fun createCaptureEventsTable(database: SupportSQLiteDatabase) {
  database.execSQL(
    """
      CREATE TABLE IF NOT EXISTS capture_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        source_app_id TEXT NOT NULL,
        package_name TEXT NOT NULL,
        notification_key TEXT NOT NULL,
        title TEXT,
        body_text TEXT,
        sub_text TEXT,
        raw_payload TEXT,
        raw_payload_pruned_at_ms INTEGER,
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
        capture_state TEXT NOT NULL DEFAULT 'captured',
        linked_transaction_id TEXT,
        state_updated_at_ms INTEGER NOT NULL DEFAULT 0
      )
    """.trimIndent(),
  )
  database.execSQL(
    """
      CREATE UNIQUE INDEX IF NOT EXISTS index_capture_events_notification_key_posted_at_ms
      ON capture_events(notification_key, posted_at_ms)
    """.trimIndent(),
  )
  database.execSQL(
    """
      CREATE INDEX IF NOT EXISTS index_capture_events_parse_status_source_app_id_parsed_amount_minor_parsed_timestamp_ms
      ON capture_events(parse_status, source_app_id, parsed_amount_minor, parsed_timestamp_ms)
    """.trimIndent(),
  )
  database.execSQL(
    """
      CREATE INDEX IF NOT EXISTS index_capture_events_captured_at_ms
      ON capture_events(captured_at_ms)
    """.trimIndent(),
  )
  database.execSQL(
    """
      CREATE INDEX IF NOT EXISTS index_capture_events_capture_state
      ON capture_events(capture_state)
    """.trimIndent(),
  )
}

private fun createCaptureRepliesTable(database: SupportSQLiteDatabase) {
  database.execSQL(
    """
      CREATE TABLE IF NOT EXISTS capture_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        capture_event_id INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        reply_text TEXT,
        item_label TEXT,
        category_id TEXT,
        created_at_ms INTEGER NOT NULL,
        FOREIGN KEY(capture_event_id) REFERENCES capture_events(id) ON DELETE CASCADE
      )
    """.trimIndent(),
  )
  database.execSQL(
    """
      CREATE INDEX IF NOT EXISTS index_capture_replies_capture_event_id
      ON capture_replies(capture_event_id)
    """.trimIndent(),
  )
  database.execSQL(
    """
      CREATE INDEX IF NOT EXISTS index_capture_replies_created_at_ms
      ON capture_replies(created_at_ms)
    """.trimIndent(),
  )
}

private fun createCaptureSyncMarkersTable(database: SupportSQLiteDatabase) {
  database.execSQL(
    """
      CREATE TABLE IF NOT EXISTS capture_sync_markers (
        capture_event_id INTEGER NOT NULL PRIMARY KEY,
        sync_state TEXT NOT NULL,
        sync_cursor TEXT,
        last_error_code TEXT,
        updated_at_ms INTEGER NOT NULL,
        last_attempt_at_ms INTEGER,
        last_synced_at_ms INTEGER,
        FOREIGN KEY(capture_event_id) REFERENCES capture_events(id) ON DELETE CASCADE
      )
    """.trimIndent(),
  )
  database.execSQL(
    """
      CREATE INDEX IF NOT EXISTS index_capture_sync_markers_sync_state_updated_at_ms
      ON capture_sync_markers(sync_state, updated_at_ms)
    """.trimIndent(),
  )
}

private fun migrateLegacySnapshots(database: SupportSQLiteDatabase) {
  if (!database.hasTable("notification_capture_snapshots")) {
    return
  }

  val legacyColumns = database.getColumnNames("notification_capture_snapshots")
  val copySql =
    """
      INSERT INTO capture_events (
        id, source_app_id, package_name, notification_key, title, body_text, sub_text, raw_payload,
        raw_payload_pruned_at_ms, posted_at_ms, captured_at_ms, parse_status, parser_id, parser_version,
        parser_confidence, parser_trace, failure_reason_code, parsed_amount_minor, parsed_merchant_raw,
        parsed_timestamp_ms, timestamp_provenance, amount_provenance, merchant_provenance, reference_hint,
        exact_dedupe_key, fuzzy_dedupe_key, exact_duplicate_count, fuzzy_duplicate_count, total_duplicate_count,
        last_duplicate_kind, last_duplicate_at_ms, last_duplicate_similarity, capture_state,
        linked_transaction_id, state_updated_at_ms
      )
      SELECT
        ${legacyColumns.sql("id")},
        ${legacyColumns.sql("source_app_id")},
        ${legacyColumns.sql("package_name")},
        ${legacyColumns.sql("notification_key")},
        ${legacyColumns.sql("title")},
        ${legacyColumns.sql("body_text")},
        ${legacyColumns.sql("sub_text")},
        ${legacyColumns.sql("raw_payload")},
        NULL,
        ${legacyColumns.sql("posted_at_ms")},
        ${legacyColumns.sql("captured_at_ms")},
        ${legacyColumns.sql("parse_status", "'pending'")},
        ${legacyColumns.sql("parser_id")},
        ${legacyColumns.sql("parser_version")},
        ${legacyColumns.sql("parser_confidence")},
        ${legacyColumns.sql("parser_trace")},
        ${legacyColumns.sql("failure_reason_code")},
        ${legacyColumns.sql("parsed_amount_minor")},
        ${legacyColumns.sql("parsed_merchant_raw")},
        ${legacyColumns.sql("parsed_timestamp_ms", legacyColumns.sql("posted_at_ms"))},
        ${legacyColumns.sql("timestamp_provenance")},
        ${legacyColumns.sql("amount_provenance")},
        ${legacyColumns.sql("merchant_provenance")},
        ${legacyColumns.sql("reference_hint")},
        ${legacyColumns.sql("exact_dedupe_key")},
        ${legacyColumns.sql("fuzzy_dedupe_key")},
        ${legacyColumns.sql("exact_duplicate_count", "0")},
        ${legacyColumns.sql("fuzzy_duplicate_count", "0")},
        ${legacyColumns.sql("total_duplicate_count", "0")},
        ${legacyColumns.sql("last_duplicate_kind")},
        ${legacyColumns.sql("last_duplicate_at_ms")},
        ${legacyColumns.sql("last_duplicate_similarity")},
        'captured',
        NULL,
        ${legacyColumns.sql("captured_at_ms", legacyColumns.sql("posted_at_ms", "0"))}
      FROM notification_capture_snapshots
    """.trimIndent()
  database.execSQL(copySql)
  database.execSQL(
    """
      INSERT OR REPLACE INTO capture_sync_markers (
        capture_event_id,
        sync_state,
        sync_cursor,
        last_error_code,
        updated_at_ms,
        last_attempt_at_ms,
        last_synced_at_ms
      )
      SELECT
        id,
        'pending_import',
        NULL,
        NULL,
        captured_at_ms,
        NULL,
        NULL
      FROM capture_events
      WHERE parse_status = 'success'
    """.trimIndent(),
  )
}

private fun SupportSQLiteDatabase.hasTable(tableName: String): Boolean {
  query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    arrayOf(tableName),
  ).use { cursor ->
    return cursor.moveToFirst()
  }
}

private fun SupportSQLiteDatabase.getColumnNames(tableName: String): Set<String> {
  query("PRAGMA table_info($tableName)").use { cursor ->
    val columnNames = mutableSetOf<String>()

    while (cursor.moveToNext()) {
      columnNames.add(cursor.getString(cursor.getColumnIndexOrThrow("name")))
    }

    return columnNames
  }
}

private fun Set<String>.sql(columnName: String, defaultExpression: String = "NULL"): String {
  return if (contains(columnName)) {
    columnName
  } else {
    defaultExpression
  }
}
