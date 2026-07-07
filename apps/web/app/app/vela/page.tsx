"use client";

import { buildVelaContext, detectCrisisLanguage } from "@galaxia/vela";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { publicEnv } from "../../../lib/env";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

type VelaMode = "ask" | "shared";
type Scope = "person" | "pair" | "group";

interface PersonLite {
  id: string;
  display_name: string;
  is_minor: boolean;
}

interface GroupLite {
  id: string;
  name: string;
}

interface ChatLine {
  role: "user" | "vela" | "system";
  text: string;
}

export default function VelaPage() {
  const searchParams = useSearchParams();
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
  const [lines, setLines] = useState<ChatLine[]>([{ role: "system", text: "Private by default. In shared mode, no private notes are passed and consent is required." }]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("You");

  const initialThreadId = searchParams.get("threadId");
  const selectedSubject = people.find((person) => person.id === subjectPersonId) ?? null;
  const selectedPair = people.find((person) => person.id === pairPersonId) ?? null;
  const minorInScope = scope === "person" ? selectedSubject?.is_minor ?? false : scope === "pair" ? Boolean(selectedSubject?.is_minor || selectedPair?.is_minor) : false;
  const sharedBlocked = mode === "shared" && minorInScope;

  useEffect(() => {
    const load = async () => {
      const [{ data: userData }, { data: sessionData }] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
      const user = userData.user;
      const session = sessionData.session;
      if (!user || !session) return;
      setAccessToken(session.access_token);
      setUserName(user.email?.split("@")[0] ?? "You");
      const [{ data: peopleData }, { data: groupData }] = await Promise.all([
        supabase.from("people").select("id, display_name, is_minor").eq("owner_id", user.id).order("display_name", { ascending: true }),
        supabase.from("groups").select("id, name").eq("owner_id", user.id).order("name", { ascending: true })
      ]);
      const peopleRows = (peopleData ?? []) as PersonLite[];
      setPeople(peopleRows);
      setGroups((groupData ?? []) as GroupLite[]);
      if (!subjectPersonId && peopleRows[0]) setSubjectPersonId(peopleRows[0].id);
      if (!pairPersonId && peopleRows[1]) setPairPersonId(peopleRows[1].id);
      if (!groupId && groupData?.[0]) setGroupId(groupData[0].id as string);
      if (initialThreadId) {
        setThreadId(initialThreadId);
        await loadThreadHistory(initialThreadId);
      }
    };
    void load();
  }, [supabase, initialThreadId, subjectPersonId, pairPersonId, groupId]);

  const functionUrl = `${publicEnv.supabaseUrl}/functions/v1/vela-chat`;

  async function loadThreadHistory(targetThreadId: string) {
    const { data, error } = await supabase.from("messages").select("sender, body").eq("thread_id", targetThreadId).order("created_at", { ascending: true }).limit(80);
    if (error) {
      setStatus(error.message);
      return;
    }
    setLines([
      { role: "system", text: "Resumed thread. Private by default; shared mode excludes private notes." },
      ...(data ?? []).map((row) => ({ role: row.sender === "vela" ? ("vela" as const) : ("user" as const), text: row.body as string }))
    ]);
  }

  async function sendConsent() {
    if (!accessToken || !threadId) {
      setStatus("Start a shared chat first to create a thread.");
      return;
    }
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ action: "consent", mode, threadId })
    });
    if (!response.ok) {
      setStatus("Unable to save consent.");
      return;
    }
    setStatus("Consent captured for this thread.");
  }

  async function sendMessage() {
    if (sending || !accessToken || !message.trim()) return;
    if (sharedBlocked) {
      setStatus("Shared mode is disabled when a minor is in scope. Switch to ask mode for parenting guidance.");
      return;
    }
    if (!subjectPersonId && scope !== "group") {
      setStatus("Choose a person.");
      return;
    }
    if (scope === "pair" && (!subjectPersonId || !pairPersonId || subjectPersonId === pairPersonId)) {
      setStatus("Pick two different people for pair mode.");
      return;
    }
    if (scope === "group" && !groupId) {
      setStatus("Choose a group.");
      return;
    }
    if (detectCrisisLanguage(message)) {
      setStatus("Crisis language detected. If anyone is in immediate danger, contact local emergency services now.");
    }

    const context = buildVelaContext({
      mode,
      parenting: minorInScope,
      relationshipType,
      user: { name: userName },
      people: [
        {
          name: selectedSubject?.display_name ?? "Unknown",
          role: "subject",
          isMinor: Boolean(selectedSubject?.is_minor),
          precision: "date",
          sun: "Unknown",
          moon: null,
          rising: null,
          venus: "Unknown",
          mars: "Unknown",
          traits: "Derived from chart data in edge function",
          generational: { uranus: "Unknown", neptune: "Unknown", pluto: "Unknown", cohortLabel: "Unknown" }
        }
      ],
      history: lines.filter((line) => line.role !== "system").map((line) => ({ role: line.role === "vela" ? "vela" : "user", text: line.text })),
      userMessage: message
    });

    const userText = message.trim();
    setMessage("");
    setSending(true);
    setStatus(null);
    setLines((current) => [...current, { role: "user", text: userText }, { role: "vela", text: "" }]);

    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          action: "chat",
          mode,
          threadId,
          relationshipType,
          subjectPersonId: scope === "group" ? undefined : subjectPersonId,
          pairPersonIds: scope === "pair" && subjectPersonId && pairPersonId ? [subjectPersonId, pairPersonId] : undefined,
          groupId: scope === "group" ? groupId : undefined,
          userMessage: userText,
          context
        })
      });
      const nextThreadId = response.headers.get("x-thread-id");
      if (nextThreadId) setThreadId(nextThreadId);
      if (!response.ok) {
        setLines((current) => {
          const next = [...current];
          next[next.length - 1] = { role: "vela", text: `Vela request failed (${response.status})` };
          return next;
        });
        return;
      }
      if (!response.body) {
        const text = await response.text();
        setLines((current) => {
          const next = [...current];
          next[next.length - 1] = { role: "vela", text: text || "Vela response unavailable." };
          return next;
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamed = "";
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (chunk.value) {
          streamed += decoder.decode(chunk.value, { stream: true });
          setLines((current) => {
            const next = [...current];
            next[next.length - 1] = { role: "vela", text: streamed };
            return next;
          });
        }
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Network error talking to Vela.";
      setStatus(messageText);
      setLines((current) => {
        const next = [...current];
        next[next.length - 1] = { role: "vela", text: messageText };
        return next;
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="container" style={{ padding: "30px 0 80px", display: "grid", gap: 12 }}>
      <h1 className="auth-title">Vela</h1>
      <p className="muted">Warm astrologer + practical coach, grounded in computed facts only.</p>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Mode</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {(["ask", "shared"] as VelaMode[]).map((value) => (
            <button key={value} onClick={() => setMode(value)} className="pill-link" style={{ borderColor: mode === value ? "var(--gold)" : "var(--line)" }}>
              {value}
            </button>
          ))}
        </div>
        {sharedBlocked ? <p className="error">Minor safety rule: shared mode disabled for this scope.</p> : null}
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Scope</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {(["person", "pair", "group"] as Scope[]).map((value) => (
            <button key={value} onClick={() => setScope(value)} className="pill-link" style={{ borderColor: scope === value ? "var(--gold)" : "var(--line)" }}>
              {value}
            </button>
          ))}
        </div>
        {scope !== "group" ? (
          <select className="field" value={subjectPersonId ?? ""} onChange={(event) => setSubjectPersonId(event.target.value)}>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.display_name}
                {person.is_minor ? " (minor)" : ""}
              </option>
            ))}
          </select>
        ) : null}
        {scope === "pair" ? (
          <select className="field" value={pairPersonId ?? ""} onChange={(event) => setPairPersonId(event.target.value)}>
            {people.map((person) => (
              <option key={`pair-${person.id}`} value={person.id}>
                {person.display_name}
                {person.is_minor ? " (minor)" : ""}
              </option>
            ))}
          </select>
        ) : null}
        {scope === "group" ? (
          <select className="field" value={groupId ?? ""} onChange={(event) => setGroupId(event.target.value)}>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        ) : null}
        <input className="field" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)} placeholder="relationship type (partner, sibling, general)" />
      </section>

      {mode === "shared" ? (
        <section className="glass-card">
          <h2 style={{ marginTop: 0 }}>Consent gate</h2>
          <p className="muted">Shared threads need consented participants before Vela can respond in shared mode.</p>
          <button className="pill-link" onClick={sendConsent}>
            Confirm my consent for this thread
          </button>
        </section>
      ) : null}

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Chat</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {lines.map((line, index) => (
            <div key={`${line.role}-${index}`} className="glass-card" style={{ background: line.role === "user" ? "var(--gold-soft)" : "var(--ink2)", color: line.role === "user" ? "var(--ink)" : "var(--cream)" }}>
              {line.text}
            </div>
          ))}
        </div>
        <textarea className="field" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask Vela about this relationship dynamic..." rows={4} />
        <button className="pill-link pill-link--gold" onClick={sendMessage} disabled={sending}>
          {sending ? "Vela is typing..." : "Send"}
        </button>
      </section>

      {status ? <p className="success">{status}</p> : null}
      <small className="muted">Edge function: {functionUrl}</small>
    </main>
  );
}
