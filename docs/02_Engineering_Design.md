# Engineering Design Doc — UPI Spend Tracker v1

Version: 1.0  
Date: 2026-03-13  
Audience: Engineering, QA, DevOps, Design, Product  
Status: Execution-ready draft

## 1. Objective

Design a production-grade, Android-first consumer app that:

- captures supported payment notifications
- converts them into structured spend events
- prompts for item classification with minimal friction
- works offline first
- optionally syncs across multiple devices
- remains lightweight, secure, and maintainable

## 2. Architecture overview

## 2.1 High-level system

```text
Android Source App Notification
    -> Android NotificationListenerService
    -> Parser Registry
    -> Native Capture DB (Room)
    -> Quick-Classify Notification / Reply Receiver
    -> Capture Import Bridge
    -> App Domain DB (SQLite)
    -> React Native UI
    -> Outbox Sync Engine
    -> Node API
    -> PostgreSQL
    -> Worker (rollups, cleanup, exports, config)
```

## 2.2 Why this architecture

- **Notification listener over SMS**: cleaner Android-first consumer flow and more Play-safe than making SMS the core ingestion path.
- **Local-first**: core value should work with no network.
- **Two local stores on Android**:
  - native capture DB for reliability when JS runtime is not loaded
  - app domain DB for cross-platform business data and UI
- **Modular monolith backend**: simplest scalable shape for v1 and early v2
- **PostgreSQL**: strong relational guarantees, reporting flexibility, future partitioning
- **Remote config**: parser behavior and rollout safety without repeated native releases

## 3. Technology choices

## 3.1 Mobile

- React Native + TypeScript
- Expo prebuild / development builds
- Native Android modules for capture-critical paths
- SQLite for app data
- Room for native capture data
- App-active sync polling for the current local-first client; native background scheduling remains a later Android ticket
- Optional Expo OTA for JS/config-safe updates

### Why not bare RN from day one

Bare RN gives full freedom, but Expo prebuild + dev builds keeps native escape hatches while reducing setup friction. The product still needs native Android modules, so the architecture must assume custom native code.

### Why not pure JS for capture

Notification capture, direct reply handling, and persistence during JS inactivity are native-critical. JS can own UI and domain logic, but not the full critical path.

## 3.2 Backend

- Node.js + TypeScript
- Fastify-compatible modular monolith
- PostgreSQL
- Separate worker process using same codebase
- Minimal infra in v1; add Redis only if real load demands it

### Why not microservices

Too much operational complexity for v1. Module boundaries inside a monolith are enough if enforced well.

## 4. Repository structure

```text
/client
/server
  /api
  /worker
/packages
  /contracts
  /shared-types
  /shared-utils
  /eslint-config
  /tsconfig
/docs
```

## 5. Data ownership model

### Android Native Capture DB

Owns:

- raw notification snapshots
- parser outputs
- reply actions
- capture lifecycle state

### App Domain DB

Owns:

- transactions
- transaction items
- categories
- merchants
- aliases
- rules
- budgets
- outbox
- sync state
- settings

### Server DB

Owns cloud-backed canonical copies for users in sync mode and reporting/rollup tables.

## 6. Core flows

## 6.1 Capture flow

1. Android service receives notification from allowlisted package.
2. Parser registry attempts package-specific parser; if none succeeds, generic parser fallback runs.
3. Dedupe checks against recent capture records.
4. Capture event is stored in Room.
5. App posts its own actionable notification.
6. User replies inline, taps split, or skips.
7. Native bridge imports capture into domain DB.
8. UI updates immediately.
9. Outbox schedules sync if sync mode is enabled.

## 6.2 Manual flow

1. User taps Add manual.
2. User enters amount, merchant, item, category, date/time.
3. Transaction is saved locally.
4. Outbox syncs later if enabled.

## 6.3 Sync flow

1. Local mutation writes domain tables and outbox row in a single logical operation.
2. Sync worker batches outbox ops with idempotency keys.
3. Server validates, upserts, and returns results plus conflicts if any.
4. Pull sync fetches deltas since cursor.
5. Client applies changes or queues conflict review.

## 7. Domain model

### Primary entities

- User
- Device
- Transaction
- TransactionItem
- Category
- Merchant
- MerchantAlias
- Rule
- Budget
- BudgetScope
- OutboxOperation
- AuditEvent

### Key invariants

- Money stored as integer minor units
- Transaction can exist with zero items only when new/skipped
- Transaction total must equal sum(items) + remainder bucket once fully classified
- Explicit user rules take precedence over heuristics
- Heuristic suggestions never auto-commit unless converted into explicit user rule
- All sync writes are versioned

## 8. Algorithms and tradeoffs

## 8.1 Parser strategy

**Chosen**: package-specific parser -> generic parser -> Inbox fallback

### Pros

- Highest accuracy for known formats
- Controlled debug surface
- Remote-configurable behavior
- Cheap and explainable

### Tradeoffs

- Ongoing maintenance when app notification formats change
- Requires regression fixtures and monitoring

### Rejected alternatives

- Full NLP-only parser: less predictable, harder to debug
- Paid transaction enrichment APIs: violates v1 constraint

## 8.2 Dedupe strategy

**Chosen**: hybrid exact + fuzzy dedupe

### Exact hash

`source app + normalized merchant + amount + time bucket + optional ref hint`

### Fuzzy fallback

- same source app
- same amount
- within time threshold
- merchant similarity above threshold

### Pros

- Handles retries and grouped notifications well
- Tunable by config

### Tradeoffs

- Rare false merge if same merchant and amount repeat very close together

## 8.3 Merchant normalization

**Chosen**: deterministic normalization + alias table + controlled fuzzy fallback

### Pros

- Stable reports
- Explainable corrections
- User feedback compounds value

### Tradeoffs

- Fuzzy matching can over-merge if thresholds are too loose
- Needs review/undo tooling

## 8.4 Item suggestion

**Chosen**: rules first, weighted history ranker second

### Score factors

- merchant match
- amount bucket
- hour bucket
- weekday
- recency
- frequency

### Pros

- Free
- Fast
- Works on device
- Easy to test and explain

### Tradeoffs

- Takes time to feel “smart”
- Weaker than richer ML once data scale grows

### Rejected alternatives

- Paid LLM or proprietary recommender in v1
- Silent auto-classification from heuristics

## 8.5 Sync/conflict algorithm

**Chosen**: local-first outbox + idempotent push + cursor pull + optimistic concurrency

### Pros

- Works offline
- Safe across retries
- Good fit for mobile + weak networks

### Tradeoffs

- More moving parts than naive REST
- Conflict UI must be designed well

## 8.6 Reporting strategy

**Chosen**:

- local rollups for primary mobile UX
- server rollups for sync-mode consistency and future cross-device/server views

### Pros

- Fast offline UX
- Lower repeated server dependency
- Predictable report latency

### Tradeoffs

- Must keep rollups in sync after edits
- Duplicate logic risk if contracts are unclear

## 9. Offline and low-internet design

### Rules

- Core screens must render from local DB
- Network cannot block classification
- Sync retries use exponential backoff with jitter
- Payloads are chunked
- Cached config boots instantly
- Stale server data must never overwrite un-synced local edits silently

### Low-data strategies

- compress or minimize JSON payloads
- no images in v1
- incremental cursor sync only
- paginate server lists
- retain raw capture text for limited time only

## 10. Scalability design

## 10.1 Backend scaling

### Vertical scale path

- optimize queries
- add indexes
- rollup tables
- worker offload
- app/worker process separation

### Horizontal scale path

- stateless API instances behind load balancer
- PostgreSQL primary + read replicas later
- object storage only when receipts/OCR arrive
- cache layer only when actual hot-path load requires it

## 10.2 Database strategy

- PostgreSQL as source of truth
- range partition `transactions` by `paid_at` month if size demands it
- partial indexes on active rows
- JSONB only for sparse metadata/debug blobs, not primary domain fields

## 10.3 Why not NoSQL

The product is spend-, item-, and budget-heavy with strong relational/reporting needs. Relational design is the simpler and safer default.

## 11. Security and privacy

### Controls

- explicit consent for notification access
- local-only mode
- secure token storage
- HTTPS/TLS only
- raw notification retention limit
- redacted debug export
- audit trail for destructive edits
- privacy-mode default for lockscreen visibility

### Data minimization

- store only needed parsed fields long term
- avoid storing full raw notification text in cloud by default
- diagnostics export opt-in and redacted

## 12. Observability

### Product events

- onboarding completion
- permission granted/denied
- capture created
- parse success/failure
- parser fallback used
- quick classify completed
- skip action used
- budget created
- sync started/succeeded/failed
- conflict created/resolved

### Ops metrics

- capture success rate by source app
- parser error rate by parser version
- duplicate suppression count
- median capture-to-prompt latency
- sync batch failure rate
- API p95 latency
- worker failure rate

### Logging principles

- structured logs
- no raw sensitive text in normal logs
- correlation IDs across device/API/worker where possible

## 13. Testing strategy

### Mobile

- unit tests for domain logic
- parser fixture tests
- instrumentation tests for native capture
- E2E flows for onboarding, capture import, inbox classification, budgets

### Backend

- unit tests for services
- integration tests for repositories
- contract tests against OpenAPI
- sync replay/concurrency tests
- report correctness tests

### Release gates

- smoke tests on baseline devices
- low-network scenario tests
- regression suite for parser fixtures
- crash-free beta threshold

## 14. Release and OTA strategy

### Channels

- internal
- beta
- production

### Rules

- JS/config-safe changes can go via OTA
- native changes require store release
- parser config should be remotely kill-switchable
- every rollout must have rollback plan

## 15. Alternative decisions and why they lost

| Decision area   | Chosen                              | Alternative          | Why alternative lost                      |
| --------------- | ----------------------------------- | -------------------- | ----------------------------------------- |
| Mobile stack    | RN + Expo prebuild + native modules | Bare RN              | More setup cost with little v1 benefit    |
| Capture storage | Room + SQLite split                 | Single JS-managed DB | Less reliable when JS runtime is inactive |
| Backend         | Modular monolith                    | Microservices        | Too much ops complexity for v1            |
| Suggestions     | Rules + heuristics                  | Paid AI/ML service   | Cost, privacy, and complexity             |
| Sync            | Outbox + cursor delta               | Live-online CRUD     | Fails low-internet/offline requirement    |
| Reporting       | Local rollups                       | Server-only reports  | Poor offline UX and higher latency        |

## 16. Definition of ready for implementation

A feature is ready when:

- it has a descriptive ticket
- API/schema impact is specified
- acceptance criteria are measurable
- dependencies are identified
- QA notes exist
- rollout or kill-switch needs are documented

## 17. Definition of done

A feature is done when:

- code merged with CI green
- tests added/updated
- docs/contracts updated
- analytics hooks added if applicable
- rollback path known
- product and QA acceptance completed
