# PLANS.md

Use this template before implementing any multi-step, cross-module, or risky change.

## Active Plan

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
