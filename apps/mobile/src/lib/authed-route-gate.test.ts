import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveAuthedRouteGate, resolvePublicIndexGate } from "./authed-route-gate";

describe("resolveAuthedRouteGate", () => {
  it("unauth deep-link → redirect /", () => {
    expect(
      resolveAuthedRouteGate({
        authLoading: false,
        sessionPresent: false,
        entitlementLoading: false,
        hasAccess: false
      })
    ).toEqual({ type: "redirect", href: "/" });
  });

  it("unentitled → redirect /subscribe", () => {
    expect(
      resolveAuthedRouteGate({
        authLoading: false,
        sessionPresent: true,
        entitlementLoading: false,
        hasAccess: false
      })
    ).toEqual({ type: "redirect", href: "/subscribe" });
  });

  it("entitled → allow", () => {
    expect(
      resolveAuthedRouteGate({
        authLoading: false,
        sessionPresent: true,
        entitlementLoading: false,
        hasAccess: true
      })
    ).toEqual({ type: "allow" });
  });

  it("waits while auth or entitlement is loading", () => {
    expect(
      resolveAuthedRouteGate({
        authLoading: true,
        sessionPresent: false,
        entitlementLoading: false,
        hasAccess: false
      }).type
    ).toBe("loading");
    expect(
      resolveAuthedRouteGate({
        authLoading: false,
        sessionPresent: true,
        entitlementLoading: true,
        hasAccess: false
      }).type
    ).toBe("loading");
  });
});

describe("resolvePublicIndexGate", () => {
  it("signed out → sign-in", () => {
    expect(
      resolvePublicIndexGate({
        authLoading: false,
        sessionPresent: false,
        entitlementLoading: false,
        hasAccess: false
      })
    ).toEqual({ type: "show-sign-in" });
  });

  it("unentitled session → /subscribe", () => {
    expect(
      resolvePublicIndexGate({
        authLoading: false,
        sessionPresent: true,
        entitlementLoading: false,
        hasAccess: false
      })
    ).toEqual({ type: "redirect", href: "/subscribe" });
  });

  it("entitled session → /home", () => {
    expect(
      resolvePublicIndexGate({
        authLoading: false,
        sessionPresent: true,
        entitlementLoading: false,
        hasAccess: true
      })
    ).toEqual({ type: "redirect", href: "/home" });
  });
});

describe("mobile (app) route-group wiring", () => {
  it("authed layout imports the pure gate and Redirects via gate.href", () => {
    const src = readFileSync(resolve(__dirname, "../../app/(app)/_layout.tsx"), "utf8");
    expect(src).toContain("resolveAuthedRouteGate");
    expect(src).toContain("<Redirect href={gate.href} />");
    expect(src).toContain("hasAccess");
    // Targets live in the pure gate (single source for / vs /subscribe).
    const gateSrc = readFileSync(resolve(__dirname, "./authed-route-gate.ts"), "utf8");
    expect(gateSrc).toContain('href: "/"');
    expect(gateSrc).toContain('href: "/subscribe"');
  });

  it("public index redirects entitled users into the authed tree", () => {
    const src = readFileSync(resolve(__dirname, "../../app/index.tsx"), "utf8");
    expect(src).toContain("resolvePublicIndexGate");
    expect(src).toContain("<Redirect href={gate.href} />");
    const gateSrc = readFileSync(resolve(__dirname, "./authed-route-gate.ts"), "utf8");
    expect(gateSrc).toContain('href: "/home"');
    expect(gateSrc).toContain('href: "/subscribe"');
  });
});
