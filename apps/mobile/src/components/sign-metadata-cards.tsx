import { getSignMetadata, type NatalChart, type Sign } from "@galaxia/astro";
import {
  BIRTHSTONE_COLORS,
  BODY_GLYPH,
  ELEMENT_NODE_COLORS,
  SIGN_GLYPH,
  sunSignFromChart,
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Text, View } from "react-native";
import { fonts } from "../lib/typography";
import { GlossaryTooltip } from "./glossary-tooltip";

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function SignMetadataCards({ chart }: { chart: NatalChart }) {
  const sunSign = sunSignFromChart(chart);

  if (!sunSign) return null;

  const metadata = getSignMetadata(sunSign as Sign);
  const elementColor = ELEMENT_NODE_COLORS[metadata.element];
  const birthstoneColor = BIRTHSTONE_COLORS[sunSign];
  const planetGlyph = BODY_GLYPH[metadata.rulingPlanet] ?? BODY_GLYPH[metadata.rulingPlanet.toLowerCase()];

  return (
    <View
      accessibilityLabel={`${sunSign} sign reference`}
      testID="sign-metadata-cards"
      style={cardStyle}
    >
      <Text style={eyebrowStyle}>{sunSign}</Text>

      <Text
        accessibilityElementsHidden
        style={[zodiacStyle, { color: elementColor }]}
      >
        {SIGN_GLYPH[sunSign]}
      </Text>

      <View style={rowStyle}>
        <View style={identityStyle}>
          <View style={pillStyle}>
            <GlossaryTooltip glossarySlug="element" style={labelStyle}>Element</GlossaryTooltip>
            <View style={inlineValueStyle}>
              <View
                accessibilityElementsHidden
                style={[dotStyle, { backgroundColor: elementColor }]}
              />
              <Text style={[pillValueStyle, { color: elementColor }]}>{titleCase(metadata.element)}</Text>
            </View>
          </View>

          <View style={pillStyle}>
            <GlossaryTooltip glossarySlug="modality" style={labelStyle}>Modality</GlossaryTooltip>
            <Text style={[pillValueStyle, { color: tokens.colors.mist }]}>{titleCase(metadata.modality)}</Text>
          </View>

          <View style={pillStyle}>
            <GlossaryTooltip glossarySlug="ruling-planet" style={labelStyle}>Ruling planet</GlossaryTooltip>
            <View style={inlineValueStyle}>
              <Text accessibilityElementsHidden style={planetStyle}>{planetGlyph}</Text>
              <Text style={pillValueStyle}>{metadata.rulingPlanet}</Text>
            </View>
          </View>
        </View>

        {/* FOUNDER-REVIEW: approved element significance copy. */}
        <Text style={elementSignificanceStyle} testID="element-significance">
          {metadata.elementSignificance}
        </Text>
      </View>

      <View style={[rowStyle, dividedRowStyle]}>
        <View style={symbolStyle}>
          {/* FOUNDER-REVIEW: symbol heading follows the approved design structure. */}
          <Text style={symbolNameStyle}>The {metadata.symbol}</Text>
          <Text style={originStyle}>
            {metadata.symbolOrigin}
          </Text>
        </View>
      </View>

      <View style={[rowStyle, dividedRowStyle, materialsStyle]}>
        <View style={materialStyle}>
          <View style={materialHeadStyle}>
            <View style={dotColumnStyle}>
              <View accessibilityElementsHidden style={[dotStyle, { backgroundColor: tokens.colors.goldSoft }]} />
            </View>
            <View>
              {/* FOUNDER-REVIEW: traditional material reference label. */}
              <Text style={labelStyle}>Metal</Text>
              <Text style={materialValueStyle}>{metadata.metal}</Text>
            </View>
          </View>
          {/* FOUNDER-REVIEW: approved metal significance copy. */}
          <Text style={materialSignificanceStyle} testID="metal-significance">
            {metadata.metalSignificance}
          </Text>
        </View>

        <View style={materialStyle}>
          <View style={materialHeadStyle}>
            <View style={dotColumnStyle}>
              <View accessibilityElementsHidden style={[stoneDotStyle, { backgroundColor: birthstoneColor }]} />
            </View>
            <View>
              {/* FOUNDER-REVIEW: traditional stone reference label. */}
              <Text style={labelStyle}>Birthstone</Text>
              <Text style={materialValueStyle}>{metadata.birthstone}</Text>
            </View>
          </View>
          {/* FOUNDER-REVIEW: approved birthstone significance copy. */}
          <Text style={materialSignificanceStyle} testID="birthstone-significance">
            {metadata.birthstoneSignificance}
          </Text>
        </View>
      </View>
    </View>
  );
}

const cardStyle = {
  position: "relative",
  overflow: "hidden",
  backgroundColor: tokens.colors.ink3,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  paddingHorizontal: 14,
  paddingVertical: 15,
  gap: 14,
} as const;

const eyebrowStyle = {
  color: tokens.colors.gold,
  fontFamily: fonts.interSemi,
  fontSize: 10,
  letterSpacing: 2.2,
  textTransform: "uppercase",
} as const;

/* Each row is its own band so element, symbol, and materials read as separate ideas. */
const rowStyle = {
  zIndex: 1,
  gap: 11,
} as const;

const dividedRowStyle = {
  paddingTop: 18,
  borderTopWidth: 1,
  borderTopColor: "rgba(183,154,216,0.14)",
} as const;

const zodiacStyle = {
  position: "absolute",
  right: 10,
  top: 38,
  fontFamily: fonts.zodiac,
  fontSize: 64,
  lineHeight: 68,
  opacity: 0.1,
} as const;

const identityStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 6,
} as const;

const pillStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "rgba(183,154,216,0.14)",
  backgroundColor: "rgba(10,7,23,0.52)",
  paddingHorizontal: 8,
  paddingVertical: 5,
} as const;

const labelStyle = {
  color: tokens.colors.mist2,
  fontFamily: fonts.interSemi,
  fontSize: 8,
  fontWeight: "700",
  letterSpacing: 0.8,
  textTransform: "uppercase",
} as const;

const inlineValueStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
} as const;

const pillValueStyle = {
  color: tokens.colors.cream,
  fontFamily: fonts.interSemi,
  fontSize: 11,
} as const;

const dotStyle = {
  width: 7,
  height: 7,
  borderRadius: 4,
} as const;

const planetStyle = {
  color: tokens.colors.gold,
  fontFamily: fonts.zodiac,
  fontSize: 15,
  lineHeight: 16,
} as const;

const symbolStyle = {
  gap: 5,
  paddingRight: 46,
} as const;

const symbolNameStyle = {
  color: tokens.colors.gold,
  fontFamily: fonts.fraunces,
  fontSize: 17,
} as const;

const originStyle = {
  color: tokens.colors.mist,
  fontFamily: fonts.inter,
  fontSize: 12,
  lineHeight: 17,
} as const;

const elementSignificanceStyle = {
  ...originStyle,
  paddingRight: 46,
} as const;

const materialsStyle = {
  gap: 16,
} as const;

const materialStyle = {
  gap: 6,
} as const;

const materialHeadStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
} as const;

/* The dot gets its own fixed column so the label, value, and significance
   share one text edge regardless of which dot size is used. */
const dotColumnStyle = {
  width: 12,
  alignItems: "center",
} as const;

const materialSignificanceStyle = {
  ...originStyle,
  paddingLeft: 18,
} as const;

const stoneDotStyle = {
  width: 10,
  height: 10,
  borderRadius: 5,
} as const;

const materialValueStyle = {
  color: tokens.colors.cream,
  fontFamily: fonts.fraunces,
  fontSize: 12,
  marginTop: 1,
} as const;
