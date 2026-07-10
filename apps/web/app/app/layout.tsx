import Link from "next/link";
import type { ReactNode } from "react";
import { CosmicBackground } from "../../components/cosmic-background";
import { TrialBanner } from "../../components/trial-banner";

/**
 * App shell layout.
 * Nav from design/reference/galaxia-landing-v2.html:
 *   backdrop-filter: blur(14px) saturate(1.1)
 *   background: linear-gradient(180deg, rgba(10,7,23,.72), rgba(10,7,23,.18))
 *   border-bottom: 1px solid rgba(255,255,255,.05)
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />

      <nav style={{
        position: "sticky", top: 0, zIndex: 40,
        backdropFilter:         "blur(14px) saturate(1.1)",
        WebkitBackdropFilter:   "blur(14px) saturate(1.1)",
        background:             "linear-gradient(180deg, rgba(10,7,23,.72), rgba(10,7,23,.18))",
        borderBottom:           "1px solid rgba(255,255,255,.05)",
      }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          {/* Brand: italic "ia" from landing .brand span */}
          <Link href="/app" style={{
            fontFamily: "var(--serif)", fontWeight: 600, fontSize: "1.42rem",
            color: "var(--gold)", letterSpacing: ".01em",
          }}>
            Galax<span style={{ fontStyle: "italic", fontWeight: 500 }}>ia</span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <NavLink href="/app">Home</NavLink>
            <NavLink href="/app/compare">Compare</NavLink>
            <NavLink href="/app/groups">Groups</NavLink>
            <NavLink href="/app/vela">Vela</NavLink>
            <NavLink href="/app/settings">Settings</NavLink>
            {/* Public route — no auth guard needed. Distinct from the floating
                "Quick check" launcher on /app (fast in-app compatibility
                modal); this opens the full public /chart experience. */}
            <NavLink href="/chart">Quick Chart</NavLink>
            <Link href="/account" className="pill-link--gold" style={{ padding: "9px 18px", borderRadius: 100, background: "linear-gradient(180deg,var(--gold-bright),var(--gold))", color: "#1a1206", fontWeight: 600, fontSize: ".86rem", boxShadow: "0 6px 22px -8px rgba(230,174,108,.6)", textDecoration: "none" }}>
              Account
            </Link>
          </div>
        </div>
      </nav>

      {/* Content sits above CosmicBackground (z-index 2) */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <TrialBanner />
        {children}
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href as never} style={{
      color: "var(--mist)", textDecoration: "none",
      fontSize: ".86rem", fontWeight: 500, letterSpacing: ".01em",
      transition: "color .25s",
    }}>
      {children}
    </Link>
  );
}
