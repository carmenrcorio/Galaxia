/**
 * Split a Vela reply into the answer body and the suggested follow-up prompts.
 *
 * The vela-chat system prompt instructs the model to end with up to 3 short
 * follow-ups, each on its own line, prefixed with "→ ". Everything before the
 * first such line is the answer body; each "→ " line is one suggestion.
 *
 * If the model returned no "→ " lines, `suggestions` is empty — the UI must
 * render no chips. Never fabricate suggestions.
 *
 * Also used mid-stream: a trailing, still-streaming "→ …" line is excluded
 * from `body`, so a half-written suggestion is never shown inside the bubble.
 */
export function splitVelaReply(text: string): { body: string; suggestions: string[] } {
  const lines = text.split("\n");
  const firstArrow = lines.findIndex((l) => l.trimStart().startsWith("→"));
  if (firstArrow === -1) return { body: text.trim(), suggestions: [] };
  const body = lines.slice(0, firstArrow).join("\n").trim();
  const suggestions = lines
    .slice(firstArrow)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("→"))
    .map((l) => l.replace(/^→\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  return { body, suggestions };
}
