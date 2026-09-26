/**
 * Design utilities
 * Glyph maps live in `@galaxia/core` (SIGN / PLANET / ASPGLY from
 * design/reference/galaxia.jsx). Person chip color lives in
 * `personChipColor` — do not hash a name into `.av-*` classes here.
 */

export { ASPECT_GLYPH, BODY_GLYPH, SIGN_GLYPH, signElement } from "@galaxia/core";

/* Aspect one-liners — from galaxia.jsx ASPLINE */
export const ASPECT_LINE: Record<string, string> = {
  conjunction:  "fused: one charged focus",
  sextile:      "easy, supportive talent",
  square:       "inner friction that drives growth",
  trine:        "natural, effortless gift",
  opposition:   "a balancing act, pulled two ways",
  quincunx:     "a persistent mismatch that will not resolve by force",
};

/**
 * Qualitative label for a synastry score.
 * Bands are deliberately wide to avoid false precision, but distinct enough
 * that genuinely different scores (e.g. 30 vs 55) produce different words.
 *
 * Distribution: ≥76 Effortless, ≥65 Easy & warm, ≥54 Workable, ≥43 Tender,
 * ≥32 Some friction, <32 Charged
 */
export function compatWord(score: number): { word: string; cls: string } {
  if (score >= 76) return { word: "Effortless",     cls: "compat-high" };
  if (score >= 65) return { word: "Easy & warm",    cls: "compat-high" };
  if (score >= 54) return { word: "Workable",        cls: "compat-mid"  };
  if (score >= 43) return { word: "Tender",          cls: "compat-mid"  };
  if (score >= 32) return { word: "Some friction",   cls: "compat-low"  };
  return              { word: "Charged",          cls: "compat-low"  };
}

/* Dimension display labels — from galaxia.jsx DIM_LABEL */
export const COMPAT_LABELS: Record<string, string> = {
  overall:       "Overall",
  emotional:     "Emotional ease",
  communication: "Communication",
  warmth:        "Warmth",
  values:        "Shared values",
  stability:     "Stability",
};

/**
 * Literal hex values for the `:root` custom properties in globals.css —
 * copied here (not read from the DOM) so a raster capture of an <svg>
 * subtree still resolves real colours. html-to-image bakes computed style
 * onto plain DOM elements before serializing, but it clones an <svg> root
 * with a native `cloneNode(true)` and never re-visits its descendants, so a
 * `fill="var(--x)"` presentation attribute inside a captured wheel has no
 * `:root` definition in the exported document and paints as the SVG
 * initial value (black), not the intended element colour. `designColor` is
 * the one-line swap for any SVG colour that needs to survive that capture.
 * Every value here must stay in lockstep with globals.css `:root` — see
 * `lib/design.test.ts` for the drift guard. Not used outside SVG capture:
 * regular DOM elements keep plain `var(--x)`, which the same capture path
 * resolves correctly already.
 */
export const EXPORT_COLOR_LITERALS: Record<string, string> = {
  gold:        "#E6AE6C",
  "gold-bright": "#f0c089",
  "gold-soft": "#caa06f",
  rose:        "#DA8C8C",
  teal:        "#6FB1B8",
  mist:        "#b9aede",
  mist2:       "#8076a6",
  cream:       "#F4ECDB",
  fire:        "#E0825C",
  earth:       "#cdbd7a",
  air:         "#B79AD8",
  water:       "#6FB1B8",
};

/**
 * Resolve a `--x` custom-property name to `var(--x)` (live UI, unchanged) or
 * its literal hex (raster export of an SVG subtree — see EXPORT_COLOR_LITERALS).
 */
export function designColor(name: string, exportSafe: boolean): string {
  if (!exportSafe) return `var(--${name})`;
  return EXPORT_COLOR_LITERALS[name] ?? `var(--${name})`;
}

