# Codex Workflow

Date: 2026-03-25

## Purpose

This document defines the repo-side delivery loop for Codex and human collaborators when using Codex as the project delivery orchestrator.

The goal is simple:

- audit repo truth first
- choose one ticket
- implement only that ticket
- validate it
- update tracking truthfully
- stop

## Repo Source Of Truth

Use these sources in order when auditing or choosing work:

- `AGENTS.md`
- `README.md`
- `PLANS.md`
- `docs/05_Backlog.md`
- `docs/05_Backlog.csv`
- `docs/05_Backlog.json`
- `docs/09_Project_Phase_Status.md`
- `docs/01_PRD.md`
- `docs/02_Engineering_Design.md`
- `docs/03_Screen_Spec.md`
- `docs/04_API_Contract.yaml`
- `docs/06_Release_Plan.md`
- `docs/07_Implementation_Plan.md`
- `docs/11_Database_Migrations.md`
- live source under `client/`, `server/`, and `packages/`

If repo truth and backlog status disagree, prefer live code plus the most structured reconciled tracking doc, then correct tracking explicitly.

## Standard Run Loop

### 1. Audit repo truth

- Read the source-of-truth docs that matter for the current area.
- Inspect live code before trusting ticket status.
- Re-check tickets already marked `blocked` or `in_progress` before starting untouched work.

### 2. Choose one ticket

- Prefer closing an already-started ticket before opening later work.
- If a blocked or in-progress ticket can now be truthfully completed, pick that first.
- Otherwise choose the next highest-priority actionable `todo` ticket from the earliest sprint whose dependencies are satisfied.
- If a ticket is blocked only by external environment or account access, either do the maximum repo-side work and leave it `blocked`, or skip it if it is purely environmental and not the best immediate product move.

### 3. Add one plan entry before edits

- Add exactly one execution entry to `PLANS.md` for the chosen run.
- Use canonical backlog IDs for product work.
- Use local `TRACK-*` IDs only for repo-tracking, workflow-only, or other non-product passes.

### 4. Update backlog start state

- Update the chosen ticket in `docs/05_Backlog.md`, `docs/05_Backlog.csv`, and `docs/05_Backlog.json`.
- Set `owner` to `codex`.
- Preserve `started_at` if continuing an existing ticket.
- Do not edit unrelated backlog rows unless the audit proves they are stale and the correction is necessary for truthful project state.

### 5. Implement only the chosen ticket

- Stay inside documented ticket scope.
- Do not silently bundle adjacent tickets into the same run.
- If a ticket depends on unavailable tooling or environment, stop at the truthful repo-side boundary and leave the ticket `blocked` or `in_progress` as appropriate.

### 6. Validate

- Run the default repo checks unless the ticket is truthfully blocked by external environment:
  - `pnpm db:validate` when DB schema, migrations, or migration tooling changes
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- Run `pnpm lint:openapi` when the API contract, CI wiring, or OpenAPI-related behavior changes.
- Run platform-native validation when the ticket includes Android or iOS native work and the environment supports it.
- Run targeted smoke checks for the feature built in that ticket.

### 7. Update end-state tracking

- Update `PLANS.md` with outcome, validations, and remaining blockers.
- Update the chosen backlog row across markdown, CSV, and JSON to `done`, `blocked`, or `in_progress` truthfully.
- Mark `done` only when acceptance criteria and required validations are actually satisfied.

### 8. Stop

- Stop after one chosen ticket or one chosen closeout pass.
- Report what changed, what passed, final ticket status, blockers if any, and the next most suitable ticket.

## Same-Thread `next` Contract

When working in the same Codex thread for this repository, a user message of `next` means:

1. re-audit the current repo truth
2. choose the next single best ticket
3. create the plan entry
4. implement only that ticket
5. validate it
6. update tracking truthfully
7. stop

Do not start a second ticket automatically in the same run.

## Tracking Rules

- Canonical product tickets live in `docs/05_Backlog.*`.
- `PLANS.md` is the execution log and may use local identifiers for workflow-only or environment-only passes.
- Backlog markdown, CSV, and JSON must match before stopping.
- `blocked` must include a precise blocker note.
- A closeout/verification pass is valid when the main work already landed earlier and only acceptance evidence is missing.

## Validation Rules

- Treat missing validations as blockers, not as implied passes.
- `pnpm db:validate` is now the canonical migration validation command for DB schema, migration, and migration-tooling changes.
- DB-related tickets should run `pnpm db:validate` in addition to the default repo checks, unless the current environment is truthfully blocked.
- Do not claim migration safety, branch protection, or platform-native success without direct evidence from the current environment.

## Current Default Next Ticket

There is no unconditional repo-side default next ticket now.

Reason:

- `QA-005` now has its repo-side implementation pass in place: versioned privacy-safe telemetry contracts, local-first client event logging/flush, authenticated telemetry ingest/dashboard APIs, and deterministic alert-threshold evaluation are all present, but its done-when still requires operational telemetry to be available before beta.
- `SET-002` remains blocked by remote GitHub verification.
- `CAP-003` and `CAP-004` remain blocked on connected-Android validation because `adb devices` is empty in the current environment.
- `CAP-005`, `UX-005`, `UX-007`, `INT-005`, `INT-008`, `API-004`, `API-005`, `API-007`, `QA-003`, `QA-004`, and `SYNC-001` all remain active in backlog tracking, but their remaining gaps are external QA/design acceptance, direct device/network profiling evidence, manual QA spreadsheet verification, staging evidence, remote Expo project wiring, non-production OTA/rollback dry-run evidence, engineering approval, beta-only validation, or operational rollout evidence rather than missing repo-side implementation.
- `QA-001` is not yet actionable because it depends on blocked `SET-002`.
- `QA-002` is not yet actionable because it depends on blocked `CAP-004`.
- `REL-001` and `REL-002` still have blocked dependencies.

On the next run, re-audit first. If GitHub auth becomes available, prefer a `SET-002` closeout pass. If a connected Android target becomes available, prefer `CAP-003` and `CAP-004` closeout passes before any later work.
