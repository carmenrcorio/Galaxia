/**
 * Account data export + delete helpers (pure / shared).
 * API routes own auth and I/O; this module owns field allowlists and copy gates.
 */

export const DELETE_CONFIRMATION_WORD = "delete";

/** Profile columns safe to include in a user export. No Stripe / internal billing ids. */
export const EXPORT_PROFILE_FIELDS = [
  "id",
  "display_name",
  "created_at",
  "house_system",
  "subscription_status",
  "trial_ends_at",
  "plan",
  "current_period_end",
  "cancel_at_period_end"
] as const;

export type ExportProfileField = (typeof EXPORT_PROFILE_FIELDS)[number];

/** Statuses that should show the cancel-first billing warning (warn only, never gate). */
export function shouldWarnBillingOnDelete(status: string | null | undefined): boolean {
  return status === "active" || status === "past_due" || status === "lifetime";
}

export function isDeleteConfirmation(value: string | null | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === DELETE_CONFIRMATION_WORD;
}

export interface AccountExportPayload {
  exported_at: string;
  account_email: string | null;
  profile: Record<string, unknown> | null;
  people: Record<string, unknown>[];
  charts: Record<string, unknown>[];
  relationships: Record<string, unknown>[];
  groups: Record<string, unknown>[];
  group_members: Record<string, unknown>[];
  synastry: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  threads: Record<string, unknown>[];
  messages: Record<string, unknown>[];
}

// FOUNDER-REVIEW: authored - delete confirmation / irreversibility (account deletion, not trial end).
export const ACCOUNT_DELETE_COPY = {
  title: "Delete your account",
  lead:
    "This permanently deletes your Galaxia account and everything in it: people, charts, notes, groups, saved readings, and conversations.",
  irreversible:
    "This cannot be undone. Account deletion is different from a trial ending. When a trial ends, your galaxy stays saved. Deleting your account removes it.",
  typePrompt: 'Type the word "delete" to confirm.',
  confirmButton: "Delete my account forever",
  shareHonesty:
    "Share links you create while signed in after this update will stop working when your account is deleted. Older anonymous share links cannot be tied to your account and may keep working.",
  billingWarning:
    "Deleting your account does not cancel billing. If you have an active subscription (or lifetime access billed through our payment provider), cancel it first so you are not charged after your account is gone.",
  billingLinkLabel: "Cancel subscription",
  errorGeneric: "We could not delete your account. Nothing was removed. Please try again.",
  successRedirectNote: "Your account has been deleted."
} as const;

// FOUNDER-REVIEW: authored - data export section.
export const ACCOUNT_EXPORT_COPY = {
  title: "Export your data",
  lead:
    "Download a machine-readable JSON file of the data in your account: profile, people, charts, relationships, groups, synastry, notes (including saved readings), threads, and messages.",
  button: "Download export",
  errorGeneric: "We could not build your export. Please try again."
} as const;
