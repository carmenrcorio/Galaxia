## Galaxy depth pass — parallax, volumetric nebulae, atmosphere (branch `feat/galaxy-depth`) — 2026-07-12

**Trigger**: Phase 2 of the galaxy visual glow-up. Phase 1 (entrance ignition +
living light) shipped; the constellation still read as a flat diagram. This pass
adds depth so it feels like a real volume of space. Same canvas renderers — no
PixiJS/Three.js. Nothing that forms/colours/positions *mean* changed.

`[ADDED]` **Parallax starfield depth in `CosmicBackground`.** The single flat
`#stars` layer is now three depth planes (far/mid/near) with their own density,
star size, brightness and parallax rate. Pointer move (desktop) and
`deviceorientation` tilt (mobile, when the sensor fires — no permission prompt)
shift nearer layers more than farther ones, eased toward the target for a gentle
sense of volume, not a swoop. Scroll parallax preserved.

`[ADDED]` **Volumetric generational nebulae on `/app`.** Each cohort (people
sharing a Pluto sign, read straight from the computed chart's outer-planet
signature) renders a soft gas cloud behind its stars: several offset radial
puffs for an organic edge, drawn with `lighter` compositing so overlapping
cohorts blend into brighter seams instead of stacking as opaque blobs. Cloud
colour is derived deterministically from the cohort's outer-planet signature
(zodiac order → a brand cyan→violet→rose arc), never assigned or tied to app
usage (§12/§13). People without a chart get no cohort and no nebula — we don't
fabricate a generation.

`[ADDED]` **Atmospheric finish.** The constellation canvas now paints a deep
radial wash + vignette (faint indigo centre → deep-ink edges, brand `--ink2` →
`--ink`) so the card interior reads as a volume of space and the eye is drawn to
the user's star at centre, plus a very-low-opacity static SVG film-grain overlay
(CSS, zero per-frame cost).

`[CHANGED]` **Mobile performance guards.** Star counts scale with viewport area
and are hard-capped (a 375px phone draws a few hundred, not thousands); an EMA
frame-budget watch drops the densest starfield layer if a device can't sustain
three, and nebulae fall from three puffs to two under the existing `lowPerf`
flag. The two most expensive fills are amortised offscreen: the static deep-field
wash/vignette is rasterised once per resize and blitted (`drawImage`) each frame,
and the slow-drifting nebulae are re-rasterised at most ~11×/s onto a cached
layer and blitted additively in between. No `ctx.filter` blur anywhere — the soft
look is gradients only. Measured at a 375px, 4× CPU-throttled profile: the
starfield holds 60fps and the constellation ~50fps (both 60fps unthrottled). All
of it honours `prefers-reduced-motion` (twinkle, parallax and nebula drift
disabled; one static frame) and reuses Phase 1's DPR handling.
