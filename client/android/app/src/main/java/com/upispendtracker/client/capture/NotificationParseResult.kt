package com.upispendtracker.client.capture

object NotificationParseFailureReasonCodes {
  const val AMOUNT_NOT_FOUND = "amount_not_found"
  const val MERCHANT_NOT_FOUND = "merchant_not_found"
  const val NO_PARSER_MATCHED = "no_parser_matched"
  const val UNSUPPORTED_NOTIFICATION_FORMAT = "unsupported_notification_format"
}

data class ParsedNotificationCaptureEvent(
  val amountMinor: Long,
  val amountProvenance: String,
  val merchantRaw: String,
  val merchantProvenance: String,
  val occurredAtMs: Long,
  val referenceHint: String?,
  val sourceAppId: String,
  val timestampProvenance: String,
  val parserId: String,
  val parserVersion: String,
  val parserConfidence: Double,
  val parserTrace: String,
)

sealed interface NotificationParseResult {
  data class Success(
    val event: ParsedNotificationCaptureEvent,
  ) : NotificationParseResult

  data class Failure(
    val reasonCode: String,
    val parserTrace: String,
  ) : NotificationParseResult
}
