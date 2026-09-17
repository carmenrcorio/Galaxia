import {
  OVERLAY_ASPECTS_MISSING_NOTE,
  YEAR_ASPECTS_NEED_DATE_NOTE,
  layoutChartWheel,
  type WheelAspect,
  type WheelChartLike,
  type WheelChartOwner,
  type WheelColorToken,
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { fonts } from "../lib/typography";

export type { WheelAspect };

export type ChartWheelProps = {
  chart: WheelChartLike;
  overlayChart?: WheelChartLike;
  aspects?: WheelAspect[];
  interactive?: boolean;
};

function wheelColor(token: WheelColorToken): string {
  return tokens.colors[token];
}

export function ChartWheel({ chart, overlayChart, aspects, interactive = true }: ChartWheelProps) {
  const layout = layoutChartWheel({ chart, overlayChart, aspects });
  const overlayWarnOnce = useRef(false);
  const [focus, setFocus] = useState<{ owner: WheelChartOwner; body: string } | null>(null);

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

  function onPlanetPress(owner: WheelChartOwner, body: string) {
    if (!interactive) return;
    setFocus((prev) => (prev && prev.owner === owner && prev.body === body ? null : { owner, body }));
  }

  return (
    <View style={{ width: "100%", maxWidth: 306, alignSelf: "center", paddingHorizontal: 8 }}>
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
        {layout.planets.map(({ key, owner, body, px, py, strokeToken, gly }) => {
          const isFocus = interactive && focus?.owner === owner && focus.body === body;
          const dimPlanet = interactive && focus != null && !isFocus;
          return (
            <G
              key={key}
              onPress={() => onPlanetPress(owner, body)}
              opacity={dimPlanet ? 0.35 : 1}
              accessibilityLabel={`${body} glyph`}
            >
              <Circle cx={px} cy={py} r={layout.glyphR + 9} fill="transparent" />
              <Circle
                cx={px}
                cy={py}
                r={layout.glyphR}
                fill={layout.planetFill}
                stroke={wheelColor(strokeToken)}
                strokeWidth={isFocus ? 1.75 : 1.25}
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
