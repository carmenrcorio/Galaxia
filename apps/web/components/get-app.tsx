"use client";

import { useState } from "react";
import { publicEnv } from "../lib/env";
import { WaitlistForm } from "./waitlist-form";

interface GetAppProps {
  source: "download" | "account";
}

export function GetApp({ source }: GetAppProps) {
  const iosLink = publicEnv.iosAppStoreUrl || publicEnv.testflightUrl;
  const iosLabel = publicEnv.iosAppStoreUrl ? "Download on the App Store" : publicEnv.testflightUrl ? "Join the iOS beta" : "iOS coming soon";
  const androidLink = publicEnv.androidPlayUrl;
  const [showNotify, setShowNotify] = useState(false);

  const hasAnyLink = Boolean(iosLink || androidLink);

  return (
    <section className="glass-card" style={{ marginTop: 16 }}>
      <h2 style={{ marginTop: 0, fontFamily: "var(--font-fraunces)" }}>Get Galaxia on your phone</h2>
      <p className="muted">The full constellation experience lives in the mobile app: charts, Vela, and relationship guidance.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        {iosLink ? (
          <a href={iosLink} className="pill-link pill-link--gold">
            {iosLabel}
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
          <button className="pill-link pill-link--gold" onClick={() => setShowNotify((prev) => !prev)} type="button">
            Notify me at launch
          </button>
          {showNotify ? (
            <div style={{ marginTop: 12 }}>
              <WaitlistForm source={source === "download" ? "close" : "hero"} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
