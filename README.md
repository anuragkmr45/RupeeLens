# UPI Spend Tracker

Android-first v1 scaffold for a consumer UPI spend tracker. SET-001 establishes the monorepo foundation only: a minimal Expo client placeholder, a Fastify health API, a stub worker heartbeat, shared TypeScript packages, and synchronized backlog tracking.

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
pnpm lint
pnpm lint:openapi
pnpm typecheck
pnpm test
pnpm build
```

## Pre-PR Verification

Run the same checks that CI expects before opening or updating a pull request:

```bash
pnpm lint
pnpm lint:openapi
pnpm typecheck
pnpm test
pnpm build
```

`pnpm ci:verify` runs the canonical non-OpenAPI quality gates in the same order as the `Verify` GitHub Actions job.

## Run The Runtimes

```bash
pnpm dev:client
pnpm dev:api
pnpm dev:worker
```

`pnpm dev:client` starts the Expo placeholder app. `pnpm dev:api` boots the API on port `3000` by default with `GET /health`. `pnpm dev:worker` starts the worker and emits an initial heartbeat log.

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

## Current Scope

- Minimal bootstrap screen only; no feature screens, navigation, or global state yet
- Health endpoint only; no business APIs, auth, DB, or sync implementation yet
- Worker heartbeat stub only; no queues, DB, exports, or background jobs yet
- No deployment CI, migrations, analytics providers, notification capture, or remote config implementation yet

## Backlog Tracking Convention

Backlog status is tracked in `docs/05_Backlog.md`, `docs/05_Backlog.csv`, and `docs/05_Backlog.json` using:

- `status`: `todo`, `in_progress`, `blocked`, `done`
- `owner`
- `started_at`
- `completed_at`
- `commit_ref`
- `tracking_notes`

Tracking updates must be applied to all three backlog files in the same change set.
