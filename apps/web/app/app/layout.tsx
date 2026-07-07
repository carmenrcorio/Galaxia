import Link from "next/link";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--line)", background: "rgba(16,11,34,.86)", backdropFilter: "blur(8px)" }}>
        <nav className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", gap: 10, flexWrap: "wrap" }}>
          <Link href="/app" style={{ color: "var(--gold)", fontFamily: "var(--font-fraunces)", fontSize: 24 }}>
            Galaxia
          </Link>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="pill-link" href="/app">
              Galaxia Mea
            </Link>
            <Link className="pill-link" href="/app/compare">
              Compare
            </Link>
            <Link className="pill-link" href="/app/groups">
              Groups
            </Link>
            <Link className="pill-link" href="/app/vela">
              Vela
            </Link>
            <Link className="pill-link" href="/app/settings">
              Settings
            </Link>
            <Link className="pill-link" href="/account">
              Account
            </Link>
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
