# UPI Spend Tracker

Android-first v1 scaffold for a consumer UPI spend tracker. The repo now includes an Expo mobile shell with resumable onboarding, a cycle-aware local SQLite-backed dashboard, filtered Inbox/classify and manual-add flows, a local merchant-normalization and alias-management pipeline, reusable rules plus a weighted history-based suggestion ranker, a canonical local budget engine with local budget setup and quiet-mode threshold alerts, optimized local insights with prior-period comparison, an Android-native notification-listener foundation, a Fastify API surface for bootstrap/sessions/sync/domain/reports, a worker runtime with heartbeat plus rollup/cleanup/export jobs, shared TypeScript packages, and synchronized backlog tracking.

## Repository Layout

- `client`: Expo + React Native app scaffold
- `server/api`: Fastify API runtime
- `server/worker`: Node.js worker runtime
- `packages/contracts`: shared API DTOs
- `packages/mobile-ui`: shared mobile design-system tokens and UI primitives
- `packages/shared-types`: type-only shared primitives and interfaces
- `packages/shared-utils`: runtime-safe shared helpers
- `packages/eslint-config`: shared flat ESLint config
- `packages/tsconfig`: shared TypeScript presets
- `docs`: product, engineering, contract, backlog, and release docs

## Prerequisites

- Node.js 22 LTS compatible runtime (`>=22 <25`)
- `pnpm` 10.x
- Android Studio with an emulator, or a connected Android device with USB debugging enabled
- Android SDK available locally, with `ANDROID_HOME` pointing to it when your install is not in the default path
- Xcode plus an iOS Simulator when running the iOS shell locally

## Bootstrap

```bash
pnpm install
pnpm db:validate
pnpm lint
pnpm lint:openapi
pnpm typecheck
pnpm test
pnpm build
```

## Pre-PR Verification

Run the same checks that CI expects before opening or updating a pull request:

```bash
pnpm db:validate
pnpm lint
pnpm lint:openapi
pnpm typecheck
pnpm test
pnpm build
```

`pnpm ci:verify` runs the canonical non-OpenAPI quality gates, including `pnpm db:validate`, in the same order as the `Verify` GitHub Actions job.

## Run The Runtimes

```bash
pnpm dev:client
pnpm dev:android
pnpm dev:ios
pnpm dev:api
pnpm dev:worker
```

`pnpm dev:client` starts the Expo Metro server. `pnpm dev:android` builds and installs the Android development build on an emulator or connected device. `pnpm dev:ios` builds and launches the iOS shell in Simulator. `pnpm dev:api` boots the API on port `3000` by default with `GET /health`. `pnpm dev:worker` starts the worker and emits an initial heartbeat log.

If `pnpm dev:android` cannot find your SDK, export `ANDROID_HOME` and ensure `adb` is on your shell `PATH`.
If `pnpm dev:ios` cannot launch, verify Xcode, Command Line Tools, CocoaPods, and at least one iOS Simulator runtime are installed.

## Expo Go vs Dev Build

This client targets Expo SDK 55 and checked-in Android native code. Use development builds for local device testing instead of Expo Go.

- `pnpm dev:client` starts Metro
- `pnpm dev:android` compiles and launches the Android development build
- `pnpm dev:ios` compiles and launches the iOS shell development build

Expo Go may show an SDK compatibility error for this project even when the store app is up to date. That is expected during Expo Go rollout gaps and is not the supported workflow for this repo.

## Platform Scope

Android remains the primary platform and the only platform planned for notification capture in v1.

- Android: development builds plus Android-native capture work
- iOS: app-shell development and UI verification only

The iOS shell is supported for development, but iOS payment notification capture and parity with Android native flows remain out of scope for v1.

## Pull Request Workflow

GitHub Actions runs these required pull-request checks:

- `Scope`
- `PR Title`
- `OpenAPI`
- `Verify`

PR titles must use Conventional Commits format:

- `feat(set-002): add pr quality gates`
- `fix(api): tighten health response typing`
- `docs(readme): document ci verification`

Branch-protection expectations and the exact required check names are documented in `docs/08_CI_Branch_Protection.md`.

## Contributor Guidance

- `AGENTS.md`: repo conventions, safety rules, and quality expectations for contributors and coding agents
- `PLANS.md`: execution-plan template plus implementation-history log
- `docs/09_Project_Phase_Status.md`: repo-truth audit of what is done and what remains by sprint
- `docs/10_Codex_Workflow.md`: single-ticket delivery loop for audit, selection, implementation, validation, and truthful tracking updates
- `docs/11_Database_Migrations.md`: migration commands, seed strategy, validation behavior, and rollback/forward-fix guidance
- `docs/12_OTA_Runtime_Rollback.md`: OTA channel configuration, runtime-version policy, rollout steps, and rollback/change-type matrix

Within a continuing Codex thread for this repo, a user message of `next` means rerun the single-ticket workflow documented in `docs/10_Codex_Workflow.md`.

## Current Scope

- Android-first onboarding now includes notification education, source-app selection, budget-cycle choice, sync preference, signed remote bootstrap config status with runtime-compatibility messaging, and a cycle-aware local dashboard with budget progress, top items, recent activity, a filtered Inbox, bottom-sheet quick classify, skipped-item recovery, and manual spend entry
- Mobile UI foundations now live in `@upi-spend-tracker/mobile-ui`, and Home links to a design-system showcase screen that demonstrates the shared primitives in light and dark themes
- Android dev builds now include a native notification-listener service, per-app allowlist sync, a Room-backed native capture repository with legacy migration, raw snapshot persistence, auditable parser-registry output with package-specific and generic fallback parsers, app-owned actionable review notifications with direct reply plus classify / split / skip persistence, a dedicated in-app diagnostics screen with supported parser inventory plus recent parse failures/logs, redacted debug-bundle sharing, dedupe counters/threshold diagnostics in the Android bridge/UI, and a safe native-to-JS capture bridge that imports pending native captures into local transactions with deterministic IDs and routes classify / split action deep links into the existing review flows. The remaining Android closeout work is now connected-device manual validation for the notification-action path, and that is currently blocked by unstable device availability/install policy in this environment
- Home now includes quick-action entrypoints for budgets, insights, history search, local category management, local merchant management, and visible Settings access; Inbox supports local status, merchant, source-app, amount, and age filters plus skip/delete actions on a FlatList path validated against a seeded 1,000-item local queue; quick classify runs in a bottom sheet with explicit suggestion chips plus reusable-rule and auto-apply toggles; split items now opens a full-screen local editor with running totals, remainder handling, and partial-save visibility in Inbox; Timeline adds grouped local history, search/filter chips, transaction detail with parser context plus saved notes and classification/audit history, and the client now reuses deterministic local classification rules, a weighted history ranker, a canonical local budget engine with monthly, weekly, rolling, and custom-cycle math, optimized local insights that compare the current cycle with the prior one across item, category, merchant, time-of-day, and day-of-week, and a first-class Settings screen for source apps, privacy mode, sync/budget defaults, working local CSV exports, a local backup export hook, and diagnostics access. Dedicated rule-management screens, restore import, and the mobile sync client/outbox still arrive in later tickets
- Onboarding, classified spends, manual entries, and imported native capture transactions persist on device through local SQLite tables with ordered migrations and root-level DB validation; the mobile sync client/outbox is still pending
- Backend skeleton now boots API and worker runtimes through explicit module factories, tested env loaders, and service/repository seams; `GET /health`, a cacheable signed `GET /v1/bootstrap/config` endpoint with runtime-version compatibility checks, guest-session/device-pairing APIs, first authenticated sync push/pull APIs, an expanded authenticated domain API slice for transactions, transaction items, merchants, categories, rules, and budgets, first authenticated reports summary/breakdown APIs, and the first worker-side rollup / cleanup / export-job foundation are live. Durable on-disk session, pairing, sync, domain, export-job, and worker-rollup persistence now back the current local server runtime. Staging availability, reports latency certification, and mobile-integrated sync flows are still pending
- Worker runtime now schedules heartbeat, reports-rollup refresh, stale-session/export cleanup, and queued CSV export processing with delayed retries plus queue-depth/failure logging; a user-facing export request/status API and staging worker operations are still pending
- The client now has repo-side OTA build-channel config for `internal`, `beta`, and `production`, Expo fingerprint runtime-version policy, and a documented rollback/change-type playbook. Real EAS project wiring and engineering approval are still pending, so OTA remains intentionally disabled unless `EXPO_EAS_PROJECT_ID` or `EXPO_UPDATES_URL` is provided in the build environment
- No deployment CI, analytics providers, or full native capture domain-import pipeline yet

## CSV Export Schemas

- `transactions.csv`: `transaction_id`, `privacy_redacted`, `captured_at_utc`, `source_app_id`, `status`, `amount_minor`, `item_count`, `classified_amount_minor`, `unresolved_amount_minor`, `merchant_display`, `merchant_raw`, `merchant_id`, `merchant_match_kind`, `merchant_confidence_bps`, `note`, `parser_id`, `parser_version`, `parser_confidence_bps`, `history_entry_count`
- `items.csv`: `item_id`, `transaction_id`, `privacy_redacted`, `captured_at_utc`, `source_app_id`, `transaction_status`, `merchant_display`, `category_id`, `category_label`, `item_label`, `amount_minor`, `sort_order`
- `categories.csv`: `category_id`, `privacy_redacted`, `label`, `description`, `is_default`, `transaction_count`, `item_count`
- `budgets.csv`: `budget_id`, `privacy_redacted`, `label`, `scope`, `period`, `target_minor`, `spent_minor`, `remaining_minor`, `projected_spend_minor`, `threshold_state`, `cycle_start_utc`, `cycle_end_utc`, `matched_transaction_count`, `matched_item_count`, `category_id`, `category_label`, `merchant_id`, `merchant_label`, `item_label`, `starts_on_day`, `week_starts_on`, `rolling_window_days`, `created_at_utc`, `updated_at_utc`
- When privacy mode is on, CSV exports redact raw merchant text, free-text notes, item labels, custom category labels/descriptions, and custom budget labels before sharing. Local backup JSON export intentionally keeps full-fidelity device state for future restore work.

## Backlog Tracking Convention

Backlog status is tracked in `docs/05_Backlog.md`, `docs/05_Backlog.csv`, and `docs/05_Backlog.json` using:

- `status`: `todo`, `in_progress`, `blocked`, `done`
- `owner`
- `started_at`
- `completed_at`
- `commit_ref`
- `tracking_notes`

Tracking updates must be applied to all three backlog files in the same change set.
