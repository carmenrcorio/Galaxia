// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BASE_BIRTH_INPUT } from "./birth-fields";
import {
  CONFIRM_ADD_TO_CONSTELLATION,
  SAVE_TO_GALAXY_CHECKING,
  SaveToGalaxyButton,
  addToConstellationLabel,
  addedToConstellationLine,
  saveToGalaxyLoggedOutLabel,
} from "./save-to-galaxy-button";
import { personProfileHref, signupWithNextHref } from "../lib/nav-links";
import { buildWelcomePrefillPath } from "../lib/quick-chart";

const PERSON_ID = "person-saved-1";
const USER_ID = "user-1";

let authUser: { id: string } | null = null;
let authPending = false;
let authReject = false;
let pushed: string[] = [];
let insertPayload: Record<string, unknown> | null = null;

const router = {
  push: (href: string) => { pushed.push(href); },
};

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

vi.mock("../lib/house-system", () => ({
  getPreferredHouseSystem: async () => "placidus",
}));

vi.mock("@galaxia/astro", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@galaxia/astro")>();
  return {
    ...actual,
    buildBirthInput: () => ({
      birth: { lat: 40.7, lng: -74, date: new Date("1990-06-15T12:00:00Z") },
      birthDate: "1990-06-15",
      birthTime: null,
      birthPlace: "New York",
      tzOffsetMin: -300,
    }),
    computeNatalChart: () => ({
      houseSystem: "placidus",
      placements: [],
    }),
  };
});

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: () => authPending
        ? new Promise(() => {})
        : authReject
          ? Promise.reject(new Error("auth lookup failed"))
          : Promise.resolve({ data: { user: authUser } }),
    },
    from: (table: string) => {
      if (table === "people") {
        return {
          insert: (payload: Record<string, unknown>) => {
            insertPayload = payload;
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: PERSON_ID }, error: null }),
              }),
            };
          },
        };
      }
      if (table === "charts") {
        return {
          upsert: () => Promise.resolve({ error: null }),
        };
      }
      if (table === "invites") {
        const chain: Record<string, unknown> = {
          select() { return chain; },
          eq() { return chain; },
          order() { return chain; },
          limit() { return chain; },
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          insert: () => Promise.resolve({ error: null }),
        };
        return chain;
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null }),
          }),
        }),
      };
    },
  }),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  authUser = null;
  authPending = false;
  authReject = false;
  pushed = [];
  insertPayload = null;
});

const namedInput = {
  ...BASE_BIRTH_INPUT,
  precision: "date" as const,
  month: 6,
  day: 15,
  year: 1990,
};

describe("SaveToGalaxyButton logged-out funnel", () => {
  it("renders a quiet checking line instead of null while auth is pending", () => {
    authPending = true;
    const { container } = render(<SaveToGalaxyButton birthInput={namedInput} />);
    expect(container.textContent).not.toBe("");
    expect(screen.getByText(SAVE_TO_GALAXY_CHECKING)).toBeTruthy();
  });

  it("links to signup with welcome prefill and keeps the galaxy save label", async () => {
    render(<SaveToGalaxyButton birthInput={namedInput} defaultName="Maya" />);
    const label = saveToGalaxyLoggedOutLabel("Maya");
    const link = await screen.findByRole("link", { name: label });
    expect(link.getAttribute("href")).toBe(
      signupWithNextHref(buildWelcomePrefillPath(namedInput, "Maya")),
    );
    expect(label).toBe("Save Maya to your galaxy");
    expect(screen.queryByRole("button", { name: addToConstellationLabel("Maya") })).toBeNull();
  });

  it("shows the logged-out CTA when the auth lookup fails", async () => {
    authReject = true;
    render(
      <SaveToGalaxyButton
        birthInput={namedInput}
        ctaLabel="Add this person to my own constellation"
        loggedOutHref={signupWithNextHref("/s/tok")}
      />,
    );
    const link = await screen.findByRole("link", { name: "Add this person to my own constellation" });
    expect(link.getAttribute("href")).toBe(signupWithNextHref("/s/tok"));
  });

  it("gift shares return to the token page instead of putting birth data in a prefill URL", async () => {
    render(
      <SaveToGalaxyButton
        birthInput={namedInput}
        ctaLabel="Add this person to my own constellation"
        loggedOutHref={signupWithNextHref("/s/tok")}
      />,
    );
    const link = await screen.findByRole("link", { name: "Add this person to my own constellation" });
    expect(link.getAttribute("href")).toBe(signupWithNextHref("/s/tok"));
    expect(link.getAttribute("href")).not.toContain("lat=");
  });
});

describe("SaveToGalaxyButton signed-in constellation save", () => {
  beforeEach(() => {
    authUser = { id: USER_ID };
  });

  it("offers adding the person to the constellation, not signup", async () => {
    render(<SaveToGalaxyButton birthInput={namedInput} defaultName="Maya" />);
    const button = await screen.findByRole("button", { name: addToConstellationLabel("Maya") });
    expect(button).toBeTruthy();
    expect(screen.queryByRole("link", { name: saveToGalaxyLoggedOutLabel("Maya") })).toBeNull();
    expect(screen.queryByText("Sign up to build your galaxy →")).toBeNull();
  });

  it("saves and stays so the ask is reachable without opening edit", async () => {
    render(<SaveToGalaxyButton birthInput={namedInput} defaultName="Maya" />);
    fireEvent.click(await screen.findByRole("button", { name: addToConstellationLabel("Maya") }));
    fireEvent.click(await screen.findByRole("button", { name: CONFIRM_ADD_TO_CONSTELLATION }));

    await waitFor(() => {
      expect(screen.getByText(addedToConstellationLine("Maya"))).toBeTruthy();
    });
    expect(pushed).toEqual([]);
    expect(insertPayload?.display_name).toBe("Maya");
    expect(insertPayload?.owner_id).toBe(USER_ID);
    expect(insertPayload?.is_self).toBe(false);
    expect(screen.getByRole("link", { name: "View their profile" }).getAttribute("href")).toBe(
      personProfileHref(PERSON_ID),
    );
  });

  it("stays on the result when navigateToProfileOnSave is false", async () => {
    render(
      <SaveToGalaxyButton
        birthInput={namedInput}
        defaultName="Maya"
        navigateToProfileOnSave={false}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: addToConstellationLabel("Maya") }));
    fireEvent.click(await screen.findByRole("button", { name: CONFIRM_ADD_TO_CONSTELLATION }));

    await waitFor(() => {
      expect(screen.getByText(addedToConstellationLine("Maya"))).toBeTruthy();
    });
    expect(pushed).toEqual([]);
    expect(screen.getByRole("link", { name: "View their profile" }).getAttribute("href")).toBe(
      personProfileHref(PERSON_ID),
    );
  });
});
