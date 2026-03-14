package expo.modules.notificationcapture

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
  tableName = "notification_snapshots",
  indices = [
    Index(value = ["package_name"]),
    Index(value = ["posted_at_millis"]),
  ],
)
data class NotificationSnapshotEntity(
  @PrimaryKey(autoGenerate = true)
  val id: Long = 0,
  @ColumnInfo(name = "package_name")
  val packageName: String,
  @ColumnInfo(name = "app_label")
  val appLabel: String,
  @ColumnInfo(name = "notification_key")
  val notificationKey: String,
  @ColumnInfo(name = "posted_at_millis")
  val postedAtMillis: Long,
  val title: String?,
  val text: String?,
  @ColumnInfo(name = "sub_text")
  val subText: String?,
  @ColumnInfo(name = "big_text")
  val bigText: String?,
  val category: String?,
  @ColumnInfo(name = "is_group_summary")
  val isGroupSummary: Boolean,
)
