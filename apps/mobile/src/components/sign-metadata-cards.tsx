import { getSignMetadata, type NatalChart, type Sign } from "@galaxia/astro";
import { ELEMENT_NODE_COLORS, sunSignFromChart } from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { fonts } from "../lib/typography";
import { GlossaryTooltip } from "./glossary-tooltip";

function firstSentence(copy: string): string {
  const end = copy.indexOf(".");
  return end === -1 ? copy : copy.slice(0, end + 1);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function SignMetadataCards({ chart }: { chart: NatalChart }) {
  const sunSign = sunSignFromChart(chart);
  const [originOpen, setOriginOpen] = useState(false);

  if (!sunSign) return null;

  const metadata = getSignMetadata(sunSign as Sign);
  const elementColor = ELEMENT_NODE_COLORS[metadata.element];

  return (
    <View
      accessibilityLabel={`${sunSign} sign reference`}
      testID="sign-metadata-cards"
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
    >
      <View style={pillStyle}>
        <GlossaryTooltip glossarySlug="element" style={labelStyle}>Element</GlossaryTooltip>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            accessibilityElementsHidden
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: elementColor }}
          />
          <Text style={valueStyle}>{titleCase(metadata.element)}</Text>
        </View>
      </View>

      <View style={pillStyle}>
        <GlossaryTooltip glossarySlug="modality" style={labelStyle}>Modality</GlossaryTooltip>
        <Text style={valueStyle}>{titleCase(metadata.modality)}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: originOpen }}
        // FOUNDER-REVIEW: accessible action label for the approved symbol explanation.
        accessibilityLabel={`${originOpen ? "Hide" : "Read"} why ${sunSign} uses the ${metadata.symbol}`}
        onPress={() => setOriginOpen((open) => !open)}
        style={[pillStyle, { flexBasis: "100%" }]}
      >
        {/* FOUNDER-REVIEW: compact symbol-card label. */}
        <Text style={labelStyle}>Symbol · {metadata.symbol}</Text>
        <Text style={[originStyle, { color: originOpen ? tokens.colors.cream : tokens.colors.mist }]}>
          {originOpen ? metadata.symbolOrigin : firstSentence(metadata.symbolOrigin)}
        </Text>
      </Pressable>

      <View style={pillStyle}>
        <GlossaryTooltip glossarySlug="ruling-planet" style={labelStyle}>Ruling planet</GlossaryTooltip>
        <Text style={valueStyle}>{metadata.rulingPlanet}</Text>
      </View>

      <View style={pillStyle}>
        {/* FOUNDER-REVIEW: traditional material reference label. */}
        <Text style={labelStyle}>Metal</Text>
        <Text style={valueStyle}>{metadata.metal}</Text>
      </View>

      <View style={pillStyle}>
        {/* FOUNDER-REVIEW: traditional stone reference label. */}
        <Text style={labelStyle}>Birthstone</Text>
        <Text style={valueStyle}>{metadata.birthstone}</Text>
      </View>
    </View>
  );
}

const pillStyle = {
  minWidth: 104,
  flexGrow: 1,
  flexBasis: "30%",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "rgba(230,174,108,0.14)",
  backgroundColor: "rgba(255,255,255,0.025)",
  paddingHorizontal: 11,
  paddingVertical: 9,
  gap: 4,
} as const;

const labelStyle = {
  color: tokens.colors.mist2,
  fontSize: 9,
  fontWeight: "700",
  letterSpacing: 1,
  textTransform: "uppercase",
} as const;

const valueStyle = {
  color: tokens.colors.cream,
  fontFamily: fonts.fraunces,
  fontSize: 14,
} as const;

const originStyle = {
  fontSize: 12,
  lineHeight: 18,
} as const;
