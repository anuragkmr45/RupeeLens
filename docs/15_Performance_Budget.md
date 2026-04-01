# Performance Budget

Date: 2026-04-01

## Purpose

This document defines the current repo-side `QA-003` performance budget for v1. It separates what is already enforced locally and repeatably from what still requires direct device or throttled-network evidence before beta.

## Repo-Side Budget

| Area | Current budget | Automated evidence |
| --- | --- | --- |
| Local insights aggregation | `summarizeInsights()` on a 10,000-transaction seeded dataset completes in under `750 ms` | `client/__tests__/domain.test.ts` |
| Sync push payload shaping | Sync batching respects both entry count and payload-size limits, and a `260 byte` max-payload test forces a one-op batch split on slow-network style settings | `client/__tests__/sync-runtime.test.ts` |
| Android JS bundle size | Largest exported Android Hermes bundle stays at or below `2,600,000` bytes | `scripts/qa/check-performance-budget.mjs` after `pnpm --filter @upi-spend-tracker/client build` |
| Offline dashboard behavior | Core spend dashboard, Inbox, budgets, history, and settings flows remain local-first and do not depend on a live API | `client/__tests__/app.test.tsx`, `client/__tests__/persistence.test.ts`, `client/__tests__/mobile-migrations.test.ts` |

## Named Suite

Run the repo-side performance baseline with:

```bash
pnpm qa:performance
```

That suite currently runs:

1. The 10k-transaction local insights performance test.
2. The sync payload-size batching test.
3. A client Android export build.
4. A bundle-size gate over the generated Hermes output.

## Current Evidence

Latest repo-side baseline on 2026-04-01:

- Local insights 10k-dataset performance test passed under the existing `< 750 ms` assertion.
- Sync batching payload-limit test passed.
- `pnpm --filter @upi-spend-tracker/client build` produced an Android Hermes bundle of `2,361,232` bytes, which is within the `2,600,000` byte repo-side budget.

## Still Pending Outside Repo

These items are not claimed by the repo-side suite and still require real hardware or controlled network conditions:

- cold-start budget on baseline Android devices
- navigation latency budget on baseline Android devices
- capture-to-prompt latency on supported Android devices
- throttled-network sync behavior on low/mid-tier Android hardware

## Interpretation

`QA-003` can be considered repo-side complete once this budget and suite are in place and passing. The canonical backlog ticket may still remain active until direct device/network profiling evidence is available, if release criteria continue to require it.
