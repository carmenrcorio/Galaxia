import { describe, expect, it } from "vitest";
import {
  aspectPatternCopy,
  computeNatalChart,
  computeSynastry,
  describeTSquarePattern,
  detectAspectPatterns,
  formatTSquarePatternDetail,
  type Aspect,
  type BodyName,
  type Placement,
  type Sign,
} from "../src/index";

function placement(body: BodyName, sign: Sign, lon: number, confident = true): Placement {
  return {
    body,
    sign,
    lon,
    degree: lon % 30,
    retro: false,
    confident,
  };
}

function aspect(from: BodyName, to: BodyName, type: Aspect["type"]): Aspect {
  return { from, to, type, orb: 1, harmony: type === "trine" ? 1 : -1 };
}

describe("detectAspectPatterns", () => {
  it("detects one Grand Trine from undirected trine edges", () => {
    const placements = [
      placement("sun", "Aries", 5),
      placement("moon", "Leo", 125),
      placement("jupiter", "Sagittarius", 245),
    ];
    const aspects = [
      aspect("sun", "moon", "trine"),
      aspect("moon", "sun", "trine"),
      aspect("sun", "jupiter", "trine"),
      aspect("moon", "jupiter", "trine"),
    ];

    expect(detectAspectPatterns(aspects, placements)).toEqual([
      {
        type: "grand_trine",
        planets: ["sun", "moon", "jupiter"],
        element: "fire",
      },
    ]);
  });

  it("describes distinct T-squares that share focal planet and modality", () => {
    const chart = computeNatalChart({
      dateUTC: "1965-02-19T08:00:00.000Z",
      precision: "exact",
      lat: 40.7128,
      lng: -74.006,
    });
    const aspects = computeSynastry(chart, chart).aspects;
    const tSquares = detectAspectPatterns(aspects, chart.placements).filter(
      (pattern) => pattern.type === "t_square" && pattern.focalPlanet === "north_node"
    );
    expect(tSquares).toHaveLength(2);
    const lines = tSquares.map((pattern) => formatTSquarePatternDetail(pattern));
    expect(lines[0]).not.toBe(lines[1]);
    expect(lines).toContain("Mars opposite Chiron, both square North Node · Mutable");
    expect(lines).toContain("Pluto opposite Chiron, both square North Node · Mutable");
  });

  it("detects a T-Square and identifies its focal planet and modality", () => {
    const placements = [
      placement("sun", "Aries", 2),
      placement("moon", "Libra", 182),
      placement("mars", "Cancer", 92),
    ];
    const aspects = [
      aspect("sun", "moon", "opposition"),
      aspect("sun", "mars", "square"),
      aspect("moon", "mars", "square"),
    ];

    expect(detectAspectPatterns(aspects, placements)).toEqual([
      {
        type: "t_square",
        planets: ["sun", "moon", "mars"],
        focalPlanet: "mars",
        modality: "cardinal",
      },
    ]);
    expect(describeTSquarePattern(detectAspectPatterns(aspects, placements)[0]!)).toBe(
      "Sun opposite Moon, both square Mars"
    );
  });

  it("detects sign stelliums across planets, North Node, and Chiron", () => {
    const placements = [
      placement("sun", "Virgo", 155),
      placement("north_node", "Virgo", 160),
      placement("chiron", "Virgo", 165),
      placement("moon", "Libra", 190),
    ];

    expect(detectAspectPatterns([], placements)).toEqual([
      {
        type: "stellium",
        planets: ["sun", "north_node", "chiron"],
        sign: "Virgo",
        count: 3,
      },
    ]);
  });

  it("does not turn uncertain signs into a stellium", () => {
    const placements = [
      placement("sun", "Virgo", 155),
      placement("moon", "Virgo", 160),
      placement("chiron", "Virgo", 165, false),
    ];

    expect(detectAspectPatterns([], placements)).toEqual([]);
  });

  it("returns no patterns when none qualify", () => {
    expect(
      detectAspectPatterns(
        [aspect("sun", "moon", "sextile")],
        [placement("sun", "Aries", 5), placement("moon", "Gemini", 65)]
      )
    ).toEqual([]);
  });
});

describe("aspect pattern integration and copy", () => {
  it("stores detector output on computed natal charts", () => {
    const chart = computeNatalChart({
      dateUTC: "1993-04-10T13:45:00.000Z",
      precision: "exact",
      lat: 40.7128,
      lng: -74.006,
    });
    const aspects = computeSynastry(chart, chart).aspects;

    expect(chart.patterns).toEqual(detectAspectPatterns(aspects, chart.placements));
  });

  it("does not detect patterns from sampled year-only positions", () => {
    const chart = computeNatalChart({
      dateUTC: "1995-01-01T00:00:00.000Z",
      precision: "year",
    });

    expect(chart.patterns).toEqual([]);
  });

  it("returns the approved interpretation copy", () => {
    expect(
      aspectPatternCopy({
        type: "grand_trine",
        planets: ["sun", "moon", "jupiter"],
        element: "water",
      })
    ).toEqual({
      short: "A rare gift: three planets in effortless conversation",
      long: "Emotional intelligence that reads a room. Risk: absorbing what is not yours.",
    });
    expect(
      aspectPatternCopy({
        type: "t_square",
        planets: ["sun", "moon", "mars"],
        focalPlanet: "mars",
        modality: "cardinal",
      })
    ).toEqual({
      short: "Built-in tension that demands action",
      long: "Two forces pull opposite, both push a third point. That point is where growth happens. Not a flaw. A motor.",
    });
    expect(
      aspectPatternCopy({
        type: "stellium",
        planets: ["sun", "mercury", "venus"],
        sign: "Virgo",
        count: 3,
      })
    ).toEqual({
      short: "3 planets in Virgo: a concentration of purpose",
      long: "When this many planets occupy one sign, that energy dominates. Superpower and blind spot in the same breath.",
    });
  });
});
