## Share link on saved Compare (branch `cursor/saved-compare-share-link-21d9`) - 2026-07-23

**Trigger**: Logged-in `/app/compare` only offered "Save this reading." Quick Compare already had a free token share via `/api/quick-share` and `/s/<token>`. Bring saved Compare to parity for share (PDF deferred; no compare PDF in this pass).

`[ADDED]` **Copy share link on `/app/compare`.** Reuses `ShareLinkButton` + `POST /api/quick-share` + `/s/<token>` render. Assembles a `CompareSharePayload` from the live result (retained `chartA`/`chartB` already loaded by `runCompare`, full `synastry.aspects`, generational). No second persist path, sanitizer, or snapshot renderer. `compare_reading` notes are unchanged.

`[ADDED]` **Relation-type map for the share schema.** Full Compare picker types map via `isRomanticRelation` to `romantic` | `platonic` only. Schema not widened; existing tokens and validator untouched.

`[ADDED]` **Minor-safety parity with Quick Compare.** Share-time `pairHasMinor` from `isMinorForSafety` on the live people. Client sends post-block framing (romantic + minor becomes platonic + held notice). Persist still refuses romantic + `pairHasMinor` with 400; `/s` `effectiveCompareFraming` backstop unchanged. Token-only URL; `stripBirthPii` unchanged.
