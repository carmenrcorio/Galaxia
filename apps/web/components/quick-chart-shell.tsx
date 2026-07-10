"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CosmicBackground } from "./cosmic-background";

/**
 * Shared shell for the public Quick Chart pages (/chart, /chart/compare):
 * cosmic background, a compact top wordmark, and a quiet persistent footer
 * ("Sign up to build your galaxy") — not a paywall, never intrusive.
 */
export function QuickChartShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: 64 }}>
      <CosmicBackground />
      <header style={{ position: "relative", zIndex: 2, padding: "18px 0 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: "1.3rem", color: "var(--gold)", textDecoration: "none" }}>
            Galax<span style={{ fontStyle: "italic", fontWeight: 500 }}>ia</span>
          </Link>
          <Link href="/login" className="pill-link" style={{ fontSize: ".8rem" }}>Log in</Link>
        </div>
      </header>

      <main className="container" style={{ position: "relative", zIndex: 2, padding: "24px 0 40px", maxWidth: 640 }}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title" style={{ marginBottom: 6 }}>{title}</h1>
        {children}
      </main>

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
        background: "linear-gradient(180deg, transparent, rgba(10,7,23,.94) 40%)",
        borderTop: "1px solid rgba(183,154,216,.12)", padding: "10px 0"
      }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: ".92rem", color: "var(--gold)" }}>Galaxia</span>
          <Link href="/signup" style={{ color: "var(--mist)", fontSize: ".82rem", textDecoration: "none" }}>
            Sign up to build your galaxy →
          </Link>
        </div>
      </div>
    </div>
  );
}
