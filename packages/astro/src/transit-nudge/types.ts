import type { AspectType, BodyName } from "../index";

/** Owner-facing relationship framing for daily transit nudges. */
export type NudgeFraming =
  | "self"
  | "partner"
  | "child"
  | "family"
  | "friend"
  | "colleague"
  | "general";

export type AspectClass = "flow" | "friction" | "fusion";

export type TransitPhase = "applying" | "exact" | "separating";

/**
 * Chart precision as the nudge pipeline sees it.
 * date_sign = birth date known, time unknown — theme-level only.
 */
export type NudgePrecisionMode = "exact" | "date_sign" | "year_blocked" | "none";

export type CopyTier = "full" | "drop_domain" | "framing_gentle" | "empty_hedge";

export interface EnrichedTransitHit {
  transitBody: BodyName;
  natalBody: BodyName;
  type: AspectType;
  aspectClass: AspectClass;
  /** Absolute orb at `whenUTC` (degrees). Never persisted in date_sign mode. */
  orb: number;
  phase: TransitPhase;
  exactAt: string;
  /** Stable per exact pass; distinct for each Rx re-pass. */
  passId: string;
  /** True when the transit body is retrograde at exact_at. */
  retrogradeAtExact: boolean;
}

export interface PersonDailyNudgeRecord {
  owner_id: string;
  person_id: string;
  /** Owner-local calendar day (YYYY-MM-DD). */
  date: string;
  transit_body: BodyName | null;
  natal_body: BodyName | null;
  aspect_type: AspectType | null;
  aspect_class: AspectClass | null;
  /** Precise orb — null in date_sign / empty rows (never fabricate). */
  orb_deg: number | null;
  phase: TransitPhase | null;
  exact_at: string | null;
  pass_id: string | null;
  copy_key: string;
  copy_tier: CopyTier;
  copy_resolved: string;
  relationship_framing: NudgeFraming;
  precision_mode: NudgePrecisionMode;
  minor_safe: boolean;
  selection_reason: Record<string, unknown> | null;
}

export const ASPECT_CLASS: Record<AspectType, AspectClass> = {
  conjunction: "fusion",
  sextile: "flow",
  trine: "flow",
  square: "friction",
  opposition: "friction",
};

export const TRANSIT_THEMES: readonly BodyName[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;

export const NATAL_DOMAINS: readonly BodyName[] = TRANSIT_THEMES;

export const NUDGE_FRAMINGS: readonly NudgeFraming[] = [
  "self",
  "partner",
  "child",
  "family",
  "friend",
  "colleague",
  "general",
] as const;

export const ASPECT_CLASSES: readonly AspectClass[] = ["flow", "friction", "fusion"] as const;
