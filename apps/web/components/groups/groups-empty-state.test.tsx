// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GROUPS_CREATE_REQUIREMENT,
  GROUPS_EMPTY_ADD_SOMEONE,
  GROUPS_EMPTY_BUILD_THIS_GROUP,
  GROUPS_EXAMPLE_BADGE,
  GROUPS_EXAMPLE_NOTICE,
  groupsEmptyBuildWith,
  groupsEmptyPeopleStatus,
} from "../../lib/groups-copy";
import { EMPTY_STATE_WELCOME_HREF } from "../../lib/nav-links";
import { GroupsEmptyState } from "./groups-empty-state";

afterEach(() => {
  cleanup();
});

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

describe("GroupsEmptyState", () => {
  it("renders the labelled example reading when the user has fewer than three people", () => {
    render(<GroupsEmptyState people={[{ id: "p1", display_name: "Maya" }]} onBuildWithPeople={() => undefined} />);
    expect(screen.getByText(GROUPS_EXAMPLE_BADGE)).toBeTruthy();
    expect(screen.getByText(GROUPS_EXAMPLE_NOTICE)).toBeTruthy();
    expect(screen.getByText("Lila, Owen, Priya, Nate")).toBeTruthy();
    expect(screen.getByText(GROUPS_CREATE_REQUIREMENT)).toBeTruthy();
    expect(screen.getByText(groupsEmptyPeopleStatus(1))).toBeTruthy();
    const add = screen.getByRole("link", { name: GROUPS_EMPTY_ADD_SOMEONE });
    expect(add.getAttribute("href")).toBe(EMPTY_STATE_WELCOME_HREF);
    expect(screen.queryByRole("button", { name: GROUPS_EMPTY_BUILD_THIS_GROUP })).toBeNull();
  });

  it("skips the example and names the user's people when they already have three", () => {
    const onBuild = vi.fn();
    const people = [
      { id: "a", display_name: "Maya" },
      { id: "b", display_name: "Jordan" },
      { id: "c", display_name: "Sam" },
    ];
    render(<GroupsEmptyState people={people} onBuildWithPeople={onBuild} />);
    expect(screen.queryByText(GROUPS_EXAMPLE_BADGE)).toBeNull();
    expect(screen.queryByText("Lila")).toBeNull();
    expect(screen.getByText(groupsEmptyBuildWith(["Maya", "Jordan", "Sam"]))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: GROUPS_EMPTY_BUILD_THIS_GROUP }));
    expect(onBuild).toHaveBeenCalledWith(["a", "b", "c"]);
  });
});
