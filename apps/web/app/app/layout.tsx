import Link from "next/link";
import type { ReactNode } from "react";
import { CosmicBackground } from "../../components/cosmic-background";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        borderBottom: "1px solid rgba(183,154,216,.12)",
        background: "rgba(10,7,23,.72)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}>
        <nav className="container" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 0", gap: 10, flexWrap: "wrap"
        }}>
          <Link href="/app" style={{
            color: "var(--gold)", fontFamily: "var(--font-fraunces)", fontSize: 22,
            letterSpacing: "-.01em"
          }}>
            Galaxia
          </Link>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            <NavLink href="/app">Galaxia Mea</NavLink>
            <NavLink href="/app/compare">Compare</NavLink>
            <NavLink href="/app/groups">Groups</NavLink>
            <NavLink href="/app/vela">Vela</NavLink>
            <NavLink href="/app/settings">Settings</NavLink>
            <NavLink href="/account">Account</NavLink>
          </div>
        </nav>
      </header>
      <div style={{ position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href as never} style={{
      color: "var(--mist)", fontSize: 13, fontWeight: 500,
      padding: "5px 12px", borderRadius: 100,
      border: "1px solid transparent",
      transition: "color .15s, border-color .15s",
    }}
    onMouseEnter={undefined}
    >
      {children}
    </Link>
  );
}
