# Screen Spec — UPI Spend Tracker v1

Version: 1.0  
Date: 2026-03-13

## 1. Navigation model

Primary tabs:
1. Home
2. Inbox
3. Timeline
4. Budgets
5. Settings

Global patterns:
- Search entry from Home and Timeline
- Floating/manual add action from Home and Timeline
- Bottom sheets for quick classify and quick edits
- Full screens for onboarding, split items, and detail-heavy flows

## 2. Onboarding

### Purpose
Complete setup for capture, privacy, and budget cycle.

### Sections
1. Welcome/value proposition
2. How the app works
3. Privacy disclosure
4. Notification access setup
5. Source app allowlist selection
6. Budget cycle selection
7. Local-only vs sync mode choice
8. Finish

### Key actions
- Continue
- Open Android settings
- Retry permission check
- Select all / deselect all supported apps
- Skip sync for now

### Acceptance notes
- Must be resumable
- Must explain notification access before leaving app
- Must allow local-only mode

## 3. Home Dashboard

### Purpose
Show current-period spend health and shortcuts.

### Modules
- Current period total
- Budget progress ring/bar
- Top categories
- Top merchants
- Top items
- Uncategorized count
- Recent activity preview
- Quick actions: Add manual, Review Inbox, Create Budget, Search

### States
- First-run empty
- Partially configured
- Normal
- Offline badge
- Sync error badge

## 4. Inbox

### Purpose
Process uncategorized, skipped, partial, and conflict items.

### List item fields
- Amount
- Merchant
- Date/time
- Source app
- Suggested item/category if available
- Status badge

### Actions
- Classify
- Split
- Skip
- Delete
- Create rule

### Filters
- Status
- Merchant
- Source app
- Amount range
- Date range

## 5. Quick Classify Bottom Sheet

### Fields
- Item name
- Category chips
- Merchant preview
- Amount preview
- Suggested values
- Save-as-rule toggle
- Save / Skip / Split

### Behavior
- Optimized for one-hand use
- Suggested values visible above keyboard
- Should open from Inbox, notification action, or manual add

## 6. Split Items Screen

### Elements
- Parent payment summary
- Dynamic line-item rows
- Qty, price, total, category
- Running allocated total
- Remaining amount chip
- Remainder type selector: tip, tax, fee, unknown

### Guardrails
- Warn before save if totals do not match
- Allow partial save if user chooses to leave remainder unknown

## 7. Timeline

### Purpose
Browse all transactions historically.

### Features
- Day-grouped list
- Search
- Filter chips
- Pull to refresh (sync mode only)
- Quick edit from row tap

## 8. Transaction Detail

### Fields
- Amount
- Merchant raw + normalized
- Date/time
- Source app
- Parser version and confidence
- Classification history
- Items
- Audit history
- Actions: edit, split, delete, create alias, create rule

## 9. Budgets

### Screens
- Budget list
- Create/Edit budget
- Budget detail with trend and threshold state

### Budget types
- Overall
- Category
- Merchant
- Item

### Cycle types
- Monthly
- Weekly
- Rolling
- Custom / salary cycle

## 10. Insights

### Cards / charts
- Spend by category
- Spend by merchant
- Spend by item
- Spend by hour of day
- Spend by day of week
- Compare current period vs previous period

### Requirements
- Must render from local data
- Must remain readable on small screens
- No dense finance terminology

## 11. Settings

### Sections
- Capture sources
- Privacy mode
- Sync mode / device pairing
- Budget cycle defaults
- Export
- Diagnostics
- About / support

## 12. Diagnostics

### Contents
- Listener permission state
- Allowed source apps
- Parser versions
- Last successful capture
- Recent parse failures
- Redacted debug export button

## 13. Error states and microcopy rules

- Always explain what the user can do next
- Avoid exposing internal jargon on primary screens
- Show “Try again” or “Review later” instead of dead-end errors
- Conflict states must preserve user trust and data visibility