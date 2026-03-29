package com.upispendtracker.client.capture

data class SupportedParserDescriptor(
  val parserId: String,
  val parserVersion: String,
  val sourceAppIds: List<String>,
)

class NotificationParserRegistry private constructor(
  private val packageSpecificParsers: Map<String, NotificationParser>,
  private val genericParsers: List<NotificationParser>,
) {
  fun parse(snapshot: NotificationCaptureSnapshot): NotificationParseResult {
    val parserTraceEntries = mutableListOf<String>()
    var lastFailureReasonCode = NotificationParseFailureReasonCodes.NO_PARSER_MATCHED
    val parsersToRun = buildList {
      packageSpecificParsers[snapshot.sourceAppId]?.let(::add)
      genericParsers
        .filter { parser -> parser.supports(snapshot.sourceAppId) }
        .forEach(::add)
    }

    if (parsersToRun.isEmpty()) {
      return NotificationParseResult.Failure(
        reasonCode = NotificationParseFailureReasonCodes.NO_PARSER_MATCHED,
        parserTrace = "",
      )
    }

    for (parser in parsersToRun) {
      when (val attempt = parser.parse(snapshot)) {
        is ParserAttemptResult.Success -> {
          parserTraceEntries.add("${parser.id}:success")
          return NotificationParseResult.Success(
            event = ParsedNotificationCaptureEvent(
              amountMinor = attempt.amountMinor,
              amountProvenance = attempt.amountProvenance,
              merchantRaw = attempt.merchantRaw,
              merchantProvenance = attempt.merchantProvenance,
              occurredAtMs = snapshot.postedAtMs,
              referenceHint = attempt.referenceHint,
              sourceAppId = snapshot.sourceAppId,
              timestampProvenance = TIMESTAMP_PROVENANCE_POSTED_AT_MS,
              parserId = parser.id,
              parserVersion = parser.version,
              parserConfidence = attempt.confidence,
              parserTrace = parserTraceEntries.joinToString(separator = "|"),
            ),
          )
        }

        is ParserAttemptResult.Failure -> {
          lastFailureReasonCode = attempt.reasonCode
          parserTraceEntries.add("${parser.id}:${attempt.reasonCode}")
        }
      }
    }

    return NotificationParseResult.Failure(
      reasonCode = lastFailureReasonCode,
      parserTrace = parserTraceEntries.joinToString(separator = "|"),
    )
  }

  fun availableParsers(): List<SupportedParserDescriptor> {
    return (packageSpecificParsers.values.toList() + genericParsers)
      .distinctBy { parser -> parser.id }
      .sortedBy { parser -> parser.id }
      .map { parser ->
        SupportedParserDescriptor(
          parserId = parser.id,
          parserVersion = parser.version,
          sourceAppIds = parser.supportedSourceAppIds.toList().sorted(),
        )
      }
  }

  companion object {
    const val TIMESTAMP_PROVENANCE_POSTED_AT_MS = "notification_posted_at_ms"

    fun default(): NotificationParserRegistry {
      val packageSpecificParsers = mapOf(
        "google_pay" to createGooglePayParser(),
        "phonepe" to createPhonePeParser(),
        "paytm" to createPaytmParser(),
        "bhim" to createBhimParser(),
      )

      return NotificationParserRegistry(
        packageSpecificParsers = packageSpecificParsers,
        genericParsers = listOf(
          createGenericUpiParser(),
          createMerchantFirstParser(),
        ),
      )
    }

    fun supportedParsers(): List<SupportedParserDescriptor> = default().availableParsers()

    private fun createGooglePayParser(): NotificationParser {
      return RegexBackedNotificationParser(
        id = "google_pay_v1",
        supportedSourceAppIds = setOf("google_pay"),
        version = "1.0.0",
        confidence = 0.97,
        patterns = listOf(
          RegexPatternDefinition(
            regex =
              Regex(
                "(?:you\\s+)?(?:paid|sent)\\s*(?:₹|rs\\.?|inr)?\\s*(?<amount>[\\d,]+(?:\\.\\d{1,2})?)\\s*(?:to|for|towards|at)\\s*(?<merchant>[A-Za-z0-9][A-Za-z0-9 &'._-]{1,80})",
                setOf(RegexOption.IGNORE_CASE),
              ),
          ),
          RegexPatternDefinition(
            regex =
              Regex(
                "(?<merchant>[A-Za-z0-9][A-Za-z0-9 &'._-]{1,80})\\s+received\\s*(?:₹|rs\\.?|inr)?\\s*(?<amount>[\\d,]+(?:\\.\\d{1,2})?)",
                setOf(RegexOption.IGNORE_CASE),
              ),
          ),
        ),
      )
    }

    private fun createPhonePeParser(): NotificationParser {
      return RegexBackedNotificationParser(
        id = "phonepe_v1",
        supportedSourceAppIds = setOf("phonepe"),
        version = "1.0.0",
        confidence = 0.96,
        patterns = listOf(
          RegexPatternDefinition(
            regex =
              Regex(
                "(?:paid|sent)\\s*(?:₹|rs\\.?|inr)?\\s*(?<amount>[\\d,]+(?:\\.\\d{1,2})?)\\s*(?:to|at|towards)\\s*(?<merchant>[A-Za-z0-9][A-Za-z0-9 &'._-]{1,80})",
                setOf(RegexOption.IGNORE_CASE),
              ),
          ),
          RegexPatternDefinition(
            regex =
              Regex(
                "(?<merchant>[A-Za-z0-9][A-Za-z0-9 &'._-]{1,80})\\s+received\\s*(?:₹|rs\\.?|inr)?\\s*(?<amount>[\\d,]+(?:\\.\\d{1,2})?)",
                setOf(RegexOption.IGNORE_CASE),
              ),
          ),
        ),
      )
    }

    private fun createPaytmParser(): NotificationParser {
      return RegexBackedNotificationParser(
        id = "paytm_v1",
        supportedSourceAppIds = setOf("paytm"),
        version = "1.0.0",
        confidence = 0.95,
        patterns = listOf(
          RegexPatternDefinition(
            regex =
              Regex(
                "(?:payment\\s+of\\s+)?(?:paid|sent)?\\s*(?:₹|rs\\.?|inr)?\\s*(?<amount>[\\d,]+(?:\\.\\d{1,2})?)\\s*(?:to|at|towards)\\s*(?<merchant>[A-Za-z0-9][A-Za-z0-9 &'._-]{1,80})",
                setOf(RegexOption.IGNORE_CASE),
              ),
          ),
          RegexPatternDefinition(
            regex =
              Regex(
                "(?<merchant>[A-Za-z0-9][A-Za-z0-9 &'._-]{1,80})\\s+received\\s*(?:₹|rs\\.?|inr)?\\s*(?<amount>[\\d,]+(?:\\.\\d{1,2})?)",
                setOf(RegexOption.IGNORE_CASE),
              ),
          ),
        ),
      )
    }

    private fun createBhimParser(): NotificationParser {
      return RegexBackedNotificationParser(
        id = "bhim_v1",
        supportedSourceAppIds = setOf("bhim"),
        version = "1.0.0",
        confidence = 0.94,
        patterns = listOf(
          RegexPatternDefinition(
            regex =
              Regex(
                "(?:upi\\s+payment\\s+of\\s+)?(?:paid|sent)?\\s*(?:₹|rs\\.?|inr)?\\s*(?<amount>[\\d,]+(?:\\.\\d{1,2})?)\\s*(?:to|at|towards)\\s*(?<merchant>[A-Za-z0-9][A-Za-z0-9 &'._-]{1,80})",
                setOf(RegexOption.IGNORE_CASE),
              ),
          ),
          RegexPatternDefinition(
            regex =
              Regex(
                "(?<merchant>[A-Za-z0-9][A-Za-z0-9 &'._-]{1,80})\\s+received\\s*(?:₹|rs\\.?|inr)?\\s*(?<amount>[\\d,]+(?:\\.\\d{1,2})?)",
                setOf(RegexOption.IGNORE_CASE),
              ),
          ),
        ),
      )
    }

    private fun createGenericUpiParser(): NotificationParser {
      return GenericTemplateNotificationParser(
        id = "generic_upi_v1",
        supportedSourceAppIds = setOf("google_pay", "phonepe", "paytm", "bhim"),
        version = "1.0.0",
        confidence = 0.76,
        amountRegex =
          Regex(
            "(?:₹|rs\\.?|inr)?\\s*(?<amount>[\\d,]+(?:\\.\\d{1,2})?)",
            setOf(RegexOption.IGNORE_CASE),
          ),
        merchantRegex =
          Regex(
            "(?:to|at|towards)\\s(?<merchant>[A-Za-z0-9][A-Za-z0-9 &'._-]{1,80})",
            setOf(RegexOption.IGNORE_CASE),
          ),
        referenceRegex =
          Regex(
            "(?:ref|utr)[:\\s-]*(?<reference>[A-Za-z0-9-]{6,})",
            setOf(RegexOption.IGNORE_CASE),
          ),
      )
    }

    private fun createMerchantFirstParser(): NotificationParser {
      return GenericTemplateNotificationParser(
        id = "merchant_first_v1",
        supportedSourceAppIds = setOf("phonepe", "paytm", "bhim"),
        version = "1.0.0",
        confidence = 0.7,
        amountRegex =
          Regex(
            "(?<amount>[\\d,]+(?:\\.\\d{1,2})?)",
            setOf(RegexOption.IGNORE_CASE),
          ),
        merchantRegex =
          Regex(
            "(?<merchant>[A-Za-z0-9][A-Za-z0-9 &'._-]{1,80})\\s+(?:received|credited)",
            setOf(RegexOption.IGNORE_CASE),
          ),
      )
    }
  }
}

private interface NotificationParser {
  val id: String
  val supportedSourceAppIds: Set<String>
  val version: String

  fun parse(snapshot: NotificationCaptureSnapshot): ParserAttemptResult

  fun supports(sourceAppId: String): Boolean
}

private sealed interface ParserAttemptResult {
  data class Success(
    val amountMinor: Long,
    val amountProvenance: String,
    val merchantRaw: String,
    val merchantProvenance: String,
    val referenceHint: String?,
    val confidence: Double,
  ) : ParserAttemptResult

  data class Failure(
    val reasonCode: String,
  ) : ParserAttemptResult
}

private data class RegexPatternDefinition(
  val regex: Regex,
)

private data class TextCandidate(
  val text: String,
  val provenance: String,
)

private data class ParsedFieldMatch<T>(
  val provenance: String,
  val value: T,
)

private class RegexBackedNotificationParser(
  override val id: String,
  override val supportedSourceAppIds: Set<String>,
  override val version: String,
  private val confidence: Double,
  private val patterns: List<RegexPatternDefinition>,
) : NotificationParser {
  override fun parse(snapshot: NotificationCaptureSnapshot): ParserAttemptResult {
    val textCandidates = buildTextCandidates(snapshot)

    for (candidate in textCandidates) {
      for (pattern in patterns) {
        val matchResult = pattern.regex.find(candidate.text) ?: continue

        if (matchResult.range.first != 0) {
          continue
        }

        val amountMinor = matchResult.groups["amount"]?.value?.let(::parseAmountMinorUnits) ?: continue
        val merchantRaw =
          matchResult.groups["merchant"]?.value?.let(::sanitizeMerchantValue) ?: continue

        if (merchantRaw.isBlank()) {
          continue
        }

        return ParserAttemptResult.Success(
          amountMinor = amountMinor,
          amountProvenance = candidate.provenance,
          merchantRaw = merchantRaw,
          merchantProvenance = candidate.provenance,
          referenceHint = extractReferenceHint(snapshot.rawPayload),
          confidence = confidence,
        )
      }
    }

    return ParserAttemptResult.Failure(
      reasonCode = NotificationParseFailureReasonCodes.UNSUPPORTED_NOTIFICATION_FORMAT,
    )
  }

  override fun supports(sourceAppId: String): Boolean = supportedSourceAppIds.contains(sourceAppId)
}

private class GenericTemplateNotificationParser(
  override val id: String,
  override val supportedSourceAppIds: Set<String>,
  override val version: String,
  private val confidence: Double,
  private val amountRegex: Regex,
  private val merchantRegex: Regex,
  private val referenceRegex: Regex? = null,
) : NotificationParser {
  override fun parse(snapshot: NotificationCaptureSnapshot): ParserAttemptResult {
    val textCandidates = buildTextCandidates(snapshot)
    val normalizedRawPayload = normalizeRawPayloadForParsing(snapshot.rawPayload)
    val amountMatch = findFirstFieldMatch(
      textCandidates = textCandidates,
      regex = amountRegex,
      groupName = "amount",
      transform = ::parseAmountMinorUnits,
    )
    val merchantMatch = findFirstFieldMatch(
      textCandidates = textCandidates,
      regex = merchantRegex,
      groupName = "merchant",
      transform = ::sanitizeMerchantValue,
    )

    if (amountMatch == null && merchantMatch == null) {
      return ParserAttemptResult.Failure(
        reasonCode = NotificationParseFailureReasonCodes.UNSUPPORTED_NOTIFICATION_FORMAT,
      )
    }

    if (amountMatch == null) {
      return ParserAttemptResult.Failure(
        reasonCode = NotificationParseFailureReasonCodes.AMOUNT_NOT_FOUND,
      )
    }

    if (merchantMatch == null) {
      return ParserAttemptResult.Failure(
        reasonCode = NotificationParseFailureReasonCodes.MERCHANT_NOT_FOUND,
      )
    }

    return ParserAttemptResult.Success(
      amountMinor = amountMatch.value,
      amountProvenance = amountMatch.provenance,
      merchantRaw = merchantMatch.value,
      merchantProvenance = merchantMatch.provenance,
      referenceHint = referenceRegex?.find(normalizedRawPayload)?.groups?.get("reference")?.value,
      confidence = confidence,
    )
  }

  override fun supports(sourceAppId: String): Boolean = supportedSourceAppIds.contains(sourceAppId)
}

private fun buildTextCandidates(snapshot: NotificationCaptureSnapshot): List<TextCandidate> {
  val normalizedRawPayload = normalizeRawPayloadForParsing(snapshot.rawPayload)

  return buildList {
    snapshot.bodyText?.trim()?.takeIf { it.isNotEmpty() }?.let { add(TextCandidate(it, "body_text")) }
    snapshot.title?.trim()?.takeIf { it.isNotEmpty() }?.let { add(TextCandidate(it, "title")) }
    snapshot.subText?.trim()?.takeIf { it.isNotEmpty() }?.let { add(TextCandidate(it, "sub_text")) }
    normalizedRawPayload.takeIf { it.isNotEmpty() }?.let {
      add(TextCandidate(it, "raw_payload"))
    }
  }
}

private fun <T> findFirstFieldMatch(
  textCandidates: List<TextCandidate>,
  regex: Regex,
  groupName: String,
  transform: (String) -> T?,
): ParsedFieldMatch<T>? {
  for (candidate in textCandidates) {
    val matchResult = regex.find(candidate.text) ?: continue
    val groupValue = matchResult.groups[groupName]?.value ?: continue
    val transformedValue = transform(groupValue) ?: continue

    return ParsedFieldMatch(
      provenance = candidate.provenance,
      value = transformedValue,
    )
  }

  return null
}

private fun parseAmountMinorUnits(rawAmount: String): Long? {
  val normalizedAmount = rawAmount.replace(",", "").trim()

  if (!Regex("\\d+(?:\\.\\d{1,2})?").matches(normalizedAmount)) {
    return null
  }

  val parts = normalizedAmount.split(".")
  val wholeUnits = parts.firstOrNull()?.toLongOrNull() ?: return null
  val fractionalUnits =
    when (val decimals = parts.getOrNull(1)) {
      null -> 0L
      "" -> 0L
      else -> decimals.padEnd(2, '0').take(2).toLongOrNull() ?: return null
    }

  return wholeUnits * 100 + fractionalUnits
}

private fun sanitizeMerchantValue(rawMerchant: String): String {
  return rawMerchant
    .trim()
    .replace(
      Regex(
        "\\s+(?:successful|successfully|success|completed|via\\s+upi|using\\s+upi|txn\\b.*|transaction\\b.*|ref\\b.*|utr\\b.*)$",
        setOf(RegexOption.IGNORE_CASE),
      ),
      "",
    )
    .trimEnd('.', ',', ':', ';')
    .replace(Regex("\\s{2,}"), " ")
}

private fun extractReferenceHint(rawPayload: String): String? {
  val normalizedRawPayload = normalizeRawPayloadForParsing(rawPayload)
  return Regex(
    "(?:ref|utr)[:\\s-]*(?<reference>[A-Za-z0-9-]{6,})",
    setOf(RegexOption.IGNORE_CASE),
  ).find(normalizedRawPayload)?.groups?.get("reference")?.value
}

private fun normalizeRawPayloadForParsing(rawPayload: String): String {
  return rawPayload.replace(
    Regex("(^|\\n)(?:title|text|subText|line\\d+)="),
    "$1",
  ).trim()
}
