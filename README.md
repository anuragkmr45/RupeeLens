# UPI Spend Tracker

Android-first v1 scaffold for a consumer UPI spend tracker. The repository now includes the monorepo foundation, PR quality gates, the mobile design-system showcase, and the database migration framework for the client app-domain SQLite database and the server PostgreSQL database.

## Repository Layout

- `client`: Expo + React Native app scaffold
- `server/api`: Fastify API runtime
- `server/worker`: Node.js worker runtime
- `packages/contracts`: shared API DTOs
- `packages/shared-types`: type-only shared primitives and interfaces
- `packages/shared-utils`: runtime-safe shared helpers
- `packages/eslint-config`: shared flat ESLint config
- `packages/tsconfig`: shared TypeScript presets
- `docs`: product, engineering, contract, backlog, and release docs

## Prerequisites

- Node.js 22 LTS compatible runtime (`>=22 <25`)
- `pnpm` 10.x

## Bootstrap

```bash
pnpm install
pnpm db:server:up
pnpm db:validate
pnpm lint
pnpm lint:openapi
pnpm typecheck
pnpm test
pnpm build
pnpm db:server:down
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

`pnpm ci:verify` runs the canonical non-OpenAPI quality gates in the same order as the `Verify` GitHub Actions job.

## Database Migrations

SET-004 adds the migration framework for the client app-domain SQLite database and the server PostgreSQL database.

```bash
pnpm db:server:up
pnpm db:validate
pnpm db:server:down
```

Server-only migration commands:

```bash
pnpm db:server:migrate
pnpm db:server:seed
pnpm db:server:reset
pnpm db:server:validate
```

Set `SERVER_DATABASE_URL` to target a different PostgreSQL instance. The default local value points at the Compose-backed service on `127.0.0.1:56432` in `compose.yaml`. Detailed policy and rollback guidance live in `docs/09_Database_Migrations.md`.

## Run The Runtimes

```bash
pnpm dev:client
pnpm dev:api
pnpm dev:worker
```

`pnpm dev:client` starts the Expo app shell and showcase. `pnpm dev:api` boots the API on port `3000` by default with `GET /health`. `pnpm dev:worker` starts the worker and emits an initial heartbeat log.

## Remote Config Foundation

SET-006 adds the local dev/test bootstrap endpoint and the client-side cached remote-config layer.

```bash
pnpm dev:api
curl "http://127.0.0.1:3000/v1/bootstrap/config?platform=android&appVersion=1.0.0&runtimeVersion=1.0.0&channel=internal"
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000 pnpm dev:client
```

The bootstrap response is signed with `X-Bootstrap-Content-Hash` and `X-Bootstrap-Signature`. The client reads cached config from SQLite first, then refreshes in background. `client/app.config.ts` now carries the default local `runtimeVersion` and `rolloutChannel` under `extra`.

## Android Capture Foundation

CAP-001 adds the native notification-listener foundation, source allowlist controls, and a temporary diagnostics section in the showcase screen.

```bash
pnpm --filter @upi-spend-tracker/client exec expo prebuild --platform android --clean
pnpm --filter @upi-spend-tracker/client exec expo run:android
cd client/android && ./gradlew testDebugUnitTest
cd client/android && ./gradlew connectedDebugAndroidTest
```

The generated `client/android` directory remains prebuild output and is not tracked. The local Expo module source lives in `client/modules/notification-capture`.

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

## Codex Workflow

Use plan-first for multi-step, risky, cross-module, schema/API, workflow, or doc-governance work. Small, local, low-risk changes with obvious scope can usually be implemented directly.

The reusable execution-plan template lives in `PLANS.md`. The full Codex planning, backlog-tracking, author, and reviewer checklist lives in `docs/10_Codex_Workflow.md`.

## Current Scope

- Design-system showcase screen plus temporary remote-config and capture diagnostics sections; no feature screens, navigation, or global state yet
- Health endpoint only; no business APIs, auth, or sync implementation yet
- Worker heartbeat stub only; no queues, DB, exports, or background jobs yet
- Android native notification-listener foundation exists, but parser execution, dedupe, quick-classify actions, and domain import are not implemented yet
- No deployment CI, analytics providers, full Room capture repository, or sync implementation yet

## Backlog Tracking Convention

Backlog status is tracked in `docs/05_Backlog.md`, `docs/05_Backlog.csv`, and `docs/05_Backlog.json` using:

- `status`: `todo`, `in_progress`, `blocked`, `done`
- `owner`
- `started_at`
- `completed_at`
- `commit_ref`
- `tracking_notes`

Tracking updates must be applied to all three backlog files in the same change set.
