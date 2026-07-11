import type { CSSProperties } from "react";

export default async function DeepLinkBridge({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deepLink = `galaxia://${slug}`;
  const ios = process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ?? "#";
  const android = process.env.NEXT_PUBLIC_ANDROID_PLAY_URL ?? "#";

  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 56, maxWidth: 760 }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 40 }}>Open in Galaxia</h1>
      <p style={{ color: "var(--mist)" }}>If the app is installed, use the deep link below. Otherwise install from your store.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href={deepLink} style={btn}>
          Open app
        </a>
        <a href={ios} style={btn}>
          App Store
        </a>
        <a href={android} style={btn}>
          Google Play
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
