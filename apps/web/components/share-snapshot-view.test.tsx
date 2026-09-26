// @vitest-environment jsdom

import { compareGenerational, computeNatalChart, computeSynastry, relationshipWatchLine, type NatalChart } from "@galaxia/astro";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SHARE_ADD_CTA,
  SHARE_COMPARE_CTA,
  SHARE_COMPARE_HINT,
  SHARE_GALAXIA_FRAME,
  SHARE_NEED_HEADING,
  SHARE_NO_GIFT_BIRTH,
  SHARE_SINGLE_LEDE,
  giftComparePath,
  sharePath,
} from "../lib/quick-share";
import { signupWithNextHref } from "../lib/nav-links";
import { ShareSnapshotView } from "./share-snapshot-view";

vi.mock("../lib/use-viewer", () => ({
  useViewer: () => ({ userId: null, isSubscriber: false }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

vi.mock("./chart-image-export", () => ({
  ChartImageExport: ({ children }: { children: unknown }) => <div>{children as never}</div>,
  chartExportFilename: () => "natal-chart.png",
}));

vi.mock("./chart-wheel", () => ({
  ChartWheel: () => <div>wheel</div>,
  COMPARE_WHEEL_NEEDS_HOUSES: "needs houses",
}));

vi.mock("./chart-pdf-export", () => ({ ChartPdfExport: () => null }));

vi.mock("./save-to-galaxy-button", () => ({
  SaveToGalaxyButton: ({
    ctaLabel,
    loggedOutHref,
  }: {
    ctaLabel?: string;
    loggedOutHref?: string;
  }) => <a href={loggedOutHref}>{ctaLabel}</a>,
}));

afterEach(() => {
  cleanup();
});

const chart = {
  placements: [
    {
      body: "sun" as const,
      lon: 10,
      sign: "Aries" as const,
      degree: 10,
      retro: false,
      confident: true,
    },
  ],
  precision: "date" as const,
  generational: {
    uranus: { sign: "Capricorn" as const, confident: true },
    neptune: { sign: "Capricorn" as const, confident: true },
    pluto: { sign: "Scorpio" as const, confident: true },
    cohortLabel: "test",
  },
} satisfies NatalChart;

const giftBirth = {
  precision: "date" as const,
  month: 6,
  day: 15,
  year: 1990,
  birthPlace: "New York, NY",
  lat: "40.7128",
  lng: "-74.0060",
};

describe("ShareSnapshotView gifted natal chart", () => {
  it("is readable with no account: chart, need, framing, and both return-path actions", () => {
    render(
      <ShareSnapshotView
        kind="single"
        token="tok"
        payload={{
          displayDate: "15 June 1990",
          birthPlace: "New York, NY",
          chart,
          giftBirth,
        }}
      />,
    );

    expect(screen.getByText(SHARE_SINGLE_LEDE)).toBeTruthy();
    expect(screen.getByText(SHARE_GALAXIA_FRAME)).toBeTruthy();
    expect(screen.getByText(SHARE_NEED_HEADING)).toBeTruthy();
    expect(screen.queryByText(/paywall/i)).toBeNull();
    expect(screen.queryByText(/Upgrade/)).toBeNull();

    const add = screen.getByRole("link", { name: SHARE_ADD_CTA });
    expect(add.getAttribute("href")).toBe(signupWithNextHref(sharePath("tok")));
    expect(add.getAttribute("href")).not.toContain("lat=");
    expect(add.getAttribute("href")).not.toMatch(/name=/i);

    const compare = screen.getByRole("link", { name: SHARE_COMPARE_CTA });
    expect(compare.getAttribute("href")).toBe(giftComparePath("tok"));
    expect(compare.getAttribute("href")).toBe("/chart/compare?gift=tok");
    expect(screen.getByText(SHARE_COMPARE_HINT)).toBeTruthy();
  });

  it("does not offer add or compare when the snapshot has no gift envelope", () => {
    render(
      <ShareSnapshotView
        kind="single"
        token="old"
        payload={{
          displayDate: "15 June 1990",
          birthPlace: "New York, NY",
          chart,
        }}
      />,
    );
    expect(screen.getByText(SHARE_NO_GIFT_BIRTH)).toBeTruthy();
    expect(screen.queryByRole("link", { name: SHARE_ADD_CTA })).toBeNull();
    expect(screen.queryByRole("link", { name: SHARE_COMPARE_CTA })).toBeNull();
  });
});

function precedes(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("ShareSnapshotView compare order", () => {
  it("renders needs above the dynamic table and the watch line under the rows", () => {
    const chartA = computeNatalChart({ dateUTC: "1990-06-15T12:00:00.000Z", precision: "date" });
    const chartB = computeNatalChart({ dateUTC: "1987-12-29T12:00:00.000Z", precision: "date" });
    const synastry = computeSynastry(chartA, chartB);
    const generational = compareGenerational(chartA.generational, chartB.generational);
    const scores = { ...synastry.scores, communication: 40 };
    const shaped = { ...synastry, scores };
    const watchLine = relationshipWatchLine(scores, "platonic", shaped);
    expect(watchLine).toBeTruthy();

    render(
      <ShareSnapshotView
        kind="compare"
        token="cmp"
        payload={{
          nameA: "Alex",
          nameB: "Sam",
          relationType: "platonic",
          pairHasMinor: false,
          chartA,
          chartB,
          synastry: {
            scores,
            aspects: synastry.aspects,
          },
          generational,
        }}
      />,
    );

    const needA = screen.getByText("→ What Alex needs from you");
    const needB = screen.getByText("→ What Sam needs from you");
    const tableHeading = screen.getByText("Your dynamic");
    const overall = screen.getByText("Overall");
    const watch = screen.getByText(watchLine!);

    expect(precedes(needA, needB)).toBe(true);
    expect(precedes(needB, tableHeading)).toBe(true);
    expect(precedes(tableHeading, overall)).toBe(true);
    expect(precedes(overall, watch)).toBe(true);
    expect(screen.getByRole("button", { name: "flows" })).toBeTruthy();
    expect(screen.getByText(/and catches/)).toBeTruthy();
    expect(screen.getByText("Generational call-out")).toBeTruthy();
  });
});
