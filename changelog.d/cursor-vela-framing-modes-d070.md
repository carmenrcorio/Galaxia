## Vela framing: one discriminated mode per request (branch `cursor/vela-framing-modes-d070`) — 2026-07-24

**Trigger**: After PR #74's group frame went live with undeployed-then-redeployed edge code, group asks that included a minor still collapsed to parenting ("I'll speak to you as his parent") because `parenting: peopleCtx.some(isMinor)` plus an always-on system line ("any person is a minor → coach the parent") fought the group frame. QATEST Group1 (two grandmothers + grandchild) reproduced it.

`[DECISION]` **Exactly one framing mode per request** — a discriminated value (`group` | `parenting` | `third_person_minor` | `default`), not parallel booleans. Inject exactly one framing block from that mode. Deleted the always-on parenting system instruction; parenting text is only the parenting branch.

`[DECISION]` **Person tags are user-relative.** Parenting mode requires the subject tagged `child` (the user is that minor's parent). Do not key on a `parent` tag. Absence of a child tag → no parenting mode. Gabriel tagged grandchild → third-person minor in 1:1; group scope still wins in a group ask.

`[FIXED]` **Group scope always wins** over parenting / third-person-minor. Group asks speak about all members by name and never collapse to one subject.

`[ADDED]` **Third-person-minor mode** for 1:1 about a minor who is not tagged `child` (grandmother→grandchild). Speaks about the minor in third person; never coaches the requester as a parent.

`[CHANGED]` **`SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR`** adds `grandparent` and `grandchild` (workspace + edge mirror). Parity test reads the edge file as text and deep-equals the exported constant.

`[CHANGED]` **Stale path comment** in `vela-chat`: mirrors `packages/vela/src/parse.ts`, not the removed `apps/web/lib/vela-parse.ts`.

Safety untouched: shared-mode block and relationshipType allowlist coerce stay as-is.
