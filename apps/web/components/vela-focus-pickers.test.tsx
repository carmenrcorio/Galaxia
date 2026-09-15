// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GROUP_PICKER_COPY } from "./group-picker-field";
import { COMPARE_PERSON_PICKER_COPY, type PersonPickerOption } from "./person-picker";
import {
  VELA_GROUP_SLOT_LABEL,
  VELA_PAIR_SLOT_A_LABEL,
  VELA_PAIR_SLOT_B_LABEL,
  VELA_PERSON_SLOT_LABEL,
  VelaFocusPickers
} from "./vela-focus-pickers";

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

function person(id: string, name: string, relation = "friend"): PersonPickerOption {
  return { id, display_name: name, relation };
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

const people = [
  person("self-1", "Carmen", "self"),
  person("b", "Bea", "friend"),
  person("c", "Cara", "partner")
];

describe("VelaFocusPickers", () => {
  it("person focus renders one Understand slot card", () => {
    render(
      <VelaFocusPickers
        scope="person"
        people={people}
        groups={[]}
        subjectId="self-1"
        pairId={null}
        groupId={null}
        onSubjectSelect={() => undefined}
        onPairSelect={() => undefined}
        onGroupSelect={() => undefined}
      />
    );
    expect(screen.getByText(VELA_PERSON_SLOT_LABEL)).toBeTruthy();
    expect(document.querySelectorAll(".compare-person-field")).toHaveLength(1);
  });

  it("pair focus mounts one slot card for A and one for B, not two people lists", () => {
    render(
      <VelaFocusPickers
        scope="pair"
        people={people}
        groups={[]}
        subjectId="self-1"
        pairId={null}
        groupId={null}
        onSubjectSelect={() => undefined}
        onPairSelect={() => undefined}
        onGroupSelect={() => undefined}
      />
    );
    expect(screen.getByText(VELA_PAIR_SLOT_A_LABEL)).toBeTruthy();
    expect(screen.getByText(VELA_PAIR_SLOT_B_LABEL)).toBeTruthy();
    expect(document.querySelectorAll(".compare-person-field")).toHaveLength(2);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: COMPARE_PERSON_PICKER_COPY.placeholder }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.querySelectorAll(".compare-person-field")).toHaveLength(2);
  });

  it("pair focus slot A shows the selected self person", () => {
    render(
      <VelaFocusPickers
        scope="pair"
        people={people}
        groups={[]}
        subjectId="self-1"
        pairId={null}
        groupId={null}
        onSubjectSelect={() => undefined}
        onPairSelect={() => undefined}
        onGroupSelect={() => undefined}
      />
    );
    const slots = document.querySelectorAll(".compare-person-field");
    expect(slots[0]?.textContent).toContain("Carmen");
    expect(slots[1]?.textContent).toContain(COMPARE_PERSON_PICKER_COPY.placeholder);
  });

  it("pair focus prevents selecting the same person in both slots", () => {
    render(
      <VelaFocusPickers
        scope="pair"
        people={people}
        groups={[]}
        subjectId="self-1"
        pairId={null}
        groupId={null}
        onSubjectSelect={() => undefined}
        onPairSelect={() => undefined}
        onGroupSelect={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: COMPARE_PERSON_PICKER_COPY.placeholder }));
    const dialog = screen.getByRole("dialog");
    const carmen = within(dialog).getByRole("button", { name: /Carmen/ });
    expect(carmen).toHaveProperty("disabled", true);
    expect(within(dialog).getByRole("button", { name: /Bea/ })).toHaveProperty("disabled", false);
  });

  it("group focus renders GroupPickerField, not a native select", () => {
    render(
      <VelaFocusPickers
        scope="group"
        people={people}
        groups={[{ id: "g1", displayName: "Family", memberCount: 3 }]}
        subjectId={null}
        pairId={null}
        groupId="g1"
        onSubjectSelect={() => undefined}
        onPairSelect={() => undefined}
        onGroupSelect={() => undefined}
      />
    );
    expect(screen.getByText(VELA_GROUP_SLOT_LABEL)).toBeTruthy();
    expect(document.querySelector("select.field")).toBeNull();
    expect(document.querySelectorAll(".compare-person-field")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Family/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText(GROUP_PICKER_COPY.search)).toBeTruthy();
  });
});
