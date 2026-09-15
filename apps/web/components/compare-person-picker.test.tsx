// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMPARE_PERSON_PICKER_COPY,
  ComparePersonField,
  type ComparePersonOption
} from "./compare-person-picker";

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

function person(id: string, name: string, relation = "friend"): ComparePersonOption {
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

describe("ComparePersonField", () => {
  it("shows placeholder when empty and opens a searchable picker", () => {
    const onSelect = vi.fn();
    render(
      <ComparePersonField
        label="Person A"
        people={[person("a", "Ada"), person("b", "Bea")]}
        recentPeople={[]}
        selectedId={null}
        disabledId={null}
        onSelect={onSelect}
        addPersonHref="/app/add-person?next=/app/compare&slot=a"
      />
    );
    const trigger = screen.getByRole("button", { name: COMPARE_PERSON_PICKER_COPY.placeholder });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText(COMPARE_PERSON_PICKER_COPY.search)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Bea/ }));
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("shows avatar name and stored role when selected", () => {
    render(
      <ComparePersonField
        label="Person A"
        people={[person("self-1", "Carmen", "self"), person("b", "Bea", "friend")]}
        recentPeople={[]}
        selectedId="self-1"
        disabledId="b"
        onSelect={() => undefined}
        addPersonHref="/app/add-person"
      />
    );
    expect(screen.getByText("Carmen")).toBeTruthy();
    expect(screen.getByText(COMPARE_PERSON_PICKER_COPY.selfRole)).toBeTruthy();
  });

  it("filters by name and keeps a disabled counterpart visible", () => {
    render(
      <ComparePersonField
        label="Person B"
        people={[person("a", "Ada"), person("b", "Bea"), person("c", "Cara")]}
        recentPeople={[]}
        selectedId={null}
        disabledId="a"
        onSelect={() => undefined}
        addPersonHref="/app/add-person"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: COMPARE_PERSON_PICKER_COPY.placeholder }));
    const ada = screen.getByRole("button", { name: /Ada/ });
    expect(ada).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: /Bea/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(COMPARE_PERSON_PICKER_COPY.search), {
      target: { value: "ca" }
    });
    expect(screen.getByRole("button", { name: /Cara/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Bea/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Ada/ })).toBeNull();
  });

  it("shows Recent then an alphabetical list, and an add-person link when nothing matches", () => {
    const people = [person("z", "Zed"), person("a", "Ada"), person("m", "Mo")];
    render(
      <ComparePersonField
        label="Person B"
        people={people}
        recentPeople={[people[2]!]}
        selectedId={null}
        disabledId={null}
        onSelect={() => undefined}
        addPersonHref="/app/add-person?next=/app/compare&slot=b"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: COMPARE_PERSON_PICKER_COPY.placeholder }));
    expect(screen.getByText(COMPARE_PERSON_PICKER_COPY.recent)).toBeTruthy();
    const list = document.querySelector(".compare-person-picker__list") as HTMLElement;
    const names = within(list).getAllByRole("button").map((el) => el.textContent);
    expect(names.some((n) => n?.includes("Mo"))).toBe(true);
    fireEvent.change(screen.getByLabelText(COMPARE_PERSON_PICKER_COPY.search), {
      target: { value: "zzz" }
    });
    expect(screen.getByText(COMPARE_PERSON_PICKER_COPY.empty)).toBeTruthy();
    const add = screen.getByRole("link", { name: COMPARE_PERSON_PICKER_COPY.addPerson });
    expect(add.getAttribute("href")).toContain("/app/add-person");
  });

  it("keeps fifty people inside a fixed-height scrolling list", () => {
    const people = Array.from({ length: 50 }, (_, i) =>
      person(`p-${i}`, `Person ${String(i).padStart(2, "0")}`)
    );
    render(
      <ComparePersonField
        label="Person A"
        people={people}
        recentPeople={[]}
        selectedId={null}
        disabledId={null}
        onSelect={() => undefined}
        addPersonHref="/app/add-person"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: COMPARE_PERSON_PICKER_COPY.placeholder }));
    const list = document.querySelector(".compare-person-picker__list") as HTMLElement;
    expect(list).toBeTruthy();
    expect(list.className).toContain("compare-person-picker__list");
    expect(within(list).getAllByRole("button")).toHaveLength(50);
    expect(screen.queryByRole("button", { name: /Person 49/ })?.closest(".compare-person-picker__list")).toBe(list);
  });
});
