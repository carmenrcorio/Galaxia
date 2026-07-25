import {
  ADULT_ONLY_KEYS,
  DROP_DOMAIN,
  EMPTY_HEDGE,
  FRAMING_GENTLE,
  FULL_SPECIFICITY,
} from "./copy-matrix";
import { romanticLensAllowed } from "./framing";
import type {
  AspectClass,
  CopyTier,
  EnrichedTransitHit,
  NudgeFraming,
  NudgePrecisionMode,
} from "./types";
import type { BodyName } from "../index";

export interface ResolvedCopy {
  copy_key: string;
  copy_tier: CopyTier;
  copy_resolved: string;
}

function fullKey(
  theme: BodyName,
  aspectClass: AspectClass,
  domain: BodyName,
  framing: NudgeFraming
): string {
  return `full:${theme}:${aspectClass}:${domain}:${framing}`;
}

function dropKey(theme: BodyName, aspectClass: AspectClass, framing: NudgeFraming): string {
  return `drop:${theme}:${aspectClass}:${framing}`;
}

function gentleKey(framing: NudgeFraming): string {
  return `gentle:${framing}`;
}

/**
 * Tiered resolver: full → drop_domain → framing_gentle.
 * Selects a key and returns the frozen authored sentence — never concatenates.
 * Adult/romance keys are unreachable when minor_safe (or romantic lens closed).
 */
export function resolveNudgeCopy(input: {
  hit: EnrichedTransitHit | null;
  framing: NudgeFraming;
  minorSafe: boolean;
  precisionMode: NudgePrecisionMode;
}): ResolvedCopy {
  const { hit, framing, minorSafe, precisionMode } = input;

  if (!hit) {
    if (precisionMode === "year_blocked") {
      return {
        copy_key: "hedge:year",
        copy_tier: "empty_hedge",
        copy_resolved: EMPTY_HEDGE["hedge:year"]!,
      };
    }
    if (precisionMode === "none") {
      return {
        copy_key: "hedge:none",
        copy_tier: "empty_hedge",
        copy_resolved: EMPTY_HEDGE["hedge:none"]!,
      };
    }
    return {
      copy_key: "hedge:quiet",
      copy_tier: "empty_hedge",
      copy_resolved: EMPTY_HEDGE["hedge:quiet"]!,
    };
  }

  const theme = hit.transitBody;
  const domain = hit.natalBody;
  const aspectClass = hit.aspectClass;
  const allowAdult = romanticLensAllowed(framing, minorSafe);

  const fk = fullKey(theme, aspectClass, domain, framing);
  const fullLine = FULL_SPECIFICITY[fk];
  if (fullLine && !(ADULT_ONLY_KEYS.has(fk) && !allowAdult)) {
    return { copy_key: fk, copy_tier: "full", copy_resolved: fullLine };
  }

  const dk = dropKey(theme, aspectClass, framing);
  const dropLine = DROP_DOMAIN[dk];
  if (dropLine) {
    return { copy_key: dk, copy_tier: "drop_domain", copy_resolved: dropLine };
  }

  const gk = gentleKey(framing);
  return {
    copy_key: gk,
    copy_tier: "framing_gentle",
    copy_resolved: FRAMING_GENTLE[gk] ?? EMPTY_HEDGE["hedge:quiet"]!,
  };
}
