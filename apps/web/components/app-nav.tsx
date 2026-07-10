"use client";

/**
 * The in-app nav, as a standalone client component so it can carry its own
 * open/closed state and (eventually) be reused elsewhere — e.g. the
 * marketing landing's nav, which today is raw HTML in a string in
 * apps/web/app/page.tsx and would need to be ported to JSX first to import
 * this directly. Noting the seam rather than doing that port here.
 *
 * BUG (fixed here): the previous inline nav put 6 links + the Account pill
 * in one flex row with a hardcoded height:64. Below ~860px those 7 items
 * couldn't fit one line; the only escape valve (flexWrap:wrap on the inner
 * group) wrapped them into 2–3 rows that didn't fit the fixed-height box,
 * spilling both above and below it — pushing Home/Compare/Groups off the
 * top of the viewport and rendering the gold Account pill on top of
 * TrialBanner underneath. There was no way to patch that by tuning numbers;
 * a fixed-height row and "6+ items that must fit or wrap" are fundamentally
 * incompatible on a phone.
 *
 * FIX: below the breakpoint, the header row only ever holds two things —
 * the brand and a hamburger trigger — so there is nothing left to wrap.
 * The 6 links + Account move into a drawer that renders in normal document
 * flow directly under the header (inside the same sticky <nav>), so opening
 * it grows the nav and pushes TrialBanner down — it can never overlap it.
 * Desktop (>860px, matching the marketing nav's existing breakpoint) is
 * unchanged: the same inline links row and Account pill, same styling.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const LINKS: { href: string; label: string }[] = [
  { href: "/app", label: "Home" },
  { href: "/app/compare", label: "Compare" },
  { href: "/app/groups", label: "Groups" },
  { href: "/app/vela", label: "Vela" },
  { href: "/app/settings", label: "Settings" },
  // Public route — no auth guard needed. Distinct from the floating
  // "Quick check" launcher on /app (fast in-app compatibility modal); this
  // opens the full public /chart experience.
  { href: "/chart", label: "Quick Chart" },
];

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Never leave the drawer open across a navigation.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Escape closes it too, same as clicking the trigger again.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 40,
      backdropFilter:         "blur(14px) saturate(1.1)",
      WebkitBackdropFilter:   "blur(14px) saturate(1.1)",
      background:             "linear-gradient(180deg, rgba(10,7,23,.72), rgba(10,7,23,.18))",
      borderBottom:           "1px solid rgba(255,255,255,.05)",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 64, padding: "10px 0" }}>
        {/* Brand: italic "ia" from landing .brand span */}
        <Link href="/app" style={{
          fontFamily: "var(--serif)", fontWeight: 600, fontSize: "1.42rem",
          color: "var(--gold)", letterSpacing: ".01em", flexShrink: 0,
        }}>
          Galax<span style={{ fontStyle: "italic", fontWeight: 500 }}>ia</span>
        </Link>

        {/* Desktop: unchanged inline row, hidden below the breakpoint (globals.css) */}
        <div className="app-nav-links">
          {LINKS.map((l) => <DesktopLink key={l.href} href={l.href}>{l.label}</DesktopLink>)}
          <Link href="/account" className="pill-link--gold" style={{ padding: "9px 18px", borderRadius: 100, background: "linear-gradient(180deg,var(--gold-bright),var(--gold))", color: "#1a1206", fontWeight: 600, fontSize: ".86rem", boxShadow: "0 6px 22px -8px rgba(230,174,108,.6)", textDecoration: "none" }}>
            Account
          </Link>
        </div>

        {/* Mobile: hamburger trigger, hidden above the breakpoint (globals.css) */}
        <button
          type="button"
          className="app-nav-trigger-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile drawer — normal document flow, directly under the header row,
          still inside the sticky nav. Growing this pushes TrialBanner down
          instead of overlapping it; there is no fixed height anywhere here
          to spill out of. */}
      {open ? (
        <div className="container app-nav-drawer">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href as never} className="app-nav-drawer-link" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href="/account" className="app-nav-drawer-link app-nav-drawer-link--gold" onClick={() => setOpen(false)}>
            Account
          </Link>
        </div>
      ) : null}
    </nav>
  );
}

function DesktopLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href as never} className="app-nav-link">
      {children}
    </Link>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
