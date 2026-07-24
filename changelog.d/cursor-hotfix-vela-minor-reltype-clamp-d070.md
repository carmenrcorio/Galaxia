## Hotfix: Vela relationshipType allowlist when a minor is in scope (branch `cursor/hotfix-vela-minor-reltype-clamp-d070`) — 2026-07-23

**Trigger**: Deployed `vela-chat` v10 (2026-07-12) had no server-side clamp on free-text `relationshipType`. A Vela thread scoped to a minor (1:1 or group) could carry romantic framing (`partner` / `romantic` / slang like `bf`) into the Anthropic context. `parenting: true` does not suppress it. Main's PR #74 clamp was group-only and denylist-based — insufficient.

`[FIXED]` **Server-side allowlist coerce in `vela-chat` when any scoped person is a minor** (1:1, pair, or group). Safe set: `general`, `siblings`, `friends`, `parent-child`, `ancestor`, `platonic`. Anything else (including `partner` / `romantic` / `bf` / `novio` / misspellings) becomes `general` before context is built. Adults-only scope is unchanged.

`[DECISION]` **Allowlist, not denylist.** Free-text cannot be exhaustively blocked by matching romantic labels. Unknown → `general`.

`[DECISION]` **`relationshipType` is not stored on `threads`.** Clamp runs on every chat request from the payload; no persisted romantic value can re-inject on the next message.

`[CHANGED]` **Shared helper in `@galaxia/vela`** (`coerceVelaRelationshipTypeForMinorScope` / `resolveVelaRelationshipType`) mirrored inline in the edge function (Deno cannot import the workspace). Parenting / framing router untouched.
