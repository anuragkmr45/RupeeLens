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

## Working agreements

1. Read `docs/01_PRD.md` and `docs/02_Engineering_Design.md` before major implementation.
2. Treat `docs/04_API_Contract.yaml` as the backend contract source-of-truth.
3. Update docs/contracts/tests in the same PR whenever behavior changes.
4. Prefer additive changes over hidden breaking changes.
5. Do not introduce paid third-party product APIs in v1 without explicit approval.
6. Do not store unnecessary sensitive raw data.
7. Do not bypass offline-first design by making core screens depend on live APIs.
8. For risky parser changes, include fixtures and rollback notes.
9. Explicit user rules can auto-apply; heuristic suggestions cannot auto-save silently.
10. Keep AGENTS instructions concise; deeper detail belongs in docs.

## Commands

Run from repository root:

- `pnpm install`
- `pnpm db:validate`
- `pnpm lint`
- `pnpm lint:openapi`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm ci:verify`
- `pnpm dev:client`
- `pnpm dev:api`
- `pnpm dev:worker`

## Planning rules

For complex work:

- start with a plan using `PLANS.md`
- follow `docs/10_Codex_Workflow.md` for the audit -> choose one ticket -> implement -> validate -> stop loop
- list touched files/modules
- call out schema/API changes explicitly
- call out rollout/flag needs
- define “done when” before coding

In a continuing Codex thread for this repo, a user message of `next` means rerun that workflow once.

## Code conventions

- TypeScript everywhere unless native Android layer requires Kotlin/Java
- Keep functions small and explicit
- Prefer pure domain functions in shared packages
- Avoid cross-module DB reach-ins in backend
- Use dependency injection or module interfaces, not hidden singletons
- Keep parser logic deterministic and fixture-tested
- Store money in integer minor units
- Use UTC at boundaries, render user timezone in UI

## Mobile platform rules

- Treat `client/src/lib/platform-capabilities.ts` as the single source of truth for platform-dependent product behavior.
- Keep iOS truthful as `manual/local-only` unless a real native iOS ingestion path is implemented in code.
- Do not imply iOS background notification capture, parser logs, native capture diagnostics, or Android-equivalent parity in copy or UI.
- Android remains the only native notification-capture platform in v1; preserve the Android listener/parser/allowlist/diagnostics path unless a verified bug requires change.
- Prefer small extracted helpers or platform-capability helpers over adding more inline platform conditionals to `client/src/app/SpendTrackerApp.tsx`.
- When adding platform-specific copy, write the iOS path positively in terms of what iPhone supports; do not leak Android diagnostics or Android-only affordances into iOS screens.
- Do not force light mode unless there is an explicit product or platform reason documented in code and docs.
- Use safe-area-aware primitives (`react-native-safe-area-context`) for app shells, scroll padding, and bottom navigation; avoid hardcoded top offsets when insets should drive layout.
- Keep adaptive appearance and color usage aligned with the shared mobile UI theme; if new primitives depend on theme context, ensure the provider is present in runtime code and tests.
- When platform scope changes, update `README.md`, `docs/01_PRD.md`, `docs/02_Engineering_Design.md`, `docs/14_Quality_Matrix.md`, and relevant client tests in the same change.
- Keep local runtime artifacts in ignored scratch locations such as `tmp/`; do not commit screenshots, ad hoc flow files, or root-level helper entrypoints unless they are intentionally part of the repo.

## Testing expectations

Before opening or merging a PR:

- run lint
- run OpenAPI lint when contract docs or CI wiring changes
- run typecheck
- run relevant tests
- add/adjust tests for changed behavior
- for parser changes, add fixture coverage
- for API changes, update contract tests

## CI expectations

- Keep `Scope`, `PR Title`, `OpenAPI`, and `Verify` green for every ticket.
- Use Conventional Commits style for PR titles: `type(optional-scope): summary`.
- When repo-side quality gates change, update `README.md` and `docs/08_CI_Branch_Protection.md` in the same change.

## PR expectations

Each PR should include:

- ticket ID
- summary of change
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
