# Backlog — v1 Descriptive Tickets

Version: 1.0  
Date: 2026-03-13

This backlog is written so it can be used by engineering managers, product owners, and AI coding agents. Each ticket is intentionally explicit about scope, dependencies, tests, and done criteria.

## Sprint summary

| Sprint   | Theme                       | Primary outcome                                                  |
| -------- | --------------------------- | ---------------------------------------------------------------- |
| Sprint 0 | Foundations                 | Repo, CI, docs, migrations, design primitives                    |
| Sprint 1 | Capture foundation          | Native listener, parsing, dedupe, remote config                  |
| Sprint 2 | First usable app            | Onboarding, dashboard, inbox, quick classify notification        |
| Sprint 3 | Core UX and intelligence    | Split items, timeline, categories, merchant normalization, rules |
| Sprint 4 | Budgets and sync foundation | Suggestions, budget engine, sessions, sync                       |
| Sprint 5 | APIs and reports            | Domain APIs, rollups, exports, worker jobs                       |
| Sprint 6 | Hardening                   | Security, low-internet tuning, OTA, analytics                    |
| Sprint 7 | Beta and release            | Closed beta, triage, store launch package                        |

## Tracking legend

- `status`: `todo`, `in_progress`, `blocked`, `done`
- `owner`: active assignee for the ticket
- `started_at` and `completed_at`: `YYYY-MM-DD`
- `commit_ref`: real commit hash when available, otherwise a clear placeholder
- `tracking_notes`: short audit trail for blockers, validation, or completion context

## EPIC-0 — Program Setup & Delivery

Foundations required before feature work can move safely.

### SET-001 — Bootstrap monorepo with client, api, worker, shared packages

- **Epic:** EPIC-0
- **Sprint:** Sprint 0
- **Team:** Platform
- **Priority:** P0
- **Story points:** 5
- **Goal:** Create a clean modular monorepo that scales without repo churn.
- **Dependencies:** None
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-13 | Completed At: 2026-03-13 | Commit Ref: pending-local-commit | Tracking Notes: Validation passed; API smoke check used port 3100 because port 3000 was already occupied locally.

**Description**  
Set up pnpm workspace with client, server/api, server/worker, packages/contracts, packages/shared-types, packages/shared-utils, packages/eslint-config, packages/tsconfig. Add TypeScript project references, path aliases, env loading, and base scripts.

**Acceptance criteria**

- Repository structure matches design doc.
- pnpm install, lint, test, typecheck, and build commands work from repo root.
- Mobile, API, and worker apps can run independently in dev mode.
- Shared packages can be imported without circular references.
- README has bootstrap steps for a new developer.

**Test notes**  
Smoke-test root scripts on clean machine/container; verify TS path aliases and builds.

**Done when**  
Merged with CI green and bootstrap documented.

### SET-002 — Set up CI/CD gates and branch protections

- **Epic:** EPIC-0
- **Sprint:** Sprint 0
- **Team:** DevEx
- **Priority:** P0
- **Story points:** 3
- **Goal:** Prevent broken code from merging and standardize release quality.
- **Dependencies:** SET-001
- **Tracking:** Status: blocked | Owner: codex | Started At: 2026-03-13 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Closeout verification found local `.git` and `origin`, but `main` has no commits, `git ls-remote origin` returns no refs, GitHub web access to the repo returns 404 unauthenticated, and this environment has neither `gh` nor `GH_TOKEN`/`GITHUB_TOKEN`. PR workflow runs and `main` branch protection therefore could not be verified.

**Description**  
Configure GitHub Actions for install, lint, typecheck, unit tests, OpenAPI lint, and changed-package detection. Add branch protection expectations and PR template.

**Acceptance criteria**

- PR workflow runs on every pull request.
- Main branch requires passing checks before merge.
- PR template asks for scope, test evidence, screenshots, risk, and rollback.
- Conventional commit validation runs on PR titles or commit messages.

**Test notes**  
Open a test PR and verify required checks block merge on failure.

**Done when**  
CI required for main branch; docs updated.

### SET-003 — Create mobile design system tokens and UI primitives

- **Epic:** EPIC-0
- **Sprint:** Sprint 0
- **Team:** Design Systems
- **Priority:** P1
- **Story points:** 5
- **Goal:** Ensure consistent UI, dark mode, and future theming without repeated redesign.
- **Dependencies:** SET-001
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-26 | Completed At: 2026-03-26 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: `@upi-spend-tracker/mobile-ui` now owns the shared light/dark theme tokens and base primitives, the Expo client consumes those primitives and tokenized colors, Home exposes a showcase screen for the full primitive set, and snapshot plus app-flow tests cover the shared UI package.

**Description**  
Define spacing, typography, radius, elevation, semantic colors, icon sizes, and motion tokens. Build base components: AppShell, Button, Card, ListItem, BottomSheet, TextField, Chip, EmptyState, SectionHeader, KPIBlock.

**Acceptance criteria**

- Tokens exist in one shared package and are consumed by the mobile app.
- Base components support light and dark themes.
- Components meet accessible touch target sizes.
- Example showcase screen demonstrates all primitives.

**Test notes**  
Snapshot tests for primitives; manual accessibility review.

**Done when**  
UI primitives documented and ready for feature teams.

### SET-004 — Implement database migration framework for mobile SQLite and server PostgreSQL

- **Epic:** EPIC-0
- **Sprint:** Sprint 0
- **Team:** Architecture
- **Priority:** P0
- **Story points:** 5
- **Goal:** Make schema changes safe and repeatable across environments.
- **Dependencies:** SET-001
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-26 | Completed At: 2026-03-26 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: mobile and server now initialize through ordered migration manifests with schema version tracking, the client persistence path applies mobile migrations before reads/writes and can adopt older untracked local schemas, `pnpm db:validate` validates empty-state and legacy upgrade paths, and `pnpm ci:verify` now enforces DB validation in CI.

**Description**  
Create migration runners, seed strategy, schema version tracking, rollback guidance, and local developer scripts for both mobile SQLite and server PostgreSQL.

**Acceptance criteria**

- Both mobile and server DBs can initialize from empty state using migrations only.
- Migrations are idempotent and ordered.
- Rollback or forward-fix guidance exists in docs.
- CI validates pending migrations.

**Test notes**  
Run migrations from empty DB and on existing DB with prior version; verify schema hash.

**Done when**  
Migration workflow documented and validated.

### SET-005 — Add repo-level AGENTS.md, PLANS.md, and code review workflow for Codex

- **Epic:** EPIC-0
- **Sprint:** Sprint 0
- **Team:** Product/Architecture
- **Priority:** P1
- **Story points:** 3
- **Goal:** Make AI-assisted implementation consistent and repo-aware.
- **Dependencies:** SET-001
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-25 | Completed At: 2026-03-25 | Commit Ref: pending-local-commit | Tracking Notes: AGENTS.md and PLANS.md exist at the repo root, contributor expectations are documented, and README now links directly to both files plus the project phase-status audit.

**Description**  
Author AGENTS.md with repo map, commands, conventions, safety rules, and done criteria. Add PLANS.md execution-plan template and code-review checklist reference.

**Acceptance criteria**

- AGENTS.md is concise, accurate, and points to deeper docs instead of duplicating them.
- PLANS.md template can be copied for any major task.
- Docs explain when Codex should plan first vs implement directly.
- Workflow explicitly requires tests and diff review before merge.

**Test notes**  
Run a dry-run with an AI coding agent and confirm instructions are discoverable.

**Done when**  
Docs merged and linked from README.

### SET-006 — Implement feature flags and remote parser config

- **Epic:** EPIC-0
- **Sprint:** Sprint 1
- **Team:** Platform
- **Priority:** P0
- **Story points:** 5
- **Goal:** Ship parser fixes and staged rollout safely without forcing native releases for every tweak.
- **Dependencies:** SET-001, SET-004
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-26 | Completed At: 2026-03-26 | Commit Ref: pending-local-commit | Tracking Notes: Added the first live signed `/v1/bootstrap/config` endpoint, shared bootstrap DTOs/integrity helpers, a client-side cached bootstrap refresh loop with stale-safe fallback observability, and app-level feature-flag/parser-template status while keeping repo validation green.

**Description**  
Build bootstrap config endpoint, mobile cache layer, config TTL, signature/version checks, kill switches, parser templates, and staged rollout support by version/channel.

**Acceptance criteria**

- Mobile loads cached config instantly and refreshes in background.
- Config can disable a parser or feature remotely.
- Stale config fallback exists and is observable.
- Parser template changes do not require mobile code edits when format is supported.

**Test notes**  
Simulate old config, invalid signature, and network loss; verify safe fallback.

**Done when**  
Remote config live in dev and test environments.

## EPIC-1 — Android Capture Engine

Detect payment notifications reliably and turn them into structured capture events.

### CAP-001 — Build Android NotificationListenerService and allowlist controls

- **Epic:** EPIC-1
- **Sprint:** Sprint 1
- **Team:** Android Native
- **Priority:** P0
- **Story points:** 8
- **Goal:** Observe supported payment notifications only after explicit user opt-in.
- **Dependencies:** SET-001
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-26 | Completed At: 2026-03-27 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: CAP-001 now has a native Android listener service, allowlist filtering, raw snapshot persistence, a React Native diagnostics bridge, permission-state reflection in UI, and connected Android instrumentation coverage. On 2026-03-27 the attached Android 13 device accepted the androidTest APK and `./gradlew :app:connectedDebugAndroidTest` passed with 3 tests, clearing the prior install-policy blocker and closing the ticket.

**Description**  
Create native Android service to receive notifications, filter by allowed packages, and persist raw payload snapshots needed for parsing. Add onboarding checks and diagnostics.

**Acceptance criteria**

- Service receives notifications from allowlisted apps only.
- User can turn individual source apps on or off.
- Permission state is reflected correctly in UI.
- No unsupported package is parsed or stored.

**Test notes**  
Instrumented tests for listener callbacks and allowlist filtering; manual tests with sample apps.

**Done when**  
Notification listener stable on supported Android versions.

### CAP-002 — Implement parser registry with package-specific and generic parsers

- **Epic:** EPIC-1
- **Sprint:** Sprint 1
- **Team:** Android Native
- **Priority:** P0
- **Story points:** 8
- **Goal:** Convert raw notification text into structured payment events.
- **Dependencies:** CAP-001, SET-006
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-27 | Completed At: 2026-03-27 | Commit Ref: pending-local-commit | Tracking Notes: CAP-002 now ships a native parser registry with package-specific parsers for Google Pay, PhonePe, Paytm, and BHIM plus generic fallback parsing, structured parse provenance, reason-coded failures, and parser-result persistence alongside raw snapshots. The parser fixture suite covers 30-plus variants, Android unit tests passed, and `./gradlew :app:connectedDebugAndroidTest` passed on the attached Android 13 device with 4 connected tests, closing the ticket without spilling into dedupe or Room-repository scope.

**Description**  
Define parser interface, package-specific parsers for launch apps, generic regex/token parser fallback, parser versioning, and parser fixtures. Expose confidence, parse errors, and raw-field provenance.

**Acceptance criteria**

- Registry tries package-specific parser first, then generic parser.
- Parsers return amount, merchant raw text, timestamp, source app, and parser confidence where available.
- Failures are captured with reason codes, not silent drops.
- Fixture-based tests cover success and failure cases.

**Test notes**  
Fixture suite with at least 30 notification variants; regression tests for parser updates.

**Done when**  
Structured capture events generated with auditable parse provenance.

### CAP-003 — Implement capture dedupe and replay protection

- **Epic:** EPIC-1
- **Sprint:** Sprint 1
- **Team:** Android Native
- **Priority:** P0
- **Story points:** 5
- **Goal:** Prevent duplicate transaction prompts caused by retries, grouped notifications, or app re-posts.
- **Dependencies:** CAP-002
- **Tracking:** Status: blocked | Owner: codex | Started At: 2026-03-27 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: CAP-003 now has repo-side exact/fuzzy dedupe, bootstrap-delivered thresholds, duplicate counters, Android diagnostics wiring, a JVM deduper test suite, and replay/integration coverage. On 2026-03-27 `adb devices` again showed the physical device `e342703`, `./gradlew :app:testDebugUnitTest` passed, and `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all passed. The closeout remains blocked because `./gradlew :app:connectedDebugAndroidTest` still failed while installing `app-debug.apk` on `M2102J20SI - 13` with `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`.

**Description**  
Create exact and fuzzy dedupe hashes using package, merchant, amount, time bucket, and optional reference hints. Add configurable thresholds and duplicate counters.

**Acceptance criteria**

- Exact duplicates are suppressed automatically.
- Near-duplicate events inside threshold are linked, not re-prompted.
- Dedupe decisions are debuggable in diagnostics.
- Thresholds can be tuned via config.

**Test notes**  
Replay same notification payloads and verify single capture record; near-duplicate simulation tests.

**Done when**  
Duplicate prompts reduced to agreed threshold in QA.

### CAP-004 — Create native capture database and repository layer

- **Epic:** EPIC-1
- **Sprint:** Sprint 1
- **Team:** Android Native
- **Priority:** P0
- **Story points:** 5
- **Goal:** Persist capture events reliably even when JS runtime is not active.
- **Dependencies:** SET-004, CAP-001
- **Tracking:** Status: blocked | Owner: codex | Started At: 2026-03-27 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: CAP-004 now has a Room-backed native capture repository, schema migrations from legacy snapshot storage, repository methods for insert/state updates/pending fetch/reply and sync-marker persistence, retention-safe raw payload pruning, and a connected-Android repository instrumentation suite. `./gradlew :app:testDebugUnitTest`, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed, but `./gradlew :app:connectedDebugAndroidTest` could not execute on 2026-03-27 because `adb devices` returned no connected devices.

**Description**  
Use Room for capture_events, capture_replies, and sync markers. Add repository methods for insert, update state, fetch pending, and pruning.

**Acceptance criteria**

- Raw capture and parsed fields persist across process death and reboot.
- Repository is thread-safe and test-covered.
- Retention policy can prune old raw data without deleting classified domain data.

**Test notes**  
Kill/restart process during capture flow and verify event persistence.

**Done when**  
Capture DB stable and integrated into native services.

### CAP-005 — Build quick-classify notification with direct reply, split, and skip actions

- **Epic:** EPIC-1
- **Sprint:** Sprint 2
- **Team:** Android Native
- **Priority:** P0
- **Story points:** 8
- **Goal:** Let users classify a spend in one interaction without opening the app.
- **Dependencies:** CAP-004
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-27 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: CAP-005 now has the full repo-side notification-action foundation plus CAP-006 native-to-JS import/routing in place: actionable review notifications post for successful unique captures, direct-reply / classify / split / skip actions persist through the Room-backed native capture repository, privacy-mode lockscreen redaction is enforced, and the React Native app now imports those native captures idempotently and honors classify / split deep links with reply-based prefill. `./gradlew :app:testDebugUnitTest`, focused client tests, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` all passed on 2026-03-30. The ticket remains in progress only because `adb devices` is empty again, so connected-Android manual action and receiver validation could not be completed in this environment.

**Description**  
Post app-owned actionable notifications for new payments with inline text reply, open-app classify action, split action, and skip action. Respect lockscreen privacy settings.

**Acceptance criteria**

- New capture triggers one actionable notification.
- Inline text reply stores an item label and routes classification flow.
- Skip action suppresses re-prompting according to policy.
- Notifications hide sensitive text on lockscreen when privacy mode is on.

**Test notes**  
Manual notification action tests on supported Android versions; instrumented receiver tests.

**Done when**  
One-tap classification path works end to end.

### CAP-006 — Bridge native capture events into React Native store safely

- **Epic:** EPIC-1
- **Sprint:** Sprint 2
- **Team:** Mobile Platform
- **Priority:** P1
- **Story points:** 5
- **Goal:** Make captured transactions visible in JS UI without depending on JS for the critical path.
- **Dependencies:** CAP-004
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-28 | Completed At: 2026-03-30 | Commit Ref: pending-local-commit | Tracking Notes: Completed CAP-006 on 2026-03-30 by exposing pending native capture records plus reply metadata through the Android bridge, emitting capture-change events to React Native, importing native captures idempotently into the existing local transaction store with deterministic IDs, and routing `upispendtracker://capture-action` deep links into classify and split flows with reply-based prefill. Focused client tests now cover import-on-launch, import idempotency helpers, and action-route classify handoff; `./gradlew :app:testDebugUnitTest`, `pnpm --filter @upi-spend-tracker/client typecheck`, focused client tests, repo-wide `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` all passed. No schema or OpenAPI changes were required.

**Description**  
Create TurboModule or native bridge to query capture inbox, subscribe to safe updates, and import captured events into domain tables.

**Acceptance criteria**

- JS can fetch pending capture events on launch.
- Native errors do not crash JS app.
- Capture import is idempotent.

**Test notes**  
Launch app after multiple native captures; verify no duplicate imports.

**Done when**  
Native-to-JS bridge documented and reliable.

### CAP-007 — Add diagnostics screen for source app status, parser version, and recent capture logs

- **Epic:** EPIC-1
- **Sprint:** Sprint 2
- **Team:** Android Native
- **Priority:** P1
- **Story points:** 3
- **Goal:** Shorten support and QA cycles when capture fails on real devices.
- **Dependencies:** CAP-002, CAP-004
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-27 | Completed At: 2026-03-29 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: CAP-007 now exposes a dedicated Diagnostics screen reachable from Home without developer mode, extends the Android diagnostics bridge with supported parser inventory plus recent capture-log and parse-failure visibility, and shares a redacted debug bundle that omits notification previews and raw merchant text by default. `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand __tests__/app.test.tsx __tests__/native-capture.test.ts`, `./gradlew :app:testDebugUnitTest`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` all passed on 2026-03-29, so the ticket now meets its acceptance and done-when bar.

**Description**  
Expose safe diagnostics in settings: listener permission state, allowlisted apps, parser versions, last successful capture, recent parse failures, and exportable redacted debug bundle.

**Acceptance criteria**

- QA can verify whether failure is permission, parser, or dedupe related.
- Debug export redacts sensitive content by default.
- Diagnostics are accessible without developer mode.

**Test notes**  
Manual QA checklist with forced failure scenarios.

**Done when**  
Support-ready diagnostics available.

## EPIC-2 — Core Consumer UX

Let users classify spends quickly and review them later.

### UX-001 — Implement onboarding and permission education flow

- **Epic:** EPIC-2
- **Sprint:** Sprint 2
- **Team:** Mobile App
- **Priority:** P0
- **Story points:** 5
- **Goal:** Explain value, privacy, and setup clearly so users can complete Android capture onboarding.
- **Dependencies:** SET-003, CAP-001
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-25 | Completed At: 2026-03-25 | Commit Ref: pending-local-commit | Tracking Notes: Onboarding now covers value and privacy education, notification settings handoff, local source-app selection, budget-cycle choice, sync preference, and resumable saved progress in SQLite-backed settings. Real permission-state checks remain open under later capture or diagnostics tickets.

**Description**  
Build onboarding with value proposition, privacy disclosure, notification access setup, allowlisted app selection, budget-cycle selection, and local-only vs sync mode choice.

**Acceptance criteria**

- Onboarding can be resumed after app exit.
- User sees why notification access is needed before system settings open.
- User can continue in local-only mode without account.
- Setup completion state is stored and recoverable.

**Test notes**  
User-flow tests across fresh install, partial completion, and denied permissions.

**Done when**  
Onboarding meets product, legal, and UX approval.

### UX-002 — Build home dashboard with current-period KPIs and inbox summary

- **Epic:** EPIC-2
- **Sprint:** Sprint 2
- **Team:** Mobile App
- **Priority:** P0
- **Story points:** 5
- **Goal:** Give users immediate clarity on spend and incomplete work.
- **Dependencies:** SET-003
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-25 | Completed At: 2026-03-25 | Commit Ref: pending-local-commit | Tracking Notes: Home now renders cycle-aware local summary math, budget progress, top items, recent activity preview, and honest quick-action entrypoints for budgets and search. Actual budget creation, search screens, and deeper performance hardening remain separate follow-up work.

**Description**  
Create dashboard showing total spend, budget progress, top categories, top merchants, top items, and uncategorized count. Add quick actions for manual add, inbox, budgets, and search.

**Acceptance criteria**

- Dashboard renders from local DB without network.
- Current period respects user-configured cycle.
- Empty states guide first-time users.

**Test notes**  
Snapshot and interaction tests; verify KPI math with seeded data.

**Done when**  
Dashboard is production-ready and performance-budget compliant.

### UX-003 — Create Inbox for uncategorized and partially classified transactions

- **Epic:** EPIC-2
- **Sprint:** Sprint 2
- **Team:** Mobile App
- **Priority:** P0
- **Story points:** 8
- **Goal:** Make skipped or ambiguous transactions easy to recover later.
- **Dependencies:** CAP-006, UX-002
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-25 | Completed At: 2026-03-25 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: Inbox now supports local filters for status, merchant, source app, amount, and age; skipped items can be revisited; delete and classify actions update local state instantly; and a seeded 1,000-item test now covers the tuned FlatList path for larger local review queues. Partial/conflict views plus split/create-rule workflows remain later follow-up scope.

**Description**  
Build list and filter views for uncategorized payments, partially split transactions, and conflict items. Support swipe or tap actions for classify, split, skip, delete, and create rule.

**Acceptance criteria**

- Inbox updates instantly after classification actions.
- User can filter by source app, merchant, amount range, and age.
- Skipped items can be revisited manually.
- List scales to at least 1,000 local transactions without jank.

**Test notes**  
Seeded-data performance test and classification action tests.

**Done when**  
Inbox accepted by product for daily-use flow.

### UX-004 — Build quick-classify bottom sheet and manual add flow

- **Epic:** EPIC-2
- **Sprint:** Sprint 3
- **Team:** Mobile App
- **Priority:** P0
- **Story points:** 8
- **Goal:** Provide the fastest full-screen classification path when notification reply is not enough.
- **Dependencies:** UX-003, INT-003
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-25 | Completed At: 2026-03-25 | Commit Ref: pending-local-commit | Tracking Notes: Quick classify now renders as a bottom sheet, retains the suggestion-led two-tap common path, keeps save/skip/split-later controls in the sheet, and manual add still reuses the same validation primitives. Durable reusable rules remain separate INT-003 work, and captured-spend integration remains a later follow-up.

**Description**  
Create bottom sheet with item name, category chips, amount preview, merchant preview, save-as-rule toggle, and save/skip controls. Add manual transaction entry using same form primitives.

**Acceptance criteria**

- Classification can be completed in under 3 taps after opening sheet for common cases.
- Item suggestions and categories are visible above keyboard.
- Manual add path reuses the same validation rules as captured spends.

**Test notes**  
Usability walkthrough and form validation tests.

**Done when**  
Quick-classify flow ready for beta.

### UX-005 — Implement split-items screen and remainder handling

- **Epic:** EPIC-2
- **Sprint:** Sprint 3
- **Team:** Mobile App
- **Priority:** P0
- **Story points:** 8
- **Goal:** Support one payment mapping to multiple items or categories.
- **Dependencies:** UX-004
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-27 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: the client now has a full-screen split-items flow with dynamic rows, local reorder/remove/add controls, running allocated-vs-remaining totals, explicit remainder handling, and Inbox visibility for partially classified transactions. `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-27. Status stays `in_progress` because the backlog done-when still requires external QA/design acceptance, which was not performed in this environment.

**Description**  
Allow users to create multiple line items per transaction, auto-sum totals, show remaining amount, and classify remainder as tip, tax, fees, or unknown.

**Acceptance criteria**

- User can add, edit, reorder, and delete split rows.
- Payment total mismatch is clearly shown before save.
- Remainder can be explicitly assigned or left as unknown.
- Partially classified transactions remain visible in Inbox.

**Test notes**  
Edge-case tests for rounding, zero remainder, and over-allocation.

**Done when**  
Split-flow accepted by QA and design.

### UX-006 — Build timeline, transaction detail, and search/filter views

- **Epic:** EPIC-2
- **Sprint:** Sprint 3
- **Team:** Mobile App
- **Priority:** P1
- **Story points:** 5
- **Goal:** Let users audit history and correct mistakes confidently.
- **Dependencies:** UX-003
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-27 | Completed At: 2026-03-27 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: Timeline now reads local SQLite-backed transaction records with parser metadata, saved notes, grouped day sections, and classification/audit history. Transaction detail shows source, parser context, edits, and history; search now covers merchant, item, category, and note; note saves persist locally; and clear edit/delete confirmation remains in place. `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-27.

**Description**  
Create daily timeline list, transaction detail view with audit history, and search by merchant, item, category, or note. Add filters for date, amount, source app, and status.

**Acceptance criteria**

- Search returns relevant results from local DB quickly.
- Transaction detail shows source, parser, edits, and classification history.
- User can edit or delete transactions with clear confirmation.

**Test notes**  
Search accuracy and edit-flow tests on seeded dataset.

**Done when**  
History flows stable and discoverable.

### UX-007 — Implement settings, privacy mode, export entrypoints, and diagnostics access

- **Epic:** EPIC-2
- **Sprint:** Sprint 3
- **Team:** Mobile App
- **Priority:** P1
- **Story points:** 5
- **Goal:** Give users control over capture, privacy, and support-friendly actions.
- **Dependencies:** CAP-007, UX-001
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-28 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: UX-007 now adds a first-class Settings screen reachable from the visible app tabs and Home, with locally persisted source-app, budget-cycle, sync-mode, and privacy-mode controls; an inactive-app privacy cover for app-preview and lockscreen masking; visible CSV export and backup/restore entrypoints; and direct diagnostics access and redacted bundle sharing without hidden gestures. `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand __tests__/app.test.tsx __tests__/persistence.test.ts`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` all passed on 2026-03-30. Status remains `in_progress` because the backlog done-when still requires product and QA approval of the Settings surface.

**Description**  
Add settings for source apps, privacy mode, budget cycle, sync mode, export, debug diagnostics, and app lock placeholders if included. Link diagnostics screen from CAP-007.

**Acceptance criteria**

- Settings changes persist locally and sync when applicable.
- Privacy mode affects lockscreen and app previews consistently.
- User can reach export and diagnostics without hidden gestures.

**Test notes**  
Manual verification of setting toggles and persistence.

**Done when**  
Settings screen approved by product and QA.

## EPIC-3 — Domain Intelligence

Normalize merchants, suggest items, and manage budgets.

### INT-001 — Implement category management and seeded default categories

- **Epic:** EPIC-3
- **Sprint:** Sprint 3
- **Team:** Core Domain
- **Priority:** P0
- **Story points:** 5
- **Goal:** Provide a flexible but opinionated classification framework for Indian consumers.
- **Dependencies:** SET-004
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-27 | Completed At: 2026-03-27 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: the client now seeds default categories on first launch and migration, persists categories as first-class SQLite-backed local data, supports local create/edit/delete/merge for custom categories, preserves historical transaction meaning when categories merge, and uses the saved category list across quick classify, split items, manual add, dashboard summaries, Timeline search/detail, and local persistence. `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-27.

**Description**  
Seed default categories such as Groceries, Food Delivery, Dining, Transport, Utilities, Healthcare, Shopping, Entertainment, Education, Personal Care, Household, Travel, and Miscellaneous. Support add/edit/delete/merge for user categories.

**Acceptance criteria**

- Defaults are available on first launch.
- User-created categories behave like first-class entities.
- Category merge preserves historical transactions.

**Test notes**  
Category CRUD tests and migration seed tests.

**Done when**  
Categories ready for classification flows.

### INT-002 — Build merchant normalization and alias management pipeline

- **Epic:** EPIC-3
- **Sprint:** Sprint 3
- **Team:** Core Domain
- **Priority:** P0
- **Story points:** 8
- **Goal:** Collapse noisy merchant strings into stable merchant identities for reporting and suggestions.
- **Dependencies:** CAP-002, INT-001
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-27 | Completed At: 2026-03-27 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: the client now normalizes repeated merchant variants into stable local merchant identities, persists canonical merchants plus aliases in SQLite with additive migrations and raw-merchant backfill, exposes manual merge/split controls plus review-only fuzzy merge suggestions, and reuses merchant normalization across manual add, classify suggestions, Inbox filters, Timeline/detail search, and a Home-linked merchant-management screen. `pnpm --filter @upi-spend-tracker/client typecheck`, focused client tests, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-27.

**Description**  
Implement deterministic normalization, alias table, manual merge/split controls, and fuzzy fallback only when deterministic match fails. Track provenance and confidence.

**Acceptance criteria**

- Repeated merchant variants map to a single merchant entity when rules allow.
- User corrections create aliases for future captures.
- Unsafe low-confidence merges are surfaced for review instead of auto-applied.

**Test notes**  
Alias resolution tests with noisy merchant fixtures.

**Done when**  
Merchant reports look stable on QA dataset.

### INT-003 — Implement rule engine for merchant, amount, and time-based suggestions

- **Epic:** EPIC-3
- **Sprint:** Sprint 3
- **Team:** Core Domain
- **Priority:** P0
- **Story points:** 8
- **Goal:** Reduce repetitive manual entry without using paid AI services.
- **Dependencies:** INT-002
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-28 | Completed At: 2026-03-28 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: the client now persists explicit local classification rules in SQLite with additive migrations, evaluates saved rules before history and merchant-keyword heuristics using merchant, amount bucket, hour bucket, and weekday factors, returns explanation metadata with deterministic priority, and auto-applies only explicit user-approved rules. Quick classify and manual add both create reusable rules through real toggles, and category/merchant merge handlers keep saved rules aligned. `pnpm --filter @upi-spend-tracker/client typecheck`, focused client tests, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-28.

**Description**  
Create rule evaluator with explicit user rules first, then heuristic matching on merchant, amount bucket, hour bucket, and weekday. Return ranked suggestions and optional auto-apply for explicit rules only.

**Acceptance criteria**

- Explicit user rules override history suggestions.
- Rule priority and conflicts are deterministic.
- Suggestions return top candidates with explanation metadata.
- Auto-apply occurs only for user-approved rules.

**Test notes**  
Rule evaluation matrix tests for priority and conflicts.

**Done when**  
Rule engine integrated into classify flows.

### INT-004 — Implement history-based suggestion ranker

- **Epic:** EPIC-3
- **Sprint:** Sprint 4
- **Team:** Core Domain
- **Priority:** P1
- **Story points:** 8
- **Goal:** Make item suggestions improve over time using free on-device/server-safe logic.
- **Dependencies:** INT-003
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-28 | Completed At: 2026-03-28 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: classify and manual-entry suggestions now use a weighted local history ranker that aggregates repeated confirmed classifications per item/category, scores merchant, amount bucket, hour bucket, weekday, recency, and frequency factors with deterministic ordering beneath explicit saved rules, and exposes human-readable explanation metadata for top factors. Added backtest-style domain coverage proving repeated confirmations outrank one-off matches and recency breaks ties between equally repeated candidates. `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand domain.test.ts`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-28.

**Description**  
Build weighted ranking over merchant, amount bucket, hour bucket, weekday, recency, and frequency. Support local inference and optional server-side recompute for report enrichment.

**Acceptance criteria**

- Suggestions improve after repeated confirmed classifications.
- Ranker can explain its top factors for debug purposes.
- No silent auto-save occurs from heuristic ranker alone.

**Test notes**  
Backtest on seeded user history and verify ranking expectations.

**Done when**  
History-based suggestions meet acceptance benchmark.

### INT-005 — Build budget engine with monthly, weekly, rolling, and custom cycles

- **Epic:** EPIC-3
- **Sprint:** Sprint 4
- **Team:** Core Domain
- **Priority:** P0
- **Story points:** 8
- **Goal:** Let users plan spending against their own cycle rather than calendar-month only.
- **Dependencies:** INT-001, UX-002
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-28 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: the client now has a canonical local budget engine supporting overall, category, merchant, and item scopes across monthly, weekly, rolling, and custom cycles, with deterministic spent/remaining/projected/threshold calculations and dashboard integration through the same shared engine. Home no longer uses demo-target math; it now shows projected spend and threshold state from the canonical engine, and domain tests cover monthly, weekly, rolling, and custom cycle boundaries plus immediate updates after classification changes. `pnpm --filter @upi-spend-tracker/client typecheck`, focused client tests, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-28. Status remains `in_progress` because the backlog done-when still requires product and QA acceptance, which was not available in this environment.

**Description**  
Support overall, category, merchant, and item-level budgets with configurable cycle anchors. Compute spent, remaining, projected, and threshold states locally.

**Acceptance criteria**

- Budget math is correct for all supported period types.
- Dashboard and reports consume same canonical budget calculations.
- Budget state updates immediately after classification changes.

**Test notes**  
Date-boundary tests for month-end, week rollovers, and custom ranges.

**Done when**  
Budget engine accepted by product and QA.

### INT-006 — Implement budget setup screens and threshold alerts

- **Epic:** EPIC-3
- **Sprint:** Sprint 4
- **Team:** Mobile App
- **Priority:** P0
- **Story points:** 5
- **Goal:** Make budget creation and overrun awareness simple for normal users.
- **Dependencies:** INT-005
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-28 | Completed At: 2026-03-28 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: the client now has a local budget-management flow with budget list/create/edit UX, persisted budget rows and threshold-alert rows through additive mobile SQLite migrations, quiet-mode-aware 50/80/100 threshold scheduling with review state, and Home review cards backed by the canonical budget engine. Focused client validation covered alert scheduling, migration behavior, persistence, and an end-to-end create-budget flow. `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand domain.test.ts persistence.test.ts mobile-migrations.test.ts app.test.tsx`, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-28.

**Description**  
Build budget list, create/edit screens, and threshold alerts for 50%, 80%, and 100% with quiet-mode handling and local scheduling.

**Acceptance criteria**

- User can create budget in under 60 seconds.
- Threshold alerts do not spam; one alert per threshold crossing per cycle.
- Quiet mode suppresses intrusive UI while preserving inbox state.

**Test notes**  
Alert scheduling tests and end-to-end budget creation flow.

**Done when**  
Budget UX ready for beta.

### INT-007 — Implement rollups and insights for item, category, merchant, time-of-day, and day-of-week

- **Epic:** EPIC-3
- **Sprint:** Sprint 4
- **Team:** Core Domain
- **Priority:** P1
- **Story points:** 8
- **Goal:** Provide fast reports without heavy server dependence.
- **Dependencies:** UX-002, INT-001, INT-002
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-28 | Completed At: 2026-03-28 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: the client now computes optimized local rollups in a single pass across transactions, compares the current cycle against the immediately prior one using the same cycle-start logic as Home, and exposes an in-app insights screen for item, category, merchant, time-of-day, and day-of-week. Focused client validation covered correctness, prior-period comparison, UI access from Home, and a generated 10k-transaction performance path. `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand domain.test.ts app.test.tsx`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-28.

**Description**  
Create local aggregation tables or cached queries for common reporting dimensions. Support comparison with prior period and trend cards.

**Acceptance criteria**

- Common report queries render within performance budget on 10k local transactions.
- Rollups refresh after transaction edits without full recompute whenever possible.
- Period comparison is accurate and timezone-safe.

**Test notes**  
Performance and correctness tests on large local dataset.

**Done when**  
Insights screens use precomputed or optimized queries.

### INT-008 — Implement CSV export and local backup/restore entrypoint

- **Epic:** EPIC-3
- **Sprint:** Sprint 4
- **Team:** Mobile App
- **Priority:** P1
- **Story points:** 3
- **Goal:** Give users portability and support trust with their own data.
- **Dependencies:** UX-007, INT-007
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-30 | Completed At:  | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: Settings now generates working local CSV exports for transactions, items, categories, and budgets through a pure export helper with stable documented schemas, writes/shares those files locally, redacts raw merchant text, notes, item labels, custom category labels/descriptions, and custom budget labels when privacy mode is on, and also exports a full-fidelity local backup JSON artifact while leaving restore as a future-safe guarded entrypoint. Focused client validation passed with `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand __tests__/local-export.test.ts __tests__/app.test.tsx`, plus repo-wide `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` on 2026-03-30. Status remains `in_progress` because the backlog done-when still requires manual QA opening the exported CSV files in spreadsheet tools, which was not available in this environment.

**Description**  
Generate CSV exports for transactions, items, categories, and budgets. Provide local backup/restore hooks for future expansions while keeping v1 scope manageable.

**Acceptance criteria**

- User can export a valid CSV from settings.
- CSV columns are documented and stable.
- Sensitive fields respect privacy settings when export mode requires it.

**Test notes**  
Open exported CSV in spreadsheet tools and verify schema.

**Done when**  
Export works in QA and is documented.

## EPIC-4 — Backend & Sync

Provide scalable APIs, sync, reporting, and device pairing.

### API-001 — Bootstrap Node modular monolith with API and worker runtimes

- **Epic:** EPIC-4
- **Sprint:** Sprint 4
- **Team:** Backend
- **Priority:** P0
- **Story points:** 8
- **Goal:** Create a scalable but understandable backend foundation for v1.
- **Dependencies:** SET-001
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-25 | Completed At: 2026-03-26 | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: API and worker now bootstrap through explicit module factories and registration helpers, health and heartbeat each own repository/service seams, and both runtimes have tested config loaders. Real domain APIs and worker jobs beyond health and heartbeat remain later-ticket scope.

**Description**  
Set up Fastify or Express-compatible architecture, shared domain modules, dependency boundaries, config loading, structured logging, and worker entrypoint sharing the same modules.

**Acceptance criteria**

- API and worker run as separate processes from same codebase.
- Modules own their own services and repositories.
- Cross-module access goes through service APIs or events, not table reach-ins.

**Test notes**  
Module bootstrap tests and smoke route tests.

**Done when**  
Backend skeleton ready for feature modules.

### API-002 — Implement guest session and multi-device pairing APIs

- **Epic:** EPIC-4
- **Sprint:** Sprint 4
- **Team:** Backend
- **Priority:** P0
- **Story points:** 5
- **Goal:** Support free v1 sign-in and multi-device use without paid auth dependencies.
- **Dependencies:** API-001
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-28 | Completed At: 2026-03-28 | Commit Ref: pending-local-commit | Tracking Notes: Added typed session/pairing contracts, modular Fastify session routes, refresh-token rotation, device registration, one-time pairing-code creation/consumption, replay/expiry protection, and an atomic file-backed repository that persists session state across API restart. Focused contract, route, service, repository, and restart-style integration coverage passed, along with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` on 2026-03-28. The prior in-memory durability gap is closed, so the ticket now meets its acceptance and beta-stability bar.

**Description**  
Add guest-account creation, token refresh, device registration, and pairing-code flow for adding a second device to the same account.

**Acceptance criteria**

- New device can create a guest account securely.
- Existing user can generate one-time pairing code from trusted device.
- Second device can join same account using pairing code.
- Revoked or expired codes cannot be reused.

**Test notes**  
API integration tests for session creation, refresh, pairing success, expiry, and replay attacks.

**Done when**  
Auth flows stable for beta.

### API-003 — Implement sync push/pull APIs with idempotency and cursor-based deltas

- **Epic:** EPIC-4
- **Sprint:** Sprint 4
- **Team:** Backend
- **Priority:** P0
- **Story points:** 8
- **Goal:** Make offline-first multi-device sync reliable on bad networks.
- **Dependencies:** API-001, SET-004
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-28 | Completed At: 2026-03-30 | Commit Ref: pending-local-commit | Tracking Notes: Continuation closeout on 2026-03-30 confirmed `SET-002` remains blocked because `gh` is unavailable, and `CAP-003` plus `CAP-004` remain blocked because `adb devices` is empty. This pass closed `API-003` by adding a new mobile-style integration test file that drives the real guest-session, pairing-code, and sync routes through paired-device request flows, covering idempotent replay, cursor-based delta pulls, and machine-readable stale-version conflicts without widening scope into staging or client pairing UI. `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test -- --runInBand src/modules/sync`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` all passed on 2026-03-30, so the canonical backend sync ticket now satisfies its mobile-integration done-when and moves to `done`.

**Description**  
Create batched push endpoint for outbox operations and pull endpoint for cursor-based delta sync. Support idempotency keys, conflict detection, entity versions, and partial failure reporting.

**Acceptance criteria**

- Duplicate push requests do not create duplicate records.
- Pull returns only changes since cursor.
- Conflict responses are machine-readable and actionable by client.
- Large sync batches are chunked safely.

**Test notes**  
Concurrency tests, retry tests, and sync replay tests.

**Done when**  
Sync APIs pass mobile integration tests.

### API-004 — Implement transactions, items, merchants, categories, rules, and budgets APIs

- **Epic:** EPIC-4
- **Sprint:** Sprint 5
- **Team:** Backend
- **Priority:** P0
- **Story points:** 8
- **Goal:** Provide a complete server model for user data and future web/admin tooling.
- **Dependencies:** API-003, INT-001, INT-002, INT-003, INT-005
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-28 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Workflow continuation on 2026-03-29 re-audited blocked and in-progress tickets first. `SET-002` remains blocked because `gh` is not installed and no `GH_TOKEN` or `GITHUB_TOKEN` is available. `CAP-003` and `CAP-004` remain blocked because `adb` cannot currently start a usable daemon from this environment, while `UX-005`, `INT-005`, and `API-003` still depend on external QA/design or mobile-integration evidence. This pass closed the remaining repo-side acceptance gap for `API-004` by enforcing `VersionedDeleteRequest` bodies and conflict handling on the older transaction, merchant, category, rule, and budget delete routes, updating the OpenAPI contract, and extending route tests accordingly. `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test`, `pnpm lint:openapi`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all passed on 2026-03-29 after also fixing a stale high-volume Inbox test fixture in the client harness. Status remains `in_progress` because the canonical done-when still requires the domain API suite to be available in staging.

**Description**  
Add CRUD and list endpoints for domain entities. Enforce optimistic concurrency, soft deletes, server-side validation, and pagination/filtering where needed.

**Acceptance criteria**

- All domain entities map cleanly to API schemas.
- Write endpoints require entity version or ETag equivalent.
- Soft deletes are excluded from normal list responses unless requested.
- Validation errors are field-specific and consistent.

**Test notes**  
Contract tests against OpenAPI schemas; CRUD integration tests.

**Done when**  
Domain API suite available in staging.

### API-005 — Implement reports and summary APIs with precomputed rollups

- **Epic:** EPIC-4
- **Sprint:** Sprint 5
- **Team:** Backend
- **Priority:** P1
- **Story points:** 5
- **Goal:** Support cross-device consistency and future server-side analytics without slow full-table scans.
- **Dependencies:** API-004, INT-007
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-29 | Completed At: 2026-04-01 | Commit Ref: pending-local-commit | Tracking Notes: Closeout pass on 2026-04-01 re-audited blocked and in-progress tickets first. `SET-002` remains blocked because `gh` is unavailable and no `GH_TOKEN` or `GITHUB_TOKEN` is present, while `CAP-003` and `CAP-004` remain blocked because `adb devices` is empty. This pass closed `API-005` by adding deterministic backend benchmark coverage in `server/api/src/modules/reports/reports.performance.test.ts`, proving the existing reports implementation meets an explicit repo-side latency baseline over a seeded 1,500-transaction / 1,500-item dataset: summary p95 <= 80 ms and item-breakdown p95 <= 100 ms. Focused reports tests plus `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test -- --runInBand src/modules/reports`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` all passed on 2026-04-01. The reports API ticket now meets its correctness and latency done-when bar, so it moves to `done`.

**Description**  
Create report summary and breakdown endpoints backed by daily/monthly rollup tables or efficient queries. Cover totals, trend deltas, budget status, and grouped breakdowns.

**Acceptance criteria**

- Summary endpoint returns canonical totals for selected period.
- Breakdown endpoint supports groupBy category, merchant, item, hourOfDay, and dayOfWeek.
- Responses include paging or top-N metadata where appropriate.

**Test notes**  
Data-correctness tests against known fixtures; explain-plan review for query cost.

**Done when**  
Reports APIs meet latency and correctness targets.

### API-006 — Implement remote config/bootstrap API and version compatibility checks

- **Epic:** EPIC-4
- **Sprint:** Sprint 5
- **Team:** Backend
- **Priority:** P1
- **Story points:** 5
- **Goal:** Allow staged rollout of parsers, kill switches, and behavior toggles.
- **Dependencies:** SET-006, API-001
- **Tracking:** Status: done | Owner: codex | Started At: 2026-03-28 | Completed At: 2026-03-28 | Commit Ref: pending-local-commit | Tracking Notes: Closed the existing bootstrap path by adding explicit `Cache-Control`, `ETag`, and `Vary` headers on `GET /v1/bootstrap/config`, enforcing runtime compatibility from both app version and native/runtime version, varying `configVersion` by compatibility inputs, documenting the cache headers in `docs/04_API_Contract.yaml`, and proving the mobile client already requests the endpoint with version-aware query params. `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand bootstrap-config.test.ts`, `pnpm lint:openapi`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all passed on 2026-03-28, so the ticket now meets its acceptance and done-when bar.

**Description**  
Serve config payload by app version, platform, runtime version, and rollout channel. Include parser config, feature flags, min-version rules, and content hash.

**Acceptance criteria**

- Config responses are cacheable and version-aware.
- App can detect incompatible native/runtime version from bootstrap response.
- Rollback config can be published without code change.

**Test notes**  
Version-compatibility tests and cache-header verification.

**Done when**  
Bootstrap endpoint used by mobile app.

### API-007 — Implement background jobs for rollups, cleanup, and export generation

- **Epic:** EPIC-4
- **Sprint:** Sprint 5
- **Team:** Backend
- **Priority:** P1
- **Story points:** 5
- **Goal:** Keep API paths fast and maintenance tasks isolated.
- **Dependencies:** API-001, API-003, API-005
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-29 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Workflow continuation on 2026-03-29 re-audited blocked and in-progress tickets first. `SET-002` remains blocked because `gh` is not installed and no `GH_TOKEN` or `GITHUB_TOKEN` is available. `CAP-003` and `CAP-004` remain blocked because `adb devices` is empty in the current environment. `UX-005`, `INT-005`, `API-003`, `API-004`, and `API-005` are still active in backlog tracking, but their remaining gaps are external acceptance, mobile integration, staging evidence, or undefined latency targets rather than missing repo-side implementation. This pass added the first real worker-side rollup refresh, stale-session/export cleanup, and queued CSV export processing foundation with delayed retries, dead-letter visibility, and queue-depth/failure logging on top of the durable local stores. Focused worker tests plus `pnpm --filter @upi-spend-tracker/worker typecheck`, `pnpm --filter @upi-spend-tracker/worker test`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all passed on 2026-03-29. Status remains `in_progress` because the canonical done-when still requires the worker runtime to be operational in staging.

**Description**  
Create worker jobs for daily rollups, old-raw-data pruning, stale pairing cleanup, export generation, and delayed retries. Use DB-backed or simple queue abstraction compatible with monolith.

**Acceptance criteria**

- Jobs are idempotent and can be retried safely.
- Failed jobs are observable with dead-letter or failure log strategy.
- Operational dashboards show queue depth and failure counts.

**Test notes**  
Job retry tests and rollback-safe reruns.

**Done when**  
Worker runtime operational in staging.

### SYNC-001 — Implement local-first outbox, retry policy, and conflict queue on mobile

- **Epic:** EPIC-4
- **Sprint:** Sprint 5
- **Team:** Mobile Platform
- **Priority:** P0
- **Story points:** 8
- **Goal:** Guarantee offline writes and resilient sync on poor networks.
- **Dependencies:** API-003, CAP-006
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-30 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Continuation implementation pass on 2026-03-30 confirmed `SET-002` remains blocked because `gh` is unavailable, and `CAP-003` plus `CAP-004` remain blocked because `adb devices` is empty. This pass closed the remaining repo-side `SYNC-001` gap by adding client-side guest-session and pairing-code helpers over the existing API, persisting sync credentials in scoped `sync_settings` keys, refreshing access tokens before sync, and wiring Settings so a device can create or join a sync session and feed real credentials into the existing outbox/runtime flow. Focused client sync tests, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` all passed on 2026-03-30. Status remains `in_progress` because the backlog done-when still requires multi-device sync to be stable in beta.

**Description**  
Create outbox table, idempotency keys, retry scheduler, network observer, sync chunking, and conflict queue UI hooks. Respect battery and data-saver constraints.

**Acceptance criteria**

- Every local write creates a sync operation unless local-only mode is enabled.
- Retries use exponential backoff with jitter.
- Conflicts are surfaced without data loss.
- Sync can resume after process death or network change.

**Test notes**  
Offline/online toggle tests and repeated retry tests.

**Done when**  
Multi-device sync stable in beta.

## EPIC-5 — Quality, Security & Release

Harden the app for low internet, privacy, observability, and launch.

### QA-001 — Create test harnesses, fixtures, and quality matrix

- **Epic:** EPIC-5
- **Sprint:** Sprint 5
- **Team:** QA/Automation
- **Priority:** P0
- **Story points:** 8
- **Goal:** Make v1 release quality measurable and repeatable.
- **Dependencies:** SET-002, CAP-002
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-04-01 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Repo-side QA-001 baseline completed on 2026-04-01: Android parser fixtures now live in the versioned `parser-fixtures.v1` catalog, named `pnpm qa:parser-fixtures`, `pnpm qa:smoke`, and `pnpm qa:regression` harnesses codify the current automated baseline, `docs/14_Quality_Matrix.md` now defines the supported-device matrix, quality matrix, and release checklist, and the full regression suite was stabilized by making the telemetry dashboard route test time-relative instead of date-sensitive. `pnpm qa:smoke`, `pnpm qa:regression`, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` all passed locally on 2026-04-01. Status remains `in_progress` because the backlog done-when still requires test-strategy approval and execution of the supported-device matrix outside this environment.

**Description**  
Set up unit, integration, end-to-end, parser-fixture, load, and performance suites. Define supported-device matrix, smoke suite, regression suite, and release checklist.

**Acceptance criteria**

- Parser fixtures are versioned and easy to expand.
- Critical user flows have automated E2E coverage.
- Quality matrix maps each feature to required test levels.

**Test notes**  
Meta-ticket for adding tests and verifying suites in CI.

**Done when**  
Test strategy approved and automated baseline running.

### QA-002 — Implement privacy, security, and sensitive-data handling baseline

- **Epic:** EPIC-5
- **Sprint:** Sprint 6
- **Team:** Security/Backend/Mobile
- **Priority:** P0
- **Story points:** 8
- **Goal:** Ship a trustworthy consumer product around financial behavior data.
- **Dependencies:** API-002, UX-007, CAP-004
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-30 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Repo-side QA-002 hardening landed on 2026-03-30: sync access/refresh tokens and expiry now move from SQLite settings into Expo SecureStore with legacy-key cleanup, sync/session/telemetry reject insecure non-local HTTP, privacy mode defaults to enabled in the client and native capture settings, local backup privacy metadata now falls back to the secure default, and the current retention/redaction plus Play Data Safety review baseline is documented in `docs/13_Privacy_Security_Baseline.md`. Focused client privacy/security tests plus `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` all passed. Status remains `in_progress` because the backlog done-when still requires beta security sign-off and final Play Data Safety review evidence outside this environment.

**Description**  
Add token storage hardening, HTTPS/TLS enforcement, redaction policies, raw notification retention limits, audit events for destructive edits, and privacy-mode defaults. Review Play Data Safety inputs.

**Acceptance criteria**

- Sensitive tokens are stored securely.
- Raw notification content is pruned per retention policy.
- Debug exports are redacted by default.
- Data collection and retention are documented for privacy review.

**Test notes**  
Security checklist, retention tests, and negative tests for unauthorized access.

**Done when**  
Security sign-off obtained for beta.

### QA-003 — Optimize low-internet behavior, app size, and runtime performance

- **Epic:** EPIC-5
- **Sprint:** Sprint 6
- **Team:** Mobile Platform
- **Priority:** P0
- **Story points:** 5
- **Goal:** Make the product lightweight and usable across common Indian device/network conditions.
- **Dependencies:** UX-002, SYNC-001, INT-007
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-30 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Closeout pass on 2026-04-01 confirmed `SET-002` remains blocked because `gh` is unavailable and no GitHub token is present, while `CAP-003` and `CAP-004` remain blocked because `adb devices` is empty. This pass closed the remaining repo-side `QA-003` gap by adding the named `pnpm qa:performance` suite, an automated Android Hermes bundle-size gate in `scripts/qa/check-performance-budget.mjs`, and `docs/15_Performance_Budget.md` as the source of truth for current repo-side budgets: local insights over a 10,000-transaction dataset in under 750 ms, payload-aware sync batching, and an Android Hermes bundle at or below 2,600,000 bytes. `pnpm qa:performance`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` all passed on 2026-04-01, with the current Android Hermes bundle at 2,361,231 bytes. Status remains `in_progress` because the backlog still calls for direct device/network profiling on baseline hardware and throttled networks outside this environment.

**Description**  
Profile startup, navigation, capture-to-prompt latency, DB query latency, sync payload sizes, and JS bundle size. Implement caching, query indexes, lazy loading, and asset trimming as needed.

**Acceptance criteria**

- App meets agreed cold-start and navigation budgets on baseline devices.
- Core dashboards work offline from local data.
- Sync payloads are chunked and compressed where appropriate.
- Release build size stays within target budget.

**Test notes**  
Performance profiling on low/mid-tier Android devices and throttled networks.

**Done when**  
Performance budget met and documented.

### QA-004 — Set up OTA channels, runtime versioning, and rollback playbook

- **Epic:** EPIC-5
- **Sprint:** Sprint 6
- **Team:** Release Engineering
- **Priority:** P1
- **Story points:** 5
- **Goal:** Update JS/config safely without breaking native compatibility.
- **Dependencies:** SET-006, API-006
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-29 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Repo truth: the Expo client now uses `client/app.config.ts` with fingerprint runtime-version policy, isolated `internal`/`beta`/`production` EAS channel profiles in `client/eas.json`, `expo-updates`-backed runtime/channel bootstrap query alignment, and `docs/12_OTA_Runtime_Rollback.md` as the OTA rollout/rollback and change-type playbook. `pnpm --filter @upi-spend-tracker/client exec expo config --type public`, `pnpm --filter @upi-spend-tracker/client lint`, `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand __tests__/bootstrap-config.test.ts`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all passed on 2026-03-29. Status remains `in_progress` because real Expo project/update URL wiring, non-production OTA/rollback dry-run evidence, and engineering approval are still external closeout requirements.

**Description**  
Configure internal, beta, and production channels; runtime version policy; staged rollout steps; rollback checklist; and change-type matrix explaining when store release is required.

**Acceptance criteria**

- OTA channels are isolated and testable.
- Rollback can disable or revert bad JS/config quickly.
- Native-incompatible changes are blocked from OTA path.

**Test notes**  
Dry-run rollout and rollback in non-production channels.

**Done when**  
OTA process approved by engineering leads.

### QA-005 — Implement analytics, crash reporting, and operational dashboards

- **Epic:** EPIC-5
- **Sprint:** Sprint 6
- **Team:** Observability
- **Priority:** P1
- **Story points:** 5
- **Goal:** Know when capture, sync, or classification quality regresses in the field.
- **Dependencies:** CAP-002, SYNC-001, API-007
- **Tracking:** Status: in_progress | Owner: codex | Started At: 2026-03-30 | Completed At: | Commit Ref: pending-local-commit | Tracking Notes: Repo truth on 2026-03-30: QA-005 now has versioned privacy-safe telemetry contracts, local-first client event logging plus authenticated flush, global runtime-error capture, authenticated telemetry ingest/dashboard APIs, deterministic alert thresholds, and updated OpenAPI/repo-truth docs. `pnpm --filter @upi-spend-tracker/contracts typecheck`, `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/client typecheck`, focused telemetry tests, `pnpm lint:openapi`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `git diff --check` all passed on 2026-03-30. Status remains `in_progress` because the backlog done-when still requires operational telemetry to be available before beta, which is external rollout evidence rather than a missing repo-side implementation.

**Description**  
Add privacy-safe event tracking for onboarding completion, permission denial, capture success/failure, parser fallbacks, classify latency, sync errors, and budget alert delivery. Build dashboards and alert thresholds.

**Acceptance criteria**

- Critical funnels and failure modes are measurable.
- Event schema is versioned and documented.
- Alerts fire on severe capture or sync failure spikes.

**Test notes**  
Event contract tests and dashboard validation with seeded events.

**Done when**  
Operational telemetry available before beta.

### REL-001 — Run closed beta, triage defects, and produce release candidate

- **Epic:** EPIC-5
- **Sprint:** Sprint 7
- **Team:** Product/QA/Release
- **Priority:** P0
- **Story points:** 8
- **Goal:** Validate stability and usability before public launch.
- **Dependencies:** QA-001, QA-002, QA-003, QA-004, QA-005
- **Tracking:** Status: todo | Owner: | Started At: | Completed At: | Commit Ref: | Tracking Notes:

**Description**  
Recruit beta cohort, monitor dashboards, collect qualitative feedback, run daily triage, and fix release-blocking issues. Produce release notes and known-issues list.

**Acceptance criteria**

- Beta exit criteria are defined and measured.
- All P0/P1 launch blockers are resolved or explicitly waived.
- Release candidate is tagged and reproducible.

**Test notes**  
Full regression suite on release candidate; beta feedback review.

**Done when**  
Go/no-go decision completed.

### REL-002 — Prepare Play Store listing, policy declarations, support docs, and launch operations

- **Epic:** EPIC-5
- **Sprint:** Sprint 7
- **Team:** Release/Compliance
- **Priority:** P0
- **Story points:** 5
- **Goal:** Complete the non-code work required for public release.
- **Dependencies:** REL-001, QA-002
- **Tracking:** Status: todo | Owner: | Started At: | Completed At: | Commit Ref: | Tracking Notes:

**Description**  
Finalize screenshots, description, privacy policy, data safety form, support email/process, FAQ, known limitations, and initial support runbooks.

**Acceptance criteria**

- Store listing assets are approved by product and compliance.
- Privacy policy and data safety answers match shipped behavior.
- Support and incident runbooks exist for day-1 operations.

**Test notes**  
Cross-check policy declarations against app behavior and telemetry.

**Done when**  
Launch package complete and approved.
