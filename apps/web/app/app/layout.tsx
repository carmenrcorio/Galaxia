import Link from "next/link";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        borderBottom: "1px solid var(--line)",
        background: "rgba(16,11,34,.88)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)"
      }}>
        <nav style={{
          width: "min(1100px, 94vw)", margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 0", gap: 12, flexWrap: "wrap"
        }}>
          <Link href="/app" style={{ color: "var(--gold)", fontFamily: "var(--font-fraunces)", fontSize: 22, letterSpacing: "-.01em" }}>
            Galaxia
          </Link>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <NavLink href="/app">Home</NavLink>
            <NavLink href="/app/compare">Compare</NavLink>
            <NavLink href="/app/groups">Groups</NavLink>
            <NavLink href="/app/vela">Vela</NavLink>
            <NavLink href="/app/settings" muted>Settings</NavLink>
            <NavLink href="/account" muted>Account</NavLink>
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}

function NavLink({ href, children, muted }: { href: string; children: ReactNode; muted?: boolean }) {
  return (
    <Link href={href as never} style={{
      color: muted ? "var(--mist2)" : "var(--mist)",
      fontSize: 14, fontWeight: 500,
      padding: "4px 10px", borderRadius: 8,
      transition: "color 150ms",
    }}>
      {children}
    </Link>
  );
}
