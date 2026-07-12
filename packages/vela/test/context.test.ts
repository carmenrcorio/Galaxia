import { describe, expect, it } from "vitest";
import { buildVelaContext, buildVelaPrompt, detectCrisisLanguage, VELA_REMEMBRANCE_GUARDRAIL, VELA_SYSTEM_PROMPT } from "../src/index";

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

  it("caps private notes digest at five (not full recall)", () => {
    const context = buildVelaContext({
      ...baseInput,
      mode: "ask",
      privateNotes: ["1", "2", "3", "4", "5", "6", "7"]
    });
    expect(context.privateNotesDigest).toHaveLength(5);
  });
});

describe("Remembrance Phase 2 — Vela never fabricates memories", () => {
  it("system prompt includes the remembrance guardrail verbatim", () => {
    expect(VELA_SYSTEM_PROMPT).toContain(VELA_REMEMBRANCE_GUARDRAIL);
    expect(VELA_REMEMBRANCE_GUARDRAIL).toBe(
      "Draw only on the computed chart facts you are given and the owner's own saved reflections in the private notes digest. Never fabricate memories, events, or facts about the person. Do not invent what they said, did, or felt."
    );
  });

  it("system prompt states the digest is a short sample, not full recall", () => {
    expect(VELA_SYSTEM_PROMPT).toContain("at most five");
    expect(VELA_SYSTEM_PROMPT).toContain("not full recall");
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
