// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { VelaPinsPanel } from "./vela-pins-panel";
import type { RecordEntry } from "../lib/record";
import {
  PIN_THEME_LABELS,
  VELA_PIN_SEARCH_EMPTY,
  VELA_PIN_SEARCH_PLACEHOLDER,
  VELA_PIN_SHOW_LATEST,
  VELA_PIN_SORT_OLDEST,
  velaPinSeeAllLabel
} from "../lib/vela-pin-copy";

afterEach(() => {
  cleanup();
});

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  )
}));

function pin(partial: Partial<RecordEntry> & { id: string; body: string; createdAt: string }): RecordEntry {
  return { kind: "vela_pin", ...partial };
}

const pins: RecordEntry[] = [
  pin({ id: "p1", body: "Moon in Cancer, how she's wired", createdAt: "2026-06-06T00:00:00.000Z", theme: "how_theyre_built" }),
  pin({ id: "p2", body: "The two of you in synastry", createdAt: "2026-05-05T00:00:00.000Z", theme: "how_you_two_work" }),
  pin({ id: "p3", body: "Transit this week", createdAt: "2026-04-04T00:00:00.000Z", theme: "this_season" }),
  pin({ id: "p4", body: "What to say tonight", createdAt: "2026-03-03T00:00:00.000Z", theme: "talking" }),
  pin({ id: "p5", body: "The friction between you", createdAt: "2026-02-02T00:00:00.000Z", theme: "tension" }),
  pin({ id: "p6", body: "An older unthemed pin", createdAt: "2026-01-01T00:00:00.000Z", theme: null })
];

describe("VelaPinsPanel", () => {
  it("collapses to the five most recent and expands on See all", () => {
    render(<VelaPinsPanel pins={pins} />);
    expect(screen.getByText("Moon in Cancer, how she's wired")).toBeTruthy();
    expect(screen.getByText("The friction between you")).toBeTruthy();
    expect(screen.queryByText("An older unthemed pin")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: velaPinSeeAllLabel(6) }));
    expect(screen.getByText("An older unthemed pin")).toBeTruthy();
    expect(screen.getByRole("heading", { name: PIN_THEME_LABELS.how_theyre_built })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: VELA_PIN_SHOW_LATEST }));
    expect(screen.queryByText("An older unthemed pin")).toBeNull();
  });

  it("searches pin bodies and sorts oldest first", () => {
    render(<VelaPinsPanel pins={pins} />);
    fireEvent.change(screen.getByPlaceholderText(VELA_PIN_SEARCH_PLACEHOLDER), {
      target: { value: "synastry" }
    });
    expect(screen.getByText("The two of you in synastry")).toBeTruthy();
    expect(screen.queryByText("Moon in Cancer, how she's wired")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText(VELA_PIN_SEARCH_PLACEHOLDER), {
      target: { value: "no such insight" }
    });
    expect(screen.getByText(VELA_PIN_SEARCH_EMPTY)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(VELA_PIN_SEARCH_PLACEHOLDER), {
      target: { value: "" }
    });
    fireEvent.click(screen.getByRole("button", { name: VELA_PIN_SORT_OLDEST }));
    expect(screen.getByText("An older unthemed pin")).toBeTruthy();
    expect(screen.queryByText("Moon in Cancer, how she's wired")).toBeNull();
  });

  it("lets the owner change a theme without moving the pin control", () => {
    const onThemeChange = vi.fn();
    render(<VelaPinsPanel pins={pins.slice(0, 2)} onThemeChange={onThemeChange} />);
    fireEvent.click(screen.getAllByRole("button", { name: PIN_THEME_LABELS.care })[0]!);
    expect(onThemeChange).toHaveBeenCalledWith("p1", "care");
  });
});
