"use client";

/**
 * Marketing landing nav. Reuses the same collapse pattern as
 * apps/web/components/app-nav.tsx (and its .app-nav-links / .app-nav-trigger-btn /
 * .app-nav-drawer / .app-nav-drawer-link CSS in globals.css, shared by both navs)
 * instead of duplicating a second mobile-menu implementation.
 *
 * Fixes a real bug, not a cosmetic one: the previous raw-HTML nav's only
 * mobile behavior was `.nav-links a:not(.nav-cta){display:none}` below
 * 860px — every link except the CTA pill simply vanished, with no menu to
 * open them from at all. This nav could never be reached on a phone.
 */

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

const LINKS: { href: string; label: string }[] = [
  { href: "#shift", label: "Why Galaxia" },
  { href: "#generations", label: "Generations" },
  { href: "#vela", label: "Meet Vela" },
  { href: "#trust", label: "Privacy" },
  { href: "#pricing", label: "Pricing" },
  { href: "/chart", label: "Quick Chart" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  // An in-page anchor click should close the drawer immediately, not leave
  // it open over the section it just navigated to.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 40,
      backdropFilter:       "blur(14px) saturate(1.1)",
      WebkitBackdropFilter: "blur(14px) saturate(1.1)",
      background:           "linear-gradient(180deg, rgba(10,7,23,.72), rgba(10,7,23,.18))",
      borderBottom:         "1px solid rgba(255,255,255,.05)",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 68, paddingTop: 10, paddingBottom: 10 }}>
        <Link href="/" style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: "1.42rem", color: "var(--gold)", letterSpacing: ".01em", flexShrink: 0 }}>
          Galax<span style={{ fontStyle: "italic", fontWeight: 500 }}>ia</span>
        </Link>

        <div className="app-nav-links">
          {LINKS.map((l) => <DesktopLink key={l.href} href={l.href}>{l.label}</DesktopLink>)}
          <Link href="/signup" className="pill-link--gold" style={{ padding: "9px 18px", borderRadius: 100, fontSize: ".86rem" }}>
            Start 14 days free
          </Link>
        </div>

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

      {open ? (
        <div className="container app-nav-drawer">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href as never} className="app-nav-drawer-link" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href="/signup" className="app-nav-drawer-link app-nav-drawer-link--gold" onClick={() => setOpen(false)}>
            Start 14 days free
          </Link>
        </div>
      ) : null}
    </nav>
  );
}

function DesktopLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href as never} className="app-nav-link">{children}</Link>;
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
