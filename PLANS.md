# PLANS.md

Use this template before implementing any multi-step, cross-module, or risky change.

## Active Plan

### SET-002 — Closeout Verification Pass

- **Status:** blocked
- **Ticket:** SET-002
- **Goal:** Verify whether the GitHub remote, PR workflow runs, and `main` branch protection are truly active so SET-002 can be closed out truthfully.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, and docs only if remote truth differs from the recorded check names or protection mode.
- **Rationale:** The repo-side CI assets for SET-002 were completed locally, but the original run ended blocked because remote GitHub verification was unavailable. This pass is verification-only and must either confirm remote protection or leave the ticket blocked with a more precise note.
- **Risks:** Misreporting GitHub state from a partially initialized repo, claiming workflow/protection success without authenticated access, and drifting backlog notes away from the current remote facts.
- **Validation commands:** `git rev-parse --is-inside-work-tree`, `git remote -v`, `git ls-remote origin`, authenticated GitHub verification commands if available.
- **Done when:** Remote GitHub workflow runs and `main` protection are verified directly and the backlog is updated to `done`; otherwise the backlog remains `blocked` with an exact blocker note.
- **Outcome:** `.git` and `origin` now exist, but local `main` still has no commits, `git ls-remote origin` returns no refs, unauthenticated GitHub access to the repo returns `404`, and this environment has neither `gh` nor a GitHub token. Remote workflow runs and branch protection could not be verified.

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
