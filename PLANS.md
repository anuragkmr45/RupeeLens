# PLANS.md

Use this template before implementing any multi-step, cross-module, or risky change.

## Active Plan

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

### SET-001 — Repository Bootstrap and Tracking

- **Status:** completed
- **Ticket:** SET-001
- **Goal:** Bootstrap the canonical `client`/`server` monorepo, normalize docs/instructions to the real layout, and make backlog tracking operational across markdown, CSV, and JSON.
- **Touched files/modules:** `AGENTS.md`, `PLANS.md`, `README.md`, `docs/**`, `client/**`, `server/api/**`, `server/worker/**`, `packages/contracts/**`, `packages/shared-types/**`, `packages/shared-utils/**`, `packages/eslint-config/**`, `packages/tsconfig/**`, root workspace configs.
- **Rationale:** The repository currently contains a flattened planning pack rather than the intended source layout. SET-001 established the production-facing workspace structure and reproducible tooling baseline before later tickets could build safely.
- **Validation commands:** `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Manual smoke checks:** `pnpm dev:client`, `pnpm dev:api`, `pnpm dev:worker` as short boot checks only.
- **Outcome:** Canonical folder layout, runnable workspace scripts, updated docs, and synchronized backlog tracking were delivered and validated.

## Title

Short, explicit name of the task.

## Goal

What user or system outcome should change?

## Context

Relevant tickets, docs, modules, bugs, or constraints.

## Assumptions

List assumptions being made. Mark anything that should be validated before coding.

## Files / modules likely to change

- `client/...`
- `server/...`
- `packages/...`
- `docs/...`

## API / schema impact

- New endpoint?
- Schema change?
- Migration?
- Backward compatibility concerns?

## Implementation steps

1.
2.
3.

## Tests to add or update

- unit
- integration
- E2E
- fixtures

## Rollout / flag plan

- feature flag?
- config toggle?
- kill switch?
- migration ordering?

## Risks

- data loss?
- parser regressions?
- performance?
- privacy/security?

## Done when

Concrete acceptance criteria.
