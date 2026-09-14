import {
  GALAXY_RELATION_PICKER_OPTIONS,
  isMinorForSafety,
  resolveGalaxyRelation,
  type GalaxyPickerRelation,
} from "@galaxia/core";
import { signupWithNextHref } from "./nav-links";

/** 32 hex characters: same token shape as create_connect_invite (gen_random_uuid without dashes). */
export const CONNECT_TOKEN_RE = /^[0-9a-f]{32}$/i;

export function isConnectToken(token: string): boolean {
  return CONNECT_TOKEN_RE.test(token);
}

export function connectPath(token: string): string {
  return `/connect/${token}`;
}

export function connectCompareHref(selfId: string, otherId: string): string {
  return `/app/compare?a=${encodeURIComponent(selfId)}&b=${encodeURIComponent(otherId)}`;
}

export const CONNECT_PENDING_HASH = "#pending-connections";
export const CONNECT_PENDING_HREF = `/app/settings${CONNECT_PENDING_HASH}`;

export const CONNECT_RESUME_KEY = "galaxia.connect.resume";

/** Relations create_connect_invite refuses. Matches the SQL `in ('child', 'grandchild')` gate. */
export const CONNECT_BLOCKED_RELATIONS = ["child", "grandchild"] as const;

export type ConnectLandingStatus = "pending" | "accepted" | "expired" | "revoked";

export type ConnectLanding = {
  inviterName: string;
  relation: string;
  status: ConnectLandingStatus;
  expiresAt: string | null;
};

export type ConnectPersonGate = {
  is_self?: boolean | null;
  relation?: string | null;
  is_minor?: boolean | null;
  birth_date?: string | null;
  birth_precision?: "none" | "exact" | "date" | "year" | null;
  linked_user_id?: string | null;
};

export function canOfferConnectInvite(person: ConnectPersonGate): boolean {
  if (person.is_self) return false;
  if (person.linked_user_id) return false;
  if (isMinorForSafety({
    isMinor: person.is_minor ?? false,
    birthDate: person.birth_date,
    birthPrecision: person.birth_precision,
  })) {
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

const RELATION_INVERSE: Record<string, GalaxyPickerRelation> = {
  partner: "partner",
  parent: "child",
  mother: "child",
  father: "child",
  grandparent: "grandchild",
  sibling: "sibling",
  friend: "friend",
  cousin: "cousin",
  relative: "relative",
  aunt: "niece",
  uncle: "nephew",
  niece: "aunt",
  nephew: "uncle",
  "in-law": "in-law",
  ex: "ex",
  colleague: "colleague",
  boss: "other",
  professor: "other",
  mentor: "other",
  acquaintance: "acquaintance",
  other: "other",
  ancestor: "other",
};

/** Relation the recipient stores for the sender on mutual add. */
export function reverseConnectRelation(senderChose: string | null | undefined): GalaxyPickerRelation {
  const resolved = resolveGalaxyRelation(senderChose);
  return RELATION_INVERSE[resolved.normalized] ?? "friend";
}

export function connectRelationLabel(relation: string | null | undefined): string {
  const hit = GALAXY_RELATION_PICKER_OPTIONS.find((o) => o.value === relation);
  if (hit) return hit.label;
  const trimmed = (relation ?? "").trim();
  return trimmed ? trimmed.replace(/-/g, " ") : "someone in their life";
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

export function signupForConnectHref(token: string): string {
  return signupWithNextHref(connectPath(token));
}

export function loginForConnectHref(token: string): string {
  return `/login?next=${encodeURIComponent(connectPath(token))}`;
}

export function landingStatusFromInvite(
  status: string,
  expiresAt: string | null,
  now: Date = new Date(),
): ConnectLandingStatus {
  if (status === "accepted") return "accepted";
  if (status === "revoked") return "revoked";
  if (status === "expired") return "expired";
  if (status === "pending" && expiresAt && new Date(expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }
  return "pending";
}

// FOUNDER-REVIEW: layer-one one-sentence framing on the connect landing.
export const CONNECT_WHAT_GALAXIA_IS =
  "Galaxia is a private space for understanding the people you love, and what they need from you.";

// FOUNDER-REVIEW: locked disclosure. Chart and comparison yes; birth date, time, place, notes, and app activity no.
export const CONNECT_SHARING =
  "Sharing: your chart and how it compares to theirs. Never shared: your birth date, time, place, notes, or app activity.";

// FOUNDER-REVIEW: logged-out primary action on /connect/[token].
export const CONNECT_CTA_SIGNUP = "Create your account to connect";

// FOUNDER-REVIEW: logged-in accept action.
export const CONNECT_CTA_ACCEPT = "Accept and connect";

// FOUNDER-REVIEW: already-accepted token.
export const CONNECT_ALREADY_ACTIVE = "This connection is already active.";

// FOUNDER-REVIEW: expired or revoked token. Ask the sender for a fresh link.
export const CONNECT_EXPIRED = "This link has expired. Ask the sender for a new one.";

// FOUNDER-REVIEW: you opened your own invite.
export const CONNECT_SELF_INVITE = "This is your own invite. Send it to the other person instead.";

// FOUNDER-REVIEW: recipient still needs their own birth details before accept.
export const CONNECT_NEEDS_SELF =
  "Add your own birth details first. Then come back to this link to finish connecting.";

// FOUNDER-REVIEW: 14-day expiry on a freshly generated link.
export const CONNECT_LINK_EXPIRES = "This link expires in 14 days.";

// FOUNDER-REVIEW: generate action on a person profile and on the constellation hover card.
export const CONNECT_INVITE_ACTION = "Invite to connect";

// FOUNDER-REVIEW: create_connect_invite rate-limit message, with a link to the pending list.
export const CONNECT_RATE_LIMIT =
  "Too many open invitations. Revoke some before sending more.";

// FOUNDER-REVIEW: empty pending list on Settings.
export const CONNECT_EMPTY_PENDING = "No pending invites.";

// FOUNDER-REVIEW: pending list section title.
export const CONNECT_PENDING_TITLE = "Pending connections";

// FOUNDER-REVIEW: interstitial after accept. Inner copy: charts, because they just accepted.
export function connectConnectedHeading(senderName: string): string {
  return `You and ${senderName} are connected. Want to see how your charts interact?`;
}

// FOUNDER-REVIEW: interstitial primary action.
export const CONNECT_SEE_COMPARISON = "See your comparison";

// FOUNDER-REVIEW: interstitial secondary action.
export const CONNECT_GO_CONSTELLATION = "Go to my constellation";

// FOUNDER-REVIEW: landing headline. Sender display name plus the relation they chose.
export function connectLandingHeadline(inviterName: string, relation: string): string {
  if (!relation) return `${inviterName} invited you to connect.`;
  return `${inviterName} invited you to connect as their ${connectRelationLabel(relation).toLowerCase()}.`;
}

// FOUNDER-REVIEW: native share sheet title.
export const CONNECT_SHARE_TITLE = "Connect with me on Galaxia";

// FOUNDER-REVIEW: native share sheet body. No astrology vocabulary.
export const CONNECT_SHARE_TEXT = "Join me on Galaxia so we can see how we fit.";
