package expo.modules.notificationcapture

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface NotificationSnapshotDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  fun insert(snapshot: NotificationSnapshotEntity): Long

  @Query(
    "SELECT * FROM notification_snapshots ORDER BY posted_at_millis DESC, id DESC LIMIT 1",
  )
  fun getLatest(): NotificationSnapshotEntity?

  @Query(
    "DELETE FROM notification_snapshots WHERE id NOT IN (SELECT id FROM notification_snapshots ORDER BY posted_at_millis DESC, id DESC LIMIT :limit)",
  )
  fun pruneToLimit(limit: Int)

  @Query("DELETE FROM notification_snapshots")
  fun clearAll()
}
