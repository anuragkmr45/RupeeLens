# Privacy And Security Baseline

Date: 2026-03-30

## Purpose

This document records the current repo-side privacy and security baseline for the Android-first v1 app. It is the implementation worksheet for `QA-002`, not a substitute for final legal review, Play Console submission, or beta security sign-off.

The baseline is derived from:

- `docs/01_PRD.md` NFR-3
- `docs/02_Engineering_Design.md` section 11
- current repo truth in `client`, `server/api`, and `server/worker`

## Current Controls

- Explicit consent before notification access. The app exposes notification education first and does not auto-enable Android capture.
- Local-only mode is preserved. Core spend tracking remains usable without pairing or live APIs.
- Privacy mode now defaults to enabled in both the React Native settings state and the native Android capture settings store.
- Sync access and refresh tokens are no longer stored in plain SQLite settings. They are stored in Expo SecureStore, while non-secret sync metadata stays in SQLite.
- Remote sync and telemetry requests must use HTTPS/TLS unless the target is an approved local-development host such as `localhost`, `10.0.2.2`, or a private LAN IP.
- Native raw notification payloads are retained only in the on-device capture repository and capped by policy. The current raw-payload retention cap is 200 records.
- Diagnostics sharing is opt-in and redacted. CSV exports are redacted by default when privacy mode is enabled.
- Destructive domain edits already have audit-history coverage in the current server-side domain modules.

## Data Handling Snapshot

| Data class | Stored where | Stored for | Current handling |
| --- | --- | --- | --- |
| Parsed transactions, items, budgets, categories, rules, merchants | Mobile SQLite | App functionality and offline UX | Stored locally with additive migrations and local-only support |
| Sync access token, refresh token, expiry | Expo SecureStore | Pairing and authenticated sync | Secret values stored outside SQLite; legacy SQLite token keys are migrated out and deleted |
| Sync metadata such as `deviceId`, `userId`, and trusted `apiBaseUrl` | Mobile SQLite `sync_settings` | Resume local-first sync | Non-secret metadata only |
| Raw capture payload text | Native Android capture DB | Diagnostics and parser troubleshooting | Stored locally only, pruned by retention policy, and not uploaded by default |
| Diagnostics export bundle | User-triggered share/export flow | Support workflows | Opt-in and redacted by default |
| CSV exports | User-triggered share/export flow | User portability | Privacy-mode aware redaction for raw merchant text, notes, item labels, custom category labels/descriptions, and custom budget labels |
| Telemetry events | Local client queue, then authenticated telemetry API | Operational quality monitoring | Privacy-safe schema; no raw notification text or full diagnostics payloads |
| Session and pairing digests | Server durable file stores | Auth/session management | Hashed token/code digests only; cleanup jobs prune stale state |

## Retention And Redaction Notes

- The app stores only the parsed fields it needs for the long-lived spend experience.
- Raw notification content is kept on-device only and pruned by the native capture repository limit instead of being retained indefinitely.
- Local backup export intentionally remains full-fidelity for future restore work, but CSV export and diagnostics sharing are the redacted surfaces.
- The current client privacy mode affects inactive-app masking and native capture visibility defaults; it does not claim a full OS-level app lock feature.

## Transport And Secret Handling

- `client/src/features/sync/transport-policy.ts` now rejects non-local insecure HTTP for sync/session/telemetry traffic.
- `client/src/features/sync/secure-storage.ts` is the single repo-owned storage helper for sync secrets.
- `client/src/features/sync/persistence.ts` migrates any legacy SQLite token values into SecureStore and removes the old keys.

## Play Data Safety Review Inputs

This repo now has the implementation evidence needed for a release-owner review of the Play Data Safety answers:

- notification-derived financial behavior data is collected only after explicit user consent
- local-only mode is supported
- raw notification text is not uploaded to the backend by default
- exported diagnostics are redacted by default
- sync and telemetry use authenticated endpoints, and production-like remote transport requires HTTPS/TLS

Final Play Console answers, public privacy-policy text, and compliance approval still require human review outside this repo.

## Remaining External Gaps

- Beta security sign-off is not complete in this environment.
- Final Play Data Safety and privacy-policy review/submission are not complete in this repo.
- No root/jailbreak attestation, hardware-backed key attestation, or server-side secret manager integration has been added in this ticket.
