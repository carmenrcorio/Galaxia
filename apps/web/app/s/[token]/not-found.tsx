import Link from "next/link";
import { CosmicBackground } from "../../../components/cosmic-background";

export default function ShareNotFound() {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <main className="container" style={{ position: "relative", zIndex: 2, paddingTop: 80, maxWidth: 560 }}>
        {/* FOUNDER-REVIEW: authored — unknown / forged share token. */}
        <p className="eyebrow">Shared reading</p>
        <h1 className="page-title" style={{ marginBottom: 12 }}>This link isn&apos;t available</h1>
        <p className="muted" style={{ lineHeight: 1.65, marginBottom: 24 }}>
          The share link may be mistyped or no longer exists. It never opens someone else&apos;s reading.
        </p>
        <Link href="/chart" className="pill-link">
          Try a free chart
        </Link>
      </main>
    </div>
  );
}
