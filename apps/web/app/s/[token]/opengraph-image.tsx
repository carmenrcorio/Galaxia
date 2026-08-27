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
 * Satori (the renderer behind `next/og`) cannot use `next/font/google`, so
 * fonts are raw `.ttf` files read once at module scope (see
 * `opengraph-image/fonts/NOTICE.md`) — never inside the request handler.
 * `ZodiacGlyphs-Regular.ttf` covers exactly the 22 codepoints
 * `SIGN_GLYPH`/`BODY_GLYPH` use; satori substitutes glyphs from any loaded
 * font that has them, regardless of which font a span's `fontFamily`
 * names, so no per-span override is needed for the zodiac/planet symbols.
 */

import { RELATION_HEADLINE, type RelationType, type Sign } from "@galaxia/astro";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
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

const [frauncesRegular, frauncesDisplay, interRegular, interSemiBold, zodiacGlyphs] = await Promise.all([
  readFile(join(FONT_DIR, "Fraunces-Regular.ttf")),
  readFile(join(FONT_DIR, "Fraunces-SemiBold.ttf")),
  readFile(join(FONT_DIR, "Inter-Regular.ttf")),
  readFile(join(FONT_DIR, "Inter-SemiBold.ttf")),
  readFile(join(FONT_DIR, "ZodiacGlyphs-Regular.ttf")),
]);

const OG_FONTS = [
  { name: "Fraunces", data: frauncesRegular, weight: 400 as const, style: "normal" as const },
  { name: "Fraunces", data: frauncesDisplay, weight: 600 as const, style: "normal" as const },
  { name: "Inter", data: interRegular, weight: 400 as const, style: "normal" as const },
  { name: "Inter", data: interSemiBold, weight: 600 as const, style: "normal" as const },
  // Never matched by name — present purely so satori's cross-font glyph
  // fallback can find the zodiac/planet codepoints Fraunces/Inter lack.
  { name: "Zodiac Glyphs", data: zodiacGlyphs, weight: 400 as const, style: "normal" as const },
];

// Deep purple-black / gold / teal-coral-lavender palette, from
// apps/web/app/globals.css `:root`. Hardcoded hex — satori does not resolve
// CSS custom properties (`var(...)`), so this is the one place those tokens
// are duplicated as literal values, deliberately kept next to their source.
const PALETTE = {
  ink: "#0a0717",
  ink2: "#16102e",
  ink3: "#1d1640",
  gold: "#E6AE6C",
  goldBright: "#f0c089",
  teal: "#6FB1B8",
  mist: "#b9aede",
  mist2: "#8076a6",
  cream: "#F4ECDB",
  fire: "#E0825C",
  earth: "#cdbd7a",
  air: "#B79AD8",
  water: "#6FB1B8",
} as const;

const WHEEL_SIGNS: readonly Sign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function elementOf(sign: Sign): "fire" | "earth" | "air" | "water" {
  if (sign === "Aries" || sign === "Leo" || sign === "Sagittarius") return "fire";
  if (sign === "Taurus" || sign === "Virgo" || sign === "Capricorn") return "earth";
  if (sign === "Gemini" || sign === "Libra" || sign === "Aquarius") return "air";
  return "water";
}

function elementColor(sign?: Sign): string {
  return sign ? PALETTE[elementOf(sign)] : PALETTE.mist2;
}

function BrandMark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(150deg, ${PALETTE.goldBright}, ${PALETTE.gold})`,
          color: "#1a1206",
          fontFamily: "Fraunces",
          fontWeight: 600,
          fontSize: 18,
        }}
      >
        G
      </div>
      <span style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 20, color: PALETTE.cream, letterSpacing: -0.4 }}>
        Galaxia
      </span>
    </div>
  );
}

/** Decorative ring of the 12 signs; up to 3 wedges glow when they hold Sun/Moon/Rising. */
function ZodiacWheel({ bigThree }: { bigThree: OgBigThree }) {
  const size_ = 460;
  const center = size_ / 2;
  const radius = 188;
  const slot = 58;
  const activeSigns = new Set([bigThree.sun, bigThree.moon, bigThree.rising].filter(Boolean) as Sign[]);

  return (
    <div style={{ display: "flex", position: "relative", width: size_, height: size_, flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: size_ / 2,
          background: `radial-gradient(120% 120% at 50% 30%, ${PALETTE.ink3}, ${PALETTE.ink})`,
          border: `1px solid rgba(230,174,108,.22)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: center - radius + slot / 2 - 74,
          top: center - radius + slot / 2 - 74,
          width: (radius - slot / 2 + 74) * 2,
          height: (radius - slot / 2 + 74) * 2,
          borderRadius: "50%",
          border: "1px solid rgba(230,174,108,.14)",
        }}
      />
      {WHEEL_SIGNS.map((sign, i) => {
        const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
        const left = center + radius * Math.cos(angle) - slot / 2;
        const top = center + radius * Math.sin(angle) - slot / 2;
        const active = activeSigns.has(sign);
        const color = active ? elementColor(sign) : PALETTE.mist2;
        return (
          <div
            key={sign}
            style={{
              position: "absolute",
              left,
              top,
              width: slot,
              height: slot,
              borderRadius: slot / 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: active ? 28 : 20,
              color,
              background: active ? `rgba(255,255,255,.08)` : "transparent",
              border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,.06)",
            }}
          >
            {SIGN_GLYPH[sign]}
          </div>
        );
      })}
    </div>
  );
}

type BigThreeRow = { key: "sun" | "moon" | "rising"; label: string; glyph: string; sign?: Sign };

function bigThreeRows(bigThree: OgBigThree): BigThreeRow[] {
  const rows: BigThreeRow[] = [];
  if (bigThree.sun) rows.push({ key: "sun", label: "Sun", glyph: BODY_GLYPH.sun, sign: bigThree.sun });
  if (bigThree.moon) rows.push({ key: "moon", label: "Moon", glyph: BODY_GLYPH.moon, sign: bigThree.moon });
  if (bigThree.rising) rows.push({ key: "rising", label: "Rising", glyph: "", sign: bigThree.rising });
  return rows;
}

function BigThreeChip({ row, compact }: { row: BigThreeRow; compact?: boolean }) {
  if (!row.sign) return null;
  const color = elementColor(row.sign);
  const dia = compact ? 40 : 52;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 14 }}>
      <div
        style={{
          width: dia,
          height: dia,
          borderRadius: dia / 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: compact ? 20 : 26,
          color,
          background: "rgba(255,255,255,.06)",
          border: `1px solid ${color}`,
        }}
      >
        {SIGN_GLYPH[row.sign]}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: compact ? 11 : 13,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: PALETTE.mist2,
          }}
        >
          {row.glyph ? `${row.glyph} ${row.label}` : row.label}
        </span>
        <span
          style={{
            fontFamily: "Fraunces",
            fontWeight: 600,
            fontSize: compact ? 17 : 22,
            color: PALETTE.cream,
          }}
        >
          {row.sign}
        </span>
      </div>
    </div>
  );
}

function CardShell({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "48px 64px",
        background: `linear-gradient(165deg, ${PALETTE.ink2}, ${PALETTE.ink})`,
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BrandMark />
        <span
          style={{
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: PALETTE.gold,
          }}
        >
          {eyebrow}
        </span>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center" }}>{children}</div>
    </div>
  );
}

function SingleCardBody({ card }: { card: OgSingleCard }) {
  const rows = bigThreeRows(card.bigThree);
  return (
    <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 56 }}>
      <ZodiacWheel bigThree={card.bigThree} />
      <div style={{ display: "flex", flexDirection: "column", gap: 22, flex: 1 }}>
        <span style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 40, color: PALETTE.cream, lineHeight: 1.1 }}>
          {card.name ?? "A shared birth chart"}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {rows.map((row) => <BigThreeChip key={row.key} row={row} />)}
        </div>
      </div>
    </div>
  );
}

function CompareCardBody({ card }: { card: OgCompareCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40 }}>
        <PersonPanel name={card.personA.name} bigThree={card.personA.bigThree} />
        <span style={{ fontFamily: "Fraunces", fontStyle: "italic", fontSize: 30, color: PALETTE.gold }}>&amp;</span>
        <PersonPanel name={card.personB.name} bigThree={card.personB.bigThree} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "20px 26px",
          borderRadius: 18,
          background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(230,174,108,.16)",
        }}
      >
        <span
          style={{
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: PALETTE.gold,
          }}
        >
          {relationLabel(card.relationType)}
        </span>
        <span style={{ fontFamily: "Fraunces", fontSize: 19, color: PALETTE.mist, lineHeight: 1.4, maxWidth: 980 }}>
          {card.summary.text}
        </span>
      </div>
    </div>
  );
}

function PersonPanel({ name, bigThree }: { name: string; bigThree: OgBigThree }) {
  const rows = bigThreeRows(bigThree);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
      <span style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 26, color: PALETTE.cream }}>{name}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row) => <BigThreeChip key={row.key} row={row} compact />)}
      </div>
    </div>
  );
}

const RELATION_LABEL: Record<RelationType, string> = {
  partners: "Partners",
  siblings: "Siblings",
  friends: "Friends",
  "parent-child": "Parent & Child",
  ancestor: "Ancestor",
  romantic: "Compatibility",
  platonic: "Platonic",
};

function relationLabel(relationType: RelationType): string {
  return RELATION_LABEL[relationType] ?? "Compatibility";
}

function FallbackCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        background: `linear-gradient(165deg, ${PALETTE.ink2}, ${PALETTE.ink})`,
        fontFamily: "Inter",
      }}
    >
      <BrandMark />
      <span style={{ fontFamily: "Fraunces", fontWeight: 600, fontSize: 30, color: PALETTE.cream }}>
        This shared reading isn&apos;t available
      </span>
      <span style={{ fontFamily: "Inter", fontSize: 16, color: PALETTE.mist }}>
        The link may be mistyped or no longer exists.
      </span>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const snapshot = await getQuickShareByToken(token);

  if (!snapshot) {
    return new ImageResponse(<FallbackCard />, { ...size, fonts: OG_FONTS });
  }

  if (snapshot.kind === "single") {
    const card = buildOgSingleCard(snapshot.payload as SingleSharePayload);
    return new ImageResponse(
      <CardShell eyebrow="Shared Chart">
        <SingleCardBody card={card} />
      </CardShell>,
      { ...size, fonts: OG_FONTS }
    );
  }

  const card = buildOgCompareCard(snapshot.payload as CompareSharePayload, RELATION_HEADLINE);
  return new ImageResponse(
    <CardShell eyebrow="Shared Compatibility">
      <CompareCardBody card={card} />
    </CardShell>,
    { ...size, fonts: OG_FONTS }
  );
}
