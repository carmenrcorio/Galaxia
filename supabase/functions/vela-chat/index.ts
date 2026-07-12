import { createClient } from "npm:@supabase/supabase-js@2.108.2";

type VelaMode = "ask" | "shared";

interface VelaRequest {
  action?: "chat" | "consent";
  threadId?: string;
  mode: VelaMode;
  relationshipType?: string;
  subjectPersonId?: string;
  pairPersonIds?: [string, string];
  groupId?: string;
  userMessage?: string;
}

// ─── CORS ────────────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-thread-id"
};

// ─── Vela system prompt ───────────────────────────────────────────────────────
// Remembrance Phase 2 — keep in sync with packages/vela and apps/web/lib/remembrance.ts
const VELA_REMEMBRANCE_GUARDRAIL =
  "Draw only on the computed chart facts you are given and the owner's own saved reflections in the private notes digest. Never fabricate memories, events, or facts about the person. Do not invent what they said, did, or felt.";

const VELA_SYSTEM_PROMPT =
  `You are Vela, the guide inside Galaxia — a warm, perceptive astrologer and practical relationship coach who helps someone understand and tend the people they love.

HOW YOU THINK
- You are given COMPUTED astrology facts (planets, signs, aspects, generational signatures). Treat them as ground truth; never invent a placement.
- Blend chart meaning with concrete relationship advice in plain, jargon-free language.
- In shared mode, stay neutral and never reference private notes.
- In parenting mode (any person is a minor), coach the parent — never address the child directly.
- ${VELA_REMEMBRANCE_GUARDRAIL}
- The private notes digest is a short recent sample (at most five), not full recall of every reflection.

SAFETY
- If crisis, abuse, or self-harm language appears, deprioritize astrology and guide immediately toward real-world support.

OUTPUT
- 2–5 sentences, warm and specific.
- End with up to 3 short suggested follow-up prompts, each on its own line, prefixed with "→ ".`;

const CRISIS_PATTERN =
  /\b(suicid(e|al)|kill myself|self harm|self-harm|hurt myself|end my life|want to die|homicid(e|al)|kill them|abuse)\b/i;

// ─── Minor safety — single age-aware source of truth ──────────────────────
// Mirrors packages/core/src/index.ts `isMinorForSafety` / `minPossibleAge`
// (edge functions cannot import from the pnpm workspace). Keep both in sync.
//
// An audit found a real child in production with `is_minor = false` — the
// manual checkbox can be forgotten or absent from an insert path, so this
// (the ONLY server-side, authoritative enforcement point) must never rely on
// it alone. effective minor = is_minor === true OR computed age < 18. The
// manual flag can only ADD protection, never remove it. Year-only precision
// is ambiguous, so it over-protects by assuming the latest possible birthday
// (Dec 31 — the youngest possible current age).
function minPossibleAge(
  birthDate: string | null | undefined,
  birthPrecision: string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!birthDate || !birthPrecision || birthPrecision === "none") return null;
  const [year, storedMonth, storedDay] = birthDate.slice(0, 10).split("-").map(Number);
  if (!Number.isFinite(year)) return null;
  const [month, day] = birthPrecision === "year" ? [12, 31] : [storedMonth, storedDay];
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
  let age = now.getUTCFullYear() - year;
  const beforeBirthdayThisYear =
    now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  if (beforeBirthdayThisYear) age -= 1;
  return age;
}

function isMinorForSafety(person: { is_minor?: boolean | null; birth_date?: string | null; birth_precision?: string | null }): boolean {
  if (person.is_minor === true) return true;
  const age = minPossibleAge(person.birth_date, person.birth_precision);
  return age !== null && age < 18;
}

/**
 * Split a Vela reply into the answer body and the "→ " suggested follow-ups.
 * Mirrors apps/web/lib/vela-parse.ts (edge functions cannot import from apps).
 * Body and suggestions are persisted separately so resumed threads render
 * the answer bubble and the suggestion chips correctly.
 */
function splitVelaReply(text: string): { body: string; suggestions: string[] } {
  const lines = text.split("\n");
  const firstArrow = lines.findIndex((l) => l.trimStart().startsWith("→"));
  if (firstArrow === -1) return { body: text.trim(), suggestions: [] };
  const body = lines.slice(0, firstArrow).join("\n").trim();
  const suggestions = lines
    .slice(firstArrow)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("→"))
    .map((l) => l.replace(/^→\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  return { body, suggestions };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

// ─── Real synastry scores from stored chart placements ────────────────────────
function computeSynastryScores(
  placementsA: Array<{ body: string; lon: number }>,
  placementsB: Array<{ body: string; lon: number }>
): { overall: number; emotional: number; communication: number; warmth: number } {
  const ASPECTS = [
    { angle: 0,   orb: 8, harmony: 0.6  },
    { angle: 60,  orb: 4, harmony: 1.3  },
    { angle: 90,  orb: 6, harmony: -1.2 },
    { angle: 120, orb: 6, harmony: 1.7  },
    { angle: 180, orb: 8, harmony: -1.1 }
  ];
  const norm = (lon: number) => ((lon % 360) + 360) % 360;
  const angDiff = (a: number, b: number) => {
    let d = Math.abs(norm(a) - norm(b)) % 360;
    if (d > 180) d = 360 - d;
    return d;
  };

  let emotionH = 0, commH = 0, warmthH = 0;
  for (const pa of placementsA) {
    for (const pb of placementsB) {
      const ang = angDiff(pa.lon, pb.lon);
      for (const asp of ASPECTS) {
        const orb = Math.abs(ang - asp.angle);
        if (orb <= asp.orb) {
          const h = asp.harmony - orb / (asp.orb * 2);
          if (pa.body === "moon" || pb.body === "moon") emotionH += h;
          if (pa.body === "mercury" || pb.body === "mercury") commH += h;
          if (["venus","mars"].includes(pa.body) || ["venus","mars"].includes(pb.body)) warmthH += h;
        }
      }
    }
  }
  const toScore = (v: number) => Math.max(0, Math.min(100, Math.round(50 + v * 4)));
  const emotional = toScore(emotionH);
  const communication = toScore(commH);
  const warmth = toScore(warmthH);
  const overall = Math.round((emotional + communication + warmth) / 3);
  return { overall, emotional, communication, warmth };
}

// ─── Generational comparison (pure TS, no npm dependency) ────────────────────
function compareGenerational(
  a: Record<string, { sign: string }>,
  b: Record<string, { sign: string }>
) {
  const planets = ["uranus", "neptune", "pluto"] as const;
  const shared: { planet: string; sign: string }[] = [];
  const diverged: { planet: string; signA: string; signB: string }[] = [];
  for (const p of planets) {
    if (a[p]?.sign === b[p]?.sign) shared.push({ planet: p, sign: a[p].sign });
    else diverged.push({ planet: p, signA: a[p]?.sign ?? "?", signB: b[p]?.sign ?? "?" });
  }
  return {
    shared, diverged, sameGeneration: shared.length >= 2,
    theme: diverged.length === 0
      ? "You move through power, ideals, and change with very similar instincts."
      : shared.length >= 2
        ? "Most of your generational sky is shared, with one key fault line."
        : "You were shaped by different eras — assumptions about trust and change can differ."
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // ── Env / config ─────────────────────────────────────────────────────────
    // User-scoped client (anon key + caller JWT) so RLS enforces owner isolation.
    // Do NOT use service_role here — it bypasses RLS and previously allowed IDOR
    // reads of other users' people/charts when foreign IDs were supplied.
    const supabaseUrl    = Deno.env.get("SUPABASE_URL");
    const anonKey        = Deno.env.get("SUPABASE_ANON_KEY");
    const anthropicKey   = Deno.env.get("ANTHROPIC_API_KEY");
    const anthropicModel = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";

    if (!supabaseUrl || !anonKey) {
      return jsonResponse(500, { error: "Missing Supabase environment variables." });
    }
    if (!anthropicKey) {
      return jsonResponse(503, {
        error: "Vela isn't configured yet — add ANTHROPIC_API_KEY to the vela-chat function secrets in Supabase."
      });
    }

    // ── Auth ─────────────────────────────────────────────────────────────────
    const token = extractToken(req);
    if (!token) return jsonResponse(401, { error: "Missing bearer token." });

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return jsonResponse(401, { error: "Invalid or expired auth session." });

    // ── Parse request ────────────────────────────────────────────────────────
    const payload = (await req.json()) as VelaRequest;
    const action  = payload.action ?? "chat";
    const mode    = payload.mode;
    const relType = payload.relationshipType ?? "general";

    if (mode !== "ask" && mode !== "shared") {
      return jsonResponse(400, { error: "mode must be 'ask' or 'shared'." });
    }

    // ── Thread management ────────────────────────────────────────────────────
    let threadId = payload.threadId;
    let thread: {
      id: string; owner_id: string; mode: VelaMode;
      subject_person: string | null; pair_low: string | null;
      pair_high: string | null; group_id: string | null;
    } | null = null;

    if (threadId) {
      const { data } = await supabase
        .from("threads")
        .select("id, owner_id, mode, subject_person, pair_low, pair_high, group_id")
        .eq("id", threadId)
        .eq("owner_id", user.id)
        .single();
      thread = data as typeof thread;
      if (!thread) return jsonResponse(404, { error: "Thread not found." });
    } else {
      const pairIds = payload.pairPersonIds ? [...payload.pairPersonIds].sort() : null;
      const createScopeIds = [
        payload.subjectPersonId,
        ...(pairIds ?? []),
      ].filter((id): id is string => typeof id === "string" && id.length > 0);

      if (createScopeIds.length > 0) {
        const { data: ownedForCreate } = await supabase
          .from("people")
          .select("id")
          .in("id", createScopeIds)
          .eq("owner_id", user.id);
        if (!ownedForCreate || ownedForCreate.length !== new Set(createScopeIds).size) {
          return jsonResponse(404, { error: "People not found for this thread." });
        }
      }

      if (payload.groupId) {
        const { data: ownedGroup } = await supabase
          .from("groups")
          .select("id")
          .eq("id", payload.groupId)
          .eq("owner_id", user.id)
          .maybeSingle();
        if (!ownedGroup) {
          return jsonResponse(404, { error: "Group not found for this thread." });
        }
      }

      const { data, error } = await supabase
        .from("threads")
        .insert({
          owner_id: user.id, mode,
          subject_person: payload.subjectPersonId ?? null,
          pair_low:  pairIds?.[0] ?? null,
          pair_high: pairIds?.[1] ?? null,
          group_id:  payload.groupId ?? null
        })
        .select("id, owner_id, mode, subject_person, pair_low, pair_high, group_id")
        .single();
      if (error || !data) return jsonResponse(400, { error: error?.message ?? "Unable to create thread." });
      thread = data as typeof thread;
      threadId = thread.id;
    }

    // Record user consent
    await supabase.from("thread_participants").upsert(
      { thread_id: threadId, user_id: user.id, consented_at: new Date().toISOString() },
      { onConflict: "thread_id,user_id" }
    );

    // ── Scope resolution (owner-scoped; reject any foreign person/group) ─────
    const scopedIds = new Set<string>();
    if (thread.subject_person) scopedIds.add(thread.subject_person);
    if (thread.pair_low)       scopedIds.add(thread.pair_low);
    if (thread.pair_high)      scopedIds.add(thread.pair_high);
    if (thread.group_id) {
      // Confirm the caller owns the group before expanding members.
      const { data: ownedGroup } = await supabase
        .from("groups")
        .select("id")
        .eq("id", thread.group_id)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!ownedGroup) {
        return jsonResponse(404, { error: "Group not found for this thread." });
      }
      const { data: members } = await supabase
        .from("group_members")
        .select("person_id")
        .eq("group_id", thread.group_id);
      for (const m of members ?? []) scopedIds.add(m.person_id as string);
    }

    const personIds = [...scopedIds];
    if (personIds.length === 0) {
      return jsonResponse(400, { error: "Scope requires at least one person, pair, or group." });
    }

    // Explicit owner_id filter (belt-and-suspenders with RLS on the user-scoped client).
    // If any requested id is not owned by the caller, refuse — do not silently omit.
    const { data: people } = await supabase
      .from("people")
      .select("id, display_name, relation, is_minor, birth_date, birth_precision")
      .in("id", personIds)
      .eq("owner_id", user.id);
    if (!people?.length || people.length !== personIds.length) {
      return jsonResponse(404, { error: "People not found for this thread." });
    }

    // ── Safety checks ────────────────────────────────────────────────────────
    // The line is shared-mode, not minor-as-subject. A parent asking Vela
    // PRIVATELY about their child is the core parenting use case; the `parenting`
    // flag below puts Vela in coach-the-parent mode (never addressing the child).
    // What must never happen is a minor being a participant in a real-time
    // two-way (shared) session.
    //
    // isMinorForSafety(), never `p.is_minor` directly — this is the single
    // authoritative safety enforcement point (the client's own check is
    // belt-and-suspenders UX only). See comment above isMinorForSafety.
    if (mode === "shared" && people.some((p) => isMinorForSafety(p))) {
      return jsonResponse(400, {
        error: "Shared spaces are turned off when a minor is involved. Ask about them privately in ask mode instead."
      });
    }

    if (mode === "shared") {
      const { data: consented } = await supabase
        .from("thread_participants")
        .select("user_id")
        .eq("thread_id", threadId)
        .not("consented_at", "is", null)
        .is("left_at", null);
      if ((consented?.length ?? 0) < 2) {
        return jsonResponse(409, {
          error: "Shared mode requires consent from at least two participants.",
          threadId
        });
      }
    }

    // Consent-only action
    if (action === "consent") {
      const { error } = await supabase.from("thread_participants").upsert(
        { thread_id: threadId, user_id: user.id, consented_at: new Date().toISOString(), left_at: null },
        { onConflict: "thread_id,user_id" }
      );
      if (error) return jsonResponse(400, { error: error.message });
      return jsonResponse(200, { ok: true, threadId });
    }

    const userMessage = payload.userMessage?.trim();
    if (!userMessage) return jsonResponse(400, { error: "userMessage is required for chat." });

    // ── Charts (only for people already proven owned above) ──────────────────
    const ownedPersonIds = people.map((p) => p.id as string);
    const { data: chartRows } = await supabase
      .from("charts")
      .select("person_id, data")
      .in("person_id", ownedPersonIds);
    const chartById = new Map<string, any>(
      (chartRows ?? []).map((r) => [r.person_id as string, r.data])
    );

    // Build people context.
    // A placement with confident === false (year-only birth data — the true
    // sign depends on an unknown birth date) is never presented to the model
    // as a settled fact; Vela must not interpret a sign we do not know.
    const peopleCtx = people.map((person) => {
      const chart = chartById.get(person.id);
      const placements = (chart?.placements ?? []) as Array<{ body: string; sign: string; confident?: boolean; possibleSigns?: string[] }>;
      const getSign = (body: string) => {
        const p = placements.find((pl) => pl.body === body);
        if (!p) return "Unknown";
        if (p.confident === false) {
          return p.possibleSigns?.length ? `Uncertain (${p.possibleSigns.join(" or ")})` : "Uncertain — birth year only";
        }
        return p.sign;
      };
      const genSign = (g?: { sign?: string; confident?: boolean; possibleSigns?: string[] }) => {
        if (!g?.sign) return "Unknown";
        if (g.confident === false) {
          return g.possibleSigns?.length ? `Uncertain (${g.possibleSigns.join(" or ")})` : "Uncertain — birth year only";
        }
        return g.sign;
      };
      return {
        name:      person.display_name,
        role:      person.relation ?? "person",
        isMinor:   isMinorForSafety(person),
        precision: person.birth_precision,
        sun:    getSign("sun"),
        moon:   getSign("moon"),
        rising: chart?.asc ?? null,
        venus:  getSign("venus"),
        mars:   getSign("mars"),
        generational: {
          uranus:     genSign(chart?.generational?.uranus),
          neptune:    genSign(chart?.generational?.neptune),
          pluto:      genSign(chart?.generational?.pluto),
          cohortLabel: chart?.generational?.cohortLabel  ?? "Unknown"
        }
      };
    });

    // Real synastry for pair threads
    let synastry: { scores: Record<string, number>; flowAxis: string; frictionAxis: string } | undefined;
    let genRelation: ReturnType<typeof compareGenerational> | undefined;
    if (thread.pair_low && thread.pair_high) {
      const cA = chartById.get(thread.pair_low);
      const cB = chartById.get(thread.pair_high);
      if (cA?.placements && cB?.placements) {
        const scores = computeSynastryScores(cA.placements, cB.placements);
        synastry = {
          scores,
          flowAxis:     scores.emotional >= 60  ? "Emotional ease flows naturally"      : "Communication is the primary bridge",
          frictionAxis: scores.warmth    < 50   ? "Physical warmth and pacing may clash" : "Values and timing need care"
        };
        genRelation = compareGenerational(cA.generational ?? {}, cB.generational ?? {});
      }
    }

    // Private notes (ask mode only)
    const noteFilters: string[] = [];
    if (thread.subject_person) noteFilters.push(`about_person.eq.${thread.subject_person}`);
    if (thread.pair_low && thread.pair_high) {
      noteFilters.push(`and(pair_low.eq.${thread.pair_low},pair_high.eq.${thread.pair_high})`);
    }
    // Ask mode only. Caps at 5 — Vela does not have full recall of every
    // remembrance reflection. Prefer recent remembrance notes, then others.
    let notes: Array<{ body: string }> = [];
    if (noteFilters.length > 0 && mode === "ask") {
      const { data: noteRows } = await supabase
        .from("notes")
        .select("body, kind")
        .eq("owner_id", user.id)
        .or(noteFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(20);
      const rows = (noteRows ?? []) as Array<{ body: string; kind?: string | null }>;
      const remembrance = rows.filter((n) => n.kind === "remembrance");
      const other = rows.filter((n) => n.kind !== "remembrance");
      notes = [...remembrance, ...other].slice(0, 5);
    }

    // Conversation history
    const { data: historyRows } = await supabase
      .from("messages")
      .select("sender, body")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(12);
    const history = (historyRows ?? [])
      .reverse()
      .map((r) => ({
        role: r.sender === "vela" ? "assistant" as const : "user" as const,
        // Legacy vela rows may still carry "→ " lines in the body — keep the
        // model's conversation context to answer bodies only.
        content: r.sender === "vela" ? (splitVelaReply(r.body as string).body || (r.body as string)) : (r.body as string)
      }));

    // Persist the user message
    await supabase.from("messages").insert({ thread_id: threadId, sender: "user", body: userMessage });

    // ── Build Anthropic request ──────────────────────────────────────────────
    const ctx = {
      mode,
      parenting:      peopleCtx.some((p) => p.isMinor),
      relationshipType: relType,
      user:           { name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "friend" },
      people:         peopleCtx,
      synastry,
      generationalRelation: genRelation,
      privateNotesDigest:   mode === "ask" ? notes.map((n) => n.body) : undefined
    };

    const crisisDetected = CRISIS_PATTERN.test(userMessage);
    const userContent = crisisDetected
      ? `The user message contains potential crisis language. Lead with compassionate safety guidance.\n\nAstrology context:\n${JSON.stringify(ctx, null, 2)}\n\nUser: ${userMessage}`
      : `Astrology context:\n${JSON.stringify(ctx, null, 2)}\n\nUser: ${userMessage}`;

    // Messages array: only user/assistant turns — system is top-level
    const messages = [
      ...history,
      { role: "user" as const, content: userContent }
    ];

    const anthropicBody = JSON.stringify({
      model:      anthropicModel,
      max_tokens: 1024,
      stream:     true,
      system:     VELA_SYSTEM_PROMPT,   // top-level string, NOT a message
      messages
    });

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: anthropicBody
    });

    // Surface Anthropic errors as human-readable messages
    if (!anthropicRes.ok) {
      let errBody: Record<string, any> = {};
      try { errBody = await anthropicRes.json(); } catch { /* ignore */ }
      const errMsg =
        anthropicRes.status === 401 ? "Invalid Anthropic API key — check the ANTHROPIC_API_KEY secret." :
        anthropicRes.status === 429 ? "Anthropic rate limit reached — please wait a moment and try again." :
        anthropicRes.status === 400 ? `Anthropic rejected the request: ${errBody?.error?.message ?? "bad request"}` :
        `Anthropic API error (${anthropicRes.status}): ${errBody?.error?.message ?? "unknown"}`;
      return jsonResponse(anthropicRes.status >= 500 ? 502 : anthropicRes.status, { error: errMsg });
    }

    if (!anthropicRes.body) {
      return jsonResponse(502, { error: "Anthropic returned an empty response body." });
    }

    // ── Stream Anthropic SSE → client ────────────────────────────────────────
    // Anthropic SSE event types that carry text:
    //   content_block_delta  →  data.delta.type === "text_delta"  →  data.delta.text
    // All other events (message_start, content_block_start, message_stop, etc.) are ignored.

    const encoder = new TextEncoder();
    let fullReply = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader  = anthropicRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";   // last incomplete line stays in buffer

            for (const raw of lines) {
              const line = raw.trim();

              // Anthropic SSE: lines starting with "data: " carry JSON payloads
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (payload === "[DONE]") continue;   // Anthropic does not send [DONE] but guard anyway

              let parsed: any;
              try { parsed = JSON.parse(payload); } catch { continue; }

              // We only care about content_block_delta with text_delta
              if (
                parsed?.type === "content_block_delta" &&
                parsed?.delta?.type === "text_delta" &&
                typeof parsed?.delta?.text === "string" &&
                parsed.delta.text.length > 0
              ) {
                fullReply += parsed.delta.text;
                controller.enqueue(encoder.encode(parsed.delta.text));
              }

              // message_stop signals the end of the stream
              if (parsed?.type === "message_stop") break;
            }
          }

          // Persist Vela's reply: answer body and "→ " follow-up suggestions
          // are stored separately so resumed threads render correctly.
          const trimmedReply = fullReply.trim();
          if (trimmedReply) {
            const { body, suggestions } = splitVelaReply(trimmedReply);
            const { error: insertError } = await supabase.from("messages").insert({
              thread_id:   threadId,
              sender:      "vela",
              body:        body || trimmedReply,
              suggestions: suggestions.length > 0 ? suggestions : null
            });
            if (insertError) {
              // If the suggestions column doesn't exist yet (migration not
              // applied), fall back to storing the raw reply — the client's
              // parser still splits it on load.
              await supabase.from("messages").insert({
                thread_id: threadId,
                sender:    "vela",
                body:      trimmedReply
              });
            }
          }

          controller.close();
        } catch (streamErr) {
          controller.error(streamErr);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "x-thread-id":  threadId ?? ""
      }
    });

  } catch (err) {
    return jsonResponse(500, {
      error: err instanceof Error ? err.message : "Unexpected vela-chat error."
    });
  }
});
