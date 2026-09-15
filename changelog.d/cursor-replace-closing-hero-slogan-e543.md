## Replace closing hero slogan (branch `cursor/replace-closing-hero-slogan-e543`) — 2026-09-15

**Trigger**: the marketing close (`CloseSection`) still used the old poetic closer ("The small, bright, irreplaceable galaxy that is yours.") and needed the founder-authored three-beat line.

`[CHANGED]` **Closing hero slogan in `apps/web/components/marketing/close-section.tsx`.** Replaced "The small, bright, *irreplaceable* galaxy that is yours." with "Your life. Your People. *Your Galaxy.*" Each phrase keeps its period. The italic gold `<em>` treatment that sat on "irreplaceable" now sits on the terminal beat "Your Galaxy." (including the period). CSS (`.close-h em { color: var(--gold) }`) is unchanged. Tagged `FOUNDER-REVIEW`. No em dashes. No other copy or layout changes. The same component is reused on `/`, `/why-galaxia`, `/generations`, `/meet-vela`, `/security`, `/pricing`, `/press`, and `/glossary`.
