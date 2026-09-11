import type { Metadata } from "next";
import Link from "next/link";
import { publicEnv } from "../../lib/env";
import { WaitlistForm } from "../../components/waitlist-form";

const TITLE = "Download Galaxia";
// FOUNDER-REVIEW: rewritten. Native apps are coming soon; notify-me is on this page.
const DESCRIPTION =
  "Galaxia is on the web today. Native iOS and Android apps are coming soon. Leave your email and we will tell you when they ship.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Galaxia",
    type: "website",
    url: "/download",
    // FOUNDER-REVIEW: rewritten (no U+2014).
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Galaxia: astrology for the people you love" }]
  }
};

export default function DownloadPage() {
  const iosLink = publicEnv.iosAppStoreUrl || publicEnv.testflightUrl;
  const androidLink = publicEnv.androidPlayUrl;
  const hasAnyLink = Boolean(iosLink || androidLink);

  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 56, maxWidth: 920 }}>
      <h1 className="auth-title">Download Galaxia</h1>
      {/* FOUNDER-REVIEW: rewritten. Web is live; native apps are coming soon. */}
      <p className="muted">
        Use your Galaxia account on the web today. Native iOS and Android apps are coming soon
        and will use the same account.
      </p>
      <section className="glass-card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Get the app</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {iosLink ? (
            <a href={iosLink} className="pill-link pill-link--gold">
              {publicEnv.iosAppStoreUrl ? "Download on the App Store" : "Join the iOS beta"}
            </a>
          ) : (
            <span className="pill-link">iOS coming soon</span>
          )}
          {androidLink ? (
            <a href={androidLink} className="pill-link pill-link--gold">
              Get it on Google Play
            </a>
          ) : (
            <span className="pill-link">Android coming soon</span>
          )}
        </div>
        {!hasAnyLink ? (
          <div style={{ marginTop: 16 }}>
            {/* FOUNDER-REVIEW: authored. Notify-me lives on this page, not on signup or the landing page. */}
            <p className="muted" style={{ marginTop: 0 }}>
              Leave your email and we will tell you when the apps are ready.
            </p>
            <WaitlistForm source="close" />
          </div>
        ) : null}
      </section>
      <section className="glass-card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>What you get in the app</h2>
        <ul className="muted" style={{ lineHeight: 1.7 }}>
          <li>A living constellation view of the people at the center of your life.</li>
          <li>Real computed charts and relationship mapping built from astronomical data.</li>
          {/* FOUNDER-REVIEW: rewritten. Shared spaces are unshipped; this names private Vela only. */}
          <li>Vela guidance for private reflection.</li>
        </ul>
      </section>
      <div style={{ marginTop: 12 }}>
        <Link className="pill-link" href="/app">
          Continue on web app
        </Link>
      </div>
    </main>
  );
}
