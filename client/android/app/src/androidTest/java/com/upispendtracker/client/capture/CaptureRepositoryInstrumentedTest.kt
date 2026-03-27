package com.upispendtracker.client.capture

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CaptureRepositoryInstrumentedTest {
  private lateinit var context: Context

  @Before
  fun setUp() {
    context = InstrumentationRegistry.getInstrumentation().targetContext
    CaptureRepository(context).use { repository ->
      repository.clearSnapshots()
    }
  }

  @After
  fun tearDown() {
    CaptureRepository(context).use { repository ->
      repository.clearSnapshots()
    }
  }

  @Test
  fun persistsPendingCapturesAcrossRepositoryReopen() {
    val insertedCaptureId =
      CaptureRepository(context).use { repository ->
        val captureId = repository.insertSnapshot(buildSnapshot(), buildSuccessParseResult())
        assertTrue(captureId > 0L)
        captureId
      }

    CaptureRepository(context).use { reopenedRepository ->
      val pendingCaptures = reopenedRepository.fetchPendingCaptureEvents()
      val syncMarker = reopenedRepository.getSyncMarker(insertedCaptureId)
      val storedRecord = reopenedRepository.getLatestStoredRecord()

      assertEquals(1, pendingCaptures.size)
      assertEquals(insertedCaptureId, pendingCaptures.single().captureEventId)
      assertNotNull(storedRecord)
      assertEquals(insertedCaptureId, storedRecord?.captureEventId)
      assertEquals(CaptureEventState.CAPTURED, storedRecord?.captureState)
      assertEquals(CaptureSyncState.PENDING_IMPORT, syncMarker?.syncState)
      assertEquals(FIXED_CAPTURED_AT_MS, syncMarker?.updatedAtMs)
    }
  }

  @Test
  fun prunesRawPayloadWithoutDroppingImportedCaptureOrReplies() {
    CaptureRepository(context).use { repository ->
      val insertedCaptureId = repository.insertSnapshot(buildSnapshot(), buildSuccessParseResult())
      assertTrue(insertedCaptureId > 0L)

      val replyId =
        repository.insertCaptureReply(
          CaptureReplyDraft(
            captureEventId = insertedCaptureId,
            actionType = CaptureReplyActionType.DIRECT_REPLY,
            categoryId = "coffee",
            createdAtMs = FIXED_CAPTURED_AT_MS + 10_000L,
            itemLabel = "Cappuccino",
            replyText = "Coffee",
          ),
        )

      assertTrue(replyId > 0L)

      repository.updateCaptureState(
        captureEventId = insertedCaptureId,
        nextState = CaptureEventState.IMPORTED,
        linkedTransactionId = "txn_local_001",
        updatedAtMs = FIXED_CAPTURED_AT_MS + 20_000L,
      )

      val prunedCount =
        repository.pruneRetainedRawPayloads(
          maxRetainedRawPayloads = 0,
          prunedAtMs = FIXED_CAPTURED_AT_MS + 30_000L,
        )
      val storedRecord = repository.getLatestStoredRecord()
      val replies = repository.getCaptureReplies(insertedCaptureId)
      val syncMarker = repository.getSyncMarker(insertedCaptureId)

      assertEquals(1, prunedCount)
      assertNotNull(storedRecord)
      assertNull(storedRecord?.rawPayload)
      assertEquals(FIXED_CAPTURED_AT_MS + 30_000L, storedRecord?.rawPayloadPrunedAtMs)
      assertEquals(CaptureEventState.IMPORTED, storedRecord?.captureState)
      assertEquals("txn_local_001", storedRecord?.linkedTransactionId)
      assertEquals(1, replies.size)
      assertEquals(CaptureReplyActionType.DIRECT_REPLY, replies.single().actionType)
      assertEquals("Coffee", replies.single().replyText)
      assertTrue(repository.fetchPendingCaptureEvents().isEmpty())
      assertEquals(CaptureSyncState.IMPORTED, syncMarker?.syncState)
      assertEquals(FIXED_CAPTURED_AT_MS + 20_000L, syncMarker?.lastSyncedAtMs)
    }
  }

  private fun buildSnapshot(): NotificationCaptureSnapshot {
    return NotificationCaptureSnapshot(
      capturedAtMs = FIXED_CAPTURED_AT_MS,
      notificationKey = "capture-key-001",
      packageName = "com.phonepe.app",
      postedAtMs = FIXED_POSTED_AT_MS,
      rawPayload = "title=PhonePe\ntext=Paid Rs 245.00 at Chai Point",
      sourceAppId = "phonepe",
      subText = "UPI",
      title = "PhonePe",
      bodyText = "Paid Rs 245.00 at Chai Point",
    )
  }

  private fun buildSuccessParseResult(): NotificationParseResult.Success {
    return NotificationParseResult.Success(
      event =
        ParsedNotificationCaptureEvent(
          amountMinor = 24_500L,
          amountProvenance = "body_text",
          merchantRaw = "Chai Point",
          merchantProvenance = "body_text",
          occurredAtMs = FIXED_POSTED_AT_MS,
          referenceHint = "UTR123456",
          sourceAppId = "phonepe",
          timestampProvenance = NotificationParserRegistry.TIMESTAMP_PROVENANCE_POSTED_AT_MS,
          parserId = "phonepe_v1",
          parserVersion = "1.0.0",
          parserConfidence = 0.96,
          parserTrace = "phonepe_v1:success",
        ),
    )
  }

  companion object {
    private const val FIXED_CAPTURED_AT_MS = 1_774_800_000_000L
    private const val FIXED_POSTED_AT_MS = 1_774_799_940_000L
  }
}
