# Project Phase Status

Date: 2026-03-27  
Source of truth: repo audit against `README.md`, `PLANS.md`, `docs/05_Backlog.*`, and live source under `client/`, `server/`, and `packages/`

## Summary

- Canonical project phases remain the backlog sprints in `docs/05_Backlog.*`.
- Repo truth is ahead of the backlog for several mobile and setup areas.
- Backlog tracking now reflects tickets that are genuinely `done`, `blocked`, or `in_progress` based on the current repository, while unfinished acceptance criteria stay explicitly open.
- `PLANS.md` now uses local `TRACK-*`, `APP-*`, and `ENV-*` identifiers for local execution history so it no longer collides with canonical backlog ticket IDs.
- Codex workflow orchestration is now documented in `docs/10_Codex_Workflow.md`; migration commands and rollback guidance now live in `docs/11_Database_Migrations.md`.
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

**Remaining**

- Connected-device closeout for dedupe is blocked by the current phone canceling debug APK installation, and the native capture repository plus domain-import work still remain

## Sprint 2 — First Usable App

**Done in repo**

- Onboarding flow with value proposition, privacy disclosure, settings handoff, source-app preferences, budget-cycle choice, sync preference, and resumable saved progress
- Local SQLite-backed dashboard with cycle-aware totals, budget progress, top items, recent activity preview, quick actions, and persisted progress
- Inbox for uncategorized local transactions with status, merchant, source-app, amount, and age filters plus revisitable skipped items, local delete actions, and seeded 1,000-item FlatList validation
- In-app classify flow with immediate dashboard refresh

**Remaining**

- Notification-driven quick-classify flow
- Budget creation flow, search screen, partial/conflict Inbox views, and split/create-rule actions

## Sprint 3 — Core UX And Intelligence

**Done in repo**

- Manual add flow
- Bottom-sheet quick classify flow with explicit suggestion chips, shared form primitives, save/skip controls, and a save-as-rule intent toggle
- Hardcoded default category options inside the client shell

**Remaining**

- Durable rule creation via `INT-003`
- Split-items flow
- Timeline, detail, search/filter, settings/privacy/export screens, and captured-spend classify integration
- Category CRUD, merchant normalization, and rule engine

## Sprint 4 — Budgets And Sync Foundation

**Done in repo**

- Local SQLite transaction tables on mobile plus a modular backend skeleton with explicit API and worker module factories, tested runtime config loaders, and repository/service seams around health and heartbeat

**Remaining**

- Suggestions, budgets, rollups, CSV export, backup/restore
- Guest session, pairing, and sync APIs
- Backend modular-monolith feature modules beyond health and heartbeat

## Sprint 5 — APIs And Reports

**Done in repo**

- Typed health contract plus `GET /health`
- First typed bootstrap contract plus `GET /v1/bootstrap/config` with version compatibility and signed payloads
- Worker heartbeat scheduled through the shared worker module/runtime skeleton

**Remaining**

- Domain APIs, report APIs, background jobs, and mobile outbox/conflict queue
- Broader QA harnesses, parser fixtures, and release-quality matrix work

## Sprint 6 — Hardening

**Done in repo**

- Baseline lint, typecheck, test, build, and CI documentation

**Remaining**

- Privacy/security baseline
- Low-network and performance optimization
- OTA/runtime-version and rollback playbook
- Analytics, crash reporting, and operational dashboards

## Sprint 7 — Beta And Release

**Done in repo**

- Nothing yet beyond planning artifacts

**Remaining**

- Closed beta, release candidate, Play Store package, policy declarations, support docs, and launch operations
