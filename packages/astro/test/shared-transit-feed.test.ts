import { describe, expect, it } from "vitest";
import { computeNatalChart } from "../src/index";
import {
  applySharedTransitNovelty,
  assembleSharedWeekFeed,
  buildSharedWeekFeed,
  collapseEnumeratedSharedCards,
  mergeShownSharedTransits,
  pairEventsFromCollapsedCards,
  renderSharedTransitCopy,
  scoreSharedTransitSalience,
  sharedTransitCanonicalId,
  synastryLinkForLongitudes,
  WEEKLY_FEED_LIMIT,
  type EnumeratedSharedCard,
  type SharedTransitEvent,
  type SharedTransitHit,
} from "../src/shared-transit";

/**
 * Live /app/this-week snapshot, 2026-09-27. Seven cards, about four
 * astronomical events. Names are the ones on the captured cards.
 */
const FIXTURE: EnumeratedSharedCard[] = [
  {
    transiting: "saturn",
    aspect: "trine",
    members: [
      { personId: "hubs", personName: "Hubs", natalPoint: "saturn", orb: 0.4, applying: true, exactAt: "2026-09-28T00:00:00.000Z", transitingSpeed: 0.033 },
      { personId: "jasmine", personName: "Jasmine", natalPoint: "saturn", orb: 0.55, applying: true, exactAt: "2026-09-30T00:00:00.000Z", transitingSpeed: 0.033 },
      { personId: "carmen", personName: "Carmen Sofia", natalPoint: "venus", orb: 0.8, applying: false, exactAt: "2026-09-20T00:00:00.000Z", transitingSpeed: 0.033 },
    ],
  },
  {
    transiting: "jupiter",
    aspect: "trine",
    members: [
      { personId: "gabriel", personName: "Gabriel", natalPoint: "jupiter", orb: 0.3, applying: true, exactAt: "2026-09-29T00:00:00.000Z", transitingSpeed: 0.08 },
      { personId: "daddy", personName: "Daddy", natalPoint: "neptune", orb: 0.5, applying: true, exactAt: "2026-10-02T00:00:00.000Z", transitingSpeed: 0.08 },
      { personId: "camila", personName: "Camila", natalPoint: "mars", orb: 0.7, applying: false, exactAt: "2026-09-18T00:00:00.000Z", transitingSpeed: 0.08 },
    ],
  },
  {
    transiting: "jupiter",
    aspect: "square",
    members: [
      { personId: "carmen", personName: "Carmen Sofia", natalPoint: "jupiter", orb: 0.2, applying: true, exactAt: "2026-09-27T12:00:00.000Z", transitingSpeed: 0.08 },
      { personId: "hubs", personName: "Hubs", natalPoint: "moon", orb: 0.45, applying: true, exactAt: "2026-09-28T00:00:00.000Z", transitingSpeed: 0.08 },
    ],
  },
  {
    transiting: "jupiter",
    aspect: "trine",
    members: [
      { personId: "daddy", personName: "Daddy", natalPoint: "neptune", orb: 0.5, applying: true, exactAt: "2026-10-02T00:00:00.000Z", transitingSpeed: 0.08 },
      { personId: "gabriel", personName: "Gabriel", natalPoint: "jupiter", orb: 0.35, applying: true, exactAt: "2026-09-29T00:00:00.000Z", transitingSpeed: 0.08 },
    ],
  },
  {
    transiting: "jupiter",
    aspect: "trine",
    members: [
      { personId: "camila", personName: "Camila", natalPoint: "mercury", orb: 0.25, applying: true, exactAt: "2026-09-27T18:00:00.000Z", transitingSpeed: 0.08 },
      { personId: "carmen", personName: "Carmen Sofia", natalPoint: "mercury", orb: 0.4, applying: true, exactAt: "2026-09-28T06:00:00.000Z", transitingSpeed: 0.08 },
    ],
  },
  {
    transiting: "saturn",
    aspect: "trine",
    members: [
      { personId: "carmen", personName: "Carmen Sofia", natalPoint: "venus", orb: 0.8, applying: false, exactAt: "2026-09-20T00:00:00.000Z", transitingSpeed: 0.033 },
      { personId: "hubs", personName: "Hubs", natalPoint: "saturn", orb: 0.4, applying: true, exactAt: "2026-09-28T00:00:00.000Z", transitingSpeed: 0.033 },
    ],
  },
  {
    transiting: "jupiter",
    aspect: "square",
    members: [
      { personId: "hubs", personName: "Hubs", natalPoint: "moon", orb: 0.5, applying: true, exactAt: "2026-09-28T00:00:00.000Z", transitingSpeed: 0.08 },
      { personId: "carmen", personName: "Carmen Sofia", natalPoint: "jupiter", orb: 0.2, applying: true, exactAt: "2026-09-27T12:00:00.000Z", transitingSpeed: 0.08 },
    ],
  },
];

const BANNED = "something is moving more easily between you right now";

function hit(partial: Partial<SharedTransitHit> & Pick<SharedTransitHit, "personId" | "natalPoint" | "natalLon" | "transiting" | "aspect">): SharedTransitHit {
  return {
    personName: partial.personId,
    natalSign: "Aries",
    orb: 0.4,
    applying: true,
    exactAt: "2026-09-28T00:00:00.000Z",
    transitingSpeed: 0.5,
    ...partial,
  };
}

describe("WS-A canonical id, dedup, subset suppression", () => {
  it("gives a reordered pair the same id", () => {
    const square = FIXTURE[2]!;
    const reordered = FIXTURE[6]!;
    expect(sharedTransitCanonicalId(square.transiting, square.aspect, square.members)).toBe(
      sharedTransitCanonicalId(reordered.transiting, reordered.aspect, reordered.members)
    );
  });

  it("collapses the 7-card snapshot to 4 distinct events before ranking", () => {
    const collapsed = collapseEnumeratedSharedCards(FIXTURE);
    expect(collapsed.length).toBeLessThanOrEqual(4);
    expect(collapsed).toHaveLength(4);
    const ids = collapsed.map((card) => sharedTransitCanonicalId(card.transiting, card.aspect, card.members));
    expect(new Set(ids).size).toBe(ids.length);
    for (const card of collapsed) {
      const keys = new Set(card.members.map((member) => `${member.personId}:${member.natalPoint}`));
      const subsetOfAnother = collapsed.some((other) => {
        if (other === card) return false;
        if (other.transiting !== card.transiting || other.aspect !== card.aspect) return false;
        if (other.members.length <= card.members.length) return false;
        const parent = new Set(other.members.map((member) => `${member.personId}:${member.natalPoint}`));
        return [...keys].every((key) => parent.has(key));
      });
      expect(subsetOfAnother).toBe(false);
    }
  });
});

describe("WS-B genuinely shared classifier", () => {
  it("rejects an incidental co-transit whose natal points do not aspect", () => {
    expect(synastryLinkForLongitudes(10, 25)).toBeNull();
    const hits = [
      hit({ personId: "a", natalPoint: "venus", natalLon: 10, transiting: "saturn", aspect: "trine", personName: "Ada" }),
      hit({ personId: "b", natalPoint: "mars", natalLon: 25, transiting: "saturn", aspect: "trine", personName: "Bo" }),
    ];
    const feed = assembleSharedWeekFeed(hits, [
      { id: "a", name: "Ada", chart: { placements: [], precision: "exact", generational: emptyGen() }, isSelf: true },
      { id: "b", name: "Bo", chart: { placements: [], precision: "exact", generational: emptyGen() }, relation: "friend" },
    ], "2026-09-27T12:00:00.000Z");
    expect(feed.weekly).toEqual([]);
    expect(feed.individual.map((row) => row.personId).sort()).toEqual(["a", "b"]);
  });

  it("keeps a pair whose natal points aspect within 3 degrees", () => {
    const link = synastryLinkForLongitudes(10, 10.8);
    expect(link?.aspectBetweenNatalPoints).toBe("conjunction");
    expect(link!.orb).toBeLessThanOrEqual(3);
    const hits = [
      hit({ personId: "a", natalPoint: "venus", natalLon: 10, transiting: "mars", aspect: "trine", personName: "Ada", transitingSpeed: 0.5 }),
      hit({ personId: "b", natalPoint: "mars", natalLon: 10.8, transiting: "mars", aspect: "trine", personName: "Bo", transitingSpeed: 0.5 }),
    ];
    const feed = assembleSharedWeekFeed(hits, [
      { id: "a", name: "Ada", chart: { placements: [], precision: "exact", generational: emptyGen() }, isSelf: true, relation: "self" },
      { id: "b", name: "Bo", chart: { placements: [], precision: "exact", generational: emptyGen() }, relation: "partner" },
    ], "2026-09-27T12:00:00.000Z");
    expect(feed.weekly).toHaveLength(1);
    expect(feed.weekly[0]!.kind).toBe("relational");
    expect(feed.weekly[0]!.members).toHaveLength(2);
    expect(feed.weekly[0]!.synastryLink?.aspectBetweenNatalPoints).toBe("conjunction");
    expect(feed.weekly[0]!.relationshipRole).toBe("partners");
    expect(feed.individual).toEqual([]);
  });
});

describe("WS-C salience, cadence, novelty", () => {
  it("leads with the tighter fast body when a slow body is similarly close", () => {
    const fast = relational([
      hit({ personId: "a", natalPoint: "venus", natalLon: 0, transiting: "mars", aspect: "trine", orb: 0.4, transitingSpeed: 0.52, personName: "Ada" }),
      hit({ personId: "b", natalPoint: "venus", natalLon: 1, transiting: "mars", aspect: "trine", orb: 0.45, transitingSpeed: 0.52, personName: "Bo" }),
    ]);
    const slow = relational([
      hit({ personId: "a", natalPoint: "saturn", natalLon: 40, transiting: "saturn", aspect: "square", orb: 0.3, transitingSpeed: 0.033, personName: "Ada" }),
      hit({ personId: "b", natalPoint: "saturn", natalLon: 40.5, transiting: "saturn", aspect: "square", orb: 0.35, transitingSpeed: 0.033, personName: "Bo" }),
    ]);
    expect(scoreSharedTransitSalience(fast)).toBeGreaterThan(scoreSharedTransitSalience(slow));
    const feed = assembleSharedWeekFeed(
      [...fast.members, ...slow.members],
      people(),
      "2026-09-27T12:00:00.000Z"
    );
    expect(feed.weekly[0]!.transiting).toBe("mars");
    expect(feed.weekly.length).toBeLessThanOrEqual(WEEKLY_FEED_LIMIT);
    expect(feed.longArcs.some((event) => event.transiting === "saturn") || feed.weekly.some((event) => event.transiting === "saturn")).toBe(true);
  });

  it("does not re-surface an unchanged slow event shown yesterday", () => {
    const event = relational([
      hit({ personId: "a", natalPoint: "saturn", natalLon: 0, transiting: "saturn", aspect: "trine", transitingSpeed: 0.033, exactAt: "2026-09-28T00:00:00.000Z", personName: "Ada" }),
      hit({ personId: "b", natalPoint: "saturn", natalLon: 1, transiting: "saturn", aspect: "trine", transitingSpeed: 0.033, exactAt: "2026-09-28T00:00:00.000Z", personName: "Bo" }),
    ]);
    const seen = mergeShownSharedTransits([], [event], "2026-09-26");
    const again = applySharedTransitNovelty([event], seen, "2026-09-27");
    expect(again).toEqual([]);
    const moved = {
      ...event,
      members: event.members.map((member) => ({ ...member, exactAt: "2026-10-02T00:00:00.000Z" })),
    };
    expect(applySharedTransitNovelty([moved], seen, "2026-09-27")).toHaveLength(1);
    expect(applySharedTransitNovelty([event], seen, "2026-09-26")).toHaveLength(1);
  });
});

describe("WS-D copy", () => {
  it("is stable for an event id and never uses the generic topper", () => {
    const event = relational([
      hit({ personId: "a", natalPoint: "moon", natalLon: 0, natalSign: "Cancer", transiting: "jupiter", aspect: "square", personName: "Carmen Sofia", natalHouse: 4 }),
      hit({ personId: "b", natalPoint: "jupiter", natalLon: 1, natalSign: "Libra", transiting: "jupiter", aspect: "square", personName: "Hubs", natalHouse: 10 }),
    ]);
    event.relationshipRole = "partners";
    const first = renderSharedTransitCopy(event, "2026-09-27T12:00:00.000Z");
    const second = renderSharedTransitCopy(event, "2026-09-27T12:00:00.000Z");
    expect(first).toEqual(second);
    expect(first.lead).toContain("Jupiter");
    expect(first.lead).toContain("Carmen Sofia");
    expect(first.lead).toContain("Hubs");
    expect(first.lead).not.toContain(BANNED);
    expect(first.body).not.toContain(BANNED);
    expect(`${first.lead} ${first.body}`).not.toContain("\u2014");
    expect(`${first.lead} ${first.body}`).not.toMatch(/\ws's/);
  });

  it("uses a plural possessive and does not repeat an identical natal point", () => {
    const event = relational([
      hit({ personId: "camila", natalPoint: "mercury", natalLon: 0, transiting: "jupiter", aspect: "trine", personName: "Camila" }),
      hit({ personId: "carmen", natalPoint: "mercury", natalLon: 1, transiting: "jupiter", aspect: "trine", personName: "Carmen Sofia" }),
    ]);
    const hubs = relational([
      hit({ personId: "carmen", natalPoint: "jupiter", natalLon: 10, transiting: "jupiter", aspect: "square", personName: "Carmen Sofia" }),
      hit({ personId: "hubs", natalPoint: "moon", natalLon: 11, transiting: "jupiter", aspect: "square", personName: "Hubs" }),
    ]);
    const samePoint = renderSharedTransitCopy(event, "2026-09-27T12:00:00.000Z");
    const possessiveCopy = renderSharedTransitCopy(hubs, "2026-09-27T12:00:00.000Z");
    expect(`${samePoint.lead} ${samePoint.body}`).not.toContain("Mercury and Mercury");
    expect(`${samePoint.lead} ${samePoint.body}`).toContain("Mercuries");
    expect(`${possessiveCopy.lead} ${possessiveCopy.body}`).toContain("Hubs'");
    expect(`${possessiveCopy.lead} ${possessiveCopy.body}`).not.toContain("Hubs's");
  });
});

describe("section 0 fixture regression", () => {
  it("renders at most 4 distinct pair cards, top 3, with no duplicate sentences and no group of 3", () => {
    const collapsed = collapseEnumeratedSharedCards(FIXTURE);
    const events = pairEventsFromCollapsedCards(collapsed).map((event) => ({
      ...event,
      salience: scoreSharedTransitSalience(event),
      relationshipRole: "circle" as const,
    }));
    const shown = [...events].sort((a, b) => b.salience - a.salience || a.id.localeCompare(b.id)).slice(0, WEEKLY_FEED_LIMIT);
    expect(collapsed.length).toBeLessThanOrEqual(4);
    expect(shown.length).toBeLessThanOrEqual(WEEKLY_FEED_LIMIT);
    expect(shown.length).toBe(3);
    const sentences = new Set<string>();
    for (const event of shown) {
      expect(event.members.length).toBe(2);
      expect(event.members.length).toBeLessThan(3);
      const copy = renderSharedTransitCopy(event, "2026-09-27T12:00:00.000Z");
      expect(copy.lead.length).toBeGreaterThan(0);
      expect(sentences.has(copy.lead)).toBe(false);
      expect(sentences.has(copy.body)).toBe(false);
      sentences.add(copy.lead);
      sentences.add(copy.body);
      expect(copy.lead).not.toContain(BANNED);
      expect(copy.body).not.toContain(BANNED);
    }
  });
});

describe("buildSharedWeekFeed on real charts", () => {
  const chartA = computeNatalChart({ dateUTC: "1990-06-15T14:20:00.000Z", precision: "exact", lat: 40.7, lng: -74.0, tzOffsetMin: -240 });
  const chartB = computeNatalChart({ dateUTC: "1962-01-10T08:00:00.000Z", precision: "exact", lat: 41.8, lng: -87.6, tzOffsetMin: -360 });
  const chartC = computeNatalChart({ dateUTC: "1988-11-02T20:00:00.000Z", precision: "exact", lat: 34.0, lng: -118.2, tzOffsetMin: -480 });
  const people = [
    { id: "a", name: "Ada", chart: chartA, isSelf: true, relation: "self" },
    { id: "b", name: "Bo", chart: chartB, relation: "parent" },
    { id: "c", name: "Cy", chart: chartC, relation: "friend" },
  ];

  it("never emits a 3-person card, and every weekly card is a real synastry link", () => {
    const feed = buildSharedWeekFeed(people, "2022-07-15T12:00:00.000Z");
    expect(feed.weekly.length).toBeLessThanOrEqual(WEEKLY_FEED_LIMIT);
    for (const event of [...feed.weekly, ...feed.longArcs, ...feed.relational]) {
      expect(event.members).toHaveLength(2);
      expect(event.kind).toBe("relational");
      expect(event.synastryLink).toBeTruthy();
      expect(event.synastryLink!.orb).toBeLessThanOrEqual(3);
    }
    const ids = feed.weekly.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
    const again = buildSharedWeekFeed(people, "2022-07-15T12:00:00.000Z");
    expect(again.weekly.map((event) => event.id)).toEqual(ids);
  });
});

function emptyGen() {
  const planet = { sign: "Aries" as const, confident: true };
  return { uranus: planet, neptune: planet, pluto: planet, cohortLabel: "" };
}

function people() {
  return [
    { id: "a", name: "Ada", chart: { placements: [], precision: "exact" as const, generational: emptyGen() }, isSelf: true },
    { id: "b", name: "Bo", chart: { placements: [], precision: "exact" as const, generational: emptyGen() }, relation: "friend" },
  ];
}

function relational(members: SharedTransitHit[]): SharedTransitEvent {
  const ordered = [...members].sort((a, b) => (a.personId < b.personId ? -1 : 1));
  const event: SharedTransitEvent = {
    id: sharedTransitCanonicalId(ordered[0]!.transiting, ordered[0]!.aspect, ordered),
    kind: "relational",
    transiting: ordered[0]!.transiting,
    aspect: ordered[0]!.aspect,
    members: ordered,
    synastryLink: synastryLinkForLongitudes(ordered[0]!.natalLon, ordered[1]!.natalLon) ?? { aspectBetweenNatalPoints: "conjunction", orb: 1 },
    salience: 0,
    relationshipRole: "circle",
  };
  event.salience = scoreSharedTransitSalience(event);
  return event;
}
