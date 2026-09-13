## Add `apps/mobile/eas.json` with an APK-producing Android profile (branch `cursor/android-apk-build-diagnose-0afb`) — 2026-09-13

**Trigger**: Requested an installable Android build (APK, not AAB) with a
download link. Phase 0 diagnosis found the repo had no `eas.json` at all
(confirmed via `git log --all -- apps/mobile/eas.json`, zero hits), so there
was no build profile of any kind, let alone one that produces a
side-loadable `.apk` instead of a Play Store-only `.aab`.

`[ADDED]` **`apps/mobile/eas.json`**: `development` (dev client, internal
distribution), `preview` (internal distribution, `android.buildType: "apk"`,
the profile this task's build uses), and `production` (store `.aab`,
`autoIncrement: true`). `cli.appVersionSource` set to `"remote"` per current
`eas-cli` guidance, so `production` autoIncrement has a version source to
read from.

`[OPEN]` **No EAS build could be run or listed from this environment.**
`eas build:list` and `eas build --platform android --profile preview` both
fail with "An Expo user account is required to proceed." There is no
`EXPO_TOKEN` in the environment and no `eas login` session, and there never
has been a real EAS project either: `app.json`'s `extra.eas.projectId` still
holds the placeholder `"replace-with-eas-project-id"` (also flagged in
`changelog.d/cursor-wire-expo-public-site-url-3a2b.md`), so no build has ever
run for this app, successful or failed. Whoever runs the actual build needs
an Expo account with access to (or permission to create) the Galaxia EAS
project, supplied to this environment as an `EXPO_TOKEN` secret
(https://docs.expo.dev/accounts/programmatic-access/), or must run
`eas build --platform android --profile preview` from a machine with an
interactive `eas login` session.

`[OPEN]` **A real build will crash at launch without EAS-side env vars.**
`src/lib/supabase.ts` throws at import time when
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are unset, and
`eas.json` has never carried an `env` block (by design, per the same prior
changelog entry). Per `docs/ship-checklist.md` §Mobile item 3, these need to
be set as plain-text EAS project environment variables on the `preview`
profile (`eas env:create` or the Expo dashboard) before the APK built here
will do anything past a splash screen.
