# Release Plan — Agile Execution for v1

Version: 1.0  
Date: 2026-03-13

## 1. Delivery model

Cadence:
- 2-week sprints
- Weekly backlog refinement
- Daily stand-up
- Demo at end of sprint
- Retrospective at end of sprint
- Release-train view with beta checkpoints

Team lanes:
- Mobile
- Android Native
- Backend
- Platform/DevEx
- QA/Automation
- Design/Product

## 2. Sprint map

### Sprint 0 — Inception and repo foundation
Goals:
- repo bootstrap
- CI/CD
- migrations
- design system primitives
- Codex workflow docs (`docs/10_Codex_Workflow.md`)

Exit:
- new developer can clone and run the repo
- base docs exist
- CI gates are live

### Sprint 1 — Capture engine foundation
Goals:
- notification listener
- parser registry
- capture DB
- dedupe
- remote config foundation

Exit:
- supported notification can become a stored capture event

### Sprint 2 — First usable Android flow
Goals:
- quick classify notification
- capture bridge
- onboarding
- dashboard
- inbox

Exit:
- user can onboard and classify a captured payment

### Sprint 3 — Core transaction UX
Goals:
- quick classify sheet
- split items
- timeline/detail
- categories
- merchant normalization
- rule engine

Exit:
- user can manage a month of spending locally without backend dependency

### Sprint 4 — Budgets, suggestions, backend sync foundation
Goals:
- history suggestions
- budget engine
- budget alerts
- backend skeleton
- guest session + pairing
- sync push/pull

Exit:
- user can use budgets and enable multi-device sync in staging

### Sprint 5 — Reports, APIs, and worker jobs
Goals:
- reports/rollups
- full domain APIs
- remote config/bootstrap API
- worker jobs
- CSV export
- conflict queue

Exit:
- staging system supports end-to-end sync and report parity

### Sprint 6 — Hardening
Goals:
- performance optimization
- low-internet tuning
- privacy/security hardening
- OTA channel setup
- analytics/crash dashboards

Exit:
- beta quality bar achieved

### Sprint 7 — Closed beta and release candidate
Goals:
- beta rollout
- defect triage
- Play Store/compliance assets
- launch runbooks
- release candidate

Exit:
- go/no-go approved for public launch

## 3. Backlog management rules

- Keep only sprint-ready tickets in current sprint
- Every ticket needs owner, estimate, dependencies, acceptance criteria
- No large “miscellaneous” tickets
- Technical debt goes into backlog with explicit business risk
- Parser fixes must include new fixtures

## 4. Definitions

### Definition of Ready
- problem is clear
- scope bounded
- dependencies known
- acceptance criteria measurable
- test notes present
- design/API impact documented

### Definition of Done
- code merged
- tests updated
- docs/contracts updated
- analytics included if user-facing
- QA signoff completed
- release notes added if externally visible

## 5. Estimation guidance

Use story points:
- 1: tiny config/doc update
- 2–3: small, low-risk change
- 5: medium feature with tests
- 8: large feature crossing layers
- 13: split before sprinting unless exceptional

## 6. Risk control

- Use feature flags for risky user-visible changes
- Use kill switches for parser issues
- Require rollback note in every risky PR
- Treat data loss and silent misclassification as release blockers

## 7. Git workflow

- trunk-based with short-lived branches
- branch naming:
  - `feat/<ticket-id>-short-name`
  - `fix/<ticket-id>-short-name`
  - `chore/<ticket-id>-short-name`
- conventional commits required
- squash merge unless preserving commit sequence matters for migration history

## 8. Suggested release governance

Weekly:
- engineering risk review
- parser coverage review
- mobile crash review
- performance trend review

Per sprint:
- update PRD assumptions
- update launch risks
- re-rank top 10 backlog items
