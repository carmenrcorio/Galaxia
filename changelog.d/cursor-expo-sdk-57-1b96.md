## Expo SDK 53 → 57 (branch `cursor/expo-sdk-57-1b96`) — 2026-09-17

**Trigger**: Founder decision D4. Phase 0 finishes here so current Skia can land in Phase 2 without rewriting the paint path. SDK 56 had a Hermes/reanimated memory regression; 57 is the documented fix. No Skia in this PR.

`[CHANGED]` **`apps/mobile` is Expo SDK 57.** `expo@~57.0.23`, `react-native@0.86.3`, `expo-router@~57.0.21`, `react@19.2.3`. Native modules pinned to the SDK 57 bundled set, including `react-native-reanimated@4.5.1` and `react-native-worklets@0.10.1` (expo-router 57 peers them; unpinned they floated to 4.6.0 / 0.12.2 and broke `expo-modules-core`'s worklets peer). `query-string@7.1.3` stays a direct dep even though Router 57 now declares it.

`[CHANGED]` **Web and the workspace hoist React 19.2.3.** Root `pnpm.overrides` also pins `@react-native/metro-config` to `0.86.3` so RN 0.86 does not pick up 0.87.1. TypeScript is `~6.0.3` (Expo 57 bundled) at root, web, and mobile.

`[CHANGED]` **SDK 57 app config.** Removed `newArchEnabled` (ignored from SDK 55; New Architecture cannot be turned off) and the legacy `splash` key. Splash is `expo-splash-screen@~57.0.9` with background `#191331`.

`[TESTED]` Mobile typecheck. Mobile Vitest **96**. Shared packages typecheck. Web typecheck + **1525** tests. `npx expo-doctor@latest` **21/21**. `expo export` android **1846** modules, ios **1750** modules. No Skia. Device unverified.

`[OPEN]` Device unverified. Current Skia is Expo-bundled `@shopify/react-native-skia@2.6.2` and installs with `pnpm expo install @shopify/react-native-skia` **after** this PR merges, in the Phase 2 shell-twin slice — not here.
