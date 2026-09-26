// @vitest-environment jsdom

import { APP_TOUR_COPY } from "@galaxia/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppTour } from "./app-tour";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 20,
    y: 80,
    top: 80,
    left: 20,
    right: 240,
    bottom: 130,
    width: 220,
    height: 50,
    toJSON: () => ({}),
  });
  document.body.innerHTML =
    '<button data-app-tour="add-person">Add</button>' +
    '<div data-app-tour="see-chart">Chart</div>' +
    '<a data-app-tour="compare" href="/app/compare">Compare</a>';
});

describe("AppTour", () => {
  it("renders all three approved steps in order", async () => {
    render(<AppTour onSeen={vi.fn()} />);
    expect(await screen.findByText(APP_TOUR_COPY.steps[0].title)).toBeTruthy();
    expect(screen.getByText(APP_TOUR_COPY.steps[0].secondary)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: APP_TOUR_COPY.next }));
    expect(await screen.findByText(APP_TOUR_COPY.steps[1].title)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: APP_TOUR_COPY.next }));
    expect(await screen.findByText(APP_TOUR_COPY.steps[2].title)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: APP_TOUR_COPY.finish })
    ).toBeTruthy();
  });

  it("marks the tour seen when skipped", async () => {
    const onSeen = vi.fn().mockResolvedValue(undefined);
    render(<AppTour onSeen={onSeen} />);
    await screen.findByText(APP_TOUR_COPY.steps[0].title);
    fireEvent.click(screen.getByRole("button", { name: APP_TOUR_COPY.skip }));
    await waitFor(() => expect(onSeen).toHaveBeenCalledOnce());
  });

  it("marks the tour seen when Escape is pressed", async () => {
    const onSeen = vi.fn().mockResolvedValue(undefined);
    render(<AppTour onSeen={onSeen} />);
    await screen.findByText(APP_TOUR_COPY.steps[0].title);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onSeen).toHaveBeenCalledOnce());
  });

  it("keeps focus inside the dialog", async () => {
    render(<AppTour onSeen={vi.fn()} />);
    const skip = await screen.findByRole("button", {
      name: APP_TOUR_COPY.skip,
    });
    const next = screen.getByRole("button", { name: APP_TOUR_COPY.next });
    next.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(skip);
    skip.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(next);
  });

  it("keeps the tooltip below the viewport top for a tall chart target", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 20,
      y: 20,
      top: 20,
      left: 20,
      right: 900,
      bottom: 700,
      width: 880,
      height: 680,
      toJSON: () => ({}),
    });
    render(<AppTour onSeen={vi.fn()} />);
    await screen.findByText(APP_TOUR_COPY.steps[0].title);
    fireEvent.click(screen.getByRole("button", { name: APP_TOUR_COPY.next }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog.style.top).toBe("72px"));
  });

  it("keeps the tour open and explains a failed profile write", async () => {
    const onSeen = vi.fn().mockRejectedValue(new Error("offline"));
    render(<AppTour onSeen={onSeen} />);
    await screen.findByText(APP_TOUR_COPY.steps[0].title);
    fireEvent.click(screen.getByRole("button", { name: APP_TOUR_COPY.skip }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      APP_TOUR_COPY.saveError
    );
  });
});
