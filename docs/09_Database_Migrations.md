# Database Migrations

Version: 1.0  
Date: 2026-03-14

## Purpose

SET-004 establishes the migration workflow for:

- the client app-domain SQLite database
- the server PostgreSQL database

This ticket does not implement the Android-native Room capture database. That stays in `CAP-004`.

## Policy

- Migrations are append-only and up-only.
- Migration ids must be strictly ordered and lexically increasing.
- Applied migrations store `id`, `checksum`, and `applied_at` in `schema_migrations`.
- Current migration manifest hash and latest seed version store in `schema_metadata`.
- Seeds are separate from migrations and must be idempotent.
- If a migration ships incorrectly, use a forward-fix migration. Do not rewrite or delete applied migrations.

## Manifest and checksum rules

- Manifests are TypeScript-defined ordered statement lists.
- Checksums use SHA-256 over the canonical manifest entry payload.
- If an already-applied migration id exists with a different checksum, validation fails immediately.
- The stored `migration_manifest_hash` must match the current ordered migration manifest after apply.

## Seed policy

- Client seeds initialize default categories and baseline settings only.
- Server seeds are supported but intentionally minimal at this stage.
- Re-running seeds must be safe and must not duplicate rows.
- `schema_metadata.seed_version` records the latest applied seed manifest entry id.

## Local developer flow

Start PostgreSQL:

```bash
pnpm db:server:up
```

Run both validation paths:

```bash
pnpm db:validate
```

Run server-only commands:

```bash
pnpm db:server:migrate
pnpm db:server:seed
pnpm db:server:reset
pnpm db:server:validate
```

Stop PostgreSQL:

```bash
pnpm db:server:down
```

The default local server connection string is:

```text
postgresql://postgres:postgres@127.0.0.1:56432/upi_spend_tracker
```

Set `SERVER_DATABASE_URL` to override it.

## CI validation

- Root `pnpm ci:verify` now includes `pnpm db:validate`.
- The GitHub Actions `Verify` job starts a PostgreSQL service container and provides `SERVER_DATABASE_URL`.
- Client validation uses a Node-side SQLite harness against the same migration and seed manifests used by the Expo runtime.
- Server validation resets PostgreSQL, applies migrations, runs seeds, verifies metadata, and reruns the manifests to confirm idempotence.

## Rollback and recovery guidance

- Local development recovery: reset PostgreSQL with `pnpm db:server:reset`, then rerun migrations and seeds.
- Client local recovery during development: remove the local app DB and restart the app so `ensureAppDatabaseReady()` reapplies the manifest.
- Production recovery: add a forward-fix migration, deploy it, and validate checksums in CI before merge.
- Never edit the SQL for an already-applied migration entry in place.
