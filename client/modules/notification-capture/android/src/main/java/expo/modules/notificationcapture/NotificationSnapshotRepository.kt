package expo.modules.notificationcapture

import android.content.Context

class NotificationSnapshotRepository(context: Context) {
  private val notificationSnapshotDao = NotificationSnapshotDatabase
    .getInstance(context.applicationContext)
    .notificationSnapshotDao()

  fun insertSnapshot(snapshot: NotificationSnapshotEntity) {
    notificationSnapshotDao.insert(snapshot)
    notificationSnapshotDao.pruneToLimit(MAX_SNAPSHOTS)
  }

  fun getLatestSnapshot(): NotificationSnapshotEntity? = notificationSnapshotDao.getLatest()

  fun clearAll() {
    notificationSnapshotDao.clearAll()
  }

  companion object {
    private const val MAX_SNAPSHOTS = 50
  }
}
