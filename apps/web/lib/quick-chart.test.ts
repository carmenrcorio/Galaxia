// @vitest-environment jsdom

import { describe, expect, it, afterEach } from "vitest";
import type { BirthFormInput } from "@galaxia/astro";
import { CHART_MODE_COMPARE } from "./nav-links";
import {
  birthQueryToSearchParams,
  buildComparePrefillHref,
  chartCompareCtaHeadline,
  CHART_COMPARE_CTA_LABEL,
  COMPARE_PREFILL_NAME_KEY,
  decodeBirthQuery,
  stashComparePrefillName,
  takeComparePrefillName,
} from "./quick-chart";

const ADA: BirthFormInput = {
  precision: "date",
  month: 6,
  day: 15,
  year: 1990,
  hour: undefined,
  minute: undefined,
  yearOnly: undefined,
  birthPlace: "New York",
  lat: "40.7",
  lng: "-74",
  tzOffsetMin: -300,
  tzId: "America/New_York",
};

afterEach(() => {
  sessionStorage.clear();
});

describe("buildComparePrefillHref", () => {
  it("encodes the current person as Person A on /chart/compare", () => {
    const href = buildComparePrefillHref(ADA);
    expect(href.startsWith(`${CHART_MODE_COMPARE.href}?`)).toBe(true);
    const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    expect(decodeBirthQuery(params, "a_")).toEqual(ADA);
    expect(decodeBirthQuery(params, "b_")).toBeNull();
    expect(href).not.toMatch(/name/i);
  });

  it("falls back to the bare compare route when there is nothing to encode", () => {
    const empty: BirthFormInput = {
      precision: "date",
      month: undefined,
      day: undefined,
      year: undefined,
      hour: undefined,
      minute: undefined,
      yearOnly: undefined,
      birthPlace: "",
      lat: "",
      lng: "",
    };
    const href = buildComparePrefillHref(empty);
    expect(href.startsWith(`${CHART_MODE_COMPARE.href}?`)).toBe(true);
    const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    expect(params.get("a_pr")).toBe("date");
    expect(decodeBirthQuery(params, "a_")).toBeNull();
  });

  it("round-trips the same encoding as a share-link a_ prefix", () => {
    const href = buildComparePrefillHref(ADA);
    const fromHref = new URLSearchParams(href.slice(href.indexOf("?") + 1));
    const direct = birthQueryToSearchParams(ADA, "a_");
    expect(fromHref.toString()).toBe(direct.toString());
  });
});

describe("compare prefill name stash", () => {
  it("stores a trimmed name and clears it on take", () => {
    stashComparePrefillName("  Ada  ");
    expect(sessionStorage.getItem(COMPARE_PREFILL_NAME_KEY)).toBe("Ada");
    expect(takeComparePrefillName()).toBe("Ada");
    expect(takeComparePrefillName()).toBeNull();
    expect(sessionStorage.getItem(COMPARE_PREFILL_NAME_KEY)).toBeNull();
  });

  it("clears a previous name when the next chart is nameless", () => {
    stashComparePrefillName("Ada");
    stashComparePrefillName("   ");
    expect(takeComparePrefillName()).toBeNull();
  });
});

describe("chartCompareCtaHeadline", () => {
  it("names the person when one was typed", () => {
    expect(chartCompareCtaHeadline("Ada")).toBe(
      "Now see how Ada connects with someone in your life",
    );
  });

  it("falls back when the name field is empty", () => {
    expect(chartCompareCtaHeadline("")).toBe(
      "Now see how this chart connects with someone in your life",
    );
    expect(chartCompareCtaHeadline()).toBe(
      "Now see how this chart connects with someone in your life",
    );
  });

  it("is the approved post-generation button label", () => {
    expect(CHART_COMPARE_CTA_LABEL).toBe("Compare with someone");
  });
});
