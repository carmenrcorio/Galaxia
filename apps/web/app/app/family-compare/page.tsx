import { redirect } from "next/navigation";

/**
 * /app/family-compare retired as a standalone tab — its chart-comparison
 * grid now lives inside the Groups dashboard (any group kind, not just
 * family; see components/groups/chart-grid-section.tsx), instead of a
 * second, always-family-flavored tab next to Groups. Kept as a redirect so
 * old links/bookmarks/nav caches land somewhere real instead of 404ing.
 */
export default function FamilyComparePage() {
  redirect("/app/groups");
}
