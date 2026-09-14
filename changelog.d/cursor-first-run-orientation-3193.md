## First-run orientation leads with the other person (branch `cursor/first-run-orientation-3193`) — 2026-09-14

**Trigger**: a brand new account was asked for its own birth details first and
got nothing back until it had entered two people. `/welcome` opened on "Let's
place you in the sky", and the first true sentence about anyone arrived only
after a self chart, a second person, and a trip to Compare. The product's claim
is that it tells you something true about someone you know; nothing in the first
run demonstrated that.

`[ADDED]` **Five-step first-run orientation at `/welcome`
(`apps/web/components/first-run-flow.tsx`).** Who do you want to understand
first, their birth details, one true statement about them, your details, then a
choice of what happens next. The statement lands at step 3, before the reader
has given anything about themselves. Skippable at every step, and never
repeated once settled.

`[ADDED]` **`singleChartNeed()` in `@galaxia/astro`
(`src/single-chart-guidance.ts`).** One true statement from one chart, with no
synastry. Existing `whatTheyNeed()` reads a `SynastryResult` and six pair
scores, so it cannot run before the reader has a chart of their own; feeding it
invented scores is the exact failure ENGINEERING.md §12 forbids. The new
function authors no copy at all. It reads `PLANET_IN_SIGN` through
`interpretPlacement` and only decides which real placement the birth data can
support: confident Moon, else confident Sun, else a confident Pluto, Neptune or
Uranus labelled as generational, else `null`. `null` renders as "there is
nothing true to say yet", never as a stand-in line.

`[DECISION]` **Step 2 hides the `none` precision tier.** Every other add-person
surface keeps "Add birth data later", because a name and a relationship are
worth saving on their own. This one step cannot: its next screen is the true
statement, and a person with no chart has no statement. `AddPersonForm` grew an
`allowDeferred` prop rather than the flow growing its own form.

`[DECISION]` **`profiles.onboarding_step` + `profiles.onboarding_completed_at`,
reversing the note in `apps/web/app/start/page.tsx`.** That note derived
"onboarded" from the record (a self row plus a non-self row) on the grounds
that a boolean can drift while the record cannot. It answered its own question
well, but it cannot answer "where exactly did this person stop": only two of
the five steps leave a trace in `people`, so a reader who closes the tab on the
reading is unrecoverable from the record alone. The drift risk is answered by
keeping the step column advisory. A stale or impossible value degrades to
starting the flow over and never overrides what `people` says.
`onboarding_completed_at` is the single "do not offer this again" signal, set
for both `done` and `skipped`.

`[ADDED]` **`mother`, `father` and `other` are real picker relations**
(`packages/core/src/galaxy-orbit.ts` plus a `galaxy_relations` migration).
Step 1 asks in the words people use, and flattening "my mother" to `parent` at
write time would discard something the reader told us. All three already
resolved correctly in the orbit model (mother/father as family ring 3 with the
fixed parent form, `other` as unknown at ring 4), so no seat, band or element
behaviour moves. `galaxy_relations` needed the rows because
`create_connect_invite` validates against that table, so without them a person
added as a mother could never be sent a connect invite and the failure would
have looked like a bug in connect.

`[ADDED]` **`apps/web/lib/galaxy-relations-parity.test.ts`.** The picker list
and the SQL lookup table drifting apart is the bug class above. The test reads
the migrations and fails if they disagree.

`[CHANGED]` **`persistPerson` refuses romantic framing near a minor, in the
write path itself.** `partner` and `ex` against a person `isMinorForSafety`
calls a minor are stored as `other`, and the refusal is returned to the caller,
which must show it. Putting the rule at the single write path rather than at
each call site means no entry point can forget it, and it applies to
`/app/add-person` as much as to the flow. The change is never made quietly: both
surfaces say what was stored and why.

`[CHANGED]` **`persistPerson` accepts `passedAt` at creation.** "Someone I have
lost" is a thing the reader told us at step 1, so it is recorded then rather
than waiting to be re-entered through the remembrance toggle on the profile
later. Step 5 names the memorial option explicitly, in the remembrance language
already used on the marketing section and the person editor.

`[CHANGED]` **`/start` resolves on the profile, and `/app` shows a way back
in.** `/start` reads `onboarding_completed_at` instead of counting people rows.
`/app` shows "Walk me through my first person" whenever the flow was not
completed, so a reader who skipped keeps a visible door rather than only the
zero-people empty state, which they would never see again once they added
anyone.

`[OPEN]` **Mobile is unchanged.** `apps/mobile/app/(app)/onboarding.tsx` is
still the single-scroll self-first page with its own inline add-person logic.
The step state and the statement generator are both in shared packages
(`@galaxia/core` first-run, `@galaxia/astro` `singleChartNeed`) precisely so
mobile parity is a rendering job, but the mobile add-person inline form has to
be extracted first. Follow-up branch.
