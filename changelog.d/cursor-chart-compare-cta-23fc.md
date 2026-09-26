## Compare CTA after a free chart (branch `cursor/chart-compare-cta-23fc`) — 2026-09-26

**Trigger**: After a visitor generated a natal chart on `/chart`, the only path to synastry was the pre-generation "Compare two charts" pill, which disappears once results render. The gap between "I see this chart" and "now compare it" had no next step.

`[ADDED]` **Post-generation Compare CTA on `/chart` results.** A glass-card section sits between the full-chart toggle and the existing action buttons (Save / PDF / share / try another). FOUNDER-REVIEW copy: "Now see how [Name] connects with someone in your life" (nameless fallback: "Now see how this chart connects with someone in your life") and button "Compare with someone". The button is a teal pill so "Save to your galaxy" stays the gold primary.

`[ADDED]` **`/chart` → `/chart/compare` Person A prefill.** The CTA links to `/chart/compare` with the current birth data as `a_*` query params (the existing share-link encoding). The typed name is sessionStorage only and never enters the URL. `/chart/compare` fills Person A from `a_*` without auto-running, and a signed-in self-chart does not overwrite that handoff.
