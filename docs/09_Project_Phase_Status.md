# Project Phase Status

Date: 2026-04-01
Source of truth: repo audit against `README.md`, `PLANS.md`, `docs/05_Backlog.*`, and live source under `client/`, `server/`, and `packages/`

## Summary

- Canonical project phases remain the backlog sprints in `docs/05_Backlog.*`.
- Repo truth is ahead of the backlog for several mobile and setup areas.
- Backlog tracking now reflects tickets that are genuinely `done`, `blocked`, or `in_progress` based on the current repository, while unfinished acceptance criteria stay explicitly open.
- `PLANS.md` now uses local `TRACK-*`, `APP-*`, and `ENV-*` identifiers for local execution history so it no longer collides with canonical backlog ticket IDs.
- Codex workflow orchestration is now documented in `docs/10_Codex_Workflow.md`; migration commands and rollback guidance now live in `docs/11_Database_Migrations.md`.
- OTA channel, runtime-version, and rollback guidance now lives in `docs/12_OTA_Runtime_Rollback.md`.
- Shared mobile design-system tokens and UI primitives now live in `packages/mobile-ui`, with a showcase screen reachable from the client Home shell.

## Sprint 0 — Foundations

**Done in repo**

- Monorepo bootstrap, shared packages, root scripts, and runnable client/API/worker scaffolds
- Pull-request workflow, PR template, and CI/branch-protection documentation
- Repo-level `AGENTS.md` and `PLANS.md`, now linked from the README
- Codex workflow docs for same-thread single-ticket delivery runs
- Ordered migration frameworks for mobile SQLite and server PostgreSQL plus root DB validation
- Shared mobile design-system package with theme tokens, reusable primitives, and a showcase screen
- Expo SDK 55 dev-build workflow plus Android/iOS shell support

**Remaining**

- Remote GitHub verification to truly close branch-protection setup
## Sprint 1 — Capture Foundation

**Done in repo**

- UI-level onboarding handoff that can open Android notification settings
- First signed remote bootstrap-config loop with API delivery, mobile cache/refresh handling, rollout channels, feature flags, parser templates, and stale-safe fallback observability
- Android-native `NotificationListenerService` foundation with allowlist filtering, raw snapshot persistence, a React Native diagnostics bridge, UI permission-state reflection sourced from the native listener permission, and a connected-Android instrumentation harness for allowlist filtering plus snapshot persistence that now passes on a real Android 13 device
- Native parser registry with package-specific launch-app parsers, generic fallback parsing, structured field provenance, reason-coded failures, parser-result persistence, a 30-plus-case fixture suite, and connected Android validation that exercises success and failure persistence
- Repo-side native capture dedupe with exact/fuzzy suppression, bootstrap-delivered thresholds, duplicate counters, and diagnostics exposure
- Repo-side actionable review-notification foundation with direct reply, open-app classify / split, skip persistence, and privacy-aware lockscreen redaction for successful unique captures
- Native-to-JS capture bridge that exposes pending native captures plus reply metadata, imports them idempotently into the local transaction store, and routes classify / split action deep links into the existing review flows
- Dedicated in-app diagnostics screen reachable from Home with supported parser inventory, recent parse failures, recent capture logs, and redacted debug-bundle sharing without developer mode

**Remaining**

- Connected-device closeout for dedupe, the Room-backed native capture repository, and the notification-action path is still blocked because this environment does not currently have a stable connected-Android validation path

## Sprint 2 — First Usable App

**Done in repo**

- Onboarding flow with value proposition, privacy disclosure, settings handoff, source-app preferences, budget-cycle choice, sync preference, and resumable saved progress
- Local SQLite-backed dashboard with cycle-aware totals, budget progress, top items, recent activity preview, quick actions, and persisted progress
- Inbox for uncategorized local transactions with status, merchant, source-app, amount, and age filters plus revisitable skipped items, local delete actions, and seeded 1,000-item FlatList validation
- In-app classify flow with immediate dashboard refresh
- Native captured transactions now import safely into the JS local store on launch/foreground and notification-action deep links can open classify or split with reply-based prefill

**Remaining**

- Connected-Android manual action validation for the end-to-end notification-driven quick-classify path is still pending
- Budget creation flow and partial/conflict Inbox views beyond the new split path

## Sprint 3 — Core UX And Intelligence

**Done in repo**

- Manual add flow
- Bottom-sheet quick classify flow with explicit suggestion chips, shared form primitives, save/skip controls, and reusable-rule plus auto-apply toggles
- Full-screen split-items flow with add/remove/reorder controls, running totals, explicit remainder handling, and partial-save visibility back in Inbox
- Local timeline/history flow with grouped day sections, search/filter chips, transaction detail, local notes, parser context, classification/audit history, and local edit/delete handoff
- First-class Settings screen with visible capture-source controls, privacy-mode preview masking while the app is inactive, sync/budget defaults, export entrypoints, and diagnostics access/share
- Seeded default categories plus local category create/edit/delete/merge, with the saved category list reused across classify, split, manual add, dashboard summaries, and Timeline search/detail
- Deterministic merchant normalization with canonical merchant plus alias persistence, manual merge/split controls, review-only fuzzy merge suggestions, and merchant-aware reuse across manual add, classify, Inbox filters, Timeline search, and transaction detail
- Deterministic local rule engine with SQLite-backed reusable rules, explanation metadata, and explicit auto-apply only for user-approved matches in quick classify and manual add

**Remaining**

- External QA/design acceptance for the split flow
- Product and QA approval of the Settings surface plus captured-spend classify integration

## Sprint 4 — Budgets And Sync Foundation

**Done in repo**

- Local SQLite transaction tables on mobile plus a modular backend skeleton with explicit API and worker module factories, tested runtime config loaders, and repository/service seams across health, bootstrap, sessions, sync, domain, reports, and worker jobs
- First guest-session and device-pairing APIs with token refresh rotation, device registration, one-time pairing-code creation/consumption, replay/expiry protection, and durable on-disk persistence across API restarts, all covered by typed contracts and route/service integration tests
- First authenticated sync push/pull APIs with idempotency-key replay handling, optimistic-concurrency conflict responses, cursor-based delta pulls, durable on-disk sync persistence, and paired mobile-style integration coverage over the real session, pairing, and sync routes
- Weighted local history-based suggestion ranker with explainable merchant, amount-bucket, hour-bucket, weekday, recency, and frequency scoring reused across classify and manual-entry flows
- Canonical local budget engine with overall, category, merchant, and item scopes across monthly, weekly, rolling, and custom cycles, including projected spend and threshold state now wired into Home
- Local budget-management flow with list/create/edit UX, quiet-mode-aware 50/80/100 threshold alerts, persisted alert review state, and Home review cards backed by the canonical budget engine
- Optimized local insights screen with current-cycle vs prior-cycle comparison and rollups for item, category, merchant, time-of-day, and day-of-week, validated on a generated 10k-transaction dataset
- Working local CSV export from Settings for transactions, items, categories, and budgets, plus a local backup JSON export hook, stable documented schemas, and privacy-aware CSV redaction tied to the current privacy-mode setting
- First mobile sync foundation with local outbox/entity-version/conflict persistence, deterministic outbox diffing from local writes, retry/backoff helpers, persisted guest-session/pairing credentials, pre-sync access-token refresh, and visible sync queue/conflict hooks in Home, Timeline, and Settings

**Remaining**

- Manual QA opening exported CSV files in spreadsheet tools, plus restore import beyond the current future-safe entrypoint
- Beta-stability evidence for multi-device sync, plus secure token-storage hardening beyond the current local persistence layer
- Worker jobs and export flows still need staging operation evidence

## Sprint 5 — APIs And Reports

**Done in repo**

- Typed health contract plus `GET /health`
- First typed bootstrap contract plus `GET /v1/bootstrap/config` with version compatibility and signed payloads
- Expanded authenticated domain API slice for transactions, transaction items, merchants, classify flow, categories, rules, and budgets, backed by a durable file store with optimistic-concurrency conflicts, explicit includeDeleted list behavior, soft deletes, versioned delete enforcement across the current write routes, and route-level integration coverage
- First authenticated reports module with `GET /v1/reports/summary` and `GET /v1/reports/breakdown`, deterministic period totals and comparison deltas, grouped rollups across category, merchant, item, hour-of-day, and day-of-week, top-N metadata on breakdown responses, and a repo-side latency benchmark over a seeded larger dataset
- Closed bootstrap API behavior with explicit cache headers, runtime-version compatibility checks, and mobile-client usage through the local bootstrap refresh path
- Worker heartbeat plus the first rollup-refresh, stale-session/export-cleanup, and queued CSV export-processing jobs, all scheduled through the shared worker module/runtime skeleton with delayed-retry and queue-depth/failure logging
- Repo-side QA baseline assets: versioned Android parser fixtures, named `pnpm qa:parser-fixtures` / `pnpm qa:smoke` / `pnpm qa:regression` harnesses, and a documented supported-device matrix plus release checklist in `docs/14_Quality_Matrix.md`

**Remaining**

- Staging deployment/evidence for the current domain API suite and worker job suite, plus any heavier rollup persistence
- Test-strategy approval plus execution of the supported-device matrix and release checklist evidence

## Sprint 6 — Hardening

**Done in repo**

- Baseline lint, typecheck, test, build, and CI documentation
- Repo-side OTA configuration for `internal`, `beta`, and `production` EAS channels, Expo fingerprint runtime-version policy, bootstrap query alignment with OTA channel/runtime metadata, and a written rollback/change-type playbook
- Repo-side `QA-002` privacy/security baseline: sync secrets now live in Expo SecureStore instead of plain SQLite settings, sync/telemetry reject insecure non-local HTTP, privacy mode defaults to enabled in JS and native capture settings, raw capture payload retention stays capped on-device, and the current data-handling baseline plus Play Data Safety review inputs are documented
- Repo-side `QA-003` performance pass: heavy client-side derived data now stays gated behind the active screen, current transaction and budget-alert query paths have additive local SQLite indexes, sync batching now honors payload size as well as entry count for slower networks, and `pnpm qa:performance` plus `docs/15_Performance_Budget.md` now codify the current repo-side performance budget
- Repo-side `QA-005` observability pass: versioned privacy-safe telemetry contracts, local-first client event queuing plus authenticated flush, global runtime-error capture, authenticated telemetry ingest/dashboard APIs, and deterministic operational alert thresholds for capture failures, sync failures, parser fallbacks, classify latency, and runtime errors

**Remaining**

- Real Expo project/update URL wiring plus dry-run OTA/rollback evidence
- Engineering approval of the OTA process
- Beta security sign-off plus final Play Data Safety and privacy-policy review evidence
- Direct device/network profiling evidence on baseline Android hardware and throttled networks
- Operational telemetry rollout and before-beta dashboard evidence

## Sprint 7 — Beta And Release

**Done in repo**

- Nothing yet beyond planning artifacts

**Remaining**

- Closed beta, release candidate, Play Store package, policy declarations, support docs, and launch operations
