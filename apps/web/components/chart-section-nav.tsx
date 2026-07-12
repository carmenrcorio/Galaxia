"use client";

/**
 * Sticky, phone-first horizontal chip rail for long chart pages.
 * Anchors only — parent passes the sections that actually render
 * (see buildPersonPageNavSections) so there are never dead links.
 */

import type { PersonNavSection } from "../lib/person-care";

export function ChartSectionNav({
  sections,
  ariaLabel = "Jump to section",
}: {
  sections: PersonNavSection[];
  ariaLabel?: string;
}) {
  if (sections.length === 0) return null;

  return (
    <nav
      className="chart-section-nav"
      aria-label={ariaLabel}
      style={{
        position: "sticky",
        top: 68,
        zIndex: 25,
        margin: "0 0 4px",
        padding: "8px 0",
        background: "linear-gradient(180deg, rgba(10,7,23,.92), rgba(10,7,23,.72))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,.05)",
      }}
    >
      <ul
        className="chart-section-nav__list"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          maxWidth: "100%",
        }}
      >
        {sections.map((s) => (
          <li key={s.id} style={{ flexShrink: 0 }}>
            <a
              href={`#${s.id}`}
              className="chart-section-nav__chip"
              style={{
                display: "inline-block",
                padding: "6px 11px",
                borderRadius: 999,
                fontSize: ".72rem",
                fontWeight: 600,
                letterSpacing: ".02em",
                color: "var(--mist)",
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(183,154,216,.18)",
                textDecoration: "none",
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
