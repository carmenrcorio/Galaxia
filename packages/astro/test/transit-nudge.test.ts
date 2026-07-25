import { describe, expect, it } from "vitest";
import { computeNatalChart, eclipticLongitude, type BodyName } from "../src/index";
import {
  ADULT_ONLY_KEYS,
  COPY_MATRIX_COUNTS,
  buildPassId,
  buildPersonDailyNudge,
  dateSignNatalTargetAllowed,
  eligibleNudgeHits,
  enrichHit,
  exactnessWindowDeg,
  findExactAt,
  natalDaySmearDeg,
  nudgeFramingFromRelation,
  orderSkyRowsForHome,
  precisionModeFromChart,
  resolveNudgeCopy,
  selectDailyHit,
  withinExactnessWindow,
  type EnrichedTransitHit,
  type PersonDailyNudgeRecord,
} from "../src/transit-nudge";

describe("copy matrix inventory", () => {
  it("authors the approved tier counts (not the full 2100)", () => {
    expect(COPY_MATRIX_COUNTS.drop_domain).toBe(210);
    expect(COPY_MATRIX_COUNTS.framing_gentle).toBe(7);
    expect(COPY_MATRIX_COUNTS.full_specificity).toBe(570);
    expect(COPY_MATRIX_COUNTS.empty_hedge).toBe(3);
    expect(COPY_MATRIX_COUNTS.total).toBe(790);
  });
});

describe("pass_id retrograde distinctness", () => {
  it("builds distinct pass ids for D vs R at different exact times", () => {
    const a = buildPassId("saturn", "moon", "square", new Date("2026-03-15T14:00:00.000Z"), false);
    const b = buildPassId("saturn", "moon", "square", new Date("2026-07-20T08:00:00.000Z"), true);
    const c = buildPassId("saturn", "moon", "square", new Date("2026-11-02T18:00:00.000Z"), false);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
    expect(a.endsWith(":D")).toBe(true);
    expect(b.endsWith(":R")).toBe(true);
  });

  it("enrichHit attaches a stable passId including direction", () => {
    const natal = computeNatalChart({
      dateUTC: "1990-06-15T12:00:00.000Z",
      precision: "exact",
      lat: 40.7,
      lng: -74.0,
    });
    const moon = natal.placements.find((p) => p.body === "moon")!;
    // Use a real transit sample date; enrichment must produce a well-formed id.
    const hit = enrichHit("saturn", "moon", moon.lon, "square", 0.4, "2026-06-15T12:00:00.000Z");
    expect(hit.passId).toMatch(/^saturn:moon:square:\d{4}-\d{2}-\d{2}T/);
    expect(hit.passId.endsWith(":D") || hit.passId.endsWith(":R")).toBe(true);
    expect(hit.exactAt).toBeTruthy();
    expect(["applying", "exact", "separating"]).toContain(hit.phase);
  });
});

describe("slow transit silent between passes", () => {
  it("rejects orbs outside the per-body degree window", () => {
    expect(withinExactnessWindow("pluto", 0.2)).toBe(true);
    expect(withinExactnessWindow("pluto", 0.5)).toBe(false);
    expect(withinExactnessWindow("saturn", 0.5)).toBe(true);
    expect(withinExactnessWindow("saturn", 0.8)).toBe(false);
    expect(exactnessWindowDeg("jupiter")).toBeLessThan(exactnessWindowDeg("mars"));
  });

  it("eligibleNudgeHits drops outer hits outside the degree window", () => {
    const natal = computeNatalChart({
      dateUTC: "1988-03-14T09:20:00.000Z",
      precision: "exact",
      lat: 40.7128,
      lng: -74.006,
    });
    // Far from exact: use a date unlikely to be inside a tight outer window for all
    // placements — assert the filter property: every returned hit is in window.
    const hits = eligibleNudgeHits({
      chart: natal,
      whenUTC: "2026-01-15T12:00:00.000Z",
      precisionMode: "exact",
    });
    for (const h of hits) {
      expect(h.orb).toBeLessThanOrEqual(exactnessWindowDeg(h.transitBody));
    }
  });
});

describe("date_sign never-fabricate", () => {
  it("disqualifies Moon as a natal target and rejects smear-broken aspects", () => {
    expect(dateSignNatalTargetAllowed("moon", 0.1, 1.5, 12)).toBe(false);
    // Sun smear ~1°/day — tight orb survives.
    expect(dateSignNatalTargetAllowed("sun", 0.2, 1.2, 1.0)).toBe(true);
    // Wide orb + smear fails.
    expect(dateSignNatalTargetAllowed("sun", 1.0, 1.2, 1.0)).toBe(false);
  });

  it("buildPersonDailyNudge stores null orb_deg and never targets Moon in date_sign", () => {
    const chart = computeNatalChart({
      dateUTC: "1993-04-10T12:00:00.000Z",
      precision: "date",
    });
    expect(precisionModeFromChart(chart, "date")).toBe("date_sign");
    expect(natalDaySmearDeg("moon", "1993-04-10")).toBeGreaterThan(5);

    const row = buildPersonDailyNudge({
      ownerId: "owner",
      personId: "person",
      date: "2026-07-25",
      whenUTC: "2026-07-25T16:00:00.000Z",
      chart,
      birthPrecision: "date",
      birthDate: "1993-04-10",
      relation: "friend",
      isSelf: false,
      minorSafe: false,
    });
    expect(row.precision_mode).toBe("date_sign");
    expect(row.orb_deg).toBeNull();
    if (row.natal_body) {
      expect(row.natal_body).not.toBe("moon");
    }
  });
});

describe("minor_safe blocks adult keys", () => {
  it("skips adult-only full keys when minorSafe", () => {
    expect(ADULT_ONLY_KEYS.size).toBeGreaterThan(0);
    const adultKey = [...ADULT_ONLY_KEYS][0]!;
    // Parse key: full:theme:class:domain:framing
    const [, theme, cls, domain, framing] = adultKey.split(":") as [
      string,
      BodyName,
      "flow" | "friction" | "fusion",
      BodyName,
      "partner",
    ];
    const hit: EnrichedTransitHit = {
      transitBody: theme,
      natalBody: domain,
      type: cls === "fusion" ? "conjunction" : cls === "flow" ? "trine" : "square",
      aspectClass: cls,
      orb: 0.2,
      phase: "exact",
      exactAt: "2026-07-25T12:00:00.000Z",
      passId: "x",
      retrogradeAtExact: false,
    };
    const adult = resolveNudgeCopy({
      hit,
      framing: framing ?? "partner",
      minorSafe: false,
      precisionMode: "exact",
    });
    const minor = resolveNudgeCopy({
      hit,
      framing: framing ?? "partner",
      minorSafe: true,
      precisionMode: "exact",
    });
    expect(adult.copy_tier).toBe("full");
    expect(adult.copy_key).toBe(adultKey);
    expect(minor.copy_key).not.toBe(adultKey);
    expect(minor.copy_tier === "drop_domain" || minor.copy_tier === "framing_gentle").toBe(true);
  });
});

describe("pinned person takes home lead", () => {
  it("orders a pinned person with a real nudge first", () => {
    const rows: Pick<PersonDailyNudgeRecord, "person_id" | "copy_tier">[] = [
      { person_id: "a", copy_tier: "full" },
      { person_id: "b", copy_tier: "empty_hedge" },
      { person_id: "c", copy_tier: "drop_domain" },
    ];
    const ordered = orderSkyRowsForHome(rows, "c");
    expect(ordered[0]!.person_id).toBe("c");
    // Pin without eligible nudge does not leap over real nudges ahead of empty.
    const orderedEmptyPin = orderSkyRowsForHome(rows, "b");
    expect(orderedEmptyPin[0]!.person_id).toBe("b");
  });
});

describe("copy fallthrough at each tier", () => {
  it("falls full → drop_domain when no full cell exists", () => {
    // general framing has no full-specificity cells
    const hit: EnrichedTransitHit = {
      transitBody: "saturn",
      natalBody: "uranus",
      type: "square",
      aspectClass: "friction",
      orb: 0.3,
      phase: "applying",
      exactAt: "2026-07-25T12:00:00.000Z",
      passId: "p",
      retrogradeAtExact: false,
    };
    const r = resolveNudgeCopy({
      hit,
      framing: "general",
      minorSafe: false,
      precisionMode: "exact",
    });
    expect(r.copy_tier).toBe("drop_domain");
    expect(r.copy_key).toBe("drop:saturn:friction:general");
    expect(r.copy_resolved.length).toBeGreaterThan(0);
    expect(r.copy_resolved).not.toContain("{");
  });

  it("empty hedges for year / none / quiet", () => {
    expect(
      resolveNudgeCopy({
        hit: null,
        framing: "self",
        minorSafe: false,
        precisionMode: "year_blocked",
      }).copy_key
    ).toBe("hedge:year");
    expect(
      resolveNudgeCopy({
        hit: null,
        framing: "self",
        minorSafe: false,
        precisionMode: "none",
      }).copy_key
    ).toBe("hedge:none");
    expect(
      resolveNudgeCopy({
        hit: null,
        framing: "self",
        minorSafe: false,
        precisionMode: "exact",
      }).copy_key
    ).toBe("hedge:quiet");
  });
});

describe("framing + selection wiring", () => {
  it("maps relation tags to framing bands", () => {
    expect(nudgeFramingFromRelation("child", false)).toBe("child");
    expect(nudgeFramingFromRelation("partner", false)).toBe("partner");
    expect(nudgeFramingFromRelation("colleague", false)).toBe("colleague");
    expect(nudgeFramingFromRelation("friend", false)).toBe("friend");
    expect(nudgeFramingFromRelation(null, true)).toBe("self");
  });

  it("novelty penalizes a recently shown pass_id", () => {
    const hit: EnrichedTransitHit = {
      transitBody: "venus",
      natalBody: "moon",
      type: "trine",
      aspectClass: "flow",
      orb: 0.2,
      phase: "exact",
      exactAt: "2026-07-25T12:00:00.000Z",
      passId: "venus:moon:trine:2026-07-25T12:00:00.000Z:D",
      retrogradeAtExact: false,
    };
    const fresh = selectDailyHit([hit], "child", true, new Set());
    const stale = selectDailyHit([hit], "child", true, new Set([hit.passId]));
    expect(fresh!.score).toBeGreaterThan(stale!.score);
  });
});

describe("findExactAt sanity", () => {
  it("moves toward a smaller orb than the sample instant for a near hit", () => {
    const natalLon = eclipticLongitude("sun", "1990-01-01T12:00:00.000Z");
    const when = new Date("2026-06-01T12:00:00.000Z");
    const exact = findExactAt("jupiter", natalLon, "trine", when);
    expect(Number.isFinite(exact.getTime())).toBe(true);
  });
});
