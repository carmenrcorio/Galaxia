// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { buildPersonPageGroups } from "@galaxia/core";
import { ChartSectionNav, PersonProfileNav } from "./chart-section-nav";

afterEach(() => {
  cleanup();
});

const LIVING = buildPersonPageGroups({
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
  isMemorial: false,
});

const MEMORIAL = buildPersonPageGroups({
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
  isMemorial: true,
});

describe("PersonProfileNav", () => {
  it("shows Who they are and You and them on a living profile, with no jump layer", () => {
    const groups: string[] = [];
    render(
      <PersonProfileNav
        groups={LIVING}
        activeGroup="them"
        onGroupChange={(group) => groups.push(group)}
        personName="Ada"
      />
    );

    expect(screen.getByRole("tab", { name: "Who they are" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "You and them" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Today" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Now" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Remembrance" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: /Jump/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Right now" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "You and them" }));
    expect(groups).toEqual(["yours"]);
  });

  it("replaces You and them with Remembrance on a memorial profile", () => {
    render(
      <PersonProfileNav
        groups={MEMORIAL}
        activeGroup="remembrance"
        onGroupChange={() => {}}
        personName="Ada"
      />
    );

    expect(screen.queryByRole("tab", { name: "Today" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "You and them" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Who they are" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Remembrance" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("link", { name: "Their light" })).toBeNull();
  });
});

describe("ChartSectionNav", () => {
  it("still jumps by hash when used as a standalone chip rail", () => {
    const jumps: string[] = [];
    render(
      <ChartSectionNav
        sections={[
          { id: "big-three", label: "What they need" },
          { id: "chart-wheel", label: "Chart wheel" },
        ]}
        onJump={(id) => jumps.push(id)}
      />
    );
    fireEvent.click(screen.getByRole("link", { name: "Chart wheel" }));
    expect(jumps).toEqual(["chart-wheel"]);
  });
});
