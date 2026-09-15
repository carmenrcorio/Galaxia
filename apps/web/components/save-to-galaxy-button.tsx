"use client";

import { type BirthFormInput } from "@galaxia/astro";
import { ASK_BIRTH_DATA_TOGGLE, GALAXY_RELATION_PICKER_OPTIONS } from "@galaxia/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { persistPerson } from "../lib/persist-person";
import { personProfileHref, signupWithNextHref } from "../lib/nav-links";
import { buildWelcomePrefillPath } from "../lib/quick-chart";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { AskBirthData } from "./ask-birth-data";
import { CustomCheck } from "./custom-check";
import { Spinner } from "./spinner";

const RELATIONS = GALAXY_RELATION_PICKER_OPTIONS;

export const SAVE_TO_GALAXY_CHECKING = "Checking whether you are signed in.";

/** Logged-out primary CTA. Do not change: this is the top-of-funnel save. */
export function saveToGalaxyLoggedOutLabel(name?: string): string {
  return name ? `Save ${name} to your galaxy` : "Save to your galaxy";
}

export function addToConstellationLabel(name?: string): string {
  return name ? `Add ${name} to your constellation` : "Add this person to your constellation";
}

export const CONFIRM_ADD_TO_CONSTELLATION = "Add to constellation";

export function addedToConstellationLine(name: string): string {
  return `✦ ${name} is in your constellation.`;
}

export const VIEW_THEIR_PROFILE = "View their profile";

/**
 * The Quick Chart save CTA.
 *
 * Logged in: saves the person now (name/relation confirmed inline) through
 * persistPerson / createPerson. Stays on this screen so the ask can happen
 * without opening edit.
 *
 * Logged out: links to /signup?next=/welcome?prefill=...&name=... — the birth
 * data (and, only for this one-time redirect, the typed name) travels through
 * signup and lands pre-filled in the /welcome "Add person" form. Nothing is
 * written to the database until the user reviews and saves it there.
 */
export function SaveToGalaxyButton({
  birthInput,
  defaultName,
  navigateToProfileOnSave = false,
  ctaLabel,
  loggedOutHref,
}: {
  birthInput: BirthFormInput;
  defaultName?: string;
  /** When true, still open the profile after save. Default false so the ask is reachable. */
  navigateToProfileOnSave?: boolean;
  /** Override the signed-in / logged-out primary label. */
  ctaLabel?: string;
  /**
   * Logged-out destination. Gift shares pass /signup?next=/s/<token> so birth
   * data stays on the token page instead of traveling through a prefill URL.
   */
  loggedOutHref?: string;
}) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]["value"]>("friend");
  const [askThem, setAskThem] = useState(birthInput.precision === "none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ personId: string; isMinor: boolean; askForBirthData: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    // Gift shares are public. If auth lookup fails or hangs, show the
    // logged-out CTA rather than leaving "Checking whether you are signed in."
    const timeout = new Promise<{ data: { user: { id: string } | null } }>((resolve) => {
      setTimeout(() => resolve({ data: { user: null } }), 4000);
    });
    void Promise.race([supabase.auth.getUser(), timeout])
      .then((result) => {
        if (!cancelled) setUserId(result.data.user?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserId(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingAuth(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => { if (defaultName) setName(defaultName); }, [defaultName]);

  async function save() {
    if (!userId || !name.trim()) return;
    setSaving(true); setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const created = await persistPerson(supabase, {
        userId,
        displayName: name,
        relation,
        isSelf: false,
        isMinor: false,
        input: birthInput
      });
      setSaved({
        personId: created.personId,
        isMinor: created.isMinor,
        askForBirthData: askThem && !created.isMinor
      });
      if (navigateToProfileOnSave) {
        router.push(personProfileHref(created.personId) as never);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "This person could not be saved to your constellation. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingAuth) {
    return (
      <p className="muted" style={{ fontSize: ".88rem", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", margin: 0 }} aria-live="polite">
        {SAVE_TO_GALAXY_CHECKING}
      </p>
    );
  }

  if (saved) {
    return (
      <div style={{ textAlign: "center", display: "grid", gap: 10 }}>
        <p style={{ color: "var(--teal)", fontSize: ".88rem", marginBottom: 0 }}>{addedToConstellationLine(name)}</p>
        {userId && !saved.isMinor ? (
          <AskBirthData
            personId={saved.personId}
            personName={name.trim()}
            userId={userId}
            autoCreate={saved.askForBirthData}
            isMinor={saved.isMinor}
          />
        ) : null}
        <Link href={personProfileHref(saved.personId) as never} className="pill-link">{VIEW_THEIR_PROFILE}</Link>
      </div>
    );
  }

  if (!userId) {
    const label = ctaLabel ?? saveToGalaxyLoggedOutLabel(defaultName);
    const href = loggedOutHref ?? signupWithNextHref(buildWelcomePrefillPath(birthInput, defaultName));
    return (
      <Link href={href as never} className="btn-primary">
        {label}
      </Link>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        {ctaLabel ?? addToConstellationLabel(defaultName)}
      </button>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: 380, margin: "0 auto", display: "grid", gap: 10 }}>
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {RELATIONS.map(({ value, label }) => (
          <button key={value} type="button" className="pill-link" onClick={() => setRelation(value)}
            style={{ fontSize: ".78rem", padding: "5px 11px", borderColor: relation === value ? "rgba(230,174,108,.5)" : undefined, color: relation === value ? "var(--gold)" : undefined }}>
                        {label}
          </button>
        ))}
      </div>
      <CustomCheck checked={askThem} onChange={setAskThem} label={ASK_BIRTH_DATA_TOGGLE} id="save-to-galaxy-ask-them" />
      <button className="btn-primary" onClick={() => void save()} disabled={saving || !name.trim()} style={{ gap: 8 }}>
        {saving && <Spinner size={13} color="#1a1206" />}
        {saving ? "Saving…" : CONFIRM_ADD_TO_CONSTELLATION}
      </button>
      {error ? <p className="error" style={{ fontSize: ".8rem" }}>{error}</p> : null}
    </div>
  );
}
