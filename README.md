# UPI Spend Tracker

Android-first v1 scaffold for a consumer UPI spend tracker. The repo now includes an Expo mobile shell with resumable onboarding, a cycle-aware local SQLite-backed dashboard, filtered Inbox/classify and manual-add flows, an Android-native notification-listener foundation, a Fastify health API, a stub worker heartbeat, shared TypeScript packages, and synchronized backlog tracking.

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

Within a continuing Codex thread for this repo, a user message of `next` means rerun the single-ticket workflow documented in `docs/10_Codex_Workflow.md`.

## Current Scope

- Android-first onboarding now includes notification education, source-app selection, budget-cycle choice, sync preference, signed remote bootstrap config status, and a cycle-aware local dashboard with budget progress, top items, recent activity, a filtered Inbox, bottom-sheet quick classify, skipped-item recovery, and manual spend entry
- Mobile UI foundations now live in `@upi-spend-tracker/mobile-ui`, and Home links to a design-system showcase screen that demonstrates the shared primitives in light and dark themes
- Android dev builds now include a native notification-listener service, per-app allowlist sync, a Room-backed native capture repository with legacy migration, raw snapshot persistence, auditable parser-registry output with package-specific and generic fallback parsers, and dedupe counters/threshold diagnostics in the Android bridge/UI; spend-domain import is still pending, and the remaining connected-Android closeout work is currently blocked because the attached device still cancels debug APK installation with `INSTALL_FAILED_USER_RESTRICTED`
- Home now includes quick-action entrypoints for budgets and search, while Inbox supports local status, merchant, source-app, amount, and age filters plus skip/delete actions on a FlatList path validated against a seeded 1,000-item local queue; quick classify runs in a bottom sheet with explicit suggestion chips and a save-as-rule intent toggle; and split items now opens a full-screen local editor with running totals, remainder handling, and partial-save visibility in Inbox. Budget creation, search/history, and durable rule screens still arrive in later tickets
- Onboarding, classified spends, and manual entries persist on device through local SQLite tables with ordered migrations and root-level DB validation; sync and native capture import are still pending
- Backend skeleton now boots API and worker runtimes through explicit module factories, tested env loaders, and service/repository seams; `GET /health` and `GET /v1/bootstrap/config` are live, but there are still no business APIs, auth, DB, or sync implementation yet
- Worker runtime now composes scheduled jobs through module contracts, but only the heartbeat job exists; there are still no queues, DB, exports, or real background jobs yet
- No deployment CI, analytics providers, or full native capture domain-import pipeline yet

## Backlog Tracking Convention

Backlog status is tracked in `docs/05_Backlog.md`, `docs/05_Backlog.csv`, and `docs/05_Backlog.json` using:

- `status`: `todo`, `in_progress`, `blocked`, `done`
- `owner`
- `started_at`
- `completed_at`
- `commit_ref`
- `tracking_notes`

Tracking updates must be applied to all three backlog files in the same change set.
