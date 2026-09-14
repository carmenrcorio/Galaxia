import { describe, expect, it } from "vitest";
import { computeNatalChart } from "../src/index";
import {
  captureMomentSnapshot,
  parseMomentTransitSnapshot,
  type MomentTransitSnapshot
} from "../src/moment-snapshot";
import { PAIR_TRANSIT_ACTIVE_ORB_DEG } from "../src/compare-transit-delta";
import { computeTransits } from "../src/index";

const WHEN = "2026-06-29T12:00:00.000Z";

function exactChart() {
  return computeNatalChart({
    dateUTC: "1993-04-10T13:45:00.000Z",
    precision: "exact",
    lat: 40.7128,
    lng: -74.006,
    houseSystem: "placidus"
  });
}

function yearChart() {
  return computeNatalChart({
    dateUTC: "1995-01-01T00:00:00.000Z",
    precision: "year"
  });
}

describe("captureMomentSnapshot", () => {
  it("stores real 1.5° hits and never invents bodies that computeTransits did not return", () => {
    const chart = exactChart();
    const snapshot = captureMomentSnapshot({
      self: { personId: "self", chart, isSelf: true },
      them: { personId: "self", chart, isSelf: true },
      whenUTC: WHEN
    });
    const expected = computeTransits(chart, WHEN).filter((h) => h.orb <= PAIR_TRANSIT_ACTIVE_ORB_DEG);
    expect(snapshot.honesty).toBe("ok");
    expect(snapshot.includedYou).toBe(true);
    expect(snapshot.includedThem).toBe(false);
    expect(snapshot.hits).toHaveLength(expected.length);
    expect(snapshot.quiet).toBe(expected.length === 0);
    for (const hit of snapshot.hits) {
      expect(hit.whose).toBe("you");
      expect(expected.some((e) =>
        e.transitBody === hit.transitBody && e.natalBody === hit.natalBody && e.type === hit.type
      )).toBe(true);
    }
  });

  it("skips year-only charts instead of attaching a guessed orb", () => {
    const snapshot = captureMomentSnapshot({
      self: null,
      them: { personId: "them", chart: yearChart() },
      whenUTC: WHEN
    });
    expect(snapshot.honesty).toBe("year_precision");
    expect(snapshot.hits).toEqual([]);
    expect(snapshot.quiet).toBe(true);
    expect(snapshot.includedThem).toBe(false);
  });

  it("skips remembrance profiles instead of attaching a live sky", () => {
    const snapshot = captureMomentSnapshot({
      self: { personId: "self", chart: exactChart(), isSelf: true },
      them: { personId: "them", chart: exactChart(), passedAt: "2024-11-02T00:00:00.000Z" },
      whenUTC: WHEN
    });
    expect(snapshot.includedThem).toBe(false);
    expect(snapshot.themHonesty).toBe("remembrance");
    expect(snapshot.hits.every((h) => h.whose === "you")).toBe(true);
  });

  it("round-trips through parse and drops invented bodies", () => {
    const snapshot = captureMomentSnapshot({
      self: { personId: "self", chart: exactChart(), isSelf: true },
      them: { personId: "self", chart: exactChart(), isSelf: true },
      whenUTC: WHEN
    });
    expect(parseMomentTransitSnapshot(snapshot)).toEqual(snapshot);
    expect(parseMomentTransitSnapshot({ relationType: "partners", score: 80 })).toBeNull();
    const forged: MomentTransitSnapshot = {
      ...snapshot,
      hits: [
        ...snapshot.hits,
        {
          personId: "x",
          whose: "them",
          transitBody: "saturn",
          natalBody: "moon",
          type: "square",
          orb: 0.1
        }
      ]
    };
    const parsed = parseMomentTransitSnapshot({
      ...forged,
      hits: [...forged.hits, { personId: "x", whose: "them", transitBody: "not-a-planet", natalBody: "moon", type: "square", orb: 0.1 }]
    });
    expect(parsed?.hits.some((h) => (h.transitBody as string) === "not-a-planet")).toBe(false);
  });
});
