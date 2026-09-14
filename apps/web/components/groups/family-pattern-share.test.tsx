// @vitest-environment jsdom

import type { FamilyComparePersonInput, FamilyPlanet, NatalChart, Sign } from "@galaxia/astro";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FAMILY_PATTERN_CARD_ACK,
  FAMILY_PATTERN_CARD_CONFIRM,
  FAMILY_PATTERN_CARD_DISABLED,
  FAMILY_PATTERN_CARD_FAIL,
  FAMILY_PATTERN_CARD_NO_PATTERN,
  FAMILY_PATTERN_CARD_PRIVACY_BODY,
  FAMILY_PATTERN_CARD_PRIVACY_TITLE,
  FAMILY_PATTERN_CARD_REMOVE,
  FAMILY_PATTERN_CARD_SHARE_LABEL,
} from "../../lib/family-pattern-card";
import { FamilyPatternShare } from "./family-pattern-share";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function chart(signs: Partial<Record<FamilyPlanet, Sign>>): NatalChart {
  const cell = (body: "sun" | "moon" | "mercury" | "venus" | "mars", sign: Sign) => ({
    body,
    lon: 0,
    sign,
    degree: 0,
    retro: false,
    confident: true as const,
    house: 3,
  });
  return {
    placements: [
      cell("sun", signs.sun ?? "Leo"),
      cell("moon", signs.moon ?? "Cancer"),
      cell("mercury", signs.mercury ?? "Virgo"),
      cell("venus", signs.venus ?? "Libra"),
      cell("mars", signs.mars ?? "Aries"),
    ],
    asc: signs.rising,
    precision: "exact",
    generational: {
      uranus: { sign: "Capricorn", confident: true },
      neptune: { sign: "Capricorn", confident: true },
      pluto: { sign: "Scorpio", confident: true },
      cohortLabel: "test",
    },
  };
}

const members: FamilyComparePersonInput[] = [
  { id: "a", name: "Ada Lovelace", chart: chart({ sun: "Leo", moon: "Cancer", rising: "Virgo" }), passed: true },
  { id: "n", name: "Nellie Bly", chart: chart({ sun: "Leo", moon: "Pisces", rising: "Virgo" }) },
  { id: "b", name: "Bo Patel", chart: chart({ sun: "Aries", moon: "Cancer", rising: "Sagittarius" }) },
];

describe("FamilyPatternShare privacy confirm", () => {
  it("does not generate an image until the user confirms, and the preview is first names plus signs", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<FamilyPatternShare members={members} />);

    fireEvent.click(screen.getByRole("button", { name: FAMILY_PATTERN_CARD_SHARE_LABEL }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(FAMILY_PATTERN_CARD_PRIVACY_TITLE)).toBeTruthy();
    expect(screen.getByText(FAMILY_PATTERN_CARD_PRIVACY_BODY)).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("Nellie")).toBeTruthy();
    expect(screen.getByText("Bo")).toBeTruthy();
    expect(screen.queryByText("Lovelace")).toBeNull();
    expect(screen.queryByText("Patel")).toBeNull();
    expect(screen.getByText(/Leo Sun/)).toBeTruthy();
    expect(screen.queryByText(/House/)).toBeNull();
    expect(screen.queryByText("1815")).toBeNull();

    const confirm = screen.getByRole("button", { name: FAMILY_PATTERN_CARD_CONFIRM });
    expect(confirm.hasAttribute("disabled")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(FAMILY_PATTERN_CARD_ACK));
    expect(confirm.hasAttribute("disabled")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets the user remove a person and updates the preview without generating", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<FamilyPatternShare members={members} />);
    fireEvent.click(screen.getByRole("button", { name: FAMILY_PATTERN_CARD_SHARE_LABEL }));

    const removeButtons = screen.getAllByRole("button", { name: FAMILY_PATTERN_CARD_REMOVE });
    fireEvent.click(removeButtons[2]!);
    expect(screen.queryByText("Bo")).toBeNull();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("Nellie")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks confirm when removing people leaves no shared placement", () => {
    render(<FamilyPatternShare members={members} />);
    fireEvent.click(screen.getByRole("button", { name: FAMILY_PATTERN_CARD_SHARE_LABEL }));
    while (screen.queryAllByRole("button", { name: FAMILY_PATTERN_CARD_REMOVE }).length > 0) {
      fireEvent.click(screen.getAllByRole("button", { name: FAMILY_PATTERN_CARD_REMOVE })[0]!);
    }
    expect(screen.getByText(FAMILY_PATTERN_CARD_NO_PATTERN)).toBeTruthy();
    expect(screen.getByRole("button", { name: FAMILY_PATTERN_CARD_CONFIRM }).hasAttribute("disabled")).toBe(true);
  });

  it("POSTs the stripped payload and delivers the PNG only after confirm", async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal("navigator", { canShare: () => true, share });
    const blob = new Blob([new Uint8Array(128).fill(7)], { type: "image/png" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        blob: async () => blob,
      })),
    );

    render(<FamilyPatternShare members={members} />);
    fireEvent.click(screen.getByRole("button", { name: FAMILY_PATTERN_CARD_SHARE_LABEL }));
    fireEvent.click(screen.getByLabelText(FAMILY_PATTERN_CARD_ACK));
    fireEvent.click(screen.getByRole("button", { name: FAMILY_PATTERN_CARD_CONFIRM }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe("/api/family-pattern-card");
    const init = call[1] as { method?: string; body?: string };
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string) as {
      people: Array<{ firstName: string; memorial: boolean }>;
      headline: string;
      interpretation: string;
    };
    expect(body.people.map((p) => p.firstName)).toEqual(["Ada", "Nellie", "Bo"]);
    expect(body.people[0]?.memorial).toBe(true);
    expect(JSON.stringify(body)).not.toContain("Lovelace");
    expect(JSON.stringify(body)).not.toContain("House");
    expect(body.people[0]).not.toHaveProperty("id");
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  });

  it("surfaces a failure without saying Shared", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, blob: async () => new Blob() })));
    render(<FamilyPatternShare members={members} />);
    fireEvent.click(screen.getByRole("button", { name: FAMILY_PATTERN_CARD_SHARE_LABEL }));
    fireEvent.click(screen.getByLabelText(FAMILY_PATTERN_CARD_ACK));
    fireEvent.click(screen.getByRole("button", { name: FAMILY_PATTERN_CARD_CONFIRM }));
    await waitFor(() => expect(screen.getByText(FAMILY_PATTERN_CARD_FAIL)).toBeTruthy());
    expect(screen.queryByText("Shared")).toBeNull();
  });

  it("disables share when the group has no shared placement", () => {
    const solo: FamilyComparePersonInput[] = [
      { id: "a", name: "Ada", chart: chart({ sun: "Leo", moon: "Cancer", rising: "Virgo", mercury: "Leo", venus: "Virgo", mars: "Leo" }) },
      { id: "b", name: "Bo", chart: chart({ sun: "Aries", moon: "Pisces", rising: "Taurus", mercury: "Aries", venus: "Pisces", mars: "Taurus" }) },
      { id: "c", name: "Cam", chart: chart({ sun: "Gemini", moon: "Scorpio", rising: "Capricorn", mercury: "Sagittarius", venus: "Aquarius", mars: "Gemini" }) },
    ];
    render(<FamilyPatternShare members={solo} />);
    expect(screen.getByRole("button", { name: FAMILY_PATTERN_CARD_SHARE_LABEL }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(FAMILY_PATTERN_CARD_DISABLED)).toBeTruthy();
  });
});
