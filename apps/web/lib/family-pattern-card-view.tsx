/**
 * Satori markup for the 1080 family/group pattern card.
 *
 * Literal hex, `display: flex` on every multi-child div, no CSS variables,
 * no `filter`/blur (Satori ignores both). Fonts are the bundled Fraunces
 * + DM Sans files loaded by the route, never Google Fonts at render time.
 */

import type { FamilyPatternCardRenderInput } from "./family-pattern-card";
import { FAMILY_PATTERN_CARD_EYEBROW, FAMILY_PATTERN_CARD_SIZE, FAMILY_PATTERN_CARD_WATERMARK } from "./family-pattern-card";

export const FAMILY_PATTERN_CARD_PALETTE = {
  bg: "#0a0717",
  bloomCenter: "rgba(90,63,143,0.55)",
  bloomMid: "rgba(44,35,82,0.34)",
  bloomEdge: "rgba(10,7,23,0)",
  gold: "#E6AE6C",
  goldBright: "#f0c089",
  goldSoft: "rgba(230,174,108,0.55)",
  cream: "#F4ECDB",
  mist: "#b9aede",
} as const;

function headlineFontSize(headline: string): number {
  if (headline.length > 48) return 40;
  if (headline.length > 28) return 50;
  return 62;
}

function interpretationFontSize(line: string): number {
  return line.length > 140 ? 26 : 28;
}

export function FamilyPatternCardImage({ card }: { card: FamilyPatternCardRenderInput }) {
  const { width, height } = FAMILY_PATTERN_CARD_SIZE;
  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        background: FAMILY_PATTERN_CARD_PALETTE.bg,
        position: "relative",
        overflow: "hidden",
        fontFamily: "DM Sans",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          background: `radial-gradient(circle at 50% 28%, ${FAMILY_PATTERN_CARD_PALETTE.bloomCenter} 0%, ${FAMILY_PATTERN_CARD_PALETTE.bloomMid} 42%, ${FAMILY_PATTERN_CARD_PALETTE.bloomEdge} 78%)`,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          flexDirection: "column",
          alignItems: "center",
          padding: "96px 80px 88px",
        }}
      >
        <span
          style={{
            fontFamily: "DM Sans",
            fontSize: 20,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: FAMILY_PATTERN_CARD_PALETTE.gold,
          }}
        >
          {FAMILY_PATTERN_CARD_EYEBROW}
        </span>
        <span
          style={{
            fontFamily: "Fraunces",
            fontWeight: 600,
            fontSize: headlineFontSize(card.headline),
            color: FAMILY_PATTERN_CARD_PALETTE.cream,
            textAlign: "center",
            lineHeight: 1.2,
            marginTop: 36,
            maxWidth: 900,
          }}
        >
          {card.headline}
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 44,
            maxWidth: 900,
          }}
        >
          {card.people.map((person, index) => (
            <div
              key={`${person.firstName}-${index}`}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                marginLeft: 14,
                marginRight: 14,
                marginTop: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "Fraunces",
                  fontSize: 32,
                  color: FAMILY_PATTERN_CARD_PALETTE.goldBright,
                }}
              >
                {person.firstName}
              </span>
              {person.memorial ? (
                <div
                  style={{
                    display: "flex",
                    width: 10,
                    height: 10,
                    marginLeft: 10,
                    background: FAMILY_PATTERN_CARD_PALETTE.gold,
                    transform: "rotate(45deg)",
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
        <span
          style={{
            fontFamily: "DM Sans",
            fontSize: interpretationFontSize(card.interpretation),
            color: FAMILY_PATTERN_CARD_PALETTE.mist,
            textAlign: "center",
            lineHeight: 1.45,
            marginTop: 48,
            maxWidth: 860,
          }}
        >
          {card.interpretation}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: 42,
          left: 0,
          width,
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "DM Sans",
            fontSize: 20,
            letterSpacing: 2,
            color: FAMILY_PATTERN_CARD_PALETTE.goldSoft,
          }}
        >
          {FAMILY_PATTERN_CARD_WATERMARK}
        </span>
      </div>
    </div>
  );
}
