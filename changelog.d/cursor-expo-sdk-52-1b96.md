## Expo SDK 51 → 52 (branch `cursor/expo-sdk-52-1b96`) — 2026-09-17

**Trigger**: Founder decision D4 in `design/galaxia-mobile-web-twin-plan.md`: upgrade Expo before Skia. Current Skia needs RN >= 0.79; 51 cannot run it. This is the first incremental cut (router / RN 0.76, still React 18).

`[CHANGED]` **`apps/mobile` is Expo SDK 52.** `expo@~52.0.49`, `react-native@0.76.9`, `expo-router@~4.0.22` (React Navigation 7). React stays 18.3.1 so the hoisted web app is untouched. New Architecture stays **off** (`app.json` `newArchEnabled: false`) until this cut is proven on a device.

`[CHANGED]` **Native modules pinned to the SDK 52 bundled set**, reversing the SDK 51 pins (`react-native-screens@~4.4.0`, `react-native-safe-area-context@4.12.0`, `expo-notifications@~0.29.14`, `expo-constants@~17.0.8`, `@expo/metro-runtime@~4.0.1`). Added the Router 4 peers `expo-linking@~7.0.5` and `react-native-gesture-handler@~2.20.2`. Root layout wraps in `GestureHandlerRootView`.

`[CHANGED]` **Metro uses SDK 52 auto monorepo config.** Deleted the SDK 51 `watchFolders` / `nodeModulesPaths` / `unstable_enableSymlinks` block (`docs.expo.dev/guides/monorepos`).

`[FIXED]` **`query-string@7.1.3` is a direct mobile dependency.** `expo-router` 4 requires it in `getPathFromState` but does not declare it. pnpm hoisting does not install undeclared packages, so the first `expo export --platform android` died on `Unable to resolve module query-string`. CJS 7.x, not ESM 8.

`[ADDED]` **`sdk-52-pins.test.ts`** so a later cut cannot silently float off 52 or land Skia in this phase.

`[TESTED]` `pnpm --filter @galaxia/mobile typecheck`. Mobile Vitest 95. Web typecheck + 1525 tests (hoist regression gate). `npx expo-doctor@latest` 18/18. `expo export` android and ios, 1257 modules each. No Skia. Device unverified.
