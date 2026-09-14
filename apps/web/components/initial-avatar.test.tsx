// @vitest-environment jsdom

import { personChipColor } from "@galaxia/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InitialAvatar } from "./initial-avatar";

/** jsdom may keep a hex or normalize to `rgb(r, g, b)`. */
function cssColor(value: string): string {
  const rgb = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
  }
  return value.toLowerCase();
}

afterEach(() => {
  cleanup();
});

describe("InitialAvatar", () => {
  it("paints from personChipColor (sun sign) and never a name-hash class", () => {
    const { container } = render(
      <InitialAvatar name="Maya Chen" personId="p-maya" sunSign="Cancer" />
    );
    const el = container.querySelector(".avatar") as HTMLElement;
    const expected = personChipColor({ id: "p-maya", sunSign: "Cancer" });
    expect(cssColor(el.style.backgroundColor)).toBe(expected.fill.toLowerCase());
    expect(cssColor(el.style.color)).toBe(expected.initial.toLowerCase());
    expect(el.className).not.toMatch(/av-\d/);
    expect(el.getAttribute("aria-label")).toBe("Maya Chen");
    expect(el.textContent).toContain("MC");
  });

  it("keeps the memorial star on the chip regardless of color", () => {
    const { container } = render(
      <InitialAvatar name="Rosa" personId="p-rosa" sunSign="Pisces" memorial />
    );
    const el = container.querySelector(".avatar") as HTMLElement;
    expect(el.getAttribute("aria-label")).toBe("Rosa, remembered");
    expect(container.querySelector(".avatar__star")?.textContent).toBe("✦");
    expect(personChipColor({ id: "p-rosa", sunSign: "Pisces" }).element).toBe("water");
  });

  it("hashes person id when no sun sign exists yet", () => {
    const { container } = render(<InitialAvatar name="New" personId="uuid-no-chart" />);
    const el = container.querySelector(".avatar") as HTMLElement;
    expect(cssColor(el.style.backgroundColor)).toBe(
      personChipColor({ id: "uuid-no-chart" }).fill.toLowerCase()
    );
  });
});
