## Expo SDK 52 → 53 (branch `cursor/expo-sdk-53-1b96`) — 2026-09-17

**Trigger**: Founder decision D4 in the twin plan: upgrade Expo before Skia. This is the second incremental cut (React 19, RN 0.79, New Architecture on). Current Skia needs RN >= 0.79; 53 unlocks it, but Skia is still not added — native paint comes after the runtime is current.

`[CHANGED]` **`apps/mobile` is Expo SDK 53.** `expo@~53.0.27`, `react-native@0.79.6`, `expo-router@~5.1.11`, `react@19.0.0`. Native modules pinned to the SDK 53 bundled set (`@expo/metro-runtime@~5.0.5`, `expo-constants@~17.1.8`, `expo-linking@~7.1.7`, `expo-notifications@~0.31.5`, `react-native-gesture-handler@~2.24.0`, `react-native-safe-area-context@5.4.0`, `react-native-screens@~4.11.1`, `react-native-web@~0.20.0`). `query-string@7.1.3` stays a direct dep: Router 5 still requires it undeclared.

`[CHANGED]` **New Architecture is on** (`app.json` `newArchEnabled: true`). SDK 53 defaults this; the 52 cut left it off so React 18 → 19 and New Arch are isolatable.

`[CHANGED]` **Web and the workspace hoist React 19.** `apps/web` `react`/`react-dom` are `19.0.0` (Next 16 already peers `^19.0.0`). Root `pnpm.overrides` pins both so pnpm cannot install a second React 18 copy from leftover peers. TypeScript is `^5.8.3` (Expo 53 bundled) at root, web, and mobile. `@types/react` is `~19.0.10`; web `@types/react-dom` is `~19.0.4` so it does not float to 19.3 and demand newer React types than Expo pins.

`[ADDED]` **`sdk-53-pins.test.ts`**, replacing the SDK 52 pin file, so a later cut cannot silently float off 53, turn New Arch off, drop the React 19 override, or land Skia in this phase.

`[OPEN]` Device unverified. Cloud VM cannot prove native UI or New Architecture on a phone. Next cut is 53 → 54 toward 57; still no Skia.
