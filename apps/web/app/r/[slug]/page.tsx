import type { CSSProperties } from "react";

export default async function DeepLinkBridge({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deepLink = `galaxia://${slug}`;

  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 56, maxWidth: 760 }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 40 }}>Open in Galaxia</h1>
      {/* FOUNDER-REVIEW: rewritten. Native store buttons with href "#" were removed. */}
      <p style={{ color: "var(--mist)" }}>
        Galaxia is on the web today. If you already have the app on this device, you can open this
        link in it. Native iOS and Android apps are coming soon.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href={deepLink} style={btn}>
          Open app
        </a>
        <a href="/download" style={btn}>
          Get notified
        </a>
      </div>
    </main>
  );
}

const btn: CSSProperties = {
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--ink2)",
  color: "var(--cream)",
  padding: "10px 16px",
  fontWeight: 700
};
