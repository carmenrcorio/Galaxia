## Account screen: dead app button removed, change password added, name shown instead of email (branch `cursor/settings-name-password-app-button-e68c`) — 2026-08-18

**Trigger**: Three defects on the same signed-in surface (`/account`). It offered an
"Open in app" button for an app that does not exist, offered no way to change a
password while signed in, and greeted people by their email address.

`[FIXED]` **The "Open in app" button is gone from `/account`.** It linked to
`${NEXT_PUBLIC_SITE_URL}/account`, which is the same web page the user was
already on, so it never opened anything. There is no deep link scheme and no
published app to receive one. The `GetApp` card directly below it already carries
the honest state ("iOS coming soon", "Android coming soon", plus the launch
notification signup), so the button was both dead and contradicted one card
away. Removed rather than restyled as a disabled "coming soon" pill, because the
card below already says exactly that. Note for whoever ships mobile: the
placeholder `TEAMID.com.galaxia.app` in
`app/.well-known/apple-app-site-association/route.ts` and the unmounted
`components/smart-app-banner.tsx` are the pieces to revisit then.

`[ADDED]` **Authenticated change-password on `/account`** as
`components/change-password.tsx`, calling `supabase.auth.updateUser({ password })`
against the live session. This is not the `/login` forgot-password email recovery
flow, which is a separate open issue and is untouched. It requires a session on
mount and re-checks it immediately before the write, since a card left open can
outlive its session. Failures show Supabase's own message verbatim: a rejected
password, a reauthentication requirement, or an expired session each say what
actually happened instead of collapsing into a generic failure.

`[ADDED]` **`lib/password-rules.ts`** holds `PASSWORD_MIN_LENGTH = 6`, which is
exactly what the signup form already enforced inline. Signup and change-password
now both import it, so the two cannot drift and no second rule was invented.
Raising it here alone is not enough: the Supabase project's own auth minimum has
to move with it.

`[ADDED]` **`resolveAccountName` in `@galaxia/core`** (`src/account-name.ts`) is
now the single answer to "what do we call the signed-in user?". Precedence:
`profiles.display_name`, then `people.display_name` where `is_self`, then no
name. An email is never returned as `name` or `firstName`. It is offered
separately as `identityLabel` so an account header can still identify the
account when no name exists. `splitFullName` / `joinFullName` round trip exactly,
which lets one `display_name` column back the two-field forms.

`[FIXED]` **Three independent copies of the name decision now read that
resolver.** `/account` had its own resolution, `/app` home did
`profiles.display_name ?? email.split("@")[0] ?? "stargazer"`, and mobile home
had a third copy of that same email fallback. Home also ignored the self-record
name entirely, so a user who typed a real name during onboarding was still
greeted by a fragment of their login address. `/app/vela` also held a
`userName` seeded from the email that was never rendered; that state is deleted
rather than left as a loaded gun. When no name exists the greeting simply does
not name anyone.

`[FIXED]` **Mobile signup no longer writes `display_name: email.split("@")[0]`**
(`apps/mobile/app/index.tsx`). This was the actual source of the email appearing
where a name belongs: it stored a fragment of the login address in the one field
every greeting, every account header, and `lib/invites.ts`'s `inviter_name` read,
so those surfaces were faithfully displaying a bad stored value. Signup collects
no name on mobile, so it now stores none, and `/account` honestly asks for one.

`[ADDED]` **Signup collects a first and last name** (`components/signup-form.tsx`).
The name rides in auth metadata because `signUp` returns no session when email
confirmation is on, and `profiles` is not writable until there is one.
`lib/account-name.ts syncSignupNameToProfile` copies it into
`profiles.display_name` at the first authenticated moment (`/auth/callback`, with
`/start` as a catch-up for login paths that skip the callback). Metadata is
transport only: nothing reads it for display, and the copy never overwrites a
name the user has already set. Last name is asked for but not required, so a
person with one name is not locked out of signup.

`[CHANGED]` **`/account`'s name field is now First name plus Last name**, joined
into the same single `profiles.display_name` value, and the header falls back to
the full email only when no name is stored, with a line saying that is what is
happening.

`[DECISION]` **No cleanup heuristic for names already stored by mobile signup.**
Accounts created before this change still hold an email local part in
`profiles.display_name`, and the resolver takes stored values at face value. The
resolver could have treated "display_name equals the email local part" as
not-a-name, which would have auto-corrected those accounts, but it would also
reject anyone who genuinely goes by that string. Founder's call: stop new bad
writes only. Affected accounts fix themselves the first time someone saves a name
on `/account`.

`[DECISION]` **No migration in this branch.** `handle_new_user` could copy the
signup name from `raw_user_meta_data` at the database level, which would cover
clients that never touch the web callback. It is not needed while web signup is
the only place a name is collected, and it would add a manual apply step to a
branch that Vercel can otherwise ship on its own. Worth adding when mobile signup
starts collecting a name.
