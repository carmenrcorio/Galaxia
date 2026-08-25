import type { PillVariant } from "../../lib/admin/status-pill";

/**
 * Renders a `PillInfo` (see `lib/admin/status-pill.ts`) as a colored pill.
 * No hooks, no client-only behavior, so it renders fine inside a server
 * component (the admin user list and detail page are both server
 * components) without a "use client" directive.
 */
export function StatusPill({ label, variant }: { label: string; variant: PillVariant }) {
  return <span className={`pill-status pill-status--${variant}`}>{label}</span>;
}
