// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PersonRecordTimeline } from "./person-record-timeline";
import type { RecordEntry } from "../lib/record";
import {
  RECORD_CLEAR_FILTERS,
  RECORD_DATE_FROM_LABEL,
  RECORD_FILTER_EMPTY,
  RECORD_SEARCH_PLACEHOLDER,
  RECORD_TAG_LABELS
} from "../lib/record-copy";

afterEach(() => {
  cleanup();
});

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  )
}));

const entries: RecordEntry[] = [
  {
    id: "n1",
    kind: "note",
    body: "We finally said the hard thing about money",
    createdAt: "2026-03-15T12:00:00.000Z",
    tags: ["hard_conversation"]
  },
  {
    id: "n2",
    kind: "note",
    body: "A small breakthrough in how we fight",
    createdAt: "2026-02-02T08:00:00.000Z",
    tags: ["breakthrough"]
  },
  {
    id: "t1",
    kind: "conversation",
    body: "What should I say to them tomorrow",
    createdAt: "2026-03-01T09:00:00.000Z",
    href: "/app/vela?threadId=abc"
  },
  {
    id: "m1",
    kind: "moment",
    body: "Hard conversation",
    createdAt: "2026-03-20T12:00:00.000Z",
    tags: ["hard_conversation"],
    transitSnapshot: {
      whenUTC: "2026-03-20T12:00:00.000Z",
      quiet: true,
      honesty: "ok",
      includedYou: true,
      includedThem: true,
      youHonesty: "ok",
      themHonesty: "ok",
      hits: []
    }
  }
];

describe("PersonRecordTimeline", () => {
  it("shows a visible date on every entry and groups by month", () => {
    render(<PersonRecordTimeline entries={entries} />);
    expect(screen.getByText("March 2026")).toBeTruthy();
    expect(screen.getByText("February 2026")).toBeTruthy();
    expect(screen.getByText("Mar 15, 2026")).toBeTruthy();
    expect(screen.getByText("Mar 1, 2026")).toBeTruthy();
    expect(screen.getByText("Feb 2, 2026")).toBeTruthy();
  });

  it("renders stored transit context on a Moment and does not invent an aspect when the sky is quiet", () => {
    render(<PersonRecordTimeline entries={entries} personName="Ada" />);
    expect(screen.getByText("Moment")).toBeTruthy();
    expect(screen.getByText(/Nothing significant was active between you and Ada then/)).toBeTruthy();
    expect(screen.getByText(/This moment stands on its own/)).toBeTruthy();
    expect(screen.queryByText(/saturn/i)).toBeNull();
  });

  it("filters the loaded set by search, date range, and curated tag", () => {
    render(<PersonRecordTimeline entries={entries} />);
    fireEvent.change(screen.getByPlaceholderText(RECORD_SEARCH_PLACEHOLDER), {
      target: { value: "money" }
    });
    expect(screen.getByText("We finally said the hard thing about money")).toBeTruthy();
    expect(screen.queryByText("A small breakthrough in how we fight")).toBeNull();
    expect(screen.queryByText("What should I say to them tomorrow")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: RECORD_CLEAR_FILTERS }));
    fireEvent.click(screen.getByRole("button", { name: RECORD_TAG_LABELS.breakthrough }));
    expect(screen.getByText("A small breakthrough in how we fight")).toBeTruthy();
    expect(screen.queryByText("We finally said the hard thing about money")).toBeNull();
    expect(screen.queryByText("What should I say to them tomorrow")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: RECORD_CLEAR_FILTERS }));
    fireEvent.change(screen.getByLabelText(RECORD_DATE_FROM_LABEL), {
      target: { value: "2026-03-01" }
    });
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2026-03-31" }
    });
    expect(screen.getByText("We finally said the hard thing about money")).toBeTruthy();
    expect(screen.getByText("What should I say to them tomorrow")).toBeTruthy();
    expect(screen.queryByText("A small breakthrough in how we fight")).toBeNull();
  });

  it("lets the owner tag an existing note without touching compose, and shows empty filter copy", () => {
    const onTagsChange = vi.fn();
    render(<PersonRecordTimeline entries={entries} onTagsChange={onTagsChange} />);
    const celebrationButtons = screen.getAllByRole("button", { name: RECORD_TAG_LABELS.celebration });
    fireEvent.click(celebrationButtons[1]!);
    expect(onTagsChange).toHaveBeenCalledWith("n1", ["hard_conversation", "celebration"]);

    fireEvent.change(screen.getByPlaceholderText(RECORD_SEARCH_PLACEHOLDER), {
      target: { value: "no such memory" }
    });
    expect(screen.getByText(RECORD_FILTER_EMPTY)).toBeTruthy();
  });
});
