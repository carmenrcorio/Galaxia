## Vela citation detector accepts one warmth connector (branch `cursor/vela-citation-connector-words-2b27`) — 2026-09-17

**Trigger**: The eval failed 8/10 because `countVelaAspectCitations` required the aspect word to sit between two bare planet names. "Venus square your Mars" and "Their Venus square your Mars" name a real aspect and match Vela's warm voice; the detector treated them as unnamed.

`[FIXED]` **Optional single connector on either side of the aspect word.** The regex now allows at most one of `is`, `to`, `your`, `their`, `his`, `her`, `its`, `my`, `our` between a planet and the aspect type (case-insensitive). Two connectors stacked still miss. Bare `Venus square Mars` still hits. The same pattern is mirrored in `vela-chat` for the `vela_aspect_citation` log line.

`[ADDED]` **`packages/vela/test/citation-detector-parity.test.ts`.** `system-prompt-parity.test.ts` only covered `VELA_SYSTEM_PROMPT`. This sibling locks planets, aspects, connectors, and the regex template across `packages/vela` and `supabase/functions/vela-chat`.
