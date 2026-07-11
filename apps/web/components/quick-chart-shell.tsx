"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CosmicBackground } from "./cosmic-background";

/**
 * Shared shell for the public Quick Chart pages (/chart, /chart/compare):
 * cosmic background, a compact top wordmark, and a quiet persistent footer.
 *
 * The chrome is auth-aware. For anonymous visitors (the default, and while the
 * viewer check is still loading) it is EXACTLY the acquisition funnel it has
 * always been: a "Log in" pill and a persistent "Sign up to build your galaxy"
 * footer — not a paywall, never intrusive. For a recognized logged-in user
 * (`authed`) there is nothing to sign up for, so those become in-app
 * navigation ("← My constellation" / "Back to my constellation") — no signup
 * CTA is shown to someone who already has an account.
 */
export function QuickChartShell({
  eyebrow, title, authed = false, children
}: { eyebrow: string; title: string; authed?: boolean; children: ReactNode }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: 64 }}>
      <CosmicBackground />
      <header style={{ position: "relative", zIndex: 2, padding: "18px 0 0" }} className="no-print">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href={authed ? "/app" : "/"} style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: "1.3rem", color: "var(--gold)", textDecoration: "none" }}>
            Galax<span style={{ fontStyle: "italic", fontWeight: 500 }}>ia</span>
          </Link>
          {authed ? (
            <Link href="/app" className="pill-link" style={{ fontSize: ".8rem" }}>← My constellation</Link>
          ) : (
            <Link href="/login" className="pill-link" style={{ fontSize: ".8rem" }}>Log in</Link>
          )}
        </div>
      </header>

      <main className="container" style={{ position: "relative", zIndex: 2, paddingTop: 24, paddingBottom: 40, maxWidth: 640 }}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title" style={{ marginBottom: 6 }}>{title}</h1>
        {children}
      </main>

      <div className="no-print" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
        background: "linear-gradient(180deg, transparent, rgba(10,7,23,.94) 40%)",
        borderTop: "1px solid rgba(183,154,216,.12)", padding: "10px 0"
      }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: ".92rem", color: "var(--gold)" }}>Galaxia</span>
          {authed ? (
            <Link href="/app" style={{ color: "var(--mist)", fontSize: ".82rem", textDecoration: "none" }}>
              ← Back to my constellation
            </Link>
          ) : (
            <Link href="/signup" style={{ color: "var(--mist)", fontSize: ".82rem", textDecoration: "none" }}>
              Sign up to build your galaxy →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
