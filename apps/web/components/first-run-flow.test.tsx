// @vitest-environment jsdom

/**
 * First-run orientation, driven end to end.
 *
 * The load-bearing claim of this flow is that the reader sees ONE TRUE
 * SENTENCE about a person they actually know, computed from that person's real
 * birth data, before they are asked for anything about themselves. These tests
 * drive the real component against a fake Supabase and then assert that the
 * sentence on screen is the one `@galaxia/astro` produced from the chart that
 * was actually written, not a string this file supplied.
 *
 * They also cover the three things that are easy to quietly get wrong:
 * skipping, resuming, and the refusal of romantic framing near a minor.
 */
import { computeNatalChart, interpretPlacement, type NatalChart } from "@galaxia/astro";
import { FIRST_RUN_RELATION_OPTIONS } from "@galaxia/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIRST_RUN_COPY, FirstRunFlow } from "./first-run-flow";

/* ── Fakes ──────────────────────────────────────────────────────────────── */

const USER_ID = "11111111-1111-4111-8111-111111111111";

type PeopleRow = {
  id: string;
  display_name: string;
  is_self: boolean;
  is_minor: boolean;
  relation: string;
  passed_at: string | null;
  created_at: string;
};

let profileRow: Record<string, unknown> | null;
let peopleRows: PeopleRow[];
let chartRows: { person_id: string; data: NatalChart }[];
let profileUpdates: Record<string, unknown>[];
let pushed: string[];
let replaced: string[];
let search: string;

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) => (
    <a href={href} {...rest}>{children as never}</a>
  ),
}));

// Stable identity, like the real Next router. A fresh object per render would
// invalidate every hook that depends on it.
const router = {
  push: (href: string) => pushed.push(href),
  replace: (href: string) => replaced.push(href),
};

vi.mock("next/navigation", () => ({ useRouter: () => router }));

vi.mock("../lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => makeClient(),
}));

/**
 * Minimal Supabase stand-in. It is table-aware rather than returning one
 * canned shape, because the flow's correctness depends on what it wrote to
 * `people` and `charts` and on reading those back.
 */
function makeClient() {
  const from = (table: string) => {
    const state: { filters: Record<string, unknown>; payload: Record<string, unknown> | null } = {
      filters: {},
      payload: null,
    };

    const rows = (): unknown[] => {
      if (table === "people") {
        return [...peopleRows].sort((a, b) => b.created_at.localeCompare(a.created_at));
      }
      if (table === "charts") {
        return chartRows.filter((c) => !state.filters.person_id || c.person_id === state.filters.person_id);
      }
      if (table === "profiles") return profileRow ? [profileRow] : [];
      return [];
    };

    const chain: Record<string, unknown> = {
      select() { return chain; },
      order() { return chain; },
      limit() { return chain; },
      eq(column: string, value: unknown) { state.filters[column] = value; return chain; },
      maybeSingle: () => {
        if (table === "people" && state.filters.is_self === true) {
          const self = peopleRows.find((p) => p.is_self) ?? null;
          return Promise.resolve({ data: self, error: null });
        }
        return Promise.resolve({ data: (rows()[0] as unknown) ?? null, error: null });
      },
      single: () => Promise.resolve({ data: (rows()[0] as unknown) ?? null, error: null }),
      insert(payload: Record<string, unknown>) {
        state.payload = payload;
        if (table === "people") {
          const row: PeopleRow = {
            id: `person-${peopleRows.length + 1}`,
            display_name: String(payload.display_name),
            is_self: payload.is_self === true,
            is_minor: payload.is_minor === true,
            relation: String(payload.relation),
            passed_at: (payload.passed_at as string | null) ?? null,
            created_at: new Date(2026, 0, 1 + peopleRows.length).toISOString(),
          };
          peopleRows.push(row);
          const result = { data: { id: row.id }, error: null };
          return {
            select: () => ({ single: () => Promise.resolve(result) }),
            then: (onFulfilled: (value: typeof result) => unknown, onRejected?: (r: unknown) => unknown) =>
              Promise.resolve(result).then(onFulfilled, onRejected),
          };
        }
        const result = { data: null, error: null };
        return {
          select: () => ({ single: () => Promise.resolve(result) }),
          then: (onFulfilled: (value: typeof result) => unknown, onRejected?: (r: unknown) => unknown) =>
            Promise.resolve(result).then(onFulfilled, onRejected),
        };
      },
      upsert(payload: Record<string, unknown>) {
        if (table === "charts") {
          chartRows.push({ person_id: String(payload.person_id), data: payload.data as NatalChart });
        }
        return Promise.resolve({ error: null });
      },
      update(payload: Record<string, unknown>) {
        if (table === "profiles") {
          profileUpdates.push(payload);
          profileRow = { ...(profileRow ?? {}), ...payload };
        }
        return { eq: () => Promise.resolve({ error: null }) };
      },
      then(onFulfilled: (value: { data: unknown[]; error: null }) => unknown, onRejected?: (r: unknown) => unknown) {
        return Promise.resolve({ data: rows(), error: null }).then(onFulfilled, onRejected);
      },
    };
    return chain;
  };

  return {
    from,
    auth: { getUser: () => Promise.resolve({ data: { user: { id: USER_ID } } }) },
  };
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function setSearch(value: string) {
  search = value;
  window.history.replaceState({}, "", `/welcome${value}`);
}

function pickOption(id: string) {
  fireEvent.click(document.querySelector(`[data-first-run-option="${id}"]`)!);
}

function typeName(value: string) {
  fireEvent.change(screen.getByPlaceholderText("Their name"), { target: { value } });
}

/** Fill the birth form at date precision, which every tier test builds on. */
function fillBirthDate({ month, day, year }: { month: number; day: number; year: number }) {
  fireEvent.change(screen.getByLabelText("Birth month"), { target: { value: String(month) } });
  fireEvent.change(screen.getByLabelText("Birth day"), { target: { value: String(day) } });
  fireEvent.change(screen.getByLabelText("Birth year"), { target: { value: String(year) } });
}

function statementOnScreen(): string {
  return document.querySelector("[data-first-run-statement]")?.textContent ?? "";
}

beforeEach(() => {
  profileRow = { id: USER_ID, onboarding_step: null, onboarding_completed_at: null, house_system: "placidus" };
  peopleRows = [];
  chartRows = [];
  profileUpdates = [];
  pushed = [];
  replaced = [];
  setSearch("");
});

afterEach(() => {
  cleanup();
});

/* ── Tests ──────────────────────────────────────────────────────────────── */

describe("first-run orientation: the five steps", () => {
  it("opens on the relationship question, leading with the other person", async () => {
    render(<FirstRunFlow />);
    expect(await screen.findByText(FIRST_RUN_COPY.whoTitle)).toBeTruthy();
    // Nothing about the reader is asked for on this screen.
    expect(screen.queryByPlaceholderText(FIRST_RUN_COPY.youNamePlaceholder)).toBeNull();
  });

  it("offers every quick option, and each one is a real relation", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    for (const option of FIRST_RUN_RELATION_OPTIONS) {
      expect(screen.getByText(option.label), option.id).toBeTruthy();
    }
  });

  it("carries the chosen relationship into the person that gets created", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("mother");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);

    typeName("Rosa");
    fillBirthDate({ month: 7, day: 16, year: 1958 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));

    await waitFor(() => expect(peopleRows).toHaveLength(1));
    expect(peopleRows[0].relation).toBe("mother");
    expect(peopleRows[0].is_self).toBe(false);
  });

  it("reuses the shared add-person form rather than a second one", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("partner");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    // The shared form's own field copy, which lives on AddPersonForm.
    expect(screen.getByPlaceholderText("Their name")).toBeTruthy();
    expect(screen.getByText(/This person is a minor \(under 18\)/)).toBeTruthy();
    expect(screen.getByText(/Ask them for their birth details/)).toBeTruthy();
  });

  it("does not offer the tier that computes no chart, because step 3 needs one", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("partner");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    expect(screen.getByText("Exact time")).toBeTruthy();
    expect(screen.getByText("Date only")).toBeTruthy();
    expect(screen.getByText("Year only")).toBeTruthy();
    expect(screen.queryByText("Add birth data later")).toBeNull();
  });

  it("asks for the reader's own details only after the statement", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("child");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    typeName("Noah");
    fillBirthDate({ month: 3, day: 4, year: 2014 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));

    await screen.findByText(FIRST_RUN_COPY.readingTitle("Noah"));
    expect(screen.queryByPlaceholderText(FIRST_RUN_COPY.youNamePlaceholder)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.readingContinue }));
    expect(await screen.findByPlaceholderText(FIRST_RUN_COPY.youNamePlaceholder)).toBeTruthy();
  });

  it("reaches the closing choices, which name the memorial option explicitly", async () => {
    peopleRows.push({
      id: "person-1",
      display_name: "Rosa",
      is_self: false,
      is_minor: false,
      relation: "mother",
      passed_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    peopleRows.push({
      id: "person-2",
      display_name: "Me",
      is_self: true,
      is_minor: false,
      relation: "self",
      passed_at: null,
      created_at: "2026-01-02T00:00:00.000Z",
    });

    render(<FirstRunFlow />);
    expect(await screen.findByText(FIRST_RUN_COPY.nextTitle)).toBeTruthy();
    expect(screen.getByText(FIRST_RUN_COPY.nextAddTitle)).toBeTruthy();
    expect(screen.getByText(FIRST_RUN_COPY.nextCompareTitle)).toBeTruthy();
    expect(screen.getByText(FIRST_RUN_COPY.nextRememberTitle)).toBeTruthy();
    // The existing remembrance language, not a new phrasing of it.
    expect(screen.getByText(/still part of your sky/)).toBeTruthy();
    expect(screen.getByText(/ancient light on your galaxy/)).toBeTruthy();
  });
});

describe("first-run orientation: the statement is true", () => {
  it("shows the exact sentence the engine produced for the chart that was saved", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("partner");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    typeName("Maya");
    fillBirthDate({ month: 7, day: 16, year: 1990 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));

    await screen.findByText(FIRST_RUN_COPY.readingTitle("Maya"));
    await waitFor(() => expect(chartRows).toHaveLength(1));

    // Recompute independently from the stored chart and demand a match. If the
    // UI ever drifted to a canned line, this is what would catch it.
    const stored = chartRows[0].data;
    const moon = stored.placements.find((p) => p.body === "moon")!;
    expect(moon.confident).toBe(true);
    const expected = interpretPlacement("moon", moon.sign as never, { minorSafe: false }).long;

    expect(statementOnScreen()).toContain(expected);
    expect(statementOnScreen()).toContain(`Maya's ${moon.sign} Moon`);
  });

  it("says the reading came from computed data, not from a generator", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("work");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    typeName("Dana");
    fillBirthDate({ month: 2, day: 9, year: 1984 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));

    await screen.findByText(FIRST_RUN_COPY.readingTitle("Dana"));
    expect(screen.getByText(FIRST_RUN_COPY.readingProvenance)).toBeTruthy();
  });

  it("labels a year-only reading as generational instead of passing it off as personal", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("other");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    typeName("Ira");
    fireEvent.click(screen.getByText("Year only"));
    fireEvent.change(screen.getByPlaceholderText("e.g. 1952"), { target: { value: "1971" } });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));

    await screen.findByText(FIRST_RUN_COPY.readingTitle("Ira"));
    await waitFor(() => expect(chartRows).toHaveLength(1));
    // A bare year settles no personal placement, so the copy must say so.
    expect(screen.getByText(FIRST_RUN_COPY.readingGenerational)).toBeTruthy();

    const stored = chartRows[0].data;
    expect(stored.placements.find((p) => p.body === "moon")).toBeUndefined();
    expect(stored.placements.find((p) => p.body === "sun")?.confident).toBe(false);
  });

  it("never renders a statement the stored chart cannot support", async () => {
    // Drive a real save, then check the rendered sentence against the ladder:
    // whichever body it claims must be confident in the chart on disk.
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("father");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    typeName("Tom");
    fillBirthDate({ month: 11, day: 30, year: 1962 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));

    await screen.findByText(FIRST_RUN_COPY.readingTitle("Tom"));
    await waitFor(() => expect(chartRows).toHaveLength(1));

    const text = statementOnScreen();
    const body = (["Moon", "Sun", "Pluto", "Neptune", "Uranus"] as const).find((b) => text.includes(`Tom's `) && text.includes(` ${b}`));
    expect(body, `statement named no body: ${text}`).toBeTruthy();
    const placement = chartRows[0].data.placements.find((p) => p.body === body!.toLowerCase());
    expect(placement?.confident).toBe(true);
  });
});

describe("first-run orientation: minor safety", () => {
  it("refuses a partner framing for a minor, stores something neutral, and says so", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("partner");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    typeName("Kai");
    // A birth date that is plainly under 18, with the checkbox left alone: the
    // age backstop has to catch this on its own.
    fillBirthDate({ month: 6, day: 1, year: 2015 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));

    await waitFor(() => expect(peopleRows).toHaveLength(1));
    expect(peopleRows[0].is_minor).toBe(true);
    expect(peopleRows[0].relation).not.toBe("partner");
    expect(peopleRows[0].relation).toBe("other");

    await screen.findByText(FIRST_RUN_COPY.readingTitle("Kai"));
    // The change is admitted, never made quietly.
    expect(screen.getByText(FIRST_RUN_COPY.readingRefused("Kai"))).toBeTruthy();
  });

  it("keeps no romantic vocabulary anywhere on a minor's reading screen", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("partner");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    typeName("Kai");
    fillBirthDate({ month: 6, day: 1, year: 2015 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));

    await screen.findByText(FIRST_RUN_COPY.readingTitle("Kai"));
    const page = document.body.textContent ?? "";
    expect(page).not.toMatch(/\b(romance|attraction|lover|seduc|sexual|dating|flirt)\b/i);
  });
});

describe("first-run orientation: remembrance", () => {
  it("records the loss at creation instead of leaving it to be found later", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("lost");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    typeName("Nonna");
    fillBirthDate({ month: 4, day: 12, year: 1939 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));

    await waitFor(() => expect(peopleRows).toHaveLength(1));
    expect(peopleRows[0].passed_at).toBeTruthy();
  });

  it("leaves passed_at alone for everyone else", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("mother");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    typeName("Rosa");
    fillBirthDate({ month: 4, day: 12, year: 1959 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));

    await waitFor(() => expect(peopleRows).toHaveLength(1));
    expect(peopleRows[0].passed_at).toBeNull();
  });
});

describe("first-run orientation: skip, settle and resume", () => {
  it("can be skipped from any step, and records that it was skipped", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    fireEvent.click(screen.getByText(FIRST_RUN_COPY.skip));

    await waitFor(() => expect(pushed).toContain("/app"));
    const settle = profileUpdates.find((u) => u.onboarding_step === "skipped");
    expect(settle).toBeTruthy();
    expect(settle?.onboarding_completed_at).toBeTruthy();
  });

  it("offers the skip on the reading step too, not only at the start", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("mother");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    expect(screen.getByText(FIRST_RUN_COPY.skip)).toBeTruthy();
    typeName("Rosa");
    fillBirthDate({ month: 7, day: 16, year: 1958 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));
    await screen.findByText(FIRST_RUN_COPY.readingTitle("Rosa"));
    expect(screen.getByText(FIRST_RUN_COPY.skip)).toBeTruthy();
  });

  it("records each step as the reader reaches it, so a closed tab knows where to return", async () => {
    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("mother");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    expect(profileUpdates.map((u) => u.onboarding_step)).toContain("birth");

    typeName("Rosa");
    fillBirthDate({ month: 7, day: 16, year: 1958 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));
    await screen.findByText(FIRST_RUN_COPY.readingTitle("Rosa"));
    expect(profileUpdates.map((u) => u.onboarding_step)).toContain("reading");
  });

  it("resumes at the reading, with the same true sentence, after the tab is closed", async () => {
    // First visit: save the person, then throw the component away mid-flow.
    const first = render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.whoTitle);
    pickOption("partner");
    await screen.findByText(FIRST_RUN_COPY.birthTitle);
    typeName("Maya");
    fillBirthDate({ month: 7, day: 16, year: 1990 });
    fireEvent.click(screen.getByRole("button", { name: FIRST_RUN_COPY.birthSubmit }));
    await screen.findByText(FIRST_RUN_COPY.readingTitle("Maya"));
    const before = statementOnScreen();
    first.unmount();

    // Second visit: same account, nothing else changed.
    render(<FirstRunFlow />);
    expect(await screen.findByText(FIRST_RUN_COPY.readingTitle("Maya"))).toBeTruthy();
    expect(statementOnScreen()).toBe(before);
    expect(replaced).not.toContain("/app");
  });

  it("never starts over from step one when a person already exists", async () => {
    peopleRows.push({
      id: "person-1",
      display_name: "Rosa",
      is_self: false,
      is_minor: false,
      relation: "mother",
      passed_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    chartRows.push({
      person_id: "person-1",
      data: computeNatalChart({ dateUTC: "1958-07-16T00:00:00.000Z", precision: "date" }),
    });
    profileRow = { ...profileRow, onboarding_step: "reading" };

    render(<FirstRunFlow />);
    expect(await screen.findByText(FIRST_RUN_COPY.readingTitle("Rosa"))).toBeTruthy();
    expect(screen.queryByText(FIRST_RUN_COPY.whoTitle)).toBeNull();
  });

  it("sends a settled account to the constellation instead of repeating itself", async () => {
    profileRow = {
      ...profileRow,
      onboarding_step: "done",
      onboarding_completed_at: "2026-09-14T00:00:00.000Z",
    };
    render(<FirstRunFlow />);
    await waitFor(() => expect(replaced).toContain("/app"));
  });

  it("re-opens for someone who skipped and asked for it back", async () => {
    profileRow = {
      ...profileRow,
      onboarding_step: "skipped",
      onboarding_completed_at: "2026-09-14T00:00:00.000Z",
    };
    setSearch("?restart=1");

    render(<FirstRunFlow />);
    expect(await screen.findByText(FIRST_RUN_COPY.whoTitle)).toBeTruthy();
    expect(replaced).not.toContain("/app");
    // The settled stamp is cleared, so progress can be recorded again.
    const reopen = profileUpdates.find((u) => u.onboarding_completed_at === null);
    expect(reopen).toBeTruthy();
  });

  it("settles as done, not skipped, when the reader finishes on their own terms", async () => {
    peopleRows.push({
      id: "person-1",
      display_name: "Rosa",
      is_self: false,
      is_minor: false,
      relation: "mother",
      passed_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    peopleRows.push({
      id: "person-2",
      display_name: "Me",
      is_self: true,
      is_minor: false,
      relation: "self",
      passed_at: null,
      created_at: "2026-01-02T00:00:00.000Z",
    });

    render(<FirstRunFlow />);
    await screen.findByText(FIRST_RUN_COPY.nextTitle);
    fireEvent.click(screen.getByText(FIRST_RUN_COPY.nextCompareTitle));

    await waitFor(() => expect(pushed).toContain("/app/compare"));
    const settle = profileUpdates.find((u) => u.onboarding_step === "done");
    expect(settle?.onboarding_completed_at).toBeTruthy();
  });
});
