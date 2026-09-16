#!/usr/bin/env node
/**
 * DEV TOOL — not imported by apps/web, not part of the production bundle.
 *
 * Generates one 1200x630 SVG hero per published blog post (og:image size,
 * navy field, gold serif title, small constellation, galaxiamea.com mark)
 * and optionally uploads them to the public `blog-images` Storage bucket.
 *
 *   node scripts/dev/generate-blog-hero-images.mjs
 *   node scripts/dev/generate-blog-hero-images.mjs --upload
 *
 * Fonts are the already-bundled Cormorant Garamond + DM Sans TTFs under
 * apps/web/app/api/family-pattern-card/fonts (no new packages, no Google
 * Fonts fetch). Output lives next to this script.
 */

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FONT_DIR = join(ROOT, "apps/web/app/api/family-pattern-card/fonts");
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "blog-hero-images");

const WIDTH = 1200;
const HEIGHT = 630;
const BG = "#09091c";
const GOLD = "#d4a855";
const TITLE_FILL = "#f4ecdb";
const BUCKET = "blog-images";

/** Published posts as of this content pass, ordered by published_at. */
export const PUBLISHED_POSTS = [
  {
    slug: "mothers-moon-sign-apology",
    title: "What Your Mother's Moon Sign Says About How She Says Sorry"
  },
  {
    slug: "colleague-you-cannot-read",
    title: "The Colleague You Cannot Read"
  },
  {
    slug: "synastry-chart-meaning",
    title: "What a Synastry Chart Tells You About Your Relationship"
  },
  {
    slug: "moon-square-saturn-parent-child",
    title: "Moon Square Saturn Between a Parent and a Child"
  },
  {
    slug: "nobody-has-your-grandmother",
    title: "Nobody's Astrology App Has Your Grandmother In It"
  },
  {
    slug: "what-a-chart-cannot-tell-you",
    title: "What a Chart Cannot Tell You"
  },
  {
    slug: "sun-sign-not-personality",
    title: "Your Sun Sign Is Not Your Personality"
  },
  {
    slug: "synastry-aspects-explained",
    title: "7 Synastry Aspects That Reveal How Relationships Feel"
  },
  {
    slug: "reading-chart-of-someone-who-died",
    title: "Reading the Chart of Someone Who Has Died"
  },
  {
    slug: "compatibility-scores-wrong-question",
    title: "Why Compatibility Scores Are the Wrong Question"
  }
];

export function publicHeroUrl(slug, origin) {
  const base =
    origin ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ["https://", "eigfvribtntbxyjutsma", ".supabase.co"].join("");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${slug}.svg`;
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function hashSlug(slug) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rough advance widths for Cormorant Garamond, as a fraction of font-size. */
function charWidth(ch) {
  if (ch === " " || ch === "'" || ch === "'" || ch === "," || ch === ".") return 0.28;
  if ("iljI1".includes(ch)) return 0.3;
  if ("mwMW".includes(ch)) return 0.82;
  return 0.52;
}

function measure(text, fontSize) {
  let w = 0;
  for (const ch of text) w += charWidth(ch) * fontSize;
  return w;
}

export function wrapTitle(title, fontSize, maxWidth) {
  const words = title.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (current && measure(trial, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  // Pull a trailing one-word line up so OG preview does not orphan "Read" / "You".
  if (lines.length >= 2) {
    const lastWords = lines[lines.length - 1].split(" ");
    const prevWords = lines[lines.length - 2].split(" ");
    if (lastWords.length === 1 && prevWords.length > 2) {
      const moved = prevWords[prevWords.length - 1];
      const newLast = `${moved} ${lines[lines.length - 1]}`;
      if (measure(newLast, fontSize) <= maxWidth) {
        prevWords.pop();
        lines[lines.length - 2] = prevWords.join(" ");
        lines[lines.length - 1] = newLast;
      }
    }
  }
  return lines;
}

export function titleLayout(title) {
  const maxWidth = 760;
  let fontSize = title.length > 48 ? 48 : title.length > 34 ? 56 : 64;
  let lines = wrapTitle(title, fontSize, maxWidth);
  while (lines.length > 3 && fontSize > 40) {
    fontSize -= 4;
    lines = wrapTitle(title, fontSize, maxWidth);
  }
  return { fontSize, lines, lineHeight: Math.round(fontSize * 1.12) };
}

function constellation(slug) {
  const rand = mulberry32(hashSlug(slug));
  const stars = [];
  const count = 11 + Math.floor(rand() * 5);
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: 780 + rand() * 340,
      y: 70 + rand() * 250,
      r: 1.2 + rand() * 2.6,
      opacity: 0.35 + rand() * 0.55
    });
  }
  // A few brighter anchors so the cluster reads at 600x315 preview size.
  for (let i = 0; i < 3; i += 1) {
    stars.push({
      x: 860 + rand() * 240,
      y: 90 + rand() * 160,
      r: 3.2 + rand() * 1.6,
      opacity: 0.75 + rand() * 0.2
    });
  }

  const links = [];
  const anchors = stars.slice(-5);
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    if (dx * dx + dy * dy < 180 * 180) {
      links.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, opacity: 0.18 + rand() * 0.12 });
    }
  }
  return { stars, links };
}

function fontFace(name, weight, b64) {
  return `@font-face{font-family:${JSON.stringify(name)};font-weight:${weight};font-style:normal;src:url("data:font/ttf;base64,${b64}") format("truetype");}`;
}

export function buildHeroSvg(post, fonts) {
  const { fontSize, lines, lineHeight } = titleLayout(post.title);
  const { stars, links } = constellation(post.slug);
  const blockHeight = lines.length * lineHeight;
  const titleY = Math.round(Math.max(150, (HEIGHT - blockHeight) / 2 - 12));

  const tspans = lines
    .map((line, i) => {
      const dy = i === 0 ? 0 : lineHeight;
      return `<tspan x="72" dy="${dy}">${xmlEscape(line)}</tspan>`;
    })
    .join("");

  const starDots = stars
    .map(
      (s, i) =>
        `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(2)}" fill="${i % 3 === 0 ? GOLD : "#f4ecdb"}" opacity="${s.opacity.toFixed(2)}"/>`
    )
    .join("");
  const starLines = links
    .map(
      (l) =>
        `<line x1="${l.x1.toFixed(1)}" y1="${l.y1.toFixed(1)}" x2="${l.x2.toFixed(1)}" y2="${l.y2.toFixed(1)}" stroke="${GOLD}" stroke-width="1" opacity="${l.opacity.toFixed(2)}"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${xmlEscape(post.title)}">
  <title>${xmlEscape(post.title)}</title>
  <defs>
    <style><![CDATA[
${fontFace("Cormorant Garamond", 600, fonts.cormorant)}
${fontFace("DM Sans", 400, fonts.dmSans)}
    ]]></style>
    <radialGradient id="glow" cx="82%" cy="28%" r="46%">
      <stop offset="0%" stop-color="#1a1540" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${BG}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <g aria-hidden="true">${starLines}${starDots}</g>
  <text x="72" y="${titleY.toFixed(1)}" fill="${TITLE_FILL}" font-family="Cormorant Garamond, Georgia, Times New Roman, serif" font-size="${fontSize}" font-weight="600">${tspans}</text>
  <text x="${WIDTH - 48}" y="${HEIGHT - 36}" text-anchor="end" fill="${GOLD}" fill-opacity="0.45" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="16" letter-spacing="0.08em">galaxiamea.com</text>
</svg>
`;
}

function loadFonts() {
  return {
    cormorant: readFileSync(join(FONT_DIR, "CormorantGaramond-SemiBold.ttf")).toString("base64"),
    dmSans: readFileSync(join(FONT_DIR, "DMSans-Regular.ttf")).toString("base64")
  };
}

export function writeHeroSvgs(outDir = OUT_DIR) {
  mkdirSync(outDir, { recursive: true });
  const fonts = loadFonts();
  const written = [];
  for (const post of PUBLISHED_POSTS) {
    const svg = buildHeroSvg(post, fonts);
    const file = join(outDir, `${post.slug}.svg`);
    writeFileSync(file, svg);
    written.push(file);
  }
  return written;
}

async function uploadHeroSvgs() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const client = createClient(url, serviceRole, { auth: { persistSession: false } });
  const results = [];
  for (const post of PUBLISHED_POSTS) {
    const path = `${post.slug}.svg`;
    const body = readFileSync(join(OUT_DIR, path));
    const { error } = await client.storage.from(BUCKET).upload(path, body, {
      contentType: "image/svg+xml",
      cacheControl: "31536000",
      upsert: true
    });
    if (error) throw new Error(`upload ${path}: ${error.message}`);
    const publicUrl = publicHeroUrl(post.slug);
    results.push({ slug: post.slug, publicUrl });
    console.log(`uploaded ${path} -> ${publicUrl}`);
  }
  return results;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const written = writeHeroSvgs();
  console.log(`wrote ${written.length} SVGs to ${OUT_DIR}`);
  if (process.argv.includes("--upload")) {
    await uploadHeroSvgs();
  }
}
