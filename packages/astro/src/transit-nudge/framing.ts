import { bodyPriorityForBand, type PriorityBand } from "../compare-guidance";
import type { NudgeFraming } from "./types";

/**
 * Map a saved `people.relation` tag (+ is_self) to nudge framing.
 * Tags are user-relative; unrecognized → general.
 */
export function nudgeFramingFromRelation(
  relation: string | null | undefined,
  isSelf: boolean
): NudgeFraming {
  if (isSelf) return "self";
  const tag = (relation ?? "").trim().toLowerCase();
  if (!tag || tag === "self") return "general";

  if (["partner", "spouse", "wife", "husband"].includes(tag)) return "partner";
  if (["child", "son", "daughter", "kid", "stepchild", "grandchild", "granddaughter", "grandson"].includes(tag)) {
    return "child";
  }
  if (
    ["parent", "mother", "father", "mom", "dad", "sibling", "sister", "brother", "grandparent", "stepparent", "stepsibling"].includes(
      tag
    )
  ) {
    return "family";
  }
  if (["friend", "cousin", "relative", "aunt", "uncle", "niece", "nephew", "in-law", "ex"].includes(tag)) {
    return "friend";
  }
  if (["colleague", "coworker", "co-worker", "boss", "professor", "mentor", "acquaintance"].includes(tag)) {
    return "colleague";
  }
  if (tag === "ancestor") return "family";
  return "general";
}

/** Framing → shared priority band (Compare map; no fork). */
export function priorityBandForFraming(framing: NudgeFraming): PriorityBand {
  switch (framing) {
    case "self":
      return "self";
    case "partner":
      return "partners";
    case "child":
      return "parent-child";
    case "family":
      return "siblings";
    case "friend":
      return "friends";
    case "colleague":
      return "colleague";
    case "general":
      return "general";
  }
}

/** Weighted natal domains for a framing — from the shared priority map. */
export function weightedDomainsForFraming(framing: NudgeFraming): readonly string[] {
  return bodyPriorityForBand(priorityBandForFraming(framing));
}

/**
 * Romantic lens is only reachable for partner framing when the person is an
 * adult (not minor_safe). Child framing always resolves parenting copy.
 */
export function romanticLensAllowed(framing: NudgeFraming, minorSafe: boolean): boolean {
  return framing === "partner" && !minorSafe;
}
