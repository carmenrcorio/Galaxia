import { describe, expect, it } from "vitest";
import { buildVelaContext, buildVelaPrompt, detectCrisisLanguage } from "../src/index";

const baseInput = {
  mode: "ask" as const,
  parenting: false,
  relationshipType: "partner",
  user: { name: "Carmen" },
  people: [
    {
      name: "Carmen",
      role: "self",
      isMinor: false,
      precision: "date" as const,
      sun: "Aries",
      moon: "Cancer",
      rising: null,
      venus: "Pisces",
      mars: "Taurus",
      traits: "warm and direct",
      generational: {
        uranus: "Capricorn",
        neptune: "Capricorn",
        pluto: "Scorpio",
        cohortLabel: "Pluto in Scorpio · Neptune in Capricorn · Uranus in Capricorn"
      }
    }
  ],
  history: [{ role: "user" as const, text: "How do we reconnect?" }],
  userMessage: "What should I do this week?"
};

describe("buildVelaContext privacy behavior", () => {
  it("includes private note digest in ask mode", () => {
    const context = buildVelaContext({
      ...baseInput,
      mode: "ask",
      privateNotes: ["Private note one", "Private note two"]
    });

    expect(context.privateNotesDigest).toEqual(["Private note one", "Private note two"]);
    expect(buildVelaPrompt(context)).toContain("Private note one");
  });

  it("excludes private note digest in shared mode", () => {
    const context = buildVelaContext({
      ...baseInput,
      mode: "shared",
      privateNotes: ["Never share this note"]
    });

    expect(context.privateNotesDigest).toBeUndefined();
    expect(buildVelaPrompt(context)).not.toContain("Never share this note");
  });
});

describe("crisis language detection", () => {
  it("flags crisis language", () => {
    expect(detectCrisisLanguage("I want to kill myself")).toBe(true);
  });

  it("does not over-trigger on normal relationship wording", () => {
    expect(detectCrisisLanguage("I feel disconnected from my partner")).toBe(false);
  });
});
