package expo.modules.notificationcapture

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
  entities = [NotificationSnapshotEntity::class],
  version = 1,
  exportSchema = false,
)
abstract class NotificationSnapshotDatabase : RoomDatabase() {
  abstract fun notificationSnapshotDao(): NotificationSnapshotDao

  companion object {
    @Volatile
    private var instance: NotificationSnapshotDatabase? = null

    fun getInstance(context: Context): NotificationSnapshotDatabase =
      instance ?: synchronized(this) {
        instance ?: Room.databaseBuilder(
          context.applicationContext,
          NotificationSnapshotDatabase::class.java,
          "notification_capture.db",
        ).build().also { database ->
          instance = database
        }
      }
  }
}
