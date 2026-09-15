// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GROUP_PICKER_COPY,
  GroupPickerField,
  type GroupPickerOption
} from "./group-picker-field";

vi.mock("./initial-avatar", () => ({
  InitialAvatar: ({ name }: { name: string }) => <span>{name[0]}</span>
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  )
}));

afterEach(() => {
  cleanup();
});

function group(
  id: string,
  displayName: string,
  memberCount?: number
): GroupPickerOption {
  return { id, displayName, memberCount };
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false
    })
  });
}

beforeEach(() => {
  mockMatchMedia(true);
});

describe("GroupPickerField", () => {
  it("shows placeholder when empty and opens a searchable picker", () => {
    const onSelect = vi.fn();
    render(
      <GroupPickerField
        label="Group"
        groups={[group("g1", "Family", 3), group("g2", "Work", 2)]}
        selectedId={null}
        onSelect={onSelect}
        addGroupHref="/app/groups"
      />
    );
    const trigger = screen.getByRole("button", { name: GROUP_PICKER_COPY.placeholder });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText(GROUP_PICKER_COPY.search)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Work/ }));
    expect(onSelect).toHaveBeenCalledWith("g2");
  });

  it("shows group name and member count on the closed slot", () => {
    render(
      <GroupPickerField
        label="Group"
        groups={[group("g1", "Family", 3)]}
        selectedId="g1"
        onSelect={() => undefined}
        addGroupHref="/app/groups"
      />
    );
    expect(screen.getByText("Family")).toBeTruthy();
    expect(screen.getByText("(3 members)")).toBeTruthy();
  });

  it("filters by name and shows Add a group when nothing matches", () => {
    render(
      <GroupPickerField
        label="Group"
        groups={[group("g1", "Family", 3), group("g2", "Work", 2)]}
        selectedId={null}
        onSelect={() => undefined}
        addGroupHref="/app/groups"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: GROUP_PICKER_COPY.placeholder }));
    fireEvent.change(screen.getByLabelText(GROUP_PICKER_COPY.search), {
      target: { value: "zzz" }
    });
    expect(screen.getByText(GROUP_PICKER_COPY.empty)).toBeTruthy();
    const add = screen.getByRole("link", { name: GROUP_PICKER_COPY.addGroup });
    expect(add.getAttribute("href")).toBe("/app/groups");
  });

  it("keeps many groups inside a fixed-height scrolling list", () => {
    const groups = Array.from({ length: 40 }, (_, i) =>
      group(`g-${i}`, `Group ${String(i).padStart(2, "0")}`, i + 1)
    );
    render(
      <GroupPickerField
        label="Group"
        groups={groups}
        selectedId={null}
        onSelect={() => undefined}
        addGroupHref="/app/groups"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: GROUP_PICKER_COPY.placeholder }));
    const list = document.querySelector(".compare-person-picker__list") as HTMLElement;
    expect(list).toBeTruthy();
    expect(within(list).getAllByRole("button")).toHaveLength(40);
  });
});
