## Ask for birth data at the moment of adding (branch `cursor/ask-birth-data-at-add-c9e9`) — 2026-09-15

**Trigger**: The birth_data invite lived only on the person profile, so adding someone and asking them required navigating away, finding them, and asking later. The add-person form said "ask them to" with no way to do it.

`[ADDED]` **`createPerson` in `@galaxia/core` is the only people insert.** Name trim, relation normalisation (`minorSafeRelation`), `is_minor`, birth_precision, and the insert live there. Web onboarding, `/app/add-person`, mobile onboarding, Quick Chart save, and Quick Check all go through it. Identical input produces identical rows.

`[ADDED]` **Ask is on every add surface.** Submit stays on the same screen. A pre-submit toggle (all four precision tiers) generates the link as part of success. Share uses `navigator.share` with copy fallback. Asking twice reuses a pending invite. Minors cannot get a birth_data invite.

`[CHANGED]` **"Add birth data later" copy.** It now says you can send them a link from this screen, matching what the form does.

`[DECISION]` **Founder-review copy (not rewritten existing strings).** Share button: "Share". Reused link: "This is the same link as before." Toggle: "Ask them for their birth details." Success keeps "Send this to {name}..." and "Creating link…". birth_data invites now set `expires_at` to 30 days. Connect invite RPCs still create people in SQL; that is not a TypeScript insert.

`[OPEN]` **Compare and groups did not create people.** Inline `AddPersonForm` plus ask was added on `/app/compare` and the groups empty state so those surfaces can ask without leaving.
