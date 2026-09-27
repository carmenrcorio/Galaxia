/**
 * Every in-window transit hit for the weekly bodies. Same honesty rules as
 * the slow-body scanner: no year-only charts, no unconfident placements,
 * no Node or Chiron targets, date-only births only when the hit survives
 * the whole-day smear.
 */

import {
  aspectDefinition,
  eclipticLongitude,
  signedAngleDelta,
  type AspectType,
  type BodyName,
} from "../index";
import {
  dateSignNatalTargetAllowed,
  exactnessWindowDeg,
  findExactAt,
  natalDaySmearDeg,
  precisionModeFromChart,
  withinExactnessWindow,
} from "../transit-nudge";
import { WEEKLY_TRANSIT_BODIES } from "./constants";
import type { SharedTransitHit, SharedTransitPersonInput } from "./types";

const MS_PER_DAY = 86_400_000;
const ASPECTS: readonly AspectType[] = ["conjunction", "sextile", "square", "trine", "opposition"];

export function collectSharedTransitHits(
  people: readonly SharedTransitPersonInput[],
  whenUTC: string,
  bodies: readonly BodyName[] = WEEKLY_TRANSIT_BODIES
): SharedTransitHit[] {
  const when = new Date(whenUTC);
  if (Number.isNaN(when.getTime())) return [];

  const speedByBody = new Map<BodyName, number>();
  const lonByBody = new Map<BodyName, number>();
  const speedOf = (body: BodyName): number => {
    const cached = speedByBody.get(body);
    if (cached !== undefined) return cached;
    const lon0 = lonByBody.get(body) ?? eclipticLongitude(body, when);
    lonByBody.set(body, lon0);
    const lon1 = eclipticLongitude(body, new Date(when.getTime() + MS_PER_DAY));
    const speed = signedAngleDelta(lon0, lon1);
    speedByBody.set(body, speed);
    return speed;
  };

  const hits: SharedTransitHit[] = [];
  for (const transitBody of bodies) {
    const transitLon = eclipticLongitude(transitBody, when);
    lonByBody.set(transitBody, transitLon);
    const speed = speedOf(transitBody);

    for (const aspect of ASPECTS) {
      const def = aspectDefinition(aspect);
      const window = exactnessWindowDeg(transitBody);
      for (const person of people) {
        const mode = precisionModeFromChart(person.chart, person.birthPrecision);
        if (mode === "year_blocked" || mode === "none") continue;

        for (const natal of person.chart.placements) {
          if (natal.body === "north_node" || natal.body === "chiron") continue;
          if (natal.confident === false) continue;
          const angle = Math.abs(signedAngleDelta(transitLon, natal.lon));
          const orb = Math.abs(angle - def.angle);
          if (orb > def.orb) continue;
          if (!withinExactnessWindow(transitBody, orb)) continue;
          if (mode === "date_sign") {
            if (!person.birthDate) continue;
            const smear = natalDaySmearDeg(natal.body, person.birthDate);
            if (!dateSignNatalTargetAllowed(natal.body, orb, window, smear)) continue;
          }

          const exactAt = findExactAt(transitBody, natal.lon, aspect, when);
          const house = typeof natal.house === "number" && natal.house >= 1 && natal.house <= 12 ? natal.house : undefined;
          hits.push({
            transiting: transitBody,
            aspect,
            personId: person.id,
            personName: person.name,
            natalPoint: natal.body,
            natalSign: natal.sign,
            natalLon: natal.lon,
            natalHouse: house,
            orb: Number(orb.toFixed(3)),
            applying: exactAt.getTime() >= when.getTime(),
            exactAt: exactAt.toISOString(),
            transitingSpeed: speed,
          });
        }
      }
    }
  }
  return hits;
}
