## Show product navigation on public marketing pages for signed-in users (branch `cursor/authenticated-marketing-nav-b525`) — 2026-09-27

**Trigger**: Public marketing routes always showed acquisition actions, even
when the browser held a valid authenticated session.

`[FIXED]` **Marketing navigation now recognizes signed-in visitors after
hydration.** A session-only client hook validates the user without loading
profile, people, or chart records. Marketing pages remain statically rendered
with anonymous navigation by default and swap to the existing app navigation
only after authentication succeeds.
