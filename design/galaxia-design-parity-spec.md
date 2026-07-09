# Galaxia — Design Parity Fix (Cursor Spec)

## 0. Read this first

Three independent design audits were run on the signed-in app. I verified every claim against the actual code in `apps/web`. This spec contains ONLY what was verified. Do not act on anything outside it.

**Already fixed. Do not touch, do not "re-fix":**
- The `(debug)` upgrade label, the `Connected to shared Supabase account` string, the raw session UUID, `monospace` fonts, and the black/Arial text bug are all gone from `main` (verified: zero matches). The audits were run against an older deploy.
- `.card-title` and `.page-title` already use Fraunces correctly. The "headings fall back to Inter" claim is false.

**Do not modify:** `apps/web/app/page.tsx` (the marketing landing is correct and is the reference), `next.config.mjs` core config, the root `.npmrc`, or the Vercel project settings.

**The verified problem, in one line:** `box-shadow` appears **zero times** in `apps/web/app/globals.css`, `.glass-card` uses a quarter of the landing's blur with an opaque border and no shadow, and there is **no starfield or atmosphere anywhere in the app shell**. That is why the app reads as flat boxes on a page while the landing reads as glass floating in space.

---

## 1. The card recipe (highest leverage change in the product)

Current, in `globals.css`:
```css
.glass-card {
  border: 1px solid var(--line);   /* opaque violet */
  border-radius: 16px;
  background: linear-gradient(160deg, rgba(44,33,82,.55), rgba(23,17,48,.93));
  backdrop-filter: blur(8px);
  padding: 18px;
  /* no shadow at all */
}
```

Replace with the landing's exact recipe:
```css
.glass-card {
  background: linear-gradient(165deg, rgba(255,255,255,.045), rgba(255,255,255,.012));
  backdrop-filter: blur(22px) saturate(1.15);
  -webkit-backdrop-filter: blur(22px) saturate(1.15);
  border: 1px solid rgba(230,174,108,.13);   /* translucent gold hairline */
  border-radius: 22px;
  padding: 24px;
  box-shadow:
    0 30px 80px -34px rgba(0,0,0,.7),        /* the float */
    inset 0 1px 0 rgba(255,255,255,.06);     /* light catching the top edge */
}
```
The two-layer shadow is not optional. The drop shadow creates depth; the inset highlight is what makes it read as glass rather than a tinted rectangle. This single class change touches every screen at once.

---

## 2. Atmosphere in the app shell (verified absent)

The landing has a fixed starfield canvas, a layered radial aura, grain, and a vignette. The signed-in app has none. Add them to `apps/web/app/app/layout.tsx` (and the `/welcome` and `/account` shells) as a reusable `<CosmicBackground />` client component, rendered behind all content at `z-index:0` with content at `z-index:2`.

It must include:

```css
/* the aura, fixed, pointer-events:none, z-index:0 */
background:
  radial-gradient(120% 80% at 78% -5%, rgba(110,177,184,.10), transparent 55%),
  radial-gradient(90% 70% at 12% 8%, rgba(183,154,216,.12), transparent 50%),
  radial-gradient(120% 100% at 50% 120%, rgba(230,174,108,.08), transparent 60%),
  linear-gradient(180deg,#0a0717 0%, #0c0820 40%, #0a0717 100%);
```

Plus:
- A canvas starfield: ~1 star per 9000px², radius 0.2-1.3px, each slowly twinkling, drifting subtly on scroll. Reuse the implementation from `app/page.tsx`.
- A vignette: `box-shadow: inset 0 0 240px 60px rgba(5,3,12,.9)` on a fixed overlay.
- All motion gated behind `prefers-reduced-motion` (render one static frame instead).

Tokens (align `globals.css` `:root` to these; the landing is the source of truth):
```css
--ink:#0a0717; --ink1:#0f0b22; --ink2:#16102e; --ink3:#1d1640;
--gold:#E6AE6C; --gold-bright:#f0c089; --rose:#DA8C8C; --teal:#6FB1B8;
--mist:#b9aede; --mist2:#8076a6; --cream:#F4ECDB;
--fire:#E0825C; --earth:#cdbd7a; --air:#B79AD8; --water:#6FB1B8;
```

---

## 3. Shared components to extract (build once, use everywhere)

**Primary button (pill):**
```css
border-radius:100px; border:none; padding:14px 26px;
background:linear-gradient(180deg,var(--gold-bright),var(--gold));
color:#1a1206; font-weight:600;
box-shadow:0 8px 26px -8px rgba(230,174,108,.55);
transition:transform .2s, box-shadow .2s;
/* hover: translateY(-2px), stronger glow */
```
**Secondary / nav pill:** transparent fill, `1px solid rgba(183,154,216,.22)`, cream text, `backdrop-filter: blur(10px)`. Never fully opaque.

**Eyebrow label:** `font-size:.7rem; font-weight:600; letter-spacing:.28em; text-transform:uppercase; color:var(--gold);` with a short gradient rule before it. Use above every section title.

**Chip** (used for Big Three, sign chips): `background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:12px; padding:10px 8px;` stacked glyph / label-caps / value.

**Teal callout** (fault lines, key insights): `background:linear-gradient(120deg, rgba(111,177,184,.1), rgba(111,177,184,.02)); border:1px solid rgba(111,177,184,.22); border-radius:16px; padding:20px 22px;`

**Custom checkbox/radio:** rounded square, gold check, violet fill. The native browser checkbox on `/welcome` ("This person is a minor") is the first broken control a new user touches. Replace it.

**Layout:** centered content column, `max-width: 860px`. Body copy constrained to `max-width: 65ch`. No content stretching edge to edge, no dead half-rows.

---

## 4. Per-screen fixes (verified design failures)

### `/app` — the constellation home. This is the moat.
All three audits independently concluded: the constellation and the generational layer are the only features no competitor has, and they are currently the least designed things in the product. Reverse that.

- The graph currently occupies ~55% of its container with the rest dead. **Let it fill the full container width**, and give it real vertical presence.
- Nodes: flat filled circles today. Give each a **radial glow halo** in its own hue (a `createRadialGradient` from the node color out to transparent, ~5x the core radius), a bright white inner highlight, and a gentle pulse.
- Links: replace straight lines with **quadratic bezier curves** stroked with a gradient that fades between the two nodes' colors at ~0.2-0.3 alpha. Add a slow light pulse travelling along each link.
- Add hover state (node brightens, name lights up), click to open `/app/person/[id]`, and a small legend.
- The whole graph should drift gently, as on the landing. Reduced-motion safe.
- **Delete the duplicate bottom nav row** (the repeated "Onboarding · My profile · Compare · Groups · Vela · Settings · Account" strip).

### `/app/person/[id]` — currently reads as a database table
- Placements render as `SUN Cancer 29.8°`. Replace with the landing's 3-up **Big Three glyph chips** (glyph, label-caps, value), then a placement list with the proper glyph (♄ Saturn in Pisces), the sign, degree as `16°48'`, and a one-line plain-language gloss beneath. Element-tint the glyphs (fire/earth/air/water).
- Aspects render as a flat list where a 0.3° exact aspect looks identical to a 7.8° loose one. **Sort by orb** and give tight aspects (<2°) a gold left-border accent; demote loose ones. Raw decimal degrees behind a "show precise degrees" toggle.

### `/app/compare` — the biggest gap between promise and product
- Currently prints `Overall 52 · emotional 55 · communication 55 · warmth 39`. The landing explicitly promises *"Not a dating-app score. A real map."* The app ships something more score-y than the marketing.
- Replace the numeric line with the landing's **labeled qualitative outcomes**: a label-caps row name, and a value word (Effortless / Easy & warm / Workable / Tender / Charged) coloured by band (teal for warm, gold for neutral, rose for friction), with a thin coloured underline bar sized to the percentage. Raw numbers move to a detail disclosure.
- **Ship the missing "What [name] needs from you" callout.** The landing shows it; the app doesn't have it at all. It is the actionable payoff of the entire feature. Render it as the tip block: italic body, gold lead-in.

### `/app/groups` — the generational layer
- Rebuild the "shared sky" as the landing's **planet-glyph list** (♅ Uranus in Aquarius — "The reformers, wired to question the rules").
- Put members in an **overlapping avatar cluster** (`margin-left:-10px`, 2px ink border on each).
- Isolate the divergence as a **teal fault-line callout** using the token above. It is currently an undifferentiated paragraph.

### `/app/vela`
- The user bubble is a full-bleed gold bar. **Cap bubble width at ~85%**, align user right / Vela left.
- Add the small caps gold **"VELA"** sender label above her bubble (landing does this; app doesn't).
- Bubble styles: user `rgba(230,174,108,.12)` fill + `rgba(230,174,108,.2)` border; Vela `rgba(183,154,216,.09)` fill + `rgba(183,154,216,.18)` border. Radius 14px, padding 12px 15px.
- Break long replies into paragraphs, with a visual break before any actionable "try this" line.
- Style the typing indicator as three low-emphasis animated dots, not a solid pill that looks clickable.
- Float the input as a **pill-shaped frosted field** above the bottom edge. Custom scrollbar (6px, gold thumb).

### `/account`
- **Restore the shared nav header.** It is the only screen that drops it.
- Content occupies the top third and then the page ends with 300px+ of empty gradient. Either constrain to a centered, vertically balanced card, or earn the space with real content (plan details, data export, linked devices).

### `/welcome`
- Closest to on-brand already. Apply the new card recipe and shadow, swap the native checkbox for the custom component, and remove the backtick-wrapped route name leaking into user-facing copy.

---

## 5. Motion and feedback
- Card entrance: fade + 8px rise as data loads.
- Skeleton cards on dashboard and profile loads.
- Every network action (save person, run comparison, build overlay, send message) gets a button-level spinner and disabled state.
- All motion behind `prefers-reduced-motion`.

---

## 6. Order of work

1. The card recipe + tokens + shadow (Section 1). One class, whole app improves.
2. `<CosmicBackground />` in the app shell (Section 2).
3. Shared components: buttons, nav pills, eyebrow, chips, custom checkbox, layout widths (Section 3).
4. `/app` constellation glow-up + delete duplicate nav (the moat).
5. `/app/compare` labeled outcomes + the missing "What X needs from you" callout.
6. `/app/person/[id]` glyph chips + orb-weighted aspects.
7. `/app/groups` glyph list + avatar cluster + fault-line callout.
8. `/app/vela` bubbles, label, input, typing indicator.
9. `/account` nav + composition. `/welcome` polish.
10. Motion, skeletons, spinners.

Steps 1-3 are shared infrastructure and will visibly transform every screen before any per-screen work begins. Do them first and show me the result.

## 7. Acceptance
- Side by side, `/app/person/[id]` and the marketing landing look like the same designer made them.
- No screen renders a card without the shadow + gold hairline + 22px radius.
- Every signed-in screen sits on the starfield/aura, not flat indigo.
- The constellation graph fills its container, glows, curves, and responds to hover.
- `/app/compare` shows a map with an actionable callout, not a numeric score line.
- No dead void below content on a 1440px screen. No duplicate nav. Nav present on every screen.
