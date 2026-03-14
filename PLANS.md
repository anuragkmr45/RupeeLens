# PLANS.md

Use `PLANS.md` for multi-step, risky, cross-module, schema/API, workflow, or doc-governance work. Keep exactly one ticket under `## Active Plan`; move it to `## Completed Plans` or `## Blocked Plans` only after validation and backlog tracking are updated. Full workflow guidance lives in `docs/10_Codex_Workflow.md`.

## Active Plan

_No active plan. Waiting for the next ticket._

## Blocked Plans

### SET-002 — Final Remote Closeout

- **Status:** blocked
- **Ticket:** SET-002
- **Goal:** Verify the live GitHub PR workflow, exact remote check names, and `main` branch protection so SET-002 can be closed out truthfully.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, and docs only if remote truth differs from the recorded check names or protection mode.
- **Rationale:** Remote verification is now possible through the stored Git credential helper. This pass must confirm the real PR workflow and branch-protection state instead of relying on local YAML alone.
- **Risks:** Claiming SET-002 `done` from partial GitHub evidence, or missing the repository-plan limitation that blocks branch protection on the current private repo.
- **Validation commands:** `git remote -v`, `git branch -vv`, `git rev-parse HEAD`, `git ls-remote origin 'refs/pull/*/head'`, authenticated GitHub API reads for repo, pulls, workflow runs, jobs, and `main` protection.
- **Done when:** Remote GitHub workflow runs and `main` protection are verified directly and the backlog is updated to `done`; otherwise the backlog remains `blocked` with an exact blocker note.
- **Outcome:** Verified private repo `anuragkmr45/RupeeLens`, pushed `main`, two PR refs, active workflow `.github/workflows/pr.yml`, and successful PR run `23081726355` with checks `Scope`, `PR Title`, `OpenAPI`, and `Verify`. `main` branch protection remains blocked because both rules and classic protection APIs return `403` with `Upgrade to GitHub Pro or make this repository public to enable this feature.` for the current private repo.

### SET-002 — PR Quality Gates and Branch Protection

- **Status:** blocked
- **Ticket:** SET-002
- **Goal:** Add lean pull-request quality gates, OpenAPI linting, PR title validation, changed-scope reporting, and branch-protection documentation without expanding beyond CI/tooling scope.
- **Touched files/modules:** `PLANS.md`, `AGENTS.md`, `README.md`, `package.json`, `pnpm-lock.yaml`, `docs/04_API_Contract.yaml`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `docs/08_CI_Branch_Protection.md`, `.spectral.yaml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/pr.yml`.
- **Rationale:** SET-001 established the runnable monorepo, but merge quality is still entirely manual. SET-002 needs a minimal GitHub Actions foundation that reuses repo scripts, enforces readable PR hygiene, and documents the manual GitHub settings that cannot be safely applied from this environment.
- **Risks:** CI drift between local scripts and workflow jobs, noisy or brittle OpenAPI lint rules, unreadable changed-scope logic, and falsely claiming remote branch protection is active without verified GitHub access.
- **Validation commands:** `pnpm install`, `pnpm lint`, `pnpm lint:openapi`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Blocked unless:** Repo-side assets validate locally and remote branch protection for `main` is actually configured and verified. This run completed local validation, but remote verification remains unavailable in the current environment.
- **Done when:** `.github/workflows/pr.yml` provides the `Scope`, `PR Title`, `OpenAPI`, and `Verify` checks; local validation passes; PR guidance/docs are updated; backlog tracking is synchronized; and remote branch protection is truthfully verified before marking the ticket `done`.

## Completed Plans

### SET-006 — Feature Flags and Remote Parser Config Foundation

- **Status:** completed
- **Ticket:** SET-006
- **Goal:** Implement the Sprint 1 remote-config foundation by shipping a live dev/test bootstrap endpoint, signed config payload verification, cached client config loading, background refresh, and observable kill-switch/feature-flag state without expanding into later parser or publishing tooling work.
- **Touched files/modules:** `PLANS.md`, `docs/04_API_Contract.yaml`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `packages/shared-types/**`, `packages/contracts/**`, `packages/shared-utils/**`, `server/api/src/lib/env.ts`, `server/api/src/app.ts`, `server/api/src/modules/bootstrap/**`, `client/app.json`, `client/package.json`, `client/src/lib/db/**`, `client/src/lib/bootstrap-config/**`, `client/src/app/**`, `client/App.tsx`, and related tests.
- **Rationale:** The backlog defines SET-006 as the remote-config and feature-flag foundation needed before parser rollout safety, dedupe tuning, and later bootstrap API hardening. The current repo already reserves `/v1/bootstrap/config` in the OpenAPI contract but had no runtime implementation or client cache/verification layer.
- **Risks:** Pulling later API-006 publishing and cache-hardening scope into this ticket, choosing a signature model the client runtime cannot verify safely, or making remote config block app startup instead of remaining local-first and failure-tolerant.
- **Validation commands:** `pnpm install`, `pnpm lint`, `pnpm lint:openapi`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm db:validate`.
- **Done when:** The API serves a signed bootstrap payload in local dev/test, the client loads cached or safe-default config without blocking on network, background refresh safely verifies content hash and signature, remote flags and parser kill switches are observable in the app, docs/contracts stay aligned, and backlog tracking is synchronized with SET-006 marked `done` only after validations and smoke checks succeed.
- **Outcome:** Added the signed `/v1/bootstrap/config` endpoint with typed contracts and deterministic version/channel selection, shipped a SQLite-backed client cache and background refresh layer with signature/hash verification, surfaced remote-config state in the client showcase, updated the OpenAPI/README docs, and passed `pnpm install`, `pnpm lint`, `pnpm lint:openapi`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm db:validate`, `PORT=3101 pnpm dev:api` plus a real `curl` smoke check, and `CI=1 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3101 pnpm dev:client`.

### SET-005 — Codex Repo Instructions and Review Workflow

- **Status:** completed
- **Ticket:** SET-005
- **Goal:** Finish the repo-level Codex governance docs by keeping `AGENTS.md` concise, turning `PLANS.md` into a copy-ready execution template, adding a dedicated workflow/checklist doc, and linking the review workflow from `README.md` and the PR template.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `AGENTS.md`, `README.md`, `.github/PULL_REQUEST_TEMPLATE.md`, and `docs/10_Codex_Workflow.md`.
- **Rationale:** The backlog defines SET-005 as a documentation and workflow ticket. The repo already had partial Codex instructions, but the state was fragmented: no dedicated checklist reference existed, the plan template was still generic, and the plan-first versus implement-directly rule was not stated cleanly in one canonical place.
- **Risks:** Over-expanding a docs ticket into CI/runtime changes, duplicating workflow rules across too many files, or rewriting ticket history in `PLANS.md` instead of adding a reusable execution template that future runs can copy safely.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** `AGENTS.md` stays concise and accurate, `PLANS.md` includes a copy-ready Codex execution template, `README.md` links to the workflow guidance, the PR template references the checklist and diff review, and backlog tracking is synchronized with SET-005 marked `done` only after validations succeed.
- **Outcome:** Added `docs/10_Codex_Workflow.md` as the canonical planning and review reference, aligned `AGENTS.md`, `PLANS.md`, `README.md`, and `.github/PULL_REQUEST_TEMPLATE.md` to the same plan-first and review language, and passed `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

### SET-004 — Database Migration Framework for Mobile SQLite and Server PostgreSQL

- **Status:** completed
- **Ticket:** SET-004
- **Goal:** Implement the backlog-defined migration framework for the app-domain SQLite database and the server PostgreSQL database, with ordered/idempotent migrations, seed strategy, schema tracking, local scripts, and CI validation.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `AGENTS.md`, `README.md`, `docs/09_Database_Migrations.md`, `package.json`, `pnpm-lock.yaml`, `compose.yaml`, `.github/workflows/pr.yml`, `packages/shared-utils/**`, `client/App.tsx`, `client/package.json`, `client/src/lib/db/**`, `client/__tests__/**`, `server/api/package.json`, `server/api/src/db/**`, and supporting tests/scripts.
- **Rationale:** SET-004 is the foundation ticket that makes schema evolution safe before capture, sync, and domain tickets start writing durable data. The backlog and engineering design consistently require migration-only initialization, idempotence, rollback guidance, and CI validation.
- **Risks:** Accidentally pulling Room/capture DB work from `CAP-004` into this ticket, overbuilding the schema beyond the foundation entities needed now, destabilizing Expo tests by booting SQLite incorrectly, or adding CI drift between local Postgres scripts and the `Verify` job.
- **Validation commands:** `pnpm db:server:up`, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm db:server:down`.
- **Done when:** Both the client app-domain DB and the server DB can initialize from empty state using migrations only, reruns remain idempotent, manifest hash validation passes, migration/forward-fix guidance is documented, CI validates migrations through the existing `Verify` job, and backlog tracking is synchronized with SET-004 marked `done` only after validations succeed.
- **Outcome:** Shared manifest hashing/order helpers now live in `packages/shared-utils`, the client and server each ship an ordered append-only migration runner with idempotent seed handling, root and CI verification now exercise `pnpm db:validate`, migration guidance is documented, and `pnpm db:server:up`, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm ci:verify` all passed before closing the ticket.

### SET-003 — Mobile Design System Tokens and UI Primitives

- **Status:** completed
- **Ticket:** SET-003
- **Goal:** Implement the backlog-defined mobile design system foundation with shared runtime tokens, light/dark theme support, and a showcase screen covering all required UI primitives.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `packages/shared-utils/**`, `client/App.tsx`, `client/__tests__/**`, `client/src/app/**`, `client/src/components/**`, `client/src/theme/**`, and supporting client exports/tests.
- **Rationale:** SET-003 is the first application-building ticket after repo/bootstrap work. The backlog and planning docs consistently scope it to mobile design tokens and base primitives only, which should unblock later feature tickets without pulling in navigation, state, or backend work.
- **Risks:** Accidentally expanding into feature-screen work, breaking Expo build/tests with a heavier UI architecture than needed, introducing cross-workspace boundary drift, or implementing tokens outside a shared package contrary to backlog acceptance criteria.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** Shared runtime tokens live in one shared package and are consumed by the client, all backlog-listed primitives exist with light/dark theme support and accessible touch targets, a showcase screen demonstrates them, and backlog tracking is synchronized with SET-003 marked `done` only after validations succeed.
- **Outcome:** Shared runtime design tokens now live in `packages/shared-utils`, the client ships the full SET-003 primitive set with a light/dark showcase screen, client snapshots/token tests were added, and `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all passed.

### SET-001 — Repository Bootstrap and Tracking

- **Status:** completed
- **Ticket:** SET-001
- **Goal:** Bootstrap the canonical `client`/`server` monorepo, normalize docs/instructions to the real layout, and make backlog tracking operational across markdown, CSV, and JSON.
- **Touched files/modules:** `AGENTS.md`, `PLANS.md`, `README.md`, `docs/**`, `client/**`, `server/api/**`, `server/worker/**`, `packages/contracts/**`, `packages/shared-types/**`, `packages/shared-utils/**`, `packages/eslint-config/**`, `packages/tsconfig/**`, root workspace configs.
- **Rationale:** The repository currently contains a flattened planning pack rather than the intended source layout. SET-001 established the production-facing workspace structure and reproducible tooling baseline before later tickets could build safely.
- **Validation commands:** `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Manual smoke checks:** `pnpm dev:client`, `pnpm dev:api`, `pnpm dev:worker` as short boot checks only.
- **Outcome:** Canonical folder layout, runnable workspace scripts, updated docs, and synchronized backlog tracking were delivered and validated.

## Execution Template

Create a new entry from this template before editing code or docs for any multi-step, risky, cross-module, schema/API, workflow, or doc-governance task. Mark only one ticket active at a time. After validation, move the entry to `## Completed Plans` or `## Blocked Plans` and record the final outcome.

### TICKET-ID — Short Task Title

- **Status:** planned | in_progress | blocked | completed
- **Ticket:** TICKET-ID
- **Goal:** One sentence describing the user or system outcome.
- **Touched files/modules:** List the main files, directories, or modules likely to change.
- **Rationale:** Why this ticket matters now, tied to backlog/docs.
- **Risks:** Scope creep, regressions, rollout concerns, privacy/security, or other meaningful risks.
- **Validation commands:** The exact commands required before the ticket can be marked complete.
- **Done when:** Concrete acceptance criteria for the ticket.
- **Outcome:** Fill this in after implementation and validation with the shipped result and final truth.
