package com.upispendtracker.client.capture

object NotificationPayloadFormatter {
  fun formatRawPayload(
    title: String?,
    bodyText: String?,
    subText: String?,
    textLines: List<String>,
  ): String {
    val sections = mutableListOf<String>()

    title?.trim()?.takeIf { it.isNotEmpty() }?.let { sections.add("title=$it") }
    bodyText?.trim()?.takeIf { it.isNotEmpty() }?.let { sections.add("text=$it") }
    subText?.trim()?.takeIf { it.isNotEmpty() }?.let { sections.add("subText=$it") }

    textLines
      .mapNotNull { line -> line.trim().takeIf { it.isNotEmpty() } }
      .forEachIndexed { index, line -> sections.add("line${index + 1}=$line") }

    return sections.joinToString(separator = "\n")
  }

  fun buildPreview(rawPayload: String, maxLength: Int = 120): String {
    val flattened = rawPayload.replace('\n', ' ').trim()

    if (flattened.length <= maxLength) {
      return flattened
    }

    return flattened.take(maxLength - 1).trimEnd() + "…"
  }
}
