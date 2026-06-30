import { tokens } from "../lib/tokens";
import Link from "next/link";
import type { CSSProperties } from "react";

const cardStyle: CSSProperties = {
  background: tokens.colors.ink2,
  border: `1px solid ${tokens.colors.line}`,
  borderRadius: 16,
  padding: 24,
  maxWidth: 720
};

export default function MarketingPage() {
  return (
    <main style={{ padding: 32, display: "grid", placeItems: "center" }}>
      <section style={cardStyle}>
        <p style={{ color: tokens.colors.gold, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Galaxia
        </p>
        <h1 style={{ fontSize: 42, margin: "8px 0 14px" }}>Relationship intelligence, under one sky.</h1>
        <p style={{ color: tokens.colors.mist, lineHeight: 1.6 }}>
          Galaxia helps you map the people you love, decode compatibility, and understand generational patterns with
          privacy-first astrology and warm AI guidance.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <Link href="/account" style={{ color: tokens.colors.ink, background: tokens.colors.gold, padding: "10px 16px", borderRadius: 999 }}>
            Open account landing
          </Link>
        </div>
      </section>
    </main>
  );
}
