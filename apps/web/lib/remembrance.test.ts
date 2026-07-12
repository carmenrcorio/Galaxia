import { describe, expect, it } from "vitest";
import { REMEMBRANCE_CHROME, remembranceVelaHref } from "./remembrance";

describe("Remembrance web chrome + Vela href", () => {
  it("entry href is navigation-only — no prefill q, no auto-send signal", () => {
    const href = remembranceVelaHref("person-xyz");
    expect(href).toBe("/app/vela?scope=person&subject=person-xyz");
    expect(href).not.toMatch(/[?&]q=/);
    expect(href).not.toMatch(/auto/i);
  });

  it("reuses existing water/ancient tokens — no new palette invented", () => {
    expect(REMEMBRANCE_CHROME.water).toBe("#6FB1B8");
    expect(REMEMBRANCE_CHROME.ancient).toBe("#DA8C8C");
  });
});
