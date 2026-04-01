# Quality Matrix

Date: 2026-04-01

## Purpose

This document defines the current repo-side QA baseline for v1. It names the versioned parser-fixture catalog, the automated smoke and regression suites, the supported-device matrix that still needs manual execution before beta, and the release checklist that turns the automated evidence into a repeatable signoff path.

## Automated Suites

- `pnpm qa:parser-fixtures`
  - Runs the Android parser catalog only.
  - Current source: `client/android/app/src/test/java/com/upispendtracker/client/capture/ParserFixtureCatalogV1.kt`
- `pnpm qa:performance`
  - Runs the repo-side `QA-003` performance budget suite.
  - Current source of truth: `docs/15_Performance_Budget.md`
- `pnpm qa:smoke`
  - Runs the parser-fixture catalog, the full client app-flow harness, the paired mobile sync integration test, and the worker rollup/cleanup/export smoke tests.
- `pnpm qa:regression`
  - Runs `pnpm db:validate`, `pnpm lint`, `pnpm lint:openapi`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Parser Fixture Catalog

- Current version: `parser-fixtures.v1`
- Source file: `client/android/app/src/test/java/com/upispendtracker/client/capture/ParserFixtureCatalogV1.kt`
- Gate: `NotificationParserRegistryTest`
- Expansion rule:
  - Add new rows to `ParserFixtureCatalogV1.kt` for backward-compatible parser coverage growth.
  - Create `ParserFixtureCatalogV2.kt` only when fixture shape or parser expectations change incompatibly.

## Supported Device Matrix

| Lane | Platform / OS | Example target | Required evidence | Current status |
| --- | --- | --- | --- | --- |
| Android native baseline | Android 13 or newer | Physical device with notification-listener support | `pnpm qa:smoke`, connected Android manual capture/action checklist, `:app:connectedDebugAndroidTest` | Manual/device evidence pending in this environment |
| Android compatibility | Android 12 or newer | Emulator or secondary physical device | Connected Android instrumentation plus smoke checklist | Pending |
| Low/mid-tier performance | Android 12 or newer | 4 GB RAM class device on throttled network | `pnpm qa:performance` plus QA-003 profiling checklist | Pending |
| iOS shell-only | iOS simulator current Expo SDK support | iPhone simulator | `pnpm --filter @upi-spend-tracker/client run ios` plus shell smoke | Pending |

## Quality Matrix

| Feature area | Unit | Integration | Headless app-flow E2E | Native instrumentation / device | Manual / release check |
| --- | --- | --- | --- | --- | --- |
| Onboarding, dashboard, Inbox, classify, split, timeline, settings, exports | `client/__tests__/domain.test.ts`, `client/__tests__/persistence.test.ts` | SQLite migration and sync persistence tests | `client/__tests__/app.test.tsx` | Android capture-action handoff still needs device validation | Product and QA approval remains separate |
| Parser registry and notification capture parsing | `NotificationParserRegistryTest` via `pnpm qa:parser-fixtures` | Capture processor and repository instrumentation tests | No | Connected Android parser and capture validation required | Manual source-app checks on supported devices |
| Guest session, pairing, sync push/pull | Client sync session/runtime tests | `server/api/src/modules/sync/sync.mobile-integration.test.ts` | `client/__tests__/app.test.tsx` | No | Multi-device beta stability still pending |
| Domain APIs and reports | Service and route tests in `server/api/src/modules/domain` and `server/api/src/modules/reports` plus `server/api/src/modules/reports/reports.performance.test.ts` | OpenAPI lint plus route integration coverage | No | No | Staging evidence still pending |
| Worker jobs | Worker module tests under `server/worker/src/modules` | File-store integration via module tests | No | No | Staging operations still pending |
| Privacy, telemetry, and release hardening | Focused client/API tests | Contract and dashboard route tests | `client/__tests__/app.test.tsx` for settings/privacy touchpoints | No | Beta signoff and operational rollout still pending |

## Smoke Suite Intent

`pnpm qa:smoke` is the fast cross-stack release-blocker suite for local development and pre-PR confidence. It currently covers:

1. Versioned Android parser fixtures.
2. Critical client app flows from the real `App` root:
   - onboarding
   - local classification
   - split flow
   - settings and export access
   - native capture import and sync-session setup
3. API guest-session, pairing, and sync push/pull behavior through the live Fastify stack.
4. Worker rollup, cleanup, and export-job behavior.

## Regression Suite Intent

`pnpm qa:regression` is the canonical repo-wide baseline. It is intentionally heavier than smoke and should stay green before release-oriented work:

1. migration validation
2. lint
3. OpenAPI lint
4. typecheck
5. full test suite
6. full build

## Release Checklist

- Run `pnpm qa:smoke`.
- Run `pnpm qa:regression`.
- Run connected Android instrumentation and manual capture/action checks when a device or emulator is available.
- Open exported CSV files in a spreadsheet tool and verify column stability plus privacy-mode redaction.
- Re-run the supported-device matrix rows needed for the current release scope.
- Review backlog/phase-status tracking so any environment-only gaps remain explicit.
