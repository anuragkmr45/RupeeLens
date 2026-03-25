# Database Migrations

Date: 2026-03-25

## Purpose

This document records current repo truth for database migrations. It is a status-and-guidance document, not proof that the planned migration framework already exists.

## Current Repo Truth

### Mobile client

- The client currently stores local app state in SQLite-backed tables.
- The current storage implementation lives in `client/src/features/spend-tracker/persistence.ts`.
- The app can persist and reload local spend data, but it does not yet have a formal ordered migration runner, schema version tracking, or rollback/forward-fix workflow.

### Server

- `server/api` is still a health-route skeleton.
- `server/worker` is still a heartbeat stub.
- There is no PostgreSQL schema, migration runner, or migration CLI in the current repo.

### Root command surface

- There is currently no root `pnpm db:validate` script.
- Validation for DB-related work must therefore be ticket-specific until the canonical migration framework is implemented.

## Canonical Future Work

The planned migration framework is still owned by:

- `SET-004 — Implement database migration framework for mobile SQLite and server PostgreSQL`

That ticket is responsible for:

- ordered migration runners
- schema version tracking
- local developer scripts
- rollback or forward-fix guidance
- CI validation for pending migrations

## Guidance Until `SET-004`

- Do not claim that migrations are complete just because SQLite persistence exists locally.
- Do not add docs or tracking notes that imply a root DB validation command exists when it does not.
- For DB-adjacent tickets, validate the exact behavior changed in that run and record the absence of the broader migration framework truthfully.
- When `SET-004` lands, update this document alongside the new scripts, docs, and validation commands.
