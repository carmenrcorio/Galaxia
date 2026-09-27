import {
  CHART_ELEMENTS,
  pairElementBalanceInterpretation,
  type ChartElement,
  type ElementCounts,
  type PairElementBalance,
} from "@galaxia/astro";
import { tokens } from "@galaxia/ui";
import { Text, View } from "react-native";
import { fonts } from "../lib/typography";

const ELEMENT_COLORS: Record<ChartElement, string> = {
  fire: "#DD7651",
  earth: "#7D9B78",
  air: "#D6B65E",
  water: "#6FAFB8",
};

function label(element: ChartElement): string {
  return `${element[0]!.toUpperCase()}${element.slice(1)}`;
}

function ElementBar({ name, counts }: { name: string; counts: ElementCounts }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={nameStyle}>{name}</Text>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${name} element balance: ${CHART_ELEMENTS.map((element) => `${label(element)} ${counts[element]}`).join(", ")}`}
        style={barStyle}
      >
        {CHART_ELEMENTS.map((element) =>
          counts[element] > 0 ? (
            <View
              key={element}
              style={{
                flexGrow: counts[element],
                flexBasis: 0,
                minWidth: 0,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: ELEMENT_COLORS[element],
              }}
            >
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={segmentLabelStyle}>
                {label(element)}
              </Text>
              <Text style={segmentCountStyle}>{counts[element]}</Text>
            </View>
          ) : null
        )}
      </View>
      <View style={legendStyle}>
        {CHART_ELEMENTS.map((element) => (
          <Text key={element} numberOfLines={1} adjustsFontSizeToFit style={{ color: ELEMENT_COLORS[element], fontSize: 10, fontWeight: "700" }}>
            {label(element)} {counts[element]}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function ElementBalanceSection({
  nameA,
  nameB,
  balance,
}: {
  nameA: string;
  nameB: string;
  balance: PairElementBalance;
}) {
  const interpretation = pairElementBalanceInterpretation(balance);

  return (
    <View style={cardStyle}>
      {/* FOUNDER-REVIEW: element-balance section heading. */}
      <Text style={titleStyle}>Element balance</Text>
      <ElementBar name={nameA} counts={balance.a} />
      <ElementBar name={nameB} counts={balance.b} />
      {interpretation.map((line) => (
        <Text key={line} style={bodyStyle}>{line}</Text>
      ))}
    </View>
  );
}

const cardStyle = {
  backgroundColor: "rgba(255,255,255,0.035)",
  borderRadius: tokens.radii.lg,
  borderWidth: 1,
  borderColor: "rgba(230,174,108,0.13)",
  padding: 12,
  gap: 12,
} as const;

const titleStyle = {
  color: tokens.colors.cream,
  fontFamily: fonts.frauncesSemi,
  fontSize: 18,
} as const;

const nameStyle = {
  color: tokens.colors.cream,
  fontSize: 13,
  fontWeight: "700",
} as const;

const barStyle = {
  flexDirection: "row",
  height: 42,
  borderRadius: 10,
  overflow: "hidden",
  backgroundColor: "rgba(255,255,255,0.04)",
  borderWidth: 1,
  borderColor: "rgba(244,236,219,0.12)",
} as const;

const segmentLabelStyle = {
  color: "#0A0717",
  fontSize: 10,
  fontWeight: "800",
  lineHeight: 11,
  paddingHorizontal: 2,
} as const;

const segmentCountStyle = {
  color: "#0A0717",
  fontSize: 12,
  fontWeight: "800",
  lineHeight: 13,
} as const;

const legendStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  gap: 4,
} as const;

const bodyStyle = {
  color: tokens.colors.mist,
  lineHeight: 20,
  fontSize: 13,
} as const;
