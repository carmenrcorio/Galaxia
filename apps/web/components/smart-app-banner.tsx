"use client";

import { useEffect, useMemo, useState } from "react";

function detectMobile(ua: string) {
  return /android|iphone|ipad|ipod/i.test(ua);
}

export function SmartAppBanner({ deepLink }: { deepLink: string }) {
  const [ua, setUa] = useState("");
  useEffect(() => {
    setUa(navigator.userAgent);
  }, []);

  const isMobile = useMemo(() => detectMobile(ua), [ua]);
  if (!isMobile) return null;

  const iosStore = process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ?? "#";
  const androidStore = process.env.NEXT_PUBLIC_ANDROID_PLAY_URL ?? "#";
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        background: "var(--ink2)",
        borderRadius: 14,
        padding: 14,
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center"
      }}
    >
      <span style={{ color: "var(--mist)" }}>Open this in Galaxia for the full app experience.</span>
      <a
        href={deepLink}
        style={{
          background: "var(--gold)",
          color: "var(--ink)",
          borderRadius: 999,
          padding: "8px 14px",
          fontWeight: 700
        }}
      >
        Open in Galaxia
      </a>
      <a href={isIOS ? iosStore : androidStore} style={{ color: "var(--gold-soft)" }}>
        {isIOS ? "App Store" : "Google Play"}
      </a>
    </div>
  );
}
