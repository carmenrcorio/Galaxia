"use client";

/**
 * Generational map — a horizontal band chart, one row per outer planet
 * (Uranus, Neptune, Pluto), with every member placed as a labeled avatar at
 * their sign position. Members sharing a sign cluster into the same slot;
 * members in different signs land in different slots — the visual proof of
 * what the Fault Lines section narrates below it.
 *
 * Avatar dots reuse InitialAvatar exactly as-is (per spec) so a person's dot
 * matches their avatar color everywhere else in the app. Each member's sign
 * per planet is reconstructed from the already-computed `overlay` (see
 * `memberSignsFromOverlay`) rather than needing a second per-person lookup —
 * so this reads the identical facts the Fault Lines / Shared Sky sections do.
 */

import { InitialAvatar } from "../initial-avatar";
import { GlossaryPlanet, GlossarySign } from "../glossary-term";
import { BODY_GLYPH, SIGN_GLYPH } from "../../lib/design";
import {
  GENERATIONAL_MAP_FRAMING,
  generationalMapSummary,
  memberSignsFromOverlay,
  type CohortOverlayLike,
  type GenPlanetKey,
} from "../../lib/groups-copy";

const ZODIAC_ORDER = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const GEN_ROWS: Array<{ planet: GenPlanetKey; label: string }> = [
  { planet: "uranus", label: "Uranus" },
  { planet: "neptune", label: "Neptune" },
  { planet: "pluto", label: "Pluto" },
];

interface GenerationalMapProps {
  memberNames: string[];
  overlay: CohortOverlayLike;
}

// FOUNDER-REVIEW: empty because the map needs two members to place.
export const GENERATIONAL_MAP_EMPTY =
  "The generational map needs two people. Add another member to see where the slow planets land.";

export function GenerationalMap({ memberNames, overlay }: GenerationalMapProps) {
  if (memberNames.length < 2) {
    return (
      <section className="glass-card fade-in">
        <p className="eyebrow" style={{ marginBottom: 8 }}>Generational map</p>
        <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, margin: 0 }}>
          {GENERATIONAL_MAP_EMPTY}
        </p>
      </section>
    );
  }
  const summary = generationalMapSummary(memberNames, overlay);
  const signsByMember = memberSignsFromOverlay(memberNames, overlay);

  return (
    <section className="glass-card fade-in">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Generational map</p>
      <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6, margin: "0 0 14px" }}>
        {GENERATIONAL_MAP_FRAMING}
      </p>
      <ul className="gen-map-legend">
        {memberNames.map((name) => (
          <li key={name} className="gen-map-legend__item">
            <InitialAvatar name={name} size="sm" />
            <span>{name}</span>
          </li>
        ))}
      </ul>
      <div className="gen-map-scroll">
        <div className="gen-map">
          {GEN_ROWS.map((row) => {
            const bySign = new Map<string, string[]>();
            for (const name of memberNames) {
              const sign = signsByMember.get(name)?.[row.planet];
              if (!sign) continue;
              const arr = bySign.get(sign);
              if (arr) arr.push(name); else bySign.set(sign, [name]);
            }
            return (
              <div className="gen-map-row" key={row.planet}>
                <div className="gen-map-row__label">
                  <span className="gen-map-row__glyph" aria-hidden="true">{BODY_GLYPH[row.planet]}</span>
                  <GlossaryPlanet planet={row.planet}>{row.label}</GlossaryPlanet>
                </div>
                <div className="gen-map-track">
                  {ZODIAC_ORDER.map((sign) => {
                    const occupants = bySign.get(sign);
                    return (
                      <div
                        key={sign}
                        className={`gen-map-slot${occupants ? " gen-map-slot--occupied" : ""}`}
                        title={occupants ? `${occupants.join(", ")} · ${row.label} in ${sign}` : `${row.label} in ${sign}`}
                      >
                        {occupants ? (
                          <div className="gen-map-slot__dots">
                            {occupants.map((name) => (
                              <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                <InitialAvatar name={name} size="sm" />
                                <span style={{ fontSize: ".58rem", color: "var(--mist2)", maxWidth: 44, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className="gen-map-slot__caption">
                          <span className="gen-map-slot__sign" aria-hidden="true">{SIGN_GLYPH[sign]}</span>
                          <span className="gen-map-slot__sign-name">
                            <GlossarySign sign={sign}>{sign}</GlossarySign>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {summary ? (
        <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6, marginTop: 16, marginBottom: 0 }}>
          {summary}
        </p>
      ) : null}
    </section>
  );
}
