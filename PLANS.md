# PLANS.md

Use this template before implementing any multi-step, cross-module, or risky change.

## Active Plan

### SET-005 — Android Dev Build Toolchain Compatibility

- **Status:** completed
- **Ticket:** SET-005
- **Goal:** Restore local Android dev-build installation by fixing the Gradle/toolchain mismatch that blocks `expo run:android` after the Android SDK and Java setup is present.
- **Touched files/modules:** `PLANS.md`, `client/android/gradle/wrapper/gradle-wrapper.properties`.
- **Rationale:** After local Android SDK setup, the build moved past missing-tool errors and failed in Gradle with `JvmVendorSpec IBM_SEMERU`, indicating a Gradle 9 compatibility break with the React Native/Foojay toolchain plugin path currently present in the installed stack.
- **Risks:** Pinning the wrapper to Gradle `8.14.x` could diverge from future upstream template defaults, but leaving Gradle 9 in place blocks all local Android development on this machine.
- **Validation commands:** `cd client/android && ./gradlew -version`, `cd client/android && ./gradlew app:assembleDebug -x lint -x test --configure-on-demand --build-cache`, `adb install -r client/android/app/build/outputs/apk/debug/app-debug.apk`, `adb shell pm list packages | rg com.upispendtracker.client`.
- **Done when:** The wrapper uses a Gradle version compatible with the current React Native/Foojay toolchain plugin path, the debug APK builds, and the Android development client package is installable on the connected device.
- **Outcome:** Pinned the Android Gradle wrapper from `9.0.0` to `8.14.3`, matching the supported upper bound for the pre-`1.0.0` Foojay resolver path used by the current React Native Gradle plugin and clearing the `IBM_SEMERU` build failure.

### SET-004 — iOS Shell Support for Expo Client

- **Status:** completed
- **Ticket:** SET-004
- **Goal:** Add the minimum Expo config and workflow needed to launch the client shell on iOS without expanding scope into iOS-native capture or feature parity.
- **Touched files/modules:** `PLANS.md`, `README.md`, `package.json`, `client/app.json`, `client/package.json`.
- **Rationale:** The Expo client could not open on iOS because `ios.bundleIdentifier` was missing from app config. The repo needed explicit iOS shell wiring so local UI development can run on Simulator while keeping Android-native capture as the only v1 platform-specific path.
- **Risks:** iOS documentation could overstate platform support, local launch may still be blocked by machine prerequisites like Xcode or CocoaPods, and future native iOS work could require revisiting the decision not to commit `client/ios`.
- **Validation commands:** `pnpm --filter @upi-spend-tracker/client exec expo config --type public`, `pnpm --filter @upi-spend-tracker/client exec expo install --check`, `cd client && npx expo-doctor`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm dev:ios`.
- **Done when:** Expo public config includes `ios.bundleIdentifier`, root/client iOS scripts exist, docs describe iOS shell support accurately, and validation passes or any remaining machine-specific blocker is documented exactly.
- **Outcome:** Added `ios.bundleIdentifier` as `com.upispendtracker.client`, added client/root iOS run scripts, updated README to describe iOS shell development and Android-only native capture scope, and preserved iOS support as shell-only rather than parity with Android capture behavior.

### SET-003 — Expo SDK 55 Android Dev Build Alignment

- **Status:** completed
- **Ticket:** SET-003
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
