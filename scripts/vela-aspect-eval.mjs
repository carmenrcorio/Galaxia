#!/usr/bin/env node
/**
 * Repeatable Vela aspect-citation eval.
 *
 * Builds two fixture pair threads the same way vela-chat does (charts from
 * @galaxia/astro, aspect finder + sort/lead_aspects matching the edge
 * function), then asks ten fixed relational questions.
 *
 * Usage (run from repo root after pnpm install):
 *   ANTHROPIC_API_KEY=... node scripts/vela-aspect-eval.mjs
 *
 * Optional: ANTHROPIC_MODEL (defaults to the edge function default, claude-sonnet-5).
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY.");
  process.exit(1);
}

const self = fileURLToPath(import.meta.url);
const root = join(dirname(self), "..");

if (process.env.VELA_ASPECT_EVAL_LOADED !== "1") {
  const viteNode = join(root, "node_modules", "vite-node", "vite-node.mjs");
  if (!existsSync(viteNode)) {
    console.error("Run from repo root after pnpm install so vite-node can load @galaxia/astro.");
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [viteNode, self, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, VELA_ASPECT_EVAL_LOADED: "1" },
    cwd: root
  });
  process.exit(result.status === null ? 1 : result.status);
}

const { computeNatalChart } = await import("../packages/astro/src/index.ts");
const {
  VELA_SYSTEM_PROMPT,
  countVelaAspectCitations,
  selectLeadAspects,
  sortVelaAspectList
} = await import("../packages/vela/src/index.ts");

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

// Same finder as supabase/functions/vela-chat/index.ts computeSynastryScores.
function computeSynastryScores(placementsA, placementsB) {
  const ASPECTS = [
    { angle: 0, orb: 8, harmony: 0.6, type: "conjunction" },
    { angle: 60, orb: 4, harmony: 1.3, type: "sextile" },
    { angle: 90, orb: 6, harmony: -1.2, type: "square" },
    { angle: 120, orb: 6, harmony: 1.7, type: "trine" },
    { angle: 180, orb: 8, harmony: -1.1, type: "opposition" }
  ];
  const norm = (lon) => ((lon % 360) + 360) % 360;
  const angDiff = (a, b) => {
    let d = Math.abs(norm(a) - norm(b)) % 360;
    if (d > 180) d = 360 - d;
    return d;
  };

  let emotionH = 0;
  let commH = 0;
  let warmthH = 0;
  const aspect_list = [];
  for (const pa of placementsA) {
    for (const pb of placementsB) {
      const ang = angDiff(pa.lon, pb.lon);
      for (const asp of ASPECTS) {
        const orb = Math.abs(ang - asp.angle);
        if (orb <= asp.orb) {
          aspect_list.push({
            from: pa.body,
            to: pb.body,
            type: asp.type,
            orb: Number(orb.toFixed(2))
          });
          const h = asp.harmony - orb / (asp.orb * 2);
          if (pa.body === "moon" || pb.body === "moon") emotionH += h;
          if (pa.body === "mercury" || pb.body === "mercury") commH += h;
          if (["venus", "mars"].includes(pa.body) || ["venus", "mars"].includes(pb.body)) {
            warmthH += h;
          }
        }
      }
    }
  }
  const toScore = (v) => Math.max(0, Math.min(100, Math.round(50 + v * 4)));
  const emotional = toScore(emotionH);
  const communication = toScore(commH);
  const warmth = toScore(warmthH);
  const overall = Math.round((emotional + communication + warmth) / 3);
  return { overall, emotional, communication, warmth, aspect_list };
}

function compareGenerational(a, b) {
  const planets = ["uranus", "neptune", "pluto"];
  const shared = [];
  const diverged = [];
  for (const p of planets) {
    if (a[p]?.sign === b[p]?.sign) shared.push({ planet: p, sign: a[p].sign });
    else diverged.push({ planet: p, signA: a[p]?.sign ?? "?", signB: b[p]?.sign ?? "?" });
  }
  return {
    shared,
    diverged,
    sameGeneration: shared.length >= 2,
    theme:
      diverged.length === 0
        ? "You move through power, ideals, and change with very similar instincts."
        : shared.length >= 2
          ? "Most of your generational sky is shared, with one key fault line."
          : "You were shaped by different eras: assumptions about trust and change can differ."
  };
}

function getSign(chart, body) {
  const p = (chart.placements ?? []).find((pl) => pl.body === body);
  if (!p) return "Unknown";
  if (p.confident === false) {
    return p.possibleSigns?.length
      ? `Uncertain (${p.possibleSigns.join(" or ")})`
      : "Uncertain (birth year only)";
  }
  return p.sign;
}

function genSign(g) {
  if (!g?.sign) return "Unknown";
  if (g.confident === false) {
    return g.possibleSigns?.length
      ? `Uncertain (${g.possibleSigns.join(" or ")})`
      : "Uncertain (birth year only)";
  }
  return g.sign;
}

function personCtx(name, role, chart) {
  return {
    name,
    role,
    isMinor: false,
    precision: chart.precision,
    sun: getSign(chart, "sun"),
    moon: getSign(chart, "moon"),
    rising: chart.asc ?? null,
    venus: getSign(chart, "venus"),
    mars: getSign(chart, "mars"),
    generational: {
      uranus: genSign(chart.generational?.uranus),
      neptune: genSign(chart.generational?.neptune),
      pluto: genSign(chart.generational?.pluto),
      cohortLabel: chart.generational?.cohortLabel ?? "Unknown"
    }
  };
}

function buildPairContext(personA, personB, chartA, chartB) {
  const scored = computeSynastryScores(chartA.placements, chartB.placements);
  const synastry = {
    scores: {
      overall: scored.overall,
      emotional: scored.emotional,
      communication: scored.communication,
      warmth: scored.warmth
    },
    flowAxis:
      scored.emotional >= 60
        ? "Emotional ease flows naturally"
        : "Communication is the primary bridge",
    frictionAxis:
      scored.warmth < 50
        ? "Physical warmth and pacing may clash"
        : "Values and timing need care"
  };
  const raw = [];
  for (const hit of scored.aspect_list) {
    raw.push({
      ...hit,
      kind: "synastry",
      from_person: personA.name,
      to_person: personB.name
    });
  }
  for (const person of [
    { ctx: personA, chart: chartA },
    { ctx: personB, chart: chartB }
  ]) {
    const natalHits = computeSynastryScores(person.chart.placements, person.chart.placements)
      .aspect_list.filter((a) => a.from !== a.to);
    for (const hit of natalHits) {
      raw.push({ ...hit, kind: "natal", person: person.ctx.name });
    }
  }
  const aspect_list = sortVelaAspectList(raw);
  const lead_aspects = selectLeadAspects(aspect_list, "synastry");
  return {
    mode: "ask",
    framing: { kind: "default" },
    relationshipType: "partner",
    user: { name: "friend" },
    people: [personA, personB],
    aspect_list,
    lead_aspects,
    synastry,
    generationalRelation: compareGenerational(chartA.generational ?? {}, chartB.generational ?? {}),
    privateNotesDigest: []
  };
}

// Fixtures reused from packages/astro/test (full date, time, and place).
const PAIRS = [
  {
    id: "pair-1",
    a: {
      name: "Alex",
      role: "self",
      birth: { dateUTC: "1993-04-10T13:45:00.000Z", precision: "exact", lat: 40.7128, lng: -74.006 }
    },
    b: {
      name: "Jordan",
      role: "partner",
      birth: { dateUTC: "1994-11-20T09:15:00.000Z", precision: "exact", lat: 34.0522, lng: -118.2437 }
    },
    questions: [
      "Why do we keep fighting about plans?",
      "How do I show them I care?",
      "What does each of us need when we disagree?",
      "How do we reconnect after a hard week?",
      "Where do we misunderstand each other's timing?"
    ]
  },
  {
    id: "pair-2",
    a: {
      name: "Sam",
      role: "self",
      birth: {
        dateUTC: "1990-05-04T14:20:00.000Z",
        precision: "exact",
        lat: 41.8781,
        lng: -87.6298,
        tzOffsetMin: -300
      }
    },
    b: {
      name: "Riley",
      role: "partner",
      birth: {
        dateUTC: "1988-07-22T16:00:00.000Z",
        precision: "exact",
        lat: 37.7749,
        lng: -122.4194,
        tzOffsetMin: -420
      }
    },
    questions: [
      "Why do we keep fighting about plans?",
      "How do I show them I care?",
      "What does each of us need when we disagree?",
      "How do we reconnect after a hard week?",
      "Where do we misunderstand each other's timing?"
    ]
  }
];

async function askVela(ctx, question) {
  const userContent = `Astrology context:\n${JSON.stringify(ctx, null, 2)}\n\nUser: ${question}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      stream: false,
      system: VELA_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }]
    })
  });
  if (!res.ok) {
    let errBody = {};
    try {
      errBody = await res.json();
    } catch {
      /* ignore */
    }
    throw new Error(
      `Anthropic API error (${res.status}): ${errBody?.error?.message ?? res.statusText}`
    );
  }
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  return text;
}

async function main() {
  console.log(`model=${ANTHROPIC_MODEL}`);
  let inListYes = 0;
  let notInListYes = 0;
  let total = 0;

  for (const pair of PAIRS) {
    const chartA = computeNatalChart(pair.a.birth);
    const chartB = computeNatalChart(pair.b.birth);
    const personA = personCtx(pair.a.name, pair.a.role, chartA);
    const personB = personCtx(pair.b.name, pair.b.role, chartB);
    const ctx = buildPairContext(personA, personB, chartA, chartB);
    if (ctx.lead_aspects.length === 0) {
      console.error(`${pair.id}: lead_aspects is empty; fixture charts must produce synastry.`);
      process.exit(1);
    }
    console.log(
      `${pair.id}: aspect_list=${ctx.aspect_list.length} lead_aspects=${ctx.lead_aspects.length}`
    );

    for (let q = 0; q < pair.questions.length; q += 1) {
      const question = pair.questions[q];
      total += 1;
      const reply = await askVela(ctx, question);
      const counts = countVelaAspectCitations(reply, ctx.aspect_list);
      const namedIn = counts.named_in_list > 0;
      const namedOut = counts.named_not_in_list > 0;
      if (namedIn) inListYes += 1;
      if (namedOut) notInListYes += 1;
      console.log(
        `${pair.id} Q${q + 1}: named an in-list aspect: ${namedIn ? "yes" : "no"}; named an aspect not in the list: ${namedOut ? "yes" : "no"}`
      );
    }
  }

  console.log(
    `summary: ${inListYes}/${total} named an in-list aspect; ${notInListYes}/${total} named an aspect not in the list`
  );
  if (inListYes < 9 || notInListYes !== 0) {
    console.error(
      `FAIL: need at least 9/10 in-list and 0/10 not-in-list (got ${inListYes}/${total} in-list, ${notInListYes}/${total} not-in-list).`
    );
    process.exit(1);
  }
  console.log("PASS");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
