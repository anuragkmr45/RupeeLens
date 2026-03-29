# OTA Runtime And Rollback Playbook

Date: 2026-03-29

This document is the repo-side playbook for `QA-004`.

## Goal

Ship JavaScript and config changes safely over the air without sending incompatible updates to binaries whose native runtime has changed.

## Repo-side configuration

- `client/eas.json` defines three isolated EAS Build profiles and update channels:
  - `internal`
  - `beta`
  - `production`
- `client/app.config.ts` sets `runtimeVersion.policy = "fingerprint"` so the runtime version changes when the native surface changes.
- `client/app.config.ts` also keeps OTA disabled unless a real update URL is configured through:
  - `EXPO_EAS_PROJECT_ID`, which is converted to `https://u.expo.dev/<project-id>`
  - or `EXPO_UPDATES_URL`
- `client/src/features/bootstrap-config/runtime-config.ts` now prefers `expo-updates` channel/runtime metadata, then falls back to `EXPO_PUBLIC_RELEASE_CHANNEL`, then to the safe local defaults.

## Required maintainer setup

The repo now contains the correct local config shape, but OTA will remain disabled until a maintainer provides the real Expo project wiring.

Required before the first OTA dry-run:

1. Create or confirm the EAS project for the `client` app.
2. Set `EXPO_EAS_PROJECT_ID` in the build environment, or set `EXPO_UPDATES_URL` explicitly if a non-default update URL is required.
3. Authenticate the maintainer environment with EAS CLI.
4. Build new binaries for the channels that should receive OTA updates.

Without a real project ID or update URL, builds stay on the embedded bundle only. That is intentional and safer than pretending OTA is live.

## Channel policy

| Channel | Build profile | Intended audience | Notes |
|---|---|---|---|
| `internal` | `internal` | Engineering and release verification | Uses a development client and internal distribution. |
| `beta` | `beta` | Closed beta testers | Internal distribution by default until release engineering changes that policy. |
| `production` | `production` | Public production users | Only publish after internal and beta validation pass. |

## Runtime-version policy

The client uses Expo fingerprint runtime versions.

Why:

- Native-incompatible OTA updates are blocked automatically because a fingerprint changes when the native runtime surface changes.
- Release engineering does not need to remember a manual runtime string for every native-affecting change.
- This is stricter than using only `appVersion`, which depends on humans remembering to bump a version for every native change.

Practical rule:

- If a build contains a different fingerprint runtime, it must receive a fresh binary before it can receive matching OTA updates.

## Staged rollout steps

### 1. Internal build and smoke test

1. Build the internal binary:
   - `eas build --profile internal --platform android`
2. Install it on engineering devices.
3. Publish the candidate update only to `internal`:
   - `eas update --channel internal --message "internal smoke: <summary>"`
4. Verify:
   - app boots
   - bootstrap config still loads
   - no native regression is observed

### 2. Beta rollout

1. Build the beta binary if the runtime fingerprint changed:
   - `eas build --profile beta --platform android`
2. Publish to beta:
   - `eas update --channel beta --message "beta rollout: <summary>"`
3. Validate against the beta checklist:
   - cold launch
   - onboarding
   - inbox/classify/manual add
   - budgets and insights
   - bootstrap/runtime-compatibility messaging

### 3. Production rollout

1. Publish only after internal and beta pass.
2. Either publish directly:
   - `eas update --channel production --message "production rollout: <summary>"`
3. Or republish the already-vetted update:
   - `eas update:republish --channel beta --destination-channel production --message "promote vetted beta update"`

## Rollback checklist

Choose the smallest rollback that safely stops the issue.

### Option A: remote kill switch or feature rollback

Use this first for:

- parser template regressions
- rollout mistakes
- feature flag mistakes
- copy/config issues already covered by bootstrap config

Action:

1. Disable the affected flag or parser behavior in bootstrap config.
2. Confirm clients pick up the config on next refresh/launch.
3. Record the incident and affected config version.

### Option B: republish the previous good update

Use this when the bad update is JS/config-only and a known-good prior update exists on the same runtime.

Action:

1. Identify the last known-good update group.
2. Republish it to the affected channel:
   - `eas update:republish --group <group-id> --destination-channel <channel> --message "rollback to known-good update"`
3. Verify the channel serves the republished update.

### Option C: roll back to embedded

Use this when the safest immediate state is the binary’s embedded bundle.

Action:

1. Roll the affected channel back to embedded:
   - `eas update:roll-back-to-embedded --channel <channel> --runtime-version <runtime-version> --message "rollback to embedded"`
2. Verify a clean launch on a device with the affected binary.

## Change-type matrix

| Change type | OTA allowed? | Requires store release? | Notes |
|---|---|---|---|
| Pure JS UI/copy/layout logic | Yes | No | Publish to `internal` first. |
| Bootstrap feature flags or parser kill switches | Yes | No | Prefer config rollback before republishing code. |
| Parser template changes supported by existing parser contract | Yes | No | Must remain kill-switchable. |
| Pure JS SQLite/domain logic changes | Yes | No | Validate migration safety first. |
| New JS dependency with no native code | Usually yes | No | Confirm it does not add a native runtime requirement. |
| Adding/removing Expo/native libraries | No | Yes | Fingerprint runtime changes; new binary required. |
| AndroidManifest, Info.plist, permissions, schemes, package IDs, bundle IDs | No | Yes | Native runtime changed. |
| `app.config.ts` changes that affect native config, plugins, icons, splash, orientation, updates config, runtime policy | No | Yes | Build a new binary before publishing updates. |
| Kotlin/Java/Swift/Obj-C changes | No | Yes | Native runtime changed. |
| `expo-updates` configuration or runtime-version policy changes | No | Yes | Requires a new binary to take effect safely. |

## Dry-run evidence checklist

Before claiming this ticket fully done, release engineering should capture evidence for:

- one successful `internal` OTA publish
- one successful rollback in a non-production channel
- proof that an OTA with a different runtime fingerprint is not delivered to an incompatible binary
- engineering-lead approval of this process

Until that evidence exists, the ticket should remain open in tracking even though the repo-side config and playbook are present.
