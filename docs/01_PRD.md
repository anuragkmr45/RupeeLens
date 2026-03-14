# PRD — UPI Spend Tracker v1

Version: 1.0  
Status: Draft for execution  
Date: 2026-03-13  
Owner: Product + Engineering

## 1. Product summary

UPI Spend Tracker is an Android-first consumer app that helps users understand **what they spent, where they spent it, and how often they spend on each item/category**.

The app detects eligible payment notifications on Android, converts them into structured spend events, and immediately asks the user to classify the purchase with minimal effort. Over time the app learns from history and merchant patterns to suggest likely items and categories. It works offline first, syncs when available, and keeps the user in control of privacy.

## 2. Problem statement

Indian consumers make frequent UPI payments but usually lose item-level context after the payment is completed. Existing payment histories show amount, merchant, date, and time, but not the actual item or user-defined meaning of that spend. Users therefore cannot easily answer:
- How much did I spend on coffee vs groceries vs transport this month?
- Which merchants are leaking my budget?
- What are my repeated small spends?
- How much am I spending on the same item over time?

The user needs a lightweight flow that captures meaning immediately after payment while the purchase is still fresh.

## 3. Target users

### Primary user
- Daily Android UPI user in India
- Makes 3–20 digital payments per day
- Wants fast budgeting without maintaining a spreadsheet
- Values low friction and privacy over complex fintech features

### Secondary user
- Budget-conscious student or early professional
- Wants monthly or salary-cycle spend planning
- Needs offline reliability on average devices and networks

### Future users, not v1
- Family/shared-account users
- Full iOS auto-capture users
- Small business or employee reimbursement workflows

## 4. Goals

### Business goals
- Launch a credible v1 for Indian consumers with strong daily-use retention
- Demonstrate a differentiated item-level spend workflow
- Build a scalable product/engineering foundation without paid third-party data services in v1

### User goals
- Record item/category for a payment in under 10 seconds
- See current-period spend by item, category, merchant, and time pattern
- Set a budget on a calendar month, weekly cycle, or custom cycle
- Recover from skipped transactions later without losing track

### Engineering goals
- Offline-first core experience
- Modular monolith backend that can scale horizontally later
- Lightweight Android app with low storage overhead
- OTA-safe front-end update path for non-native fixes

## 5. Non-goals for v1

- iOS parity for automatic third-party payment capture
- Receipt OCR
- Shared family accounts
- Cashback/rewards
- Credit score/loan/wealth features
- Full bank aggregation or paid fintech data APIs
- Merchant-side integrations
- Web dashboard

## 6. Product principles

1. **Capture the moment, not just the money.**
2. **One payment should take one fast action.**
3. **Offline first; sync later.**
4. **User trust is a product feature.**
5. **Suggestions must help, not silently misclassify.**
6. **The product must feel lightweight on real mid-tier devices.**

## 7. Jobs to be done

- When I make a payment, I want to quickly note what it was for so I do not forget later.
- When I review my month, I want to see actual items/categories rather than just merchant names.
- When I plan my spending, I want budgets that match my real cycle.
- When I switch devices or lose connectivity, I want my data to remain safe and usable.

## 8. Core user stories

### Capture and classify
- As a user, I want the app to detect a supported payment notification and prompt me immediately.
- As a user, I want to reply inline from the notification to add the item name.
- As a user, I want to split one payment into multiple items or categories.
- As a user, I want to skip a prompt and classify it later in the Inbox.

### Understand my spending
- As a user, I want to see total spend for my current cycle.
- As a user, I want breakdowns by item, category, merchant, time of day, and day of week.
- As a user, I want search and filters to find old transactions quickly.

### Plan and improve
- As a user, I want to create budgets for an overall limit or a category/merchant/item.
- As a user, I want threshold alerts when I am nearing a limit.
- As a user, I want the app to suggest likely items/categories based on my own history.

### Stay in control
- As a user, I want the app to work with poor or no internet.
- As a user, I want local-only mode if I do not want cloud sync.
- As a user, I want export and diagnostics so I trust my data.

## 9. Scope for v1

### In scope
- Android notification-based payment detection
- Quick classify notification
- Inbox of uncategorized/partial transactions
- Manual add
- Split items
- Categories
- Merchant normalization
- Rule-based and history-based suggestions
- Budgets with custom cycles
- Reports and search
- Offline-first local DB
- Optional cloud sync and multi-device pairing
- CSV export
- Diagnostics, privacy mode, remote parser config

### Out of scope
- OCR and receipt scanning
- iOS auto-capture
- Business expense workflows
- Merchant-linked line-item data
- Chatbot assistant
- Social features

## 10. Functional requirements

### FR-1 Detection
The Android app shall detect notifications from user-allowed payment/bank apps and create a structured capture event.

### FR-2 Parsing
The app shall parse amount, merchant text, timestamp, source app, and parser metadata from supported notifications. Failures shall be stored with reason codes.

### FR-3 Dedupe
The app shall avoid duplicate capture prompts when the same transaction notification is re-posted or replayed.

### FR-4 Quick classification
The app shall show its own actionable notification for new captured payments, supporting:
- inline item entry
- open-app classify
- split
- skip

### FR-5 Inbox
The app shall maintain an Inbox for uncategorized or partially classified transactions.

### FR-6 Classification model
A transaction shall support:
- zero or more item rows
- one or more categories across items
- remainder classification for tax/tip/fees/unknown

### FR-7 Categories
The app shall ship with default categories and allow user CRUD operations on categories.

### FR-8 Merchant normalization
The app shall normalize merchants using deterministic cleanup, alias mapping, and controlled fuzzy fallback.

### FR-9 Suggestions
The app shall provide:
- explicit rule matches
- heuristic suggestions from user history
- no automatic heuristic save without explicit user-approved rule

### FR-10 Budgets
The app shall support budgets by:
- overall
- category
- merchant
- item

The app shall support periods:
- monthly
- weekly
- rolling
- custom/salary cycle

### FR-11 Reporting
The app shall provide reporting by:
- item
- category
- merchant
- time of day
- day of week
- trend vs prior period

### FR-12 Search and edit
The app shall support search, edit, delete, merge/alias actions, and transaction detail views.

### FR-13 Sync
When sync mode is enabled, the app shall:
- store writes locally first
- queue outbox operations
- sync in batches with idempotency
- detect conflicts and surface them safely

### FR-14 Export
The app shall export user data as CSV.

### FR-15 Diagnostics
The app shall expose a user-accessible diagnostics view showing permission state, recent parser status, and redacted debug export.

## 11. Non-functional requirements

### NFR-1 Performance
- App cold start target on baseline device: <= 2.5s to interactive
- Dashboard load from local DB: <= 1.5s with 10k transactions
- Capture-to-prompt latency target: <= 2s median after notification receipt
- Search response target: <= 300ms for common local queries

### NFR-2 Reliability
- Local writes must succeed without internet
- Sync must be idempotent and retry-safe
- Parser failures must never crash the app
- Background tasks must survive process death where OS permits

### NFR-3 Privacy and security
- Explicit consent before notification access
- Local-only mode supported
- Sensitive text hidden on lockscreen when privacy mode is enabled
- Tokens stored securely
- Raw notification retention limited by policy
- Debug export redacted by default

### NFR-4 Scalability
- Backend supports modular monolith today, horizontal scale tomorrow
- DB schema supports partitioning/rollups for growth
- Mobile storage strategy remains lightweight; no image storage in v1

### NFR-5 Maintainability
- Repo must be Codex-friendly
- API contract must be source-of-truth
- Tests and docs required for significant behavior changes
- Remote config must support parser updates without code edits where possible

## 12. UX requirements

- The fastest successful path should be notification reply
- The second fastest path should be classify bottom sheet
- Inbox should feel like “things to finish,” not like a ledger dump
- Budget and insights should be readable without financial jargon
- Empty states should teach, not just inform
- The app must feel modern, minimal, and low-friction

## 13. Success metrics

### Activation
- Onboarding completion rate
- Notification access enablement rate
- First classified transaction within first session/day

### Engagement
- D1/D7/D30 retention
- Average classified transactions per active user
- Inbox clearance rate
- Budget creation rate

### Quality
- Capture success rate by supported app
- Parser fallback rate
- Duplicate prompt rate
- Sync success rate
- Crash-free sessions
- Median classify time

### Value
- % of transactions with item/category assigned
- % of users with at least one budget
- % of users viewing reports weekly

## 14. Launch criteria

A launch candidate is ready when:
- P0 and P1 backlog items are complete or explicitly waived
- Supported app parser coverage meets agreed threshold
- Crash-free session rate meets target
- No unresolved data loss bugs remain
- Sync and local-only modes both pass regression
- Privacy policy, Play declarations, and support runbooks are complete

## 15. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Payment app notification formats change | High | Parser registry + remote config + fixture regression suite |
| Notification access is denied by many users | High | Strong onboarding education + manual add + inbox value |
| Too many prompts create fatigue | High | Adaptive prompting + skip + quiet mode + rules |
| Merchant names are noisy | Medium | Alias table + user correction feedback loop |
| Sync conflicts confuse users | Medium | Local-first model + conflict queue + audit history |
| iOS expectation mismatch | Medium | Message iOS companion mode clearly in v1 |
| Heavy infrastructure too early | Medium | Modular monolith + shared contracts + avoid microservices in v1 |

## 16. Open questions for post-v1
- When to add OCR/receipt scanning
- Whether to launch web companion
- Whether to add family/shared budgets
- When to introduce optional external auth providers
- Whether to add merchant-linked item verification