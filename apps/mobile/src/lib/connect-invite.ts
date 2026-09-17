import {
  GALAXY_RELATION_PICKER_OPTIONS,
  isMinorForSafety,
  resolveGalaxyRelation,
  usesAncientLight,
  type GalaxyPickerRelation
} from "@galaxia/core";

/** 32 hex characters: same token shape as create_connect_invite. */
export const CONNECT_TOKEN_RE = /^[0-9a-f]{32}$/i;

export function isConnectToken(token: string): boolean {
  return CONNECT_TOKEN_RE.test(token);
}

export function connectPath(token: string): string {
  return `/connect/${token}`;
}

/** Relations create_connect_invite refuses. Matches the SQL `in ('child', 'grandchild')` gate. */
export const CONNECT_BLOCKED_RELATIONS = ["child", "grandchild"] as const;

export type ConnectPersonGate = {
  is_self?: boolean | null;
  relation?: string | null;
  is_minor?: boolean | null;
  birth_date?: string | null;
  birth_precision?: "none" | "exact" | "date" | "year" | null;
  linked_user_id?: string | null;
  passed_at?: string | null;
};

export function canOfferConnectInvite(person: ConnectPersonGate): boolean {
  if (person.is_self) return false;
  if (person.linked_user_id) return false;
  if (
    usesAncientLight({
      is_self: person.is_self ?? false,
      relation: person.relation,
      passed_at: person.passed_at
    })
  ) {
    return false;
  }
  if (
    isMinorForSafety({
      isMinor: person.is_minor ?? false,
      birthDate: person.birth_date,
      birthPrecision: person.birth_precision
    })
  ) {
    return false;
  }
  const resolved = resolveGalaxyRelation(person.relation);
  if (resolved.band === "children") return false;
  if (CONNECT_BLOCKED_RELATIONS.includes(resolved.normalized as (typeof CONNECT_BLOCKED_RELATIONS)[number])) {
    return false;
  }
  return true;
}

/** Merge target for create_connect_invite: owned bare star, unlinked, not a minor. */
export function isConnectMergeTarget(person: ConnectPersonGate): boolean {
  return canOfferConnectInvite(person) && person.birth_precision === "none";
}

const PICKER_VALUES = new Set<string>(GALAXY_RELATION_PICKER_OPTIONS.map((o) => o.value));

/**
 * Relation sent to create_connect_invite. Must be a galaxy_relations picker
 * value. Child-band people never reach this (canOfferConnectInvite is false).
 */
export function connectRelationForPerson(relation: string | null | undefined): GalaxyPickerRelation {
  const resolved = resolveGalaxyRelation(relation);
  if (resolved.normalized && PICKER_VALUES.has(resolved.normalized)) {
    return resolved.normalized as GalaxyPickerRelation;
  }
  if (resolved.band === "partner") return "partner";
  if (resolved.band === "family") {
    if (resolved.normalized === "mother" || resolved.normalized === "father") {
      return resolved.normalized;
    }
    return "parent";
  }
  if (resolved.band === "circle") return "friend";
  if (resolved.band === "outer") return "colleague";
  return "other";
}

export function connectRelationLabel(relation: string | null | undefined): string {
  const hit = GALAXY_RELATION_PICKER_OPTIONS.find((o) => o.value === relation);
  if (hit) return hit.label;
  const trimmed = (relation ?? "").trim();
  return trimmed ? trimmed.replace(/-/g, " ") : "";
}

export function connectInviteTimeRemaining(expiresAt: string, now: Date = new Date()): string {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (ms <= 0) return "Expired";
  const days = Math.ceil(ms / 86_400_000);
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function isConnectRateLimitError(message: string | null | undefined): boolean {
  return Boolean(message && /too many open invitations/i.test(message));
}

export const CONNECT_LINK_CREATE_FAILED = "The link could not be created.";
export const CONNECT_GENERIC_ERROR = "The connection invite could not be completed. Try again.";
export const CONNECT_LINK_EXPIRES =
  "This link expires in 14 days. Anyone who opens it can connect with you, so send it only to them.";
export const CONNECT_INVITE_ACTION = "Invite to connect";
export const CONNECT_RATE_LIMIT =
  "You have too many invites still open. Revoke one before sending another.";
export const CONNECT_EMPTY_PENDING = "Nothing pending right now.";
export const CONNECT_PENDING_TITLE = "Pending invites";
export const CONNECT_PENDING_LOADING = "Loading your connection invites.";
export const CONNECT_SHARE_TITLE = "Connect with me on Galaxia";
export const CONNECT_SHARE_TEXT = "Join me on Galaxia so we can see how we fit.";
