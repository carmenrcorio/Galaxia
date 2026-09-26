/**
 * Natal retrograde indicator. Renders only when `Placement.retro` is true.
 * FOUNDER-REVIEW: "Rx" label and its position (corner of the glyph, or
 * inline after the sign).
 */

import { RETROGRADE_BADGE_ARIA_LABEL, RETROGRADE_BADGE_LABEL } from "@galaxia/core";

export function RetrogradeBadge({
  retro,
  corner = false
}: {
  retro: boolean;
  /** Sit at the top-right of a relatively positioned planet glyph. */
  corner?: boolean;
}) {
  if (!retro) return null;
  return (
    <span
      className={`retrograde-badge${corner ? " retrograde-badge--corner" : ""}`}
      aria-label={RETROGRADE_BADGE_ARIA_LABEL}
    >
      {RETROGRADE_BADGE_LABEL}
    </span>
  );
}
