import { bodyDisplayName, bodyDomain, type BodyKey } from "@galaxia/astro";
import {
  OVERLAY_ASPECTS_MISSING_NOTE,
  YEAR_ASPECTS_NEED_DATE_NOTE,
  layoutChartWheel,
  planetTooltipContent,
  planetTooltipSummary,
  type WheelAspect,
  type WheelChartLike,
  type WheelChartOwner,
  type WheelColorToken,
  type WheelPlanetGlyph,
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import {
  dismissWheelExploreHint,
  readWheelExploreHintDismissed,
} from "../lib/chart-affordance-hints";
import { fonts } from "../lib/typography";
import { WheelPlanetSheet } from "./wheel-planet-sheet";

export type { WheelAspect };

export type ChartWheelProps = {
  chart: WheelChartLike;
  overlayChart?: WheelChartLike;
  aspects?: WheelAspect[];
  interactive?: boolean;
  /**
   * Opt in to the planet glyph detail sheet (natal wheels only; the Compare
   * bi-wheel is too dense for per-planet sheets). Both fields are required:
   * `minorSafe` so the Venus domain line can never render adult copy on a
   * child's chart (ENGINEERING.md §9), and `onSeeFullReading` so the sheet's
   * button always has a real placement to scroll to.
   */
  planetTooltips?: {
    minorSafe: boolean;
    onSeeFullReading: (body: string) => void;
  };
};

function wheelColor(token: WheelColorToken): string {
  return tokens.colors[token];
}

export function ChartWheel({ chart, overlayChart, aspects, interactive = true, planetTooltips }: ChartWheelProps) {
  const layout = layoutChartWheel({ chart, overlayChart, aspects });
  const overlayWarnOnce = useRef(false);
  const [focus, setFocus] = useState<{ owner: WheelChartOwner; body: string } | null>(null);
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [exploreHint, setExploreHint] = useState(false);

  // Natal only: the bi-wheel packs two rings of glyphs into the same space,
  // where a sheet would speak for whichever chart the reader did not tap.
  const tooltipsOn = interactive && !layout.isOverlay && planetTooltips != null;

  useEffect(() => {
    if (!tooltipsOn) {
      setExploreHint(false);
      return;
    }
    void readWheelExploreHintDismissed().then((dismissed) => setExploreHint(!dismissed));
  }, [tooltipsOn]);

  function noteWheelExplored() {
    if (!exploreHint) return;
    void dismissWheelExploreHint();
    setExploreHint(false);
  }

  function tooltipFor(planet: WheelPlanetGlyph) {
    if (!planetTooltips) return null;
    return planetTooltipContent({
      name: bodyDisplayName(planet.body),
      domain: bodyDomain(planet.body.toLowerCase() as BodyKey, { minorSafe: planetTooltips.minorSafe }),
      sign: planet.sign,
      degree: planet.degree,
      house: planet.house,
      retro: planet.retro,
      hasHouses: layout.hasHouses,
    });
  }

  const sheetPlanet = sheetKey ? layout.planets.find((p) => p.key === sheetKey) ?? null : null;

  if (layout.overlayMissingAspects && !overlayWarnOnce.current) {
    overlayWarnOnce.current = true;
    console.warn(
      "[ChartWheel] overlayChart was mounted without aspects: synastry lines will not draw. Pass the already-computed Compare aspects."
    );
  }

  function lineDimmed(from: string, to: string): boolean {
    if (!interactive || !focus) return false;
    if (layout.isOverlay) {
      if (focus.owner === "a") return focus.body !== from;
      return focus.body !== to;
    }
    return focus.body !== from && focus.body !== to;
  }

  function onPlanetPress(owner: WheelChartOwner, body: string, key: string) {
    if (!interactive) return;
    noteWheelExplored();
    const sameGlyph = focus != null && focus.owner === owner && focus.body === body;
    setFocus(sameGlyph ? null : { owner, body });
    if (!tooltipsOn) return;
    setSheetKey(sameGlyph ? null : key);
  }

  return (
    <View style={{ width: "100%", maxWidth: 306, alignSelf: "center", paddingHorizontal: 8 }}>
      {exploreHint ? (
        <Text
          style={{
            color: tokens.colors.mist,
            fontSize: 14,
            textAlign: "center",
            marginBottom: 10,
            lineHeight: 20,
            fontFamily: fonts.inter,
          }}
        >
          {/* FOUNDER-REVIEW: Tap a star to explore */}
          Tap a star to explore
        </Text>
      ) : null}
      <View style={{ width: "100%", aspectRatio: 1 }}>
      <Svg
        viewBox={`0 0 ${layout.size} ${layout.size}`}
        width="100%"
        height="100%"
        accessibilityLabel="Chart wheel"
      >
        <Circle cx={layout.cx} cy={layout.cy} r={layout.rOut} fill="none" stroke={layout.lineColor} strokeWidth={1} />
        <Circle cx={layout.cx} cy={layout.cy} r={layout.rSignIn} fill="none" stroke={layout.lineColor} strokeWidth={1} />
        <Circle
          cx={layout.cx}
          cy={layout.cy}
          r={layout.rInner}
          fill={layout.innerFill}
          stroke={layout.lineColor}
          strokeWidth={1}
        />
        {layout.aspectLines.map((al, i) => {
          const dim = lineDimmed(al.from, al.to);
          return (
            <Line
              key={`asp-${al.from}-${al.to}-${i}`}
              x1={al.x0}
              y1={al.y0}
              x2={al.x1}
              y2={al.y1}
              stroke={wheelColor(al.strokeToken)}
              strokeWidth={dim ? 1 : 2}
              strokeOpacity={dim ? Math.min(0.1, al.alpha * 0.18) : al.alpha}
            />
          );
        })}
        {layout.signs.map((slice) => (
          <G key={slice.sign}>
            <Path d={slice.pathD} fill={wheelColor(slice.fillToken)} fillOpacity={0.18} />
            <Line
              x1={slice.x0}
              y1={slice.y0}
              x2={slice.xi0}
              y2={slice.yi0}
              stroke={layout.lineColor}
              strokeWidth={1}
            />
            <SvgText
              x={slice.gx}
              y={slice.gy}
              fill={wheelColor("cream")}
              fontSize={13}
              fontFamily={fonts.zodiac}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {slice.glyph}
            </SvgText>
          </G>
        ))}
        {layout.hasHouses && layout.ascLabel ? (
          <>
            <SvgText
              x={layout.ascLabel.x}
              y={layout.ascLabel.y}
              fill={wheelColor("gold")}
              fontSize={8}
              fontFamily={fonts.interSemi}
              textAnchor={layout.ascLabel.anchor}
              alignmentBaseline="middle"
            >
              ASC
            </SvgText>
            {layout.mcLabel ? (
              <SvgText
                x={layout.mcLabel.x}
                y={layout.mcLabel.y}
                fill={wheelColor("gold")}
                fontSize={8}
                fontFamily={fonts.interSemi}
                textAnchor={layout.mcLabel.anchor}
                alignmentBaseline="middle"
              >
                MC
              </SvgText>
            ) : null}
          </>
        ) : null}
        {layout.houses.map((h) => (
          <G key={h.i}>
            <Line x1={h.x0} y1={h.y0} x2={h.x1} y2={h.y1} stroke={layout.lineColor} strokeWidth={0.8} />
            <SvgText
              x={h.hx}
              y={h.hy}
              fill={wheelColor("mist2")}
              fontSize={8}
              fontFamily={fonts.inter}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {h.label}
            </SvgText>
          </G>
        ))}
        {layout.planets.map((planet) => {
          const { key, owner, body, px, py, strokeToken, gly } = planet;
          const isFocus = interactive && focus?.owner === owner && focus.body === body;
          const dimPlanet = interactive && focus != null && !isFocus;
          const glyphContent = tooltipsOn ? tooltipFor(planet) : null;
          return (
            <G
              key={key}
              onPress={() => onPlanetPress(owner, body, key)}
              opacity={dimPlanet ? 0.35 : 1}
              accessibilityLabel={glyphContent ? planetTooltipSummary(glyphContent) : `${body} glyph`}
            >
              <Circle cx={px} cy={py} r={layout.glyphR + 9} fill="transparent" />
              <Circle
                cx={px}
                cy={py}
                r={layout.glyphR}
                fill={layout.planetFill}
                stroke={exploreHint && tooltipsOn ? wheelColor("gold") : wheelColor(strokeToken)}
                strokeWidth={isFocus ? 1.75 : exploreHint && tooltipsOn ? 1.6 : 1.25}
                opacity={exploreHint && tooltipsOn ? 0.95 : 1}
              />
              <SvgText
                x={px}
                y={py}
                fill={wheelColor("cream")}
                fontSize={layout.glyphFs}
                fontFamily={fonts.zodiac}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {gly}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      </View>
      {sheetPlanet && planetTooltips ? (
        <WheelPlanetSheet
          content={tooltipFor(sheetPlanet)}
          sign={sheetPlanet.sign}
          onClose={() => {
            setSheetKey(null);
            setFocus(null);
          }}
          onSeeFullReading={() => {
            setSheetKey(null);
            setFocus(null);
            planetTooltips.onSeeFullReading(sheetPlanet.body);
          }}
        />
      ) : null}
      {layout.showYearNote ? (
        <Text
          style={{
            color: tokens.colors.mist,
            fontSize: 12,
            marginTop: 8,
            textAlign: "center",
            lineHeight: 17,
            fontFamily: fonts.inter
          }}
        >
          {YEAR_ASPECTS_NEED_DATE_NOTE}
        </Text>
      ) : null}
      {layout.overlayMissingAspects ? (
        <Text
          style={{
            color: tokens.colors.mist,
            fontSize: 12,
            marginTop: 8,
            textAlign: "center",
            lineHeight: 17,
            fontFamily: fonts.inter
          }}
        >
          {OVERLAY_ASPECTS_MISSING_NOTE}
        </Text>
      ) : null}
    </View>
  );
}
