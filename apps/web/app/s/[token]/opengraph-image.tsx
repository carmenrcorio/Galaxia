/**
 * OG image for a copied `/s/<token>` link — so it unfurls into a branded
 * card instead of a bare URL. Renders the ALREADY-STRIPPED stored snapshot
 * only (via `getQuickShareByToken`, same as the page itself) — never
 * recomputes a chart, never reads birth time/lat/lng (those fields do not
 * exist on `SingleSharePayload`/`CompareSharePayload` — see `lib/quick-share.ts`),
 * never reads `synastry.scores`, and never calls `whatTheyNeed`.
 *
 * Data shaping (confident-only sun/moon, chart.asc-only rising, the
 * non-romantic relationship summary) lives in `lib/og-card.ts` so the same
 * logic that gates safety is unit-tested directly — this file only lays out
 * the JSX and loads fonts.
 *
 * Visual composition matches `opengraph-image/DESIGN-SPEC.html` (the
 * committed match target) 1:1: literal hex, no CSS variables, glow built
 * from `radial-gradient` orbs + `box-shadow` (never `filter`/blur — Satori
 * ignores both), rings/aspect lines as inline `<svg>` strokes, and explicit
 * `display: flex` + a flex-direction on every multi-child `<div>`.
 *
 * Satori (the renderer behind `next/og`) cannot use `next/font/google`, so
 * fonts are raw `.ttf` files read from disk (see `opengraph-image/fonts/NOTICE.md`).
 * `ZodiacGlyphs-Regular.ttf` covers exactly the 22 codepoints
 * `SIGN_GLYPH`/`BODY_GLYPH` use; satori substitutes glyphs from any loaded
 * font that has them, regardless of which font a span's `fontFamily`
 * names, so no per-span override is needed for the zodiac/planet symbols.
 *
 * The fonts are loaded lazily inside `loadOgFonts()`, called only from the
 * `Image` request handler below — NEVER at module scope. Next's file-convention
 * metadata resolution imports this module as a dependency of the sibling
 * `page.tsx` too (to read the static `alt`/`size`/`contentType` exports below
 * for auto-generated `<meta>` tags), which bundles this file's module-scope
 * code into the PAGE's serverless function, not just this route's own. On
 * Vercel that page-side bundle did not reliably ship these `.ttf` files
 * (output-file-tracing missed the transitive `readFile` call once inlined
 * into another route), so a module-scope `await` here threw and crashed
 * metadata resolution for the whole page, not just image generation.
 * Loading lazily means only a real image request ever touches the
 * filesystem — and page.js no longer even references this code (confirmed
 * via the compiled bundle: dead-code-eliminated, since nothing in the
 * page's import graph calls it). A failed read here degrades to Satori's
 * built-in fallback font (see the `catch` below) instead of taking down
 * either route.
 */

import { RELATION_HEADLINE, type RelationType, type Sign } from "@galaxia/astro";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BODY_GLYPH, SIGN_GLYPH } from "../../../lib/design";
import {
  buildOgCompareCard,
  buildOgSingleCard,
  type OgBigThree,
  type OgCompareCard,
  type OgSingleCard,
} from "../../../lib/og-card";
import type { CompareSharePayload, SingleSharePayload } from "../../../lib/quick-share";
import { getQuickShareByToken } from "../../../lib/quick-share-server";

export const alt = "A shared Galaxia reading";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_DIR = join(process.cwd(), "app/s/[token]/opengraph-image/fonts");

type OgFont = { name: string; data: Buffer; weight: 400 | 600; style: "normal" };

let ogFontsPromise: Promise<OgFont[]> | null = null;

/**
 * Loads the 5 OG fonts once and memoizes the result — called only from the
 * `Image` handler (never at module scope; see the file header for why).
 * A failed read does not get cached as a permanent rejection: if this
 * container's filesystem is missing a font transiently (or forever, for a
 * misconfigured deployment), the next request gets to try again instead of
 * being wedged behind one cached failure for the container's lifetime.
 */
async function loadOgFonts(): Promise<OgFont[]> {
  if (!ogFontsPromise) {
    ogFontsPromise = Promise.all([
      readFile(join(FONT_DIR, "Fraunces-Regular.ttf")),
      readFile(join(FONT_DIR, "Fraunces-SemiBold.ttf")),
      readFile(join(FONT_DIR, "Inter-Regular.ttf")),
      readFile(join(FONT_DIR, "Inter-SemiBold.ttf")),
      readFile(join(FONT_DIR, "ZodiacGlyphs-Regular.ttf")),
    ])
      .then(([frauncesRegular, frauncesDisplay, interRegular, interSemiBold, zodiacGlyphs]): OgFont[] => [
        { name: "Fraunces", data: frauncesRegular, weight: 400, style: "normal" },
        { name: "Fraunces", data: frauncesDisplay, weight: 600, style: "normal" },
        { name: "Inter", data: interRegular, weight: 400, style: "normal" },
        { name: "Inter", data: interSemiBold, weight: 600, style: "normal" },
        // Never matched by name — present purely so satori's cross-font glyph
        // fallback can find the zodiac/planet codepoints Fraunces/Inter lack.
        { name: "Zodiac Glyphs", data: zodiacGlyphs, weight: 400, style: "normal" },
      ])
      .catch((error: unknown) => {
        ogFontsPromise = null;
        throw error;
      });
  }
  return ogFontsPromise;
}

/**
 * Literal hex from `opengraph-image/DESIGN-SPEC.html`'s palette note.
 * Satori does not resolve CSS custom properties (`var(...)`), so every
 * value here is a plain string, not a token reference.
 */
const PALETTE = {
  bg: "#09080f",
  bloomCenter: "rgba(74,58,134,0.5)",
  bloomMid: "rgba(44,35,82,0.26)",
  bloomEdge: "rgba(9,8,15,0)",
  goldWordmark: "#ecc890",
  goldEyebrow: "#d9b57e",
  goldLabel: "#e0b878",
  goldCoreBorder: "#e8c07a",
  goldGlow: "rgba(255,231,150,0.55)",
  goldGlowSoft: "rgba(255,231,150,0.5)",
  goldGlowEdge: "rgba(232,192,122,0)",
  teal: "#7fd4c0",
  coral: "#e8926a",
  lavender: "#b8a9e8",
  signTile: "#5a3f8f",
  signTileGlow: "rgba(120,80,180,0.45)",
  signTileGlowSoft: "rgba(120,80,180,0.4)",
  tileGlyph: "#e6dcff",
  titleText: "#f2eefa",
  muted: "#a99ec9",
  muted2: "#b3a6cf",
  labelMuted: "#9a90bb",
  ringStroke: "#b9a9e6",
  tokenDark: "#14102a",
} as const;

/** The 12 sign-tile wheel positions in `DESIGN-SPEC.html` (Card 1), verbatim. */
const WHEEL_TILES: readonly { sign: Sign; left: number; top: number }[] = [
  { sign: "Scorpio", left: 900, top: 90 },
  { sign: "Sagittarius", left: 1002, top: 117 },
  { sign: "Capricorn", left: 1078, top: 193 },
  { sign: "Aquarius", left: 1105, top: 295 },
  { sign: "Pisces", left: 1078, top: 397 },
  { sign: "Aries", left: 1002, top: 473 },
  { sign: "Taurus", left: 900, top: 500 },
  { sign: "Gemini", left: 798, top: 473 },
  { sign: "Cancer", left: 722, top: 397 },
  { sign: "Leo", left: 695, top: 295 },
  { sign: "Virgo", left: 722, top: 193 },
  { sign: "Libra", left: 798, top: 117 },
];

function BloomBackground({ center }: { center: string }) {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        top: 0,
        left: 0,
        width: size.width,
        height: size.height,
        background: `radial-gradient(circle at ${center}, ${PALETTE.bloomCenter} 0%, ${PALETTE.bloomMid} 55%, ${PALETTE.bloomEdge} 100%)`,
      }}
    />
  );
}

function Wordmark({ fontSize, color }: { fontSize: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "baseline" }}>
      <span style={{ fontFamily: "Fraunces", fontSize, color }}>Galax</span>
      <span style={{ fontFamily: "Fraunces", fontStyle: "italic", fontSize, color }}>ia</span>
    </div>
  );
}

/**
 * Glowing sign tile: filled `#5a3f8f` with a `box-shadow` bloom (never
 * `filter`/blur — Satori ignores that, which is exactly why the earlier
 * cards were flat). Used for the wheel's 12 decorative tiles, the chart
 * card's big-three rows, and the comparison card's per-person tiles.
 */
function SignTile({ sign, dim, radius, fontSize, glow }: { sign: Sign; dim: number; radius: number; fontSize: number; glow: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        borderRadius: radius,
        background: PALETTE.signTile,
        boxShadow: `0 0 16px 2px ${glow}`,
        color: PALETTE.tileGlyph,
        fontSize,
      }}
    >
      {SIGN_GLYPH[sign]}
    </div>
  );
}

/**
 * Glowing planet token: a soft `radial-gradient` orb (fades to transparent)
 * behind a small dark circle with a colored border and the planet glyph —
 * the glow recipe `DESIGN-SPEC.html` documents as the fix for the flat cards.
 */
function PlanetToken({
  orbLeft,
  orbTop,
  orbSize,
  orbGlow,
  tokenLeft,
  tokenTop,
  borderColor,
  glyph,
}: {
  orbLeft: number;
  orbTop: number;
  orbSize: number;
  orbGlow: string;
  tokenLeft: number;
  tokenTop: number;
  borderColor: string;
  glyph: string;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: orbLeft,
          top: orbTop,
          width: orbSize,
          height: orbSize,
          borderRadius: orbSize / 2,
          background: `radial-gradient(circle, ${orbGlow} 0%, ${PALETTE.goldGlowEdge} 68%)`,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: tokenLeft,
          top: tokenTop,
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          background: PALETTE.tokenDark,
          border: `1.6px solid ${borderColor}`,
          color: "#fff",
          fontSize: 16,
        }}
      >
        {glyph}
      </div>
    </>
  );
}

/**
 * Decorative wheel for the chart card: 12 uniform sign tiles + faint rings +
 * two decorative aspect-style lines (positions from `DESIGN-SPEC.html`,
 * never derived from real aspect data — `SingleSharePayload` has none), plus
 * a glowing planet token for each of Sun/Moon actually present on this
 * chart. Never renders a token for a placement the chart does not have.
 */
function ZodiacWheel({ bigThree }: { bigThree: OgBigThree }) {
  return (
    <>
      <svg width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <ellipse cx={920} cy={315} rx={248} ry={248} fill="none" stroke={PALETTE.ringStroke} strokeOpacity={0.08} />
        <ellipse cx={920} cy={315} rx={172} ry={172} fill="none" stroke={PALETTE.ringStroke} strokeOpacity={0.1} />
        <path d="M948 245 L880 468" fill="none" stroke={PALETTE.coral} strokeOpacity={0.55} strokeWidth={1.4} />
        <path d="M1000 305 L900 262 L880 468" fill="none" stroke={PALETTE.teal} strokeOpacity={0.45} strokeWidth={1.4} />
      </svg>

      {WHEEL_TILES.map((tile) => (
        <div key={tile.sign} style={{ display: "flex", position: "absolute", left: tile.left, top: tile.top }}>
          <SignTile sign={tile.sign} dim={40} radius={10} fontSize={20} glow={PALETTE.signTileGlow} />
        </div>
      ))}

      {bigThree.sun ? (
        <PlanetToken
          orbLeft={898}
          orbTop={185}
          orbSize={120}
          orbGlow={PALETTE.goldGlow}
          tokenLeft={931}
          tokenTop={218}
          borderColor={PALETTE.goldCoreBorder}
          glyph={BODY_GLYPH.sun}
        />
      ) : null}
      {bigThree.moon ? (
        <PlanetToken
          orbLeft={830}
          orbTop={408}
          orbSize={120}
          orbGlow={PALETTE.goldGlowSoft}
          tokenLeft={863}
          tokenTop={441}
          borderColor={PALETTE.goldCoreBorder}
          glyph={BODY_GLYPH.moon}
        />
      ) : null}

      {/* Axis labels are pure wheel-orientation decoration — neither names a
          sign nor a degree — but ASC only appears when a real ascendant
          exists, so the wheel never implies knowledge of a rising the chart
          does not have. */}
      {bigThree.rising ? (
        <div style={{ display: "flex", position: "absolute", left: 648, top: 308, color: PALETTE.goldLabel, fontSize: 15, letterSpacing: 1 }}>
          ASC
        </div>
      ) : null}
    </>
  );
}

type BigThreeRow = { key: "sun" | "moon" | "rising"; label: string; sign: Sign };

function bigThreeRows(bigThree: OgBigThree): BigThreeRow[] {
  const rows: BigThreeRow[] = [];
  if (bigThree.sun) rows.push({ key: "sun", label: "SUN", sign: bigThree.sun });
  if (bigThree.moon) rows.push({ key: "moon", label: "MOON", sign: bigThree.moon });
  if (bigThree.rising) rows.push({ key: "rising", label: "RISING", sign: bigThree.rising });
  return rows;
}

/** Chart card (kind: single). Left column of text; glowing wheel on the right. */
function SingleCard({ card }: { card: OgSingleCard }) {
  const rows = bigThreeRows(card.bigThree);
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: size.width,
        height: size.height,
        overflow: "hidden",
        borderRadius: 16,
        background: PALETTE.bg,
        fontFamily: "Inter",
      }}
    >
      <BloomBackground center="74% 50%" />
      <ZodiacWheel bigThree={card.bigThree} />

      <div style={{ display: "flex", position: "absolute", left: 80, top: 64, width: 520, flexDirection: "column" }}>
        <Wordmark fontSize={34} color={PALETTE.goldWordmark} />

        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginTop: 44 }}>
          <div style={{ display: "flex", width: 16, height: 2, background: PALETTE.goldEyebrow }} />
          <span style={{ fontFamily: "Inter", fontSize: 16, letterSpacing: 3, color: PALETTE.goldEyebrow, marginLeft: 10 }}>
            NATAL WHEEL
          </span>
        </div>

        <span style={{ fontFamily: "Fraunces", fontSize: 52, color: PALETTE.titleText, marginTop: 12 }}>
          {card.name ?? "A shared birth chart"}
        </span>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map((row, i) => (
            <div key={row.key} style={{ display: "flex", flexDirection: "row", alignItems: "center", marginTop: i === 0 ? 34 : 22 }}>
              <SignTile sign={row.sign} dim={46} radius={11} fontSize={22} glow={PALETTE.signTileGlowSoft} />
              <div style={{ display: "flex", flexDirection: "column", marginLeft: 16 }}>
                <span style={{ fontFamily: "Inter", fontSize: 13, letterSpacing: 2, color: PALETTE.labelMuted }}>{row.label}</span>
                <span style={{ fontFamily: "Fraunces", fontSize: 25, color: PALETTE.titleText }}>{row.sign}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const RELATION_LABEL: Record<RelationType, string> = {
  partners: "PARTNERS",
  siblings: "SIBLINGS",
  friends: "FRIENDS",
  "parent-child": "PARENT & CHILD",
  ancestor: "ANCESTOR",
  romantic: "COMPATIBILITY",
  platonic: "PLATONIC",
};

/** Small glowing avatar circle showing the person's first initial. */
function AvatarCircle({ initial, gradient, glow, textColor }: { initial: string; gradient: string; glow: string; textColor: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 64,
        height: 64,
        borderRadius: 32,
        background: gradient,
        boxShadow: `0 0 22px 2px ${glow}`,
      }}
    >
      <span style={{ fontFamily: "Fraunces", fontSize: 28, color: textColor }}>{initial}</span>
    </div>
  );
}

function PersonColumn({ name, bigThree, left }: { name: string; bigThree: OgBigThree; left: number }) {
  const rows = bigThreeRows(bigThree);
  return (
    <div style={{ display: "flex", position: "absolute", left, top: 392, width: 300, flexDirection: "column", alignItems: "center" }}>
      <span style={{ fontFamily: "Fraunces", fontSize: 30, color: PALETTE.titleText }}>{name}</span>
      <div style={{ display: "flex", flexDirection: "row", marginTop: 18 }}>
        {rows.map((row) => (
          <div key={row.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", marginLeft: 8, marginRight: 8 }}>
            <SignTile sign={row.sign} dim={50} radius={12} fontSize={23} glow={PALETTE.signTileGlowSoft} />
            <span style={{ fontFamily: "Inter", fontSize: 14, color: PALETTE.muted, marginTop: 8 }}>{row.sign}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Comparison card (kind: compare). Centered header + relationship summary + two glowing person columns. */
function CompareCard({ card }: { card: OgCompareCard }) {
  const isNeutral = card.summary.kind === "neutral";
  const initialOf = (name: string) => (name.trim().charAt(0) || "?").toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: size.width,
        height: size.height,
        overflow: "hidden",
        borderRadius: 16,
        background: PALETTE.bg,
        fontFamily: "Inter",
      }}
    >
      <BloomBackground center="50% 46%" />
      <svg width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <ellipse cx={600} cy={380} rx={200} ry={200} fill="none" stroke={PALETTE.ringStroke} strokeOpacity={0.05} />
      </svg>

      <div style={{ display: "flex", position: "absolute", left: 0, top: 40, width: size.width, justifyContent: "center" }}>
        <Wordmark fontSize={28} color={PALETTE.goldWordmark} />
      </div>

      <div style={{ display: "flex", position: "absolute", left: 0, top: 82, width: size.width, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        <AvatarCircle
          initial={initialOf(card.personA.name)}
          gradient="radial-gradient(circle at 50% 40%, #f0a878 0%, #c96a44 100%)"
          glow="rgba(201,106,68,0.5)"
          textColor="#3a1a10"
        />
        <span style={{ fontFamily: "Inter", fontSize: 23, color: "#8a7fb0", marginLeft: 20, marginRight: 20 }}>&#215;</span>
        <AvatarCircle
          initial={initialOf(card.personB.name)}
          gradient="radial-gradient(circle at 50% 40%, #e8a8c4 0%, #b8688e 100%)"
          glow="rgba(184,104,142,0.5)"
          textColor="#3a1020"
        />
      </div>

      <div style={{ display: "flex", position: "absolute", left: 0, top: 196, width: size.width, justifyContent: "center" }}>
        <span style={{ fontFamily: "Fraunces", fontSize: 42, color: PALETTE.titleText }}>
          {card.personA.name} &amp; {card.personB.name}
        </span>
      </div>

      {!isNeutral ? (
        <>
          <div style={{ display: "flex", position: "absolute", left: 0, top: 250, width: size.width, justifyContent: "center" }}>
            <span style={{ fontFamily: "Inter", fontSize: 17, letterSpacing: 2, color: PALETTE.muted }}>
              {RELATION_LABEL[card.relationType]}
            </span>
          </div>
          <div style={{ display: "flex", position: "absolute", left: 196, top: 288, width: 4, height: 70, background: PALETTE.goldLabel }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              left: 220,
              top: 296,
              width: 800,
              fontFamily: "Fraunces",
              fontStyle: "italic",
              fontSize: 21,
              lineHeight: 1.35,
              color: "#cabce4",
            }}
          >
            <span>{card.summary.text}</span>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", position: "absolute", left: 200, top: 302, width: 800, justifyContent: "center" }}>
          <span style={{ fontFamily: "Fraunces", fontStyle: "italic", fontSize: 21, color: "#cabce4", textAlign: "center" }}>
            {card.summary.text}
          </span>
        </div>
      )}

      <PersonColumn name={card.personA.name} bigThree={card.personA.bigThree} left={150} />
      <PersonColumn name={card.personB.name} bigThree={card.personB.bigThree} left={750} />

      <div style={{ display: "flex", position: "absolute", left: 0, top: 558, width: size.width, justifyContent: "center" }}>
        <span style={{ fontFamily: "Inter", fontSize: 18, color: PALETTE.muted2 }}>see how their charts meet on Galaxia</span>
      </div>
    </div>
  );
}

function FallbackCard() {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: size.width,
        height: size.height,
        overflow: "hidden",
        borderRadius: 16,
        background: PALETTE.bg,
        fontFamily: "Inter",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BloomBackground center="50% 50%" />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Wordmark fontSize={30} color={PALETTE.goldWordmark} />
        <span style={{ fontFamily: "Fraunces", fontSize: 30, color: PALETTE.titleText, marginTop: 26 }}>
          This shared reading isn&apos;t available
        </span>
        <span style={{ fontFamily: "Inter", fontSize: 16, color: PALETTE.muted, marginTop: 10 }}>
          The link may be mistyped or no longer exists.
        </span>
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const snapshot = await getQuickShareByToken(token);

  // A failed font read (e.g. a deployment missing one of the .ttf files)
  // degrades to Satori's built-in fallback font rather than 500ing this
  // route — a link that unfurls with slightly-off typography beats one that
  // never unfurls at all. Stays `undefined` (not `[]`) on failure: `next/og`
  // only swaps in its own default font when `fonts` is falsy — an empty
  // array is passed through as "zero fonts" and Satori throws ("At least
  // one font is required to calculate the layout").
  let fonts: OgFont[] | undefined;
  try {
    fonts = await loadOgFonts();
  } catch (error) {
    console.error("s/[token]/opengraph-image: font load failed, rendering without custom fonts", error);
  }

  if (!snapshot) {
    return new ImageResponse(<FallbackCard />, { ...size, fonts });
  }

  if (snapshot.kind === "single") {
    const card = buildOgSingleCard(snapshot.payload as SingleSharePayload);
    return new ImageResponse(<SingleCard card={card} />, { ...size, fonts });
  }

  const card = buildOgCompareCard(snapshot.payload as CompareSharePayload, RELATION_HEADLINE);
  return new ImageResponse(<CompareCard card={card} />, { ...size, fonts });
}
