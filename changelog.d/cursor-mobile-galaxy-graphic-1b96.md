## Galaxy graphic twin (branch `cursor/mobile-galaxy-graphic-1b96`) — 2026-09-17

**Trigger**: Home constellation did not match `/app` — linear wash, thin rings, boxed 16px ink card, missing grain / memorial flare / legend / rings toggle.

`[CHANGED]` **Atmosphere wash is the web radial vignette.** `GALAXY_WASH_STOPS` + `GALAXY_WASH_RADIUS` 0.72 (center `rgba(22,16,46,0.34)` → edge `rgba(6,4,18,0.82)`), not a top-to-bottom fade. Ring glow uses web `shadowBlur` multipliers (5 / 2). Film grain overlay at 0.045 Overlay. Memorial ignition flare `R0 * 2.2`. saveLayer sized to glow/flare so halos are not clipped.

`[CHANGED]` **Stage chrome matches `/app`.** Glass card, “Your constellation” eyebrow, ink stage, RINGS toggle (`galaxia.setting.showRings`), legend strip, “Tap a star to open”. Rings bake onto their own Picture like the web ring cache.

`[TESTED]` Wash / ring / grain / flare numbers locked against `apps/web/app/app/page.tsx`. Paint math + twin wiring. Typecheck. Device unverified (Cloud Agent cannot prove native Skia).
