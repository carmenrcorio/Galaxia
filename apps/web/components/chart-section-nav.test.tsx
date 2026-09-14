// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { buildPersonPageGroups } from "@galaxia/core";
import { PersonProfileNav } from "./chart-section-nav";

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
  it("shows Now, Them, and Yours on a living profile and jumps within the open group", () => {
    const jumps: string[] = [];
    const groups: string[] = [];
    render(
      <PersonProfileNav
        groups={LIVING}
        activeGroup="now"
        onGroupChange={(group) => groups.push(group)}
        onJump={(id) => jumps.push(id)}
        personName="Ada"
      />
    );

    expect(screen.getByRole("tab", { name: "Now" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Them" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Yours" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Remembrance" })).toBeNull();

    expect(screen.getByRole("link", { name: "Right now" }).getAttribute("href")).toBe("#active-today");
    expect(screen.getByRole("link", { name: "Ask about them" }).getAttribute("href")).toBe("#vela-on-them");

    fireEvent.click(screen.getByRole("link", { name: "Ask about them" }));
    expect(jumps).toEqual(["vela-on-them"]);

    fireEvent.click(screen.getByRole("tab", { name: "Them" }));
    expect(groups).toEqual(["them"]);
  });

  it("replaces Yours with Remembrance on a memorial profile", () => {
    render(
      <PersonProfileNav
        groups={MEMORIAL}
        activeGroup="remembrance"
        onGroupChange={() => {}}
        onJump={() => {}}
        personName="Ada"
      />
    );

    expect(screen.queryByRole("tab", { name: "Now" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Yours" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Them" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Remembrance" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("link", { name: "Remembrance" }).getAttribute("href")).toBe("#remembrance");
    expect(screen.getByRole("link", { name: "Their light" }).getAttribute("href")).toBe("#honor-light");
    expect(screen.getByRole("link", { name: "Your record" }).getAttribute("href")).toBe("#notes");
  });
});
