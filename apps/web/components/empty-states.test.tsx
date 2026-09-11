// @vitest-environment jsdom

/**
 * Formerly-null sections must render a loading line or an honest empty
 * state. A blank return is a bug report waiting to happen.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BASE_BIRTH_INPUT } from "./birth-fields";
import { ChartGridSection, CHART_GRID_EMPTY } from "./groups/chart-grid-section";
import { GenerationalMap, GENERATIONAL_MAP_EMPTY } from "./groups/generational-map";
import { PairDynamicsSection, PAIR_DYNAMICS_EMPTY } from "./groups/pair-dynamics-section";
import {
  RELATIONAL_TRANSIT_FEED_EMPTY,
  RELATIONAL_TRANSIT_FEED_LOADING,
  RELATIONAL_TRANSIT_FEED_OFF,
  RelationalTransitFeed,
} from "./relational-transit-feed";
import { SAVE_TO_GALAXY_CHECKING, SaveToGalaxyButton } from "./save-to-galaxy-button";

afterEach(() => {
  cleanup();
});

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

let transitPref: "all" | "major_only" | "off" = "all";
let hangFeed = false;

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => {
    const chain = {
      select() { return chain; },
      eq() { return chain; },
      gte() { return chain; },
      lte() { return chain; },
      order() { return chain; },
      limit() { return chain; },
      maybeSingle: () => hangFeed
        ? new Promise(() => {})
        : Promise.resolve({ data: { relational_transit_alerts: transitPref } }),
      then(onFulfilled: (value: { data: unknown[] }) => unknown, onRejected?: (reason: unknown) => unknown) {
        if (hangFeed) return new Promise(() => {});
        return Promise.resolve({ data: [] }).then(onFulfilled, onRejected);
      },
    };
    return {
      from: () => chain,
      auth: {
        getUser: () => new Promise(() => {
          /* stay pending so SaveToGalaxyButton remains in its checking state */
        }),
      },
    };
  },
}));

describe("RelationalTransitFeed formerly-null states", () => {
  beforeEach(() => {
    transitPref = "all";
    hangFeed = false;
  });

  it("renders a quiet loading line instead of null", () => {
    hangFeed = true;
    const { container } = render(<RelationalTransitFeed ownerId="owner-1" />);
    expect(container.textContent).not.toBe("");
    expect(screen.getByText(RELATIONAL_TRANSIT_FEED_LOADING)).toBeTruthy();
  });

  it("renders the empty reason when there are no shared transits", async () => {
    render(<RelationalTransitFeed ownerId="owner-1" />);
    expect(await screen.findByText(RELATIONAL_TRANSIT_FEED_EMPTY)).toBeTruthy();
  });

  it("renders the off reason and a Settings next action", async () => {
    transitPref = "off";
    render(<RelationalTransitFeed ownerId="owner-1" />);
    await waitFor(() => {
      expect(screen.getByText(/This week alerts are off/)).toBeTruthy();
    });
    const settings = screen.getByRole("link", { name: "Settings" });
    expect(settings.getAttribute("href")).toBe("/app/settings");
    expect(screen.getByText(/This week alerts are off/).textContent).toBe(RELATIONAL_TRANSIT_FEED_OFF);
  });
});

describe("ChartGridSection formerly-null empty state", () => {
  it("renders the empty reason when fewer than three charted members", () => {
    const { container } = render(<ChartGridSection members={[]} />);
    expect(container.textContent).not.toBe("");
    expect(screen.getByText(CHART_GRID_EMPTY)).toBeTruthy();
  });
});

describe("GenerationalMap formerly-null empty state", () => {
  it("renders the empty reason when fewer than two members", () => {
    const { container } = render(
      <GenerationalMap memberNames={["Only"]} overlay={{ sharedSky: [], faultLines: [] }} />
    );
    expect(container.textContent).not.toBe("");
    expect(screen.getByText(GENERATIONAL_MAP_EMPTY)).toBeTruthy();
  });
});

describe("PairDynamicsSection formerly-null empty state", () => {
  it("renders the empty reason when there are no pair highlights", () => {
    const { container } = render(
      <PairDynamicsSection items={[]} resolveId={() => null} onOpenPair={() => undefined} />
    );
    expect(container.textContent).not.toBe("");
    expect(screen.getByText(PAIR_DYNAMICS_EMPTY)).toBeTruthy();
  });
});

describe("SaveToGalaxyButton formerly-null loading state", () => {
  it("renders a quiet checking line instead of null", () => {
    const { container } = render(<SaveToGalaxyButton birthInput={BASE_BIRTH_INPUT} />);
    expect(container.textContent).not.toBe("");
    expect(screen.getByText(SAVE_TO_GALAXY_CHECKING)).toBeTruthy();
  });
});
