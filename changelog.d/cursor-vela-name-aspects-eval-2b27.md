## Vela names the aspect it reads (branch `cursor/vela-name-aspects-eval-2b27`) — 2026-09-16

**Trigger**: GTM blocker 3. Vela was told to name aspects and, after #311, given `aspect_list`, but the production prompt still said "jargon-free" in the same block. Package and edge prompts had drifted. Zero production replies exist since #311, so current behavior had never been measured.

`[CHANGED]` **One `VELA_SYSTEM_PROMPT`.** The edge function's HOW YOU THINK / SAFETY / OUTPUT structure is now the only prompt. `packages/vela` holds a byte-identical copy. A parity test reads both files, resolves the template literals, and fails if they diverge.

`[CHANGED]` **Aspect names are not jargon.** Replaced "plain, jargon-free language" with: blend chart meaning with concrete relationship advice in plain language; name the aspect first, then say in everyday words what it means for these two people.

`[ADDED]` **`lead_aspects`.** `aspect_list` is sorted by orb ascending, synastry before natal. Pair threads put the three tightest synastry entries in `lead_aspects`; other threads use the three tightest natal entries. Empty lists (year-only charts, memorial profiles without a full birth date) stay empty. Vela is told to name at least one lead aspect by planet and aspect type in the first two sentences.

`[ADDED]` **Citation log, no user text.** After each stream, one structured line: `vela_aspect_citation {"list_size":n,"named_in_list":n,"named_not_in_list":n}`. No thread id, no names, no message text.

`[ADDED]` **`scripts/vela-aspect-eval.mjs`** and **`.github/workflows/vela-aspect-eval.yml`** (`workflow_dispatch` only). Ten fixed relational questions against two fixture pairs. Passes only if at least 9/10 name an in-list aspect and 0/10 name an aspect not in the list. Requires the `ANTHROPIC_API_KEY` Actions secret.

`[OPEN]` **FOUNDER-REVIEW** on the two new prompt sentences. Remove the tags in a final commit after approval, before merge.
