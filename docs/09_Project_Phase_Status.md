# Project Phase Status

Date: 2026-03-25  
Source of truth: repo audit against `README.md`, `PLANS.md`, `docs/05_Backlog.*`, and live source under `client/`, `server/`, and `packages/`

## Summary

- Canonical project phases remain the backlog sprints in `docs/05_Backlog.*`.
- Repo truth is ahead of the backlog for several mobile and setup areas.
- Backlog tracking now reflects tickets that are genuinely `done`, `blocked`, or `in_progress` based on the current repository, while unfinished acceptance criteria stay explicitly open.
- `PLANS.md` now uses local `TRACK-*`, `APP-*`, and `ENV-*` identifiers for local execution history so it no longer collides with canonical backlog ticket IDs.
- Codex workflow orchestration is now documented in `docs/10_Codex_Workflow.md`; migration framework guidance lives in `docs/11_Database_Migrations.md` while `SET-004` remains open.

## Sprint 0 — Foundations

**Done in repo**

- Monorepo bootstrap, shared packages, root scripts, and runnable client/API/worker scaffolds
- Pull-request workflow, PR template, and CI/branch-protection documentation
- Repo-level `AGENTS.md` and `PLANS.md`, now linked from the README
- Codex workflow docs for same-thread single-ticket delivery runs
- Expo SDK 55 dev-build workflow plus Android/iOS shell support

**Remaining**

- Remote GitHub verification to truly close branch-protection setup
- Canonical design-system tokens and reusable UI primitives package
- Real migration framework for mobile SQLite and server PostgreSQL

## Sprint 1 — Capture Foundation

**Done in repo**

- Only the UI-level onboarding handoff that can open Android notification settings

**Remaining**

- Remote parser config and feature-flag infrastructure
- Notification listener service, allowlist controls, parser registry, dedupe, and native capture DB

## Sprint 2 — First Usable App

**Done in repo**

- Onboarding flow with value proposition, privacy disclosure, settings handoff, source-app preferences, budget-cycle choice, sync preference, and resumable saved progress
- Local SQLite-backed dashboard with cycle-aware totals, budget progress, top items, recent activity preview, quick actions, and persisted progress
- Inbox for uncategorized local transactions with status, merchant, source-app, amount, and age filters plus revisitable skipped items and local delete actions
- In-app classify flow with immediate dashboard refresh

**Remaining**

- Real permission-state reflection instead of advisory UI state
- Native capture bridge, diagnostics surface, and quick-classify notification flow
- Budget creation flow, search screen, partial/conflict Inbox views, split/create-rule actions, and explicit high-volume Inbox performance validation

## Sprint 3 — Core UX And Intelligence

**Done in repo**

- Manual add flow
- Bottom-sheet quick classify flow with explicit suggestion chips, shared form primitives, save/skip controls, and a save-as-rule intent toggle
- Hardcoded default category options inside the client shell

**Remaining**

- Durable rule creation via `INT-003`
- Split-items flow
- Timeline, detail, search/filter, settings/privacy/export screens, and captured-spend classify integration
- Category CRUD, merchant normalization, and rule engine

## Sprint 4 — Budgets And Sync Foundation

**Done in repo**

- Groundwork only: local SQLite transaction tables on mobile plus backend/process skeletons

**Remaining**

- Suggestions, budgets, rollups, CSV export, backup/restore
- Guest session, pairing, and sync APIs
- Backend modular-monolith feature modules beyond the health route

## Sprint 5 — APIs And Reports

**Done in repo**

- Typed health contract plus `GET /health`
- Worker heartbeat stub

**Remaining**

- Domain APIs, report APIs, remote config API, background jobs, and mobile outbox/conflict queue
- Broader QA harnesses, parser fixtures, and release-quality matrix work

## Sprint 6 — Hardening

**Done in repo**

- Baseline lint, typecheck, test, build, and CI documentation

**Remaining**

- Privacy/security baseline
- Low-network and performance optimization
- OTA/runtime-version and rollback playbook
- Analytics, crash reporting, and operational dashboards

## Sprint 7 — Beta And Release

**Done in repo**

- Nothing yet beyond planning artifacts

**Remaining**

- Closed beta, release candidate, Play Store package, policy declarations, support docs, and launch operations
