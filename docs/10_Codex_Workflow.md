# Codex Workflow

This document is the canonical workflow for Codex-assisted changes in this repository.

## When To Plan First

Use plan-first when the task is:

- multi-step or risky
- cross-module or cross-workspace
- changing schema, migrations, API contracts, CI, workflows, or release/process docs
- large enough that touched files, risks, or validation steps are not obvious at a glance

Implement directly only when the change is small, local, low-risk, and the scope is obvious.

## Using `PLANS.md`

Before editing a plan-first task:

- add a new execution entry in `PLANS.md`
- keep exactly one ticket under `## Active Plan`
- list the goal, touched files/modules, rationale, risks, validation commands, and “done when”
- call out schema or API changes explicitly

After validation:

- move the entry to `## Completed Plans` or `## Blocked Plans`
- record the shipped outcome or the exact blocker

Use the copy-ready execution template at the bottom of `PLANS.md` for new entries.

## Backlog Tracking

At the start of work:

- update `docs/05_Backlog.md`
- update `docs/05_Backlog.csv`
- update `docs/05_Backlog.json`
- set the ticket status to `in_progress`
- set `owner` and `started_at`

At the end of work:

- update the same three backlog files in the same change set
- set the final status truthfully: `done` or `blocked`
- record `completed_at` only when the ticket is actually done
- set `commit_ref` to the real local commit hash when available
- keep unrelated ticket states unchanged

## Validation Expectations

Before a ticket can be marked complete:

- keep `Scope`, `PR Title`, `OpenAPI`, and `Verify` green
- run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`
- run `pnpm lint:openapi` when contract docs or CI wiring change
- run `pnpm db:validate` when schema or migration manifests change
- record the exact validation commands and results in the handoff summary

## Author Checklist

Before final response or PR:

- read every changed file end to end
- review the diff for unintended scope creep
- run and record the required validation commands
- update docs, contracts, and tests when behavior changes
- include a rollback or risk note when the change merits it
- confirm no unrelated ticket state changes slipped into the backlog or `PLANS.md`

## Reviewer Checklist

Human or AI-assisted review should confirm:

- the changed files were read end to end
- the diff matches the ticket scope and does not hide unrelated work
- tests and validation commands were run and recorded
- docs or contracts were updated when behavior changed
- rollback or risk notes are present when relevant
- backlog tracking and `PLANS.md` reflect the final ticket truth
