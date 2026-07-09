"use client";

import { buildVelaContext, detectCrisisLanguage } from "@galaxia/vela";
import { useEffect, useMemo, useRef, useState } from "react";
import { InitialAvatar } from "../../../components/initial-avatar";
import { publicEnv } from "../../../lib/env";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

type VelaMode = "ask" | "shared";
type Scope = "person" | "pair" | "group";

interface PersonLite { id: string; display_name: string; is_minor: boolean; }
interface GroupLite  { id: string; name: string; }
interface ChatLine   { role: "user" | "vela" | "system"; text: string; }

const SUGGESTED_PROMPTS = [
  "What do we need most from each other?",
  "Where do we naturally flow, and where do we catch?",
  "How does our generational difference show up?",
  "What's the pattern underneath our repeating conflicts?",
  "What does this person need to feel truly seen?"
];

function TypingDots() {
  return (
    <div className="bubble bubble-vela fade-in">
      <div className="bubble-sender">Vela</div>
      <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
    </div>
  );
}

export default function VelaPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<VelaMode>("ask");
  const [scope, setScope] = useState<Scope>("person");
  const [relationshipType, setRelationshipType] = useState("general");
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [groups, setGroups] = useState<GroupLite[]>([]);
  const [subjectPersonId, setSubjectPersonId] = useState<string | null>(null);
  const [pairPersonId, setPairPersonId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([
    { role: "system", text: "Private by default · no private notes in shared mode · consent required for shared threads" }
  ]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("You");
  const [initialThreadId, setInitialThreadId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedSubject = people.find((p) => p.id === subjectPersonId) ?? null;
  const selectedPair    = people.find((p) => p.id === pairPersonId)    ?? null;
  const minorInScope    = scope === "person" ? (selectedSubject?.is_minor ?? false)
                        : scope === "pair"   ? Boolean(selectedSubject?.is_minor || selectedPair?.is_minor)
                        : false;
  const sharedBlocked   = mode === "shared" && minorInScope;
  const functionUrl     = `${publicEnv.supabaseUrl}/functions/v1/vela-chat`;

  useEffect(() => {
    setInitialThreadId(new URLSearchParams(window.location.search).get("threadId"));
  }, []);

  useEffect(() => {
    const load = async () => {
      const [{ data: userData }, { data: sessionData }] = await Promise.all([
        supabase.auth.getUser(), supabase.auth.getSession()
      ]);
      const user = userData.user;
      const session = sessionData.session;
      if (!user || !session) return;
      setAccessToken(session.access_token);
      setUserName(user.email?.split("@")[0] ?? "You");

      const [{ data: peopleData }, { data: groupData }] = await Promise.all([
        supabase.from("people").select("id, display_name, is_minor").eq("owner_id", user.id).order("display_name"),
        supabase.from("groups").select("id, name").eq("owner_id", user.id).order("name")
      ]);
      const allPeople = (peopleData ?? []) as PersonLite[];
      setPeople(allPeople);
      setGroups((groupData ?? []) as GroupLite[]);
      if (!subjectPersonId && allPeople[0]) setSubjectPersonId(allPeople[0].id);
      if (!pairPersonId    && allPeople[1]) setPairPersonId(allPeople[1].id);
      if (!groupId && groupData?.[0]) setGroupId(groupData[0].id as string);

      if (initialThreadId) {
        setThreadId(initialThreadId);
        await loadThreadHistory(initialThreadId);
      }
    };
    void load();
  }, [supabase, initialThreadId]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  async function loadThreadHistory(tid: string) {
    const { data } = await supabase.from("messages").select("sender, body").eq("thread_id", tid).order("created_at").limit(80);
    if (!data) return;
    setLines([
      { role: "system", text: "Resumed thread — private by default" },
      ...(data).map((r) => ({ role: r.sender === "vela" ? ("vela" as const) : ("user" as const), text: r.body as string }))
    ]);
  }

  async function sendConsent() {
    if (!accessToken || !threadId) { setStatus("Start a thread first before confirming consent."); return; }
    const res = await fetch(functionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ action: "consent", mode, threadId })
    });
    setStatus(res.ok ? "Consent captured for this thread." : "Unable to save consent.");
  }

  async function sendMessage(text?: string) {
    const userText = (text ?? message).trim();
    if (sending || !accessToken || !userText) return;
    if (sharedBlocked) { setStatus("Shared mode is disabled when a minor is in scope."); return; }
    if (!subjectPersonId && scope !== "group") { setStatus("Choose a person to focus on."); return; }
    if (scope === "pair" && (!subjectPersonId || !pairPersonId || subjectPersonId === pairPersonId)) {
      setStatus("Choose two different people for pair mode.");
      return;
    }
    if (scope === "group" && !groupId) { setStatus("Choose a group."); return; }
    if (!publicEnv.supabaseUrl) { setStatus("Vela isn't configured yet — ask the admin to add the API key."); return; }

    if (detectCrisisLanguage(userText)) {
      setStatus("If you or someone you know is in immediate danger, please contact local emergency services or a crisis line now.");
    }

    setMessage("");
    setSending(true);
    setStatus(null);
    setLines((prev) => [...prev, { role: "user", text: userText }]);

    const context = buildVelaContext({
      mode,
      parenting: minorInScope,
      relationshipType,
      user: { name: userName },
      people: [
        ...(selectedSubject ? [{ name: selectedSubject.display_name, role: "subject", isMinor: Boolean(selectedSubject.is_minor), precision: "date" as const, sun: "Unknown", moon: null, rising: null, venus: "Unknown", mars: "Unknown", traits: "", generational: { uranus: "Unknown", neptune: "Unknown", pluto: "Unknown", cohortLabel: "" } }] : []),
        ...(selectedPair    ? [{ name: selectedPair.display_name,    role: "pair",    isMinor: Boolean(selectedPair.is_minor),    precision: "date" as const, sun: "Unknown", moon: null, rising: null, venus: "Unknown", mars: "Unknown", traits: "", generational: { uranus: "Unknown", neptune: "Unknown", pluto: "Unknown", cohortLabel: "" } }] : [])
      ],
      history: lines.filter((l) => l.role !== "system").map((l) => ({ role: l.role === "vela" ? "vela" as const : "user" as const, text: l.text })),
      userMessage: userText
    });

    try {
      const res = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          action: "chat",
          mode,
          threadId,
          relationshipType,
          subjectPersonId: scope !== "group" ? subjectPersonId : undefined,
          pairPersonIds:   scope === "pair"  && subjectPersonId && pairPersonId ? [subjectPersonId, pairPersonId] : undefined,
          groupId:         scope === "group" ? groupId : undefined,
          userMessage: userText,
          context
        })
      });

      const nextTid = res.headers.get("x-thread-id");
      if (nextTid) setThreadId(nextTid);

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        const msg = res.status === 503
          ? "Vela isn't available right now — the AI provider may not be configured. Try again shortly."
          : body.error ?? `Vela responded with an error (${res.status}).`;
        setLines((prev) => [...prev, { role: "vela", text: msg }]);
        setSending(false);
        return;
      }

      if (!res.body) {
        const text = await res.text();
        setLines((prev) => [...prev, { role: "vela", text: text || "Vela returned an empty response." }]);
        setSending(false);
        return;
      }

      // Stream into the last vela bubble
      setLines((prev) => [...prev, { role: "vela", text: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamed = "";
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (chunk.value) {
          streamed += decoder.decode(chunk.value, { stream: true });
          setLines((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "vela", text: streamed };
            return next;
          });
        }
      }
    } catch {
      setLines((prev) => [...prev, { role: "vela", text: "Network error — check your connection and try again." }]);
    } finally {
      setSending(false);
    }
  }

  const scopeSubject = selectedSubject ?? people[0] ?? null;

  return (
    <main className="app-content">
      <p className="eyebrow">Your guide</p>
      <h1 className="page-title">Vela</h1>
      <p className="muted">Warm astrologer + practical coach, grounded in your real chart data.</p>

      {/* ── Controls row ── */}
      <section className="glass-card">
        <div style={{ display: "grid", gap: 12 }}>
          {/* Mode */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>Mode</p>
            <div style={{ display: "flex", gap: 8 }}>
              {(["ask","shared"] as VelaMode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`pill-link${mode === m ? " pill-link--gold" : ""}`}
                  style={{ borderColor: mode === m ? "transparent" : "var(--line)" }}>
                  {m === "ask" ? "Private (ask)" : "Shared space"}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              {mode === "ask" ? "Only you see this conversation." : "Neutral for all participants — no private notes shared. Consent required."}
            </p>
          </div>

          {/* Scope */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>Focus</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["person","pair","group"] as Scope[]).map((s) => (
                <button key={s} onClick={() => setScope(s)} className={`pill-link${scope === s ? " pill-link--teal" : ""}`}
                  style={{ borderColor: scope === s ? "var(--teal)" : "var(--line)" }}>
                  {s}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {scope !== "group" ? (
                <select className="field" value={subjectPersonId ?? ""} onChange={(e) => setSubjectPersonId(e.target.value)}>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.display_name}{p.is_minor ? " (minor)" : ""}</option>)}
                </select>
              ) : null}
              {scope === "pair" ? (
                <select className="field" value={pairPersonId ?? ""} onChange={(e) => setPairPersonId(e.target.value)}>
                  {people.map((p) => <option key={`pair-${p.id}`} value={p.id}>{p.display_name}{p.is_minor ? " (minor)" : ""}</option>)}
                </select>
              ) : null}
              {scope === "group" ? (
                <select className="field" value={groupId ?? ""} onChange={(e) => setGroupId(e.target.value)}>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              ) : null}
              <input className="field" value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)}
                placeholder="Relationship type (partner, sibling, parent-child…)" />
            </div>
          </div>

          {sharedBlocked ? <p className="error" style={{ margin: 0, fontSize: 13 }}>Minor safety rule: shared mode is disabled when a minor is in scope.</p> : null}
        </div>
      </section>

      {/* Consent gate (shared mode) */}
      {mode === "shared" && !sharedBlocked ? (
        <section className="glass-card">
          <p className="eyebrow">Consent gate</p>
          <p className="muted" style={{ fontSize: 13 }}>Shared threads require consent from both participants before Vela responds in shared mode.</p>
          <button className="pill-link pill-link--teal" onClick={sendConsent} style={{ marginTop: 8 }}>Confirm my consent</button>
        </section>
      ) : null}

      {/* ── Chat ── */}
      <section className="glass-card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>
          {scopeSubject ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <InitialAvatar name={scopeSubject.display_name} size="sm" />
              Asking about {scopeSubject.display_name}
              {scope === "pair" && selectedPair ? ` & ${selectedPair.display_name}` : ""}
            </span>
          ) : "Conversation"}
        </p>

        {/* Messages */}
        <div ref={chatRef} className="chat-thread">
          {lines.map((line, idx) => (
            line.role === "system" ? (
              <div key={idx} className="bubble bubble-system">{line.text}</div>
            ) : line.role === "user" ? (
              <div key={idx} className="bubble bubble-user fade-in">
                <div className="bubble-sender">You</div>
                {line.text}
              </div>
            ) : (
              <div key={idx} className="bubble bubble-vela fade-in">
                <div className="bubble-sender">Vela</div>
                {line.text || (sending ? null : "…")}
              </div>
            )
          ))}
          {sending ? <TypingDots /> : null}
        </div>

        {/* Suggested prompts (shown when chat is empty-ish) */}
        {lines.filter((l) => l.role === "user").length === 0 ? (
          <div className="prompt-chips" style={{ marginTop: 8 }}>
            {SUGGESTED_PROMPTS.slice(0, 3).map((p) => (
              <button key={p} className="prompt-chip" onClick={() => sendMessage(p)}>{p}</button>
            ))}
          </div>
        ) : null}

        {/* Input */}
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <textarea
            ref={textareaRef}
            className="field"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
            placeholder="Ask Vela about this relationship dynamic…"
            rows={3}
            disabled={sending}
          />
          <button className="pill-link pill-link--gold" onClick={() => sendMessage()} disabled={sending || !message.trim()}>
            {sending ? "Vela is responding…" : "Send"}
          </button>
        </div>
        {status ? <p className={status.includes("danger") || status.includes("crisis") ? "error" : "muted"} style={{ fontSize: 13, marginTop: 6 }}>{status}</p> : null}
      </section>
    </main>
  );
}
