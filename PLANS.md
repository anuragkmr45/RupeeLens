# PLANS.md

Use this template before implementing any multi-step, cross-module, or risky change.

Protocol notes:

- Keep exactly one active execution entry per run.
- Product delivery work should map to canonical backlog IDs in `docs/05_Backlog.*`.
- Workflow-only, environment-only, or tracking-only passes should use local `TRACK-*`, `ENV-*`, or `APP-*` identifiers instead of reusing canonical backlog ticket IDs.

## Active Plan

### API-004 — Implement Transactions, Items, Merchants, Categories, Rules, And Budgets APIs

- **Status:** completed
- **Ticket:** API-004
- **Goal:** Continue the server-side domain API suite by enforcing versioned delete semantics on the older domain entity routes so `API-004` gets closer to its write-version acceptance bar without widening into reports, sync, or staging-only closeout work.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `docs/09_Project_Phase_Status.md`, `docs/10_Codex_Workflow.md`, `README.md`, `docs/04_API_Contract.yaml`, `server/api/src/modules/domain/*` plus route tests, and `client/__tests__/app.test.tsx` for a stale validation-harness fix discovered while rerunning repo-wide checks.
- **Rationale:** The re-audit on 2026-03-29 still leaves `SET-002` blocked because `gh` is not installed and no `GH_TOKEN` or `GITHUB_TOKEN` is available. `CAP-003` and `CAP-004` remain blocked because `adb` cannot currently start a usable daemon from this environment, and `UX-005`, `INT-005`, and `API-003` are active but not closeable here because their remaining gaps are external acceptance or mobile integration evidence. `API-004` remains the earliest active canonical ticket, and the current repo truth still has a concrete acceptance gap: older delete routes for transactions, merchants, categories, rules, and budgets do not yet require entity versioning.
- **Risks:** This pass must stay inside versioned delete enforcement, field-specific validation, contract alignment, and route-level tests. It must not widen into reports (`API-005`), sync/mobile client work, or staging-only acceptance claims.
- **API / schema impact:** Expect server implementation under the existing OpenAPI contract. If the contract and repo truth disagree, update `docs/04_API_Contract.yaml` and run `pnpm lint:openapi`.
- **Rollout / flag plan:** No rollout flag. Keep domain APIs additive and isolated from current local-only mobile flows.
- **Validation commands:** `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm lint:openapi` if the contract changes.
- **Done when:** Older delete routes require entity versions consistently, OpenAPI and route tests reflect that behavior, repo checks stay green, and the backlog ticket advances truthfully without being overstated as staged or fully closed.
- **Outcome:** Enforced `VersionedDeleteRequest` bodies and conflict handling on the older transaction, merchant, category, rule, and budget delete routes; updated the OpenAPI contract and route tests to match; and reran `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test`, `pnpm lint:openapi`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` successfully on 2026-03-29. While rerunning the repo-wide suite, I also fixed a stale high-volume Inbox test fixture in `client/__tests__/app.test.tsx` so the root test gate reflects current date-filter behavior. `API-004` remains `in_progress` in the canonical backlog because its done-when still requires staging availability, but the repo-side write-version acceptance gap is now closed.

### API-006 — Implement Remote Config/Bootstrap API And Version Compatibility Checks

- **Status:** completed
- **Ticket:** API-006
- **Goal:** Close the partially implemented bootstrap endpoint by making responses explicitly cacheable, tightening runtime-version compatibility behavior, and proving the mobile app is already using the endpoint without widening scope into broader backend APIs.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `docs/09_Project_Phase_Status.md`, `docs/10_Codex_Workflow.md`, `docs/04_API_Contract.yaml` only if response headers or contract wording change, `server/api/src/modules/bootstrap/*`, `server/api/src/app.ts` only if bootstrap wiring changes, `packages/contracts/src/bootstrap-config.ts` only if contract changes are required, `client/src/features/bootstrap-config/runtime-config.ts` only if bootstrap-consumption evidence or compatibility handling needs tightening, and the corresponding tests.
- **Rationale:** The re-audit on 2026-03-28 still leaves `SET-002` blocked because `gh` is not installed and no `GH_TOKEN` or `GITHUB_TOKEN` is available. `CAP-003` and `CAP-004` also remain blocked because `adb devices` is empty. `UX-005`, `INT-005`, and `API-003` are active but not closeable from this environment because they still depend on external QA or mobile integration evidence. `API-006` is already partially implemented in repo truth through the signed bootstrap route and client bootstrap consumption, so the workflow prefers closing that earlier partial ticket before starting a larger backend ticket like `API-004`.
- **Risks:** Bootstrap work can sprawl into general remote-config, sync, or client rollout policy changes. This pass must stay inside cacheability, version/runtime compatibility, contract alignment, and proof that the endpoint is already consumed by the mobile app. It must not widen into parser behavior changes or unrelated API modules.
- **API / schema impact:** The bootstrap response body shape should remain additive and stable. If cache headers are documented in OpenAPI, update `docs/04_API_Contract.yaml` and run `pnpm lint:openapi`.
- **Rollout / flag plan:** Keep the existing signed bootstrap flow additive. Do not change rollout-channel semantics or parser templates beyond what is needed for version/runtime compatibility.
- **Validation commands:** `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test`, `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand bootstrap-config.test.ts app.test.tsx`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm lint:openapi` only if the OpenAPI contract changes.
- **Done when:** Bootstrap responses are explicitly cacheable and version-aware, runtime compatibility is enforced from the response in a way the mobile app can surface, repo quality gates stay green, and the canonical backlog ticket can move from `todo` to a truthful final state based on repo evidence.
- **Outcome:** Tightened the existing bootstrap route into a closeable API-006 implementation by adding explicit `Cache-Control`, `ETag`, and `Vary` headers on `GET /v1/bootstrap/config`, making runtime compatibility depend on both app version and native/runtime version, varying `configVersion` by compatibility inputs, and proving the mobile client already calls the endpoint with version-aware query params. Updated the OpenAPI contract to document the cache headers, and passed `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand bootstrap-config.test.ts`, `pnpm lint:openapi`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` on 2026-03-28. The backlog ticket can now close as `done` because the endpoint is both live and already consumed by the mobile app.

### API-003 — Implement Sync Push/Pull APIs With Idempotency And Cursor-Based Deltas

- **Status:** completed
- **Ticket:** API-003
- **Goal:** Add the first repo-side sync surface with authenticated push/pull routes, idempotency protection, optimistic-concurrency conflicts, cursor-based deltas, and durable local server persistence without widening scope into full domain APIs.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `docs/09_Project_Phase_Status.md`, `docs/10_Codex_Workflow.md`, `packages/contracts/src/*`, `server/api/src/app.ts`, `server/api/src/index.ts`, `server/api/src/lib/env*`, `server/api/src/modules/sessions/*`, `server/api/src/modules/sync/*`, and repo-truth docs only if ticket status or scope changes.
- **Rationale:** The re-audit on 2026-03-28 still leaves `SET-002` blocked because `gh` is not installed and no `GH_TOKEN` or `GITHUB_TOKEN` is available. `CAP-003` and `CAP-004` remain blocked because `adb devices` is empty again, and `UX-005` still depends on external QA/design acceptance. With `API-002` now closed, `API-003` is the earliest unblocked canonical `todo`, and it unlocks later server-domain and mobile sync work.
- **Risks:** Sync can sprawl into full domain CRUD, mobile outbox work, or a full server data model. This pass must stay inside generic outbox-operation push, generic entity-change pull, idempotency-key replay, optimistic-concurrency conflicts, and durable repository behavior. It must not spill into `API-004` entity CRUD or `SYNC-001` mobile outbox implementation.
- **API / schema impact:** No OpenAPI document change expected because the documented sync routes and payloads already exist. This pass adds shared TypeScript sync contracts and server module implementation underneath the existing contract.
- **Rollout / flag plan:** No rollout flag. Keep the sync routes additive and isolated from current local-only mobile flows until mobile integration arrives.
- **Validation commands:** `pnpm --filter @upi-spend-tracker/contracts typecheck`, `pnpm --filter @upi-spend-tracker/contracts test`, `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** Push handles duplicate retries idempotently, pull returns cursor-based deltas, conflict responses are machine-readable, repo quality gates stay green, and the ticket can move beyond `todo` truthfully. The canonical backlog ticket still needs mobile integration tests before it can close as `done`.
- **Outcome:** Added shared sync DTOs, a modular Fastify sync API module, auth reuse through the sessions service, a durable file-backed sync repository, `POST /v1/sync/push` with idempotency-key replay and optimistic-concurrency conflicts, and `GET /v1/sync/pull` with cursor-based deltas and bounded pagination. Focused contract, repository, service, and route tests now cover idempotent replay, conflict responses, restart-safe persistence, and authenticated delta pulls. `pnpm --filter @upi-spend-tracker/contracts typecheck`, `pnpm --filter @upi-spend-tracker/contracts test`, `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-28. The canonical backlog ticket remains `in_progress` because its done-when still requires mobile integration tests, which were not available in this environment.

### API-002 — Implement Guest Session And Multi-Device Pairing APIs

- **Status:** completed
- **Ticket:** API-002
- **Goal:** Continue API-002 by replacing the in-memory session/pairing store with durable server-side persistence so guest auth and pairing survive API restart.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `server/api/package.json`, `server/api/src/app.ts`, `server/api/src/modules/sessions/*`, server-side persistence or DB support files only if needed for API-002 durability, and repo-truth docs only if ticket status or scope changes.
- **Rationale:** The re-audit on 2026-03-28 still leaves `SET-002` blocked because `gh` is not installed and no `GH_TOKEN` or `GITHUB_TOKEN` is available. `CAP-003` and `CAP-004` also remain blocked because `adb devices` is empty again, and `UX-005` still depends on external QA/design acceptance. `API-002` is already active and its remaining gap is repo-side durability, so the workflow prefers continuing it before starting `API-003`.
- **Risks:** Session work can sprawl into full auth, sync, or a complete backend data model. This pass must stay inside durable session, refresh-token, device, and pairing-code persistence plus the minimal tests/wiring needed to prove restart-safe behavior. It must not spill into sync APIs or broader user/account management.
- **API / schema impact:** No OpenAPI shape change expected. Server-side persistence may need additive storage and repository wiring, but the route contracts should stay the same.
- **Rollout / flag plan:** No rollout flag. Keep the API surface additive and wire durability underneath the existing routes.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused API route/service tests for session creation, refresh rotation, pairing replay/expiry, and new restart/durable-repository coverage. Run `pnpm db:validate` only if this pass changes the canonical migration framework or DB schema manifests.
- **Done when:** Session, refresh-token, device, and pairing-code state survive API restart through a durable repository, route/service tests stay green, and backlog status can move truthfully beyond `in_progress`.
- **Outcome:** Replaced the in-memory session repository with an atomic file-backed store that persists users, devices, hashed access/refresh tokens, and one-time pairing codes under the API runtime’s local data path. The API now accepts `API_SESSION_STORE_FILE` via runtime config, the sessions module wires that path through `buildApp()`, and route/service/repository tests now cover restart-style persistence for refresh tokens and pairing codes. `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-28. The ticket can now close as `done` because guest session creation, refresh, device registration, pairing, replay/expiry protection, and restart-safe persistence are all implemented and validated.

### API-002 — Implement Guest Session And Multi-Device Pairing APIs

- **Status:** completed
- **Ticket:** API-002
- **Goal:** Add a first repo-side guest-account, token refresh, device registration, and one-time pairing flow through the modular API runtime without paid auth dependencies.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `docs/04_API_Contract.yaml`, `packages/contracts/src/*`, `server/api/src/app.ts`, `server/api/src/modules/sessions/*`, and repo-truth docs only if ticket status or scope changes.
- **Rationale:** The required re-audit on 2026-03-28 still leaves `SET-002` blocked because `gh` is not installed and no `GH_TOKEN` or `GITHUB_TOKEN` is available. `CAP-003` and `CAP-004` also remain blocked because `adb devices` is empty again, and `UX-005` still depends on external QA/design acceptance. `INT-008` remains blocked on `UX-007`, so `API-002` is now the earliest unblocked canonical `todo` with satisfied dependencies after `API-001`.
- **Risks:** Session work can sprawl into sync, full auth, or database persistence. This pass must stay inside guest-session creation, token refresh, device registration, pairing-code creation/consumption, and the service/repository/module seams needed to support them. It must not spill into sync APIs or broader user/account management.
- **API / schema impact:** Add new typed contracts and OpenAPI paths for guest session, refresh, device registration, and pairing. Prefer an additive repository implementation that keeps the module self-contained and testable.
- **Rollout / flag plan:** No rollout flag. Keep the API surface additive and separate from mobile enablement; clients can adopt it later.
- **Validation commands:** `pnpm lint:openapi`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused API route/service tests for session creation, refresh, device registration, pairing success, expiry, and replay/invalid-token behavior.
- **Done when:** New guest sessions, refresh, device registration, pairing-code creation, and pairing-code consumption all work through typed API routes with integration coverage, contract docs stay synchronized, and backlog status can move beyond `todo` truthfully.
- **Outcome:** Added typed session and device-pairing contracts, a new modular `sessions` API module with guest-session creation, refresh rotation, device registration, one-time pairing-code creation/consumption, and replay/expiry protection, plus focused contract and API route/service integration tests. `pnpm --filter @upi-spend-tracker/contracts typecheck`, `pnpm --filter @upi-spend-tracker/contracts test`, `pnpm --filter @upi-spend-tracker/api typecheck`, `pnpm --filter @upi-spend-tracker/api test`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-28. The canonical backlog ticket remains `in_progress` because the current repository implementation is intentionally in-memory, so guest auth and pairing do not survive API restarts yet and cannot be called beta-stable.

### INT-007 — Implement Rollups And Insights For Item, Category, Merchant, Time-Of-Day, And Day-Of-Week

- **Status:** completed
- **Ticket:** INT-007
- **Goal:** Add a local-first insights flow that computes fast item/category/merchant/time-of-day/day-of-week rollups with prior-period comparison and presents them in an in-app screen without introducing server dependency.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `client/src/features/spend-tracker/domain.ts`, `client/src/app/SpendTrackerApp.tsx`, focused client tests, and repo-truth docs only if ticket status or scope changes.
- **Rationale:** The required re-audit on 2026-03-28 still leaves `SET-002` blocked because `gh` is not installed and no `GH_TOKEN` or `GITHUB_TOKEN` is available. `CAP-003` and `CAP-004` also remain blocked because `adb devices` is empty again, so connected-Android closeout cannot run. `UX-005` still depends on external QA/design acceptance, and `UX-007` is still not actionable because it depends on `CAP-007`. `INT-007` is therefore the earliest unblocked canonical `todo` ticket with satisfied dependencies.
- **Risks:** Reporting work can sprawl into export, sync, server rollups, or broader search/timeline refactors. This pass must stay inside optimized local rollups, prior-period comparison, and an insights screen fed by device-local data. It must not spill into CSV export, backend APIs, or remote reporting.
- **API / schema impact:** No backend/API changes expected. Prefer optimized local rollup queries/computation over schema expansion unless persistence becomes truly necessary for performance.
- **Rollout / flag plan:** No new remote flag. Keep insights local-first and always available once implemented.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused client tests for rollup correctness, prior-period comparison, and a large local dataset path. Run `pnpm db:validate` only if persistence or migrations change.
- **Done when:** The app exposes local insights by item, category, merchant, time-of-day, and day-of-week with accurate prior-period comparison, uses optimized local rollups or cached queries that stay correct after transaction edits, and backlog status can move beyond `todo` truthfully.
- **Outcome:** Added an optimized local insights engine to the client that computes current-cycle and prior-cycle rollups in a single pass across transactions, keeps item/category/merchant/time-of-day/day-of-week sections local-first, and exposes those rollups through a new in-app Insights screen reachable from Home. The current/prior comparison reuses the same cycle-start logic as Home, the fixed-bucket time/day sections remain stable even with zero-spend buckets, and focused tests now cover correctness, Home navigation, and a generated 10k-transaction performance path. `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand domain.test.ts app.test.tsx`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-28. The ticket is now closed as `done`.

### INT-006 — Implement Budget Setup Screens And Threshold Alerts

- **Status:** completed
- **Ticket:** INT-006
- **Goal:** Add a real local budget-management flow with budget list and create/edit UX, plus deterministic on-device threshold alerts for 50%, 80%, and 100% that respect quiet mode without breaking local-only operation.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `client/src/features/spend-tracker/domain.ts`, `client/src/features/spend-tracker/persistence.ts`, `client/src/features/spend-tracker/db/migrations.ts`, `client/src/features/spend-tracker/db/migration-runner.ts`, `client/src/app/SpendTrackerApp.tsx`, focused client tests, and repo-truth docs only if ticket status or scope changes.
- **Rationale:** The required re-audit on 2026-03-28 still leaves `SET-002` blocked because `gh` is not installed and no `GH_TOKEN` or `GITHUB_TOKEN` is available. `CAP-003` also remains blocked because `adb devices` shows the physical device `e342703` but `cd client/android && ./gradlew :app:connectedDebugAndroidTest` still fails on `M2102J20SI - 13` with `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`, and `CAP-004` remains blocked by the same connected-Android closeout class. `UX-005` still depends on external QA/design acceptance. `INT-006` is therefore the earliest unblocked canonical `todo` ticket with satisfied dependencies.
- **Risks:** Budget work can sprawl into reports, server sync, or native OS notification plumbing. This pass must stay inside local budget CRUD, alert-threshold scheduling, quiet-mode handling, persistence, and the client UX needed to create/edit/review budgets. It must not spill into report rollups, server APIs, or Android-native alert delivery.
- **API / schema impact:** No backend/API changes expected. Local mobile SQLite will likely need additive budget and alert-persistence tables or equivalent additive persistence to keep budgets and threshold-alert review state across restarts.
- **Rollout / flag plan:** Reuse the existing `budgets_enabled` bootstrap flag. If that flag is disabled, keep Home honest and avoid exposing the full budget-management entrypoint.
- **Validation commands:** `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused client tests for budget CRUD, alert scheduling, quiet-mode behavior, migration coverage, and the end-to-end create-budget flow.
- **Done when:** Users can create and edit local budgets from the app, Home and the budget flow consume the canonical budget engine, threshold alerts are scheduled once per threshold crossing per cycle with quiet-mode-safe behavior, persistence survives restart/migration, and backlog status can move beyond `todo` truthfully.
- **Outcome:** Added a real local budget-management flow to the client with a dedicated budget screen, create/edit/delete UX, period and scope controls, quiet-mode controls, Home review cards for pending threshold alerts, and quiet-mode-aware 50/80/100 threshold scheduling that persists review state across restarts. Extended mobile SQLite persistence with additive `budgets` and `budget_threshold_alerts` tables plus migration/adoption coverage, kept Home on the existing canonical budget engine, and added focused domain, persistence, migration, and app-flow tests for alert scheduling and end-to-end budget creation. `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand domain.test.ts persistence.test.ts mobile-migrations.test.ts app.test.tsx`, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-28. The ticket is now closed as `done`.

### INT-005 — Build Budget Engine With Monthly, Weekly, Rolling, And Custom Cycles

- **Status:** completed
- **Ticket:** INT-005
- **Goal:** Add a canonical local budget engine that supports overall, category, merchant, and item scopes across monthly, weekly, rolling, and custom cycles, and have Home consume that same engine instead of hardcoded budget math.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `client/src/features/spend-tracker/domain.ts`, focused client tests, `client/src/app/SpendTrackerApp.tsx`, `client/src/lib/app-info.ts`, and repo-truth docs only if ticket status changes.
- **Rationale:** A fresh Android closeout probe on 2026-03-28 still leaves `CAP-003` blocked because `adb devices` shows the physical device `e342703` but `cd client/android && ./gradlew :app:connectedDebugAndroidTest` again failed to install `app-debug.apk` on `M2102J20SI - 13` with `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`. `SET-002` remains externally blocked, `UX-005` still depends on external QA/design acceptance, and `INT-005` is now the earliest unblocked canonical `todo` with satisfied dependencies.
- **Risks:** Budget work can sprawl into budget-setup UI, persistence, alerts, or reports. This pass must stay inside canonical local budget calculations, cycle-boundary correctness, scope matching, and Home using the shared engine. It must not spill into create/edit budget screens, alert scheduling, or sync.
- **API / schema impact:** No backend/API changes expected. The preferred implementation path is domain-first without adding local DB tables unless they are truly required for canonical engine behavior in this ticket.
- **Rollout / flag plan:** No new rollout flag. Keep budget setup UI behind the existing placeholder while landing the engine and Home integration underneath it.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused client tests for monthly, weekly, rolling, and custom cycle math and dashboard integration. Run `pnpm db:validate` only if implementation ends up changing local persistence or migrations.
- **Done when:** Budget summaries support all required scope and period types, threshold/projection math is deterministic and local-first, Home uses the canonical budget engine instead of hardcoded target math, classification-driven transaction changes immediately affect budget summaries, and backlog tracking can move to `done` truthfully.
- **Outcome:** Added a canonical local budget engine to the spend-tracker domain with support for overall, category, merchant, and item scopes across monthly, weekly, rolling, and custom cycles, including deterministic spent/remaining/projected/threshold calculations. Home now consumes that engine for its budget-progress card instead of the old demo-target math and shows projected spend plus threshold state, while budget creation/editing and alerts remain explicitly deferred to the next ticket. Added domain coverage for all supported cycle types, dashboard integration against the canonical engine, and immediate budget updates after classification changes, plus an app-level assertion that Home renders the projected budget summary. `pnpm --filter @upi-spend-tracker/client typecheck`, focused client tests, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all passed on 2026-03-28. The execution is complete, but the canonical backlog ticket stays `in_progress` because its own done-when still requires product and QA acceptance that was not available in this environment.

### INT-004 — Implement History-Based Suggestion Ranker

- **Status:** completed
- **Ticket:** INT-004
- **Goal:** Replace the current single-transaction history matching with a weighted local history ranker that improves suggestions over time using merchant, amount bucket, hour bucket, weekday, recency, and frequency factors while keeping heuristic suggestions suggestion-only.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `client/src/features/spend-tracker/domain.ts`, focused client tests, and repo-truth docs only if ticket status changes.
- **Rationale:** A fresh closeout probe still leaves `CAP-003` and `CAP-004` blocked on 2026-03-28 because `adb devices` shows a connected phone but `cd client/android && ./gradlew :app:connectedDebugAndroidTest` again failed to install `app-debug.apk` on `M2102J20SI - 13` with `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`. `UX-005` still depends on external QA/design acceptance, and repo-truth audit found stale backlog drift for `INT-003` and `UX-005` that must be reconciled before starting the next ticket. `INT-004` is therefore the next actionable canonical ticket with satisfied dependencies.
- **Risks:** Suggestion work can easily blur into explicit-rule behavior, merchant normalization, or persistence changes that do not belong to this ticket. This pass must stay inside weighted local history ranking, factor explanations, deterministic ordering, and tests proving improved ranking behavior without silently auto-applying heuristics.
- **API / schema impact:** No backend/API changes expected. Local inference should remain computed from existing on-device transaction history unless a narrow additive local shape change is truly necessary.
- **Rollout / flag plan:** No new rollout flag. Keep rules first, weighted history ranker second, and preserve the rule that heuristic/history suggestions never auto-save silently.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused client tests for weighted ranking behavior and factor explanations. Run `pnpm db:validate` only if implementation ends up changing local persistence or migrations.
- **Done when:** History suggestions aggregate repeated confirmed classifications, use weighted merchant/amount/time/recency/frequency factors with explainable output, remain suggestion-only unless an explicit saved rule applies, and backlog tracking can move to `done` truthfully.
- **Outcome:** Replaced the prior single-transaction history match with a weighted local history ranker that aggregates repeated confirmed classifications per item/category and scores them with merchant, amount bucket, hour bucket, weekday, recency, and frequency contributions while staying below explicit saved-rule priority. Suggestion explanations now surface top factors such as merchant repeat, recency, amount-bucket matches, and confirmation count, and the domain test suite now includes backtest-style cases proving repeated confirmations outrank one-offs and recency breaks ties between equally repeated candidates. `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand domain.test.ts`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all passed on 2026-03-28. Ticket status moved to `done`.

### INT-003 — Implement Rule Engine For Merchant, Amount, And Time-Based Suggestions

- **Status:** completed
- **Ticket:** INT-003
- **Goal:** Add a deterministic local rule engine that gives explicit user rules priority over history and keyword heuristics, persists those rules in SQLite, and uses them in quick classify and manual add without silently auto-saving heuristic matches.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `client/src/features/spend-tracker/domain.ts`, `client/src/features/spend-tracker/persistence.ts`, `client/src/features/spend-tracker/db/migrations.ts`, `client/src/features/spend-tracker/db/migration-runner.ts`, `client/src/app/SpendTrackerApp.tsx`, focused client tests, and repo-truth docs only if ticket status changes.
- **Rationale:** The workflow required a recheck of blocked tickets before starting new work. `CAP-003` is still blocked on 2026-03-28 because `adb devices` shows a connected phone but `./gradlew :app:connectedDebugAndroidTest` still fails to install the debug APK on `M2102J20SI - 13` with `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`. `CAP-004` remains blocked by the same connected-Android closeout class, and `UX-005` still depends on external QA/design acceptance. `INT-003` is therefore now the earliest actionable canonical `todo` with satisfied dependencies.
- **Risks:** This pass touches the local transaction/classification model, mobile SQLite schema, and several client flows that already rely on history-based suggestions. It must stay within deterministic explicit rules, explanation metadata, priority/conflict handling, and local classify/manual integration. It must not spill into server sync, budgets, or later history-ranker work.
- **API / schema impact:** No backend/API changes. Local mobile SQLite will likely need additive rule-table migrations and rule-aware persistence.
- **Rollout / flag plan:** Keep rule evaluation entirely local-first with no new remote flag. Explicit user-approved rules may auto-apply; heuristic suggestions must remain suggestion-only.
- **Validation commands:** `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused client tests for rule evaluation priority/conflicts, persistence/migration behavior, and quick-classify/manual rule integration.
- **Done when:** Explicit user rules persist locally, override history/keyword suggestions deterministically, expose explanation metadata and optional auto-apply only for user-approved rules, integrate into classify/manual flows, and backlog status can move to `done` only if those acceptance criteria are fully satisfied.
- **Outcome:** Added a deterministic local rule engine with SQLite-backed `classification_rules`, additive mobile migrations, and rule evaluation that now runs before history and merchant-keyword heuristics using merchant, amount bucket, hour bucket, and weekday factors. Quick classify and manual add both persist reusable rules through real toggles, explanation metadata is exposed on suggestions, auto-apply now runs only for explicit user-approved rules, and saved rules stay aligned when categories or merchants merge. Focused client typecheck/tests plus `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all passed on 2026-03-28. Ticket status moved to `done`.

### INT-002 — Build Merchant Normalization And Alias Management Pipeline

- **Status:** completed
- **Ticket:** INT-002
- **Goal:** Add a local merchant directory with deterministic normalization, alias mapping, merge/split controls, and review-safe fuzzy suggestions so merchant reporting stops depending on raw notification strings.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `client/src/features/spend-tracker/domain.ts`, `client/src/features/spend-tracker/persistence.ts`, `client/src/features/spend-tracker/db/migrations.ts`, `client/src/features/spend-tracker/db/migration-runner.ts`, `client/src/app/SpendTrackerApp.tsx`, focused client tests, and repo-truth docs only if ticket status changes.
- **Rationale:** `CAP-003` and `CAP-004` remain environment-blocked, `UX-005` still depends on external QA/design acceptance, and `UX-007` depends on `CAP-007`. `INT-002` is now the earliest unblocked canonical `todo` with satisfied dependencies, and repo truth still reports merchants from raw strings rather than a stable alias-backed local identity model.
- **Risks:** This pass touches the local transaction shape, mobile SQLite schema, dashboard/search/reporting math, and multiple mobile screens. It must stay inside deterministic merchant cleanup, alias management, merge/split controls, and safe fuzzy review cues. It must not spill into rules, budgets, sync, or backend APIs.
- **API / schema impact:** No backend/API changes. Local mobile SQLite schema will likely need additive merchant and alias tables plus transaction raw-merchant support for truthful normalization.
- **Rollout / flag plan:** Keep merchant normalization entirely local-first with no new remote flags.
- **Validation commands:** `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused client tests for alias resolution, merge/split preservation, fuzzy review suggestions, and merchant-aware persistence/migration behavior.
- **Done when:** Repeated raw merchant variants resolve to stable local merchant identities when deterministic cleanup or aliases allow it, manual alias/merge/split controls update local transactions safely, low-confidence fuzzy matches surface for review instead of auto-merge, and backlog status can move to `done` only if those acceptance criteria are satisfied.
- **Outcome:** Added a local merchant directory with deterministic normalization, saved merchant plus alias tables, additive mobile SQLite migrations for merchant aliases and raw merchant strings, merchant-aware classify/search behavior, a Home-linked merchant-management screen with likely-merge review plus alias split controls, and truthful raw-versus-normalized merchant detail in the timeline flow. Added focused domain, persistence, migration, and app tests for deterministic normalization, safe review-only fuzzy candidates, alias merge/split behavior, merchant-aware persistence, and the in-app merge review path. `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test -- --runInBand domain.test.ts persistence.test.ts mobile-migrations.test.ts app.test.tsx`, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-27. Ticket status moved to `done`.

### INT-001 — Implement Category Management And Seeded Default Categories

- **Status:** completed
- **Ticket:** INT-001
- **Goal:** Replace the hardcoded category list with a persisted local category model that ships seeded defaults, supports user CRUD plus merge, and flows through classification, split, search, and dashboard summaries as first-class data.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `client/src/features/spend-tracker/domain.ts`, `client/src/features/spend-tracker/persistence.ts`, `client/src/features/spend-tracker/db/migrations.ts`, `client/src/features/spend-tracker/db/migration-runner.ts`, `client/src/app/SpendTrackerApp.tsx`, focused client tests, and repo-truth docs only if ticket status changes.
- **Rationale:** `CAP-003` and `CAP-004` remain blocked by the current Android environment, `UX-005` still depends on external QA/design acceptance, and `UX-007` is blocked on `CAP-007`. `INT-001` is now the earliest unblocked `todo` ticket with satisfied dependencies, and repo truth still uses hardcoded category options instead of the seeded, user-managed category model required by the PRD/backlog.
- **Risks:** This pass touches the local app-domain schema, persistence, and several mobile flows that currently assume hardcoded categories. It must stay within seeded defaults plus user CRUD/merge and must not spill into merchant normalization, rules, budgets, or sync.
- **API / schema impact:** No backend/API changes. Local mobile SQLite schema will need additive category-table migrations and category-aware persistence.
- **Rollout / flag plan:** Keep all category management local-first with no new remote flags.
- **Validation commands:** `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused client tests for category CRUD, merge preservation, default seeding, and migration behavior.
- **Done when:** Default categories seed on first launch and migration, custom categories can be added/edited/deleted/merged locally, merged categories preserve historical transaction meaning, classification flows use the persisted category list, and backlog status can move to `done` only if those acceptance criteria are satisfied.
- **Outcome:** Added a first-class local category model with seeded default categories, persisted category rows plus additive SQLite migrations, and create/edit/delete/merge helpers that now flow through dashboard summaries, Timeline search/detail, quick classify, split items, and manual add. Added focused app, domain, persistence, and migration coverage for category CRUD, merge preservation, first-launch defaults, and category-aware persistence. `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-27. This pass also corrected stale backlog tracking drift where `CAP-006` and `UX-007` had incorrectly inherited unrelated `INT-001` progress in one or more backlog files.

### UX-006 — Build Timeline, Transaction Detail, And Search/Filter Views

- **Status:** completed
- **Ticket:** UX-006
- **Goal:** Extend the local transaction model so Timeline detail can show durable parser metadata, notes, edits, and classification history instead of only the latest flat state.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `client/src/features/spend-tracker/domain.ts`, `client/src/features/spend-tracker/persistence.ts`, `client/src/features/spend-tracker/db/migrations.ts`, `client/src/features/spend-tracker/db/migration-runner.ts`, `client/src/app/SpendTrackerApp.tsx`, focused client tests, and repo-truth docs only if ticket status changes.
- **Rationale:** `CAP-003` and `CAP-004` remain blocked because `adb devices` is empty again, while `UX-006` is still the earliest active ticket whose remaining acceptance is now solvable in repo code. The current blocker is not navigation anymore; it is missing local transaction metadata for parser context, notes, and change history.
- **Risks:** This pass touches the local transaction schema, migration path, persistence, and multiple client flows. It must stay inside UX-006 scope: durable local parser/note/history support plus detail/search integration. It must not spill into capture import, merchant normalization, or settings/export tickets.
- **API / schema impact:** No backend/API changes. Local mobile SQLite schema will likely need additive migrations for transaction metadata/history.
- **Rollout / flag plan:** Keep using the existing local-first Timeline flow and the current search flag; no new rollout surface.
- **Validation commands:** `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused client tests for history search, detail rendering, note/parser persistence, and edit-history behavior.
- **Done when:** Timeline detail can show real local parser context when present, durable classification/audit history, searchable notes, and clear edit/delete behavior without inventing unavailable capture data; backlog status can move to `done` only if the acceptance criteria are then fully satisfied.
- **Outcome:** Extended the local transaction model with durable note, parser-metadata, and history fields plus additive mobile SQLite migrations for those records. Timeline search now matches saved notes, transaction detail shows parser context plus classification/audit history, and users can save a local note without leaving detail. Added migration, persistence, domain, and app-flow coverage for parser/note/history persistence and timeline search. `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed on 2026-03-27; the app test harness was also tightened so the async capture-diagnostics effect no longer emits the prior non-failing React `act(...)` warning.

### UX-006 — Build Timeline, Transaction Detail, And Search/Filter Views

- **Status:** completed
- **Ticket:** UX-006
- **Goal:** Add a local-first history flow with searchable timeline browsing, transaction detail, and edit/delete handoff that works entirely from the current device data.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `docs/09_Project_Phase_Status.md`, `docs/10_Codex_Workflow.md`, `client/src/app/SpendTrackerApp.tsx`, `client/src/features/spend-tracker/domain.ts`, `client/src/lib/app-info.ts`, and focused client tests.
- **Rationale:** `CAP-003` and `CAP-004` remain blocked by connected-Android validation because the attached device still cancels debug APK installation with `INSTALL_FAILED_USER_RESTRICTED`. `UX-005` already has its repo-side split implementation, so `UX-006` is now the earliest actionable `todo` ticket with satisfied dependencies.
- **Risks:** The current local transaction model does not yet store real parser metadata or a durable audit log. This pass must not fake unavailable history. It should land a truthful local timeline/search/detail flow, make edit/delete reachable with clear confirmation, and leave parser/audit-history richness explicitly open if the current model cannot support full closeout.
- **API / schema impact:** No backend/API changes planned. Avoid DB schema changes unless a narrow, justified local history field becomes necessary.
- **Rollout / flag plan:** Reuse the existing search feature flag and keep the flow local-first with no network dependency.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused client tests for timeline search, detail rendering, and edit/delete flows. Run `pnpm db:validate` only if persistence or migration code changes.
- **Done when:** Users can open a real history/search flow from Home, find transactions with local filters quickly, open a transaction detail view, and reach edit/delete actions with clear confirmation, while tracking remains truthful about any still-missing parser/audit-history depth.
- **Outcome:** Added a local-first Timeline screen reachable from Home search, with grouped day sections, local search across merchant/item/category, source/status/amount/date filters, and transaction-detail navigation. Added a transaction-detail screen with truthful local-state copy, current item rows, source/status context, clear edit handoff back into quick classify or split, and confirmed local delete with explicit confirmation. Expanded domain helpers and tests for grouped history/search plus app-level timeline/detail/edit/delete flows. `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed. The ticket remains `in_progress` in backlog tracking because the current mobile transaction model still does not attach durable parser metadata or classification/audit history to each record, so full acceptance cannot be claimed yet.

### CAP-003 — Implement Capture Dedupe And Replay Protection

- **Status:** blocked
- **Ticket:** CAP-003
- **Goal:** Close the blocked dedupe ticket now that a connected Android device is available again, and move it to `done` if on-device validation succeeds.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, and repo-truth docs only if closeout succeeds. Android native/test files should change only if connected validation exposes a real CAP-003 gap.
- **Rationale:** `adb devices` now reports `e342703	device`, so the environment-only blocker changed materially. The workflow prefers closing earlier blocked tickets before starting untouched work, and `CAP-003` is the earliest blocked capture ticket whose remaining gap may now be resolvable on-device.
- **Risks:** Connected Android validation may still fail because of install policy, device state, or an uncovered native bug. This pass must stay scoped to CAP-003 closeout and must not spill into CAP-004 repository closeout or later notification-action work.
- **API / schema impact:** None expected unless connected validation exposes a narrow native dedupe defect.
- **Rollout / flag plan:** No rollout change. Confirm the existing bootstrap-delivered dedupe thresholds and local diagnostics rather than widening scope.
- **Validation commands:** `adb devices`, `cd client/android && ./gradlew :app:testDebugUnitTest :app:connectedDebugAndroidTest`, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** CAP-003 has direct connected-Android validation evidence for dedupe behavior, repo quality gates remain green, and backlog tracking can move from `blocked` to `done` truthfully.
- **Outcome:** `adb devices` now shows the physical Android device `e342703`, and `cd client/android && ./gradlew :app:testDebugUnitTest` passed. The closeout still remains blocked because `cd client/android && ./gradlew :app:connectedDebugAndroidTest` failed on 2026-03-27 while installing `/Users/anuragkumar/Desktop/RupeeLens/client/android/app/build/outputs/apk/debug/app-debug.apk` with `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user` on `M2102J20SI - 13`. `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` also passed. No repo-side CAP-003 code changes were needed in this pass; the remaining blocker is device policy/user confirmation.

### UX-005 — Implement Split-Items Screen And Remainder Handling

- **Status:** completed
- **Ticket:** UX-005
- **Goal:** Add a full-screen split flow for one payment to map to multiple items or categories, with running totals, remainder handling, and Inbox visibility for partially classified transactions.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `client/src/app/SpendTrackerApp.tsx`, `client/src/features/spend-tracker/domain.ts`, `client/src/features/spend-tracker/persistence.ts`, and focused client tests only.
- **Rationale:** `CAP-004` remains blocked on connected Android validation because `adb devices` is empty, so the workflow moves to the next actionable canonical ticket. `UX-005` is the earliest remaining `todo` ticket with satisfied dependencies, and the app already has a real split placeholder inside the quick-classify sheet.
- **Risks:** Split-flow work touches the core local domain model, classify UX, and persistence. The pass must stay inside split rows, running totals, remainder assignment, partial-classification visibility, and local save behavior. It must not spill into timeline/search (`UX-006`), rule engine work, or native notification actions.
- **API / schema impact:** No backend/API changes. Local spend-tracker persistence may need additive state to store partially classified split transactions and multiple ordered items safely.
- **Rollout / flag plan:** No new flag. Keep the flow local-first and available from the existing classify/manual paths only.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus focused client tests for split totals, remainder edge cases, and Inbox visibility.
- **Done when:** Users can add, edit, reorder, and delete split rows; the UI shows allocated vs remaining amount clearly; remainder can be saved as explicit tip/tax/fees/unknown or left unresolved; partially classified transactions remain visible in Inbox; and repo quality gates stay green.
- **Outcome:** Added a full-screen split-items flow to the client with dynamic line-item rows, local add/remove/reorder controls, running allocated vs remaining totals, explicit remainder handling, and partial-save behavior that keeps transactions visible in Inbox as `partially_classified`. Updated the local domain helpers, persistence status validation, and client tests for split helpers plus the end-to-end partial-save flow. `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all passed. The ticket stays `in_progress` rather than `done` because the backlog still requires external QA/design acceptance for final closeout, and that acceptance was not available in this environment.

### CAP-004 — Create Native Capture Database And Repository Layer

- **Status:** blocked
- **Ticket:** CAP-004
- **Goal:** Replace the ad hoc native snapshot helper with a Room-backed capture repository that persists capture events, replies, and sync markers even when the JS runtime is inactive.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, Android native capture files under `client/android/app/src/main/java/com/upispendtracker/client/capture/*`, `client/android/app/build.gradle`, related Android unit/instrumentation tests, and repo-truth docs only if CAP-004 status or scope changes.
- **Rationale:** `CAP-003` remains environment-blocked because the connected phone still rejects debug APK installation with `INSTALL_FAILED_USER_RESTRICTED`, so the workflow moves to the next unblocked ticket. `CAP-004` is now the earliest remaining `P0` ticket with satisfied dependencies and unlocks later native quick-classify actions and domain import work.
- **Risks:** This pass changes the native Android capture persistence boundary. It must preserve current listener/parser/dedupe behavior, migrate or adopt existing stored snapshots safely, and stay inside capture-repository scope only. It must not spill into CAP-005 actionable notifications or CAP-007 domain import.
- **API / schema impact:** No backend/API contract change expected. Android-native capture storage will move to a Room-backed database with entities for capture events, capture replies, and sync markers plus repository methods for insert, update, fetch pending, diagnostics, and pruning.
- **Rollout / flag plan:** No new flag. Keep respecting the existing bootstrap capture kill switch and local-first behavior while swapping the native persistence layer underneath.
- **Validation commands:** `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `cd client/android && ./gradlew :app:testDebugUnitTest`, and connected Android validation only if the device policy allows installation.
- **Done when:** Raw and parsed capture fields survive process death through the Room repository, repository operations are thread-safe and test-covered, retention pruning keeps classified/native-linked data intact, and repo quality gates plus feasible Android validation remain green.
- **Outcome:** Replaced the ad hoc native SQLite helper with a Room-backed capture repository and schema migrations for `capture_events`, `capture_replies`, and `capture_sync_markers`, while preserving the existing listener/parser/dedupe APIs through a compatibility typealias. Added repository methods for insert, reply persistence, sync marker updates, pending fetch, state updates, diagnostics, and retention-safe raw payload pruning, plus a new connected-Android repository instrumentation suite. `./gradlew :app:testDebugUnitTest`, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed. The remaining blocker is environment-only: `./gradlew :app:connectedDebugAndroidTest` compiled the new instrumentation coverage but could not run because `adb devices` was empty on 2026-03-27, so CAP-004 stays blocked until a device or emulator is attached again.

### CAP-002 — Implement Parser Registry With Package-Specific and Generic Parsers

- **Status:** completed
- **Ticket:** CAP-002
- **Goal:** Convert allowlisted raw notification snapshots into structured native capture parse results with package-specific parsers first, generic fallback second, auditable provenance, and reason-coded failures.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, Android native capture files under `client/android/app/src/main/java/com/upispendtracker/client/capture/*`, related Android unit/instrumentation tests, and repo-truth docs only if current scope/status changes.
- **Rationale:** `SET-002` is still externally blocked, `CAP-001` is now done, and `CAP-002` is the earliest remaining `P0` ticket whose dependencies are satisfied. The repo already stores raw native snapshots, but it still has no parser registry, no package-specific parse logic, no generic fallback, no structured parse metadata, and no reason-coded parse failures.
- **Risks:** Parser work can easily spill into dedupe or repository scope. This pass must stay limited to parser interfaces, parser ordering, structured outcomes, provenance/failure recording, and fixture-driven validation. It must not add dedupe heuristics or pretend CAP-004 Room/repository work is complete.
- **API / schema impact:** No backend/API contract change expected. Native Android capture storage may gain parser-result fields or parse-attempt metadata needed to retain structured outcomes and reason codes.
- **Rollout / flag plan:** Keep respecting the existing capture/parser remote kill switch in app-level copy; do not invent a new runtime-config channel in native code during this pass.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm db:validate`, and targeted Android Gradle unit/instrumentation tests for parser fixtures if the local environment supports them.
- **Done when:** Registry order is package-specific then generic, parsed results include amount/merchant/timestamp/source app/confidence where available, failures persist with reason codes instead of silent drops, fixture-based parser coverage exists, and repo quality gates remain green.
- **Outcome:** Added a native parser registry with package-specific parsers for Google Pay, PhonePe, Paytm, and BHIM plus generic fallback parsers, stored structured parse success/failure metadata alongside raw native snapshots, added a 30-plus-case fixture suite, and passed Android unit tests, connected Android instrumentation, `pnpm db:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

### CAP-001 — Build Android NotificationListenerService and Allowlist Controls

- **Status:** completed
- **Ticket:** CAP-001
- **Goal:** Finish the listener closeout now that the connected Android device allows androidTest APK installation, and move CAP-001 to `done` if the remaining native validations pass.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `docs/09_Project_Phase_Status.md`, and `docs/10_Codex_Workflow.md`.
- **Rationale:** `SET-002` is still blocked, and CAP-001 must be preferred first because the previous blocker changed materially: the connected phone is available and now accepts the androidTest APK install path that previously failed.
- **Risks:** If connected Android validation still fails, the ticket must go back to `blocked` with the exact device/runtime reason. This pass must stay a closeout pass only and not spill into CAP-002 parser work.
- **API / schema impact:** None expected. Validation-only closeout unless repo-truth docs change.
- **Rollout / flag plan:** No rollout change. Confirm the existing Android-only local-first capture foundation rather than expanding scope.
- **Validation commands:** `adb devices`, `adb install -r -t .../app-debug-androidTest.apk`, `cd client/android && ./gradlew :app:connectedDebugAndroidTest`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** CAP-001 acceptance is supported by real connected-device evidence, the connected Android test suite runs successfully, and backlog tracking can be moved from blocked to done.
- **Outcome:** The connected Android device (`e342703`, Android 13 / `M2102J20SI`) accepted the androidTest APK, and `./gradlew :app:connectedDebugAndroidTest` passed on-device with 3 instrumentation tests. That clears the prior MIUI install-policy blocker, so CAP-001 is now closed as `done`; repo-truth docs now point to `CAP-002` as the next capture ticket.

### CAP-001 — Build Android NotificationListenerService and Allowlist Controls

- **Status:** blocked
- **Ticket:** CAP-001
- **Goal:** Close the Android-native listener ticket by using the newly attached device to validate real permission reflection, allowlist behavior, and listener stability before moving on to parser work.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, Android test or capture files only if closeout validation exposes a real gap, and repo-truth docs if CAP-001 can now be closed.
- **Rationale:** `CAP-001` was blocked only because no emulator or phone was attached. `adb devices` now shows a connected Android device, so the workflow requires preferring this closeout pass before starting `CAP-002`.
- **Risks:** Device-level validation may expose listener-permission, manifest, bridge, or lifecycle gaps that unit tests did not catch. The pass must stay scoped to CAP-001 closeout and should not spill into parser, dedupe, or domain-import work.
- **API / schema impact:** No backend/API changes expected. Closeout may add Android validation tests or tighten native-client wiring only if needed.
- **Rollout / flag plan:** Keep respecting the existing remote capture kill switch. Any device validation should confirm the app remains local-first and Android-only for native capture.
- **Validation commands:** `adb devices`, targeted Android install/launch/validation commands, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm db:validate` if client persistence or DB-touching code changes.
- **Done when:** CAP-001 acceptance is proven on a connected Android target, backlog tracking can be truthfully moved from blocked to done, and repo quality gates remain green.
- **Outcome:** Reopened CAP-001 once `adb devices` showed a physical Android 13 device, verified the listener service can be approved from adb and is present in `dumpsys notification`, confirmed supported packages like Google Pay and PhonePe exist on the device, and added a new `NotificationCaptureProcessor` plus connected-Android instrumentation coverage for allowlist filtering and snapshot persistence. Repo lint/typecheck/test/build stayed green, and Android unit-test plus debug/androidTest packaging passed. The ticket remains blocked because MIUI rejects the androidTest APK install with `INSTALL_FAILED_USER_RESTRICTED`, and the phone stays pattern-locked for UI inspection, so the connected instrumentation suite and direct UI validation still cannot complete on this target.

### CAP-001 — Build Android NotificationListenerService and Allowlist Controls

- **Status:** blocked
- **Ticket:** CAP-001
- **Goal:** Add the first Android-native capture layer so notification-listener permission state, per-app allowlist filtering, raw snapshot persistence, and app-visible diagnostics all exist before parser work starts.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, Android native files under `client/android/app/src/main/java/com/upispendtracker/client/*`, `client/android/app/src/main/AndroidManifest.xml`, new client-side capture bridge/helpers, `client/src/app/SpendTrackerApp.tsx`, related app/native tests, and repo-truth docs if the implementation changes current scope/status.
- **Rationale:** `SET-002` remains blocked, `SET-006` is now closed, and `CAP-001` is the earliest remaining `P0` canonical ticket with satisfied dependencies. The Android app currently has no listener service, no native snapshot store, no allowlist enforcement, and no real permission reflection in UI.
- **Risks:** Native capture touches Android lifecycle, permissions, local persistence, and JS bridge seams. The implementation must stay honest about what belongs to later tickets: no parsing, no dedupe, no capture import into the domain DB, and no fake instrumentation success if device/emulator validation is unavailable.
- **API / schema impact:** No backend/API contract change expected. Adds Android-native capture storage and JS bridge methods inside the client app only.
- **Rollout / flag plan:** Respect the existing remote bootstrap kill switch for capture-related UI. Native capture should remain Android-only and local-first.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus targeted Android Gradle compile/test commands and native validation if the environment supports it.
- **Done when:** Android has a real `NotificationListenerService`, only allowlisted packages are stored, UI reflects live permission state and allowlist choices, diagnostics show recent native-capture status, and repo quality gates plus feasible Android validation stay green.
- **Outcome:** Added an Android-native notification listener service, SharedPreferences-backed allowlist store, local raw-snapshot SQLite helper, React Native diagnostics bridge, and Home/onboarding permission diagnostics while keeping root lint/typecheck/test/build, `pnpm db:validate`, client tests, and Android Gradle unit-test/debug-assemble validation green. The ticket remains blocked on supported-device closeout because `adb devices` shows no attached emulator or phone, so listener callbacks and sample-app flows could not be manually or instrumentally validated on Android.

### SET-006 — Implement Feature Flags and Remote Parser Config

- **Status:** completed
- **Ticket:** SET-006
- **Goal:** Add the first real bootstrap-config loop across API and mobile so feature flags, parser templates, rollout channel selection, cache TTL handling, and stale-safe fallback all exist before native parser work expands.
- **Touched files/modules:** `PLANS.md`, `docs/04_API_Contract.yaml`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `docs/09_Project_Phase_Status.md`, `docs/10_Codex_Workflow.md`, new bootstrap config types/helpers under `packages/contracts` and `packages/shared-utils`, new bootstrap module files under `server/api/src/modules/*`, new client remote-config cache/fetch helpers, and focused tests for server/client bootstrap behavior.
- **Rationale:** `SET-002` remains blocked, `SET-003` is now closed, and `SET-006` is the earliest remaining `P0` canonical ticket with satisfied dependencies. It also lays rollout and kill-switch groundwork before Android-native parser expansion.
- **Risks:** The config loop must stay lean and truthful: enough to support rollout, TTL, stale fallback, and parser-template transport without pretending that native capture or cloud sync already exist. API contract, client caching, and shared signature/version logic must stay synchronized.
- **API / schema impact:** Adds the first real `/v1/bootstrap/config` implementation and shared typed DTOs. No DB schema change was required because the client cache lives in Expo's local key-value store.
- **Rollout / flag plan:** The feature itself introduces the rollout/kill-switch substrate. Default config should keep current local-only behavior intact even when remote fetch fails.
- **Validation commands:** `pnpm lint`, `pnpm lint:openapi`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** The API serves typed bootstrap config by platform/version/channel, the client loads cached or bundled config immediately and refreshes in background, stale fallback is observable in the app state, parser templates and feature flags are transport-driven, and all repo quality gates remain green.
- **Outcome:** Added shared bootstrap-config DTOs plus integrity/version helpers, implemented a live Fastify `/v1/bootstrap/config` module with rollout-channel overrides and signed payloads, added a client-side cached bootstrap loop with background refresh and stale-safe fallback observability, surfaced feature-flag/parser-template status in the app, aligned the OpenAPI contract, and passed `pnpm lint`, `pnpm lint:openapi`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

### SET-003 — Create Mobile Design System Tokens and UI Primitives

- **Status:** completed
- **Ticket:** SET-003
- **Goal:** Land a shared mobile UI package with reusable tokens and base primitives, wire the current Expo app onto it, and add a showcase screen plus snapshot coverage so later feature tickets stop re-implementing UI structure inline.
- **Touched files/modules:** `PLANS.md`, `package.json`, `README.md`, `docs/09_Project_Phase_Status.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, new `packages/mobile-ui/*`, `client/package.json`, `client/src/theme/colors.ts`, `client/src/app/SpendTrackerApp.tsx`, and client snapshot/user-flow tests.
- **Rationale:** `SET-002` remains blocked, `SET-004` is now closed, and `SET-003` is the earliest remaining Sprint 0 foundation ticket with satisfied dependencies. The current client still keeps ad hoc colors, buttons, cards, chips, and sheet styles inline, so a shared package is the clearest next unblocker for later feature work.
- **Risks:** The new package must work cleanly with Expo/Metro, the app refactor must not regress the current onboarding/Home/Inbox/manual flows, and the package should stay lean instead of turning into an over-abstracted design framework.
- **API / schema impact:** No backend or persistence changes. Client-side UI packaging and theming only.
- **Rollout / flag plan:** No flag. This becomes the default UI foundation for the mobile app and future feature screens.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** Tokens live in one shared package, the mobile app consumes the package primitives, light and dark theme support exists in the base components, a showcase screen demonstrates all required primitives, and snapshot plus repo quality checks pass.
- **Outcome:** Added the new shared `@upi-spend-tracker/mobile-ui` workspace package with semantic tokens plus `AppShell`, `Button`, `Card`, `ListItem`, `BottomSheet`, `TextField`, `Chip`, `EmptyState`, `SectionHeader`, and `KPIBlock`; moved the Expo client onto those primitives through wrapper refactors and token consumption; added a Home-reachable design-system showcase screen; and covered the shared UI package with light/dark snapshot tests while keeping the existing onboarding, Home, Inbox, and manual-entry flows green.

### SET-004 — Implement Database Migration Framework for Mobile SQLite and Server PostgreSQL

- **Status:** completed
- **Ticket:** SET-004
- **Goal:** Land a real migration framework for both mobile SQLite and server PostgreSQL, including ordered manifests, schema version tracking, developer validation scripts, and CI enforcement through a canonical `pnpm db:validate` command.
- **Touched files/modules:** `PLANS.md`, `package.json`, `.github/workflows/pr.yml`, `README.md`, `AGENTS.md`, `docs/08_CI_Branch_Protection.md`, `docs/09_Project_Phase_Status.md`, `docs/10_Codex_Workflow.md`, `docs/11_Database_Migrations.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `client/src/features/spend-tracker/persistence.ts`, new mobile migration helpers/tests, new server migration helpers/tests, and new root `scripts/db/*`.
- **Rationale:** `SET-002` is still blocked, there are no remaining active product tickets ahead of foundations, and `SET-004` is the earliest `P0` todo ticket with satisfied dependencies. It also unlocks later remote-config and backend work because the repo still lacks a canonical DB validation surface.
- **Risks:** The migration layer must not break existing local client persistence or overstate server DB readiness beyond a baseline framework. CI/doc changes need to stay synchronized so `db:validate` is both real and documented, not just added to one place.
- **API / schema impact:** Internal schema/migration infrastructure only. No public API contract change.
- **Rollout / flag plan:** No feature flag. This becomes the canonical migration and DB validation path for the repo.
- **Validation commands:** `pnpm db:validate`, `pnpm lint`, `pnpm lint:openapi`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** Mobile and server both initialize from ordered migrations, schema versions are tracked, rollback/forward-fix guidance is documented, CI runs the canonical DB validation command, and all repo quality gates remain green.
- **Outcome:** Added ordered mobile and server migration manifests plus runners, switched the client persistence boot path onto the mobile migration runner with legacy-schema adoption, introduced the canonical root `pnpm db:validate` command backed by `sql.js` and `PGlite`, and updated repo verification/docs so CI and contributor guidance now treat DB validation as a real quality gate.

### API-001 — Bootstrap Node Modular Monolith With API and Worker Runtimes

- **Status:** completed
- **Ticket:** API-001
- **Goal:** Close the remaining backend-foundation gap by introducing explicit module bootstrap boundaries, repository/service seams, and worker runtime/config composition that future features can extend without cross-module reach-ins.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `docs/09_Project_Phase_Status.md`, `README.md`, `server/api/src/app.ts`, `server/api/src/lib/env.ts`, `server/api/src/modules/module.ts`, `server/api/src/modules/health/*`, `server/worker/src/index.ts`, `server/worker/src/worker.ts`, `server/worker/src/lib/env.ts`, `server/worker/src/modules/module.ts`, `server/worker/src/modules/heartbeat/*`, and related backend tests.
- **Rationale:** `SET-002` is still blocked, and `API-001` is now the earliest active canonical ticket with a realistic closeout path. The repo already has separate API and worker runtimes plus typed health and heartbeat behavior, so the remaining gap is formalizing module ownership and runtime boundaries rather than starting later feature APIs.
- **Risks:** The refactor must not break existing dev scripts or the current `/health` route and worker heartbeat behavior. Module abstractions need to stay lean; over-engineering the skeleton would slow later feature work instead of helping it.
- **API / schema impact:** No external API contract change expected. Internal backend structure only: module registration, runtime config loading, and service/repository seams.
- **Rollout / flag plan:** No flag. This hardens the default backend foundation for future feature modules.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** API and worker still run separately, module factories own their services and repositories, worker jobs are composed through explicit module contracts, config loaders are tested, and repo quality gates stay green.
- **Outcome:** Reworked the API and worker runtimes around explicit module factories and registration helpers, moved health and heartbeat behavior behind repository/service seams, added tested env loaders for both runtimes, and kept the typed `/health` route plus scheduled worker heartbeat behavior intact. The backend skeleton is now ready for future feature modules without cross-module reach-ins, while real domain APIs and jobs remain later-ticket scope.

### UX-003 — Create Inbox for Uncategorized and Partially Classified Transactions

- **Status:** completed
- **Ticket:** UX-003
- **Goal:** Close the remaining Inbox acceptance gap by adding explicit high-volume validation and tightening the virtualized list path for large local review queues.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `docs/09_Project_Phase_Status.md`, `client/src/app/SpendTrackerApp.tsx`, `client/__tests__/app.test.tsx`.
- **Rationale:** `SET-002` is still blocked, `UX-004` is now closed, and `UX-003` is the earliest active product ticket with a realistic closeout path. Filters, revisit, and delete behavior already exist; the remaining repo-side gap is proving the Inbox path holds up against a 1,000-item local queue and baking that into the list configuration and tests.
- **Risks:** Any long-list tuning must not break the existing Inbox interaction model or make tests flaky. The closeout must stay honest that partial/conflict and split/create-rule workflows are separate follow-up scope, not silently completed here.
- **API / schema impact:** No external API or schema changes. UI-only scalability validation on top of the existing local Inbox flow.
- **Rollout / flag plan:** No flag. This hardens the default local Inbox behavior.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** Inbox keeps instant update behavior, the filter/revisit flows still pass, the list path is explicitly tuned for larger datasets, and a seeded 1,000-item validation test proves the local Inbox remains usable.
- **Outcome:** Added explicit FlatList tuning for the local Inbox path and covered a seeded 1,000-item queue in tests across source-app, amount, age, and merchant filters. With the existing instant-update classify flow plus revisit/delete behavior still green, the repo-side `UX-003` acceptance criteria are now satisfied; partial/conflict views and split/create-rule workflows remain later-ticket scope.

### UX-004 — Build Quick-Classify Bottom Sheet and Manual Add Flow

- **Status:** completed
- **Ticket:** UX-004
- **Goal:** Close the remaining quick-classify gap by replacing the full-screen classify surface with a bottom-sheet interaction while preserving the shared manual-entry primitives.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `docs/09_Project_Phase_Status.md`, `client/src/app/SpendTrackerApp.tsx`, `client/src/lib/app-info.ts`, `client/__tests__/app.test.tsx`.
- **Rationale:** `SET-002` is still blocked, `UX-003` remains open for later partial/conflict and scale validation work, and `UX-004` is the clearest closeout candidate. The remaining repo-side acceptance gap is the actual bottom-sheet classify UX; suggestions and shared validation are already in place.
- **Risks:** The bottom sheet must not regress the existing classify flow or hide key fields behind an unusable layout. The change must stay honest about rule creation and split flows, which are still partial or later-ticket work.
- **API / schema impact:** No external API or storage changes. UI-only closeout on top of the existing local classify domain.
- **Rollout / flag plan:** No flag. This upgrades the default local classify interaction.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** Quick classify presents as a bottom sheet, still supports the suggestion-led two-tap common case, keeps categories visible in the sheet, preserves save/skip controls, and all repo quality gates remain green.
- **Outcome:** Replaced the full-page classify surface with a bottom-sheet interaction, kept the two-tap suggestion-led common case intact, preserved save/skip/split-later controls, and retained the shared manual-entry primitives and validation rules. Durable reusable rules remain separate `INT-003` work, but the `UX-004` local-beta scope is now complete.

### UX-004 — Build Quick-Classify Bottom Sheet and Manual Add Flow

- **Status:** completed
- **Ticket:** UX-004
- **Goal:** Continue quick classify and manual entry so the classification path is faster, suggestion-led, and built from shared form primitives even before the real rule engine lands.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `docs/09_Project_Phase_Status.md`, `client/src/app/SpendTrackerApp.tsx`, `client/src/features/spend-tracker/domain.ts`, `client/src/lib/app-info.ts`, `client/__tests__/app.test.tsx`, `client/__tests__/domain.test.ts`.
- **Rationale:** `SET-002` remains blocked, `UX-003` is still open but now depends on later partial/conflict and split/rule follow-up, and `UX-004` already has a real partial implementation in the client. The highest-value next step is to reuse the classify/manual form primitives, surface explicit suggestion chips, and add honest save/skip controls without pretending that the missing rule engine or native capture integration already exists.
- **Risks:** Suggestion chips must stay advisory and explicit, not behave like silent heuristics. A save-as-rule toggle cannot imply durable rule creation while `INT-003` is still open. Shared form primitives must not regress the existing manual-add or Inbox classify flows.
- **API / schema impact:** No external API changes. Internal client domain expands to provide explicit classify suggestions and shared local form helpers.
- **Rollout / flag plan:** No flag. This upgrades the default local classify/manual-entry flow.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** Quick classify exposes suggestion-led item/category selection plus explicit save/skip controls, manual add reuses the same form primitives and validation behavior, and tests cover the faster local flow without overstating rule-engine or capture readiness.
- **Outcome:** Added shared classify/manual item-category form primitives, explicit suggestion chips from local history plus merchant heuristics, quick-classify skip and split-later controls, and an honest save-as-rule intent toggle. The ticket stays open in backlog tracking because the real bottom-sheet UX, durable rule creation via `INT-003`, and captured-spend integration are still missing.

### UX-003 — Create Inbox for Uncategorized and Partially Classified Transactions

- **Status:** completed
- **Ticket:** UX-003
- **Goal:** Continue the local Inbox so users can filter pending work, skip and revisit items later, and review larger local queues without the current static-list limitations.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `docs/09_Project_Phase_Status.md`, `client/src/app/SpendTrackerApp.tsx`, `client/src/features/spend-tracker/domain.ts`, `client/src/features/spend-tracker/persistence.ts`, `client/__tests__/app.test.tsx`, `client/__tests__/domain.test.ts`, `client/__tests__/persistence.test.ts`.
- **Rationale:** `SET-002` remains blocked, `UX-002` is now done, and `UX-003` is the earliest still-active product ticket. The repo already has an Inbox plus classification loop, so the highest-value continuation is adding the missing filters, skipped-item revisit flow, and a more scalable list path before moving to later tickets.
- **Risks:** The Inbox scope overlaps with later split/rule flows, so the ticket must stay honest about what is still missing. Adding a new local transaction status must not break dashboard math, persistence reads, or the existing classify/manual flows. Any performance-oriented list change also needs tests that prove behavior did not regress.
- **API / schema impact:** No external API changes. Internal client domain and SQLite persistence expand to store revisitable skipped transactions and Inbox filter-compatible data.
- **Rollout / flag plan:** No flag. This upgrades the default local Inbox experience.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** Inbox supports local filters for source app, merchant, amount, and age; skipped items can be revisited later; classification and delete actions update instantly; and the Inbox list path is upgraded toward larger local queues without regressing the current flows.
- **Outcome:** Added local Inbox filters for status, merchant, source app, amount, and age; introduced revisitable skipped transactions plus delete actions; switched the Inbox onto a FlatList-based rendering path; expanded domain and persistence coverage for the new review states; and kept the ticket open in backlog tracking because partial/conflict views, split/create-rule actions, and explicit 1,000-item performance validation still remain.

### UX-002 — Build Home Dashboard with Current-Period KPIs and Inbox Summary

- **Status:** completed
- **Ticket:** UX-002
- **Goal:** Finish the local Home dashboard with cycle-aware summary math, budget progress, top items, recent activity preview, and honest quick-action entrypoints.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `docs/09_Project_Phase_Status.md`, `client/src/app/SpendTrackerApp.tsx`, `client/src/features/spend-tracker/domain.ts`, `client/src/lib/app-info.ts`, `client/__tests__/app.test.tsx`, `client/__tests__/domain.test.ts`.
- **Rationale:** `UX-001` is now closed, `SET-002` is still blocked, and `UX-002` is the earliest remaining actionable `in_progress` ticket. The Home screen already shows basic totals, so the next coherent step is finishing the dashboard modules defined in `docs/03_Screen_Spec.md`.
- **Risks:** Budget progress must stay honest without inventing a full budget engine, current-period math must respect the saved cycle setting, and quick actions for unimplemented screens must remain explicit placeholders rather than fake navigation.
- **API / schema impact:** No external API changes. Internal dashboard summary logic expands to include current-cycle filtering, budget progress metrics, top items, and recent activity preview data.
- **Rollout / flag plan:** No flag. This upgrades the default local Home experience.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** Home renders cycle-aware dashboard math from local data, shows budget progress plus top items and recent activity, exposes honest quick-action entrypoints, and includes tests for KPI math plus the updated Home flow.
- **Outcome:** Extended the Home dashboard with cycle-aware local summary math, budget progress, top-items and recent-activity cards, honest quick-action placeholders for budgets and search, new domain KPI tests, and updated README plus phase-status documentation.

### UX-001 — Implement Onboarding and Permission Education Flow

- **Status:** completed
- **Ticket:** UX-001
- **Goal:** Finish the onboarding flow so it covers value, privacy, notification setup, source-app allowlist selection, budget-cycle choice, sync-mode choice, and resumable local state.
- **Touched files/modules:** `PLANS.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `README.md`, `docs/09_Project_Phase_Status.md`, `client/src/app/SpendTrackerApp.tsx`, `client/src/features/spend-tracker/persistence.ts`, `client/src/lib/app-info.ts`, `client/__tests__/app.test.tsx`, `client/__tests__/persistence.test.ts`.
- **Rationale:** `SET-002` is still blocked by remote GitHub verification, and `UX-001` is the earliest actionable `in_progress` ticket. The client already has onboarding copy, settings handoff, and persisted completion state, so the highest-leverage next step is to finish the remaining onboarding sections defined in `docs/03_Screen_Spec.md`.
- **Risks:** Onboarding choices must persist without breaking existing saved sessions, allowlist and sync preferences must remain explicit local preferences rather than fake native behavior, and the ticket should not silently absorb real permission-state detection or capture work that belongs elsewhere.
- **API / schema impact:** No external API changes. Internal client persistence adds stored onboarding preferences alongside existing notification access state and local transactions.
- **Rollout / flag plan:** No flag. This upgrades the default local onboarding flow.
- **Validation commands:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** The client onboarding flow includes value/privacy/setup guidance, allowlisted source-app selection, budget-cycle selection, sync-mode choice, resumable saved progress, and test coverage for fresh install plus partial-resume behavior.
- **Outcome:** Expanded onboarding to cover source-app preferences, budget-cycle choice, and sync preference; persisted those choices alongside notification access and transactions in local SQLite settings; added resume-path coverage for partially completed onboarding; and aligned README plus phase-status docs with the completed UX-001 scope.

### TRACK-002 — Master Orchestrator Adoption

- **Status:** completed
- **Ticket:** TRACK-002
- **Goal:** Codify the repo-truth delivery loop for future same-thread `next` runs and fill the missing workflow/migration guidance docs without consuming a canonical backlog ticket.
- **Touched files/modules:** `PLANS.md`, `README.md`, `AGENTS.md`, `docs/06_Release_Plan.md`, `docs/09_Project_Phase_Status.md`, `docs/10_Codex_Workflow.md`, `docs/11_Database_Migrations.md`.
- **Rationale:** The repo already had backlog reconciliation and a phase-status audit, but it did not yet document the operational run-loop that should govern future single-ticket delivery passes. The workflow also referenced missing source-of-truth docs for migrations and Codex orchestration.
- **Risks:** Drifting the workflow doc away from actual repo conventions, implying that migration infrastructure exists before `SET-004`, and accidentally treating this adoption pass like a canonical product ticket.
- **API / schema impact:** None. Documentation and tracking only.
- **Rollout / flag plan:** No flag. This is an execution-workflow adoption pass for contributors and coding agents.
- **Validation commands:** `rg -n "09_Database_Migrations|10_Codex_Workflow|11_Database_Migrations|next" README.md AGENTS.md PLANS.md docs`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** The workflow and migration docs exist, contributor guidance links them, the phase-status and release docs reference the workflow truthfully, no repo doc points at a nonexistent `docs/09_Database_Migrations.md`, and the future same-thread `next` contract is documented clearly.
- **Outcome:** Added `docs/10_Codex_Workflow.md` and `docs/11_Database_Migrations.md`, linked them from contributor-facing guidance, documented the single-ticket-per-run protocol plus `next` behavior, and recorded `UX-001` as the default next actionable ticket unless repo truth changes first.

### TRACK-001 — Project Audit and Tracking Reconciliation

- **Status:** completed
- **Ticket:** TRACK-001
- **Goal:** Align `README.md`, `PLANS.md`, and `docs/05_Backlog.*` with actual repo truth and stop reusing canonical backlog ticket IDs for local execution-history entries.
- **Touched files/modules:** `PLANS.md`, `README.md`, `docs/05_Backlog.md`, `docs/05_Backlog.csv`, `docs/05_Backlog.json`, `docs/09_Project_Phase_Status.md`.
- **Rationale:** The repo had reached a point where the code, README, backlog, and local plan history no longer described the same delivery state. The first priority was fixing project reporting so future implementation work can be tracked against the canonical backlog without ambiguity.
- **Risks:** Overstating partially implemented tickets, drifting the markdown/CSV/JSON backlog files apart again, and keeping canonical backlog IDs overloaded inside local-only execution notes.
- **API / schema impact:** None. Documentation and tracking only.
- **Rollout / flag plan:** No flag. This is a repo-truth reconciliation pass.
- **Validation commands:** `pnpm lint`, `pnpm lint:openapi`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** The backlog files reflect current repo-truth status for the tickets already underway, README links to contributor guidance and the phase audit, a phase-status doc exists, and local plan-history entries use non-canonical IDs where appropriate.
- **Outcome:** Added a per-sprint phase audit, linked contributor guidance from README, reconciled backlog tracking for setup/mobile/backend tickets that are already partially or fully implemented, and moved local execution-history entries onto `TRACK-*`, `APP-*`, and `ENV-*` identifiers.

### APP-004 — Local SQLite Tables and Manual Add

- **Status:** completed
- **Ticket:** APP-004
- **Backlog mapping:** Progress toward `UX-002` and `UX-004`
- **Goal:** Replace the temporary blob-style persistence with normalized local SQLite tables and add the first manual spend entry flow so the shell better matches the offline-first product direction.
- **Touched files/modules:** `PLANS.md`, `README.md`, `client/__tests__/app.test.tsx`, `client/__tests__/persistence.test.ts`, `client/src/app/SpendTrackerApp.tsx`, `client/src/features/spend-tracker/domain.ts`, `client/src/features/spend-tracker/persistence.ts`, `client/src/lib/app-info.ts`.
- **Rationale:** The shell already had onboarding, Home, Inbox, and classification, but it was still persisting one JSON blob and had no manual-add fallback. The next coherent step was to move the current state into real local tables and let users add a spend without waiting for Android capture import.
- **Risks:** The new storage layer must not lose already-saved demo data, manual entry must stay explicit that it creates a classified local spend rather than an Inbox item, and tests need to cover both the user flow and the table-mapping behavior so the app does not drift from the intended local-first design.
- **API / schema impact:** None outside the client. Internal mobile SQLite tables now store settings, transactions, and transaction items instead of a single blob.
- **Rollout / flag plan:** No flag. This upgrades the existing local shell by default and includes a one-time migration path for the legacy blob state.
- **Validation commands:** `pnpm --filter @upi-spend-tracker/client exec expo config --type public`, `pnpm --filter @upi-spend-tracker/client lint`, `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test`, `pnpm --filter @upi-spend-tracker/client build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** The client reads and writes settings plus spend records through local SQLite tables, previously saved blob state migrates forward, Home/Inbox can launch a manual spend flow, and docs/tests describe the new scope accurately.
- **Outcome:** Replaced the blob-only storage internals with SQLite tables for settings, transactions, and items; added legacy-state migration; introduced a manual spend screen reachable from Home and Inbox; kept Home totals and Inbox behavior in sync with the local store; and added client tests for both the manual user path and storage mapping behavior.

### APP-003 — Persisted Local Session

- **Status:** completed
- **Ticket:** APP-003
- **Backlog mapping:** Progress toward `UX-001` and `UX-003`
- **Goal:** Make onboarding completion and local classification progress survive app restarts without waiting for the full domain DB implementation.
- **Touched files/modules:** `PLANS.md`, `README.md`, `client/package.json`, `pnpm-lock.yaml`, `client/__tests__/app.test.tsx`, `client/src/app/SpendTrackerApp.tsx`, `client/src/features/spend-tracker/persistence.ts`, `client/src/lib/app-info.ts`.
- **Rationale:** The local dashboard and Inbox were finally usable, but every restart erased onboarding progress and classifications. The next remaining gap was persisting the current device state so the app behaves like a real offline-first client, even before the full SQLite domain schema lands.
- **Risks:** Persistence must not overstate itself as the final app database, tests need explicit storage mocks to avoid native-module flakiness, and reset behavior must remain simple so demo data can be restored after manual exploration.
- **API / schema impact:** None.
- **Rollout / flag plan:** No flag. This upgrades the existing local shell to survive restarts by default.
- **Validation commands:** `pnpm --filter @upi-spend-tracker/client exec expo config --type public`, `pnpm --filter @upi-spend-tracker/client lint`, `pnpm --filter @upi-spend-tracker/client typecheck`, `pnpm --filter @upi-spend-tracker/client test`, `pnpm --filter @upi-spend-tracker/client build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** The app restores onboarding/classification state from local storage, saves updated state after changes, exposes a reset path for the demo dataset, and test coverage proves hydration plus persistence behavior.
- **Outcome:** Added Expo SQLite-backed key-value persistence for onboarding completion, notification-access status, and local transactions; hydrated the client shell on launch; autosaved state after changes; exposed a reset action; and updated docs/tests to describe the new persisted local behavior clearly.

### APP-002 — Interactive Local Dashboard and Inbox

- **Status:** completed
- **Ticket:** APP-002
- **Backlog mapping:** Progress toward `UX-002` and `UX-003`
- **Goal:** Turn the current mobile shell into a usable local session by adding seeded spend data, dashboard KPIs, an Inbox list, and an in-app classification loop.
- **Touched files/modules:** `PLANS.md`, `README.md`, `client/__tests__/app.test.tsx`, `client/src/app/SpendTrackerApp.tsx`, `client/src/features/spend-tracker/domain.ts`, `client/src/lib/app-info.ts`.
- **Rationale:** The onboarding shell clarified setup, but the app still did not let the user do the core job of reviewing and classifying a payment. The next step needed to demonstrate the intended v1 flow end to end without waiting on native capture or local DB tickets.
- **Risks:** The new flow must stay explicit that seeded data is demo-only and session-only, otherwise it could misrepresent persistence, capture reliability, or sync readiness. Dashboard math and Inbox behavior also need test coverage so the shell does not drift from the domain expectations.
- **API / schema impact:** None.
- **Rollout / flag plan:** No flag. This replaces the placeholder Home/Inbox shell as the default local experience.
- **Validation commands:** `pnpm --filter @upi-spend-tracker/client exec expo config --type public`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** Home renders seeded KPIs from local state, Inbox lists uncategorized transactions, the user can classify one in app and see the Inbox/dashboard update immediately, and docs/tests describe the flow accurately.
- **Outcome:** Added a local spend domain model with seeded transactions, wired dashboard summary math and Inbox state into the client shell, implemented a quick classify screen that updates state instantly, and updated docs/tests to reflect the new in-session behavior and its current limitations.

### APP-001 — First Usable Mobile Shell

- **Status:** completed
- **Ticket:** APP-001
- **Backlog mapping:** Progress toward `UX-001` and `UX-002`
- **Goal:** Replace the bootstrap-only client screen with the first usable shell: notification-access onboarding plus placeholder home and inbox views that clarify what the user should do next.
- **Touched files/modules:** `PLANS.md`, `README.md`, `client/App.tsx`, `client/__tests__/app.test.tsx`, `client/src/app/SpendTrackerApp.tsx`, `client/src/lib/app-info.ts`, `client/src/theme/colors.ts`, and removal of stale bootstrap-only components.
- **Rationale:** The app launched successfully but stopped at a passive placeholder with no user flow. The first user-visible shell needed to explain setup, provide a next action, and establish a home/inbox structure without overpromising unimplemented capture or sync behavior.
- **Risks:** Without persistence or real permission-state checks, the onboarding status remains advisory only; the UI must stay explicit that capture, inbox population, and sync still come later. Removing the old bootstrap components also requires tests and docs to stop referencing obsolete copy.
- **API / schema impact:** None.
- **Rollout / flag plan:** No flag. This replaces the previous placeholder as the default shell.
- **Validation commands:** `pnpm --filter @upi-spend-tracker/client test`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Done when:** Launching the client presents a clear onboarding action, local-only users can continue into a home shell, an inbox placeholder exists, tests cover the new flow, and repo docs no longer describe the app as a single bootstrap card.
- **Outcome:** Replaced the static bootstrap card with a dependency-free React Native shell that opens Android notification settings, allows local-only continuation, adds home/inbox placeholders, updates the copy/palette, and aligns tests plus README with the new flow.

### ENV-003 — Android Dev Build Toolchain Compatibility

- **Status:** completed
- **Ticket:** ENV-003
- **Goal:** Restore local Android dev-build installation by fixing the Gradle/toolchain mismatch that blocks `expo run:android` after the Android SDK and Java setup is present.
- **Touched files/modules:** `PLANS.md`, `client/android/gradle/wrapper/gradle-wrapper.properties`.
- **Rationale:** After local Android SDK setup, the build moved past missing-tool errors and failed in Gradle with `JvmVendorSpec IBM_SEMERU`, indicating a Gradle 9 compatibility break with the React Native/Foojay toolchain plugin path currently present in the installed stack.
- **Risks:** Pinning the wrapper to Gradle `8.14.x` could diverge from future upstream template defaults, but leaving Gradle 9 in place blocks all local Android development on this machine.
- **Validation commands:** `cd client/android && ./gradlew -version`, `cd client/android && ./gradlew app:assembleDebug -x lint -x test --configure-on-demand --build-cache`, `adb install -r client/android/app/build/outputs/apk/debug/app-debug.apk`, `adb shell pm list packages | rg com.upispendtracker.client`.
- **Done when:** The wrapper uses a Gradle version compatible with the current React Native/Foojay toolchain plugin path, the debug APK builds, and the Android development client package is installable on the connected device.
- **Outcome:** Pinned the Android Gradle wrapper from `9.0.0` to `8.14.3`, matching the supported upper bound for the pre-`1.0.0` Foojay resolver path used by the current React Native Gradle plugin and clearing the `IBM_SEMERU` build failure.

### ENV-002 — iOS Shell Support for Expo Client

- **Status:** completed
- **Ticket:** ENV-002
- **Goal:** Add the minimum Expo config and workflow needed to launch the client shell on iOS without expanding scope into iOS-native capture or feature parity.
- **Touched files/modules:** `PLANS.md`, `README.md`, `package.json`, `client/app.json`, `client/package.json`.
- **Rationale:** The Expo client could not open on iOS because `ios.bundleIdentifier` was missing from app config. The repo needed explicit iOS shell wiring so local UI development can run on Simulator while keeping Android-native capture as the only v1 platform-specific path.
- **Risks:** iOS documentation could overstate platform support, local launch may still be blocked by machine prerequisites like Xcode or CocoaPods, and future native iOS work could require revisiting the decision not to commit `client/ios`.
- **Validation commands:** `pnpm --filter @upi-spend-tracker/client exec expo config --type public`, `pnpm --filter @upi-spend-tracker/client exec expo install --check`, `cd client && npx expo-doctor`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm dev:ios`.
- **Done when:** Expo public config includes `ios.bundleIdentifier`, root/client iOS scripts exist, docs describe iOS shell support accurately, and validation passes or any remaining machine-specific blocker is documented exactly.
- **Outcome:** Added `ios.bundleIdentifier` as `com.upispendtracker.client`, added client/root iOS run scripts, updated README to describe iOS shell development and Android-only native capture scope, and preserved iOS support as shell-only rather than parity with Android capture behavior.

### ENV-001 — Expo SDK 55 Android Dev Build Alignment

- **Status:** completed
- **Ticket:** ENV-001
- **Goal:** Align the Expo client with SDK 55 expectations, remove stale generated Android wiring, and document Android development builds as the supported local runtime instead of Expo Go.
- **Touched files/modules:** `PLANS.md`, `README.md`, `package.json`, `pnpm-lock.yaml`, `client/package.json`, `client/android/**`.
- **Rationale:** The client already targeted Expo SDK 55, but local running was blocked by Expo Go compatibility messaging and stale Android manifest output. The repo needed Expo-managed package alignment plus a regenerated Android baseline so local Android runs match the intended Android-first architecture.
- **Risks:** Regenerating `client/android` could unintentionally drop custom native changes, dev workflow docs could drift from actual scripts, and Expo-managed dependency changes could expose hidden monorepo/tooling mismatches.
- **Validation commands:** `pnpm --filter @upi-spend-tracker/client exec expo install --check`, `pnpm --filter @upi-spend-tracker/client exec expo config --type public`, `npx expo-doctor`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm dev:android`.
- **Done when:** Expo-managed dependencies are aligned for SDK 55, the stale notification listener service is no longer present in the Android manifest, Android dev-build scripts/docs are in place, and validation passes or any remaining environment blocker is documented exactly.
- **Outcome:** Added `expo-dev-client` and `expo-system-ui`, updated `jest-expo` to the SDK 55-compatible range, regenerated `client/android` to remove the stale `CaptureNotificationListenerService` entry, added a root Android dev-build script, disabled the intentional Expo Doctor app-config sync warning for this checked-in native project, and updated the README to make Android development builds the supported local flow. `pnpm dev:android` now reaches Expo's Android launcher step but is blocked in this environment because `ANDROID_HOME`/`adb` are not configured.

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
