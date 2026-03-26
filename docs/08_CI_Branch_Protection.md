# CI And Branch Protection

This repository automates pull-request quality checks in GitHub Actions, but branch protection itself must be configured in GitHub repository settings by a maintainer with the right permissions.

## Repo-Automated Checks

`/.github/workflows/pr.yml` runs on every pull request and produces these check names:

- `Scope`
- `PR Title`
- `OpenAPI`
- `Verify`

`Scope` publishes a readable changed-area summary for `client`, `server/api`, `server/worker`, `packages`, `docs`, and root-level files. `PR Title` enforces Conventional Commits style on the pull-request title. `OpenAPI` runs `pnpm lint:openapi`. `Verify` runs `pnpm ci:verify`, which now includes `pnpm db:validate` alongside lint, typecheck, test, and build.

## Required GitHub Ruleset For `main`

Preferred setup: GitHub repository rulesets targeting the `main` branch.

1. Open GitHub repository settings.
2. Go to `Rules` -> `Rulesets`.
3. Create a new branch ruleset for `main`.
4. Name it clearly, for example `main branch protection`.
5. Configure these required protections:
   - Require a pull request before merging.
   - Require status checks to pass before merging.
   - Require branches to be up to date before merging.
   - Require conversation resolution before merging.
6. Configure these required status checks exactly:
   - `Scope`
   - `PR Title`
   - `OpenAPI`
   - `Verify`
7. Configure these review settings:
   - Require at least 1 approving review.
   - Dismiss stale approvals when new commits are pushed.
8. Recommended merge policy:
   - Enable squash merge as the default merge path for normal work.

## What This Ticket Does Not Automate

- It does not apply or modify remote GitHub branch-protection settings from this local environment.
- It does not create deployment, release, or publish workflows.
- It does not relax review or conversation-resolution requirements.

## Manual Verification Checklist

- Open a pull request and confirm all four checks appear.
- Confirm GitHub ruleset configuration requires the same four checks by exact name.
- Confirm merge is blocked when any required check fails.
- Confirm the `Verify` job log includes a successful `pnpm db:validate` step.

## Fallback If Rulesets Are Unavailable

If the repository does not support rulesets, configure classic branch protection for `main` with the same required checks and review settings. Keep the required status-check names identical to the workflow job names above.
