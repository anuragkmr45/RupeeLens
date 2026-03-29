package com.upispendtracker.client.capture

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.RemoteInput
import com.upispendtracker.client.MainActivity
import com.upispendtracker.client.R
import java.text.NumberFormat
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

data class ActionableCapturePrompt(
  val amountMinor: Long,
  val captureEventId: Long,
  val merchantLabel: String,
  val sourceAppId: String,
)

data class CapturePromptContent(
  val privacyModeEnabled: Boolean,
  val publicText: String,
  val publicTitle: String,
  val text: String,
  val title: String,
)

interface CaptureActionNotifier {
  fun cancelCapturePrompt(captureEventId: Long)

  fun postCapturePrompt(prompt: ActionableCapturePrompt)
}

object CaptureActionNotificationFormatter {
  fun buildContent(
    prompt: ActionableCapturePrompt,
    privacyModeEnabled: Boolean,
  ): CapturePromptContent {
    val sourceAppLabel = SourceAppRegistry.labelForSourceAppId(prompt.sourceAppId) ?: prompt.sourceAppId
    val amountLabel = formatAmountMinor(prompt.amountMinor)
    val merchantLabel = prompt.merchantLabel.trim().ifBlank { "this payment" }

    return if (privacyModeEnabled) {
      CapturePromptContent(
        privacyModeEnabled = true,
        publicText = "Classify, split, or skip the latest captured payment.",
        publicTitle = "New payment ready to review",
        text = "Classify, split, or skip the latest captured payment.",
        title = "New payment ready to review",
      )
    } else {
      CapturePromptContent(
        privacyModeEnabled = false,
        publicText = "$amountLabel from $sourceAppLabel is ready to classify.",
        publicTitle = "Review $amountLabel payment",
        text = "$amountLabel from $merchantLabel is ready to classify, split, or skip.",
        title = "Review $amountLabel payment",
      )
    }
  }

  fun buildRouteUri(captureEventId: Long, route: String): Uri {
    return Uri.parse(buildRoutePath(captureEventId, route))
  }

  fun buildRoutePath(captureEventId: Long, route: String): String {
    return "upispendtracker://capture-action?route=$route&captureEventId=$captureEventId"
  }

  private fun formatAmountMinor(amountMinor: Long): String {
    return NumberFormat.getCurrencyInstance(Locale("en", "IN")).format(amountMinor / 100.0)
  }
}

class CaptureActionNotificationManager(
  private val context: Context,
  private val settingsStore: CaptureSettingsStore,
) : CaptureActionNotifier {
  private val notificationManager = NotificationManagerCompat.from(context)

  override fun postCapturePrompt(prompt: ActionableCapturePrompt) {
    ensureChannel()

    val content = CaptureActionNotificationFormatter.buildContent(
      prompt = prompt,
      privacyModeEnabled = settingsStore.getPrivacyModeEnabled(),
    )
    val channelId = CHANNEL_ID
    val directReplyAction =
      NotificationCompat.Action.Builder(
        0,
        context.getString(R.string.capture_action_direct_reply),
        CaptureActionReceiver.buildReceiverPendingIntent(
          context = context,
          captureEventId = prompt.captureEventId,
          action = CaptureActionReceiver.ACTION_DIRECT_REPLY,
          mutable = true,
        ),
      )
        .addRemoteInput(
          RemoteInput.Builder(CaptureActionReceiver.KEY_DIRECT_REPLY_TEXT)
            .setLabel(context.getString(R.string.capture_action_reply_hint))
            .build(),
        )
        .build()

    val notification =
      NotificationCompat.Builder(context, channelId)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle(content.title)
        .setContentText(content.text)
        .setStyle(NotificationCompat.BigTextStyle().bigText(content.text))
        .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
        .setAutoCancel(true)
        .setOnlyAlertOnce(true)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setVisibility(
          if (content.privacyModeEnabled) {
            NotificationCompat.VISIBILITY_PRIVATE
          } else {
            NotificationCompat.VISIBILITY_PUBLIC
          },
        )
        .setPublicVersion(
          NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(content.publicTitle)
            .setContentText(content.publicText)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build(),
        )
        .setContentIntent(
          CaptureActionReceiver.buildReceiverPendingIntent(
            context = context,
            captureEventId = prompt.captureEventId,
            action = CaptureActionReceiver.ACTION_OPEN_CLASSIFY,
          ),
        )
        .addAction(directReplyAction)
        .addAction(
          0,
          context.getString(R.string.capture_action_classify),
          CaptureActionReceiver.buildReceiverPendingIntent(
            context = context,
            captureEventId = prompt.captureEventId,
            action = CaptureActionReceiver.ACTION_OPEN_CLASSIFY,
          ),
        )
        .addAction(
          0,
          context.getString(R.string.capture_action_split),
          CaptureActionReceiver.buildReceiverPendingIntent(
            context = context,
            captureEventId = prompt.captureEventId,
            action = CaptureActionReceiver.ACTION_OPEN_SPLIT,
          ),
        )
        .addAction(
          0,
          context.getString(R.string.capture_action_skip),
          CaptureActionReceiver.buildReceiverPendingIntent(
            context = context,
            captureEventId = prompt.captureEventId,
            action = CaptureActionReceiver.ACTION_SKIP,
          ),
        )
        .build()

    notificationManager.notify(notificationIdFor(prompt.captureEventId), notification)
  }

  override fun cancelCapturePrompt(captureEventId: Long) {
    notificationManager.cancel(notificationIdFor(captureEventId))
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val systemNotificationManager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    if (systemNotificationManager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }

    val channel =
      NotificationChannel(
        CHANNEL_ID,
        context.getString(R.string.capture_action_channel_name),
        NotificationManager.IMPORTANCE_DEFAULT,
      ).apply {
        description = context.getString(R.string.capture_action_channel_description)
      }

    systemNotificationManager.createNotificationChannel(channel)
  }

  companion object {
    private const val CHANNEL_ID = "capture_review_actions"

    fun notificationIdFor(captureEventId: Long): Int = captureEventId.hashCode()
  }
}

class CaptureActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val pendingResult = goAsync()

    actionExecutor.execute {
      try {
        handleAction(context.applicationContext, intent)
      } finally {
        pendingResult.finish()
      }
    }
  }

  private fun handleAction(context: Context, intent: Intent) {
    val captureEventId = intent.getLongExtra(EXTRA_CAPTURE_EVENT_ID, -1L)

    if (captureEventId <= 0L) {
      return
    }

    val action = intent.action ?: return
    val createdAtMs = System.currentTimeMillis()
    val repository = CaptureRepository(context)
    val notificationManager =
      CaptureActionNotificationManager(context, CaptureSettingsStore(context))
    var shouldCancelPrompt = true

    try {
      when (action) {
        ACTION_DIRECT_REPLY -> {
          val replyText =
            RemoteInput.getResultsFromIntent(intent)
              ?.getCharSequence(KEY_DIRECT_REPLY_TEXT)
              ?.toString()
              ?.trim()
              .orEmpty()

          if (replyText.isBlank()) {
            shouldCancelPrompt = false
            return
          }

          repository.insertCaptureReply(
            CaptureReplyDraft(
              captureEventId = captureEventId,
              actionType = CaptureReplyActionType.DIRECT_REPLY,
              createdAtMs = createdAtMs,
              itemLabel = replyText,
              replyText = replyText,
            ),
          )
          repository.updateCaptureState(
            captureEventId = captureEventId,
            nextState = CaptureEventState.REPLIED,
            updatedAtMs = createdAtMs,
          )
          NotificationCaptureEventEmitter.emitCaptureChanged(captureEventId)
        }

        ACTION_OPEN_CLASSIFY -> {
          repository.insertCaptureReply(
            CaptureReplyDraft(
              captureEventId = captureEventId,
              actionType = CaptureReplyActionType.OPEN_APP,
              createdAtMs = createdAtMs,
            ),
          )
          repository.updateCaptureState(
            captureEventId = captureEventId,
            nextState = CaptureEventState.REPLIED,
            updatedAtMs = createdAtMs,
          )
          NotificationCaptureEventEmitter.emitCaptureChanged(captureEventId)
          launchApp(context, captureEventId, "classify")
        }

        ACTION_OPEN_SPLIT -> {
          repository.insertCaptureReply(
            CaptureReplyDraft(
              captureEventId = captureEventId,
              actionType = CaptureReplyActionType.SPLIT,
              createdAtMs = createdAtMs,
            ),
          )
          repository.updateCaptureState(
            captureEventId = captureEventId,
            nextState = CaptureEventState.REPLIED,
            updatedAtMs = createdAtMs,
          )
          NotificationCaptureEventEmitter.emitCaptureChanged(captureEventId)
          launchApp(context, captureEventId, "split")
        }

        ACTION_SKIP -> {
          repository.insertCaptureReply(
            CaptureReplyDraft(
              captureEventId = captureEventId,
              actionType = CaptureReplyActionType.SKIP,
              createdAtMs = createdAtMs,
            ),
          )
          repository.updateCaptureState(
            captureEventId = captureEventId,
            nextState = CaptureEventState.SKIPPED,
            updatedAtMs = createdAtMs,
          )
          NotificationCaptureEventEmitter.emitCaptureChanged(captureEventId)
        }
      }
    } finally {
      repository.close()
      if (shouldCancelPrompt) {
        notificationManager.cancelCapturePrompt(captureEventId)
      }
    }
  }

  private fun launchApp(context: Context, captureEventId: Long, route: String) {
    val launchIntent =
      Intent(context, MainActivity::class.java).apply {
        action = Intent.ACTION_VIEW
        data = CaptureActionNotificationFormatter.buildRouteUri(captureEventId, route)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_CLEAR_TOP
        putExtra(EXTRA_CAPTURE_EVENT_ID, captureEventId)
        putExtra(EXTRA_CAPTURE_ROUTE, route)
      }

    context.startActivity(launchIntent)
  }

  companion object {
    const val ACTION_DIRECT_REPLY =
      "com.upispendtracker.client.capture.action.DIRECT_REPLY"
    const val ACTION_OPEN_CLASSIFY =
      "com.upispendtracker.client.capture.action.OPEN_CLASSIFY"
    const val ACTION_OPEN_SPLIT =
      "com.upispendtracker.client.capture.action.OPEN_SPLIT"
    const val ACTION_SKIP =
      "com.upispendtracker.client.capture.action.SKIP"
    const val EXTRA_CAPTURE_EVENT_ID = "extra_capture_event_id"
    const val EXTRA_CAPTURE_ROUTE = "extra_capture_route"
    const val KEY_DIRECT_REPLY_TEXT = "key_direct_reply_text"

    private val actionExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    fun buildReceiverPendingIntent(
      context: Context,
      captureEventId: Long,
      action: String,
      mutable: Boolean = false,
    ): PendingIntent {
      val intent =
        Intent(context, CaptureActionReceiver::class.java).apply {
          this.action = action
          putExtra(EXTRA_CAPTURE_EVENT_ID, captureEventId)
        }

      val flags =
        PendingIntent.FLAG_UPDATE_CURRENT or
          if (mutable) {
            PendingIntent.FLAG_MUTABLE
          } else {
            PendingIntent.FLAG_IMMUTABLE
          }

      return PendingIntent.getBroadcast(
        context,
        buildRequestCode(captureEventId, action),
        intent,
        flags,
      )
    }

    private fun buildRequestCode(captureEventId: Long, action: String): Int {
      return (31 * captureEventId.hashCode()) + action.hashCode()
    }
  }
}
