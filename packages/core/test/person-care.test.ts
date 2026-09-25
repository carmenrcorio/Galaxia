import { describe, expect, it } from "vitest";
import {
  buildPersonPageGroups,
  buildPersonPageNavSections,
  groupForPersonSection,
  PERSON_GROUP_LABEL,
  PERSON_TAB_LABEL,
  PERSON_TAB_VOCAB,
  resolvePersonPageEntry,
  isTodaySection,
  type PersonGroupKey,
  isMinorForSafety,
  livingAffectedForThisWeek,
  passedPersonIds,
  peopleForThisWeek,
  peopleForTodaySky,
  shouldShowLiveTransits,
  thisWeekRowsFromStored,
} from "../src/index";

const NOW = new Date("2026-07-12T00:00:00.000Z");

describe("shouldShowLiveTransits — care gate (person page + home sky)", () => {
  it("hides live/current transit surfaces for a passed person", () => {
    expect(shouldShowLiveTransits({ passed_at: "2024-11-02T00:00:00.000Z" })).toBe(false);
    expect(shouldShowLiveTransits({ passed_at: "2026-07-12T15:00:00.000Z" })).toBe(false);
  });

  it("allows live transit surfaces for living people", () => {
    expect(shouldShowLiveTransits({ passed_at: null })).toBe(true);
    expect(shouldShowLiveTransits({ passed_at: undefined })).toBe(true);
    expect(shouldShowLiveTransits({})).toBe(true);
  });

  it("returns false for null/undefined person", () => {
    expect(shouldShowLiveTransits(null)).toBe(false);
    expect(shouldShowLiveTransits(undefined)).toBe(false);
  });
});

describe("peopleForTodaySky — home care hole", () => {
  it("excludes passed people from sky rows and leaves living (incl. self)", () => {
    const people = [
      { id: "self", display_name: "Me", passed_at: null },
      { id: "living", display_name: "Sam", passed_at: null },
      { id: "gone", display_name: "Rosa", passed_at: "2024-11-02T00:00:00.000Z" },
    ];
    const sky = peopleForTodaySky(people);
    expect(sky.map((p) => p.id)).toEqual(["self", "living"]);
    expect(sky.some((p) => p.id === "gone")).toBe(false);
  });

  it("returns empty when every person is passed", () => {
    expect(
      peopleForTodaySky([
        { id: "a", passed_at: "2020-01-01T00:00:00.000Z" },
        { id: "b", passed_at: "2021-01-01T00:00:00.000Z" },
      ])
    ).toEqual([]);
  });
});

describe("peopleForThisWeek — same living-only care hole as Today", () => {
  const people = [
    { id: "self", display_name: "Carmen", passed_at: null },
    { id: "living", display_name: "Jasmine", passed_at: null },
    { id: "gone", display_name: "Hubbs", passed_at: "2024-11-02T00:00:00.000Z" },
  ];

  it("excludes passed people and leaves living (incl. self)", () => {
    expect(peopleForThisWeek(people).map((p) => p.id)).toEqual(["self", "living"]);
  });

  it("is the same filter as peopleForTodaySky", () => {
    expect(peopleForThisWeek(people)).toEqual(peopleForTodaySky(people));
  });

  it("passedPersonIds is only the memorial set", () => {
    expect([...passedPersonIds(people)]).toEqual(["gone"]);
    expect(passedPersonIds([{ id: "a", passed_at: null }]).size).toBe(0);
  });
});

describe("livingAffectedForThisWeek / thisWeekRowsFromStored — stored row care gate", () => {
  const jasmine = { profile_id: "living", profile_name: "Jasmine", natal_body: "saturn" };
  const carmen = { profile_id: "self", profile_name: "Carmen", natal_body: "venus" };
  const hubbs = { profile_id: "gone", profile_name: "Hubbs", natal_body: "saturn" };
  const passed = new Set(["gone"]);

  it("keeps a three-person event and drops the memorial name", () => {
    const living = livingAffectedForThisWeek([jasmine, carmen, hubbs], passed);
    expect(living?.map((a) => a.profile_id)).toEqual(["living", "self"]);
  });

  it("drops an event that is no longer relational after memorial exclusion", () => {
    expect(livingAffectedForThisWeek([jasmine, hubbs], passed)).toBeNull();
    expect(livingAffectedForThisWeek([hubbs], passed)).toBeNull();
    expect(livingAffectedForThisWeek([], passed)).toBeNull();
  });

  it("keeps a living-only pair unchanged", () => {
    const living = livingAffectedForThisWeek([jasmine, carmen], passed);
    expect(living).toEqual([jasmine, carmen]);
  });

  it("thisWeekRowsFromStored rewrites affected_profiles and drops collapsed events", () => {
    const rows = [
      { id: "keep", affected_profiles: [jasmine, carmen, hubbs] },
      { id: "drop", affected_profiles: [jasmine, hubbs] },
      { id: "living", affected_profiles: [jasmine, carmen] },
    ];
    const visible = thisWeekRowsFromStored(rows, passed);
    expect(visible.map((r) => r.id)).toEqual(["keep", "living"]);
    expect(visible[0]?.affected_profiles.map((a) => a.profile_name)).toEqual(["Jasmine", "Carmen"]);
    expect(visible.some((r) => r.affected_profiles.some((a) => a.profile_id === "gone"))).toBe(false);
  });

  it("drops a remembered sibling from a three-person This Week card", () => {
    const daddy = { profile_id: "daddy", profile_name: "Daddy" };
    const stevie = { profile_id: "stevie", profile_name: "Stevie" };
    const gabriel = { profile_id: "gabriel", profile_name: "Gabriel" };
    const living = livingAffectedForThisWeek([daddy, stevie, gabriel], new Set(["stevie"]));
    expect(living?.map((a) => a.profile_name)).toEqual(["Daddy", "Gabriel"]);
    expect(living?.some((a) => a.profile_id === "stevie")).toBe(false);
  });
});

describe("buildPersonPageNavSections — nav syncs with rendered sections", () => {
  it("omits Active today for a passed person (no dead transit anchor)", () => {
    const nav = buildPersonPageNavSections({
      hasRemembrance: true,
      hasTimeline: true,
      hasActiveToday: false,
      hasVelaOnThem: true,
      hasWheel: true,
      hasBigThree: true,
      hasPlacements: true,
      hasAspects: true,
      hasHouses: true,
      hasGenerational: true,
      hasRecord: true,
      hasPastConversations: false,
      hasHonorBox: true,
    });
    expect(nav.map((s) => s.id)).not.toContain("active-today");
    expect(nav.map((s) => s.id)).toContain("honor-light");
    expect(nav.map((s) => s.id)).toContain("remembrance");
    expect(nav.map((s) => s.id)).toContain("memorial-timeline");
    expect(nav[nav.length - 1]?.id).toBe("honor-light");
  });

  it("includes Active today only when that section actually renders", () => {
    const withTransit = buildPersonPageNavSections({
      hasRemembrance: false,
      hasTimeline: false,
      hasActiveToday: true,
      hasVelaOnThem: true,
      hasWheel: true,
      hasBigThree: true,
      hasPlacements: true,
      hasAspects: false,
      hasHouses: false,
      hasGenerational: true,
      hasRecord: true,
      hasPastConversations: false,
      hasHonorBox: false,
    });
    expect(withTransit.map((s) => s.id)).toContain("active-today");
    expect(withTransit.map((s) => s.id)).not.toContain("honor-light");
    expect(withTransit.map((s) => s.id)).not.toContain("aspects");
    expect(withTransit.map((s) => s.id)).not.toContain("houses");
    expect(withTransit.map((s) => s.id)).not.toContain("memorial-timeline");
  });

  it("includes Timeline only for a passed profile with a real chart (never alongside Active today)", () => {
    const withTimeline = buildPersonPageNavSections({
      hasRemembrance: true,
      hasTimeline: true,
      hasActiveToday: false,
      hasVelaOnThem: true,
      hasWheel: true,
      hasBigThree: true,
      hasPlacements: true,
      hasAspects: true,
      hasHouses: true,
      hasGenerational: true,
      hasRecord: true,
      hasPastConversations: false,
      hasHonorBox: true,
    });
    expect(withTimeline.map((s) => s.id)).toContain("memorial-timeline");
    // Timeline sits right after Remembrance in the nav order.
    const remIdx = withTimeline.findIndex((s) => s.id === "remembrance");
    const timelineIdx = withTimeline.findIndex((s) => s.id === "memorial-timeline");
    expect(timelineIdx).toBe(remIdx + 1);
  });

  it("produces zero dead links — every id corresponds to a known section anchor", () => {
    const known = new Set([
      "remembrance",
      "memorial-timeline",
      "active-today",
      "vela-on-them",
      "chart-wheel",
      "big-three",
      "placements",
      "aspects",
      "houses",
      "generational",
      "notes",
      "past-conversations",
      "honor-light",
    ]);
    const nav = buildPersonPageNavSections({
      hasRemembrance: true,
      hasTimeline: true,
      hasActiveToday: true,
      hasVelaOnThem: true,
      hasWheel: true,
      hasBigThree: true,
      hasPlacements: true,
      hasAspects: true,
      hasHouses: true,
      hasGenerational: true,
      hasRecord: true,
      hasPastConversations: true,
      hasHonorBox: true,
    });
    for (const s of nav) {
      expect(known.has(s.id)).toBe(true);
    }
    expect(nav).toHaveLength(13);
  });

  it("uses founder-review tab labels and keeps the old vocabulary as section ids", () => {
    const nav = buildPersonPageNavSections({
      hasRemembrance: false,
      hasTimeline: false,
      hasActiveToday: true,
      hasVelaOnThem: true,
      hasWheel: true,
      hasBigThree: true,
      hasPlacements: true,
      hasAspects: true,
      hasHouses: true,
      hasGenerational: true,
      hasRecord: true,
      hasPastConversations: true,
      hasHonorBox: false,
    });
    expect(nav).toEqual([
      { id: "active-today", label: "Right now" },
      { id: "vela-on-them", label: "Ask about them" },
      { id: "chart-wheel", label: "Chart wheel" },
      { id: "big-three", label: "What they need" },
      { id: "placements", label: "How they are wired" },
      { id: "aspects", label: "Where they pull" },
      { id: "houses", label: "Where it shows up" },
      { id: "generational", label: "Their generation" },
      { id: "notes", label: "Your record" },
      { id: "past-conversations", label: "Earlier answers" },
    ]);
    expect(PERSON_TAB_LABEL.placements).toBe("How they are wired");
    expect(PERSON_TAB_VOCAB.placements).toBe("Placements");
    expect(PERSON_TAB_VOCAB.aspects).toBe("Aspects");
    expect(PERSON_TAB_VOCAB.houses).toBe("Houses");
    expect(PERSON_TAB_VOCAB["big-three"]).toBe("Big three");
  });

  // Voice-layers (#236) pin Wheel / Placements / Aspects / Houses as the
  // inner-layer chart terms. Chip chrome uses PERSON_TAB_LABEL (this PR);
  // the four terms stay on PERSON_TAB_VOCAB as in-section subheads.
  it("keeps Wheel, Placements, Aspects, and Houses as the inner-voice chart vocab", () => {
    expect(PERSON_TAB_VOCAB["chart-wheel"]).toBe("Wheel");
    expect(PERSON_TAB_VOCAB.placements).toBe("Placements");
    expect(PERSON_TAB_VOCAB.aspects).toBe("Aspects");
    expect(PERSON_TAB_VOCAB.houses).toBe("Houses");
  });
});

const LIVING_FLAGS = {
  hasRemembrance: false,
  hasTimeline: false,
  hasActiveToday: true,
  hasVelaOnThem: true,
  hasWheel: true,
  hasBigThree: true,
  hasPlacements: true,
  hasAspects: true,
  hasHouses: true,
  hasGenerational: true,
  hasRecord: true,
  hasPastConversations: true,
  hasHonorBox: false,
} as const;

const MEMORIAL_FLAGS = {
  hasRemembrance: true,
  hasTimeline: true,
  hasActiveToday: false,
  hasVelaOnThem: false,
  hasWheel: true,
  hasBigThree: true,
  hasPlacements: true,
  hasAspects: true,
  hasHouses: true,
  hasGenerational: true,
  hasRecord: true,
  hasPastConversations: true,
  hasHonorBox: true,
} as const;

describe("person profile groups", () => {
  it("names the four groups in founder-approved copy", () => {
    expect(PERSON_GROUP_LABEL).toEqual({
      now: "Today",
      them: "Who they are",
      yours: "You and them",
      remembrance: "Remembrance",
    });
  });

  it("buckets a living profile into Who they are and You and them, with Today off the strip", () => {
    const groups = buildPersonPageGroups({ ...LIVING_FLAGS, isMemorial: false });
    expect(groups.map((g) => g.key)).toEqual(["them", "yours"]);
    expect(groups.map((g) => g.label)).toEqual(["Who they are", "You and them"]);
    expect(groups.find((g) => g.key === "now")).toBeUndefined();
    expect(groups.find((g) => g.key === "them")?.sections.map((s) => s.id)).toEqual([
      "big-three",
      "chart-wheel",
      "placements",
      "aspects",
      "houses",
      "generational",
    ]);
    expect(groups.find((g) => g.key === "yours")?.sections.map((s) => s.id)).toEqual([
      "notes",
      "past-conversations",
    ]);
  });

  it("treats Today hashes as always-visible, not a selected group", () => {
    expect(isTodaySection("active-today")).toBe(true);
    expect(isTodaySection("vela-on-them")).toBe(true);
    expect(isTodaySection("notes")).toBe(false);
  });

  it("replaces Yours with Remembrance on a memorial profile", () => {
    const groups = buildPersonPageGroups({ ...MEMORIAL_FLAGS, isMemorial: true });
    expect(groups.map((g) => g.key)).toEqual(["them", "remembrance"]);
    expect(groups.find((g) => g.key === "yours")).toBeUndefined();
    expect(groups.find((g) => g.key === "now")).toBeUndefined();
    expect(groups.find((g) => g.key === "remembrance")?.sections.map((s) => s.id)).toEqual([
      "remembrance",
      "memorial-timeline",
      "honor-light",
      "notes",
      "past-conversations",
    ]);
  });

  it("maps every known hash to its parent group", () => {
    expect(groupForPersonSection("active-today", false)).toBe("now");
    expect(groupForPersonSection("vela-on-them", false)).toBe("now");
    expect(groupForPersonSection("big-three", false)).toBe("them");
    expect(groupForPersonSection("placements", false)).toBe("them");
    expect(groupForPersonSection("aspects", false)).toBe("them");
    expect(groupForPersonSection("houses", false)).toBe("them");
    expect(groupForPersonSection("generational", false)).toBe("them");
    expect(groupForPersonSection("chart-wheel", false)).toBe("them");
    expect(groupForPersonSection("notes", false)).toBe("yours");
    expect(groupForPersonSection("past-conversations", false)).toBe("yours");
    expect(groupForPersonSection("remembrance", true)).toBe("remembrance");
    expect(groupForPersonSection("memorial-timeline", true)).toBe("remembrance");
    expect(groupForPersonSection("honor-light", true)).toBe("remembrance");
    expect(groupForPersonSection("notes", true)).toBe("remembrance");
    expect(groupForPersonSection("past-conversations", true)).toBe("remembrance");
  });
});

describe("resolvePersonPageEntry", () => {
  const living = buildPersonPageGroups({ ...LIVING_FLAGS, isMemorial: false });
  const emptyNow = buildPersonPageGroups({ ...LIVING_FLAGS, hasActiveToday: false, isMemorial: false });
  const memorial = buildPersonPageGroups({ ...MEMORIAL_FLAGS, isMemorial: true });

  it("defaults to Who they are even when Today has a live sky note", () => {
    expect(
      resolvePersonPageEntry({
        hash: null,
        transit: null,
        hasActiveToday: true,
        isMemorial: false,
        groups: living,
      })
    ).toEqual({ group: "them", sectionId: null });
  });

  it("defaults to Them when Now has no active content today", () => {
    expect(
      resolvePersonPageEntry({
        hash: "",
        transit: null,
        hasActiveToday: false,
        isMemorial: false,
        groups: emptyNow,
      })
    ).toEqual({ group: "them", sectionId: null });
  });

  it("resolves ?transit=1 to Who they are scrolled to #active-today", () => {
    expect(
      resolvePersonPageEntry({
        hash: null,
        transit: "1",
        hasActiveToday: true,
        isMemorial: false,
        groups: living,
      })
    ).toEqual({ group: "them", sectionId: "active-today" });
  });

  it("lets a section hash win over ?transit=1", () => {
    expect(
      resolvePersonPageEntry({
        hash: "#placements",
        transit: "1",
        hasActiveToday: true,
        isMemorial: false,
        groups: living,
      })
    ).toEqual({ group: "them", sectionId: "placements" });
  });

  it("opens the parent group for each of the thirteen bookmarkable hashes", () => {
    const livingCases: Array<[string, PersonGroupKey]> = [
      ["active-today", "them"],
      ["vela-on-them", "them"],
      ["chart-wheel", "them"],
      ["big-three", "them"],
      ["placements", "them"],
      ["aspects", "them"],
      ["houses", "them"],
      ["generational", "them"],
      ["notes", "yours"],
      ["past-conversations", "yours"],
    ];
    for (const [id, group] of livingCases) {
      expect(
        resolvePersonPageEntry({
          hash: `#${id}`,
          transit: null,
          hasActiveToday: true,
          isMemorial: false,
          groups: living,
        })
      ).toEqual({ group, sectionId: id });
    }
    for (const id of ["remembrance", "memorial-timeline", "honor-light"] as const) {
      expect(
        resolvePersonPageEntry({
          hash: `#${id}`,
          transit: null,
          hasActiveToday: false,
          isMemorial: true,
          groups: memorial,
        })
      ).toEqual({ group: "remembrance", sectionId: id });
    }
  });
});

describe("passed minor still minor (care does not strip safety)", () => {
  it("isMinorForSafety ignores passed_at", () => {
    expect(
      isMinorForSafety(
        {
          isMinor: true,
          birthDate: "2015-03-01",
          birthPrecision: "date",
        },
        NOW
      )
    ).toBe(true);
    expect(
      isMinorForSafety(
        {
          isMinor: false,
          birthDate: "2018-06-15",
          birthPrecision: "date",
        },
        NOW
      )
    ).toBe(true);
  });
});
