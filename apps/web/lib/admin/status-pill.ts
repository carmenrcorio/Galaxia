/**
 * Pure status/comp -> pill mapping shared by the admin user list
 * (`/admin/users`) and the admin user detail page (`/admin/users/[id]`), so
 * the two surfaces can never drift on what counts as "good standing" vs
 * "trouble". No DB, no React — directly unit-testable.
 *
 * Colors reuse the existing design tokens (`--teal`/`--gold`/`--rose`/
 * `--mist`), never a new palette: success = teal (the app's one existing
 * "good" color, see `.success` in globals.css), warning = gold (the app's
 * one existing "attention, not alarm" color, see `.eyebrow`/trial-banner
 * copy), danger = rose (the app's one existing `.error` color), muted =
 * mist (the app's one existing de-emphasized color, see `.muted`).
 */

export type PillVariant = "success" | "warning" | "danger" | "muted" | "accent";

export interface PillInfo {
  label: string;
  variant: PillVariant;
}

/**
 * Maps `profiles.subscription_status` to a pill. `active`/`lifetime` read
 * as success (paid, in good standing); `trialing` reads as warning
 * (time-boxed, not yet committed to a plan); `canceled`/`past_due` read as
 * danger (billing lapsed or ended). Anything else (null, an unrecognized
 * future value) reads as muted rather than guessing at a color.
 */
export function statusPillInfo(status: string | null | undefined): PillInfo {
  switch (status) {
    case "active":
      return { label: "Active", variant: "success" };
    case "lifetime":
      return { label: "Lifetime", variant: "success" };
    case "trialing":
      return { label: "Trialing", variant: "warning" };
    case "canceled":
      return { label: "Canceled", variant: "danger" };
    case "past_due":
      return { label: "Past due", variant: "danger" };
    default:
      return { label: status ?? "Unknown", variant: "muted" };
  }
}

/** Maps `profiles.comped` to a pill: comped reads as accent (gold), not-comped as muted text. */
export function compPillInfo(comped: boolean): PillInfo {
  return comped ? { label: "Yes", variant: "accent" } : { label: "No", variant: "muted" };
}
