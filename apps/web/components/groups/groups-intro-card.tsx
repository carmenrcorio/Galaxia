"use client";

/**
 * First-visit Groups intro: three short lines plus a Got it button.
 * Shown below the page hero and above the group selector. Persisted via
 * the client UI settings helper (same get/set shape as Settings prefs).
 */

import { useEffect, useState } from "react";
import { GROUPS_INTRO_GOT_IT, GROUPS_INTRO_LINES } from "../../lib/groups-copy";
import { readUiSetting, SETTING_GROUPS_INTRO_DISMISSED, writeUiSetting } from "../../lib/ui-settings";

export function GroupsIntroCard() {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    setVisible(readUiSetting(SETTING_GROUPS_INTRO_DISMISSED) !== "1");
  }, []);

  if (!visible) return null;

  function dismiss() {
    writeUiSetting(SETTING_GROUPS_INTRO_DISMISSED, "1");
    setVisible(false);
  }

  return (
    <section className="glass-card fade-in" aria-label="How to read this page">
      <p className="eyebrow" style={{ marginBottom: 10 }}>How to read a group</p>
      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        {GROUPS_INTRO_LINES.map((line) => (
          <p key={line} className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, margin: 0 }}>
            {line}
          </p>
        ))}
      </div>
      <button className="pill-link" type="button" onClick={dismiss}>
        {GROUPS_INTRO_GOT_IT}
      </button>
    </section>
  );
}
