import { describe, expect, it } from "vitest";
import {
  MEMORIAL_CONSTELLATIONS,
  getMemorialConstellation,
  isMemorialConstellationId,
  normalizeMemorialConstellationForWrite,
  usesMemorialGlyph,
} from "../src/index";

const EXPECTED_IDS = [
  "cassiopeia",
  "orion",
  "lyra",
  "cygnus",
  "scorpius",
  "leo",
  "ursa_major",
  "ursa_minor",
  "andromeda",
  "perseus",
  "aquila",
  "corona_borealis",
  "gemini",
  "taurus",
  "bootes",
  "draco",
] as const;

describe("MEMORIAL_CONSTELLATIONS library", () => {
  it("ships exactly the 16 sourced patterns in picker order", () => {
    expect(MEMORIAL_CONSTELLATIONS.map((c) => c.id)).toEqual([...EXPECTED_IDS]);
  });

  it("gives each entry a stable id, display name, IAU abbrev, summary, myth, stars, and lines", () => {
    for (const entry of MEMORIAL_CONSTELLATIONS) {
      expect(entry.id).toMatch(/^[a-z_]+$/);
      expect(entry.name.length).toBeGreaterThan(2);
      expect(entry.iau).toMatch(/^[A-Z][a-zA-Z]{1,2}$/);
      expect(entry.summary.length).toBeGreaterThan(12);
      expect(entry.myth.length).toBeGreaterThan(24);
      expect(entry.stars.length).toBeGreaterThanOrEqual(5);
      expect(entry.lines.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("ships founder-approved Greco-Roman myth copy for every library entry", () => {
    // FOUNDER-REVIEW: curated static myths — never generated. Exact strings.
    const FOUNDER_MYTHS: Record<(typeof EXPECTED_IDS)[number], string> = {
      cassiopeia:
        "The vain queen who boasted she was more beautiful than the sea nymphs. Poseidon bound her to her throne in the sky, circling the pole forever, upside down half the night as humbling for her pride.",
      orion:
        "The great hunter, son of Poseidon, who could walk on water. Slain by a scorpion's sting and placed among the stars, still striding across the winter sky with his belt and sword.",
      lyra:
        "The lyre of Orpheus, whose music could charm stones, tame beasts, and soften the hearts of the dead. After his death Zeus set his instrument in the sky.",
      cygnus:
        "The swan. In one telling, Zeus in swan form; in another, the grieving friend of Phaethon who dove again and again into the river for his body until the gods, moved by his loyalty, made him a swan among the stars.",
      scorpius:
        "The scorpion sent by Gaia to kill Orion. The two were placed at opposite ends of the sky, so the hunter sets as his killer rises and they never meet.",
      leo:
        "The Nemean lion, whose hide no weapon could pierce. Heracles strangled it with his bare hands as the first of his twelve labors, and it was raised to the heavens.",
      ursa_major:
        "Callisto, a nymph loved by Zeus and turned into a bear by his jealous wife. Years later her own son nearly hunted her; Zeus lifted them both into the sky to keep them safe together.",
      ursa_minor:
        "Arcas, Callisto's son, set beside his mother as the Little Bear so the two would circle the pole together and never be parted.",
      andromeda:
        "The princess chained to a rock as a sacrifice to a sea monster, to pay for her mother Cassiopeia's pride. Rescued by Perseus, she was placed among the stars near the family whose vanity had doomed her.",
      perseus:
        "The hero who slew Medusa and, flying home with her head, found Andromeda chained and saved her. He holds the severed head, whose winking star Algol marks the Gorgon's eye.",
      aquila:
        "The eagle of Zeus, who carried his thunderbolts and bore the youth Ganymede up to Olympus. Set in the sky along the Milky Way.",
      corona_borealis:
        "The crown of Ariadne, given by Dionysus. When she died he threw it into the sky, its jewels becoming stars, so their love would be remembered.",
      gemini:
        "Castor and Pollux, twin brothers, one mortal and one immortal. When Castor died, Pollux begged to share his immortality rather than be parted, and Zeus set them together in the sky.",
      taurus:
        "The bull, Zeus in disguise, who carried Europa across the sea. Its face is marked by the Hyades and its shoulder by the Pleiades, the seven sisters.",
      bootes:
        "The herdsman who drives the bears around the pole, holding the leash of the hunting dogs. Sometimes called the first ploughman, given a place in the sky for inventing the plough.",
      draco:
        "The dragon Ladon, who guarded the golden apples of the Hesperides until Heracles slew it. Hera set it in the sky, coiled forever around the pole.",
    };
    for (const id of EXPECTED_IDS) {
      expect(getMemorialConstellation(id)?.myth).toBe(FOUNDER_MYTHS[id]);
    }
  });

  it("keeps star coords in roughly [-1, 1] with barycenter near origin", () => {
    for (const entry of MEMORIAL_CONSTELLATIONS) {
      let sx = 0;
      let sy = 0;
      for (const [x, y] of entry.stars) {
        expect(x).toBeGreaterThanOrEqual(-1.05);
        expect(x).toBeLessThanOrEqual(1.05);
        expect(y).toBeGreaterThanOrEqual(-1.05);
        expect(y).toBeLessThanOrEqual(1.05);
        sx += x;
        sy += y;
      }
      const n = entry.stars.length;
      expect(Math.abs(sx / n)).toBeLessThan(0.02);
      expect(Math.abs(sy / n)).toBeLessThan(0.02);
    }
  });

  it("indexes lines into the star list only", () => {
    for (const entry of MEMORIAL_CONSTELLATIONS) {
      for (const [a, b] of entry.lines) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(entry.stars.length);
        expect(b).toBeLessThan(entry.stars.length);
        expect(a).not.toBe(b);
      }
    }
  });
});

describe("normalize / resolve memorial constellation", () => {
  it("accepts known ids and clears empty / unknown", () => {
    expect(normalizeMemorialConstellationForWrite("orion")).toBe("orion");
    expect(normalizeMemorialConstellationForWrite(null)).toBeNull();
    expect(normalizeMemorialConstellationForWrite("")).toBeNull();
    expect(normalizeMemorialConstellationForWrite("none")).toBeNull();
    expect(normalizeMemorialConstellationForWrite("default")).toBeNull();
    expect(normalizeMemorialConstellationForWrite("not-a-sky")).toBeNull();
    expect(isMemorialConstellationId("ursa_major")).toBe(true);
    expect(isMemorialConstellationId("made_up")).toBe(false);
    expect(getMemorialConstellation("lyra")?.iau).toBe("Lyr");
    expect(getMemorialConstellation("nope")).toBeNull();
  });
});

describe("usesMemorialGlyph", () => {
  it("requires passed_at and a known assignment", () => {
    expect(
      usesMemorialGlyph({
        passed_at: "2024-01-01T00:00:00.000Z",
        memorial_constellation: "cassiopeia",
      })
    ).toBe(true);
    expect(
      usesMemorialGlyph({
        passed_at: "2024-01-01T00:00:00.000Z",
        memorial_constellation: null,
      })
    ).toBe(false);
    expect(
      usesMemorialGlyph({
        passed_at: null,
        memorial_constellation: "orion",
      })
    ).toBe(false);
    expect(
      usesMemorialGlyph({
        passed_at: "2024-01-01T00:00:00.000Z",
        memorial_constellation: "invented",
      })
    ).toBe(false);
    expect(
      usesMemorialGlyph({
        is_self: true,
        passed_at: "2024-01-01T00:00:00.000Z",
        memorial_constellation: "orion",
      })
    ).toBe(false);
  });
});
