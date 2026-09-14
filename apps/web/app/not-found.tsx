import Link from "next/link";
import { CosmicBackground } from "../components/cosmic-background";
import { NOT_FOUND_LINKS } from "../lib/nav-links";

export default function NotFound() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <main className="container" style={{ position: "relative", zIndex: 2, paddingTop: 80, maxWidth: 620 }}>
        <p className="eyebrow">404</p>
        <h1 className="page-title" style={{ marginBottom: 12 }}>
          This page drifted out of orbit
        </h1>
        <p className="muted" style={{ lineHeight: 1.65, marginBottom: 24 }}>
          The link may be outdated, or the address may be mistyped. Your account and chart data are
          still safe.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link href={NOT_FOUND_LINKS[0].href as never} className="pill-link">
            {NOT_FOUND_LINKS[0].label}
          </Link>
          <Link href={NOT_FOUND_LINKS[1].href as never} className="pill-link pill-link--gold">
            {NOT_FOUND_LINKS[1].label}
          </Link>
        </div>
      </main>
    </div>
  );
}
