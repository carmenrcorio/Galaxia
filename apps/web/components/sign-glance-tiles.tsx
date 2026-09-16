import type { NatalChart } from "@galaxia/astro";
import { BODY_GLYPH, SIGN_GLYPH } from "../lib/design";

/**
 * Horizontal Sun / Moon / Rising glance tiles that sit directly under the
 * natal wheel. Data is the same placements the wheel already uses: confident
 * sun/moon signs and `chart.asc` for Rising. An uncertain or missing
 * placement is omitted, never fabricated.
 *
 * Moon uses the crescent body glyph; Sun and Rising use a purple zodiac-sign
 * badge. Labels render as SUN / MOON / RISING.
 */
export type SignGlanceTilesProps = {
  chart: NatalChart;
};

type GlanceKey = "sun" | "moon" | "rising";

function confidentSign(chart: NatalChart, body: "sun" | "moon"): string | undefined {
  const placement = chart.placements.find((p) => p.body === body);
  return placement && placement.confident !== false ? placement.sign : undefined;
}

export function signGlanceRows(chart: NatalChart): { key: GlanceKey; label: string; sign: string }[] {
  const rows: { key: GlanceKey; label: string; sign: string }[] = [];
  const sun = confidentSign(chart, "sun");
  const moon = confidentSign(chart, "moon");
  const rising = chart.asc;
  if (sun) rows.push({ key: "sun", label: "SUN", sign: sun });
  if (moon) rows.push({ key: "moon", label: "MOON", sign: moon });
  if (rising) rows.push({ key: "rising", label: "RISING", sign: rising });
  return rows;
}

const STAR_SCATTER =
  "radial-gradient(1px 1px at 14% 22%, rgba(255,255,255,.38), transparent)," +
  "radial-gradient(1.2px 1.2px at 78% 16%, rgba(212,168,85,.42), transparent)," +
  "radial-gradient(1px 1px at 86% 74%, rgba(255,255,255,.28), transparent)," +
  "radial-gradient(1px 1px at 22% 82%, rgba(124,95,219,.45), transparent)," +
  "radial-gradient(1px 1px at 52% 12%, rgba(255,255,255,.22), transparent)";

export function SignGlanceTiles({ chart }: SignGlanceTilesProps) {
  const rows = signGlanceRows(chart);
  if (rows.length === 0) return null;

  return (
    <div
      data-testid="sign-glance-tiles"
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 12,
        flexWrap: "wrap",
        marginTop: 16,
      }}
    >
      {rows.map((row) => {
        const isMoon = row.key === "moon";
        const glyph = isMoon ? BODY_GLYPH.moon : SIGN_GLYPH[row.sign];
        return (
          <div
            key={row.key}
            data-testid={`sign-glance-tile-${row.key}`}
            aria-label={`${row.label} ${row.sign}`}
            style={{
              flex: "1 1 96px",
              maxWidth: 140,
              minWidth: 88,
              padding: "14px 10px 12px",
              borderRadius: 12,
              textAlign: "center",
              backgroundColor: "rgba(8,8,28,.78)",
              backgroundImage: STAR_SCATTER,
              border: "1px solid rgba(183,154,216,.16)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isMoon ? (
              <span
                aria-hidden
                style={{
                  fontSize: "1.35rem",
                  lineHeight: 1,
                  color: "var(--cream)",
                  display: "block",
                  padding: "6px 0",
                }}
              >
                {glyph}
              </span>
            ) : (
              <span
                aria-hidden
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#5a3f8f",
                  color: "#e6dcff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.05rem",
                  lineHeight: 1,
                }}
              >
                {glyph}
              </span>
            )}
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--mist2)",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                fontWeight: 600,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontFamily: "var(--serif)",
                fontSize: "1.05rem",
                color: "var(--cream)",
                fontWeight: 700,
                lineHeight: 1.15,
              }}
            >
              {row.sign}
            </span>
          </div>
        );
      })}
    </div>
  );
}
