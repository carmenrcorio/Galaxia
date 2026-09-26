## Glossary tooltips on chart and compare (branch `cursor/glossary-tooltips-6e21`) — 2026-09-26

**Trigger**: natal and synastry surfaces name aspect types, flows, catches, houses, and orbs without a way to read what those words mean. The public `/glossary` list already exists; chart views did not use it.

`[ADDED]` **`GlossaryTerm` accepts `glossarySlug`.** Lookup is the shared `GLOSSARY_TERMS` list in `@galaxia/core`. The popover shows the first 1–2 sentences and a FOUNDER-REVIEW "See full definition" link to `/glossary#{slug}`. Desktop fine-pointer hover opens after 200ms and closes after 300ms; click, focus, and Escape stay as they were. A pointer click toggles on mousedown so the following focus event cannot immediately close the popover. Touch pointers do not hover-open. `GlossaryPlanet` and `GlossarySign` are unchanged.

`[ADDED]` **`orb` glossary entry** (FOUNDER-REVIEW). "The distance in degrees between an exact aspect. A tighter orb means a stronger connection. Galaxia uses fixed orb allowances per aspect type, listed on the methodology page." Hash target `/glossary#orb`. Applying and separating stay out of the list this pass.

`[ADDED]` **First-occurrence wraps** on `FlowsAndCatchesSection` (flows header, first catches badge, first of each major aspect type in the expanded detail list), `/app/person/[id]` (Aspects and Houses vocab subheads, first of each aspect type in Key Aspects), and mobile Compare (`orb`, flows/catches, first aspect types). HouseBadge per-house tooltips are untouched. Web does not print the word "orb" and does not add it.

`[ADDED]` **Mobile `GlossaryTooltip`** bottom sheet (same glass/gold recipe as the compare person-picker sheet). Missing `EXPO_PUBLIC_SITE_URL` hides the full-definition link instead of inventing a host.

No em dashes. No interpretation copy or aspect data changed.
