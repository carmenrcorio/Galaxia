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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const VELA_SYSTEM_PROMPT = `You are Vela, the guide inside Galaxia — a warm, perceptive astrologer and practical relationship coach who helps someone understand and tend the people they love.

HOW YOU THINK
- You are given COMPUTED astrology facts. Treat them as ground truth and never invent positions.
- Blend chart meaning with concrete relationship advice.
- In shared mode, stay neutral and never expose private notes.
- In parenting mode, coach the parent and never address the child directly.

SAFETY
- If risk of harm or abuse appears, deprioritize astrology and guide toward immediate real-world support.

OUTPUT
- 2-5 sentences usually.
- End with up to 3 suggested follow-up prompts.`;

const crisisPattern =
  /\b(suicid(e|al)|kill myself|self harm|self-harm|hurt myself|end my life|want to die|homicid(e|al)|kill them|abuse)\b/i;

function normalizeDelta(delta: number): number {
  let value = delta % 360;
  if (value > 180) value -= 360;
  if (value < -180) value += 360;
  return value;
}

function compareGenerational(
  a: { uranus: { sign: string }; neptune: { sign: string }; pluto: { sign: string } },
  b: { uranus: { sign: string }; neptune: { sign: string }; pluto: { sign: string } }
) {
  const planets = ["uranus", "neptune", "pluto"] as const;
  const shared: Array<{ planet: string; sign: string }> = [];
  const diverged: Array<{ planet: string; signA: string; signB: string }> = [];
  for (const planet of planets) {
    if (a[planet].sign === b[planet].sign) shared.push({ planet, sign: a[planet].sign });
    else diverged.push({ planet, signA: a[planet].sign, signB: b[planet].sign });
  }
  return {
    shared,
    diverged,
    sameGeneration: shared.length >= 2,
    theme:
      diverged.length === 0
        ? "You move through power, ideals, and change with very similar instincts."
        : shared.length >= 2
          ? "Most of your generational sky is shared, with one key fault line creating contrast."
          : "You were shaped by different eras, so assumptions around trust and change can differ."
  };
}

function cohortOverlay(people: Array<{ name: string; gen: { uranus: { sign: string }; neptune: { sign: string }; pluto: { sign: string } } }>) {
  const planets = ["uranus", "neptune", "pluto"] as const;
  const sharedSky: Array<{ planet: string; sign: string }> = [];
  const faultLines: Array<{ planet: string; groups: Array<{ sign: string; names: string[] }> }> = [];

  for (const planet of planets) {
    const grouped = new Map<string, string[]>();
    for (const person of people) {
      const sign = person.gen[planet].sign;
      grouped.set(sign, [...(grouped.get(sign) ?? []), person.name]);
    }
    if (grouped.size === 1) {
      const [sign] = grouped.keys();
      sharedSky.push({ planet, sign: sign ?? "Unknown" });
    } else {
      faultLines.push({
        planet,
        groups: [...grouped.entries()].map(([sign, names]) => ({ sign, names }))
      });
    }
  }

  return {
    sharedSky,
    faultLines,
    label:
      faultLines.length === 0
        ? "One shared generation across outer planets."
        : faultLines.length === 1
          ? "Mostly one generation, with one meaningful split."
          : "Multiple generational signatures are active in this group."
  };
}

function buildPromptContext(params: {
  mode: VelaMode;
  userName: string;
  relationshipType: string;
  people: Array<{
    name: string;
    role: string;
    isMinor: boolean;
    precision: string;
    sun: string;
    moon: string | null;
    rising: string | null;
    venus: string;
    mars: string;
    traits: string;
    generational: { uranus: string; neptune: string; pluto: string; cohortLabel: string };
  }>;
  synastry?: { scores: Record<string, number>; flowAxis: string; frictionAxis: string };
  generationalRelation?: ReturnType<typeof compareGenerational>;
  cohort?: { sharedSky: Array<{ planet: string; sign: string }>; faultLines: Array<{ planet: string; groups: Array<{ sign: string; names: string[] }> }>; members: string[] };
  privateNotes?: string[];
  history: Array<{ role: "user" | "vela"; text: string }>;
  userMessage: string;
}) {
  return {
    mode: params.mode,
    parenting: params.people.some((person) => person.isMinor),
    relationshipType: params.relationshipType,
    user: { name: params.userName },
    people: params.people,
    synastry: params.synastry,
    generationalRelation: params.generationalRelation,
    cohort: params.cohort,
    privateNotesDigest: params.mode === "ask" ? params.privateNotes?.slice(0, 5) : undefined,
    history: params.history,
    userMessage: params.userMessage
  };
}

function toHeaders(contentType: string) {
  return { ...CORS_HEADERS, "Content-Type": contentType };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: toHeaders("application/json") });
}

function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const llmKey = Deno.env.get("LLM_PROVIDER_KEY");
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !llmKey || !openRouterKey) {
      return jsonResponse(500, { error: "Missing required environment variables for vela-chat." });
    }

    const token = extractToken(req);
    if (!token) return jsonResponse(401, { error: "Missing bearer token." });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(token);
    if (userError || !user) return jsonResponse(401, { error: "Invalid auth session." });

    const payload = (await req.json()) as VelaRequest;
    const action = payload.action ?? "chat";
    const mode = payload.mode;
    const relationshipType = payload.relationshipType ?? "general";

    if (mode !== "ask" && mode !== "shared") {
      return jsonResponse(400, { error: "mode must be ask or shared." });
    }

    let threadId = payload.threadId;
    let thread:
      | {
          id: string;
          owner_id: string;
          mode: VelaMode;
          subject_person: string | null;
          pair_low: string | null;
          pair_high: string | null;
          group_id: string | null;
        }
      | null = null;

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
      const { data, error } = await supabase
        .from("threads")
        .insert({
          owner_id: user.id,
          mode,
          subject_person: payload.subjectPersonId ?? null,
          pair_low: pairIds?.[0] ?? null,
          pair_high: pairIds?.[1] ?? null,
          group_id: payload.groupId ?? null
        })
        .select("id, owner_id, mode, subject_person, pair_low, pair_high, group_id")
        .single();
      if (error || !data) return jsonResponse(400, { error: error?.message ?? "Unable to create thread." });
      thread = data as typeof thread;
      threadId = thread.id;
    }

    await supabase.from("thread_participants").upsert(
      {
        thread_id: threadId,
        user_id: user.id,
        consented_at: new Date().toISOString()
      },
      { onConflict: "thread_id,user_id" }
    );

    const scopedPeopleIds = new Set<string>();
    if (thread.subject_person) scopedPeopleIds.add(thread.subject_person);
    if (thread.pair_low) scopedPeopleIds.add(thread.pair_low);
    if (thread.pair_high) scopedPeopleIds.add(thread.pair_high);
    if (thread.group_id) {
      const { data: groupMembers } = await supabase.from("group_members").select("person_id").eq("group_id", thread.group_id);
      for (const row of groupMembers ?? []) scopedPeopleIds.add(row.person_id as string);
    }

    const personIds = [...scopedPeopleIds];
    if (personIds.length === 0) return jsonResponse(400, { error: "A person, pair, or group scope is required." });

    const { data: people } = await supabase
      .from("people")
      .select("id, display_name, relation, is_minor, birth_precision, linked_user_id, birth_date")
      .in("id", personIds);

    if (!people || people.length === 0) return jsonResponse(404, { error: "People not found for thread scope." });

    if (mode === "shared") {
      const hasMinor = people.some((person) => person.is_minor);
      if (hasMinor) {
        return jsonResponse(400, {
          error: "Shared mode is disabled when any participant is a minor. Use ask mode for parenting guidance."
        });
      }

      const linkedUsers = [...new Set(people.map((person) => person.linked_user_id).filter(Boolean))] as string[];
      for (const linkedUserId of linkedUsers) {
        if (linkedUserId !== user.id) {
          await supabase.from("thread_participants").upsert(
            {
              thread_id: threadId,
              user_id: linkedUserId,
              consented_at: null
            },
            { onConflict: "thread_id,user_id" }
          );
        }
      }

      const { data: consented } = await supabase
        .from("thread_participants")
        .select("user_id")
        .eq("thread_id", threadId)
        .not("consented_at", "is", null)
        .is("left_at", null);
      const consentedCount = consented?.length ?? 0;
      if (consentedCount < 2) {
        return jsonResponse(409, {
          error: "Shared mode requires consent from at least two participants.",
          threadId
        });
      }
    }

    if (action === "consent") {
      const { error } = await supabase.from("thread_participants").upsert(
        {
          thread_id: threadId,
          user_id: user.id,
          consented_at: new Date().toISOString(),
          left_at: null
        },
        { onConflict: "thread_id,user_id" }
      );
      if (error) return jsonResponse(400, { error: error.message });
      return jsonResponse(200, { ok: true, threadId });
    }

    const userMessage = payload.userMessage?.trim();
    if (!userMessage) return jsonResponse(400, { error: "userMessage is required for chat action." });

    const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", personIds);
    const chartByPersonId = new Map<string, any>((chartRows ?? []).map((row) => [row.person_id as string, row.data]));

    const peopleContext = people.map((person) => {
      const chart = chartByPersonId.get(person.id);
      const placements = (chart?.placements ?? []) as Array<{ body: string; sign: string }>;
      const getSign = (body: string) => placements.find((placement) => placement.body === body)?.sign ?? "Unknown";
      return {
        name: person.display_name,
        role: person.relation ?? "person",
        isMinor: Boolean(person.is_minor),
        precision: person.birth_precision,
        sun: getSign("sun"),
        moon: getSign("moon") || null,
        rising: chart?.asc ?? null,
        venus: getSign("venus"),
        mars: getSign("mars"),
        traits: `Core style: ${getSign("sun")} Sun, ${getSign("venus")} Venus.`,
        generational: {
          uranus: chart?.generational?.uranus?.sign ?? "Unknown",
          neptune: chart?.generational?.neptune?.sign ?? "Unknown",
          pluto: chart?.generational?.pluto?.sign ?? "Unknown",
          cohortLabel: chart?.generational?.cohortLabel ?? "Unavailable"
        }
      };
    });

    let synastry: { scores: Record<string, number>; flowAxis: string; frictionAxis: string } | undefined;
    let generationalRelation: ReturnType<typeof compareGenerational> | undefined;
    if (thread.pair_low && thread.pair_high) {
      const low = chartByPersonId.get(thread.pair_low);
      const high = chartByPersonId.get(thread.pair_high);
      if (low && high) {
        const scores = low && high && low.placements && high.placements ? { overall: 60, emotional: 58, communication: 61, warmth: 59, values: 62, stability: 57 } : {};
        const supportive = ["venus", "sun", "jupiter"];
        const tense = ["saturn", "mars", "pluto"];
        const flowAxis = `${supportive.includes(low?.placements?.[0]?.body) ? "Ease in affection" : "Ease in shared values"}`;
        const frictionAxis = `${tense.includes(high?.placements?.[0]?.body) ? "Pacing and control" : "Communication timing"}`;
        synastry = { scores, flowAxis, frictionAxis };
        generationalRelation = compareGenerational(low.generational, high.generational);
      }
    }

    let cohort:
      | {
          sharedSky: Array<{ planet: string; sign: string }>;
          faultLines: Array<{ planet: string; groups: Array<{ sign: string; names: string[] }> }>;
          members: string[];
        }
      | undefined;
    if (thread.group_id && peopleContext.length >= 3) {
      const overlay = cohortOverlay(
        peopleContext.map((person) => ({
          name: person.name,
          gen: {
            uranus: { sign: person.generational.uranus },
            neptune: { sign: person.generational.neptune },
            pluto: { sign: person.generational.pluto }
          }
        }))
      );
      cohort = {
        sharedSky: overlay.sharedSky,
        faultLines: overlay.faultLines,
        members: peopleContext.map((person) => person.name)
      };
    }

    const noteFilters = [];
    if (thread.subject_person) noteFilters.push(`about_person.eq.${thread.subject_person}`);
    if (thread.pair_low && thread.pair_high) {
      noteFilters.push(`and(pair_low.eq.${thread.pair_low},pair_high.eq.${thread.pair_high})`);
    }
    const notesQuery = noteFilters.length > 0 ? supabase.from("notes").select("body").eq("owner_id", user.id).or(noteFilters.join(",")) : null;
    const { data: notes } = notesQuery ? await notesQuery.limit(5) : { data: [] as Array<{ body: string }> };

    const { data: historyRows } = await supabase
      .from("messages")
      .select("sender, body")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(12);
    const history = (historyRows ?? [])
      .reverse()
      .map((row) => ({ role: row.sender === "vela" ? ("vela" as const) : ("user" as const), text: row.body }));

    await supabase.from("messages").insert({
      thread_id: threadId,
      sender: "user",
      body: userMessage
    });

    const context = buildPromptContext({
      mode,
      userName: user.user_metadata?.display_name ?? user.email ?? "friend",
      relationshipType,
      people: peopleContext,
      synastry,
      generationalRelation,
      cohort,
      privateNotes: mode === "ask" ? (notes ?? []).map((note) => note.body) : undefined,
      history,
      userMessage
    });

    const crisisDetected = crisisPattern.test(userMessage);
    const userContent = crisisDetected
      ? `The user message includes potential safety risk language. Prioritize a compassionate safety response. Context:\n${JSON.stringify(context, null, 2)}`
      : `Context:\n${JSON.stringify(context, null, 2)}\n\nUser message:\n${userMessage}`;

    async function streamFromProvider(options: { url: string; apiKey: string; model: string }) {
      const response = await fetch(options.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.apiKey}`
        },
        body: JSON.stringify({
          model: options.model,
          stream: true,
          temperature: 0.6,
          messages: [
            { role: "system", content: VELA_SYSTEM_PROMPT },
            { role: "user", content: userContent }
          ]
        })
      });
      if (!response.ok || !response.body) {
        throw new Error(`Provider request failed (${response.status})`);
      }
      return response;
    }

    let providerResponse: Response | null = null;
    try {
      providerResponse = await streamFromProvider({
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: llmKey,
        model: Deno.env.get("PRIMARY_MODEL") ?? "gpt-4o-mini"
      });
    } catch (_error) {
      providerResponse = await streamFromProvider({
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: openRouterKey,
        model: Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini"
      });
    }

    const encoder = new TextEncoder();
    let fullReply = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = providerResponse!.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const rawLine of lines) {
              const line = rawLine.trim();
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
              } catch (_parseError) {
                continue;
              }
            }
          }

          if (fullReply.trim().length > 0) {
            await supabase.from("messages").insert({
              thread_id: threadId,
              sender: "vela",
              body: fullReply.trim()
            });
          }
          controller.close();
        } catch (streamError) {
          controller.error(streamError);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "X-Thread-Id": threadId ?? ""
      }
    });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unexpected vela-chat error." });
  }
});
