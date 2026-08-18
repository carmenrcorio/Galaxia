import Link from "next/link";
import { CosmicBackground } from "../components/cosmic-background";

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
          <Link href="/" className="pill-link">
            Back to home
          </Link>
          <Link href="/chart" className="pill-link pill-link--gold">
            Try a free chart
          </Link>
        </div>
      </main>
    </div>
  );
}
