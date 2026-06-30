import { GetApp } from "../../components/get-app";
import { SmartAppBanner } from "../../components/smart-app-banner";
import { publicEnv } from "../../lib/env";

export default function DownloadPage() {
  const siteUrl = publicEnv.siteUrl || "";
  return (
    <main className="container" style={{ padding: "56px 0", maxWidth: 920 }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: "clamp(38px,6vw,62px)", marginBottom: 12 }}>Download Galaxia</h1>
      <p className="muted" style={{ maxWidth: 780 }}>
        Galaxia Mea, Vela, and your complete constellation are designed for mobile first. Use your same account to continue from web into the app.
      </p>
      <GetApp source="download" />
      <section className="glass-card" style={{ marginTop: 18 }}>
        <h2 style={{ marginTop: 0 }}>What you get in the app</h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--mist)", lineHeight: 1.7 }}>
          <li>A living constellation view of the people at the center of your life.</li>
          <li>Real computed charts and relationship mapping built from astronomical data.</li>
          <li>Vela guidance for private reflection and consented shared spaces.</li>
        </ul>
      </section>
      <section style={{ marginTop: 16 }}>
        <SmartAppBanner deepLink={`${siteUrl}/account`} />
      </section>
    </main>
  );
}
