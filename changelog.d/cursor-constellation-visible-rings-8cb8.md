## Visible concentric rings + P1 ring remap (branch `cursor/constellation-visible-rings-8cb8`) — 2026-07-24

**Trigger**: Founder sketch for the constellation redesign — concentric rings as
visible structure, partner as a tight binary at the core, grandchildren no
longer misfiled as ancestors via a `*grand*` substring match. Follow-up: rings
read badly (bunched ellipse, overlapping core labels).

`[CHANGED]` **One allowed seat remap after #91.** Semantic rings are now:
0 self · 1 partner (binary at core) · 2 children (+ grandchildren) ·
3 parents / siblings / grandparents · 4 friends / relatives / unknown ·
5 colleagues / outer tracked · 6 passed + `ancestor` tag (ancient band until P3).

`[CHANGED]` **Occupied-ring radius spread** (`ringNormsOccupied`). Empty rings
reserve no space; occupied non-partner bands are evenly distributed from
`GALAXY_OCCUPIED_INNER` to the rim. Guides draw only for occupied sketch rings.
Angle stays `f(id)`. Same data → same seats; adding onto an already-occupied
ring moves only that person/cluster; opening a new ring redistributes radii
(the allowed spread shift).

`[CHANGED]` **Partner binary clearance.** Partner radius raised to `0.46` so
Carmen/Hubs stay ~60px apart at 375px; companion draws on the outward side of
the seat; self label below / partner label above.

`[ADDED]` **Deterministic label offsets** (`galaxyLabelOffsets`) for neighbouring
name anchors — same input, same push-apart. Edge clamp/flip from #91 kept.

`[CHANGED]` **Near-square constellation card** (`aspect-ratio: 1 / 1.12`,
`minHeight: 380`, `maxHeight: min(72vh, 680px)`) with eccentricity-capped
geometry so rings read as rings, not a flat desktop band.

### Aspect-ratio cost (report)

| Surface | Before (minH 440, wide ellipse) | After (1:1.12, max 680) |
|---|---|---|
| Phone ~341px content | ~440px tall, flat-feeling bands | ~382px tall (+near-square); mild vertical room without a tall sausage |
| Desktop ~900–1100px wide | ~440px tall → radX≫radY, rings look like a belt | Height grows with width until **680px cap** (~+240px scroll vs old 440); beyond that, side letterboxing keeps rings near-circular |

Uncapped 1:1 on a full-bleed desktop row would be ~900–1100px tall — rejected.
The 680 / 72vh cap is the cost ceiling.

`[FIXED]` **Whole-value relation resolution** (`resolveGalaxyRelation`). No
substring matches on `grand` / `mom` / `dad`. Unknown free-text → ring 4 with
`known: false`. No DB enum.

`[ADDED]` **Shared picker options** `GALAXY_RELATION_PICKER_OPTIONS` — wired into
web welcome, save-to-galaxy, quick-check, and mobile onboarding. FOUNDER-REVIEW
on labels. `pet` intentionally omitted.

`[DECISION]` **Web `/app` constellation card only for guides.** Today in Your
Sky / Resume untouched.

`[TESTED]` **375px · DPR-2** follow-up screenshot with Carmen/Hubs demo seed
(removed before commit): partner cores ~62px apart; 4 occupied guide rings
sampled; card aspect ~1.12.
