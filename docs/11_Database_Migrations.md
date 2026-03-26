# Database Migrations

Date: 2026-03-26

## Purpose

This document describes the current repo-truth migration framework for the mobile SQLite store and the server PostgreSQL baseline.

## Commands

Run from repository root:

- `pnpm db:validate`
- `pnpm ci:verify`

`pnpm db:validate` is the canonical migration validation command. It:

- validates that mobile and server migration ids are unique and ordered
- prints a deterministic schema hash for each target
- initializes both targets from empty state using migrations only
- re-applies the migrations to confirm idempotence
- exercises the mobile legacy-adoption path from an untracked pre-migration schema

`pnpm ci:verify` now includes `pnpm db:validate`, so the `Verify` GitHub Actions job enforces migration validation automatically.

## Repo Truth

### Mobile SQLite

- Migration manifest: `client/src/features/spend-tracker/db/migrations.ts`
- Migration runner: `client/src/features/spend-tracker/db/migration-runner.ts`
- Persistence boot path: `client/src/features/spend-tracker/persistence.ts`
- Schema tracking table: `schema_migrations`

The client now applies ordered migrations before any local persistence reads or writes. If a developer already has an older untracked local schema, the migration runner upgrades that schema to the current transaction format and then records all migration ids in `schema_migrations`.

### Server PostgreSQL

- Migration manifest: `server/api/src/db/migrations.ts`
- Migration runner: `server/api/src/db/migration-runner.ts`
- Schema tracking table: `schema_migrations`

The server migration framework is intentionally minimal at this stage. It establishes a PostgreSQL migration surface and baseline metadata table without inventing later-ticket business tables or sync schemas early.

## Seed Strategy

### Mobile

- Mobile migrations do not seed demo transactions or user content.
- Demo/bootstrap spend data remains app-level behavior, not migration-owned schema data.
- Migrations only own structural tables and indexes.

### Server

- The baseline server migration seeds `app_metadata.seed_strategy` with a manual/no-domain-seeds marker.
- This is a framework seed only, not product data.
- Real domain seeds should arrive with future schema-owning tickets and new migration ids.

## Rollback And Forward-Fix Guidance

Use these rules for migration changes:

1. Before merge, an unpublished migration may be edited locally if it has not been shared or applied outside throwaway environments.
2. After merge, do not rewrite an existing migration id or mutate historical SQL in place.
3. For shipped or shared migrations, add a new forward-fix migration with the next ordered id.
4. For local throwaway development databases, it is acceptable to reset the DB entirely. For any persistent or shared environment, prefer forward-fix over destructive reset.
5. If the mobile legacy-adoption bridge fails on an older schema, add a new repair migration or upgrade path; do not mutate already-recorded migration history.

## Validation Expectations

- Run `pnpm db:validate` whenever DB schema, migration manifests, migration tooling, or migration docs change.
- Keep `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` green before marking migration work `done`.
- When CI or repo verification surfaces change, update `README.md`, `AGENTS.md`, and `docs/08_CI_Branch_Protection.md` in the same change.

## Current Gaps

- There is still no live PostgreSQL runtime or business schema in the repo.
- The mobile migration framework currently owns only the local spend-tracker tables already in use by the shell app.
- Future tickets must extend these manifests with new ordered ids rather than bypassing the migration layer.
