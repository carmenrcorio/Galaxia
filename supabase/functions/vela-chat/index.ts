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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-thread-id"
};

const VELA_SYSTEM_PROMPT = `You are Vela, the guide inside Galaxia — a warm, perceptive astrologer and practical relationship coach who helps someone understand and tend the people they love.

HOW YOU THINK
- You are given COMPUTED astrology facts. Treat them as ground truth and never invent positions.
- Blend chart meaning with concrete relationship advice in plain, jargon-free language.
- In shared mode, stay neutral and never expose private notes.
- In parenting mode (is_minor = true), coach the parent — never address the child directly.

SAFETY
- If risk of harm, abuse, or crisis language appears, deprioritize astrology and guide toward immediate real-world support.

OUTPUT
- 2–5 sentences, warm and specific.
- End with up to 3 short suggested follow-up prompts.`;

const CRISIS_PATTERN =
  /\b(suicid(e|al)|kill myself|self harm|self-harm|hurt myself|end my life|want to die|homicid(e|al)|kill them|abuse)\b/i;

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

function compareGenerational(
  a: Record<string, { sign: string }>,
  b: Record<string, { sign: string }>
): { shared: { planet: string; sign: string }[]; diverged: { planet: string; signA: string; signB: string }[]; sameGeneration: boolean; theme: string } {
  const planets = ["uranus", "neptune", "pluto"] as const;
  const shared: { planet: string; sign: string }[] = [];
  const diverged: { planet: string; signA: string; signB: string }[] = [];
  for (const planet of planets) {
    if (a[planet]?.sign === b[planet]?.sign) shared.push({ planet, sign: a[planet].sign });
    else diverged.push({ planet, signA: a[planet]?.sign ?? "?", signB: b[planet]?.sign ?? "?" });
  }
  return {
    shared, diverged, sameGeneration: shared.length >= 2,
    theme: diverged.length === 0
      ? "You move through power, ideals, and change with very similar instincts."
      : shared.length >= 2
      ? "Most of your generational sky is shared, with one key fault line creating contrast."
      : "You were shaped by different eras — assumptions around trust and change can differ."
  };
}

/** Compute a real compatibility score summary from chart placements */
function computeSynastryScores(
  placementsA: Array<{ body: string; lon: number }>,
  placementsB: Array<{ body: string; lon: number }>
): { overall: number; emotional: number; communication: number; warmth: number } {
  const ASPECTS = [
    { angle: 0, orb: 8, harmony: 0.6 },
    { angle: 60, orb: 4, harmony: 1.3 },
    { angle: 90, orb: 6, harmony: -1.2 },
    { angle: 120, orb: 6, harmony: 1.7 },
    { angle: 180, orb: 8, harmony: -1.1 }
  ];
  const normalize = (lon: number) => ((lon % 360) + 360) % 360;
  const normAngle = (delta: number) => {
    let a = Math.abs(delta) % 360;
    if (a > 180) a = 360 - a;
    return a;
  };

  let emotionSum = 0, commSum = 0, warmthSum = 0, allSum = 0;
  for (const pa of placementsA) {
    for (const pb of placementsB) {
      const angle = normAngle(normalize(pa.lon) - normalize(pb.lon));
      for (const aspect of ASPECTS) {
        const orb = Math.abs(angle - aspect.angle);
        if (orb <= aspect.orb) {
          const h = aspect.harmony - orb / (aspect.orb * 2);
          allSum += h;
          if (pa.body === "moon" || pb.body === "moon") emotionSum += h;
          if (pa.body === "mercury" || pb.body === "mercury") commSum += h;
          if (["venus","mars"].includes(pa.body) || ["venus","mars"].includes(pb.body)) warmthSum += h;
        }
      }
    }
  }
  const toScore = (sum: number) => Math.max(0, Math.min(100, Math.round(50 + sum * 4)));
  const overall = toScore((emotionSum + commSum + warmthSum) / 3 || allSum / 3);
  return { overall, emotional: toScore(emotionSum), communication: toScore(commSum), warmth: toScore(warmthSum) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Accept either primary LLM key or OpenRouter (not both required)
    const llmKey = Deno.env.get("LLM_PROVIDER_KEY");
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: "Missing Supabase environment variables." });
    }

    if (!llmKey && !openRouterKey) {
      return jsonResponse(503, { error: "Vela is not configured yet — no LLM API key has been added. Add LLM_PROVIDER_KEY or OPENROUTER_API_KEY in Supabase function secrets." });
    }

    const token = extractToken(req);
    if (!token) return jsonResponse(401, { error: "Missing bearer token." });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return jsonResponse(401, { error: "Invalid auth session." });

    const payload = (await req.json()) as VelaRequest;
    const action = payload.action ?? "chat";
    const mode = payload.mode;
    const relationshipType = payload.relationshipType ?? "general";

    if (mode !== "ask" && mode !== "shared") {
      return jsonResponse(400, { error: "mode must be 'ask' or 'shared'." });
    }

    // ── Thread management ────────────────────────────────────────────────
    let threadId = payload.threadId;
    let thread: { id: string; owner_id: string; mode: VelaMode; subject_person: string | null; pair_low: string | null; pair_high: string | null; group_id: string | null } | null = null;

    if (threadId) {
      const { data } = await supabase.from("threads").select("id, owner_id, mode, subject_person, pair_low, pair_high, group_id").eq("id", threadId).eq("owner_id", user.id).single();
      thread = data as typeof thread;
      if (!thread) return jsonResponse(404, { error: "Thread not found." });
    } else {
      const pairIds = payload.pairPersonIds ? [...payload.pairPersonIds].sort() : null;
      const { data, error } = await supabase.from("threads").insert({
        owner_id: user.id,
        mode,
        subject_person: payload.subjectPersonId ?? null,
        pair_low: pairIds?.[0] ?? null,
        pair_high: pairIds?.[1] ?? null,
        group_id: payload.groupId ?? null
      }).select("id, owner_id, mode, subject_person, pair_low, pair_high, group_id").single();
      if (error || !data) return jsonResponse(400, { error: error?.message ?? "Unable to create thread." });
      thread = data as typeof thread;
      threadId = thread.id;
    }

    await supabase.from("thread_participants").upsert(
      { thread_id: threadId, user_id: user.id, consented_at: new Date().toISOString() },
      { onConflict: "thread_id,user_id" }
    );

    // ── Scope resolution ─────────────────────────────────────────────────
    const scopedIds = new Set<string>();
    if (thread.subject_person) scopedIds.add(thread.subject_person);
    if (thread.pair_low) scopedIds.add(thread.pair_low);
    if (thread.pair_high) scopedIds.add(thread.pair_high);
    if (thread.group_id) {
      const { data: members } = await supabase.from("group_members").select("person_id").eq("group_id", thread.group_id);
      for (const m of members ?? []) scopedIds.add(m.person_id as string);
    }

    const personIds = [...scopedIds];
    if (personIds.length === 0) return jsonResponse(400, { error: "Scope requires at least one person, pair, or group." });

    const { data: people } = await supabase.from("people").select("id, display_name, relation, is_minor, birth_precision").in("id", personIds);
    if (!people?.length) return jsonResponse(404, { error: "People not found for this thread." });

    // ── Minor safety check ───────────────────────────────────────────────
    if (mode === "shared") {
      if (people.some((p) => p.is_minor)) {
        return jsonResponse(400, { error: "Shared mode is disabled when a minor is in scope. Use ask mode for parenting guidance." });
      }
      const { data: consented } = await supabase.from("thread_participants").select("user_id").eq("thread_id", threadId).not("consented_at", "is", null).is("left_at", null);
      if ((consented?.length ?? 0) < 2) {
        return jsonResponse(409, { error: "Shared mode requires consent from at least two participants.", threadId });
      }
    }

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

    // ── Load charts (real data) ──────────────────────────────────────────
    const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", personIds);
    const chartById = new Map<string, any>((chartRows ?? []).map((r) => [r.person_id as string, r.data]));

    const peopleCtx = people.map((person) => {
      const chart = chartById.get(person.id);
      const placements = (chart?.placements ?? []) as Array<{ body: string; sign: string }>;
      const getSign = (body: string) => placements.find((p) => p.body === body)?.sign ?? "Unknown";
      return {
        name: person.display_name,
        role: person.relation ?? "person",
        isMinor: Boolean(person.is_minor),
        precision: person.birth_precision,
        sun: getSign("sun"), moon: getSign("moon"), rising: chart?.asc ?? null,
        venus: getSign("venus"), mars: getSign("mars"),
        traits: `Sun ${getSign("sun")}, Venus ${getSign("venus")}, Mars ${getSign("mars")}`,
        generational: {
          uranus: chart?.generational?.uranus?.sign ?? "Unknown",
          neptune: chart?.generational?.neptune?.sign ?? "Unknown",
          pluto: chart?.generational?.pluto?.sign ?? "Unknown",
          cohortLabel: chart?.generational?.cohortLabel ?? "Unknown"
        }
      };
    });

    // ── Real synastry for pair threads ───────────────────────────────────
    let synastry: { scores: Record<string, number>; flowAxis: string; frictionAxis: string } | undefined;
    let generationalRelation: ReturnType<typeof compareGenerational> | undefined;
    if (thread.pair_low && thread.pair_high) {
      const chartA = chartById.get(thread.pair_low);
      const chartB = chartById.get(thread.pair_high);
      if (chartA?.placements && chartB?.placements) {
        const scores = computeSynastryScores(chartA.placements, chartB.placements);
        synastry = {
          scores,
          flowAxis: scores.emotional >= 60 ? "Emotional ease flows naturally" : "Communication is the primary bridge",
          frictionAxis: scores.warmth < 50 ? "Physical/warmth pacing may cause friction" : "Values and timing need care"
        };
        generationalRelation = compareGenerational(chartA.generational ?? {}, chartB.generational ?? {});
      }
    }

    // ── Private notes (ask mode only) ────────────────────────────────────
    const noteFilters = [];
    if (thread.subject_person) noteFilters.push(`about_person.eq.${thread.subject_person}`);
    if (thread.pair_low && thread.pair_high) noteFilters.push(`and(pair_low.eq.${thread.pair_low},pair_high.eq.${thread.pair_high})`);
    const { data: notes } = noteFilters.length > 0 && mode === "ask"
      ? await supabase.from("notes").select("body").eq("owner_id", user.id).or(noteFilters.join(",")).limit(5)
      : { data: [] as Array<{ body: string }> };

    // ── Message history ──────────────────────────────────────────────────
    const { data: historyRows } = await supabase.from("messages").select("sender, body").eq("thread_id", threadId).order("created_at", { ascending: false }).limit(12);
    const history = (historyRows ?? []).reverse().map((r) => ({ role: r.sender === "vela" ? "vela" as const : "user" as const, text: r.body }));

    await supabase.from("messages").insert({ thread_id: threadId, sender: "user", body: userMessage });

    // ── Build prompt context ─────────────────────────────────────────────
    const ctx = {
      mode, parenting: peopleCtx.some((p) => p.isMinor), relationshipType,
      user: { name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "friend" },
      people: peopleCtx, synastry, generationalRelation,
      privateNotesDigest: mode === "ask" ? notes?.map((n) => n.body) : undefined,
      history, userMessage
    };

    const crisisDetected = CRISIS_PATTERN.test(userMessage);
    const userContent = crisisDetected
      ? `The message includes potential crisis language. Prioritize a compassionate safety response.\n\nContext:\n${JSON.stringify(ctx, null, 2)}`
      : `Context:\n${JSON.stringify(ctx, null, 2)}\n\nUser: ${userMessage}`;

    // ── LLM call — try primary, fall back to OpenRouter ──────────────────
    async function tryProvider(url: string, apiKey: string, model: string): Promise<Response> {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model, stream: true, temperature: 0.6,
          messages: [
            { role: "system", content: VELA_SYSTEM_PROMPT },
            { role: "user", content: userContent }
          ]
        })
      });
      if (!res.ok || !res.body) throw new Error(`Provider ${url} failed (${res.status})`);
      return res;
    }

    let providerRes: Response;
    if (llmKey) {
      try {
        providerRes = await tryProvider("https://api.openai.com/v1/chat/completions", llmKey, Deno.env.get("PRIMARY_MODEL") ?? "gpt-4o-mini");
      } catch (e) {
        if (!openRouterKey) throw e;
        providerRes = await tryProvider("https://openrouter.ai/api/v1/chat/completions", openRouterKey, Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini");
      }
    } else {
      providerRes = await tryProvider("https://openrouter.ai/api/v1/chat/completions", openRouterKey!, Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini");
    }

    // ── Stream response ──────────────────────────────────────────────────
    const encoder = new TextEncoder();
    let fullReply = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = providerRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const raw of lines) {
              const line = raw.trim();
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const delta = json?.choices?.[0]?.delta?.content ?? "";
                if (typeof delta === "string" && delta.length > 0) {
                  fullReply += delta;
                  controller.enqueue(encoder.encode(delta));
                }
              } catch { /* ignore parse errors */ }
            }
          }
          if (fullReply.trim()) {
            await supabase.from("messages").insert({ thread_id: threadId, sender: "vela", body: fullReply.trim() });
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "x-thread-id": threadId ?? ""
      }
    });
  } catch (err) {
    return jsonResponse(500, { error: err instanceof Error ? err.message : "Unexpected vela-chat error." });
  }
});
