package expo.modules.notificationcapture

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CaptureNotificationListenerService : NotificationListenerService() {
  private lateinit var notificationCaptureProcessor: NotificationCaptureProcessor
  private val executorService: ExecutorService = Executors.newSingleThreadExecutor()

  override fun onCreate() {
    super.onCreate()
    notificationCaptureProcessor = NotificationCaptureProcessor(applicationContext)
  }

  override fun onDestroy() {
    executorService.shutdown()
    super.onDestroy()
  }

  override fun onNotificationPosted(statusBarNotification: StatusBarNotification?) {
    val postedNotification = statusBarNotification ?: return

    executorService.execute {
      notificationCaptureProcessor.process(postedNotification)
    }
  }
}
