# AGENTS.md

## Purpose

This repository contains the Android-first v1 of UPI Spend Tracker. Codex and human contributors must treat this as a **consumer financial behavior product** with strong requirements around privacy, reliability, offline-first behavior, and low-friction UX.

## Repository map

- `client`: React Native + TypeScript mobile app
- `server/api`: Node.js API runtime
- `server/worker`: background jobs
- `packages/contracts`: shared API contracts and DTOs
- `packages/shared-types`: domain types
- `packages/shared-utils`: helpers with no app-specific side effects
- `docs/`: canonical product, engineering, API, backlog, and release docs

Full workflow and review guidance lives in `docs/10_Codex_Workflow.md`.

## Working agreements

1. Read `docs/01_PRD.md` and `docs/02_Engineering_Design.md` before major implementation.
2. Treat `docs/04_API_Contract.yaml` as the backend contract source-of-truth.
3. Update docs, contracts, and tests in the same PR whenever behavior changes.
4. Schema changes must include migration updates and `pnpm db:validate`.
5. Prefer additive changes over hidden breaking changes.
6. Keep shared packages pure and side-effect free.
7. Store money in integer minor units and use UTC at system boundaries.
8. Do not introduce paid third-party product APIs in v1 without explicit approval.
9. Do not store unnecessary sensitive raw data or bypass offline-first core flows.
10. For risky parser changes, include fixtures and rollback notes.
11. Keep this file concise; deeper process detail belongs in docs.

## Commands

Run from repository root:

- `pnpm install`
- `pnpm lint`
- `pnpm lint:openapi`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm ci:verify`
- `pnpm db:validate`
- `pnpm db:server:up`
- `pnpm db:server:down`
- `pnpm db:server:migrate`
- `pnpm db:server:seed`
- `pnpm db:server:reset`
- `pnpm db:server:validate`
- `pnpm dev:client`
- `pnpm dev:api`
- `pnpm dev:worker`

## Planning rules

- Plan first for multi-step, risky, cross-module, schema/API, workflow, or doc-governance work.
- Implement directly only for small, local, low-risk changes when scope is obvious.
- Use `PLANS.md` for complex work: list touched files/modules, call out schema/API changes explicitly, capture risks, and define “done when” before coding.
- Use `docs/10_Codex_Workflow.md` for the full planning, tracking, and review checklist.

## Testing expectations

Before opening or merging a PR:

- keep `Scope`, `PR Title`, `OpenAPI`, and `Verify` green
- run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`
- run `pnpm lint:openapi` when contract docs or CI wiring changes
- run `pnpm db:validate` when schema or migration manifests change
- add or adjust tests for changed behavior
- add parser fixtures for parser changes
- update contract tests when API behavior changes

## PR expectations

Each PR should include:

- ticket ID
- summary of change
- workflow/checklist followed from `docs/10_Codex_Workflow.md`
- diff reviewed for unintended scope creep
- risk/rollback note
- test evidence
- screenshots/video for UI changes
- docs/contract updates if required

## Do-not rules

- Do not add new production dependencies casually.
- Do not add microservices for v1.
- Do not log full sensitive raw notification contents in normal logs.
- Do not ship heuristic auto-classification without explicit product approval.
- Do not break local-only mode.

## Done when

A task is done when:

- code is merged cleanly
- tests pass
- docs/contracts are updated
- analytics hooks are included if needed
- feature flag/rollback is addressed where relevant
