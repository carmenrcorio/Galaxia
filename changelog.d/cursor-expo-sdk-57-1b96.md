## Expo SDK 53 → 57 (branch `cursor/expo-sdk-57-1b96`) — 2026-09-17

**Trigger**: Founder decision D4. Phase 0 finishes here so current Skia can land in Phase 2 without rewriting the paint path. SDK 56 had a Hermes/reanimated memory regression; 57 is the documented fix. No Skia in this PR.

`[CHANGED]` **`apps/mobile` is Expo SDK 57.** `expo@~57.0.23`, `react-native@0.86.3`, `expo-router@~57.0.21`, `react@19.2.3`. Native modules pinned to the SDK 57 bundled set, including `react-native-reanimated@4.5.1` and `react-native-worklets@0.10.1` (expo-router 57 peers them; unpinned they floated to 4.6.0 / 0.12.2 and broke `expo-modules-core`'s worklets peer). `query-string@7.1.3` stays a direct dep even though Router 57 now declares it.

`[CHANGED]` **Web and the workspace hoist React 19.2.3.** Root `pnpm.overrides` also pins `@react-native/metro-config` to `0.86.3` so RN 0.86 does not pick up 0.87.1. TypeScript is `~6.0.3` (Expo 57 bundled) at root, web, and mobile.

`[ADDED]` **`sdk-57-pins.test.ts`**, replacing the SDK 53 pin file, so a later cut cannot silently float off 57 or land Skia in this phase.

`[OPEN]` Device unverified. Current Skia is Expo-bundled `@shopify/react-native-skia@2.6.2` and installs with `pnpm expo install @shopify/react-native-skia` **after** this PR merges, in the Phase 2 shell-twin slice — not here.
