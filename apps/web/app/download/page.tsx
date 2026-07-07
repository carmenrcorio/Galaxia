import Link from "next/link";
import { publicEnv } from "../../lib/env";

export default function DownloadPage() {
  const iosLink = publicEnv.iosAppStoreUrl || publicEnv.testflightUrl;
  const androidLink = publicEnv.androidPlayUrl;
  const hasAnyLink = Boolean(iosLink || androidLink);

  return (
    <main className="container" style={{ padding: "56px 0", maxWidth: 920 }}>
      <h1 className="auth-title">Download Galaxia</h1>
      <p className="muted">Galaxia Mea, Vela, and your complete constellation are designed for mobile first.</p>
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
        {!hasAnyLink ? <p className="muted">Notify-me flow is available from the signup and landing forms.</p> : null}
      </section>
      <section className="glass-card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>What you get in the app</h2>
        <ul className="muted" style={{ lineHeight: 1.7 }}>
          <li>A living constellation view of the people at the center of your life.</li>
          <li>Real computed charts and relationship mapping built from astronomical data.</li>
          <li>Vela guidance for private reflection and consented shared spaces.</li>
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
