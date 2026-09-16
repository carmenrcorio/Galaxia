import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildVelaContext,
  buildVelaPrompt,
  countVelaAspectCitations,
  detectCrisisLanguage,
  selectLeadAspects,
  sortVelaAspectList,
  VELA_ASPECT_LIST_GUARDRAIL,
  VELA_REMEMBRANCE_GUARDRAIL,
  VELA_SYSTEM_PROMPT
} from "../src/index";

const baseInput = {
  mode: "ask" as const,
  framing: { kind: "default" as const },
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

  it("system prompt requires naming the aspect it is reading and forbids prediction", () => {
    expect(VELA_SYSTEM_PROMPT).toContain("When you are reading an aspect, name it in the answer");
    expect(VELA_SYSTEM_PROMPT).toContain("The sky describes how a person is built, not what will happen to them");
  });

  it("uses the edge HOW YOU THINK / SAFETY / OUTPUT wording", () => {
    expect(VELA_SYSTEM_PROMPT).toContain("never reference private notes");
    expect(VELA_SYSTEM_PROMPT).toContain("If crisis, abuse, or self-harm language appears");
    expect(VELA_SYSTEM_PROMPT).toContain(
      "Blend chart meaning with concrete relationship advice in plain language. Aspect names are not jargon here: name the aspect first, then say in everyday words what it means for these two people."
    );
    expect(VELA_SYSTEM_PROMPT).toContain(
      "When lead_aspects is not empty, name at least one of them by planet and aspect type (for example Venus sextile Jupiter) in your first two sentences. Capitalize planet names."
    );
    expect(VELA_SYSTEM_PROMPT).not.toContain("jargon-free");
    expect(VELA_SYSTEM_PROMPT).not.toContain("never expose private notes");
    expect(VELA_SYSTEM_PROMPT).not.toContain("risk-of-harm");
  });

  it("system prompt forbids naming aspects that are not in aspect_list, verbatim", () => {
    expect(VELA_ASPECT_LIST_GUARDRAIL).toBe(
      "You may only name aspects that appear in the aspect_list field of this payload. If you are not given an aspect, you cannot name it. Never invent or infer an aspect not in the list."
    );
    expect(VELA_SYSTEM_PROMPT).toContain(VELA_ASPECT_LIST_GUARDRAIL);
    const edge = readFileSync(
      resolve(__dirname, "../../../supabase/functions/vela-chat/index.ts"),
      "utf8"
    );
    expect(edge).toContain(VELA_ASPECT_LIST_GUARDRAIL);
    expect(edge).toMatch(/aspect_list,/);
  });
});

describe("aspect_list payload", () => {
  it("serializes computed aspects into the prompt payload", () => {
    const context = buildVelaContext({
      ...baseInput,
      aspect_list: [
        {
          from: "mars",
          to: "saturn",
          type: "square",
          orb: 1.2,
          kind: "synastry",
          from_person: "Carmen",
          to_person: "Daniel"
        }
      ]
    });
    const prompt = buildVelaPrompt(context);
    expect(prompt).toContain("aspect_list");
    expect(prompt).toContain("square");
    expect(prompt).toContain("1.2");
    expect(prompt).toContain("mars");
    expect(prompt).toContain("saturn");
  });

  it("always includes aspect_list even when none were computed", () => {
    const prompt = buildVelaPrompt(buildVelaContext(baseInput));
    expect(prompt).toContain('"aspect_list": []');
    expect(prompt).toContain('"lead_aspects": []');
  });

  it("serializes lead_aspects when provided", () => {
    const context = buildVelaContext({
      ...baseInput,
      lead_aspects: [
        {
          from: "venus",
          to: "jupiter",
          type: "sextile",
          orb: 0.4,
          kind: "synastry",
          from_person: "Alex",
          to_person: "Jordan"
        }
      ]
    });
    const prompt = buildVelaPrompt(context);
    expect(prompt).toContain("lead_aspects");
    expect(prompt).toContain("sextile");
    expect(prompt).toContain("0.4");
  });
});

describe("sortVelaAspectList and selectLeadAspects", () => {
  const mixed = [
    { from: "sun", to: "moon", type: "trine", orb: 3.1, kind: "natal" as const },
    { from: "venus", to: "jupiter", type: "sextile", orb: 2.0, kind: "synastry" as const },
    { from: "mars", to: "saturn", type: "square", orb: 0.5, kind: "synastry" as const },
    { from: "moon", to: "pluto", type: "opposition", orb: 1.2, kind: "natal" as const }
  ];

  it("puts synastry before natal and sorts each group by orb ascending", () => {
    const sorted = sortVelaAspectList(mixed);
    expect(sorted.map((a) => `${a.kind}:${a.orb}`)).toEqual([
      "synastry:0.5",
      "synastry:2",
      "natal:1.2",
      "natal:3.1"
    ]);
  });

  it("selects the three tightest synastry entries for a pair thread", () => {
    const sorted = sortVelaAspectList([
      ...mixed,
      { from: "mercury", to: "venus", type: "conjunction", orb: 0.2, kind: "synastry" as const },
      { from: "sun", to: "mars", type: "square", orb: 4.0, kind: "synastry" as const }
    ]);
    const leads = selectLeadAspects(sorted, "synastry");
    expect(leads).toHaveLength(3);
    expect(leads.every((a) => a.kind === "synastry")).toBe(true);
    expect(leads.map((a) => a.orb)).toEqual([0.2, 0.5, 2.0]);
  });
});

describe("countVelaAspectCitations", () => {
  const list = [
    { from: "venus", to: "jupiter", type: "sextile" },
    { from: "moon", to: "saturn", type: "square" }
  ];

  it("counts an in-list name in either planet order", () => {
    expect(countVelaAspectCitations("Venus sextile Jupiter is the opening.", list)).toEqual({
      list_size: 2,
      named_in_list: 1,
      named_not_in_list: 0
    });
    expect(countVelaAspectCitations("Jupiter sextile Venus shows the care.", list)).toEqual({
      list_size: 2,
      named_in_list: 1,
      named_not_in_list: 0
    });
  });

  it("counts a named aspect that is not in the list", () => {
    expect(countVelaAspectCitations("Mars square Saturn is not here.", list)).toEqual({
      list_size: 2,
      named_in_list: 0,
      named_not_in_list: 1
    });
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

describe("group focus context", () => {
  it("includes group name and cohort in the prompt payload", () => {
    const context = buildVelaContext({
      ...baseInput,
      group: { name: "Siblings" },
      cohort: {
        sharedSky: [{ planet: "pluto", sign: "Scorpio" }],
        faultLines: [
          {
            planet: "uranus",
            groups: [
              { sign: "Capricorn", names: ["Ari", "Bea"] },
              { sign: "Aquarius", names: ["Cy"] }
            ]
          }
        ],
        members: ["Ari", "Bea", "Cy"]
      }
    });
    const prompt = buildVelaPrompt(context);
    expect(prompt).toContain("Siblings");
    expect(prompt).toContain("sharedSky");
    expect(prompt).toContain("faultLines");
    expect(prompt).toContain("Ari");
    expect(prompt).toContain("Cy");
  });
});
