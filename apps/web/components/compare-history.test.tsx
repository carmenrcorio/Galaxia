// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMPARE_HISTORY_HEADING,
  COMPARE_NEWLY_ACTIVE,
  COMPARE_SINCE_HEADING,
  compareNatalAspectsConstant,
  hydrateComparisonHistory
} from "@galaxia/astro";
import { CompareHistoryList, CompareSinceLastViewed } from "./compare-history";

vi.mock("./initial-avatar", () => ({
  InitialAvatar: ({ name }: { name: string }) => <span>{name[0]}</span>
}));

afterEach(() => {
  cleanup();
});

describe("hydrateComparisonHistory", () => {
  it("drops rows whose people are gone and prefers self as person A", () => {
    const items = hydrateComparisonHistory(
      [
        {
          person_low: "11111111-aaaa-4aaa-8aaa-000000000001",
          person_high: "11111111-aaaa-4aaa-8aaa-000000000002",
          last_viewed_at: "2026-09-01T12:00:00.000Z"
        },
        {
          person_low: "11111111-aaaa-4aaa-8aaa-000000000001",
          person_high: "99999999-aaaa-4aaa-8aaa-000000000099",
          last_viewed_at: "2026-09-02T12:00:00.000Z"
        }
      ],
      [
        { id: "11111111-aaaa-4aaa-8aaa-000000000001", display_name: "Ada", relation: "friend" },
        { id: "11111111-aaaa-4aaa-8aaa-000000000002", display_name: "Bea", relation: "self" }
      ]
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.nameA).toBe("Bea");
    expect(items[0]!.nameB).toBe("Ada");
    expect(items[0]!.personAId).toBe("11111111-aaaa-4aaa-8aaa-000000000002");
  });
});

describe("CompareHistoryList", () => {
  it("renders names and last viewed date", () => {
    render(
      <CompareHistoryList
        items={[
          {
            personAId: "a",
            personBId: "b",
            nameA: "Ada",
            nameB: "Bea",
            memorialA: false,
            memorialB: false,
            lastViewedAt: "2026-09-01T12:00:00.000Z"
          }
        ]}
        onOpen={() => undefined}
      />
    );
    expect(screen.getByText(COMPARE_HISTORY_HEADING)).toBeTruthy();
    expect(screen.getByText(/Ada/)).toBeTruthy();
    expect(screen.getByText(/Bea/)).toBeTruthy();
    expect(screen.getByText(/Last viewed/)).toBeTruthy();
  });
});

describe("CompareSinceLastViewed", () => {
  it("states natal aspects are constant and lists newly active transits", () => {
    render(
      <CompareSinceLastViewed
        nameA="Ada"
        nameB="Bea"
        lastViewedAt="2026-09-01T12:00:00.000Z"
        honest
        newlyActive={[
          { personId: "a", transitBody: "mars", natalBody: "venus", type: "square", orb: 0.4 }
        ]}
        movedOn={[]}
        nameById={() => "Ada"}
      />
    );
    expect(screen.getByText(COMPARE_SINCE_HEADING)).toBeTruthy();
    expect(screen.getByText(compareNatalAspectsConstant("Ada", "Bea"))).toBeTruthy();
    expect(screen.getByText(COMPARE_NEWLY_ACTIVE)).toBeTruthy();
    expect(screen.getByText("Ada: transiting mars square natal venus")).toBeTruthy();
  });
});
