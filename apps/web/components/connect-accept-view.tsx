"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CONNECT_ALREADY_ACTIVE,
  CONNECT_CONNECTED_BODY,
  CONNECT_CTA_SIGNUP,
  CONNECT_EXPIRED_BODY,
  CONNECT_EXPIRED_TITLE,
  CONNECT_GENERIC_ERROR,
  CONNECT_GO_CONSTELLATION,
  CONNECT_NEEDS_SELF_BODY,
  CONNECT_NEEDS_SELF_TITLE,
  CONNECT_OPEN_FAILED,
  CONNECT_RESUME_KEY,
  CONNECT_SEE_COMPARISON,
  CONNECT_SELF_INVITE_BODY,
  CONNECT_SELF_INVITE_TITLE,
  CONNECT_SHARING,
  CONNECT_UNKNOWN_SENDER,
  CONNECT_WHAT_GALAXIA_IS,
  connectAcceptLabel,
  connectCompareHref,
  connectConnectedHeading,
  connectLandingHeadline,
  connectPath,
  loginForConnectHref,
  reverseConnectRelation,
  signupForConnectHref,
  type ConnectLanding,
} from "../lib/connect-invite";
import { FIRST_RUN_RESTART_HREF } from "../lib/nav-links";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { Spinner } from "./spinner";

type PreviewState =
  | "ok"
  | "not_found"
  | "expired"
  | "already_accepted"
  | "revoked"
  | "self_invite"
  | "already_connected";

type Phase =
  | "loading"
  | "logged_out"
  | "preview"
  | "needs_self"
  | "accepting"
  | "connected"
  | "already_active"
  | "expired"
  | "self_invite"
  | "error";

type AcceptResult = {
  senderName: string;
  senderUser: string;
};

export function ConnectAcceptView({
  token,
  landing,
}: {
  token: string;
  landing: ConnectLanding | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [phase, setPhase] = useState<Phase>("loading");
  const [inviterName, setInviterName] = useState(landing?.inviterName ?? CONNECT_UNKNOWN_SENDER);
  const [relation, setRelation] = useState(landing?.relation ?? "");
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<AcceptResult | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (landing?.status === "accepted") {
        setPhase("already_active");
        return;
      }
      if (landing?.status === "expired" || landing?.status === "revoked") {
        setPhase("expired");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setPhase("logged_out");
        return;
      }

      const { data, error: previewError } = await supabase.rpc("connect_invite_preview", {
        p_token: token,
      });
      if (cancelled) return;
      if (previewError) {
        console.error(previewError.message);
        setError(CONNECT_GENERIC_ERROR);
        setPhase("error");
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setPhase("expired");
        return;
      }

      const state = row.state as PreviewState;
      if (row.inviter_name) setInviterName(row.inviter_name as string);
      if (row.relation) setRelation(row.relation as string);

      if (state === "self_invite") {
        setPhase("self_invite");
        return;
      }
      if (state === "already_accepted" || state === "already_connected") {
        setPhase("already_active");
        return;
      }
      if (state === "expired" || state === "revoked" || state === "not_found") {
        setPhase("expired");
        return;
      }
      if (row.recipient_has_self_chart !== true) {
        try {
          sessionStorage.setItem(CONNECT_RESUME_KEY, connectPath(token));
        } catch {
          /* private mode */
        }
        setPhase("needs_self");
        return;
      }
      setPhase("preview");
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [landing, supabase, token]);

  const accept = async () => {
    setPhase("accepting");
    setError(null);
    const { data, error: acceptError } = await supabase.rpc("accept_connect_invite", {
      p_token: token,
      p_share_level: "chart",
    });
    if (acceptError) {
      console.error(acceptError.message);
      setError(CONNECT_GENERIC_ERROR);
      setPhase("error");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const senderName = (row?.sender_name as string | null)?.trim() || inviterName;
    setAccepted({
      senderName,
      senderUser: (row?.sender_user as string) ?? "",
    });
    const { data: selfRow } = await supabase
      .from("people")
      .select("id")
      .eq("is_self", true)
      .maybeSingle();
    setSelfId((selfRow?.id as string | null) ?? null);
    try {
      sessionStorage.removeItem(CONNECT_RESUME_KEY);
    } catch {
      /* private mode */
    }
    setPhase("connected");
  };

  const seeComparison = async () => {
    if (!accepted) return;
    setComparing(true);
    setError(null);
    const { data, error: addError } = await supabase.rpc("add_sender_to_constellation", {
      p_token: token,
      p_relation: reverseConnectRelation(relation),
    });
    if (addError && !/already added/i.test(addError.message)) {
      console.error(addError.message);
      setError(CONNECT_GENERIC_ERROR);
      setComparing(false);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    let otherId = (row?.person_id as string | null) ?? null;
    if (!otherId && accepted.senderUser) {
      const { data: existing } = await supabase
        .from("people")
        .select("id")
        .eq("linked_user_id", accepted.senderUser)
        .maybeSingle();
      otherId = (existing?.id as string | null) ?? null;
    }
    if (selfId && otherId) {
      router.push(connectCompareHref(selfId, otherId) as never);
      return;
    }
    router.push("/app/compare" as never);
  };

  const headline = connectLandingHeadline(inviterName, relation);

  return (
    <main className="container" style={{ paddingTop: 56, paddingBottom: 56, maxWidth: 640 }}>
      <p className="eyebrow">Connect</p>
      {phase === "loading" ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
          <Spinner size={16} />
          <p className="muted" style={{ margin: 0 }}>
            Opening this invite…
          </p>
        </div>
      ) : null}

      {phase === "logged_out" || phase === "preview" || phase === "accepting" ? (
        <>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 38, marginTop: 4 }}>
            {headline}
          </h1>
                    <p style={{ color: "var(--mist)", lineHeight: 1.7 }}>{CONNECT_WHAT_GALAXIA_IS}</p>
          <div className="glass-card" style={{ marginTop: 20 }}>
            <p style={{ color: "var(--cream)", lineHeight: 1.7, margin: 0 }}>{CONNECT_SHARING}</p>
          </div>
        </>
      ) : null}

      {phase === "logged_out" ? (
        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          <Link href={signupForConnectHref(token) as never} className="pill-link pill-link--gold">
            {CONNECT_CTA_SIGNUP}
          </Link>
          <p className="muted" style={{ fontSize: ".84rem" }}>
            Already have an account?{" "}
            <Link href={loginForConnectHref(token) as never} style={{ color: "var(--gold)" }}>
              Sign in
            </Link>
          </p>
        </div>
      ) : null}

      {phase === "preview" || phase === "accepting" ? (
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            className="pill-link pill-link--gold"
            onClick={() => void accept()}
            disabled={phase === "accepting"}
            style={{ gap: 8 }}
          >
            {phase === "accepting" ? <Spinner size={13} /> : null}
                        {phase === "accepting" ? "Connecting…" : connectAcceptLabel(inviterName)}
          </button>
        </div>
      ) : null}

      {phase === "needs_self" ? (
        <>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 38, marginTop: 4 }}>
            {CONNECT_NEEDS_SELF_TITLE}
          </h1>
          <p style={{ color: "var(--mist)", lineHeight: 1.7 }}>{CONNECT_NEEDS_SELF_BODY}</p>
          <Link href={FIRST_RUN_RESTART_HREF as never} className="pill-link pill-link--gold" style={{ marginTop: 16 }}>
            Add your birth details
          </Link>
        </>
      ) : null}

      {phase === "connected" && accepted ? (
        <>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 38, marginTop: 4 }}>
            {connectConnectedHeading(accepted.senderName)}
          </h1>
          <p className="muted" style={{ lineHeight: 1.7 }}>{CONNECT_CONNECTED_BODY}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            <button
              type="button"
              className="pill-link pill-link--gold"
              onClick={() => void seeComparison()}
              disabled={comparing}
              style={{ gap: 8 }}
            >
              {comparing ? <Spinner size={13} /> : null}
              {CONNECT_SEE_COMPARISON}
            </button>
            <Link href="/app" className="pill-link">
              {CONNECT_GO_CONSTELLATION}
            </Link>
          </div>
        </>
      ) : null}

      {phase === "already_active" ? (
        <>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 38, marginTop: 4 }}>
            {CONNECT_ALREADY_ACTIVE}
          </h1>
          <Link href="/app" className="pill-link" style={{ marginTop: 16 }}>
            {CONNECT_GO_CONSTELLATION}
          </Link>
        </>
      ) : null}

      {phase === "expired" ? (
        <>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 38, marginTop: 4 }}>
            {CONNECT_EXPIRED_TITLE}
          </h1>
          <p className="muted">{CONNECT_EXPIRED_BODY}</p>
        </>
      ) : null}

      {phase === "self_invite" ? (
        <>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 38, marginTop: 4 }}>
            {CONNECT_SELF_INVITE_TITLE}
          </h1>
          <p className="muted">{CONNECT_SELF_INVITE_BODY}</p>
          <Link href="/app" className="pill-link" style={{ marginTop: 16 }}>
            {CONNECT_GO_CONSTELLATION}
          </Link>
        </>
      ) : null}

      {phase === "error" ? (
        <>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 38, marginTop: 4 }}>
            {CONNECT_OPEN_FAILED}
          </h1>
          {error ? <p className="error">{error}</p> : null}
        </>
      ) : null}

      {error && phase !== "error" ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}

      <p className="muted" style={{ marginTop: 28, fontSize: ".8rem" }}>
        <a href={`galaxia://connect/${token}`} style={{ color: "var(--gold)" }}>
          Open in Galaxia
        </a>
      </p>
    </main>
  );
}
