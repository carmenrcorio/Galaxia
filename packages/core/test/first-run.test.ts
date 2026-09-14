import { describe, expect, it } from "vitest";
import {
  FIRST_RUN_RELATION_OPTIONS,
  FIRST_RUN_STEPS,
  GALAXY_RELATION_PICKER_OPTIONS,
  firstRunRelationById,
  isFirstRunCompleted,
  isFirstRunSettled,
  isFirstRunSkipped,
  minorSafeRelation,
  resolveFirstRunResume,
  resolveFirstRunStep,
  ringIndex,
  shouldEnterFirstRun,
  shouldOfferFirstRunRestart,
} from "../src/index";

const NOW = new Date("2026-09-14T00:00:00.000Z");

describe("first-run step state", () => {
  it("a brand new profile has not started and resumes at the first step", () => {
    const fresh = { onboarding_step: null, onboarding_completed_at: null };
    expect(isFirstRunSettled(fresh)).toBe(false);
    expect(shouldEnterFirstRun(fresh)).toBe(true);
    expect(resolveFirstRunStep(fresh)).toBe("person");
  });

  it("treats a missing profile row as not started rather than as done", () => {
    // The new-user trigger can lag a first read. Failing open to "not started"
    // shows the flow one extra time; failing closed would silently skip it.
    expect(shouldEnterFirstRun(null)).toBe(true);
    expect(shouldEnterFirstRun(undefined)).toBe(true);
    expect(resolveFirstRunStep(null)).toBe("person");
  });

  it("resumes mid-flow at the recorded step", () => {
    for (const step of FIRST_RUN_STEPS) {
      const row = { onboarding_step: step, onboarding_completed_at: null };
      expect(resolveFirstRunStep(row)).toBe(step);
      expect(shouldEnterFirstRun(row)).toBe(true);
    }
  });

  it("never repeats the flow once it is settled", () => {
    const done = { onboarding_step: "done", onboarding_completed_at: "2026-09-14T00:00:00.000Z" };
    const skipped = { onboarding_step: "skipped", onboarding_completed_at: "2026-09-14T00:00:00.000Z" };
    for (const row of [done, skipped]) {
      expect(isFirstRunSettled(row)).toBe(true);
      expect(shouldEnterFirstRun(row)).toBe(false);
    }
    expect(isFirstRunCompleted(done)).toBe(true);
    expect(isFirstRunSkipped(done)).toBe(false);
    expect(isFirstRunCompleted(skipped)).toBe(false);
    expect(isFirstRunSkipped(skipped)).toBe(true);
  });

  it("offers a restart to everyone except those who finished", () => {
    expect(shouldOfferFirstRunRestart({ onboarding_step: null, onboarding_completed_at: null })).toBe(true);
    expect(shouldOfferFirstRunRestart({ onboarding_step: "reading", onboarding_completed_at: null })).toBe(true);
    expect(
      shouldOfferFirstRunRestart({ onboarding_step: "skipped", onboarding_completed_at: "2026-09-14T00:00:00.000Z" })
    ).toBe(true);
    expect(
      shouldOfferFirstRunRestart({ onboarding_step: "done", onboarding_completed_at: "2026-09-14T00:00:00.000Z" })
    ).toBe(false);
  });

  it("degrades an unrecognised or stale step to the start, never to a guess", () => {
    expect(resolveFirstRunStep({ onboarding_step: "step-7", onboarding_completed_at: null })).toBe("person");
    expect(resolveFirstRunStep({ onboarding_step: "done", onboarding_completed_at: null })).toBe("person");
    expect(resolveFirstRunStep({ onboarding_step: "", onboarding_completed_at: null })).toBe("person");
  });

  it("treats a completed_at with no step as settled, because the timestamp is the fact", () => {
    const row = { onboarding_step: null, onboarding_completed_at: "2026-09-14T00:00:00.000Z" };
    expect(isFirstRunSettled(row)).toBe(true);
    expect(shouldEnterFirstRun(row)).toBe(false);
  });
});

describe("resolveFirstRunResume — the record outranks the stored step", () => {
  const NOTHING = { hasOther: false, hasSelf: false };
  const ONE_OTHER = { hasOther: true, hasSelf: false };
  const BOTH = { hasOther: true, hasSelf: true };

  it("sends anyone with no other person back to the choice, whatever the step says", () => {
    for (const step of [null, "person", "birth", "reading", "you", "next"]) {
      expect(resolveFirstRunResume({ onboarding_step: step, onboarding_completed_at: null }, NOTHING)).toBe("person");
    }
  });

  it("collapses an abandoned birth form back to the choice, not to a nameless form", () => {
    expect(resolveFirstRunResume({ onboarding_step: "birth", onboarding_completed_at: null }, NOTHING)).toBe("person");
  });

  it("resumes at the reading once the other person exists", () => {
    expect(resolveFirstRunResume({ onboarding_step: "birth", onboarding_completed_at: null }, ONE_OTHER)).toBe("reading");
    expect(resolveFirstRunResume({ onboarding_step: "reading", onboarding_completed_at: null }, ONE_OTHER)).toBe("reading");
    expect(resolveFirstRunResume(null, ONE_OTHER)).toBe("reading");
  });

  it("resumes past the reading when the reader had already moved on", () => {
    expect(resolveFirstRunResume({ onboarding_step: "you", onboarding_completed_at: null }, ONE_OTHER)).toBe("you");
    expect(resolveFirstRunResume({ onboarding_step: "next", onboarding_completed_at: null }, ONE_OTHER)).toBe("you");
  });

  it("sends an account that already has both people to the closing step", () => {
    for (const step of [null, "person", "reading", "you", "next"]) {
      expect(resolveFirstRunResume({ onboarding_step: step, onboarding_completed_at: null }, BOTH)).toBe("next");
    }
  });

  it("never resumes anyone into a step the record cannot support", () => {
    // The reading needs a person to read, and the closing step needs both.
    expect(resolveFirstRunResume({ onboarding_step: "reading", onboarding_completed_at: null }, NOTHING)).toBe("person");
    expect(resolveFirstRunResume({ onboarding_step: "next", onboarding_completed_at: null }, ONE_OTHER)).not.toBe("next");
  });
});

describe("first-run relationship options", () => {
  it("offers the seven quick options in order", () => {
    expect(FIRST_RUN_RELATION_OPTIONS.map((o) => o.id)).toEqual([
      "partner",
      "mother",
      "father",
      "child",
      "lost",
      "work",
      "other",
    ]);
  });

  it("stores only relations the canonical picker offers", () => {
    const pickerValues = new Set(GALAXY_RELATION_PICKER_OPTIONS.map((o) => o.value));
    for (const option of FIRST_RUN_RELATION_OPTIONS) {
      expect(pickerValues.has(option.relation), `${option.id} -> ${option.relation}`).toBe(true);
    }
  });

  it("marks exactly one option as a memorial, and it is the lost one", () => {
    const memorial = FIRST_RUN_RELATION_OPTIONS.filter((o) => o.memorial);
    expect(memorial.map((o) => o.id)).toEqual(["lost"]);
  });

  it("puts a person marked as lost in the outer remembrance band", () => {
    const lost = firstRunRelationById("lost")!;
    // passed_at wins over relation for the band, which is why the option can
    // store a relation that asserts nothing about the bond.
    expect(ringIndex(false, lost.relation, "2020-01-01T00:00:00.000Z")).toBe(6);
  });

  it("keeps mother and father distinct from parent in the record", () => {
    expect(firstRunRelationById("mother")?.relation).toBe("mother");
    expect(firstRunRelationById("father")?.relation).toBe("father");
    // Both still resolve onto the family ring, so nothing about the
    // constellation layout changes.
    expect(ringIndex(false, "mother", null)).toBe(3);
    expect(ringIndex(false, "father", null)).toBe(3);
  });

  it("returns null for an unknown option id rather than a default", () => {
    expect(firstRunRelationById("spouse")).toBeNull();
    expect(firstRunRelationById(null)).toBeNull();
    expect(firstRunRelationById(undefined)).toBeNull();
  });
});

describe("minorSafeRelation", () => {
  it("refuses a partner relation for a person flagged as a minor, and reports it", () => {
    const result = minorSafeRelation("partner", { isMinor: true }, NOW);
    expect(result.isMinor).toBe(true);
    expect(result.relation).toBe("other");
    expect(result.refused).toBe("partner");
  });

  it("refuses it from the birth date alone, with the flag left off", () => {
    const result = minorSafeRelation("partner", { birthDate: "2015-05-05", birthPrecision: "date" }, NOW);
    expect(result.isMinor).toBe(true);
    expect(result.relation).toBe("other");
    expect(result.refused).toBe("partner");
  });

  it("refuses ex as well, not only partner", () => {
    expect(minorSafeRelation("ex", { isMinor: true }, NOW).relation).toBe("other");
  });

  it("over-protects a year-only birth that could still be under 18", () => {
    // minPossibleAge assumes the latest birthday in the year, so a 2008 year-only
    // birth is treated as possibly 17 at this NOW.
    const result = minorSafeRelation("partner", { birthDate: "2008-01-01", birthPrecision: "year" }, NOW);
    expect(result.isMinor).toBe(true);
    expect(result.refused).toBe("partner");
  });

  it("leaves an adult partner untouched", () => {
    const result = minorSafeRelation("partner", { birthDate: "1990-03-03", birthPrecision: "date" }, NOW);
    expect(result.isMinor).toBe(false);
    expect(result.relation).toBe("partner");
    expect(result.refused).toBeNull();
  });

  it("leaves every non-romantic relation untouched for a minor", () => {
    for (const relation of ["child", "mother", "father", "colleague", "other", "sibling"] as const) {
      const result = minorSafeRelation(relation, { isMinor: true }, NOW);
      expect(result.relation).toBe(relation);
      expect(result.refused).toBeNull();
    }
  });

  it("never lets a romantic relation through any first-run option for a minor", () => {
    for (const option of FIRST_RUN_RELATION_OPTIONS) {
      const result = minorSafeRelation(option.relation, { isMinor: true }, NOW);
      expect(result.relation === "partner" || result.relation === "ex").toBe(false);
    }
  });
});
