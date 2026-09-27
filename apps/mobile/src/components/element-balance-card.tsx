import {
  CHART_ELEMENTS,
  interpretPairElementBalance,
  type ChartElement,
  type ElementCounts,
  type PairElementBalance,
} from "@galaxia/astro";
import { tokens } from "@galaxia/ui";
import { Text, View } from "react-native";
import { fonts } from "../lib/typography";

// FOUNDER-REVIEW: Element balance labels.
const ELEMENT_LABEL: Record<ChartElement, string> = {
  fire: "Fire",
  earth: "Earth",
  air: "Air",
  water: "Water",
};

function PersonElementBar({ name, counts }: { name: string; counts: ElementCounts }) {
  const total = CHART_ELEMENTS.reduce((sum, element) => sum + counts[element], 0);
  return (
    <View style={{ gap: 7 }}>
      <Text style={personName}>{name}</Text>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${name} element balance`}
        style={bar}
      >
        {CHART_ELEMENTS.map((element) => {
          const count = counts[element];
          if (count === 0) return null;
          return (
            <View
              key={element}
              accessible
              accessibilityLabel={`${ELEMENT_LABEL[element]} ${count} of ${total}`}
              style={{
                flex: count,
                minWidth: 0,
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: tokens.elementBalance[element],
              }}
            >
              <Text style={segmentLabel}>{ELEMENT_LABEL[element].charAt(0)} {count}</Text>
            </View>
          );
        })}
      </View>
      <View style={legend}>
        {CHART_ELEMENTS.map((element) => (
          <View key={element} style={legendItem}>
            <Text style={{ color: tokens.elementBalance[element], fontSize: 10 }}>●</Text>
            <Text style={legendText}>{ELEMENT_LABEL[element]} {counts[element]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ElementBalanceCard({
  nameA,
  nameB,
  balance,
}: {
  nameA: string;
  nameB: string;
  balance: PairElementBalance;
}) {
  return (
    <View style={card}>
      {/* FOUNDER-REVIEW: Element balance card heading and scope line. */}
      <Text style={eyebrow}>ELEMENT BALANCE</Text>
      <Text style={subtitle}>Sun through Pluto, ten planets each.</Text>
      <PersonElementBar name={nameA} counts={balance.a} />
      <PersonElementBar name={nameB} counts={balance.b} />
      <View style={interpretation}>
        {interpretPairElementBalance(balance).map((line) => (
          <Text key={line} style={body}>{line}</Text>
        ))}
      </View>
    </View>
  );
}

const card = {
  backgroundColor: "rgba(255,255,255,0.035)",
  borderRadius: tokens.radii.lg,
  borderWidth: 1,
  borderColor: "rgba(230,174,108,0.13)",
  padding: 12,
  gap: 14,
  overflow: "hidden",
} as const;

const eyebrow = {
  color: tokens.colors.gold,
  fontFamily: fonts.interSemi,
  fontSize: 11,
  letterSpacing: 2.1,
} as const;

const subtitle = {
  color: tokens.colors.mist2,
  fontFamily: fonts.inter,
  fontSize: 12,
  marginTop: -8,
} as const;

const personName = {
  color: tokens.colors.cream,
  fontFamily: fonts.interSemi,
  fontSize: 13,
} as const;

const bar = {
  height: 34,
  width: "100%",
  borderRadius: 10,
  overflow: "hidden",
  flexDirection: "row",
  backgroundColor: "rgba(255,255,255,0.04)",
} as const;

const segmentLabel = {
  color: tokens.colors.ink,
  fontFamily: fonts.interSemi,
  fontSize: 10,
} as const;

const legend = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
} as const;

const legendItem = {
  flexDirection: "row",
  alignItems: "center",
  gap: 3,
} as const;

const legendText = {
  color: tokens.colors.mist,
  fontFamily: fonts.inter,
  fontSize: 10,
} as const;

const interpretation = {
  borderTopWidth: 1,
  borderTopColor: "rgba(183,154,216,0.12)",
  paddingTop: 12,
  gap: 7,
} as const;

const body = {
  color: tokens.colors.mist,
  fontFamily: fonts.inter,
  fontSize: 13,
  lineHeight: 20,
} as const;
