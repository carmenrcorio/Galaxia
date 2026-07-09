"use client";

import { buildVelaContext, detectCrisisLanguage } from "@galaxia/vela";
import { useEffect, useMemo, useRef, useState } from "react";
import { InitialAvatar } from "../../../components/initial-avatar";
import { publicEnv } from "../../../lib/env";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

type VelaMode = "ask"|"shared";
type Scope     = "person"|"pair"|"group";
interface PersonLite { id: string; display_name: string; is_minor: boolean; }
interface GroupLite  { id: string; name: string; }
interface ChatLine   { role: "user"|"vela"|"system"; text: string; }

const SUGGESTED_PROMPTS = [
  "What do we need most from each other?",
  "Where do we naturally flow, and where do we catch?",
  "What's the pattern under our repeating conflict?",
  "How does our generational difference show up?",
  "What does this person need to feel truly seen?"
];

function TypingIndicator() {
  return (
    <div className="bubble bubble-vela fade-in">
      <div className="bubble-sender">Vela</div>
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

export default function VelaPage() {
  const supabase    = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode]           = useState<VelaMode>("ask");
  const [scope, setScope]         = useState<Scope>("person");
  const [relType, setRelType]     = useState("general");
  const [people, setPeople]       = useState<PersonLite[]>([]);
  const [groups, setGroups]       = useState<GroupLite[]>([]);
  const [subjectId, setSubjectId] = useState<string|null>(null);
  const [pairId, setPairId]       = useState<string|null>(null);
  const [groupId, setGroupId]     = useState<string|null>(null);
  const [threadId, setThreadId]   = useState<string|null>(null);
  const [message, setMessage]     = useState("");
  const [lines, setLines]         = useState<ChatLine[]>([
    { role: "system", text: "Private by default · no private notes in shared mode · consent required for shared threads" }
  ]);
  const [sending, setSending]     = useState(false);
  const [status, setStatus]       = useState<string|null>(null);
  const [accessToken, setAccessToken] = useState<string|null>(null);
  const [userName, setUserName]   = useState("You");
  const [initialThreadId, setInitialThreadId] = useState<string|null>(null);
  const chatRef   = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const selectedSubject = people.find(p => p.id === subjectId) ?? null;
  const selectedPair    = people.find(p => p.id === pairId)    ?? null;
  const minorInScope    = scope === "person" ? (selectedSubject?.is_minor ?? false)
                        : scope === "pair"   ? Boolean(selectedSubject?.is_minor || selectedPair?.is_minor) : false;
  const sharedBlocked   = mode === "shared" && minorInScope;
  const functionUrl     = `${publicEnv.supabaseUrl}/functions/v1/vela-chat`;

  useEffect(() => { setInitialThreadId(new URLSearchParams(window.location.search).get("threadId")); }, []);

  useEffect(() => {
    const load = async () => {
      const [{ data: ud }, { data: sd }] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
      const user = ud.user; const session = sd.session;
      if (!user || !session) return;
      setAccessToken(session.access_token);
      setUserName(user.email?.split("@")[0] ?? "You");
      const [{ data: pd }, { data: gd }] = await Promise.all([
        supabase.from("people").select("id, display_name, is_minor").eq("owner_id", user.id).order("display_name"),
        supabase.from("groups").select("id, name").eq("owner_id", user.id).order("name")
      ]);
      const allPeople = (pd ?? []) as PersonLite[];
      setPeople(allPeople); setGroups((gd ?? []) as GroupLite[]);
      if (!subjectId && allPeople[0]) setSubjectId(allPeople[0].id);
      if (!pairId    && allPeople[1]) setPairId(allPeople[1].id);
      if (!groupId   && gd?.[0]) setGroupId(gd[0].id as string);
      if (initialThreadId) { setThreadId(initialThreadId); await loadHistory(initialThreadId); }
    };
    void load();
  }, [supabase, initialThreadId]);

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [lines]);

  async function loadHistory(tid: string) {
    const { data } = await supabase.from("messages").select("sender, body").eq("thread_id", tid).order("created_at").limit(80);
    if (!data) return;
    setLines([
      { role: "system", text: "Resumed thread — private by default" },
      ...(data).map(r => ({ role: r.sender === "vela" ? "vela" as const : "user" as const, text: r.body as string }))
    ]);
  }

  async function sendConsent() {
    if (!accessToken || !threadId) { setStatus("Start a thread first."); return; }
    const res = await fetch(functionUrl, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ action: "consent", mode, threadId }) });
    setStatus(res.ok ? "Consent captured for this thread." : "Unable to save consent.");
  }

  async function sendMessage(prefill?: string) {
    const userText = (prefill ?? message).trim();
    if (sending || !accessToken || !userText) return;
    if (sharedBlocked) { setStatus("Shared mode is disabled when a minor is in scope."); return; }
    if (!subjectId && scope !== "group") { setStatus("Choose a person."); return; }
    if (scope === "pair" && (!subjectId || !pairId || subjectId === pairId)) { setStatus("Pick two different people for pair mode."); return; }
    if (scope === "group" && !groupId) { setStatus("Choose a group."); return; }
    if (!publicEnv.supabaseUrl) { setStatus("Vela isn't configured yet."); return; }
    if (detectCrisisLanguage(userText)) setStatus("If anyone is in immediate danger, contact local emergency services now.");

    const ctx = buildVelaContext({
      mode, parenting: minorInScope, relationshipType: relType,
      user: { name: userName },
      people: [
        ...(selectedSubject ? [{ name: selectedSubject.display_name, role: "subject", isMinor: Boolean(selectedSubject.is_minor), precision: "date" as const, sun: "Unknown", moon: null, rising: null, venus: "Unknown", mars: "Unknown", traits: "", generational: { uranus: "Unknown", neptune: "Unknown", pluto: "Unknown", cohortLabel: "" } }] : []),
        ...(selectedPair    ? [{ name: selectedPair.display_name,    role: "pair",    isMinor: Boolean(selectedPair.is_minor),    precision: "date" as const, sun: "Unknown", moon: null, rising: null, venus: "Unknown", mars: "Unknown", traits: "", generational: { uranus: "Unknown", neptune: "Unknown", pluto: "Unknown", cohortLabel: "" } }] : [])
      ],
      history: lines.filter(l => l.role !== "system").map(l => ({ role: l.role === "vela" ? "vela" as const : "user" as const, text: l.text })),
      userMessage: userText
    });

    setMessage(""); setSending(true); setStatus(null);
    setLines(prev => [...prev, { role: "user", text: userText }]);

    try {
      const res = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action: "chat", mode, threadId, relationshipType: relType, subjectPersonId: scope !== "group" ? subjectId : undefined, pairPersonIds: scope === "pair" && subjectId && pairId ? [subjectId, pairId] : undefined, groupId: scope === "group" ? groupId : undefined, userMessage: userText, context: ctx })
      });
      const nextTid = res.headers.get("x-thread-id");
      if (nextTid) setThreadId(nextTid);

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        const msg = res.status === 503 ? "Vela isn't available right now — the AI provider may not be configured."
          : body.error ?? `Vela responded with an error (${res.status}).`;
        setLines(prev => [...prev, { role: "vela", text: msg }]);
        setSending(false); return;
      }

      if (!res.body) {
        const text = await res.text();
        setLines(prev => [...prev, { role: "vela", text: text || "Vela returned an empty response." }]);
        setSending(false); return;
      }

      setLines(prev => [...prev, { role: "vela", text: "" }]);
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false; let streamed = "";
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (chunk.value) {
          streamed += decoder.decode(chunk.value, { stream: true });
          setLines(prev => { const next = [...prev]; next[next.length - 1] = { role: "vela", text: streamed }; return next; });
        }
      }
    } catch {
      setLines(prev => [...prev, { role: "vela", text: "Network error — check your connection and try again." }]);
    } finally { setSending(false); }
  }

  const scopeSubject = selectedSubject ?? people[0] ?? null;
  const hasMessages  = lines.some(l => l.role === "user");

  return (
    <main className="app-content">
      <p className="eyebrow">Your guide</p>
      <h1 className="page-title">Vela</h1>
      <p className="muted">Warm astrologer + practical coach, grounded in your real chart data.</p>

      {/* Controls */}
      <section className="glass-card fade-in">
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Mode</p>
            <div style={{ display: "flex", gap: 8 }}>
              {(["ask","shared"] as VelaMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)} className="pill-link"
                  style={{ borderColor: mode === m ? "rgba(230,174,108,.5)" : undefined, color: mode === m ? "var(--gold)" : undefined }}>
                  {m === "ask" ? "Private (ask)" : "Shared space"}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {mode === "ask" ? "Only you see this conversation." : "Neutral for all — no private notes. Consent required."}
            </p>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Focus</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {(["person","pair","group"] as Scope[]).map(s => (
                <button key={s} onClick={() => setScope(s)} className="pill-link"
                  style={{ borderColor: scope === s ? "rgba(111,177,184,.5)" : undefined, color: scope === s ? "var(--teal)" : undefined }}>
                  {s}
                </button>
              ))}
            </div>
            {scope !== "group" ? <select className="field" value={subjectId ?? ""} onChange={e => setSubjectId(e.target.value)} style={{ marginBottom: 8 }}>{people.map(p => <option key={p.id} value={p.id}>{p.display_name}{p.is_minor ? " (minor)" : ""}</option>)}</select> : null}
            {scope === "pair"  ? <select className="field" value={pairId ?? ""}    onChange={e => setPairId(e.target.value)}    style={{ marginBottom: 8 }}>{people.map(p => <option key={`pair-${p.id}`} value={p.id}>{p.display_name}{p.is_minor ? " (minor)" : ""}</option>)}</select> : null}
            {scope === "group" ? <select className="field" value={groupId ?? ""}   onChange={e => setGroupId(e.target.value)}   style={{ marginBottom: 8 }}>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select> : null}
            <input className="field" value={relType} onChange={e => setRelType(e.target.value)} placeholder="Relationship type (partner, sibling, general…)" />
          </div>
          {sharedBlocked ? <p className="error" style={{ margin: 0, fontSize: 13 }}>Minor safety rule: shared mode disabled for this scope.</p> : null}
        </div>
      </section>

      {mode === "shared" && !sharedBlocked ? (
        <section className="glass-card fade-in">
          <p className="eyebrow" style={{ marginBottom: 8 }}>Consent gate</p>
          <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Shared threads need consent from both participants before Vela responds.</p>
          <button className="pill-link pill-link--teal" onClick={sendConsent}>Confirm my consent</button>
        </section>
      ) : null}

      {/* Chat */}
      <section className="glass-card fade-in" style={{ display: "flex", flexDirection: "column" }}>
        {scopeSubject ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid rgba(183,154,216,.1)" }}>
            <InitialAvatar name={scopeSubject.display_name} size="sm" />
            <p className="eyebrow" style={{ margin: 0 }}>
              Asking about {scopeSubject.display_name}
              {scope === "pair" && selectedPair ? ` & ${selectedPair.display_name}` : ""}
            </p>
          </div>
        ) : null}

        <div ref={chatRef} className="chat-thread">
          {lines.map((line, idx) =>
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
          )}
          {sending ? <TypingIndicator /> : null}
        </div>

        {!hasMessages ? (
          <div className="prompt-chips">
            {SUGGESTED_PROMPTS.slice(0, 3).map(p => (
              <button key={p} className="prompt-chip" onClick={() => sendMessage(p)}>{p}</button>
            ))}
          </div>
        ) : null}

        <div className="vela-input-wrap" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              className="field"
              style={{ borderRadius: 16, resize: "none", flex: 1 }}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
              placeholder="Ask Vela about this relationship dynamic…"
              rows={2}
              disabled={sending}
            />
            <button className="btn-primary" onClick={() => sendMessage()} disabled={sending || !message.trim()} style={{ flexShrink: 0, alignSelf: "flex-end", padding: "11px 20px" }}>
              {sending ? "…" : "Send"}
            </button>
          </div>
          {status ? <p className={status.includes("danger") || status.includes("crisis") || status.includes("immediate") ? "error" : "muted"} style={{ fontSize: 12, marginTop: 6 }}>{status}</p> : null}
        </div>
      </section>
    </main>
  );
}
