# Galaxy interaction rework: ring toggle + drag to reposition

**Status: PHASE 0 DIAGNOSIS. Not approved. No implementation exists.**

This document is the technical plan for two constellation interactions on the
web `/app` canvas:

1. A toggle to show/hide the orbital guide rings.
2. Click-and-hold a person-star to drag it; persist that seat in Supabase so
   the map is personal and survives devices.

Nothing in this plan has been built. Per `ENGINEERING.md` §10, the spec is
finalized *before* the build starts. **Stop after reading this.** Implementation
starts only after Carmen confirms the founder decisions in §6.

---

## 0. Recommendation (the one storage decision)

**Store free polar seats on `people.custom_position` (JSONB).** Not localStorage,
not snap-to-ring-only.

Why polar `{ angle, radius_pct }`, not `{ x, y }` pixels:

- Default seats are already polar. `GalaxySeatNorm` is `{ angle, rn }` with
  `rn` in `[0, 1]` of the canvas max radius (`packages/core/src/galaxy-seat.ts`).
- The canvas is a true circle (`radX === radY` in `ringGeom()`). Polar maps
  1:1 onto `galaxySeatXY`.
- Pixel `x/y` would break on resize (desktop vs 375px, share-image export).
- Drag feedback is a dashed circle at the current radius — that *is* polar.

`radius_pct` is the same space as `GalaxySeatNorm.rn` (0 = core, 1 = rim).

localStorage is the right home for the **rings toggle** (display pref). It is
the wrong home for **where a person lives**.

---

## 1. Phase 0 findings

### A. Render architecture

**The live constellation is not a component.** It is one `useEffect` inside
`apps/web/app/app/page.tsx` (`/* ─── canvas constellation ─── */`). Two stacked
`<canvas>` elements sit in `.constellation-live`:

| Layer | Ref | What it draws |
| :---- | :-- | :------------ |
| Atmosphere (DPR 1, under) | `atmCanvasRef` | Wash + generational nebulae, baked ~4×/s |
| Motion (DPR ≤ 2, on top) | `canvasRef` | Guide rings, synastry links, honor links, meteors, bodies, labels |

There is a **single** `paintFrame` / `draw` rAF loop on the motion canvas.
Rings are not a separate function. They are an inline block in `paintFrame`:

```ts
/* soft concentric guides — sketch Rings 1–4 at ringBandRadius */
for (const ring of GALAXY_GUIDE_RINGS) {  // [2, 3, 4, 5]
  const rn = ringBandRadius(ring) * (1 + breath);
  cx.ellipse(rcx, rcy, radX * rn, radY * rn, ...);
}
```

`GALAXY_GUIDE_RINGS` and `ringBandRadius` live in
`packages/core/src/galaxy-seat.ts`. Self (0) and partner (1) are **not**
guide rings; partner is a tight binary at the core. Passed / ancestor (6) is
the outer ancient band, also not a guide stroke.

**Do not hide** these when toggling rings — they are body decoration, not
orbital guides:

- Partner binary ellipse inside `drawBody` (`form === "binary"`)
- Ancient-light decorative ring around a passed star (`form === "ancient"`)
- Self core stroke
- Honor-constellation dashed links

#### How a person's canvas position is computed today

Nothing is stored. Seat is a pure function of `(id, own ring)`:

1. `ringIndex(is_self, relation, passed_at)` → semantic ring 0–6
   (`packages/core/src/galaxy-orbit.ts`).
2. `galaxySeatsResolved(inputs)` → `Map<id, GalaxySeatNorm>`
   - Angle = `galaxySeatAngle(id)` = hash of id (with same-ring collision
     separation of ~20°).
   - Radius `rn` = `ringBandRadius(ring)` + id-stable jitter, clamped so a
     seat cannot cross into a neighbouring band.
   - Self / ring 0 is hard-pinned at `{ nx: 0, ny: 0, angle: 0, rn: 0 }`.
3. `galaxySeatXY(seat, ringGeom())` → CSS pixels. `ringGeom()`:

   ```ts
   const rad = Math.max(70, Math.min(W() / 2 - 44, H() / 2 - 48));
   return { cx: W()/2, cy: H()/2, radX: rad, radY: rad }; // true circle
   ```

4. `basePos(i)` — edge-clamps along the ray so labels stay in frame.
5. `nodePos(i)` — adds **tangential** drift (along the ring, never radial)
   unless `prefers-reduced-motion` or `is_self`. Amplitude ~6px.

Hit-test, links, nebulae, honor edges, labels, and share-image export all
read `nodePos`. There is no second layout path.

Mobile home (`apps/mobile/app/(app)/home.tsx`) uses the **same**
`galaxySeatsResolved` + `galaxySeatXY` against a fixed 340×340 glance card
(`CONSTELLATION_GEOM`). It is React Native `View`/`Pressable`, not canvas.
Tap opens the person. There is no drag, no rings, no hover.

### B. Event handling

Listeners are **imperative `addEventListener` on the motion canvas**, set up
in the same `useEffect` as the draw loop. Not React `onPointerDown`.

| Event | Handler | Behaviour |
| :---- | :------ | :-------- |
| `pointermove` | `onMove` | `hitTest` → `setHoverPerson` + `cursor: pointer` |
| `click` | `onClick` | `hitTest` → `router.push(/app/person/${id})` |
| (none) | — | No `pointerdown` / `pointerup` / `pointercancel` / `pointerleave` |

**Hit-test already exists** (`hitTest` inside the effect):

```ts
function hitTest(mx: number, my: number): PersonRow | null {
  const positions = people.map((_, i) => nodePos(i));
  for (let i = 0; i < people.length; i++) {
    const hitR = usesMemorialGlyph(people[i]) ? 28 : 22;
    if (Math.hypot(mx - q.x, my - q.y) < hitR) return people[i];
  }
  return null;
}
```

Memorial glyphs get a larger hit radius. No z-order / "closest wins" —
**first person in `people` order whose circle contains the point wins.**
`people` is loaded `order("created_at", { ascending: true })`, so older
rows win overlaps. Fine today (seats are collision-separated); after free
drag, two stars can overlap. Phase 2 must hit-test **nearest** star within
radius, iterating reverse-draw-order (last drawn = on top) or min distance.

There is **no canvas context menu**. Right-click / long-press does nothing
beyond the existing click-to-open. Reset-position cannot hang off a menu
that does not exist.

Hover inspector is a React overlay (top-right, `pointerEvents: "none"`),
driven by `hoverPerson` state. Copy: "Click to open profile".

**Critical trap — `hoverPerson` is in the effect dependency array.** Every
hover tears down and rebuilds the entire canvas (listeners, rAF, closures).
Entrance is preserved via refs, so it does not replay — but **any drag
state declared inside the effect is destroyed on the next hover.** Drag
state, optimistic positions, and the rings-visibility flag the draw loop
reads **must live in component-level refs**, not effect-local variables.

### C. Data model

Person/connection rows are **`public.people`**. Owner column is **`owner_id`**,
not `user_id`. Relevant columns today:

| Column | Role |
| :----- | :--- |
| `id` | UUID PK |
| `owner_id` | Auth user who owns this star (RLS key) |
| `is_self` | Galactic core. Unique per owner |
| `relation` | Free text → `ringIndex` / form / colour |
| `passed_at` | Remembrance; forces ring 6 |
| `star_color` | Optional curated hex |
| `memorial_constellation` | Optional glyph id |
| `linked_user_id` / `chart_source` | Constellation-connect mirror |

There is **no** position, angle, layout, seat, or `custom_position` column
anywhere (people, relationships, profiles, charts). Layout is 100% derived.

`relationships` is honor-constellation edges only (`relation_type =
remembrance`). It is the wrong table.

Constellation-connect inserts list columns explicitly and will leave a new
nullable column at DEFAULT NULL. A connected person's star in *your* galaxy
is a row **you** own — `custom_position` is your map, not theirs. Two users
who have each other get independent seats. Correct.

Account export already `select("*")` from `people`, so the new column rides
along.

RLS (current, `supabase/migrations/20260913030100_wrap_auth_uid_in_rls_policies.sql`):

```sql
create policy "people owner all"
on public.people for all
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));
```

That policy already covers SELECT/INSERT/UPDATE/DELETE of **every column**
on owner-owned rows, including a column that does not exist yet. Postgres
has no column-level RLS here. A second policy "only update custom_position"
is unnecessary and would fight `FOR ALL`.

Client writes already belt-and-suspenders with `.eq("owner_id", userId)`
(see `edit-person-panel.tsx`). The prompt's `.eq("user_id", currentUserId)`
would match **zero rows** and silently fail to persist.

### D. Proposed migration

Correct table: **`public.people`**. Correct owner column: **`owner_id`**.

```sql
-- supabase/migrations/20260914140000_people_custom_position.sql
-- Galaxy drag-reposition: per-owner polar seat on a person star.
-- NULL = derived default from galaxySeatsResolved (id + ring).
-- Shape: { angle: number (radians, same convention as GalaxySeatNorm.angle),
--          radius_pct: number (0.05–1.0, same space as GalaxySeatNorm.rn) }

alter table public.people
  add column if not exists custom_position jsonb default null;

alter table public.people
  drop constraint if exists people_custom_position_shape;

alter table public.people
  add constraint people_custom_position_shape
  check (
    custom_position is null
    or (
      jsonb_typeof(custom_position->'angle') = 'number'
      and jsonb_typeof(custom_position->'radius_pct') = 'number'
      and (custom_position->>'radius_pct')::numeric >= 0.05
      and (custom_position->>'radius_pct')::numeric <= 1.0
    )
  );

comment on column public.people.custom_position is
  'Owner-chosen polar seat on the constellation. NULL = derived default (galaxySeatsResolved). Shape {angle: radians, radius_pct: 0.05–1.0 of ringGeom max radius}. Writable only via people owner all RLS (owner_id = auth.uid()). Never copied across constellation-connect mirrors.';
```

**RLS: no new policy.** `people owner all` already fails closed for
cross-user UPDATE. Phase 2 stop-gate is a synthetic probe (extend
`docs/rls-second-user-retest.sql`): as user B, `UPDATE people SET
custom_position = '{"angle":0,"radius_pct":0.5}' WHERE id = victim_person`
must affect 0 rows.

Timestamp `20260914140000` is after the latest committed migration
(`20260914130000_people_notes_messages_indexes_txn.sql`). Recheck
`supabase/migrations/` at implementation time if anything landed since.

Do **not** edit an applied migration (`ENGINEERING.md` §2).

---

## 2. What "rings" means for the toggle

**In scope:** the concentric `GALAXY_GUIDE_RINGS` strokes in `paintFrame`
(sketch Rings 1–4: children / parents+sibs / friends / colleagues).

**Out of scope (stay visible):** partner binary orbit, ancient-light halo
ring, self stroke, honor dashes, synastry beziers, nebulae, meteors.

**Legend strip** below the canvas still names the four rings and their
colours. Leave it. It is the colour key even with guides off; hiding it
would make rings-off + free-position a colourless sky.

Share-image export uses the same `paintFrame`. Default: **honor the current
toggle** (what you see is what you share). Confirm in §6.

---

## 3. Implementation traps (read before any code)

1. **`owner_id`, never `user_id`.** Persist with
   `.from("people").update({ custom_position }).eq("id", personId).eq("owner_id", ownerId)`.
2. **Do not `setPeople` on `pointermove`.** `people` is an effect dep;
   writing it every move rebuilds the canvas. Keep optimistic seats in a
   `Map<string, CustomGalaxyPosition>` **ref** that `basePos` / `nodePos`
   read first.
3. **Do not put drag state inside the canvas `useEffect`.** `hoverPerson` is
   already a dep. Component-level refs: `dragState`, `customPosOverrideRef`,
   `showRingsRef`.
4. **Do not put `showRings` in the effect deps.** Toggling would tear down
   the loop. React state drives the button; a ref feeds `paintFrame`.
5. **`click` still fires after a drag.** Either suppress the subsequent
   `click`, or drop the `click` listener and navigate from `pointerup` when
   the gesture was not a drag. Prefer the latter (touch-reliable).
6. **`setPointerCapture` + `touch-action: none`** on the motion canvas so
   a drag that leaves the canvas still receives `pointerup`, and mobile web
   does not scroll the page mid-drag.
7. **`console.log('[DRAG]', ...)` is verification-only.** `ENGINEERING.md`
   §7 forbids shipping `console.log`. Add during Phase 2C, grep-remove
   before merge.
8. **No new npm packages.** No new `useLocalStorage` hook — extend
   `apps/web/lib/ui-settings.ts` (`PREFIX = "galaxia.setting."`).
9. **Do not touch Vela, payments, or auth.**
10. **Do not restart the entrance sequence** when rings toggle or a star is
    dropped.

---

## 4. Phase 1 — ring toggle (after this document is confirmed)

Surface: web `/app` only. Mobile glance card has no guide rings to hide.

### 4.1 State

Extend `apps/web/lib/ui-settings.ts`:

```ts
export const SETTING_SHOW_RINGS = "showRings"; // stored "true" | "false"
```

In `/app` page:

```ts
const [showRings, setShowRings] = useState(true);
const showRingsRef = useRef(true);
// on mount: readUiSetting(SETTING_SHOW_RINGS) → default true
// on toggle: writeUiSetting + setShowRings + showRingsRef.current = next
```

Default **true** (rings on). Missing / corrupt localStorage → true.

### 4.2 Toggle UI

Overlay **inside** `.constellation-live` (the constellation wrapper),
bottom-left, `zIndex: 10`, only when `liveReady`. Grain overlay is
`pointer-events: none` / `zIndex: 1`; hover inspector is top-right
`zIndex: 2`. Bottom-left is free.

Markup (founder-review copy):

```tsx
<button
  type="button"
  aria-pressed={showRings}
  aria-label={showRings ? "Hide orbital rings" : "Show orbital rings"}
  onClick={() => {
    const next = !showRings;
    setShowRings(next);
    showRingsRef.current = next;
    writeUiSetting(SETTING_SHOW_RINGS, next ? "true" : "false");
  }}
  style={{
    position: "absolute",
    bottom: 12,
    left: 12,
    zIndex: 10,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    color: showRings ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
    fontSize: 12,
    fontFamily: "inherit",
    backdropFilter: "blur(4px)",
    transition: "color 0.2s",
  }}
>
  RINGS
</button>
```

`{/* FOUNDER-REVIEW: rings toggle label */}` on the visible `RINGS` text
and both aria-labels.

### 4.3 Draw loop

In `paintFrame`, wrap the existing `GALAXY_GUIDE_RINGS` block:

```ts
if (showRingsRef.current) {
  // existing guide-ring strokes unchanged
}
```

No other draw calls change. Person positions, colours, nebulae, links stay.

### 4.4 Phase 1 verification

- Toggle hides/shows the four concentric guides; stars stay put.
- Reload restores the last choice.
- Reduced-motion still draws one static frame (guides present or absent
  per pref, no breath).
- Share-image export matches the on-screen rings state (if §6 agrees).
- Hover-preview and click-to-open unchanged.
- 375px viewport: button does not collide with labels (bottom-left pad is
  already 26px; button ~32px tall at `bottom: 12`). Spot-check a
  bottom-left seat (hash-lucky). If a label sits under the button, nudge
  `LABEL_PAD_BOTTOM` or the button's `bottom` — do not clip names.

No migration in Phase 1.

---

## 5. Phase 2 — drag to reposition (after Phase 1 verified)

### 5.1 Shared helper (`packages/core`, so mobile can read the same seats)

Add to `packages/core/src/galaxy-seat.ts` (already re-exported from
`packages/core/src/index.ts`):

```ts
export type CustomGalaxyPosition = {
  /** Radians. 0 = +x (canvas right), same convention as GalaxySeatNorm.angle. */
  angle: number;
  /** 0.05–1.0 of ringGeom max radius. Same space as GalaxySeatNorm.rn. */
  radius_pct: number;
};

export const CUSTOM_RADIUS_MIN = 0.05;
export const CUSTOM_RADIUS_MAX = 1.0;

export function parseCustomPosition(raw: unknown): CustomGalaxyPosition | null;
export function clampCustomPosition(pos: CustomGalaxyPosition): CustomGalaxyPosition;
export function customPositionToSeat(pos: CustomGalaxyPosition): GalaxySeatNorm;
export function pointerToCustomPosition(
  px: number, py: number, geom: { cx: number; cy: number; radX: number },
): CustomGalaxyPosition;
```

`customPositionToSeat` is `{ nx: rn*cos(a), ny: rn*sin(a), angle: a, rn }`.
Callers then go through existing `galaxySeatXY` + `basePos` clamp.

Default path unchanged: `galaxySeatsResolved` still runs for everyone
(so collision clusters among *unmoved* people stay stable). Overlay:

```
overrideRef.get(id) ?? parseCustomPosition(person.custom_position) ?? defaultSeat
```

A dragged person is **not** removed from `galaxySeatsResolved`. Other
people in their old collision cluster keep their resolved seats (learnable
map: moving one person must not reshuffle the rest).

**Self is not draggable.** `galaxySeatsResolved` pins `is_self` at the
core. The galactic core is the visual anchor. `hitTest` for drag ignores
`is_self`. Confirm in §6.

### 5.2 Web canvas position resolution

Replace the `galaxySeatXY(seat, geom)` call inside `basePos` with the
effective seat. Label anchors that today read `seatsById.get(id).angle`
must use the **effective** angle so names stay radially outward from the
new seat.

**Drift:** freeze tangential drift for any star with a custom / override
position. Otherwise the stored seat and the visible seat disagree by up to
~6px, and hit-testing a still cursor feels like the star is swimming off
the user's placement. Reduced-motion already freezes everyone.

While dragging that star: skip its drift (already frozen), scale the body
1.3×, add a soft glow ring, draw a dashed circle at
`radius_pct * geom.radX` centred on `ringGeom` (the orbit they would land
on). That dashed circle is the rings-off orientation cue.

### 5.3 Drag interaction

Component-level ref:

```ts
const dragState = useRef<{
  personId: string;
  pointerId: number;
  holdTimer: ReturnType<typeof setTimeout> | null;
  isDragging: boolean;
  startX: number;
  startY: number;
  originAngle: number;
  originRadius: number;
} | null>(null);
```

Wire `pointerdown` / `pointermove` / `pointerup` / `pointercancel` on the
motion canvas (same `addEventListener` pattern). Keep hover `pointermove`.
Remove the `click` listener; open-profile happens on `pointerup`.

**Gesture:**

| Gesture | Result |
| :------ | :----- |
| Pointer down on a non-self star, up before 180ms, movement < 8px | Navigate to `/app/person/:id` (today's click-to-open) |
| Movement ≥ 8px before 180ms | Start drag immediately (don't wait out the hold) |
| Held ≥ 180ms | Start drag; cursor `grabbing`; do not navigate on up |
| Drag `pointermove` | Polar from pointer vs centre; clamp radius; write **ref only**; next rAF picks it up |
| `pointerup` / `pointercancel` after a drag | One Supabase UPDATE; merge into `people` state **once**; clear ref |
| `pointerup` after a drag that never left epsilon of origin | No write, no navigate |
| Pointer down on empty sky / self | No drag, no navigate |

Temporary `console.log("[DRAG]", "drag started")` / `"commit"` / `"cancel"`
for DevTools. Remove before merge.

**Writes:** only on pointerup, once. Never in pointermove. No N+1.

**Hover during drag:** do not `setHoverPerson` on every move (that rebuilds
the effect). While `dragState.current?.isDragging`, skip the hover setter
or keep the dragged person as hover without setState if it is already that
person.

### 5.4 Reset position

There is no canvas context menu. Put **Reset position** on
`EditPersonPanel` (`apps/web/components/edit-person-panel.tsx`), visible
only when `person.custom_position != null` and `!person.is_self`.

```ts
await supabase
  .from("people")
  .update({ custom_position: null })
  .eq("id", person.id)
  .eq("owner_id", userId);
```

Copy (founder-review): "Reset position" / "Back on their ring." After
save, `/app` reload (or a focus refetch) snaps them to
`galaxySeatsResolved`.

Also load `custom_position` in `loadHome`'s people select and on the
person page select so the button can hide when null.

### 5.5 Mobile (primary client) — read in Phase 2, do not drag yet

`apps/mobile/app/(app)/home.tsx` must **select and apply**
`custom_position` through the same helper. Otherwise a user who arranges
their sky on web opens the Expo app and sees the old derived map — the
feature's whole point is a personalized map that survives devices.

Native drag on the glance card is a follow-up (RN `PanResponder` /
gesture-handler, no canvas). Out of scope here. Confirm in §6.

### 5.6 Phase 2 stop-gates (before merge)

- Desktop mouse: hold-drag repositions; tap still opens the profile.
- Mobile web touch (375px): same, no accidental navigation, no page-scroll
  during drag (`touch-action: none` while dragging).
- Positions survive reload and a second browser profile/session (Supabase,
  not localStorage).
- Rings-off + free position: star sits where it was dropped; dashed orbit
  only while dragging.
- Rings-off still uses relation/element colours (toggle must not touch
  `resolveNodeColor` / `formFromRelation`).
- One UPDATE on pointerup; zero writes during move (Network panel).
- Cross-user UPDATE of `custom_position` affects 0 rows (RLS probe).
- Self cannot be dragged; reset is absent on the self edit panel.
- Share image includes custom seats (same `paintFrame`).
- `pnpm --filter @galaxia/core test` covers parse/clamp/pointer helpers.
- No `console.log`, no `__demo` / `TEMP-DEMO` (`ENGINEERING.md` §7).
- `changelog.d/cursor-galaxy-interaction-rework-plan-f2da.md` updated for
  the implementation branch (this diagnosis fragment stays on the plan
  branch; implementation uses its own fragment).
- **FOUNDER-REVIEW required before merge.**

---

## 6. Founder decisions (must confirm before code)

Reply to each. Recommended default in **bold**.

1. **Storage.** JSONB polar on `people.custom_position` vs localStorage vs
   snap-to-ring (angle only)?
   **JSONB polar `{ angle, radius_pct }`.**
2. **Can the self star be dragged off the core?**
   **No. Core stays pinned.**
3. **Hold-still 180ms then release with no movement:** navigate, no-op, or
   commit a write?
   **No navigate, no write.** Movement ≥ 8px **or** hold ≥ 180ms starts a
   drag; commit only if polar delta exceeds epsilon.
4. **Tangential drift on custom-placed stars?**
   **Freeze.** Placement should stay where they put it.
5. **Mobile Phase 2:** read custom seats on the Expo glance card (no native
   drag), or web-only until a later drag-on-mobile phase?
   **Read on mobile now.** Otherwise "survives devices" is a lie for the
   primary client.
6. **Share-image export:** honor the rings toggle, or always draw rings?
   **Honor the toggle.**
7. **Reset control:** Edit person panel only, or also a control on the
   hover inspector?
   **Edit person panel only** for v1 (inspector is `pointer-events: none`
   and click-to-open is the existing contract).
8. **RINGS button label** — keep the word `RINGS`, or an icon-only control?
   **Keep `RINGS`** (prompt spec); founder may rewrite.

---

## 7. Files Phase 1 / Phase 2 will touch (when approved)

Phase 1:

- `apps/web/lib/ui-settings.ts`
- `apps/web/app/app/page.tsx` (toggle button + `showRingsRef` in `paintFrame`)
- `changelog.d/<impl-branch>.md`

Phase 2:

- `supabase/migrations/20260914140000_people_custom_position.sql` (timestamp
  rechecked at impl time)
- `docs/rls-second-user-retest.sql` (cross-user UPDATE probe)
- `packages/core/src/galaxy-seat.ts` + `packages/core/test/galaxy-seat.test.ts`
- `apps/web/app/app/page.tsx` (load, `basePos`, pointer machine, drag paint)
- `apps/web/components/edit-person-panel.tsx` (reset)
- `apps/web/app/app/person/[id]/page.tsx` (select `custom_position`)
- `apps/mobile/app/(app)/home.tsx` (select + apply)
- `changelog.d/<impl-branch>.md`

Explicitly **not** touched: Vela, RevenueCat/Stripe, auth, `.npmrc`,
`next.config.mjs`, applied migrations, `CHANGELOG.md` (fragment only).

---

## 8. Test plan (implementation, not this diagnosis)

Automated:

- `@galaxia/core` Vitest: `parseCustomPosition` rejects junk / missing keys;
  clamp 0.05–1.0; `pointerToCustomPosition` at centre+x maps angle ~0 and
  `radius_pct` from distance/`radX`; `customPositionToSeat` round-trips
  through `galaxySeatXY`; default path (null) equals `galaxySeatsResolved`.
- Source wiring test (same style as `canvas-a11y-wiring.test.ts`): `/app`
  page contains the rings button `aria-label` and `showRingsRef` guard
  around `GALAXY_GUIDE_RINGS`.
- Do not add Playwright against `/app` in CI — middleware redirects to
  `/login` without Supabase (`AGENTS.md`). Manual / cloud-agent browser
  checks use a **temporary** demo hook and must grep it out before commit.

Manual / cloud VM (web, after impl):

- `/app` with demo seed: toggle rings, reload, confirm localStorage.
- Drag a non-self star, release, reload (against real Supabase when env
  exists; otherwise assert the UPDATE payload in a mocked client).
- Tap vs hold: tap opens profile; hold does not.
- Rings off + drag: dashed orbit only while dragging.
- 375px, CPU throttle: drag still ~50–60fps (existing galaxy bar).
- `prefers-reduced-motion`: no drift, drag still works, rings toggle still
  paints one static frame.

Mobile: `pnpm --filter @galaxia/mobile typecheck` + confirm
`custom_position` is in the select and `constellationPositions` uses the
helper. Native drag is not in this slice.

---

## 9. Out of scope

- Snap-back animation after reset (instant snap is enough).
- Multi-select / box-select.
- Dragging honor/synastry links independently.
- Persisting the rings toggle in `profiles` (localStorage is enough).
- Changing `ringIndex` / relation when a star is dropped onto another band
  (position is visual only; relation still drives colour and form).
- Native Expo pan-to-reposition.
- Vela, billing, auth.

---

## 10. Why this is not three competing versions of the same screen

Default seats stay the learnable map (`ENGINEERING.md` / galaxy-seat
contract: same data → same seats). `custom_position` is an **opt-in
overlay**, nullable, reversible. Rings-off is a paint flag. Neither
rewrites `ringIndex`, nebulae, or the body forms. The canvas stays one
draw loop in `/app`.
